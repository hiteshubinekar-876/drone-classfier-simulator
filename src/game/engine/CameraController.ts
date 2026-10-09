import * as THREE from 'three';
import { UserSettings } from '../../types';
import { audio } from '../assessment/AudioService';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  public isLocked: boolean = false;
  public isZoomed: boolean = false;

  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private settings: UserSettings;

  private baseFov: number = 75;
  private targetFov: number = 75;
  private zoomFov: number = 24; // ~3x optical magnification

  // Observation post boundaries
  private minX = -18;
  private maxX = 18;
  private minZ = -18;
  private maxZ = 18;
  private eyeHeight = 2.4;
  private isMouseDown = false;

  private onPointerLockChangeBound: () => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, settings: UserSettings) {
    this.camera = camera;
    this.domElement = domElement;
    this.settings = settings;
    this.baseFov = settings.fieldOfView || 75;
    this.targetFov = this.baseFov;

    this.camera.position.set(0, this.eyeHeight, 0);
    this.euler.setFromQuaternion(this.camera.quaternion);

    this.onPointerLockChangeBound = this.onPointerLockChange.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onContextMenuBound = (e) => e.preventDefault();

    this.attach();
  }

  attach(): void {
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('keydown', this.onKeyDownBound);
    document.addEventListener('keyup', this.onKeyUpBound);
    this.domElement.addEventListener('mousedown', this.onMouseDownBound);
    this.domElement.addEventListener('mouseup', this.onMouseUpBound);
    this.domElement.addEventListener('contextmenu', this.onContextMenuBound);
  }

  detach(): void {
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    document.removeEventListener('keydown', this.onKeyDownBound);
    document.removeEventListener('keyup', this.onKeyUpBound);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    this.domElement.removeEventListener('mouseup', this.onMouseUpBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
    if (this.isLocked) {
      document.exitPointerLock();
    }
  }

  requestLock(): void {
    if (!this.isLocked) {
      this.domElement.requestPointerLock();
    }
  }

  unlock(): void {
    if (this.isLocked) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange(): void {
    this.isLocked = document.pointerLockElement === this.domElement;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isLocked && !this.isMouseDown) return;

    const sens = (this.settings.mouseSensitivity || 1.0) * 0.002;
    const zoomFactor = this.isZoomed ? 0.4 : 1.0;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.euler.y -= movementX * sens * zoomFactor;
    const invertFactor = this.settings.invertY ? -1 : 1;
    this.euler.x -= movementY * sens * zoomFactor * invertFactor;

    // Clamp pitch to avoid gimbal flip (-85° to +85°)
    this.euler.x = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }

  private onMouseDown(event: MouseEvent): void {
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
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.setZoom(true);
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.setZoom(false);
        break;
    }
  }

  public setZoom(zoomed: boolean): void {
    if (this.isZoomed !== zoomed) {
      this.isZoomed = zoomed;
      this.targetFov = zoomed ? this.zoomFov : this.baseFov;
      audio.playZoomClick(zoomed);
    }
  }

  update(deltaSec: number): void {
    // Smooth FOV interpolation for binocular zoom
    if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
      this.camera.fov += (this.targetFov - this.camera.fov) * (deltaSec * 15);
      this.camera.updateProjectionMatrix();
    }

    if (!this.isLocked) return;

    // Movement physics
    const speed = this.isZoomed ? 2.5 : 5.5;
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * deltaSec * 8.0;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * deltaSec * 8.0;
    }

    // Apply friction damping
    this.velocity.x *= Math.max(0, 1 - deltaSec * 10);
    this.velocity.z *= Math.max(0, 1 - deltaSec * 10);

    // Translate along camera yaw direction (XZ plane only)
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);

    this.camera.position.addScaledVector(forward, -this.velocity.z * deltaSec);
    this.camera.position.addScaledVector(right, -this.velocity.x * deltaSec);

    // Observation post boundary clamping
    this.camera.position.x = Math.max(this.minX, Math.min(this.maxX, this.camera.position.x));
    this.camera.position.z = Math.max(this.minZ, Math.min(this.maxZ, this.camera.position.z));
    this.camera.position.y = this.eyeHeight;
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

  updateSettings(settings: UserSettings): void {
    this.settings = settings;
    this.baseFov = settings.fieldOfView || 75;
    if (!this.isZoomed) {
      this.targetFov = this.baseFov;
    }
  }
}
