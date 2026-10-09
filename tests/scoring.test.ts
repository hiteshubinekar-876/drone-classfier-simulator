import { describe, it, expect } from 'vitest';
import { evaluateSession, CURRENT_SCORING_VERSION } from '../src/game/assessment/ScoringEngine';
import { ScenarioDefinition, SimulationEvent } from '../src/types';

const testScenario: ScenarioDefinition = {
  id: 'test-scenario',
  name: 'Test Benchmark',
  codename: 'TEST-1',
  description: 'Deterministic unit test scenario',
  environmentId: 'desert_outpost',
  difficulty: 'beginner',
  timeOfDay: 'day',
  durationSeconds: 60,
  version: '1.0.0',
  isRandomized: false,
  objectiveSummary: 'Test scenario with 2 targets',
  targets: [
    {
      id: 'target-1',
      callsign: 'ALPHA',
      threatClass: 'quadcopter_surveillance',
      flightProfile: 'hover',
      spawnTimeSec: 5,
      despawnTimeSec: 30,
      visualSignature: {
        color: '#222',
        rotorCount: 4,
        wingspanMeters: 0.8,
        beaconFlashHz: 1.0
      },
      waypoints: []
    },
    {
      id: 'target-2',
      callsign: 'BRAVO',
      threatClass: 'fixed_wing_recon',
      flightProfile: 'linear_pass',
      spawnTimeSec: 20,
      despawnTimeSec: 50,
      visualSignature: {
        color: '#444',
        rotorCount: 1,
        wingspanMeters: 1.5,
        beaconFlashHz: 2.0
      },
      waypoints: []
    }
  ]
};

describe('Deterministic Scoring Engine (v1.0.0)', () => {
  it('awards high score for swift and accurate classifications', () => {
    const events: SimulationEvent[] = [
      {
        id: 'ev-1',
        sessionId: 'sess-1',
        sequenceNumber: 1,
        simulationTimeMs: 7000, // 2s after spawn
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-1',
          submittedClass: 'quadcopter_surveillance',
          confidence: 'confirmed'
        }
      },
      {
        id: 'ev-2',
        sessionId: 'sess-1',
        sequenceNumber: 2,
        simulationTimeMs: 22000, // 2s after spawn
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-2',
          submittedClass: 'fixed_wing_recon',
          confidence: 'confirmed'
        }
      }
    ];

    const result = evaluateSession(testScenario, events, 'sess-1');
    expect(result.scoringVersion).toBe(CURRENT_SCORING_VERSION);
    expect(result.passed).toBe(true);
    expect(result.totalScore).toBeGreaterThanOrEqual(70);
    expect(result.breakdown.classificationAccuracyScore).toBe(50); // Both correct
    expect(result.breakdown.falseAlarmPenalty).toBe(0);
    expect(result.targetAssessments).toHaveLength(2);
    expect(result.targetAssessments[0].isCorrect).toBe(true);
    expect(result.targetAssessments[1].isCorrect).toBe(true);
  });

  it('penalizes incorrect classifications and missed targets', () => {
    const events: SimulationEvent[] = [
      {
        id: 'ev-1',
        sessionId: 'sess-2',
        sequenceNumber: 1,
        simulationTimeMs: 8000,
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-1',
          submittedClass: 'civilian_toy', // Wrong
          confidence: 'confirmed'
        }
      }
      // Target 2 completely missed
    ];

    const result = evaluateSession(testScenario, events, 'sess-2');
    expect(result.passed).toBe(false);
    expect(result.rating).toBe('NEEDS_REMEDIATION');
    expect(result.breakdown.classificationAccuracyScore).toBe(0);
    expect(result.targetAssessments[0].isCorrect).toBe(false);
    expect(result.targetAssessments[1].isCorrect).toBe(false);
    expect(result.targetAssessments[1].detectionLatencySec).toBeNull();
  });

  it('applies penalty for false alarm guesses', () => {
    const events: SimulationEvent[] = [
      {
        id: 'ev-1',
        sessionId: 'sess-3',
        sequenceNumber: 1,
        simulationTimeMs: 10000,
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'non-existent-drone',
          submittedClass: 'quadcopter_surveillance'
        }
      }
    ];

    const result = evaluateSession(testScenario, events, 'sess-3');
    expect(result.breakdown.falseAlarmPenalty).toBe(10);
    expect(result.totalScore).toBe(0);
  });

  it('is purely deterministic across multiple executions', () => {
    const events: SimulationEvent[] = [
      {
        id: 'ev-1',
        sessionId: 'sess-4',
        sequenceNumber: 1,
        simulationTimeMs: 10000,
        eventType: 'CLASSIFICATION_SUBMITTED',
        payload: {
          targetId: 'target-1',
          submittedClass: 'quadcopter_surveillance'
        }
      }
    ];

    const runA = evaluateSession(testScenario, events, 'sess-4');
    const runB = evaluateSession(testScenario, events, 'sess-4');
    expect(runA.totalScore).toBe(runB.totalScore);
    expect(runA.breakdown).toEqual(runB.breakdown);
    expect(runA.feedbackNotes).toEqual(runB.feedbackNotes);
  });
});
