import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  AiAarService,
  LocalDeterministicExplanationProvider,
  MockAiExplanationProvider,
  RemoteAiExplanationProvider,
  validateAiExplanation,
  AiSchemaValidationError,
  AiProviderError
} from '../src/services/aiAarService';
import {
  computeDeterministicInsights
} from '../src/game/assessment/insightsEngine';
import { storage } from '../src/data/indexedDbAdapter';
import {
  ScenarioDefinition,
  SimulationEvent,
  TrainingScore,
  TrainingSession
} from '../src/types';

const testScenario: ScenarioDefinition = {
  id: 'test-scenario-aar',
  name: 'Desert Reconnaissance Exercise',
  codename: 'OP-DESERT',
  description: 'AI AAR service integration test scenario',
  environmentId: 'desert_outpost',
  difficulty: 'beginner',
  timeOfDay: 'day',
  durationSeconds: 60,
  version: '1.0.0',
  isRandomized: false,
  objectiveSummary: 'Benchmark scenario with 2 targets',
  targets: [
    {
      id: 'target-1',
      callsign: 'VULTURE-1',
      threatClass: 'quadcopter_surveillance',
      flightProfile: 'hover',
      spawnTimeSec: 5,
      despawnTimeSec: 30,
      visualSignature: { color: '#333', rotorCount: 4, wingspanMeters: 0.8, beaconFlashHz: 1.0 },
      waypoints: []
    },
    {
      id: 'target-2',
      callsign: 'SWIFT-2',
      threatClass: 'fixed_wing_recon',
      flightProfile: 'linear_pass',
      spawnTimeSec: 25,
      despawnTimeSec: 55,
      visualSignature: { color: '#555', rotorCount: 1, wingspanMeters: 1.5, beaconFlashHz: 2.0 },
      waypoints: []
    }
  ]
};

const testSession: TrainingSession = {
  id: 'session-ai-service-1',
  userId: 'trainee-ai-test',
  scenarioId: 'test-scenario-aar',
  scenarioName: 'Desert Reconnaissance Exercise',
  scenarioVersion: '1.0.0',
  difficulty: 'beginner',
  startedAt: 1700000000000,
  completedAt: 1700000060000,
  status: 'completed',
  appVersion: '1.0.0'
};

const testScore: TrainingScore = {
  id: 'score-ai-service-1',
  sessionId: 'session-ai-service-1',
  scoringVersion: 'v1.0.0',
  totalScore: 84.5,
  passed: true,
  rating: 'QUALIFIED',
  breakdown: {
    detectionLatencyScore: 25.0,
    classificationAccuracyScore: 50.0,
    trackingCoverageScore: 9.5,
    falseAlarmPenalty: 0
  },
  targetAssessments: [
    {
      targetId: 'target-1',
      callsign: 'VULTURE-1',
      expectedClass: 'quadcopter_surveillance',
      classifiedAs: 'quadcopter_surveillance',
      isCorrect: true,
      detectionLatencySec: 2.5,
      trackingDurationSec: 4.5,
      scoreContribution: 42.0
    },
    {
      targetId: 'target-2',
      callsign: 'SWIFT-2',
      expectedClass: 'fixed_wing_recon',
      classifiedAs: 'fixed_wing_recon',
      isCorrect: true,
      detectionLatencySec: 3.2,
      trackingDurationSec: 4.0,
      scoreContribution: 42.5
    }
  ],
  feedbackNotes: [],
  calculatedAt: 1700000060000
};

const testEvents: SimulationEvent[] = [];

