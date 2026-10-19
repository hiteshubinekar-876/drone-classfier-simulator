import * as THREE from 'three';
import { UserSettings } from '../../types';

export class RenderEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public container: HTMLElement;

  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onRenderCallback: ((deltaSec: number) => void) | null = null;
  private clock = new THREE.Clock();

  constructor(container: HTMLElement, settings: UserSettings) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(settings.fieldOfView || 75, width / height, 0.1, 800);

    this.renderer = new THREE.WebGLRenderer({
      antialias: settings.graphicsPreset !== 'low',
      powerPreference: 'high-performance'
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.applySettings(settings);

    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.setupResizeObserver();
  }

  applySettings(settings: UserSettings): void {
    const scale = settings.resolutionScale || 1.0;
    const dpr = Math.min(2, (window.devicePixelRatio || 1) * scale);
    this.renderer.setPixelRatio(dpr);

    if (settings.shadowsEnabled && settings.graphicsPreset !== 'low') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type =
        settings.graphicsPreset === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    } else {
      this.renderer.shadowMap.enabled = false;
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height);
        }
      }
    });

    this.resizeObserver.observe(this.container);
  }

  start(onRender: (deltaSec: number) => void): void {
    this.onRenderCallback = onRender;
    this.clock.start();

    const loop = () => {
      const delta = Math.min(0.1, this.clock.getDelta());
      if (this.onRenderCallback) {
        this.onRenderCallback(delta);
      }
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.clock.stop();
  }

  dispose(): void {
    this.stop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Traverse and clean scene
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
