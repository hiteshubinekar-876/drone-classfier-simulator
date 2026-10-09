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
    let beaconMesh: THREE.Mesh;

    switch (target.threatClass) {
      case 'fixed_wing_recon':
        beaconMesh = this.buildFixedWing(group, rotors, target);
        break;
      case 'micro_uav':
        beaconMesh = this.buildMicroUav(group, rotors, target);
        break;
      case 'civilian_toy':
        beaconMesh = this.buildCivilianToy(group, rotors, target);
        break;
      case 'quadcopter_surveillance':
      default:
        beaconMesh = this.buildQuadcopter(group, rotors, target);
        break;
    }

    const beaconMaterial = beaconMesh.material as THREE.MeshBasicMaterial;
    const baseColor = beaconMaterial.color.clone();

    const update = (_deltaSec: number, elapsedSec: number) => {
      // Spin rotors
      const spinSpeed = target.threatClass === 'micro_uav' ? 45 : 30;
      rotors.forEach((rotor, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        rotor.rotation.y += dir * spinSpeed * _deltaSec;
      });

      // Beacon strobe
      const flashHz = target.visualSignature.beaconFlashHz || 1.5;
      const flash = (Math.sin(elapsedSec * Math.PI * 2 * flashHz) + 1) / 2;
      if (flash > 0.8) {
        beaconMaterial.color.setHex(0xffffff);
      } else {
        beaconMaterial.color.copy(baseColor);
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
    target: ScenarioTarget
  ): THREE.Mesh {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: target.visualSignature.color || 0x2b3a42,
      roughness: 0.5,
      metalness: 0.6
    });
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x1a2327,
      roughness: 0.7,
      metalness: 0.4
    });
    const rotorMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    // Central chassis
    const bodyGeo = new THREE.BoxGeometry(0.35, 0.12, 0.35);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    parent.add(body);

    // Sensor turret underneath
    const sensorGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 });
    const sensor = new THREE.Mesh(sensorGeo, sensorMat);
    sensor.position.set(0, -0.08, 0.08);
    parent.add(sensor);

    // 4 Quad arms and rotors
    const armPositions: [number, number, number][] = [
      [0.3, 0.02, 0.3],
      [-0.3, 0.02, 0.3],
      [-0.3, 0.02, -0.3],
      [0.3, 0.02, -0.3]
    ];

    armPositions.forEach(([x, y, z]) => {
      // Arm tube
      const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(x * 0.5, y, z * 0.5);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, 0, z).normalize());
      parent.add(arm);

      // Motor pod
      const podGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 12);
      const pod = new THREE.Mesh(podGeo, armMat);
      pod.position.set(x, y + 0.02, z);
      parent.add(pod);

      // Rotor disc
      const bladeGeo = new THREE.BoxGeometry(0.32, 0.008, 0.04);
      const rotor = new THREE.Mesh(bladeGeo, rotorMat);
      rotor.position.set(x, y + 0.07, z);
      rotors.push(rotor);
      parent.add(rotor);
    });

    // Beacon
    const beaconGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.08, -0.15);
    parent.add(beacon);

    return beacon;
  }

  private static buildFixedWing(
    parent: THREE.Group,
    rotors: THREE.Mesh[],
    target: ScenarioTarget
  ): THREE.Mesh {
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: target.visualSignature.color || 0x3d4e57,
      roughness: 0.4,
      metalness: 0.5
    });

    // Fuselage
    const fuseGeo = new THREE.ConeGeometry(0.18, 1.4, 16);
    const fuse = new THREE.Mesh(fuseGeo, fuselageMat);
    fuse.rotation.x = Math.PI / 2;
    fuse.castShadow = true;
    parent.add(fuse);

    // Delta wings
    const wingGeo = new THREE.BoxGeometry(1.8, 0.025, 0.45);
    const wing = new THREE.Mesh(wingGeo, fuselageMat);
    wing.position.set(0, 0.02, -0.1);
    wing.castShadow = true;
    parent.add(wing);

    // Vertical fin / rudder
    const finGeo = new THREE.BoxGeometry(0.03, 0.28, 0.25);
    const fin = new THREE.Mesh(finGeo, fuselageMat);
    fin.position.set(0, 0.16, -0.55);
    parent.add(fin);

    // Pusher propeller
    const propGeo = new THREE.BoxGeometry(0.38, 0.015, 0.03);
    const propMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(0, 0, -0.72);
    rotors.push(prop);
    parent.add(prop);

    // Navigation beacon
    const beaconGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.32, -0.55);
    parent.add(beacon);

    return beacon;
  }

  private static buildMicroUav(
    parent: THREE.Group,
    rotors: THREE.Mesh[],
    _target: ScenarioTarget
  ): THREE.Mesh {
    const nanoMat = new THREE.MeshStandardMaterial({
      color: 0x111619,
      roughness: 0.6,
      metalness: 0.7
    });

    // Tiny nano capsule body
    const bodyGeo = new THREE.CapsuleGeometry(0.06, 0.12, 8, 8);
    const body = new THREE.Mesh(bodyGeo, nanoMat);
    parent.add(body);

    // Dual counter-rotating micro blades
    const microRotorGeo = new THREE.BoxGeometry(0.24, 0.005, 0.02);
    const microRotorMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6 });

    const rotor1 = new THREE.Mesh(microRotorGeo, microRotorMat);
    rotor1.position.set(0, 0.09, 0);
    rotors.push(rotor1);
    parent.add(rotor1);

    const rotor2 = new THREE.Mesh(microRotorGeo, microRotorMat);
    rotor2.position.set(0, 0.12, 0);
    rotors.push(rotor2);
    parent.add(rotor2);

    // Ultra bright micro LED
    const ledGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x33eeff });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 0, 0.07);
    parent.add(led);

    return led;
  }

  private static buildCivilianToy(
    parent: THREE.Group,
    rotors: THREE.Mesh[],
    target: ScenarioTarget
  ): THREE.Mesh {
    const toyMat = new THREE.MeshStandardMaterial({
      color: target.visualSignature.color || 0xf5a623, // Bright toy yellow
      roughness: 0.3,
      metalness: 0.1
    });

    // Rounded toy body
    const bodyGeo = new THREE.SphereGeometry(0.18, 14, 14);
    bodyGeo.scale(1.2, 0.5, 1.2);
    const body = new THREE.Mesh(bodyGeo, toyMat);
    body.castShadow = true;
    parent.add(body);

    // Propeller bumper rings
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.6 });

    const ringPositions: [number, number, number][] = [
      [0.24, 0.04, 0.24],
      [-0.24, 0.04, 0.24],
      [-0.24, 0.04, -0.24],
      [0.24, 0.04, -0.24]
    ];

    ringPositions.forEach(([x, y, z]) => {
      const ringGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 16);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y, z);
      parent.add(ring);

      const bladeGeo = new THREE.BoxGeometry(0.2, 0.006, 0.03);
      const rotor = new THREE.Mesh(bladeGeo, bladeMat);
      rotor.position.set(x, y + 0.01, z);
      rotors.push(rotor);
      parent.add(rotor);
    });

    // Friendly soft blue LED
    const ledGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 0.1, 0.14);
    parent.add(led);

    return led;
  }
}
