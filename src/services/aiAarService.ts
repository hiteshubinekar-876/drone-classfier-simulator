import {
  DeterministicInsights,
  AiExplanation,
  AarInsightReport,
  SessionSummaryContext
} from '../types/aarInsights';
import { TrainingSession, TrainingScore, SimulationEvent, ScenarioDefinition } from '../types';
import {
  computeDeterministicInsights,
  createAuthoritativeScoreSnapshot,
  INSIGHTS_ENGINE_VERSION
} from '../game/assessment/insightsEngine';
import { storage } from '../data/indexedDbAdapter';

export interface AiExplanationProvider {
  readonly providerId: string;
  readonly displayName: string;
  generateExplanation(
    insights: DeterministicInsights,
    context: SessionSummaryContext
  ): Promise<AiExplanation>;
}

export class AiSchemaValidationError extends Error {
  constructor(message: string, public readonly rawPayload?: unknown) {
    super(`AI Explanation Schema Validation Error: ${message}`);
    this.name = 'AiSchemaValidationError';
  }
}

export class AiProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(`AI Provider Error: ${message}`);
    this.name = 'AiProviderError';
  }
}

/**
 * Validates untrusted or external AI responses against the strict AiExplanation schema.
 */
export function validateAiExplanation(raw: unknown): AiExplanation {
  if (!raw || typeof raw !== 'object') {
    throw new AiSchemaValidationError('Response must be an object');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.performanceSummary !== 'string' || obj.performanceSummary.trim().length === 0) {
    throw new AiSchemaValidationError('Missing or empty "performanceSummary" string');
  }

  const validateStringArray = (fieldName: string): string[] => {
    const val = obj[fieldName];
    if (!Array.isArray(val)) {
      throw new AiSchemaValidationError(`"${fieldName}" must be an array of strings`);
    }
    const sanitized: string[] = [];
    for (const item of val) {
      if (typeof item === 'string' && item.trim().length > 0) {
        sanitized.push(item.trim());
      }
    }
    return sanitized;
  };

  const whatWentWell = validateStringArray('whatWentWell');
  const areasToImprove = validateStringArray('areasToImprove');
  const recommendedPractice = validateStringArray('recommendedPractice');
  const dataLimitations = validateStringArray('dataLimitations');

  const providerName =
    typeof obj.providerName === 'string' && obj.providerName.trim().length > 0
      ? obj.providerName.trim()
      : 'AI Assistant';

  const isAiGenerated = typeof obj.isAiGenerated === 'boolean' ? obj.isAiGenerated : true;

  const generatedAt =
    typeof obj.generatedAt === 'number' && !isNaN(obj.generatedAt)
      ? obj.generatedAt
      : Date.now();

  return {
    performanceSummary: obj.performanceSummary.trim(),
    whatWentWell,
    areasToImprove,
    recommendedPractice,
    dataLimitations,
    providerName,
    isAiGenerated,
    generatedAt
  };
}

/**
 * Local Deterministic Provider: Generates clear, structured, evidence-grounded
 * tactical explanations without any external API calls.
 */
export class LocalDeterministicExplanationProvider implements AiExplanationProvider {
  readonly providerId = 'local-deterministic';
  readonly displayName = 'Rule-Based Expert Engine (Local Offline)';

  async generateExplanation(
    insights: DeterministicInsights,
    context: SessionSummaryContext
  ): Promise<AiExplanation> {
    const { metrics, strengths, areasToImprove, recommendations, dataLimitations } = insights;

    // Build synthesized tactical summary
    let summary = `Trainee completed scenario "${context.scenarioName}" (${context.difficulty.toUpperCase()}) with an authoritative score of ${context.totalScore}/100 [${context.rating}]. `;

    if (metrics.totalTargets === 0) {
      summary += 'Airspace contained zero configured targets.';
    } else if (metrics.totalAttempts === 0) {
      summary += 'No contact classifications were submitted during the exercise window.';
    } else {
      const accText = metrics.accuracyPercentage !== null ? `${metrics.accuracyPercentage}% accuracy` : 'unrated accuracy';
      const latText = metrics.averageLatencySec !== null ? `${metrics.averageLatencySec}s average acquisition latency` : 'no latency recorded';
      summary += `Evaluated ${metrics.totalAttempts} total action(s) with ${accText} across ${metrics.totalTargets} aerial target(s). Target identification demonstrated ${latText}.`;

      if (metrics.falseAlarmCount > 0) {
        summary += ` Airspace discipline was compromised by ${metrics.falseAlarmCount} unverified false alarm submission(s).`;
      }

      if (metrics.historicalTrend.hasBaseline && metrics.historicalTrend.scoreDelta !== null) {
        const deltaPrefix = metrics.historicalTrend.scoreDelta >= 0 ? '+' : '';
        summary += ` Compared to prior completions of this scenario, overall score shifted by ${deltaPrefix}${metrics.historicalTrend.scoreDelta} pts (${metrics.historicalTrend.trendDirection}).`;
      }
    }

    // Build What Went Well
    const whatWentWell: string[] = [];
    if (strengths.length > 0) {
      for (const s of strengths) {
        const evStr = s.evidence.map((e) => `${e.label}: ${e.value}`).join(', ');
        whatWentWell.push(`${s.title}: ${s.detail} [Evidence: ${evStr}]`);
      }
    } else {
      whatWentWell.push('Operational baseline established. No specific performance strengths met the qualification thresholds for this run.');
    }

    // Build Areas to Improve
    const areasList: string[] = [];
    if (areasToImprove.length > 0) {
      for (const a of areasToImprove) {
        const evStr = a.evidence.map((e) => `${e.label}: ${e.value}`).join(', ');
        areasList.push(`${a.title}: ${a.detail} [Evidence: ${evStr}]`);
      }
    } else {
      areasList.push('Zero performance defects or recognition errors detected during this exercise session.');
    }

    // Build Recommended Practice
    const recommendedPractice: string[] = [];
    for (const r of recommendations) {
      const scope = r.suggestedScenarioCodename ? ` [Recommended Drill: ${r.suggestedScenarioCodename}]` : '';
      recommendedPractice.push(`[${r.priority.toUpperCase()}] ${r.title}: ${r.actionPlan}${scope}`);
    }

    return {
      performanceSummary: summary,
      whatWentWell,
      areasToImprove: areasList,
      recommendedPractice,
      dataLimitations: [...dataLimitations],
      providerName: this.displayName,
      isAiGenerated: false,
      generatedAt: Date.now()
    };
  }
}

