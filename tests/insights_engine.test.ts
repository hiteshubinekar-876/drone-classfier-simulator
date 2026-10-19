import { describe, it, expect } from 'vitest';
import {
  computeDeterministicInsights,
  INSIGHTS_ENGINE_VERSION
} from '../src/game/assessment/insightsEngine';
import {
  ScenarioDefinition,
  SimulationEvent,
  TrainingScore,
  TrainingSession
} from '../src/types';

const baseScenario: ScenarioDefinition = {
  id: 'test-scenario-alpha',
  name: 'Border Outpost Recon',
  codename: 'OP-TEST',
  description: 'Scenario for deterministic insights unit testing',
  environmentId: 'desert_outpost',
  difficulty: 'beginner',
  timeOfDay: 'day',
  durationSeconds: 60,
  version: '1.0.0',
  isRandomized: false,
  objectiveSummary: 'Benchmark scenario with 3 distinct drone archetypes',
  targets: [
    {
      id: 'target-1',
      callsign: 'VULTURE-1',
      threatClass: 'quadcopter_surveillance',
      flightProfile: 'hover',
      spawnTimeSec: 5,
      despawnTimeSec: 25,
      visualSignature: { color: '#333', rotorCount: 4, wingspanMeters: 0.8, beaconFlashHz: 1.0 },
      waypoints: []
    },
    {
      id: 'target-2',
      callsign: 'SWIFT-2',
      threatClass: 'fixed_wing_recon',
      flightProfile: 'linear_pass',
      spawnTimeSec: 25,
      despawnTimeSec: 45,
      visualSignature: { color: '#555', rotorCount: 1, wingspanMeters: 1.6, beaconFlashHz: 2.0 },
      waypoints: []
    },
    {
      id: 'target-3',
      callsign: 'MOSQUITO-3',
      threatClass: 'micro_uav',
      flightProfile: 'evasive_gusts',
      spawnTimeSec: 40,
      despawnTimeSec: 55,
      visualSignature: { color: '#222', rotorCount: 2, wingspanMeters: 0.25, beaconFlashHz: 3.0 },
      waypoints: []
    }
  ]
};

const completedSession: TrainingSession = {
  id: 'session-unit-1',
  userId: 'trainee-unit',
  scenarioId: 'test-scenario-alpha',
  scenarioName: 'Border Outpost Recon',
  scenarioVersion: '1.0.0',
  difficulty: 'beginner',
  startedAt: 1700000000000,
  completedAt: 1700000060000,
  status: 'completed',
  appVersion: '1.0.0'
};

