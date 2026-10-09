import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ScenarioEngine } from '../src/game/scenarios/ScenarioEngine';
import { ScenarioDefinition } from '../src/types';

const mockScenario: ScenarioDefinition = {
  id: 'mock-engine-scenario',
  name: 'Engine Test Scenario',
  codename: 'MOCK-ENG',
  description: 'Validates lifecycle and interpolation',
  environmentId: 'desert_outpost',
  difficulty: 'beginner',
  timeOfDay: 'day',
  durationSeconds: 30,
  version: '1.0.0',
  isRandomized: false,
  objectiveSummary: 'Test scenario',
  targets: [
    {
      id: 'target-1',
      callsign: 'TGT-1',
      threatClass: 'quadcopter_surveillance',
      flightProfile: 'hover',
      spawnTimeSec: 2,
      despawnTimeSec: 10,
      visualSignature: {
        color: '#111',
        rotorCount: 4,
        wingspanMeters: 0.8,
        beaconFlashHz: 1.0
      },
      waypoints: [
        { timeSec: 2, position: [0, 10, -20], speedMps: 2 },
        { timeSec: 10, position: [20, 15, -40], speedMps: 4 }
      ]
    }
  ]
};

describe('Scenario Engine & Lifecycle', () => {
  it('manages start, waypoint updates, and completion lifecycle', () => {
    const scene = new THREE.Scene();
    const engine = new ScenarioEngine(mockScenario, 'test-session', scene);

    engine.start();
    expect(engine.isRunning).toBe(true);
    expect(engine.elapsedSimTimeSec).toBe(0);

    // Initial event
    const eventsAtStart = engine.getEvents();
    expect(eventsAtStart[0].eventType).toBe('SESSION_START');

    // Advance to t = 1.0 (before spawn)
    engine.update(1.0);
    expect(engine.getActiveDrones().size).toBe(0);

    // Advance to t = 3.0 (after spawn at t=2)
    engine.update(2.0);
    expect(engine.getActiveDrones().size).toBe(1);
    const activeDrone = engine.getActiveDrones().get('target-1');
    expect(activeDrone).toBeDefined();

    // Verify drone moved from initial position (0, 10, -20)
    expect(activeDrone!.group.position.x).toBeGreaterThanOrEqual(0);
    expect(activeDrone!.group.position.y).toBeGreaterThanOrEqual(10);

    // Advance past despawn time (t = 12)
    engine.update(9.0);
    expect(engine.getActiveDrones().size).toBe(0);

    // Advance past total duration (t = 30)
    engine.update(20.0);
    expect(engine.isCompleted).toBe(true);

    const completedEvent = engine.getEvents().find((e) => e.eventType === 'SESSION_COMPLETED');
    expect(completedEvent).toBeDefined();

    engine.dispose();
  });

  it('handles pause and resume without drifting time', () => {
    const scene = new THREE.Scene();
    const engine = new ScenarioEngine(mockScenario, 'pause-session', scene);
    engine.start();

    engine.update(2.0);
    expect(engine.elapsedSimTimeSec).toBe(2.0);

    engine.pause();
    expect(engine.isPaused).toBe(true);

    // Ticks during pause should not increase simulation time
    engine.update(5.0);
    expect(engine.elapsedSimTimeSec).toBe(2.0);

    engine.resume();
    expect(engine.isPaused).toBe(false);

    engine.update(1.0);
    expect(engine.elapsedSimTimeSec).toBe(3.0);

    engine.dispose();
  });
});
