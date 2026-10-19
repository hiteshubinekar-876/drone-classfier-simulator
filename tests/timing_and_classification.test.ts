import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SCENARIOS } from '../src/data/mockScenarios';
import { ScenarioEngine } from '../src/game/scenarios/ScenarioEngine';
import { evaluateSession } from '../src/game/assessment/ScoringEngine';

describe('Timer Pacing, Pause Integrity & Duplicate Submission Prevention', () => {
  it('correctly freezes simulation time when paused and resumes accurately', () => {
    const scenario = SCENARIOS[0];
    const scene = new THREE.Scene();
    const sessionId = `pause-test-${Date.now()}`;
    const engine = new ScenarioEngine(scenario, sessionId, scene);

    engine.start();
    expect(engine.elapsedSimTimeSec).toBe(0);

    // Run 3 seconds
    engine.update(3.0);
    expect(engine.elapsedSimTimeSec).toBeCloseTo(3.0, 2);

    // Pause
    engine.pause();
    expect(engine.isPaused).toBe(true);

    // Update while paused should NOT advance simulation time
    engine.update(10.0);
    expect(engine.elapsedSimTimeSec).toBeCloseTo(3.0, 2);

    // Resume
    engine.resume();
    expect(engine.isPaused).toBe(false);

    // Advance 2 more seconds
    engine.update(2.0);
    expect(engine.elapsedSimTimeSec).toBeCloseTo(5.0, 2);

    engine.dispose();
  });

  it('supports configurable pacing multipliers (extended 1.35x and relaxed 1.7x)', () => {
    const scenario = SCENARIOS[0];
    const scene = new THREE.Scene();
    const sessionId = `pacing-test-${Date.now()}`;

    // Test extended pacing: 1.35x
    const engineExtended = new ScenarioEngine(scenario, sessionId, scene, 1.35);
    engineExtended.start();

    // At t = 4s in standard time, target-alpha enters. In 1.35x pacing, target spawns at 4 * 1.35 = 5.4s.
    engineExtended.update(4.5);
    expect(engineExtended.getActiveDrones().size).toBe(0); // Not yet spawned

    engineExtended.update(1.0); // Now t = 5.5s
    expect(engineExtended.getActiveDrones().size).toBe(1); // Spawned!
    expect(engineExtended.getActiveDrones().has('target-alpha')).toBe(true);

    engineExtended.dispose();
  });

  it('prevents duplicate score counting if multiple classifications are submitted for the same target', () => {
    const scenario = SCENARIOS[0];
    const scene = new THREE.Scene();
    const sessionId = `duplicate-prevent-test-${Date.now()}`;
    const engine = new ScenarioEngine(scenario, sessionId, scene);

    engine.start();
    engine.update(5.0); // Target alpha is active

    // Emit lock event
    engine.emitEvent('TARGET_LOCK_ACQUIRED', {
      targetId: 'target-alpha',
      distanceMeters: 400
    });

    // Trainee submits first classification
    engine.emitEvent('CLASSIFICATION_SUBMITTED', {
      targetId: 'target-alpha',
      submittedClass: 'quadcopter_surveillance',
      confidence: 'confirmed',
      distanceMeters: 400
    });

    // Rapid second click / duplicate submission attempt for target-alpha
    engine.emitEvent('CLASSIFICATION_SUBMITTED', {
      targetId: 'target-alpha',
      submittedClass: 'quadcopter_surveillance',
      confidence: 'confirmed',
      distanceMeters: 390
    });

    // Fast third click with different class
    engine.emitEvent('CLASSIFICATION_SUBMITTED', {
      targetId: 'target-alpha',
      submittedClass: 'civilian_toy',
      confidence: 'suspected',
      distanceMeters: 380
    });

    // Advance to end of scenario
    engine.update(70.0);

    const events = engine.getEvents();
    const score = evaluateSession(scenario, events, sessionId);

    // Target assessments must only have 1 entry for target-alpha
    const alphaAssessments = score.targetAssessments.filter((t) => t.targetId === 'target-alpha');
    expect(alphaAssessments).toHaveLength(1);
    expect(alphaAssessments[0].isCorrect).toBe(true);
    expect(alphaAssessments[0].classifiedAs).toBe('quadcopter_surveillance');

    // Total target assessments count equals total scenario targets count
    expect(score.targetAssessments).toHaveLength(scenario.targets.length);

    engine.dispose();
  });

  it('correctly records missed targets on departure without auto-answering them', () => {
    const scenario = SCENARIOS[0];
    const scene = new THREE.Scene();
    const sessionId = `missed-target-test-${Date.now()}`;
    const engine = new ScenarioEngine(scenario, sessionId, scene);

    engine.start();

    // Advance through whole scenario without submitting any classification
    engine.update(80.0);
    expect(engine.isCompleted).toBe(true);

    const events = engine.getEvents();
    const score = evaluateSession(scenario, events, sessionId);

    // All targets should be evaluated as missed (classifiedAs is null, isCorrect is false)
    expect(score.targetAssessments).toHaveLength(3);
    for (const assessment of score.targetAssessments) {
      expect(assessment.isCorrect).toBe(false);
      expect(assessment.classifiedAs).toBeUndefined();
      expect(assessment.scoreContribution).toBe(0);
    }

    expect(score.passed).toBe(false);
    expect(score.rating).toBe('NEEDS_REMEDIATION');

    engine.dispose();
  });
});
