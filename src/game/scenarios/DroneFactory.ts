import * as THREE from 'three';
import { ScenarioTarget } from '../../types';

export interface Drone3DEntity {
  group: THREE.Group;
  rotors: THREE.Mesh[];
  beaconMesh: THREE.Mesh;
  targetData: ScenarioTarget;
  update: (deltaSec: number, elapsedSec: number) => void;
  dispose: () => void;
}

export class DroneFactory {
  static createDrone(target: ScenarioTarget): Drone3DEntity {
    const group = new THREE.Group();
    group.name = `drone-${target.id}`;

    const rotors: THREE.Mesh[] = [];
    const blurDiscs: THREE.Mesh[] = [];
    let beaconMesh: THREE.Mesh;

    switch (target.threatClass) {
      case 'fixed_wing_recon':
        beaconMesh = this.buildFixedWing(group, rotors, blurDiscs, target);
        break;
      case 'micro_uav':
        beaconMesh = this.buildMicroUav(group, rotors, blurDiscs, target);
        break;
      case 'civilian_toy':
        beaconMesh = this.buildCivilianToy(group, rotors, blurDiscs, target);
        break;
      case 'quadcopter_surveillance':
      default:
        beaconMesh = this.buildQuadcopter(group, rotors, blurDiscs, target);
        break;
    }

    const beaconMaterial = beaconMesh.material as THREE.MeshBasicMaterial;
    const baseColor = beaconMaterial.color.clone();

    const update = (deltaSec: number, elapsedSec: number) => {
      // Spin rotor blades & blur discs
      const spinSpeed = target.threatClass === 'micro_uav' ? 52 : 36;
      rotors.forEach((rotor, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        rotor.rotation.y += dir * spinSpeed * deltaSec;
      });

      // Beacon strobe
      const flashHz = target.visualSignature.beaconFlashHz || 1.5;
      const flash = (Math.sin(elapsedSec * Math.PI * 2 * flashHz) + 1) / 2;
      if (flash > 0.78) {
        beaconMaterial.color.setHex(0xffffff);
      } else {
        beaconMaterial.color.copy(baseColor);
      }

      // Micro aerodynamic perturbation based on class
      if (target.threatClass === 'micro_uav') {
        // High-frequency nano-gust wobble
        const gustX = Math.sin(elapsedSec * 14) * 0.04;
        const gustY = Math.cos(elapsedSec * 11) * 0.03;
        group.position.x += gustX * deltaSec;
        group.position.y += gustY * deltaSec;
      } else if (target.threatClass === 'quadcopter_surveillance') {
        // Subtle hover breathing
        const hoverBob = Math.sin(elapsedSec * 3.5) * 0.02;
        group.position.y += hoverBob * deltaSec;
      }
    };

    const dispose = () => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };

