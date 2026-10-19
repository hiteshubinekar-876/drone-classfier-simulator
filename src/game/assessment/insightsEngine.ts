import {
  TrainingSession,
  TrainingScore,
  SimulationEvent,
  ScenarioDefinition,
  DroneThreatClass,
  THREAT_CATALOG
} from '../../types';
import {
  DeterministicInsights,
  DeterministicMetrics,
  InsightFinding,
  PracticeRecommendation,
  InsightThresholdConfig,
  DEFAULT_INSIGHT_THRESHOLDS,
  ArchetypeMetric,
  HistoricalTrendMetric,
  AuthoritativeScoreSnapshot
} from '../../types/aarInsights';

export const INSIGHTS_ENGINE_VERSION = 'v1.0.0';

export interface ComputeInsightsParams {
  session: TrainingSession;
  score: TrainingScore;
  events: SimulationEvent[];
  scenario: ScenarioDefinition;
  historicalSessions?: TrainingSession[];
  historicalScores?: Map<string, TrainingScore>;
  thresholds?: Partial<InsightThresholdConfig>;
}

/**
 * Computes deterministic, evidence-based training insights from completed session telemetry.
 * Pure functional execution: identical inputs always produce identical outputs.
 */
export function computeDeterministicInsights({
  session,
  score,
  events,
  scenario,
  historicalSessions = [],
  historicalScores = new Map(),
  thresholds = {}
}: ComputeInsightsParams): DeterministicInsights {
  const config: InsightThresholdConfig = {
    ...DEFAULT_INSIGHT_THRESHOLDS,
    ...thresholds
  };

  const dataLimitations: string[] = [];

  // 1. Data Integrity & Incomplete Session Checks
  const isSessionIncomplete = session.status !== 'completed';
  if (isSessionIncomplete) {
    dataLimitations.push(
      `Incomplete Mission: Session status is "${session.status}". Metrics reflect partial engagement.`
    );
  }

  const totalTargets = scenario.targets ? scenario.targets.length : 0;
  if (totalTargets === 0) {
    dataLimitations.push('Empty Airspace: No aerial targets configured in scenario.');
  }

  // 2. Count Correct, Incorrect, and Unattempted Assessments
  const assessments = score.targetAssessments || [];
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  for (const a of assessments) {
    if (a.isCorrect) {
      correctCount++;
    } else if (a.classifiedAs !== undefined && a.classifiedAs !== null) {
      incorrectCount++;
    } else {
      unattemptedCount++;
    }
  }

  // Calculate false alarm count from penalty and events
  let falseAlarmCount = 0;
  if (score.breakdown && typeof score.breakdown.falseAlarmPenalty === 'number' && score.breakdown.falseAlarmPenalty > 0) {
    falseAlarmCount = Math.floor(score.breakdown.falseAlarmPenalty / 10);
  } else if (events && events.length > 0) {
    const validTargetIds = new Set((scenario.targets || []).map((t) => t.id));
    for (const ev of events) {
      if (ev.eventType === 'CLASSIFICATION_SUBMITTED') {
        const tid = ev.payload.targetId;
        if (!tid || !validTargetIds.has(tid)) {
          falseAlarmCount++;
        }
      }
    }
  }

  const evaluatedAttempts = correctCount + incorrectCount;
  const totalAttempts = evaluatedAttempts + falseAlarmCount;

  if (totalTargets > 0 && totalAttempts === 0) {
    dataLimitations.push('Zero Attempts: No classification actions were submitted by trainee.');
  }

  // 3. Accuracy and Coverage Calculations
  const accuracyPercentage =
    evaluatedAttempts >= config.minAttemptsForAccuracyRatio
      ? Math.round((correctCount / evaluatedAttempts) * 1000) / 10
      : null;

  const targetCoveragePercentage =
    totalTargets > 0
      ? Math.round(((totalTargets - unattemptedCount) / totalTargets) * 1000) / 10
      : 0;

  // 4. Detection Latency Metrics
  const validLatencies: number[] = [];
  for (const a of assessments) {
    if (typeof a.detectionLatencySec === 'number' && !isNaN(a.detectionLatencySec) && a.detectionLatencySec >= 0) {
      validLatencies.push(a.detectionLatencySec);
    }
  }

  let averageLatencySec: number | null = null;
  let minLatencySec: number | null = null;
  let maxLatencySec: number | null = null;

  if (validLatencies.length > 0) {
    const sum = validLatencies.reduce((acc, curr) => acc + curr, 0);
    averageLatencySec = Math.round((sum / validLatencies.length) * 10) / 10;
    minLatencySec = Math.round(Math.min(...validLatencies) * 10) / 10;
    maxLatencySec = Math.round(Math.max(...validLatencies) * 10) / 10;
  }

  // 5. Archetype Breakdown
  const archetypeClasses: DroneThreatClass[] = [
    'quadcopter_surveillance',
    'fixed_wing_recon',
    'micro_uav',
    'civilian_toy'
  ];

  const archetypeBreakdown: Record<DroneThreatClass, ArchetypeMetric> = {
    quadcopter_surveillance: { archetype: 'quadcopter_surveillance', presented: 0, correct: 0, misclassified: 0, accuracyPercentage: null },
    fixed_wing_recon: { archetype: 'fixed_wing_recon', presented: 0, correct: 0, misclassified: 0, accuracyPercentage: null },
    micro_uav: { archetype: 'micro_uav', presented: 0, correct: 0, misclassified: 0, accuracyPercentage: null },
    civilian_toy: { archetype: 'civilian_toy', presented: 0, correct: 0, misclassified: 0, accuracyPercentage: null }
  };

  if (scenario.targets) {
    for (const target of scenario.targets) {
      if (archetypeBreakdown[target.threatClass]) {
        archetypeBreakdown[target.threatClass].presented++;
      }
    }
  }

  for (const a of assessments) {
    const entry = archetypeBreakdown[a.expectedClass];
    if (entry) {
      if (a.isCorrect) {
        entry.correct++;
      } else if (a.classifiedAs !== undefined && a.classifiedAs !== null) {
        entry.misclassified++;
      }
    }
  }

  for (const key of archetypeClasses) {
    const item = archetypeBreakdown[key];
    const evaluated = item.correct + item.misclassified;
    item.accuracyPercentage = evaluated > 0 ? Math.round((item.correct / evaluated) * 1000) / 10 : null;
  }

  // 6. Historical Trend Calculation
  const priorSessions = (historicalSessions || []).filter(
    (s) =>
      s.id !== session.id &&
      s.scenarioId === scenario.id &&
      s.status === 'completed' &&
      s.completedAt !== null &&
      s.startedAt < session.startedAt
  );

  let historicalTrend: HistoricalTrendMetric;

  if (priorSessions.length === 0) {
    historicalTrend = {
      hasBaseline: false,
      priorSessionCount: 0,
      scoreDelta: null,
      accuracyDelta: null,
      latencyDeltaSec: null,
      trendDirection: 'insufficient_history'
    };
    dataLimitations.push('Baseline Mission: No previous completed sessions on this scenario for historical trend comparison.');
  } else {
    let priorScoreSum = 0;
    let priorScoreCount = 0;

    for (const ps of priorSessions) {
      const pScore = historicalScores.get(ps.id);
      if (pScore && typeof pScore.totalScore === 'number') {
        priorScoreSum += pScore.totalScore;
        priorScoreCount++;
      }
    }

    if (priorScoreCount > 0) {
      const avgPriorScore = priorScoreSum / priorScoreCount;
      const scoreDelta = Math.round((score.totalScore - avgPriorScore) * 10) / 10;

      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
      if (scoreDelta >= 5.0) {
        trendDirection = 'improving';
      } else if (scoreDelta <= -5.0) {
        trendDirection = 'declining';
      }

      historicalTrend = {
        hasBaseline: true,
        priorSessionCount: priorScoreCount,
        scoreDelta,
        accuracyDelta: null,
        latencyDeltaSec: null,
        trendDirection
      };
    } else {
      historicalTrend = {
        hasBaseline: false,
        priorSessionCount: 0,
        scoreDelta: null,
        accuracyDelta: null,
        latencyDeltaSec: null,
        trendDirection: 'insufficient_history'
      };
      dataLimitations.push('Historical Scores Missing: Previous session records exist but score records could not be resolved.');
    }
  }

  const metrics: DeterministicMetrics = {
    totalTargets,
    totalAttempts,
    correctClassifications: correctCount,
    incorrectClassifications: incorrectCount,
    unattemptedTargets: unattemptedCount,
    accuracyPercentage,
    targetCoveragePercentage,
    averageLatencySec,
    minLatencySec,
    maxLatencySec,
    falseAlarmCount,
    archetypeBreakdown,
    historicalTrend
  };

  // 7. Deterministic Strengths Generation
  const strengths: InsightFinding[] = [];

  // Strength: Accuracy
  if (accuracyPercentage !== null && accuracyPercentage >= 80) {
    strengths.push({
      id: 'strength-accuracy',
      category: 'accuracy',
      title: accuracyPercentage === 100 ? 'Flawless Visual Classification' : 'High Classification Accuracy',
      detail: `Accurately identified ${correctCount} of ${evaluatedAttempts} engaged drone contacts (${accuracyPercentage}%).`,
      evidence: [
        { label: 'Classification Accuracy', value: `${accuracyPercentage}%` },
        { label: 'Correct Identifications', value: `${correctCount} / ${evaluatedAttempts}` }
      ]
    });
  }

  // Strength: Rapid Response Time
  if (averageLatencySec !== null && averageLatencySec <= config.rapidLatencyThresholdSec) {
    strengths.push({
      id: 'strength-speed',
      category: 'speed',
      title: 'Rapid Target Acquisition',
      detail: `Average target acquisition latency was ${averageLatencySec}s, well within the tactical reaction benchmark (${config.rapidLatencyThresholdSec}s).`,
      evidence: [
        { label: 'Mean Latency', value: `${averageLatencySec}s` },
        { label: 'Best Reaction', value: `${minLatencySec ?? averageLatencySec}s` }
      ]
    });
  }

  // Strength: Trigger Discipline
  if (falseAlarmCount === 0 && evaluatedAttempts > 0) {
    strengths.push({
      id: 'strength-discipline',
      category: 'trigger_discipline',
      title: 'Disciplined Engagement Protocol',
      detail: 'Zero false alarms or blind submissions. Every reported contact was verified against an active airspace signature.',
      evidence: [
        { label: 'False Alarms', value: 0 },
        { label: 'Trigger Penalty', value: '0 pts' }
      ]
    });
  }

  // Strength: Airspace Coverage
  if (unattemptedCount === 0 && totalTargets > 0) {
    strengths.push({
      id: 'strength-coverage',
      category: 'coverage',
      title: 'Comprehensive Airspace Coverage',
      detail: `Engaged all ${totalTargets} aerial intrusions before despawn. No contacts escaped unobserved.`,
      evidence: [
        { label: 'Airspace Coverage', value: '100%' },
        { label: 'Targets Addressed', value: `${totalTargets} / ${totalTargets}` }
      ]
    });
  }

  // Strength: Archetype Specific Mastery
  for (const arch of archetypeClasses) {
    const item = archetypeBreakdown[arch];
    if (item.presented >= 1 && item.correct === item.presented) {
      const meta = THREAT_CATALOG[arch];
      strengths.push({
        id: `strength-archetype-${arch}`,
        category: 'threat_recognition',
        title: `Proficient ${meta.category} Recognition`,
        detail: `Achieved 100% correct identification on ${meta.displayName} targets (${item.correct}/${item.presented}).`,
        evidence: [
          { label: 'Archetype', value: meta.displayName },
          { label: 'Success Rate', value: `${item.correct}/${item.presented} (100%)` }
        ]
      });
      break; // Keep to 1 archetype highlight to avoid clutter
    }
  }

  // 8. Deterministic Areas to Improve Generation
  const areasToImprove: InsightFinding[] = [];

  // Area: Missed Targets / Airspace Incursions
  if (unattemptedCount > 0) {
    const missedCallsigns = assessments
      .filter((a) => a.classifiedAs === undefined || a.classifiedAs === null)
      .map((a) => a.callsign)
      .join(', ');

    areasToImprove.push({
      id: 'gap-unattempted',
      category: 'coverage',
      title: 'Unaddressed Airspace Incursions',
      detail: `${unattemptedCount} target(s) traversed the perimeter and departed without classification (${missedCallsigns || 'Unidentified'}).`,
      evidence: [
        { label: 'Missed Contacts', value: unattemptedCount },
        { label: 'Target Coverage', value: `${targetCoveragePercentage}%` }
      ]
    });
  }

  // Area: Misclassifications
  if (incorrectCount > 0) {
    const misclassifiedList = assessments
      .filter((a) => !a.isCorrect && a.classifiedAs !== undefined && a.classifiedAs !== null)
      .map((a) => `${a.callsign} (ground truth: ${THREAT_CATALOG[a.expectedClass].category}, reported: ${THREAT_CATALOG[a.classifiedAs!].category})`)
      .slice(0, 3)
      .join('; ');

    areasToImprove.push({
      id: 'gap-misclassification',
      category: 'threat_recognition',
      title: 'Archetype Recognition Discrepancies',
      detail: `Incorrectly classified ${incorrectCount} contact(s): ${misclassifiedList}.`,
      evidence: [
        { label: 'Misclassifications', value: incorrectCount },
        { label: 'Accuracy Rate', value: `${accuracyPercentage ?? 0}%` }
      ]
    });
  }

  // Area: Sluggish Latency
  if (averageLatencySec !== null && averageLatencySec > config.sluggishLatencyThresholdSec) {
    areasToImprove.push({
      id: 'gap-latency',
      category: 'speed',
      title: 'Elevated Acquisition Latency',
      detail: `Average reaction time of ${averageLatencySec}s exceeds tactical target benchmark (${config.sluggishLatencyThresholdSec}s). Contacts hovered or traversed for prolonged durations prior to reporting.`,
      evidence: [
        { label: 'Mean Latency', value: `${averageLatencySec}s` },
        { label: 'Benchmark Target', value: `<=${config.rapidLatencyThresholdSec}s` }
      ]
    });
  }

  // Area: False Alarm Deductions
  if (falseAlarmCount > 0) {
    const penaltyPts = score.breakdown?.falseAlarmPenalty || falseAlarmCount * 10;
    areasToImprove.push({
      id: 'gap-false-alarms',
      category: 'trigger_discipline',
      title: 'False Alarm Deductions',
      detail: `Triggered ${falseAlarmCount} unverified classification submission(s), incurring a -${penaltyPts} point deduction.`,
      evidence: [
        { label: 'False Alarms', value: falseAlarmCount },
        { label: 'Points Deducted', value: `-${penaltyPts} pts` }
      ]
    });
  }

  // 9. Practice Recommendations Generation
  const recommendations: PracticeRecommendation[] = [];

  // Recommendation 1: Based on missed targets
  if (unattemptedCount > 0) {
    recommendations.push({
      id: 'rec-scan-cadence',
      priority: 'high',
      title: 'Establish Horizon Scanning Cadence',
      actionPlan: 'Practice continuous 360-degree sector sweeps at 5-second intervals rather than fixating on single quadrants.',
      rationale: `${unattemptedCount} aerial target(s) completed flight paths without timely detection.`
    });
  }

  // Recommendation 2: Based on specific archetype confusion
  if (archetypeBreakdown.micro_uav.misclassified > 0 || (archetypeBreakdown.micro_uav.presented > 0 && archetypeBreakdown.micro_uav.correct === 0)) {
    recommendations.push({
      id: 'rec-micro-uav',
      priority: 'high',
      targetArchetype: 'micro_uav',
      suggestedScenarioCodename: 'OP-MIST',
      title: 'Nano/Micro Swarm Detection Drill',
      actionPlan: 'Engage 3.2x binocular zoom immediately upon audio cue to resolve sub-0.3m optical cross-sections against background clutter.',
      rationale: 'Micro-UAV targets present minimal radar cross-sections and rapid altitude shifts.'
    });
  } else if (archetypeBreakdown.civilian_toy.misclassified > 0) {
    recommendations.push({
      id: 'rec-civilian-decoy',
      priority: 'medium',
      targetArchetype: 'civilian_toy',
      title: 'Commercial Decoy Discrimination',
      actionPlan: 'Inspect rotor housings and navigation lights. Consumer quadcopters lack optical pods and display recreational color schemes.',
      rationale: 'Civilian toy quadcopters were misidentified as military reconnaissance threats.'
    });
  } else if (archetypeBreakdown.fixed_wing_recon.misclassified > 0) {
    recommendations.push({
      id: 'rec-fixed-wing',
      priority: 'medium',
      targetArchetype: 'fixed_wing_recon',
      suggestedScenarioCodename: 'OP-SKYLINE',
      title: 'Fixed-Wing High-Velocity Tracking',
      actionPlan: 'Anticipate linear passes and banked turns. Fixed-wing platforms do not hover and exhibit delta-wing silhouettes.',
      rationale: 'High transit velocities led to misclassification of fixed-wing assets.'
    });
  }

  // Recommendation 3: Based on latency
  if (averageLatencySec !== null && averageLatencySec > config.sluggishLatencyThresholdSec) {
    recommendations.push({
      id: 'rec-rapid-optics',
      priority: 'medium',
      title: 'Optics Hotkey & Lock Streamlining',
      actionPlan: 'Utilize mouse look sensitivity calibration and hotkeys [1]-[4] inside the classification drawer to cut decision latency.',
      rationale: `Average acquisition time was ${averageLatencySec}s, reducing overall mission score.`
    });
  }

  // Recommendation 4: Based on false alarms
  if (falseAlarmCount > 0) {
    recommendations.push({
      id: 'rec-positive-id',
      priority: 'high',
      title: 'Enforce Positive Visual Confirmation',
      actionPlan: 'Confirm contact reticle lock brackets (`┌ ┐ └ ┘`) before triggering classification drawer to prevent blind submissions.',
      rationale: `${falseAlarmCount} false alarm trigger(s) caused heavy scoring penalties.`
    });
  }

  // Default recommendation if performance was exemplary
  if (recommendations.length === 0 && score.passed) {
    recommendations.push({
      id: 'rec-advanced-progression',
      priority: 'low',
      title: 'Advance to Reduced Observation Pacing / Advanced Scenarios',
      actionPlan: 'Engage higher difficulty scenarios (Intermediate or Advanced) and test lower graphics field of view or challenging weather biomes.',
      rationale: 'Current operational parameters have been mastered at qualified or exemplary level.'
    });
  }

  return {
    version: INSIGHTS_ENGINE_VERSION,
    analyzedAt: Date.now(),
    metrics,
    strengths,
    areasToImprove,
    recommendations,
    dataLimitations
  };
}

/**
 * Creates an authoritative score snapshot for inclusion in AAR reports.
 */
export function createAuthoritativeScoreSnapshot(score: TrainingScore): AuthoritativeScoreSnapshot {
  return {
    totalScore: score.totalScore,
    passed: score.passed,
    rating: score.rating,
    breakdown: { ...score.breakdown },
    scoringVersion: score.scoringVersion
  };
}