/**
 * Remote AI Explanation Provider (Server Proxy Gateway).
 * Secure boundary: Calls server-side proxy endpoint (/api/aar-explain).
 * Never accepts, stores, or transmits API keys in frontend client code.
 * If server credentials are missing or proxy fails, triggers deterministic fallback.
 */
export class RemoteAiExplanationProvider implements AiExplanationProvider {
  readonly providerId = 'remote-ai';
  readonly displayName = 'Tactical AI Assistant (Cloud Engine)';

  constructor(
    private readonly proxyUrl: string = (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_PROXY_ENDPOINT) ||
      '/api/aar-explain',
    private readonly timeoutMs: number = 8000
  ) {}

  async generateExplanation(
    insights: DeterministicInsights,
    context: SessionSummaryContext
  ): Promise<AiExplanation> {
    if (!this.proxyUrl || this.proxyUrl.trim().length === 0) {
      throw new AiProviderError('No remote AI proxy endpoint configured.');
    }

    // Prepare strictly minimal, sanitized payload
    const payload = {
      scenario: context.scenarioName,
      difficulty: context.difficulty,
      authoritativeScore: context.totalScore,
      rating: context.rating,
      metrics: {
        totalTargets: insights.metrics.totalTargets,
        totalAttempts: insights.metrics.totalAttempts,
        accuracyPercentage: insights.metrics.accuracyPercentage,
        averageLatencySec: insights.metrics.averageLatencySec,
        falseAlarmCount: insights.metrics.falseAlarmCount,
        unattemptedTargets: insights.metrics.unattemptedTargets,
        historicalTrend: insights.metrics.historicalTrend.trendDirection
      },
      verifiedStrengths: insights.strengths.map((s) => ({ title: s.title, detail: s.detail })),
      verifiedGaps: insights.areasToImprove.map((g) => ({ title: g.title, detail: g.detail })),
      recommendedDrills: insights.recommendations.map((r) => ({ title: r.title, action: r.actionPlan })),
      dataLimitations: insights.dataLimitations
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && typeof errJson === 'object' && 'error' in errJson) {
            errorDetails = String((errJson as { error: unknown }).error);
          }
        } catch {}
        throw new AiProviderError(errorDetails);
      }

      const rawJson = await response.json();
      const validated = validateAiExplanation(rawJson);
      return {
        ...validated,
        providerName: validated.providerName || this.displayName,
        isAiGenerated: true
      };
    } catch (err: unknown) {
      if (err instanceof AiSchemaValidationError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AiProviderError(`Remote AI proxy request timed out after ${this.timeoutMs}ms.`);
      }
      throw new AiProviderError(
        `Remote AI service unavailable: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Mock Provider for automated test suites.
 */
export class MockAiExplanationProvider implements AiExplanationProvider {
  readonly providerId = 'mock-ai';
  readonly displayName = 'Mock AI Instructor';

  constructor(
    private readonly mockResponse?: Partial<AiExplanation>,
    private readonly shouldThrow = false,
    private readonly throwError = new Error('Simulated AI Provider Failure')
  ) {}

  async generateExplanation(
    _insights: DeterministicInsights,
    _context: SessionSummaryContext
  ): Promise<AiExplanation> {
    if (this.shouldThrow) {
      throw this.throwError;
    }

    const base: AiExplanation = {
      performanceSummary: 'Mock AI explanation: Trainee demonstrated high tracking proficiency.',
      whatWentWell: ['Rapid acquisition of fixed-wing assets', 'Zero false alarm deductions'],
      areasToImprove: ['Low optical clarity on sub-0.3m micro-UAVs'],
      recommendedPractice: ['Run OP-MIST with 3.2x binocular zoom engagement'],
      dataLimitations: ['Mocked testing response'],
      providerName: this.displayName,
      isAiGenerated: true,
      generatedAt: Date.now(),
      ...this.mockResponse
    };

    return validateAiExplanation(base);
  }
}

/**
 * Central AI AAR Assistant Service.
 * Manages computation of deterministic insights, provider execution, caching,
 * in-flight request deduplication, and persistence.
 */
export class AiAarService {
  private primaryProvider: AiExplanationProvider;
  private fallbackProvider: AiExplanationProvider = new LocalDeterministicExplanationProvider();
  private inFlightRequests: Map<string, Promise<AarInsightReport>> = new Map();

  constructor(customProvider?: AiExplanationProvider) {
    this.primaryProvider = customProvider || new RemoteAiExplanationProvider();
  }

  setPrimaryProvider(provider: AiExplanationProvider): void {
    this.primaryProvider = provider;
  }

  /**
   * Generates or retrieves an AAR Insight Report for a completed session.
   */
  async generateAarReport(params: {
    session: TrainingSession;
    score: TrainingScore;
    events: SimulationEvent[];
    scenario: ScenarioDefinition;
    forceRegenerate?: boolean;
    historicalSessions?: TrainingSession[];
    historicalScores?: Map<string, TrainingScore>;
  }): Promise<AarInsightReport> {
    const { session, forceRegenerate = false } = params;

    // Check if an existing report is cached in storage and not forcing regeneration
    if (!forceRegenerate) {
      try {
        const cached = await storage.getAarInsight(session.id);
        if (cached && cached.engineVersion === INSIGHTS_ENGINE_VERSION) {
          return cached;
        }
      } catch (err) {
        console.warn('[AiAarService] Failed to load cached report:', err);
      }
    }

    // In-flight mutex deduplication: prevent duplicate parallel calls for same sessionId
    const activePromise = this.inFlightRequests.get(session.id);
    if (activePromise) {
      return activePromise;
    }

    const taskPromise = this.executeReportGeneration(params);
    this.inFlightRequests.set(session.id, taskPromise);

    try {
      const result = await taskPromise;
      return result;
    } finally {
      this.inFlightRequests.delete(session.id);
    }
  }

  private async executeReportGeneration(params: {
    session: TrainingSession;
    score: TrainingScore;
    events: SimulationEvent[];
    scenario: ScenarioDefinition;
    historicalSessions?: TrainingSession[];
    historicalScores?: Map<string, TrainingScore>;
  }): Promise<AarInsightReport> {
    const { session, score, events, scenario, historicalSessions, historicalScores } = params;

    // 1. Calculate pure deterministic insights
    const deterministicInsights = computeDeterministicInsights({
      session,
      score,
      events,
      scenario,
      historicalSessions,
      historicalScores
    });

    const context: SessionSummaryContext = {
      sessionId: session.id,
      scenarioName: scenario.name,
      difficulty: scenario.difficulty,
      durationSeconds: scenario.durationSeconds,
      totalScore: score.totalScore,
      rating: score.rating,
      scoringVersion: score.scoringVersion
    };

    let explanation: AiExplanation;

    // 2. Attempt primary AI provider, fallback to deterministic if unavailable
    try {
      explanation = await this.primaryProvider.generateExplanation(deterministicInsights, context);
    } catch (primaryErr) {
      // Gracefully fall back to local rule-based explanation
      console.info(
        `[AiAarService] Primary AI provider (${this.primaryProvider.displayName}) unavailable; employing local deterministic engine.`,
        primaryErr instanceof Error ? primaryErr.message : primaryErr
      );
      explanation = await this.fallbackProvider.generateExplanation(deterministicInsights, context);
      
      // If primary was remote and failed, add a notice to data limitations
      if (this.primaryProvider.providerId !== 'local-deterministic') {
        const errorMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
        explanation.dataLimitations.push(
          `AI Provider Status: Remote AI unavailable (${errorMsg}); rendered using verified rule-based analysis engine.`
        );
      }
    }

    // 3. Assemble complete AAR report
    const report: AarInsightReport = {
      sessionId: session.id,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      analyzedAt: Date.now(),
      engineVersion: INSIGHTS_ENGINE_VERSION,
      authoritativeScore: createAuthoritativeScoreSnapshot(score),
      deterministicInsights,
      explanation
    };

    // 4. Persist to storage
    try {
      await storage.saveAarInsight(report);
    } catch (saveErr) {
      console.warn('[AiAarService] Failed to persist AAR insight report:', saveErr);
    }

    return report;
  }
}

export const aiAarService = new AiAarService();
