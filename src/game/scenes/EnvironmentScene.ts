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
    this.buildHorizonMountains(scenario, quality);
    this.buildObservationPost();
    this.buildEnvironmentalStructures(quality);
    this.buildScatterProps(quality);
  }

  private setupAtmosphere(scenario: ScenarioDefinition): void {
    let fogColor = 0xb5cad4;
    let fogNear = 50;
    let fogFar = 420;
    let skyZenith = 0x3d7099;
    let skyHorizon = 0x9bc2d4;

    if (scenario.timeOfDay === 'sunset') {
      fogColor = 0xcc7b52;
      fogNear = 40;
      fogFar = 380;
      skyZenith = 0x22274c;
      skyHorizon = 0xdf8450;
    } else if (scenario.timeOfDay === 'fog') {
      fogColor = 0x7c8c94;
      fogNear = 12;
      fogFar = 180;
      skyZenith = 0x5a6a70;
      skyHorizon = 0x7c8c94;
    }

    this.scene.background = new THREE.Color(fogColor);
    this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

    // Multi-layered Sky Dome
    const skyGeo = new THREE.SphereGeometry(390, 32, 16);
    // Gradient vertex colors for sky
    const count = skyGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const colorTop = new THREE.Color(skyZenith);
    const colorBottom = new THREE.Color(skyHorizon);

    for (let i = 0; i < count; i++) {
      const y = skyGeo.attributes.position.getY(i);
      const t = Math.max(0, Math.min(1, (y + 50) / 440));
      const c = colorBottom.clone().lerp(colorTop, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);
    this.disposables.push(skyGeo, skyMat);

    // Sun Disc / Corona
    if (scenario.timeOfDay !== 'fog') {
      const sunGeo = new THREE.CircleGeometry(16, 24);
      const sunMat = new THREE.MeshBasicMaterial({
        color: scenario.timeOfDay === 'sunset' ? 0xffaa55 : 0xfffae0,
        transparent: true,
        opacity: 0.9,
        fog: false,
        side: THREE.DoubleSide
      });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      const sunPos = new THREE.Vector3(140, 160, 100).normalize().multiplyScalar(360);
      sunMesh.position.copy(sunPos);
      sunMesh.lookAt(0, 0, 0);
      this.scene.add(sunMesh);
      this.disposables.push(sunGeo, sunMat);
    }
  }

  private setupLighting(scenario: ScenarioDefinition, quality: GraphicsPreset): void {
    // Atmospheric Hemispheric Light (Sky-to-Ground bounce)
    let skyLightColor = 0xcde7f5;
    let groundLightColor = 0x6e634e; // Warm earth bounce
    let hemiIntensity = 0.65;

    if (scenario.timeOfDay === 'sunset') {
      skyLightColor = 0x7770a3;
      groundLightColor = 0x6e3820;
      hemiIntensity = 0.55;
    } else if (scenario.timeOfDay === 'fog') {
      skyLightColor = 0x93a3a8;
      groundLightColor = 0x485250;
      hemiIntensity = 0.85;
    }

    const hemiLight = new THREE.HemisphereLight(skyLightColor, groundLightColor, hemiIntensity);
    this.scene.add(hemiLight);

    // Main Directional Sun Light
    const sunColor = scenario.timeOfDay === 'sunset' ? 0xff8c42 : 0xfffaea;
    const sunIntensity = scenario.timeOfDay === 'fog' ? 0.6 : 1.35;
    const sunLight = new THREE.DirectionalLight(sunColor, sunIntensity);
    sunLight.position.set(130, 160, 95);

    if (quality !== 'low') {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = quality === 'high' ? 2048 : 1024;
      sunLight.shadow.mapSize.height = quality === 'high' ? 2048 : 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 420;
      const d = 110;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = quality === 'high' ? -0.0003 : -0.0006;
    }

    this.scene.add(sunLight);

    // Subtle cool fill light
    const fillLight = new THREE.DirectionalLight(0x658594, 0.35);
    fillLight.position.set(-100, 75, -85);
    this.scene.add(fillLight);
  }

  private buildTerrain(scenario: ScenarioDefinition, quality: GraphicsPreset): void {
    const size = 520;
    const segs = quality === 'high' ? 144 : quality === 'medium' ? 88 : 48;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    let baseGroundColor = 0x8a7b60; // Tactical Desert Sand
    if (scenario.environmentId === 'urban_rooftop') {
      baseGroundColor = 0x2e393e; // Urban slate
    } else if (scenario.environmentId === 'foggy_valley') {
      baseGroundColor = 0x36453c; // Alpine moss/slate
    }

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cBase = new THREE.Color(baseGroundColor);
    const cRidge = cBase.clone().offsetHSL(0.02, 0.05, 0.08); // Sun-bleached ridge
    const cGully = cBase.clone().offsetHSL(-0.02, -0.05, -0.1); // Deep valley shadow

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const dist = Math.sqrt(x * x + z * z);
      let elevation = 0;

      if (dist >= 26) {
        const factor = Math.min(1.0, (dist - 26) / 75);
        // Multi-octave natural terrain
        const octave1 = Math.sin(x * 0.016) * Math.cos(z * 0.018) * 16;
        const octave2 = Math.sin(x * 0.038 + 1.2) * Math.cos(z * 0.032) * 6;
        const octave3 = Math.sin(x * 0.007 - 0.8) * Math.cos(z * 0.009 + 0.4) * 20;
        elevation = (octave1 + octave2 + octave3) * factor;
      }

      pos.setY(i, elevation);

      // Vertex color gradient based on elevation
      const normY = (elevation + 15) / 45;
      const vertColor = elevation > 0 ? cBase.clone().lerp(cRidge, Math.min(1, normY)) : cBase.clone().lerp(cGully, Math.min(1, -normY));
      colors[i * 3] = vertColor.r;
      colors[i * 3 + 1] = vertColor.g;
      colors[i * 3 + 2] = vertColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: quality === 'low'
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = quality !== 'low';
    this.scene.add(terrainMesh);
    this.disposables.push(geo, mat);
  }

  private buildHorizonMountains(scenario: ScenarioDefinition, quality: GraphicsPreset): void {
    if (quality === 'low') return;

    // Distant mountain perimeter ring
    const mountainRadius = 340;
    const segments = quality === 'high' ? 36 : 24;
    const mountainGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    const hazeColor = new THREE.Color(scenario.timeOfDay === 'sunset' ? 0x6e4334 : scenario.timeOfDay === 'fog' ? 0x475458 : 0x5a7685);
    const peakColor = hazeColor.clone().offsetHSL(0, -0.05, 0.12);

    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;

      const x1 = Math.cos(a1) * mountainRadius;
      const z1 = Math.sin(a1) * mountainRadius;
      const x2 = Math.cos(a2) * mountainRadius;
      const z2 = Math.sin(a2) * mountainRadius;

      // Varied mountain peak height
      const h1 = 35 + Math.sin(i * 1.7) * 22 + Math.cos(i * 3.1) * 14;
      const h2 = 35 + Math.sin((i + 1) * 1.7) * 22 + Math.cos((i + 1) * 3.1) * 14;

      // Triangle 1 (base1 -> peak1 -> base2)
      positions.push(x1, -5, z1, x1 * 0.96, h1, z1 * 0.96, x2, -5, z2);
      colors.push(hazeColor.r, hazeColor.g, hazeColor.b, peakColor.r, peakColor.g, peakColor.b, hazeColor.r, hazeColor.g, hazeColor.b);

      // Triangle 2 (base2 -> peak1 -> peak2)
      positions.push(x2, -5, z2, x1 * 0.96, h1, z1 * 0.96, x2 * 0.96, h2, z2 * 0.96);
      colors.push(hazeColor.r, hazeColor.g, hazeColor.b, peakColor.r, peakColor.g, peakColor.b, peakColor.r, peakColor.g, peakColor.b);
    }

    mountainGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mountainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mountainGeo.computeVertexNormals();

    const mountainMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    });

    const mountains = new THREE.Mesh(mountainGeo, mountainMat);
    this.scene.add(mountains);
    this.disposables.push(mountainGeo, mountainMat);
  }

  private buildObservationPost(): void {
    // Octagonal fortified observation deck
    const deckRadius = 19;
    const platformGeo = new THREE.CylinderGeometry(deckRadius, deckRadius + 2.5, 1.4, 16);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x1e272c,
      roughness: 0.75,
      metalness: 0.3
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.7, 0);
    platform.receiveShadow = true;
    this.scene.add(platform);
    this.disposables.push(platformGeo, platformMat);

    // Inner steel treadplate circular pad
    const padGeo = new THREE.CylinderGeometry(14, 14, 0.05, 16);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x27343b,
      roughness: 0.6,
      metalness: 0.5
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, 1.42, 0);
    pad.receiveShadow = true;
    this.scene.add(pad);
    this.disposables.push(padGeo, padMat);

    // Perimeter ballistic safety railing
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x3d4e54,
      metalness: 0.65,
      roughness: 0.35
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

      // Heavy vertical post
      const postGeo = new THREE.BoxGeometry(0.25, 1.4, 0.25);
      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(x1, 1.9, z1);
      post.castShadow = true;
      this.scene.add(post);
      this.disposables.push(postGeo);

      // Top handrail beam
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const topBarGeo = new THREE.BoxGeometry(0.14, 0.12, len);
      const topBar = new THREE.Mesh(topBarGeo, railMat);
      topBar.position.set((x1 + x2) / 2, 2.45, (z1 + z2) / 2);
      topBar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx, 0, dz).normalize());
      this.scene.add(topBar);
      this.disposables.push(topBarGeo);

      // Mid guard rail
      const midBarGeo = new THREE.BoxGeometry(0.08, 0.08, len);
      const midBar = new THREE.Mesh(midBarGeo, railMat);
      midBar.position.set((x1 + x2) / 2, 1.85, (z1 + z2) / 2);
      midBar.quaternion.copy(topBar.quaternion);
      this.scene.add(midBar);
      this.disposables.push(midBarGeo);
    }
    this.disposables.push(railMat);

    // Center Tactical Binocular Sighting Pedestal
    this.buildSightingPedestal();

    // Comms equipment terminal rack on deck
    this.buildCommsTerminal();
  }

  private buildSightingPedestal(): void {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1f2a2f,
      metalness: 0.7,
      roughness: 0.35
    });
    const opticMat = new THREE.MeshStandardMaterial({
      color: 0x0f3b33,
      metalness: 0.9,
      roughness: 0.1
    });

    // Pedestal base cylinder
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.1, 12);
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.set(0, 1.95, 0);
    base.castShadow = true;
    this.scene.add(base);

    // Swivel yoke
    const yokeGeo = new THREE.BoxGeometry(0.7, 0.25, 0.3);
    const yoke = new THREE.Mesh(yokeGeo, metalMat);
    yoke.position.set(0, 2.58, 0);
    this.scene.add(yoke);

    // Dual optical binocular lenses pointing North
    const lensLGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.5, 12);
    lensLGeo.rotateX(Math.PI / 2);
    const lensL = new THREE.Mesh(lensLGeo, opticMat);
    lensL.position.set(-0.16, 2.65, -0.2);
    this.scene.add(lensL);

    const lensR = new THREE.Mesh(lensLGeo, opticMat);
    lensR.position.set(0.16, 2.65, -0.2);
    this.scene.add(lensR);

    this.disposables.push(baseGeo, metalMat, yokeGeo, lensLGeo, opticMat);
  }

  private buildCommsTerminal(): void {
    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x182226,
      roughness: 0.6,
      metalness: 0.5
    });

    // Console desk cabinet at corner of post
    const cabinetGeo = new THREE.BoxGeometry(1.6, 1.1, 0.8);
    const cabinet = new THREE.Mesh(cabinetGeo, rackMat);
    cabinet.position.set(-11, 1.95, 11);
    cabinet.rotation.y = Math.PI / 4;
    cabinet.castShadow = true;
    this.scene.add(cabinet);

    // Terminal display monitor
    const monitorGeo = new THREE.BoxGeometry(0.9, 0.55, 0.08);
    const monitorMat = new THREE.MeshBasicMaterial({ color: 0x8dd9c0 });
    const monitor = new THREE.Mesh(monitorGeo, monitorMat);
    monitor.position.set(-11, 2.65, 11);
    monitor.rotation.y = Math.PI / 4;
    this.scene.add(monitor);

    // Blinking status LEDs on cabinet
    const ledGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x5cd68f });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(-10.8, 2.2, 11.2);
    this.scene.add(led);

    this.disposables.push(cabinetGeo, rackMat, monitorGeo, monitorMat, ledGeo, ledMat);
  }

  private buildEnvironmentalStructures(quality: GraphicsPreset): void {
    const structMat = new THREE.MeshStandardMaterial({
      color: 0x273338,
      roughness: 0.55,
      metalness: 0.55
    });

    // Communications Lattice Mast Tower
    const towerGeo = new THREE.CylinderGeometry(0.25, 0.85, 20, 6);
    const tower = new THREE.Mesh(towerGeo, structMat);
    tower.position.set(-14, 10.5, -14);
    tower.castShadow = quality !== 'low';
    this.scene.add(tower);

    // Cross-dipole antenna bars
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.5, 6);
    barGeo.rotateZ(Math.PI / 2);
    const bar1 = new THREE.Mesh(barGeo, structMat);
    bar1.position.set(-14, 18, -14);
    this.scene.add(bar1);

    const bar2 = new THREE.Mesh(barGeo, structMat);
    bar2.position.set(-14, 15, -14);
    bar2.rotation.y = Math.PI / 2;
    this.scene.add(bar2);

    // Red Aviation Warning Beacon on top of tower
    const beaconGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(-14, 20.6, -14);
    this.scene.add(beacon);

    // Weather / Tactical Radar Dome
    const domeGeo = new THREE.SphereGeometry(2.6, 16, 14);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xd2dee0,
      roughness: 0.45,
      metalness: 0.2
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(13, 3.4, -13);
    dome.castShadow = quality !== 'low';
    this.scene.add(dome);

    // Radar pedestal cylinder
    const domeBaseGeo = new THREE.CylinderGeometry(2.1, 2.3, 1.8, 14);
    const domeBase = new THREE.Mesh(domeBaseGeo, structMat);
    domeBase.position.set(13, 1.7, -13);
    domeBase.castShadow = quality !== 'low';
    this.scene.add(domeBase);

    // Angled Solar Panel Array (sustainable field generator)
    const solarGeo = new THREE.BoxGeometry(3.6, 0.1, 2.2);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      roughness: 0.3,
      metalness: 0.8
    });
    const solar = new THREE.Mesh(solarGeo, solarMat);
    solar.position.set(14, 2.2, 10);
    solar.rotation.x = -Math.PI / 6;
    solar.rotation.y = Math.PI / 5;
    solar.castShadow = quality !== 'low';
    this.scene.add(solar);

    this.disposables.push(towerGeo, structMat, barGeo, beaconGeo, beaconMat, domeGeo, domeMat, domeBaseGeo, solarGeo, solarMat);
  }

  private buildScatterProps(quality: GraphicsPreset): void {
    if (quality === 'low') return;

    // Tactical Sandbag Revetments
    const sandbagGeo = new THREE.BoxGeometry(1.6, 0.48, 0.75);
    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0x82765e,
      roughness: 0.95,
      metalness: 0.05
    });

    const bagPositions: [number, number, number, number][] = [
      [-6, 1.45, -18.2, 0],
      [-4.2, 1.45, -18.2, 0],
      [5, 1.45, -18.2, 0],
      [6.8, 1.45, -18.2, 0],
      [-18.2, 1.45, 4, Math.PI / 2],
      [-18.2, 1.45, 6, Math.PI / 2],
      [18.2, 1.45, -4, Math.PI / 2],
      [18.2, 1.45, -6, Math.PI / 2]
    ];

    bagPositions.forEach(([x, y, z, rotY]) => {
      const bag = new THREE.Mesh(sandbagGeo, sandbagMat);
      bag.position.set(x, y, z);
      bag.rotation.y = rotY;
      bag.castShadow = true;
      bag.receiveShadow = true;
      this.scene.add(bag);
    });

    // Military Equipment Pelican Crates
    const crateGeo = new THREE.BoxGeometry(1.1, 0.7, 0.8);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x3d4734, // Tactical olive drab
      roughness: 0.7,
      metalness: 0.2
    });

    const crate1 = new THREE.Mesh(crateGeo, crateMat);
    crate1.position.set(-9, 1.8, 13);
    crate1.rotation.y = 0.3;
    crate1.castShadow = true;
    this.scene.add(crate1);

    const crate2 = new THREE.Mesh(crateGeo, crateMat);
    crate2.position.set(-8.6, 2.5, 13.1);
    crate2.scale.set(0.8, 0.8, 0.8);
    crate2.rotation.y = 0.5;
    crate2.castShadow = true;
    this.scene.add(crate2);

    // Perimeter Defensive Markers (illuminated warning pylons)
    const pylonGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x44555b, metalness: 0.6 });
    const pylonLightGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const pylonLightMat = new THREE.MeshBasicMaterial({ color: 0x8dd9c0 });

    const pylonCoords: [number, number][] = [
      [16, 16],
      [-16, 16],
      [-16, -16],
      [16, -16]
    ];

    pylonCoords.forEach(([px, pz]) => {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(px, 1.9, pz);
      this.scene.add(pylon);

      const plight = new THREE.Mesh(pylonLightGeo, pylonLightMat);
      plight.position.set(px, 2.55, pz);
      this.scene.add(plight);
    });

    this.disposables.push(sandbagGeo, sandbagMat, crateGeo, crateMat, pylonGeo, pylonMat, pylonLightGeo, pylonLightMat);
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
