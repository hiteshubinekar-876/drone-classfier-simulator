import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SCENARIOS } from '../src/data/mockScenarios';
import { ScenarioEngine } from '../src/game/scenarios/ScenarioEngine';
import { TargetTracker } from '../src/game/assessment/TargetTracker';
import { evaluateSession, CURRENT_SCORING_VERSION } from '../src/game/assessment/ScoringEngine';
import { storage } from '../src/data/indexedDbAdapter';
import { TrainingSession } from '../src/types';

describe('End-to-End User Training Loop', () => {
  it('executes the full scenario to score to persistence lifecycle', async () => {
    await storage.init();

    // 1. Select scenario
    const scenario = SCENARIOS[0]; // Border Outpost Perimeter
    expect(scenario.targets.length).toBe(3);

    // 2. Initialize 3D Scene & Scenario Engine
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    camera.position.set(0, 2.4, 0);

    const sessionId = `e2e-session-${Date.now()}`;
    const engine = new ScenarioEngine(scenario, sessionId, scene);
    const tracker = new TargetTracker(camera);

    engine.start();
    expect(engine.isRunning).toBe(true);

    // 3. Simulation advances: Target 1 enters airspace at t = 4s
    engine.update(5.0);
    const activeDrones = engine.getActiveDrones();
    expect(activeDrones.size).toBe(1);
    expect(activeDrones.has('target-alpha')).toBe(true);

    // 4. Trainee aims camera towards Target 1 position
    const drone1 = activeDrones.get('target-alpha')!;
    camera.lookAt(drone1.group.position);

    const lockResults = tracker.evaluateActiveTargets(activeDrones, false, 1920, 1080);
    expect(lockResults.length).toBe(1);
    expect(lockResults[0].targetId).toBe('target-alpha');
    expect(lockResults[0].isLocked).toBe(true);

    // Record Lock Event
    engine.emitEvent('TARGET_LOCK_ACQUIRED', {
      targetId: 'target-alpha',
      distanceMeters: lockResults[0].distanceMeters
    });

    // 5. Trainee classifies Target 1 (VULTURE-1) as 'quadcopter_surveillance'
    engine.emitEvent('CLASSIFICATION_SUBMITTED', {
      targetId: 'target-alpha',
      submittedClass: 'quadcopter_surveillance',
      confidence: 'confirmed',
      distanceMeters: lockResults[0].distanceMeters
    });

    // 6. Advance to Target 2 (SWIFT-2 fixed-wing) entrance at t = 28s
    engine.update(24.0);
    expect(engine.elapsedSimTimeSec).toBe(29.0);
    expect(activeDrones.has('target-bravo')).toBe(true);

    // Classify Target 2 correctly
    engine.emitEvent('CLASSIFICATION_SUBMITTED', {
      targetId: 'target-bravo',
      submittedClass: 'fixed_wing_recon',
      confidence: 'confirmed'
    });

    // 7. Advance to Target 3 (MOSQUITO-3 micro-UAV) entrance at t = 42s
    engine.update(16.0);
    expect(engine.elapsedSimTimeSec).toBe(45.0);
    expect(activeDrones.has('target-charlie')).toBe(true);

    // Classify Target 3 correctly
    engine.emitEvent('CLASSIFICATION_SUBMITTED', {
      targetId: 'target-charlie',
      submittedClass: 'micro_uav',
      confidence: 'confirmed'
    });

    // 8. Advance past duration to complete scenario
    engine.update(40.0);
    expect(engine.isCompleted).toBe(true);

    // 8. Evaluate Score
    const events = engine.getEvents();
    const score = evaluateSession(scenario, events, sessionId);

    expect(score.sessionId).toBe(sessionId);
    expect(score.scoringVersion).toBe(CURRENT_SCORING_VERSION);
    expect(score.passed).toBe(true);
    expect(score.totalScore).toBeGreaterThanOrEqual(60);
    expect(score.targetAssessments).toHaveLength(3);
    expect(score.targetAssessments[0].isCorrect).toBe(true);
    expect(score.targetAssessments[1].isCorrect).toBe(true);

    // 9. Persist to storage adapter
    const sessionRecord: TrainingSession = {
      id: sessionId,
      userId: 'guest-trainee',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioVersion: scenario.version,
      difficulty: scenario.difficulty,
      startedAt: Date.now() - 75000,
      completedAt: Date.now(),
      status: 'completed',
      appVersion: '1.0.0'
    };

    await storage.saveSession(sessionRecord);
    await storage.saveScore(score);
    await storage.saveEvents(sessionId, events);

    // 10. Verify storage retrieval
    const retrievedSession = await storage.getSession(sessionId);
    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession!.id).toBe(sessionId);
    expect(retrievedSession!.scenarioName).toBe('Border Outpost Perimeter');

    const retrievedScore = await storage.getScore(sessionId);
    expect(retrievedScore).not.toBeNull();
    expect(retrievedScore!.totalScore).toBe(score.totalScore);
    expect(retrievedScore!.breakdown).toEqual(score.breakdown);

    const retrievedEvents = await storage.getEvents(sessionId);
    expect(retrievedEvents.length).toBe(events.length);

    engine.dispose();
  });
});
