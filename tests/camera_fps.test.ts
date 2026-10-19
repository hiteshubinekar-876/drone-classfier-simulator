import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../src/game/engine/CameraController';
import { DEFAULT_SETTINGS } from '../src/types';

describe('CameraController Framerate Independence & Stability', () => {
  function simulateAimStep(fps: number, totalSeconds: number) {
    const mockTarget = {
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    // Ensure globals exist for node environment
    if (typeof (globalThis as any).document === 'undefined') {
      (globalThis as any).document = mockTarget;
    }
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = mockTarget;
    }

    const camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 1000);
    const canvas = mockTarget as unknown as HTMLCanvasElement;
    const controller = new CameraController(camera, canvas, {
      ...DEFAULT_SETTINGS,
      mouseSensitivity: 1.0
    });

    // Apply an initial mouse delta
    controller.applyMouseDelta(100, 50);

    const targetPitch = controller.getTargetPitch();
    const targetYaw = controller.getTargetYaw();

    const dt = 1.0 / fps;
    const steps = Math.floor(totalSeconds * fps);

    for (let i = 0; i < steps; i++) {
      controller.update(dt);
    }

    const currentPitch = controller.getPitch();
    const currentYaw = controller.getYaw();

    controller.dispose();

    return { targetPitch, targetYaw, currentPitch, currentYaw };
  }

  it('converges smoothly to target angles at 30 FPS (low framerate)', () => {
    const res = simulateAimStep(30, 0.5);
    expect(res.currentPitch).toBeCloseTo(res.targetPitch, 1);
    expect(res.currentYaw).toBeCloseTo(res.targetYaw, 1);
  });

  it('converges smoothly to target angles at 60 FPS (medium framerate)', () => {
    const res = simulateAimStep(60, 0.5);
    expect(res.currentPitch).toBeCloseTo(res.targetPitch, 1);
    expect(res.currentYaw).toBeCloseTo(res.targetYaw, 1);
  });

  it('converges smoothly to target angles at 144 FPS (high framerate)', () => {
    const res = simulateAimStep(144, 0.5);
    expect(res.currentPitch).toBeCloseTo(res.targetPitch, 1);
    expect(res.currentYaw).toBeCloseTo(res.targetYaw, 1);
  });

  it('yields identical convergence limits across 30, 60, and 144 FPS without overshoot', () => {
    const res30 = simulateAimStep(30, 0.4);
    const res60 = simulateAimStep(60, 0.4);
    const res144 = simulateAimStep(144, 0.4);

    // After 400ms, all three frame rates should be within 0.01 radians of target
    expect(Math.abs(res30.currentYaw - res30.targetYaw)).toBeLessThan(0.01);
    expect(Math.abs(res60.currentYaw - res60.targetYaw)).toBeLessThan(0.01);
    expect(Math.abs(res144.currentYaw - res144.targetYaw)).toBeLessThan(0.01);

    // Neither should overshoot the target
    expect(Math.abs(res30.currentYaw)).toBeLessThanOrEqual(Math.abs(res30.targetYaw) + 0.001);
    expect(Math.abs(res60.currentYaw)).toBeLessThanOrEqual(Math.abs(res60.targetYaw) + 0.001);
    expect(Math.abs(res144.currentYaw)).toBeLessThanOrEqual(Math.abs(res144.targetYaw) + 0.001);
  });
});
