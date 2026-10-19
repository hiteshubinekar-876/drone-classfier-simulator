import * as THREE from 'three';
import {
  ScenarioDefinition,
  ScenarioTarget,
  SimulationEvent
} from '../../types';
import { Drone3DEntity, DroneFactory } from './DroneFactory';

export class ScenarioEngine {
  public scenario: ScenarioDefinition;
  public sessionId: string;
  public elapsedSimTimeSec: number = 0;
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public isCompleted: boolean = false;

  private scene: THREE.Scene;
  private activeDrones: Map<string, Drone3DEntity> = new Map();
  private spawnedTargetIds: Set<string> = new Set();
  private despawnedTargetIds: Set<string> = new Set();
  private events: SimulationEvent[] = [];
  private eventSequence: number = 0;
  public pacingMultiplier: number = 1.0;

  constructor(
    scenario: ScenarioDefinition,
    sessionId: string,
    scene: THREE.Scene,
    pacingMultiplier: number = 1.0
  ) {
    this.sessionId = sessionId;
    this.scene = scene;
    this.pacingMultiplier = Math.max(0.5, Math.min(3.0, pacingMultiplier));

    if (this.pacingMultiplier !== 1.0) {
      this.scenario = {
        ...scenario,
        durationSeconds: Math.round(scenario.durationSeconds * this.pacingMultiplier),
        targets: scenario.targets.map((tgt) => ({
          ...tgt,
          spawnTimeSec: Math.round(tgt.spawnTimeSec * this.pacingMultiplier * 10) / 10,
          despawnTimeSec: Math.round(tgt.despawnTimeSec * this.pacingMultiplier * 10) / 10,
          waypoints: tgt.waypoints.map((wp) => ({
            ...wp,
            timeSec: Math.round(wp.timeSec * this.pacingMultiplier * 10) / 10
          }))
        }))
      };
    } else {
      this.scenario = scenario;
    }
  }

  start(): void {
    this.isRunning = true;
    this.isPaused = false;
    this.isCompleted = false;
    this.elapsedSimTimeSec = 0;
    this.emitEvent('SESSION_START', {});
  }

  pause(): void {
    if (!this.isRunning || this.isCompleted) return;
    this.isPaused = true;
    this.emitEvent('SESSION_PAUSED', {});
  }

  resume(): void {
    if (!this.isRunning || this.isCompleted) return;
    this.isPaused = false;
    this.emitEvent('SESSION_RESUMED', {});
  }

  update(deltaSec: number): void {
    if (!this.isRunning || this.isPaused || this.isCompleted) return;

    this.elapsedSimTimeSec += deltaSec;

    // Check scenario duration completion
    if (this.elapsedSimTimeSec >= this.scenario.durationSeconds) {
      this.complete();
      return;
    }

    // Process target spawns and despawns
    for (const target of this.scenario.targets) {
      if (
        this.elapsedSimTimeSec >= target.spawnTimeSec &&
        this.elapsedSimTimeSec < target.despawnTimeSec &&
        !this.spawnedTargetIds.has(target.id)
      ) {
        this.spawnTarget(target);
      } else if (
        this.elapsedSimTimeSec >= target.despawnTimeSec &&
        this.activeDrones.has(target.id) &&
        !this.despawnedTargetIds.has(target.id)
      ) {
        this.despawnTarget(target.id);
      }
    }

    // Update positions and animations of active drones
    this.activeDrones.forEach((entity) => {
      this.updateDronePosition(entity, this.elapsedSimTimeSec);
      entity.update(deltaSec, this.elapsedSimTimeSec);
    });
  }

  private spawnTarget(target: ScenarioTarget): void {
    this.spawnedTargetIds.add(target.id);
    const entity = DroneFactory.createDrone(target);

    // Initial position
    this.updateDronePosition(entity, this.elapsedSimTimeSec);

    this.scene.add(entity.group);
    this.activeDrones.set(target.id, entity);

    this.emitEvent('TARGET_SPAWNED', {
      targetId: target.id,
      threatClass: target.threatClass
    });
  }