describe('Deterministic Insights Engine', () => {
  it('correctly calculates metrics for a high-performing session', () => {
    const score: TrainingScore = {
      id: 'score-unit-1',
      sessionId: 'session-unit-1',
      scoringVersion: 'v1.0.0',
      totalScore: 92.5,
      passed: true,
      rating: 'EXEMPLARY',
      breakdown: {
        detectionLatencyScore: 28.5,
        classificationAccuracyScore: 50.0,
        trackingCoverageScore: 14.0,
        falseAlarmPenalty: 0
      },
      targetAssessments: [
        {
          targetId: 'target-1',
          callsign: 'VULTURE-1',
          expectedClass: 'quadcopter_surveillance',
          classifiedAs: 'quadcopter_surveillance',
          isCorrect: true,
          detectionLatencySec: 2.2,
          trackingDurationSec: 6.0,
          scoreContribution: 31.0
        },
        {
          targetId: 'target-2',
          callsign: 'SWIFT-2',
          expectedClass: 'fixed_wing_recon',
          classifiedAs: 'fixed_wing_recon',
          isCorrect: true,
          detectionLatencySec: 1.8,
          trackingDurationSec: 5.5,
          scoreContribution: 31.5
        },
        {
          targetId: 'target-3',
          callsign: 'MOSQUITO-3',
          expectedClass: 'micro_uav',
          classifiedAs: 'micro_uav',
          isCorrect: true,
          detectionLatencySec: 2.0,
          trackingDurationSec: 5.0,
          scoreContribution: 30.0
        }
      ],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const events: SimulationEvent[] = [];

    const insights = computeDeterministicInsights({
      session: completedSession,
      score,
      events,
      scenario: baseScenario
    });

    expect(insights.version).toBe(INSIGHTS_ENGINE_VERSION);
    expect(insights.metrics.totalTargets).toBe(3);
    expect(insights.metrics.totalAttempts).toBe(3);
    expect(insights.metrics.correctClassifications).toBe(3);
    expect(insights.metrics.incorrectClassifications).toBe(0);
    expect(insights.metrics.unattemptedTargets).toBe(0);
    expect(insights.metrics.accuracyPercentage).toBe(100);
    expect(insights.metrics.targetCoveragePercentage).toBe(100);
    expect(insights.metrics.averageLatencySec).toBe(2.0); // (2.2 + 1.8 + 2.0) / 3 = 2.0
    expect(insights.metrics.minLatencySec).toBe(1.8);
    expect(insights.metrics.maxLatencySec).toBe(2.2);
    expect(insights.metrics.falseAlarmCount).toBe(0);

    // Strengths
    expect(insights.strengths.some((s) => s.id === 'strength-accuracy')).toBe(true);
    expect(insights.strengths.some((s) => s.id === 'strength-speed')).toBe(true);
    expect(insights.strengths.some((s) => s.id === 'strength-discipline')).toBe(true);
    expect(insights.strengths.some((s) => s.id === 'strength-coverage')).toBe(true);

    // No areas to improve on flawless run
    expect(insights.areasToImprove).toHaveLength(0);
  });

  it('safely handles zero attempts without division by zero or NaN', () => {
    const emptyScore: TrainingScore = {
      id: 'score-zero',
      sessionId: 'session-zero',
      scoringVersion: 'v1.0.0',
      totalScore: 0,
      passed: false,
      rating: 'NEEDS_REMEDIATION',
      breakdown: {
        detectionLatencyScore: 0,
        classificationAccuracyScore: 0,
        trackingCoverageScore: 0,
        falseAlarmPenalty: 0
      },
      targetAssessments: [
        {
          targetId: 'target-1',
          callsign: 'VULTURE-1',
          expectedClass: 'quadcopter_surveillance',
          classifiedAs: undefined,
          isCorrect: false,
          detectionLatencySec: null,
          trackingDurationSec: 0,
          scoreContribution: 0
        },
        {
          targetId: 'target-2',
          callsign: 'SWIFT-2',
          expectedClass: 'fixed_wing_recon',
          classifiedAs: undefined,
          isCorrect: false,
          detectionLatencySec: null,
          trackingDurationSec: 0,
          scoreContribution: 0
        },
        {
          targetId: 'target-3',
          callsign: 'MOSQUITO-3',
          expectedClass: 'micro_uav',
          classifiedAs: undefined,
          isCorrect: false,
          detectionLatencySec: null,
          trackingDurationSec: 0,
          scoreContribution: 0
        }
      ],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const insights = computeDeterministicInsights({
      session: completedSession,
      score: emptyScore,
      events: [],
      scenario: baseScenario
    });

    expect(insights.metrics.totalAttempts).toBe(0);
    expect(insights.metrics.correctClassifications).toBe(0);
    expect(insights.metrics.incorrectClassifications).toBe(0);
    expect(insights.metrics.unattemptedTargets).toBe(3);
    expect(insights.metrics.accuracyPercentage).toBeNull(); // Safe: not NaN
    expect(insights.metrics.averageLatencySec).toBeNull(); // Safe: not NaN
    expect(insights.metrics.minLatencySec).toBeNull();
    expect(insights.metrics.maxLatencySec).toBeNull();
    expect(insights.metrics.targetCoveragePercentage).toBe(0);

    // Identified areas to improve
    expect(insights.areasToImprove.some((a) => a.id === 'gap-unattempted')).toBe(true);
    expect(insights.dataLimitations).toContain(
      'Zero Attempts: No classification actions were submitted by trainee.'
    );
  });

  it('safely handles an empty scenario configuration with 0 targets', () => {
    const emptyScenario: ScenarioDefinition = {
      ...baseScenario,
      id: 'empty-scenario',
      targets: []
    };

    const score: TrainingScore = {
      id: 'score-empty',
      sessionId: 'session-empty',
      scoringVersion: 'v1.0.0',
      totalScore: 0,
      passed: false,
      rating: 'NEEDS_REMEDIATION',
      breakdown: {
        detectionLatencyScore: 0,
        classificationAccuracyScore: 0,
        trackingCoverageScore: 0,
        falseAlarmPenalty: 0
      },
      targetAssessments: [],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const insights = computeDeterministicInsights({
      session: completedSession,
      score,
      events: [],
      scenario: emptyScenario
    });

    expect(insights.metrics.totalTargets).toBe(0);
    expect(insights.metrics.accuracyPercentage).toBeNull();
    expect(insights.metrics.targetCoveragePercentage).toBe(0);
    expect(insights.dataLimitations).toContain('Empty Airspace: No aerial targets configured in scenario.');
  });

  it('records transparent limitations for incomplete or abandoned sessions', () => {
    const incompleteSession: TrainingSession = {
      ...completedSession,
      status: 'abandoned',
      completedAt: null
    };

    const score: TrainingScore = {
      id: 'score-abandoned',
      sessionId: incompleteSession.id,
      scoringVersion: 'v1.0.0',
      totalScore: 20,
      passed: false,
      rating: 'NEEDS_REMEDIATION',
      breakdown: {
        detectionLatencyScore: 5,
        classificationAccuracyScore: 15,
        trackingCoverageScore: 0,
        falseAlarmPenalty: 0
      },
      targetAssessments: [
        {
          targetId: 'target-1',
          callsign: 'VULTURE-1',
          expectedClass: 'quadcopter_surveillance',
          classifiedAs: 'quadcopter_surveillance',
          isCorrect: true,
          detectionLatencySec: 3.5,
          trackingDurationSec: 2,
          scoreContribution: 20
        }
      ],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const insights = computeDeterministicInsights({
      session: incompleteSession,
      score,
      events: [],
      scenario: baseScenario
    });

    expect(insights.dataLimitations.some((l) => l.includes('Incomplete Mission'))).toBe(true);
  });

  it('accurately identifies false alarms and applies disciplinary insights', () => {
    const scoreWithFalseAlarm: TrainingScore = {
      id: 'score-fa',
      sessionId: 'session-fa',
      scoringVersion: 'v1.0.0',
      totalScore: 40,
      passed: false,
      rating: 'NEEDS_REMEDIATION',
      breakdown: {
        detectionLatencyScore: 20,
        classificationAccuracyScore: 30,
        trackingCoverageScore: 10,
        falseAlarmPenalty: 20 // 2 false alarms
      },
      targetAssessments: [
        {
          targetId: 'target-1',
          callsign: 'VULTURE-1',
          expectedClass: 'quadcopter_surveillance',
          classifiedAs: 'quadcopter_surveillance',
          isCorrect: true,
          detectionLatencySec: 3.0,
          trackingDurationSec: 5,
          scoreContribution: 30
        }
      ],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const insights = computeDeterministicInsights({
      session: completedSession,
      score: scoreWithFalseAlarm,
      events: [],
      scenario: baseScenario
    });

    expect(insights.metrics.falseAlarmCount).toBe(2);
    expect(insights.areasToImprove.some((a) => a.id === 'gap-false-alarms')).toBe(true);
    expect(insights.recommendations.some((r) => r.id === 'rec-positive-id')).toBe(true);
  });

  it('accurately pinpoints archetype recognition errors and recommends targeted drills', () => {
    const scoreWithConfusion: TrainingScore = {
      id: 'score-confusion',
      sessionId: 'session-confusion',
      scoringVersion: 'v1.0.0',
      totalScore: 55,
      passed: false,
      rating: 'NEEDS_REMEDIATION',
      breakdown: {
        detectionLatencyScore: 25,
        classificationAccuracyScore: 20,
        trackingCoverageScore: 10,
        falseAlarmPenalty: 0
      },
      targetAssessments: [
        {
          targetId: 'target-1',
          callsign: 'VULTURE-1',
          expectedClass: 'quadcopter_surveillance',
          classifiedAs: 'quadcopter_surveillance',
          isCorrect: true,
          detectionLatencySec: 3.0,
          trackingDurationSec: 5,
          scoreContribution: 30
        },
        {
          targetId: 'target-2',
          callsign: 'SWIFT-2',
          expectedClass: 'fixed_wing_recon',
          classifiedAs: 'quadcopter_surveillance', // Incorrect!
          isCorrect: false,
          detectionLatencySec: 4.0,
          trackingDurationSec: 4,
          scoreContribution: 10
        },
        {
          targetId: 'target-3',
          callsign: 'MOSQUITO-3',
          expectedClass: 'micro_uav',
          classifiedAs: 'civilian_toy', // Incorrect!
          isCorrect: false,
          detectionLatencySec: 12.0, // Sluggish!
          trackingDurationSec: 3,
          scoreContribution: 15
        }
      ],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const insights = computeDeterministicInsights({
      session: completedSession,
      score: scoreWithConfusion,
      events: [],
      scenario: baseScenario
    });

    expect(insights.metrics.correctClassifications).toBe(1);
    expect(insights.metrics.incorrectClassifications).toBe(2);
    expect(insights.metrics.accuracyPercentage).toBe(33.3);
    expect(insights.metrics.archetypeBreakdown.micro_uav.misclassified).toBe(1);
    expect(insights.metrics.archetypeBreakdown.fixed_wing_recon.misclassified).toBe(1);

    // Check specific recommendations
    expect(insights.areasToImprove.some((a) => a.id === 'gap-misclassification')).toBe(true);
    expect(insights.recommendations.some((r) => r.targetArchetype === 'micro_uav')).toBe(true);
  });

  it('determines historical performance trend accurately against prior sessions', () => {
    const priorSession1: TrainingSession = {
      id: 'prior-1',
      userId: 'trainee-unit',
      scenarioId: 'test-scenario-alpha',
      scenarioName: 'Border Outpost Recon',
      scenarioVersion: '1.0.0',
      difficulty: 'beginner',
      startedAt: 1690000000000,
      completedAt: 1690000060000,
      status: 'completed',
      appVersion: '1.0.0'
    };

    const priorScore1: TrainingScore = {
      id: 'score-prior-1',
      sessionId: 'prior-1',
      scoringVersion: 'v1.0.0',
      totalScore: 70.0,
      passed: true,
      rating: 'QUALIFIED',
      breakdown: { detectionLatencyScore: 20, classificationAccuracyScore: 35, trackingCoverageScore: 15, falseAlarmPenalty: 0 },
      targetAssessments: [],
      feedbackNotes: [],
      calculatedAt: 1690000060000
    };

    const currentScore: TrainingScore = {
      id: 'score-current',
      sessionId: 'session-unit-1',
      scoringVersion: 'v1.0.0',
      totalScore: 88.0, // +18.0 pts improvement
      passed: true,
      rating: 'EXEMPLARY',
      breakdown: { detectionLatencyScore: 28, classificationAccuracyScore: 45, trackingCoverageScore: 15, falseAlarmPenalty: 0 },
      targetAssessments: [
        {
          targetId: 'target-1',
          callsign: 'VULTURE-1',
          expectedClass: 'quadcopter_surveillance',
          classifiedAs: 'quadcopter_surveillance',
          isCorrect: true,
          detectionLatencySec: 2.0,
          trackingDurationSec: 5,
          scoreContribution: 30
        }
      ],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const scoreMap = new Map<string, TrainingScore>([['prior-1', priorScore1]]);

    const insights = computeDeterministicInsights({
      session: completedSession,
      score: currentScore,
      events: [],
      scenario: baseScenario,
      historicalSessions: [priorSession1],
      historicalScores: scoreMap
    });

    expect(insights.metrics.historicalTrend.hasBaseline).toBe(true);
    expect(insights.metrics.historicalTrend.priorSessionCount).toBe(1);
    expect(insights.metrics.historicalTrend.scoreDelta).toBe(18.0);
    expect(insights.metrics.historicalTrend.trendDirection).toBe('improving');
  });

  it('marks initial scenario completion as baseline with insufficient_history', () => {
    const currentScore: TrainingScore = {
      id: 'score-current',
      sessionId: 'session-unit-1',
      scoringVersion: 'v1.0.0',
      totalScore: 75.0,
      passed: true,
      rating: 'QUALIFIED',
      breakdown: { detectionLatencyScore: 20, classificationAccuracyScore: 40, trackingCoverageScore: 15, falseAlarmPenalty: 0 },
      targetAssessments: [],
      feedbackNotes: [],
      calculatedAt: 1700000060000
    };

    const insights = computeDeterministicInsights({
      session: completedSession,
      score: currentScore,
      events: [],
      scenario: baseScenario,
      historicalSessions: [] // No prior sessions
    });

    expect(insights.metrics.historicalTrend.hasBaseline).toBe(false);
    expect(insights.metrics.historicalTrend.trendDirection).toBe('insufficient_history');
    expect(insights.dataLimitations.some((l) => l.includes('Baseline Mission'))).toBe(true);
  });
});