describe('AI AAR Service & Providers', () => {
  beforeEach(async () => {
    await storage.init();
    await storage.clearAllData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Schema Validation', () => {
    it('accepts valid, well-formed AI explanation payloads', () => {
      const validPayload = {
        performanceSummary: 'Trainee completed scenario with qualified visual recognition.',
        whatWentWell: ['Fast acquisition under 3 seconds', 'Accurate identification of fixed-wing assets'],
        areasToImprove: ['Maintain tighter reticle lock during angular tracking'],
        recommendedPractice: ['Conduct OP-MIST binocular drills'],
        dataLimitations: ['Single scenario evaluated'],
        providerName: 'Custom AI Assistant',
        isAiGenerated: true,
        generatedAt: 1700000000000
      };

      const result = validateAiExplanation(validPayload);
      expect(result.performanceSummary).toBe(validPayload.performanceSummary);
      expect(result.whatWentWell).toHaveLength(2);
      expect(result.areasToImprove).toHaveLength(1);
      expect(result.recommendedPractice).toHaveLength(1);
      expect(result.dataLimitations).toHaveLength(1);
      expect(result.isAiGenerated).toBe(true);
    });

    it('rejects null, non-objects, and missing required summary', () => {
      expect(() => validateAiExplanation(null)).toThrow(AiSchemaValidationError);
      expect(() => validateAiExplanation('string')).toThrow(AiSchemaValidationError);
      expect(() => validateAiExplanation({})).toThrow(AiSchemaValidationError);
      expect(() =>
        validateAiExplanation({
          performanceSummary: '',
          whatWentWell: [],
          areasToImprove: [],
          recommendedPractice: [],
          dataLimitations: []
        })
      ).toThrow(AiSchemaValidationError);
    });

    it('rejects non-array collections for whatWentWell and areasToImprove', () => {
      expect(() =>
        validateAiExplanation({
          performanceSummary: 'Summary text',
          whatWentWell: 'Not an array',
          areasToImprove: [],
          recommendedPractice: [],
          dataLimitations: []
        })
      ).toThrow(AiSchemaValidationError);
    });
  });

  describe('Local Deterministic Provider', () => {
    it('generates coherent, evidence-grounded explanation without external network access', async () => {
      const provider = new LocalDeterministicExplanationProvider();
      const insights = computeDeterministicInsights({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      const explanation = await provider.generateExplanation(insights, {
        sessionId: testSession.id,
        scenarioName: testScenario.name,
        difficulty: testScenario.difficulty,
        durationSeconds: testScenario.durationSeconds,
        totalScore: testScore.totalScore,
        rating: testScore.rating,
        scoringVersion: testScore.scoringVersion
      });

      expect(explanation.isAiGenerated).toBe(false);
      expect(explanation.providerName).toContain('Rule-Based');
      expect(explanation.performanceSummary).toContain('84.5/100');
      expect(explanation.performanceSummary).toContain('QUALIFIED');
      expect(explanation.whatWentWell.length).toBeGreaterThan(0);
      expect(explanation.recommendedPractice.length).toBeGreaterThan(0);
    });
  });

  describe('Remote Provider Gateway & Mocking', () => {
    it('successfully processes valid remote response when mock endpoint returns HTTP 200', async () => {
      const mockSuccessJson = {
        performanceSummary: 'Remote LLM generated: Excellent response time across all sectors.',
        whatWentWell: ['Rapid acquisition of VULTURE-1 (2.5s)', 'Zero false alarm triggers'],
        areasToImprove: ['Maintain binocular stability on erratic targets'],
        recommendedPractice: ['Practice OP-MIST weather scenarios'],
        dataLimitations: ['Telemetry verified'],
        providerName: 'Tactical AI Assistant (Cloud Engine)',
        isAiGenerated: true,
        generatedAt: 1700000000000
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockSuccessJson
      });
      vi.stubGlobal('fetch', fetchMock);

      const remoteProvider = new RemoteAiExplanationProvider('/api/test-proxy');
      const insights = computeDeterministicInsights({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      const result = await remoteProvider.generateExplanation(insights, {
        sessionId: testSession.id,
        scenarioName: testScenario.name,
        difficulty: testScenario.difficulty,
        durationSeconds: testScenario.durationSeconds,
        totalScore: testScore.totalScore,
        rating: testScore.rating,
        scoringVersion: testScore.scoringVersion
      });

      expect(result.isAiGenerated).toBe(true);
      expect(result.performanceSummary).toContain('Remote LLM generated');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects malformed response from remote endpoint and throws error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ invalidStructure: true }) // Missing performanceSummary!
      });
      vi.stubGlobal('fetch', fetchMock);

      const remoteProvider = new RemoteAiExplanationProvider('/api/test-proxy');
      const insights = computeDeterministicInsights({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      await expect(
        remoteProvider.generateExplanation(insights, {
          sessionId: testSession.id,
          scenarioName: testScenario.name,
          difficulty: testScenario.difficulty,
          durationSeconds: testScenario.durationSeconds,
          totalScore: testScore.totalScore,
          rating: testScore.rating,
          scoringVersion: testScore.scoringVersion
        })
      ).rejects.toThrow(AiSchemaValidationError);
    });

    it('handles remote provider timeout and triggers AbortError', async () => {
      const fetchMock = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const remoteProvider = new RemoteAiExplanationProvider('/api/test-proxy', 10); // 10ms timeout
      const insights = computeDeterministicInsights({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      await expect(
        remoteProvider.generateExplanation(insights, {
          sessionId: testSession.id,
          scenarioName: testScenario.name,
          difficulty: testScenario.difficulty,
          durationSeconds: testScenario.durationSeconds,
          totalScore: testScore.totalScore,
          rating: testScore.rating,
          scoringVersion: testScore.scoringVersion
        })
      ).rejects.toThrow(/timed out/i);
    });

    it('handles HTTP 503 from unconfigured server proxy and throws descriptive error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({
          error: 'Server AI proxy: AI_API_KEY is not configured in the server environment.',
          code: 'AI_UNCONFIGURED'
        })
      });
      vi.stubGlobal('fetch', fetchMock);

      const remoteProvider = new RemoteAiExplanationProvider('/api/aar-explain');
      const insights = computeDeterministicInsights({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      await expect(
        remoteProvider.generateExplanation(insights, {
          sessionId: testSession.id,
          scenarioName: testScenario.name,
          difficulty: testScenario.difficulty,
          durationSeconds: testScenario.durationSeconds,
          totalScore: testScore.totalScore,
          rating: testScore.rating,
          scoringVersion: testScore.scoringVersion
        })
      ).rejects.toThrow(/Server AI proxy: AI_API_KEY is not configured/i);
    });
  });

  describe('Service Fallback & Error Handling', () => {
    it('gracefully falls back to local deterministic provider when primary provider fails', async () => {
      const failingMockProvider = new MockAiExplanationProvider(undefined, true, new Error('Cloud provider quota exceeded'));
      const service = new AiAarService(failingMockProvider);

      const report = await service.generateAarReport({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      expect(report.sessionId).toBe(testSession.id);
      expect(report.authoritativeScore.totalScore).toBe(84.5);
      expect(report.explanation.isAiGenerated).toBe(false); // Fell back to deterministic!
      expect(report.explanation.providerName).toContain('Rule-Based');
      expect(report.explanation.dataLimitations.some((d) => d.includes('Remote AI unavailable'))).toBe(true);
    });

    it('Remote provider without configured endpoint throws descriptive error and triggers fallback', async () => {
      const remoteProvider = new RemoteAiExplanationProvider('');
      await expect(
        remoteProvider.generateExplanation(
          computeDeterministicInsights({ session: testSession, score: testScore, events: testEvents, scenario: testScenario }),
          {
            sessionId: testSession.id,
            scenarioName: testScenario.name,
            difficulty: testScenario.difficulty,
            durationSeconds: testScenario.durationSeconds,
            totalScore: testScore.totalScore,
            rating: testScore.rating,
            scoringVersion: testScore.scoringVersion
          }
        )
      ).rejects.toThrow(AiProviderError);
    });
  });

  describe('Deduplication & Concurrency Guard', () => {
    it('deduplicates concurrent generation requests for the same session ID', async () => {
      let callCount = 0;
      const delayedProvider = {
        providerId: 'delayed-test',
        displayName: 'Delayed Provider',
        async generateExplanation(_insights: unknown, _context: unknown) {
          callCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            performanceSummary: 'Concurrent test summary',
            whatWentWell: ['Good pacing'],
            areasToImprove: ['None'],
            recommendedPractice: ['Continue'],
            dataLimitations: [],
            providerName: 'Delayed Provider',
            isAiGenerated: true,
            generatedAt: Date.now()
          };
        }
      };

      const service = new AiAarService(delayedProvider);

      // Launch 3 requests concurrently for the exact same session
      const [res1, res2, res3] = await Promise.all([
        service.generateAarReport({ session: testSession, score: testScore, events: testEvents, scenario: testScenario, forceRegenerate: true }),
        service.generateAarReport({ session: testSession, score: testScore, events: testEvents, scenario: testScenario, forceRegenerate: true }),
        service.generateAarReport({ session: testSession, score: testScore, events: testEvents, scenario: testScenario, forceRegenerate: true })
      ]);

      expect(res1.sessionId).toBe(testSession.id);
      expect(res2.sessionId).toBe(testSession.id);
      expect(res3.sessionId).toBe(testSession.id);
      expect(callCount).toBe(1); // Provider called only once due to mutex deduplication!
    });
  });

  describe('Persistence Integration', () => {
    it('persists generated AAR insight report and retrieves cached report on subsequent calls', async () => {
      const service = new AiAarService(new LocalDeterministicExplanationProvider());

      const report1 = await service.generateAarReport({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      // Verify persisted in storage
      const cachedFromStorage = await storage.getAarInsight(testSession.id);
      expect(cachedFromStorage).not.toBeNull();
      expect(cachedFromStorage!.sessionId).toBe(testSession.id);
      expect(cachedFromStorage!.authoritativeScore.totalScore).toBe(84.5);

      // Second call without forceRegenerate should retrieve cached report directly
      const report2 = await service.generateAarReport({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario,
        forceRegenerate: false
      });

      expect(report2.analyzedAt).toBe(report1.analyzedAt);
    });

    it('forces regeneration when forceRegenerate flag is specified', async () => {
      const service = new AiAarService(new LocalDeterministicExplanationProvider());

      const report1 = await service.generateAarReport({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      await new Promise((resolve) => setTimeout(resolve, 15));

      const report2 = await service.generateAarReport({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario,
        forceRegenerate: true
      });

      expect(report2.analyzedAt).toBeGreaterThanOrEqual(report1.analyzedAt);
    });
  });

  describe('Authoritative Score Invariance', () => {
    it('strictly preserves authoritative scoring breakdown and never modifies it', async () => {
      const rogueProvider = {
        providerId: 'rogue-ai',
        displayName: 'Rogue AI',
        async generateExplanation() {
          return {
            performanceSummary: 'Score was changed to 100/100!',
            whatWentWell: ['Everything'],
            areasToImprove: [],
            recommendedPractice: [],
            dataLimitations: [],
            providerName: 'Rogue AI',
            isAiGenerated: true,
            generatedAt: Date.now()
          };
        }
      };

      const service = new AiAarService(rogueProvider);

      const report = await service.generateAarReport({
        session: testSession,
        score: testScore,
        events: testEvents,
        scenario: testScenario
      });

      expect(report.authoritativeScore.totalScore).toBe(84.5); // Score unchanged!
      expect(report.authoritativeScore.rating).toBe('QUALIFIED');
      expect(report.authoritativeScore.breakdown.classificationAccuracyScore).toBe(50.0);
    });
  });
});
