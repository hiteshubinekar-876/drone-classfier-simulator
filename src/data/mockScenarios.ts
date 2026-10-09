import { ScenarioDefinition } from '../types';

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'scenario-border-outpost',
    name: 'Border Outpost Perimeter',
    codename: 'OP-VANGUARD',
    description: 'Daylight surveillance over an elevated desert outpost. Trainee must scan perimeter airspace, acquire moving aerial targets, and classify rotary and fixed-wing UAVs.',
    environmentId: 'desert_outpost',
    difficulty: 'beginner',
    timeOfDay: 'day',
    durationSeconds: 75,
    version: '1.0.0',
    isRandomized: false,
    objectiveSummary: 'Observe and classify 3 scheduled aerial contacts before they exit designated observation corridors.',
    targets: [
      {
        id: 'target-alpha',
        callsign: 'VULTURE-1',
        threatClass: 'quadcopter_surveillance',
        flightProfile: 'hover',
        spawnTimeSec: 4,
        despawnTimeSec: 36,
        visualSignature: {
          color: '#2b3a42',
          rotorCount: 4,
          wingspanMeters: 0.85,
          beaconFlashHz: 1.5
        },
        waypoints: [
          { timeSec: 4, position: [35, 14, -45], speedMps: 4 },
          { timeSec: 12, position: [20, 18, -35], speedMps: 3 },
          { timeSec: 20, position: [5, 16, -40], speedMps: 2 },
          { timeSec: 28, position: [-15, 20, -50], speedMps: 4 },
          { timeSec: 36, position: [-40, 24, -65], speedMps: 6 }
        ]
      },
      {
        id: 'target-bravo',
        callsign: 'SWIFT-2',
        threatClass: 'fixed_wing_recon',
        flightProfile: 'linear_pass',
        spawnTimeSec: 25,
        despawnTimeSec: 55,
        visualSignature: {
          color: '#475860',
          rotorCount: 1,
          wingspanMeters: 1.6,
          beaconFlashHz: 2.0
        },
        waypoints: [
          { timeSec: 25, position: [-85, 32, -90], speedMps: 12 },
          { timeSec: 32, position: [-40, 28, -75], speedMps: 11 },
          { timeSec: 40, position: [15, 26, -70], speedMps: 11 },
          { timeSec: 48, position: [65, 30, -85], speedMps: 13 },
          { timeSec: 55, position: [110, 36, -110], speedMps: 14 }
        ]
      },
      {
        id: 'target-charlie',
        callsign: 'MOSQUITO-3',
        threatClass: 'micro_uav',
        flightProfile: 'evasive_gusts',
        spawnTimeSec: 42,
        despawnTimeSec: 72,
        visualSignature: {
          color: '#1a1f22',
          rotorCount: 2,
          wingspanMeters: 0.28,
          beaconFlashHz: 3.0
        },
        waypoints: [
          { timeSec: 42, position: [-12, 7, -22], speedMps: 3 },
          { timeSec: 50, position: [-5, 11, -18], speedMps: 3.5 },
          { timeSec: 58, position: [10, 8, -25], speedMps: 3 },
          { timeSec: 65, position: [22, 12, -32], speedMps: 4 },
          { timeSec: 72, position: [45, 18, -48], speedMps: 5 }
        ]
      }
    ]
  },
  {
    id: 'scenario-urban-rooftop',
    name: 'Urban Skyline Surveillance',
    codename: 'SKYLINE-WATCH',
    description: 'Dusk twilight monitoring from a fortified rooftop post. Includes civilian leisure quadcopters operating near commercial air corridors. Trainee must discriminate harmless civilian toys from surveillance platforms.',
    environmentId: 'urban_rooftop',
    difficulty: 'intermediate',
    timeOfDay: 'sunset',
    durationSeconds: 90,
    version: '1.0.0',
    isRandomized: false,
    objectiveSummary: 'Identify 4 contacts; differentiate civilian leisure drones from hostile tactical platforms.',
    targets: [
      {
        id: 'target-spark',
        callsign: 'SPARK-TOY',
        threatClass: 'civilian_toy',
        flightProfile: 'recon_orbit',
        spawnTimeSec: 5,
        despawnTimeSec: 38,
        visualSignature: {
          color: '#f5a623', // Bright consumer color
          rotorCount: 4,
          wingspanMeters: 0.5,
          beaconFlashHz: 0.5
        },
        waypoints: [
          { timeSec: 5, position: [25, 12, -30], speedMps: 3 },
          { timeSec: 14, position: [30, 16, -20], speedMps: 3 },
          { timeSec: 22, position: [20, 14, -15], speedMps: 2.5 },
          { timeSec: 30, position: [15, 10, -25], speedMps: 3 },
          { timeSec: 38, position: [28, 6, -40], speedMps: 4 }
        ]
      },
      {
        id: 'target-spectre',
        callsign: 'SPECTRE-QUAD',
        threatClass: 'quadcopter_surveillance',
        flightProfile: 'hover',
        spawnTimeSec: 22,
        despawnTimeSec: 58,
        visualSignature: {
          color: '#1a2428',
          rotorCount: 4,
          wingspanMeters: 0.9,
          beaconFlashHz: 1.5
        },
        waypoints: [
          { timeSec: 22, position: [-45, 22, -60], speedMps: 3 },
          { timeSec: 32, position: [-35, 26, -50], speedMps: 2 },
          { timeSec: 42, position: [-25, 25, -45], speedMps: 2 },
          { timeSec: 50, position: [-15, 28, -55], speedMps: 4 },
          { timeSec: 58, position: [-10, 32, -80], speedMps: 6 }
        ]
      },
      {
        id: 'target-delta',
        callsign: 'DELTA-WING',
        threatClass: 'fixed_wing_recon',
        flightProfile: 'linear_pass',
        spawnTimeSec: 45,
        despawnTimeSec: 74,
        visualSignature: {
          color: '#34454d',
          rotorCount: 1,
          wingspanMeters: 1.8,
          beaconFlashHz: 2.0
        },
        waypoints: [
          { timeSec: 45, position: [90, 35, -80], speedMps: 13 },
          { timeSec: 52, position: [40, 30, -65], speedMps: 12 },
          { timeSec: 60, position: [-10, 28, -70], speedMps: 12 },
          { timeSec: 67, position: [-60, 32, -85], speedMps: 14 },
          { timeSec: 74, position: [-110, 38, -100], speedMps: 15 }
        ]
      },
      {
        id: 'target-nano',
        callsign: 'NANO-STRIKE',
        threatClass: 'micro_uav',
        flightProfile: 'evasive_gusts',
        spawnTimeSec: 60,
        despawnTimeSec: 88,
        visualSignature: {
          color: '#11181c',
          rotorCount: 2,
          wingspanMeters: 0.25,
          beaconFlashHz: 3.5
        },
        waypoints: [
          { timeSec: 60, position: [8, 9, -20], speedMps: 3.5 },
          { timeSec: 67, position: [-6, 14, -18], speedMps: 4 },
          { timeSec: 74, position: [-14, 10, -26], speedMps: 3 },
          { timeSec: 81, position: [-4, 16, -34], speedMps: 4.5 },
          { timeSec: 88, position: [15, 22, -50], speedMps: 6 }
        ]
      }
    ]
  },
  {
    id: 'scenario-foggy-valley',
    name: 'Foggy Valley Rapid Intercept',
    codename: 'MIST-HAWK',
    description: 'Adverse weather scenario with heavy fog scattering and poor visual contrast. Trainees must utilize binocular magnification, spot faint navigation strobes, and rapidly classify aerial threats.',
    environmentId: 'foggy_valley',
    difficulty: 'advanced',
    timeOfDay: 'fog',
    durationSeconds: 95,
    version: '1.0.0',
    isRandomized: false,
    objectiveSummary: 'Penetrate adverse atmospheric fog to detect and classify 4 fast-moving stealth UAV contacts.',
    targets: [
      {
        id: 'target-ghost',
        callsign: 'GHOST-WING',
        threatClass: 'fixed_wing_recon',
        flightProfile: 'linear_pass',
        spawnTimeSec: 5,
        despawnTimeSec: 36,
        visualSignature: {
          color: '#28363d',
          rotorCount: 1,
          wingspanMeters: 2.1,
          beaconFlashHz: 2.5
        },
        waypoints: [
          { timeSec: 5, position: [-100, 30, -75], speedMps: 14 },
          { timeSec: 13, position: [-50, 24, -60], speedMps: 13 },
          { timeSec: 21, position: [10, 22, -65], speedMps: 13 },
          { timeSec: 28, position: [60, 27, -80], speedMps: 15 },
          { timeSec: 36, position: [115, 34, -100], speedMps: 16 }
        ]
      },
      {
        id: 'target-phantom',
        callsign: 'PHANTOM-NANO',
        threatClass: 'micro_uav',
        flightProfile: 'evasive_gusts',
        spawnTimeSec: 28,
        despawnTimeSec: 58,
        visualSignature: {
          color: '#151d21',
          rotorCount: 2,
          wingspanMeters: 0.22,
          beaconFlashHz: 4.0
        },
        waypoints: [
          { timeSec: 28, position: [15, 8, -25], speedMps: 3 },
          { timeSec: 36, position: [5, 12, -22], speedMps: 4 },
          { timeSec: 43, position: [-12, 10, -28], speedMps: 3.5 },
          { timeSec: 51, position: [-20, 15, -35], speedMps: 4 },
          { timeSec: 58, position: [-35, 20, -50], speedMps: 5 }
        ]
      },
      {
        id: 'target-decoy',
        callsign: 'DECOY-YELLOW',
        threatClass: 'civilian_toy',
        flightProfile: 'hover',
        spawnTimeSec: 48,
        despawnTimeSec: 76,
        visualSignature: {
          color: '#e5a020',
          rotorCount: 4,
          wingspanMeters: 0.45,
          beaconFlashHz: 0.5
        },
        waypoints: [
          { timeSec: 48, position: [-25, 14, -32], speedMps: 2.5 },
          { timeSec: 55, position: [-15, 16, -26], speedMps: 2 },
          { timeSec: 62, position: [-5, 13, -30], speedMps: 2.5 },
          { timeSec: 69, position: [8, 17, -35], speedMps: 3 },
          { timeSec: 76, position: [24, 21, -45], speedMps: 4 }
        ]
      },
      {
        id: 'target-oculus',
        callsign: 'OCULUS-QUAD',
        threatClass: 'quadcopter_surveillance',
        flightProfile: 'recon_orbit',
        spawnTimeSec: 64,
        despawnTimeSec: 92,
        visualSignature: {
          color: '#1d2a30',
          rotorCount: 4,
          wingspanMeters: 1.0,
          beaconFlashHz: 1.5
        },
        waypoints: [
          { timeSec: 64, position: [40, 24, -55], speedMps: 3 },
          { timeSec: 71, position: [25, 28, -48], speedMps: 2.5 },
          { timeSec: 78, position: [5, 27, -50], speedMps: 2.5 },
          { timeSec: 85, position: [-15, 30, -60], speedMps: 3.5 },
          { timeSec: 92, position: [-35, 36, -75], speedMps: 5 }
        ]
      }
    ]
  }
];
