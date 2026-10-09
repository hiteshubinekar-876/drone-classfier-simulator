import * as THREE from 'three';
import { Drone3DEntity } from '../scenarios/DroneFactory';
import { audio } from './AudioService';

export interface TargetLockInfo {
  targetId: string;
  callsign: string;
  distanceMeters: number;
  bearingDeg: number;
  pitchDeg: number;
  angularSeparationDeg: number;
  isLocked: boolean;
  screenX: number;
  screenY: number;
  entity: Drone3DEntity;
}

export class TargetTracker {
  private camera: THREE.PerspectiveCamera;
  private prevLockedId: string | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  evaluateActiveTargets(
    activeDrones: Map<string, Drone3DEntity>,
    isZoomed: boolean,
    screenWidth: number,
    screenHeight: number
  ): TargetLockInfo[] {
    const results: TargetLockInfo[] = [];

    const camPos = this.camera.position;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const lockConeDeg = isZoomed ? 4.5 : 7.0;

    activeDrones.forEach((entity) => {
      const dronePos = entity.group.position;
      const toDrone = new THREE.Vector3().subVectors(dronePos, camPos);
      const distance = toDrone.length();

      // Normalize direction to drone
      const dirToDrone = toDrone.clone().normalize();

      // Dot product to get angle between camera look direction and drone
      const dot = Math.max(-1, Math.min(1, camDir.dot(dirToDrone)));
      const angularSeparationDeg = (Math.acos(dot) * 180) / Math.PI;

      // Project 3D position to 2D screen coordinates
      const projected = dronePos.clone().project(this.camera);
      const isBehind = projected.z > 1.0;
      const screenX = ((projected.x + 1) * screenWidth) / 2;
      const screenY = ((-projected.y + 1) * screenHeight) / 2;

      // Relative bearing & pitch
      let bearingDeg = Math.round((-Math.atan2(dirToDrone.x, -dirToDrone.z) * 180) / Math.PI);
      if (bearingDeg < 0) bearingDeg += 360;
      const pitchDeg = Math.round((Math.asin(dirToDrone.y) * 180) / Math.PI);

      const isLocked = !isBehind && angularSeparationDeg <= lockConeDeg && distance < 350;

      results.push({
        targetId: entity.targetData.id,
        callsign: entity.targetData.callsign,
        distanceMeters: Math.round(distance),
        bearingDeg,
        pitchDeg,
        angularSeparationDeg: Math.round(angularSeparationDeg * 10) / 10,
        isLocked,
        screenX,
        screenY,
        entity
      });
    });

    // Sort by smallest angular separation
    results.sort((a, b) => a.angularSeparationDeg - b.angularSeparationDeg);

    // Audio cue upon acquiring new lock
    const bestLock = results.find((r) => r.isLocked);
    const currentLockId = bestLock ? bestLock.targetId : null;

    if (currentLockId && currentLockId !== this.prevLockedId) {
      audio.playTargetAcquired();
    }
    this.prevLockedId = currentLockId;

    return results;
  }
}
