import { describe, it, expect, beforeEach } from 'vitest';
import { SCENARIOS } from '../src/data/mockScenarios';
import { evaluateSession, CURRENT_SCORING_VERSION } from '../src/game/assessment/ScoringEngine';
import { aiAarService, LocalDeterministicExplanationProvider } from '../src/services/aiAarService';
import { storage } from '../src/data/indexedDbAdapter';
import { TrainingSession, SimulationEvent } from '../src/types';

describe('After-Action Review (AAR) Hybrid Assistant Integration', () => {
  beforeEach(async () => {
    await storage.init();
    await storage.clearAllData();
    aiAarService.setPrimaryProvider(new LocalDeterministicExplanationProvider());
  });

  it('runs complete lifecycle: session simulation -> scoring -> insights -> persistence -> targeted review', async () => {
    const scenario = SCENARIOS[0]; // Border Outpost Perimeter (3 targets)
    expect(scenario.targets.length).toBe(3);

    const sessionIdA = `integration-session-A-${Date.now()}`;

    // 1. Generate realistic events for Session A
    const eventsA: SimulationEvent[] = [
      {
        id: 'ev-a-1',
        sessionId: sessionIdA,
        sequenceNumber: 1,
        simulationTimeMs: 1000,
        eventType: 'SESSION_START',
        payload: {}
      },
      {
        id: 'ev-a-2',
        sessionId: sessionIdA,
        sequenceNumber: 2,
        simulationTimeMs: 7000, // Target 1 (spawned at 4s -> 3.0s latency)
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-alpha',
          submittedClass: 'quadcopter_surveillance',
          confidence: 'confirmed'
        }
      },
      {
        id: 'ev-a-3',
        sessionId: sessionIdA,
        sequenceNumber: 3,
        simulationTimeMs: 31000, // Target 2 (spawned at 28s -> 3.0s latency)
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-bravo',
          submittedClass: 'fixed_wing_recon',
          confidence: 'confirmed'
        }
      },
      {
        id: 'ev-a-4',
        sessionId: sessionIdA,
        sequenceNumber: 4,
        simulationTimeMs: 44000, // Target 3 (spawned at 42s -> 2.0s latency)
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-charlie',
          submittedClass: 'micro_uav',
          confidence: 'confirmed'
        }
      },
      {
        id: 'ev-a-5',
        sessionId: sessionIdA,
        sequenceNumber: 5,
        simulationTimeMs: 60000,
        eventType: 'SESSION_COMPLETED',
        payload: {}
      }
    ];

    // 2. Score session deterministically
    const scoreA = evaluateSession(scenario, eventsA, sessionIdA);
    expect(scoreA.scoringVersion).toBe(CURRENT_SCORING_VERSION);
    expect(scoreA.passed).toBe(true);
    expect(scoreA.breakdown.classificationAccuracyScore).toBe(50); // 3 of 3 correct
    expect(scoreA.breakdown.falseAlarmPenalty).toBe(0);

    // 3. Persist session record
    const sessionRecordA: TrainingSession = {
      id: sessionIdA,
      userId: 'trainee-aar',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioVersion: scenario.version,
      difficulty: scenario.difficulty,
      startedAt: Date.now() - 65000,
      completedAt: Date.now() - 5000,
      status: 'completed',
      appVersion: '1.0.0'
    };

    await storage.saveSession(sessionRecordA);
    await storage.saveScore(scoreA);
    await storage.saveEvents(sessionIdA, eventsA);

    // 4. Generate AAR insight report
    const reportA = await aiAarService.generateAarReport({
      session: sessionRecordA,
      score: scoreA,
      events: eventsA,
      scenario
    });

    expect(reportA.sessionId).toBe(sessionIdA);
    expect(reportA.deterministicInsights.metrics.totalTargets).toBe(3);
    expect(reportA.deterministicInsights.metrics.correctClassifications).toBe(3);
    expect(reportA.deterministicInsights.metrics.accuracyPercentage).toBe(100);
    expect(reportA.deterministicInsights.metrics.averageLatencySec).toBeCloseTo(3.7, 1);
    expect(reportA.deterministicInsights.strengths.length).toBeGreaterThanOrEqual(3);

    // 5. Simulate a second, subsequent session (Session B) with lower score
    const sessionIdB = `integration-session-B-${Date.now()}`;
    const eventsB: SimulationEvent[] = [
      {
        id: 'ev-b-1',
        sessionId: sessionIdB,
        sequenceNumber: 1,
        simulationTimeMs: 1000,
        eventType: 'SESSION_START',
        payload: {}
      },
      {
        id: 'ev-b-2',
        sessionId: sessionIdB,
        sequenceNumber: 2,
        simulationTimeMs: 8000,
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-alpha',
          submittedClass: 'civilian_toy', // Misclassified!
          confidence: 'confirmed'
        }
      }
      // Targets 2 & 3 missed
    ];

    const scoreB = evaluateSession(scenario, eventsB, sessionIdB);
    const sessionRecordB: TrainingSession = {
      id: sessionIdB,
      userId: 'trainee-aar',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioVersion: scenario.version,
      difficulty: scenario.difficulty,
      startedAt: Date.now() - 2000,
      completedAt: Date.now(),
      status: 'completed',
      appVersion: '1.0.0'
    };

    await storage.saveSession(sessionRecordB);
    await storage.saveScore(scoreB);
    await storage.saveEvents(sessionIdB, eventsB);

    // 6. Generate report for Session B with history passed
    const historicalSessions = await storage.getAllSessions();
    const scoreMap = new Map();
    scoreMap.set(sessionIdA, scoreA);

    const reportB = await aiAarService.generateAarReport({
      session: sessionRecordB,
      score: scoreB,
      events: eventsB,
      scenario,
      historicalSessions,
      historicalScores: scoreMap
    });

    // Session B must target Session B, not Session A
    expect(reportB.sessionId).toBe(sessionIdB);
    expect(reportB.deterministicInsights.metrics.correctClassifications).toBe(0);
    expect(reportB.deterministicInsights.metrics.unattemptedTargets).toBe(2);
    expect(reportB.deterministicInsights.metrics.historicalTrend.hasBaseline).toBe(true);
    expect(reportB.deterministicInsights.metrics.historicalTrend.trendDirection).toBe('declining');

    // 7. Verify inspecting Session A again retrieves strictly Session A's cached report
    const retrievedReportA = await storage.getAarInsight(sessionIdA);
    expect(retrievedReportA).not.toBeNull();
    expect(retrievedReportA!.sessionId).toBe(sessionIdA);
    expect(retrievedReportA!.deterministicInsights.metrics.correctClassifications).toBe(3);
  });
});
