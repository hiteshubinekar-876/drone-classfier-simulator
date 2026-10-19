export type DroneThreatClass =
  | 'quadcopter_surveillance'
  | 'fixed_wing_recon'
  | 'micro_uav'
  | 'civilian_toy';

export interface ThreatClassMetadata {
  id: DroneThreatClass;
  displayName: string;
  category: 'Rotary' | 'Fixed-Wing' | 'Nano/Micro' | 'Civilian Decoy';
  threatLevel: 'Low' | 'Medium' | 'High' | 'Severe';
  description: string;
  visualIndicators: string[];
}

export const THREAT_CATALOG: Record<DroneThreatClass, ThreatClassMetadata> = {
  quadcopter_surveillance: {
    id: 'quadcopter_surveillance',
    displayName: 'Quadcopter Surveillance UAV',
    category: 'Rotary',
    threatLevel: 'High',
    description: 'Medium quad-rotor platform equipped with optical/IR payload for loitering surveillance.',
    visualIndicators: ['4 distinct horizontal rotors', 'Stationary or slow hovering flight profile', 'Flashing navigation strobe', 'Dark matte fuselage']
  },
  fixed_wing_recon: {
    id: 'fixed_wing_recon',
    displayName: 'Fixed-Wing Reconnaissance UAV',
    category: 'Fixed-Wing',
    threatLevel: 'Severe',
    description: 'High-speed autonomous aerodynamic glider designed for long-range boundary reconnaissance.',
    visualIndicators: ['Swept delta wing silhouette', 'High linear transit velocity', 'Banked turns with aerodynamic tilt', 'Low-frequency propeller sound']
  },
  micro_uav: {
    id: 'micro_uav',
    displayName: 'Micro-UAV (Nano Swarm Drone)',
    category: 'Nano/Micro',
    threatLevel: 'High',
    description: 'Sub-250g ultra-compact drone capable of low-altitude terrain masking and high agility.',
    visualIndicators: ['Extremely small optical cross-section (<0.3m)', 'Erratic lateral gust corrections', 'Low acoustic signature', 'Rapid vertical climbs']
  },
  civilian_toy: {
    id: 'civilian_toy',
    displayName: 'Commercial Toy / False Alarm',
    category: 'Civilian Decoy',
    threatLevel: 'Low',
    description: 'Unmodified consumer leisure quadcopter or drone decoy without tactical optics or threat intent.',
    visualIndicators: ['Bright recreational coloring (yellow/red)', 'Predictable figure-eight or loop paths', 'No tactical antenna mast', 'Limited operational range']
  }
};

export interface DroneFlightWaypoint {
  timeSec: number;
  position: [number, number, number]; // [x, y, z]
  speedMps: number;
}

export interface ScenarioTarget {
  id: string;
  threatClass: DroneThreatClass;
  callsign: string;
  flightProfile: 'hover' | 'recon_orbit' | 'linear_pass' | 'evasive_gusts';
  waypoints: DroneFlightWaypoint[];
  visualSignature: {
    color: string;
    rotorCount: number;
    wingspanMeters: number;
    beaconFlashHz: number;
  };
  spawnTimeSec: number;
  despawnTimeSec: number;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  codename: string;
  description: string;
  environmentId: 'desert_outpost' | 'urban_rooftop' | 'foggy_valley';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeOfDay: 'day' | 'sunset' | 'overcast' | 'fog';
  durationSeconds: number;
  targets: ScenarioTarget[];
  version: string;
  isRandomized: boolean;
  seed?: number;
  objectiveSummary: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface TrainingSession {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioName: string;
  scenarioVersion: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  startedAt: number;
  completedAt: number | null;
  status: SessionStatus;
  appVersion: string;
}

export type SimulationEventType =
  | 'SESSION_START'
  | 'TARGET_SPAWNED'
  | 'TARGET_ENTER_VIEW'
  | 'TARGET_LOCK_ACQUIRED'
  | 'CLASSIFICATION_SUBMITTED'
  | 'TARGET_EXIT_VIEW'
  | 'TARGET_DESPAWNED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'SESSION_COMPLETED';

export interface SimulationEvent {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  simulationTimeMs: number;
  eventType: SimulationEventType;
  payload: {
    targetId?: string;
    threatClass?: DroneThreatClass;
    submittedClass?: DroneThreatClass;
    confidence?: 'confirmed' | 'suspected';
    cameraBearing?: number;
    cameraPitch?: number;
    distanceMeters?: number;
    notes?: string;
  };
}

export interface ScoreBreakdown {
  detectionLatencyScore: number;      // 0 - 30
  classificationAccuracyScore: number; // 0 - 50
  trackingCoverageScore: number;      // 0 - 20
  falseAlarmPenalty: number;          // deduction
}

export interface TargetAssessment {
  targetId: string;
  callsign: string;
  expectedClass: DroneThreatClass;
  classifiedAs?: DroneThreatClass;
  isCorrect: boolean;
  detectionLatencySec: number | null;
  trackingDurationSec: number;
  scoreContribution: number;
}

export interface TrainingScore {
  id: string;
  sessionId: string;
  scoringVersion: string;
  totalScore: number; // 0 - 100
  passed: boolean;    // >= 70
  rating: 'EXEMPLARY' | 'QUALIFIED' | 'NEEDS_REMEDIATION';
  breakdown: ScoreBreakdown;
  targetAssessments: TargetAssessment[];
  feedbackNotes: string[];
  calculatedAt: number;
}

export type GraphicsPreset = 'low' | 'medium' | 'high';

export type KeyAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'toggleZoom'
  | 'triggerClassification'
  | 'selectArchetype1'
  | 'selectArchetype2'
  | 'selectArchetype3'
  | 'selectArchetype4'
  | 'submitClassification'
  | 'cancelDrawer'
  | 'pauseSimulation'
  | 'toggleMute';

export type KeyBindings = Record<KeyAction, string>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  toggleZoom: 'ShiftLeft',
  triggerClassification: 'Space',
  selectArchetype1: 'Digit1',
  selectArchetype2: 'Digit2',
  selectArchetype3: 'Digit3',
  selectArchetype4: 'Digit4',
  submitClassification: 'Enter',
  cancelDrawer: 'Escape',
  pauseSimulation: 'Escape',
  toggleMute: 'KeyM'
};

export interface UserSettings {
  graphicsPreset: GraphicsPreset;
  resolutionScale: number; // 0.75, 1.0, 1.25
  fieldOfView: number;     // 60 - 90
  shadowsEnabled: boolean;
  masterVolume: number;    // 0.0 - 1.0
  ambientVolume: number;
  sfxVolume: number;
  mouseSensitivity: number; // 0.1 - 3.0
  invertY: boolean;
  reducedMotion: boolean;
  targetObservationPacing: 'standard' | 'extended' | 'relaxed';
  keyBindings: KeyBindings;
}

export const DEFAULT_SETTINGS: UserSettings = {
  graphicsPreset: 'medium',
  resolutionScale: 1.0,
  fieldOfView: 75,
  shadowsEnabled: true,
  masterVolume: 0.8,
  ambientVolume: 0.6,
  sfxVolume: 0.9,
  mouseSensitivity: 1.0,
  invertY: false,
  reducedMotion: false,
  targetObservationPacing: 'standard',
  keyBindings: { ...DEFAULT_KEY_BINDINGS }
};

export * from './aarInsights';