    return {
      group,
      rotors,
      beaconMesh,
      targetData: target,
      update,
      dispose
    };
  }

  private static buildQuadcopter(
    parent: THREE.Group,
    rotors: THREE.Mesh[],
    blurDiscs: THREE.Mesh[],
    target: ScenarioTarget
  ): THREE.Mesh {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: target.visualSignature.color || 0x2b3a42,
      roughness: 0.45,
      metalness: 0.65
    });
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x182024,
      roughness: 0.6,
      metalness: 0.5
    });
    const rotorMat = new THREE.MeshBasicMaterial({
      color: 0x0f1416,
      side: THREE.DoubleSide
    });
    const blurMat = new THREE.MeshBasicMaterial({
      color: 0x22333b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });

    // Aerodynamic central fuselage with chamfered top
    const bodyGeo = new THREE.BoxGeometry(0.38, 0.14, 0.38);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    parent.add(body);

    // Avionics top dome
    const domeGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.06, 12);
    const dome = new THREE.Mesh(domeGeo, armMat);
    dome.position.set(0, 0.09, 0);
    parent.add(dome);

    // High-res gimbal optical camera pod
    const gimbalGeo = new THREE.SphereGeometry(0.09, 14, 14);
    const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x080c0e, roughness: 0.15, metalness: 0.8 });
    const gimbal = new THREE.Mesh(gimbalGeo, gimbalMat);
    gimbal.position.set(0, -0.09, 0.1);
    parent.add(gimbal);

    // Optical lens element (emerald anti-reflective coating)
    const lensGeo = new THREE.CircleGeometry(0.045, 12);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00cc88 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, -0.09, 0.191);
    parent.add(lens);

    // Tubular carbon landing skids
    const skidGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.46, 8);
    skidGeo.rotateX(Math.PI / 2);
    const skidL = new THREE.Mesh(skidGeo, armMat);
    skidL.position.set(-0.16, -0.16, 0);
    parent.add(skidL);

    const skidR = new THREE.Mesh(skidGeo, armMat);
    skidR.position.set(0.16, -0.16, 0);
    parent.add(skidR);

    // 4 Quad arms and rotors
    const armPositions: [number, number, number][] = [
      [0.34, 0.03, 0.34],
      [-0.34, 0.03, 0.34],
      [-0.34, 0.03, -0.34],
      [0.34, 0.03, -0.34]
    ];

    armPositions.forEach(([x, y, z]) => {
      // Carbon arm spar
      const armGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.48, 8);
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(x * 0.5, y, z * 0.5);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, 0, z).normalize());
      parent.add(arm);

      // Brushless motor nacelle
      const podGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.09, 12);
      const pod = new THREE.Mesh(podGeo, armMat);
      pod.position.set(x, y + 0.03, z);
      parent.add(pod);

      // Spinning rotor blade
      const bladeGeo = new THREE.BoxGeometry(0.36, 0.008, 0.038);
      const rotor = new THREE.Mesh(bladeGeo, rotorMat);
      rotor.position.set(x, y + 0.08, z);
      rotors.push(rotor);
      parent.add(rotor);

      // High-speed rotor blur disc
      const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.004, 16);
      const disc = new THREE.Mesh(discGeo, blurMat);
      disc.position.set(x, y + 0.08, z);
      blurDiscs.push(disc);
      parent.add(disc);

      // Navigation position LED under nacelle (Red on port/left, Green on starboard/right)
      const ledColor = x < 0 ? 0xff3b30 : 0x30d158;
      const navLedGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const navLedMat = new THREE.MeshBasicMaterial({ color: ledColor });
      const navLed = new THREE.Mesh(navLedGeo, navLedMat);
      navLed.position.set(x, y - 0.03, z);
      parent.add(navLed);
    });

    // High-intensity white flashing tactical strobe beacon
    const beaconGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.14, -0.16);
    parent.add(beacon);

    return beacon;
  }

  private static buildFixedWing(
    parent: THREE.Group,
    rotors: THREE.Mesh[],
    blurDiscs: THREE.Mesh[],
    target: ScenarioTarget
  ): THREE.Mesh {
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: target.visualSignature.color || 0x3a484f,
      roughness: 0.38,
      metalness: 0.55
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1a2226,
      roughness: 0.5,
      metalness: 0.4
    });

    // Aerodynamic tapered fuselage
    const fuseGeo = new THREE.ConeGeometry(0.2, 1.6, 16);
    const fuse = new THREE.Mesh(fuseGeo, fuselageMat);
    fuse.rotation.x = Math.PI / 2;
    fuse.castShadow = true;
    parent.add(fuse);

    // Cockpit / avionics canopy blister
    const canopyGeo = new THREE.CapsuleGeometry(0.08, 0.35, 8, 8);
    canopyGeo.rotateX(Math.PI / 2);
    const canopy = new THREE.Mesh(canopyGeo, darkMat);
    canopy.position.set(0, 0.12, 0.1);
    parent.add(canopy);

    // Swept delta wings with angled winglets
    const wingGeo = new THREE.BoxGeometry(2.1, 0.028, 0.48);
    const wing = new THREE.Mesh(wingGeo, fuselageMat);
    wing.position.set(0, 0.03, -0.05);
    wing.castShadow = true;
    parent.add(wing);

    // Wingtips with vertical winglets
    const wingletGeo = new THREE.BoxGeometry(0.03, 0.22, 0.24);
    const wingletL = new THREE.Mesh(wingletGeo, fuselageMat);
    wingletL.position.set(-1.05, 0.11, -0.05);
    parent.add(wingletL);

    const wingletR = new THREE.Mesh(wingletGeo, fuselageMat);
    wingletR.position.set(1.05, 0.11, -0.05);
    parent.add(wingletR);

    // Twin V-tail stabilizers
    const finGeo = new THREE.BoxGeometry(0.025, 0.32, 0.24);
    const finL = new THREE.Mesh(finGeo, fuselageMat);
    finL.position.set(-0.16, 0.16, -0.68);
    finL.rotation.z = Math.PI / 6;
    parent.add(finL);

    const finR = new THREE.Mesh(finGeo, fuselageMat);
    finR.position.set(0.16, 0.16, -0.68);
    finR.rotation.z = -Math.PI / 6;
    parent.add(finR);

    // Ventral EO/IR surveillance turret dome under chin
    const turretGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const turretMat = new THREE.MeshStandardMaterial({ color: 0x080d0f, roughness: 0.1 });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.set(0, -0.08, 0.45);
    parent.add(turret);

    // Rear pusher propeller
    const propGeo = new THREE.BoxGeometry(0.42, 0.018, 0.035);
    const propMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(0, 0, -0.84);
    rotors.push(prop);
    parent.add(prop);

    // Pusher blur disc
    const blurGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.005, 16);
    blurGeo.rotateX(Math.PI / 2);
    const blurMat = new THREE.MeshBasicMaterial({ color: 0x22333b, transparent: true, opacity: 0.3 });
    const blur = new THREE.Mesh(blurGeo, blurMat);
    blur.position.set(0, 0, -0.84);
    blurDiscs.push(blur);
    parent.add(blur);

    // Wingtip navigation lights
    const navLedL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    navLedL.position.set(-1.05, 0.03, -0.05);
    parent.add(navLedL);

    const navLedR = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x30d158 }));
    navLedR.position.set(1.05, 0.03, -0.05);
    parent.add(navLedR);

    // Tail beacon
    const beaconGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.28, -0.68);
    parent.add(beacon);

    return beacon;
  }

  private static buildMicroUav(
    parent: THREE.Group,
    rotors: THREE.Mesh[],
    blurDiscs: THREE.Mesh[],
    _target: ScenarioTarget
  ): THREE.Mesh {
    const nanoMat = new THREE.MeshStandardMaterial({
      color: 0x131a1e,
      roughness: 0.5,
      metalness: 0.75
    });

    // Sleek nano cylindrical capsule
    const bodyGeo = new THREE.CapsuleGeometry(0.065, 0.14, 8, 8);
    const body = new THREE.Mesh(bodyGeo, nanoMat);
    parent.add(body);

    // Forward miniature sensor aperture
    const eyeGeo = new THREE.SphereGeometry(0.028, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38ef7d });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.02, 0.08);
    parent.add(eye);

    // Dual counter-rotating coaxial micro rotors
    const microBladeGeo = new THREE.BoxGeometry(0.28, 0.006, 0.025);
    const microRotorMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const rotor1 = new THREE.Mesh(microBladeGeo, microRotorMat);
    rotor1.position.set(0, 0.1, 0);
    rotors.push(rotor1);
    parent.add(rotor1);

    const rotor2 = new THREE.Mesh(microBladeGeo, microRotorMat);
    rotor2.position.set(0, 0.14, 0);
    rotors.push(rotor2);
    parent.add(rotor2);

    // Micro blur discs
    const blurGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.003, 14);
    const blurMat = new THREE.MeshBasicMaterial({ color: 0x33eefd, transparent: true, opacity: 0.25 });
    const disc1 = new THREE.Mesh(blurGeo, blurMat);
    disc1.position.set(0, 0.1, 0);
    blurDiscs.push(disc1);
    parent.add(disc1);

    // High-visibility nano beacon strobe
    const ledGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, -0.06, -0.04);
    parent.add(led);

    return led;
  }

  private static buildCivilianToy(
    parent: THREE.Group,
    rotors: THREE.Mesh[],
    blurDiscs: THREE.Mesh[],
    target: ScenarioTarget
  ): THREE.Mesh {
    const toyMat = new THREE.MeshStandardMaterial({
      color: target.visualSignature.color || 0xf5a623, // Bright safety yellow/orange
      roughness: 0.25,
      metalness: 0.15
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3
    });

    // Rounded recreational quadcopter body
    const bodyGeo = new THREE.SphereGeometry(0.2, 16, 16);
    bodyGeo.scale(1.2, 0.45, 1.2);
    const body = new THREE.Mesh(bodyGeo, toyMat);
    body.castShadow = true;
    parent.add(body);

    // White top canopy stripe
    const stripeGeo = new THREE.BoxGeometry(0.1, 0.02, 0.3);
    const stripe = new THREE.Mesh(stripeGeo, whiteMat);
    stripe.position.set(0, 0.09, 0);
    parent.add(stripe);

    // Dual circular propeller guard bumper rings (the distinct recreational tell)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.5 });
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const blurMat = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.25 });

    const ringPositions: [number, number, number][] = [
      [0.26, 0.04, 0.26],
      [-0.26, 0.04, 0.26],
      [-0.26, 0.04, -0.26],
      [0.26, 0.04, -0.26]
    ];

    ringPositions.forEach(([x, y, z], idx) => {
      // Protective outer ring
      const ringGeo = new THREE.TorusGeometry(0.13, 0.016, 8, 18);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y, z);
      parent.add(ring);

      // Support arm
      const armGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.36, 6);
      const arm = new THREE.Mesh(armGeo, toyMat);
      arm.position.set(x * 0.5, y, z * 0.5);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, 0, z).normalize());
      parent.add(arm);

      // Toy propeller
      const bladeGeo = new THREE.BoxGeometry(0.22, 0.007, 0.032);
      const rotor = new THREE.Mesh(bladeGeo, bladeMat);
      rotor.position.set(x, y + 0.015, z);
      rotors.push(rotor);
      parent.add(rotor);

      // Blur disc
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.003, 12), blurMat);
      disc.position.set(x, y + 0.015, z);
      blurDiscs.push(disc);
      parent.add(disc);

      // Alternating consumer novelty LEDs under each arm
      const ledColor = idx % 2 === 0 ? 0x00d2ff : 0xffdd00;
      const toyLed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: ledColor }));
      toyLed.position.set(x, y - 0.02, z);
      parent.add(toyLed);
    });

    // Leisure blue top indicator
    const ledGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 0.1, 0.15);
    parent.add(led);

    return led;
  }
}
