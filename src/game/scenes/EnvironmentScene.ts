import * as THREE from 'three';
import { ScenarioDefinition, GraphicsPreset } from '../../types';

export class EnvironmentScene {
  public scene: THREE.Scene;
  private disposables: { dispose: () => void }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(scenario: ScenarioDefinition, quality: GraphicsPreset): void {
    this.setupAtmosphere(scenario);
    this.setupLighting(scenario, quality);
    this.buildTerrain(scenario, quality);
    this.buildObservationPost();
    this.buildEnvironmentalStructures();
    this.buildScatterProps(quality);
  }

  private setupAtmosphere(scenario: ScenarioDefinition): void {
    let fogColor = 0xc2d6de;
    let fogNear = 30;
    let fogFar = 350;
    let skyTop = 0x5a8fb3;

    if (scenario.timeOfDay === 'sunset') {
      fogColor = 0xd98a63;
      fogNear = 25;
      fogFar = 320;
      skyTop = 0x2e355c;
    } else if (scenario.timeOfDay === 'fog') {
      fogColor = 0x8a999e;
      fogNear = 10;
      fogFar = 160;
      skyTop = 0x6e7e85;
    }

    this.scene.background = new THREE.Color(fogColor);
    this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(380, 24, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: skyTop,
      side: THREE.BackSide
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);
    this.disposables.push(skyGeo, skyMat);
  }

  private setupLighting(scenario: ScenarioDefinition, quality: GraphicsPreset): void {
    const ambientColor = scenario.timeOfDay === 'sunset' ? 0xffdfc4 : 0xe3f1f7;
    const ambientLight = new THREE.AmbientLight(ambientColor, scenario.timeOfDay === 'fog' ? 0.9 : 0.65);
    this.scene.add(ambientLight);

    const sunColor = scenario.timeOfDay === 'sunset' ? 0xff9955 : 0xfffaed;
    const sunLight = new THREE.DirectionalLight(sunColor, 1.2);
    sunLight.position.set(120, 160, 90);

    if (quality !== 'low') {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = quality === 'high' ? 2048 : 1024;
      sunLight.shadow.mapSize.height = quality === 'high' ? 2048 : 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 400;
      const d = 100;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
    }

    this.scene.add(sunLight);

    // Secondary soft fill light
    const fillLight = new THREE.DirectionalLight(0x7694a1, 0.4);
    fillLight.position.set(-90, 80, -90);
    this.scene.add(fillLight);
  }

  private buildTerrain(scenario: ScenarioDefinition, quality: GraphicsPreset): void {
    const size = 500;
    const segs = quality === 'high' ? 128 : quality === 'medium' ? 80 : 48;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Keep observation center flat
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 28) {
        pos.setY(i, 0);
      } else {
        // Procedural ridges & dunes
        const factor = Math.min(1.0, (distFromCenter - 28) / 60);
        const elevation =
          (Math.sin(x * 0.02) * Math.cos(z * 0.02) * 12 +
            Math.sin(x * 0.05 + 1.2) * Math.cos(z * 0.04) * 5 +
            Math.sin(x * 0.008) * 16) *
          factor;
        pos.setY(i, elevation);
      }
    }
    geo.computeVertexNormals();

    let groundColor = 0x475949; // Muted tactical earth
    if (scenario.environmentId === 'desert_outpost') {
      groundColor = 0xa89370; // Desert sand/clay
    } else if (scenario.environmentId === 'urban_rooftop') {
      groundColor = 0x364045; // Urban industrial slate
    } else if (scenario.environmentId === 'foggy_valley') {
      groundColor = 0x3d4740; // Dense cold moss / ravine rock
    }

    const mat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: quality === 'low'
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = quality !== 'low';
    this.scene.add(terrainMesh);
    this.disposables.push(geo, mat);
  }

  private buildObservationPost(): void {
    // Fortified octagonal observation platform
    const platformGeo = new THREE.CylinderGeometry(19, 21, 1.2, 16);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x222a2e,
      roughness: 0.8,
      metalness: 0.2
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.6, 0);
    platform.receiveShadow = true;
    this.scene.add(platform);
    this.disposables.push(platformGeo, platformMat);

    // Perimeter safety railing / blast barrier
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x4a5d63,
      metalness: 0.6,
      roughness: 0.4
    });

    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;
      const radius = 18.5;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const x2 = Math.cos(nextAngle) * radius;
      const z2 = Math.sin(nextAngle) * radius;

      // Post
      const postGeo = new THREE.BoxGeometry(0.2, 1.4, 0.2);
      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(x1, 1.8, z1);
      post.castShadow = true;
      this.scene.add(post);
      this.disposables.push(postGeo);

      // Horizontal beam
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const barGeo = new THREE.BoxGeometry(0.12, 0.12, len);
      const bar = new THREE.Mesh(barGeo, railMat);
      bar.position.set((x1 + x2) / 2, 2.3, (z1 + z2) / 2);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx, 0, dz).normalize());
      this.scene.add(bar);
      this.disposables.push(barGeo);
    }
    this.disposables.push(railMat);
  }

  private buildEnvironmentalStructures(): void {
    const structMat = new THREE.MeshStandardMaterial({
      color: 0x2b373b,
      roughness: 0.6,
      metalness: 0.5
    });

    // Communications antenna tower in corner
    const towerGeo = new THREE.CylinderGeometry(0.3, 0.8, 16, 6);
    const tower = new THREE.Mesh(towerGeo, structMat);
    tower.position.set(-14, 8.5, -14);
    tower.castShadow = true;
    this.scene.add(tower);

    // Flashing red aircraft warning light on top of tower
    const towerLightGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const towerLightMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const towerLight = new THREE.Mesh(towerLightGeo, towerLightMat);
    towerLight.position.set(-14, 16.6, -14);
    this.scene.add(towerLight);

    // Weather radar dome
    const domeGeo = new THREE.SphereGeometry(2.5, 12, 12);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xd8e4e6, roughness: 0.5 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(12, 3.2, -12);
    dome.castShadow = true;
    this.scene.add(dome);

    this.disposables.push(towerGeo, structMat, towerLightGeo, towerLightMat, domeGeo, domeMat);
  }

  private buildScatterProps(quality: GraphicsPreset): void {
    if (quality === 'low') return;

    // Tactical sandbags & rock clusters
    const sandbagGeo = new THREE.BoxGeometry(1.6, 0.45, 0.7);
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x82775f, roughness: 0.9 });

    const bagPositions: [number, number, number, number][] = [
      [-6, 1.4, -18.2, 0],
      [-4.2, 1.4, -18.2, 0],
      [5, 1.4, -18.2, 0],
      [6.8, 1.4, -18.2, 0],
      [-18.2, 1.4, 4, Math.PI / 2],
      [-18.2, 1.4, 6, Math.PI / 2]
    ];

    bagPositions.forEach(([x, y, z, rotY]) => {
      const bag = new THREE.Mesh(sandbagGeo, sandbagMat);
      bag.position.set(x, y, z);
      bag.rotation.y = rotY;
      bag.castShadow = true;
      bag.receiveShadow = true;
      this.scene.add(bag);
    });

    this.disposables.push(sandbagGeo, sandbagMat);
  }

  dispose(): void {
    this.disposables.forEach((item) => {
      try {
        item.dispose();
      } catch {}
    });
    this.disposables = [];
  }
}