  private despawnTarget(targetId: string): void {
    this.despawnedTargetIds.add(targetId);
    const entity = this.activeDrones.get(targetId);
    if (entity) {
      this.scene.remove(entity.group);
      entity.dispose();
      this.activeDrones.delete(targetId);

      this.emitEvent('TARGET_DESPAWNED', { targetId });
    }
  }

  private updateDronePosition(entity: Drone3DEntity, simTimeSec: number): void {
    const waypoints = entity.targetData.waypoints;
    if (!waypoints || waypoints.length === 0) return;

    if (waypoints.length === 1) {
      const [x, y, z] = waypoints[0].position;
      entity.group.position.set(x, y, z);
      return;
    }

    // Find bounding waypoints
    let wp1 = waypoints[0];
    let wp2 = waypoints[waypoints.length - 1];

    if (simTimeSec <= wp1.timeSec) {
      entity.group.position.set(wp1.position[0], wp1.position[1], wp1.position[2]);
      return;
    }

    if (simTimeSec >= wp2.timeSec) {
      entity.group.position.set(wp2.position[0], wp2.position[1], wp2.position[2]);
      return;
    }

    for (let i = 0; i < waypoints.length - 1; i++) {
      if (simTimeSec >= waypoints[i].timeSec && simTimeSec <= waypoints[i + 1].timeSec) {
        wp1 = waypoints[i];
        wp2 = waypoints[i + 1];
        break;
      }
    }

    const span = Math.max(0.001, wp2.timeSec - wp1.timeSec);
    const progress = Math.min(1, Math.max(0, (simTimeSec - wp1.timeSec) / span));

    // Smooth cubic Hermite / smoothstep interpolation
    const t = progress * progress * (3 - 2 * progress);

    const currentX = wp1.position[0] + (wp2.position[0] - wp1.position[0]) * t;
    const currentY = wp1.position[1] + (wp2.position[1] - wp1.position[1]) * t;
    const currentZ = wp1.position[2] + (wp2.position[2] - wp1.position[2]) * t;

    entity.group.position.set(currentX, currentY, currentZ);

    // Compute heading direction
    const nextT = Math.min(1, t + 0.05);
    const forwardVec = new THREE.Vector3(
      wp1.position[0] + (wp2.position[0] - wp1.position[0]) * nextT - currentX,
      wp1.position[1] + (wp2.position[1] - wp1.position[1]) * nextT - currentY,
      wp1.position[2] + (wp2.position[2] - wp1.position[2]) * nextT - currentZ
    );

    if (forwardVec.lengthSq() > 0.0001) {
      forwardVec.normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), forwardVec);

      // Compute banking roll into turns
      const currentEuler = new THREE.Euler().setFromQuaternion(entity.group.quaternion, 'YXZ');
      const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat, 'YXZ');
      let yawDelta = targetEuler.y - currentEuler.y;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;

      // Realistic bank angle (up to ~24 degrees)
      const bankAngle = Math.max(-0.42, Math.min(0.42, yawDelta * 2.2));
      const bankQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bankAngle);
      targetQuat.multiply(bankQuat);

      entity.group.quaternion.slerp(targetQuat, 0.12);
    }
  }

  emitEvent(
    eventType: SimulationEvent['eventType'],
    payload: SimulationEvent['payload']
  ): SimulationEvent {
    this.eventSequence++;
    const ev: SimulationEvent = {
      id: `ev-${this.sessionId}-${this.eventSequence}`,
      sessionId: this.sessionId,
      sequenceNumber: this.eventSequence,
      simulationTimeMs: Math.round(this.elapsedSimTimeSec * 1000),
      eventType,
      payload
    };
    this.events.push(ev);
    return ev;
  }

  getActiveDrones(): Map<string, Drone3DEntity> {
    return this.activeDrones;
  }

  getEvents(): SimulationEvent[] {
    return this.events;
  }

  complete(): void {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.isRunning = false;
    this.emitEvent('SESSION_COMPLETED', {});

    // Clean up any remaining drones
    this.activeDrones.forEach((entity) => {
      this.scene.remove(entity.group);
      entity.dispose();
    });
    this.activeDrones.clear();
  }

  dispose(): void {
    this.complete();
    this.events = [];
  }
}
