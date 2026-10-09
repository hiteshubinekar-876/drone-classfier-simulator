# Data Model & Storage Architecture (DB_BACKEND)
## Virtual Drone-Threat Training Simulator

**Document Status:** Approved Storage Architecture  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`

---

### 1. Storage Strategy: Offline-First IndexedDB

The MVP is engineered as an **offline-first local-storage system**. It requires zero external servers, network connectivity, or database daemons to operate.

- **Primary Browser Storage Engine:** IndexedDB (database name: `drone_training_simulator_db`, version: `1`).
- **Object Stores:**
  1. `sessions`: Metadata for every training attempt.
  2. `events`: Chronological event log emitted during each simulation run.
  3. `scores`: Detailed, versioned evaluation score records.
  4. `scenarios`: Scenario definitions and presets.
  5. `settings`: User preferences, graphics quality, and key bindings.
- **Desktop Storage Strategy:** Uses the same IndexedDB engine in WebView2, with an optional abstracted SQLite driver when packaged via Tauri.

---

### 2. Entity Schema Definitions

#### 2.1 User Entity (`users`)
```typescript
export interface User {
  id: string;               // UUID (defaults to 'guest-trainee')
  displayName: string;      // 'Trainee Alpha'
  role: 'trainee' | 'instructor' | 'admin';
  createdAt: number;        // Epoch timestamp ms
}
```

#### 2.2 Scenario Entity (`scenarios`)
```typescript
export type DroneThreatClass = 
  | 'quadcopter_surveillance'
  | 'fixed_wing_recon'
  | 'micro_uav'
  | 'civilian_toy';

export interface DroneFlightWaypoint {
  timeSec: number;
  position: [number, number, number]; // [x, y, z]
  speedMps: number;
}

export interface ScenarioTarget {
  id: string;                         // e.g., 'target-alpha'
  threatClass: DroneThreatClass;
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
  id: string;                         // 'scenario-border-outpost'
  name: string;                       // 'Border Outpost Perimeter'
  description: string;
  environmentId: 'desert_outpost' | 'urban_rooftop' | 'foggy_valley';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeOfDay: 'day' | 'sunset' | 'overcast' | 'fog';
  durationSeconds: number;            // e.g. 90
  targets: ScenarioTarget[];
  version: string;                    // '1.0.0'
  isRandomized: boolean;
  seed?: number;
}
```

#### 2.3 Session Entity (`sessions`)
```typescript
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface TrainingSession {
  id: string;                         // UUID
  userId: string;
  scenarioId: string;
  scenarioName: string;
  scenarioVersion: string;
  startedAt: number;                  // Epoch ms
  completedAt: number | null;
  status: SessionStatus;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  appVersion: string;                 // e.g., '1.0.0'
}
```

#### 2.4 Simulation Event Entity (`events`)
```typescript
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
```

#### 2.5 Score Entity (`scores`)
```typescript
export interface ScoreBreakdown {
  detectionLatencyScore: number;     // 0 - 30 points (faster detection = higher)
  classificationAccuracyScore: number;// 0 - 50 points (ground-truth match)
  trackingCoverageScore: number;     // 0 - 20 points (sustained observation)
  falseAlarmPenalty: number;         // subtracted points (guessing / misidentifying)
}

export interface TargetAssessment {
  targetId: string;
  expectedClass: DroneThreatClass;
  classifiedAs?: DroneThreatClass;
  isCorrect: boolean;
  detectionLatencySec: number | null; // null if missed
  trackingDurationSec: number;
  scoreContribution: number;
}

export interface TrainingScore {
  id: string;
  sessionId: string;
  scoringVersion: string;            // 'v1.0.0'
  totalScore: number;                // Normalized 0 - 100
  passed: boolean;                   // >= 70 points
  breakdown: ScoreBreakdown;
  targetAssessments: TargetAssessment[];
  feedbackNotes: string[];           // Tailored recommendations
  calculatedAt: number;
}
```

---

### 3. Deterministic Assessment Flow & Formula

```text
[Simulation Event Log] + [Scenario Ground Truth]
                      |
                      v
            [Scoring Engine v1.0.0]
                      |
                      +---> 1. Match submissions to targets
                      +---> 2. Measure detection latency: LatencyScore = max(0, 30 * (1 - latency / maxAllowed))
                      +---> 3. Check classification: Correct = +50 pts (weighted across targets)
                      +---> 4. Compute tracking coverage: CoverageScore = 20 * (trackedTime / targetLifetime)
                      +---> 5. Apply false alarm penalties
                      +---> 6. Clamp total score: clamp(0, 100)
                      +---> 7. Synthesize diagnostic feedback bullets
                      |
                      v
             [TrainingScore Record]
                      |
                      v
         [IndexedDB: 'scores' & 'sessions']
```

Scoring weights are completely explainable to trainees and instructors:
- **Accuracy (50%):** Correct visual categorization of the drone archetype.
- **Latency (30%):** Prompt identification before the drone penetrates perimeter airspace.
- **Tracking (20%):** Continuous surveillance contact.
- **Penalty (-10 pts):** Submitting false classifications on non-existent targets.

---

### 4. Optional Future Central API (FastAPI Reference)

For institutional deployments requiring multi-seat centralized reporting, the data model maps directly to REST endpoints:
- `GET /api/scenarios`: Returns approved scenario definitions.
- `POST /api/sessions`: Registers session initialization.
- `POST /api/sessions/{id}/events`: Batched event telemetry upload.
- `POST /api/sessions/{id}/complete`: Triggers server-side verification and score archival.
- `GET /api/sessions/{id}/report`: Retrieves complete AAR data packet.
- `GET /api/users/{id}/progress`: Longitudinal trainee progression analytics.
