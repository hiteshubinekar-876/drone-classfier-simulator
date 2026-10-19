import * as THREE from 'three';
import { UserSettings, DEFAULT_SETTINGS } from '../../types';
import { audio } from '../assessment/AudioService';
import { inputManager } from '../../services/inputManager';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  public isLocked: boolean = false;
  public isZoomed: boolean = false;
  public isPaused: boolean = false;

  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private targetEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private forwardVec = new THREE.Vector3();
  private rightVec = new THREE.Vector3();
  private yAxis = new THREE.Vector3(0, 1, 0);
  private settings: UserSettings;

  private baseFov: number = 75;
  private targetFov: number = 75;
  private zoomFov: number = 24; // ~3.2x optical magnification

  // Observation post boundaries
  private minX = -17;
  private maxX = 17;
  private minZ = -17;
  private maxZ = 17;
  private eyeHeight = 2.4;
  private isMouseDown = false;
  private elapsedTime = 0;
  private justLocked = false;

  private onPointerLockChangeBound: () => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private onBlurBound: () => void;
  private onVisibilityChangeBound: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, settings: UserSettings = DEFAULT_SETTINGS) {
    this.camera = camera;
    this.domElement = domElement;
    this.settings = settings;
    this.baseFov = settings.fieldOfView || 75;
    this.targetFov = this.baseFov;

    this.camera.position.set(0, this.eyeHeight, 0);
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.targetEuler.copy(this.euler);

    this.onPointerLockChangeBound = this.onPointerLockChange.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onContextMenuBound = (e) => e.preventDefault();
    this.onBlurBound = () => this.resetInput();
    this.onVisibilityChangeBound = () => {
      if (document.hidden) this.resetInput();
    };

    this.attach();
  }

  attach(): void {
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('keydown', this.onKeyDownBound);
    document.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
    this.domElement.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    this.domElement.addEventListener('contextmenu', this.onContextMenuBound);
  }

  detach(): void {
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    document.removeEventListener('keydown', this.onKeyDownBound);
    document.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
    if (this.isLocked) {
      document.exitPointerLock();
    }
  }

  dispose(): void {
    this.detach();
  }

  resetInput(): void {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isMouseDown = false;
    this.velocity.set(0, 0, 0);
    inputManager.resetActiveKeys();
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.resetInput();
    if (paused) {
      this.unlock();
    }
    this.targetEuler.copy(this.euler);
  }

  requestLock(): void {
    if (!this.isLocked && !this.isPaused) {
      this.domElement.requestPointerLock();
    }
  }

  unlock(): void {
    if (this.isLocked) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange(): void {
    const wasLocked = this.isLocked;
    this.isLocked = document.pointerLockElement === this.domElement;
    if (this.isLocked && !wasLocked) {
      this.justLocked = true;
    }
  }

  public applyMouseDelta(deltaX: number, deltaY: number): void {
    if (this.isPaused) return;

    // Calibrated aiming sensitivity with zoom reduction for fine observation
    const baseSensitivity = this.settings.mouseSensitivity ?? 1.0;
    const sens = baseSensitivity * 0.00085;
    const zoomFactor = this.isZoomed ? 0.30 : 1.0;

    this.targetEuler.y -= deltaX * sens * zoomFactor;
    const invertFactor = this.settings.invertY ? -1 : 1;
    this.targetEuler.x -= deltaY * sens * zoomFactor * invertFactor;

    // Clamp pitch to avoid gimbal flip (-82° to +82°)
    this.targetEuler.x = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, this.targetEuler.x));

    if (this.settings.reducedMotion) {
      this.euler.copy(this.targetEuler);
      this.camera.quaternion.setFromEuler(this.euler);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isPaused) return;
    if (!this.isLocked && !this.isMouseDown) return;

    const mx = event.movementX || 0;
    const my = event.movementY || 0;

    // Guard against first-frame pointer-lock spike jumps in browsers
    if (this.justLocked) {
      this.justLocked = false;
      if (Math.abs(mx) > 120 || Math.abs(my) > 120) {
        return;
      }
    }

    this.applyMouseDelta(mx, my);
  }

  private onMouseDown(event: MouseEvent): void {
    if (this.isPaused) return;
    if (event.button === 0) {
      this.isMouseDown = true;
    } else if (event.button === 2) {
      // Right click: engage binocular zoom
      this.setZoom(true);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
    } else if (event.button === 2) {
      this.setZoom(false);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.isPaused || inputManager.isInputElement(event.target)) return;
    inputManager.handleKeyDown(event);

    if (inputManager.matchesAction(event, 'moveForward')) {
      this.moveForward = true;
    }
    if (inputManager.matchesAction(event, 'moveBackward')) {
      this.moveBackward = true;
    }
    if (inputManager.matchesAction(event, 'moveLeft')) {
      this.moveLeft = true;
    }
    if (inputManager.matchesAction(event, 'moveRight')) {
      this.moveRight = true;
    }
    if (inputManager.matchesAction(event, 'toggleZoom')) {
      this.setZoom(true);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    inputManager.handleKeyUp(event);

    if (inputManager.matchesAction(event, 'moveForward')) {
      this.moveForward = false;
    }
    if (inputManager.matchesAction(event, 'moveBackward')) {
      this.moveBackward = false;
    }
    if (inputManager.matchesAction(event, 'moveLeft')) {
      this.moveLeft = false;
    }
    if (inputManager.matchesAction(event, 'moveRight')) {
      this.moveRight = false;
    }
    if (inputManager.matchesAction(event, 'toggleZoom')) {
      this.setZoom(false);
    }
  }

  public setZoom(zoomed: boolean): void {
    if (this.isZoomed !== zoomed) {
      this.isZoomed = zoomed;
      this.targetFov = zoomed ? this.zoomFov : this.baseFov;
      audio.playZoomClick(zoomed);
    }
  }

  update(rawDeltaSec: number): void {
    if (this.isPaused) return;

    // Guard against delta spikes / background throttling pauses
    const deltaSec = Math.min(0.05, Math.max(0.001, rawDeltaSec));
    this.elapsedTime += deltaSec;

    // Framerate-independent FOV interpolation for binocular zoom
    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      const fovBlend = 1.0 - Math.exp(-20.0 * deltaSec);
      this.camera.fov += (this.targetFov - this.camera.fov) * fovBlend;
      this.camera.updateProjectionMatrix();
    }

    // Framerate-independent rotation interpolation (responsive, silky inertial camera smoothing)
    if (!this.settings.reducedMotion) {
      const rotSmoothing = 1.0 - Math.exp(-48.0 * deltaSec);
      this.euler.x += (this.targetEuler.x - this.euler.x) * rotSmoothing;
      this.euler.y += (this.targetEuler.y - this.euler.y) * rotSmoothing;
      this.camera.quaternion.setFromEuler(this.euler);
    }

    // Movement physics (WASD observation post translation)
    const speed = this.isZoomed ? 2.5 : 5.5;
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    if (this.direction.lengthSq() > 0.001) {
      this.direction.normalize();
    }

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * deltaSec * 8.0;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * deltaSec * 8.0;
    }

    // Exponential friction damping (stable across all frame rates)
    const friction = Math.exp(-9.0 * deltaSec);
    this.velocity.x *= friction;
    this.velocity.z *= friction;

    // Translate along camera yaw direction (XZ plane only)
    this.forwardVec.set(0, 0, -1).applyAxisAngle(this.yAxis, this.euler.y);
    this.rightVec.set(1, 0, 0).applyAxisAngle(this.yAxis, this.euler.y);

    this.camera.position.addScaledVector(this.forwardVec, -this.velocity.z * deltaSec);
    this.camera.position.addScaledVector(this.rightVec, -this.velocity.x * deltaSec);

    // Observation post boundary clamping
    this.camera.position.x = Math.max(this.minX, Math.min(this.maxX, this.camera.position.x));
    this.camera.position.z = Math.max(this.minZ, Math.min(this.maxZ, this.camera.position.z));

    // Subtle natural breathing / idle presence on observation post
    const idleSway = this.settings.reducedMotion ? 0 : Math.sin(this.elapsedTime * 1.5) * 0.012;
    this.camera.position.y = this.eyeHeight + idleSway;
  }

  getBearingDeg(): number {
    // Yaw angle in degrees [0, 360)
    let deg = (-this.euler.y * (180 / Math.PI)) % 360;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }

  getPitchDeg(): number {
    return Math.round(this.euler.x * (180 / Math.PI));
  }

  getPitch(): number {
    return this.euler.x;
  }

  getYaw(): number {
    return this.euler.y;
  }

  getTargetPitch(): number {
    return this.targetEuler.x;
  }

  getTargetYaw(): number {
    return this.targetEuler.y;
  }

  updateSettings(settings: UserSettings): void {
    this.settings = settings;
    this.baseFov = settings.fieldOfView || 75;
    if (!this.isZoomed) {
      this.targetFov = this.baseFov;
    }
  }
}
