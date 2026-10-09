# Application Flow Specification (APP_FLOW)
## Virtual Drone-Threat Training Simulator

**Document Status:** Complete Architecture Specification  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`

---

### 1. Primary User Journey & State Diagram

```text
               +----------------------------------+
               |        Application Launch        |
               +----------------------------------+
                                |
                                v
               +----------------------------------+
               |      Welcome Screen / Splash     |
               +----------------------------------+
                                |
                                v
               +----------------------------------+
               |            Main Menu             |
               +----------------------------------+
                /         |             |        \
               /          |             |         \
              v           v             v          v
     [Scenario Select] [Progress]   [Settings]   [Exit]
            |             |             |
            v             |             |
     [Mission Briefing]   |             |
            |             |             |
            v             |             |
     [3D Simulation] <-> [Pause Menu]   |
            |             |             |
            v             v             |
     [Results Summary] <--+             |
            |                           |
            v                           |
     [AAR Dashboard] -------------------+
            |
            +---> [Retry Scenario] ---> [3D Simulation]
            +---> [Main Menu]
```

---

### 2. Screen Specifications & Behavioral Contracts

#### 2.1 Welcome Screen (`/welcome`)
- **Visuals:** Immersive military-grade simulation aesthetic, drone telemetry motif, animated system status indicators.
- **Components:**
  - Application Title: **Virtual Drone-Threat Training Simulator**
  - Subtitle / Mission Statement: *Visual Observation, Recognition & Threat Classification Environment*
  - Disclaimer banner: *Non-operational training simulation for cognitive observation only.*
  - Primary Action Button: `[ ENTER TRAINING FACILITY ]`
  - Quick System Diagnostic: WebGL2 status, display resolution, GPU status.

#### 2.2 Main Menu (`/menu`)
- **Navigation Options:**
  - `START TRAINING`: Opens Scenario Selection screen.
  - `SESSION HISTORY & AAR`: View past trainee sessions, scores, and timeline records.
  - `SIMULATOR SETTINGS`: Configure graphics presets, audio, camera sensitivity, and data management.
  - `ABOUT & CONTROLS`: Reference manual for controls and classification ontology.

#### 2.3 Scenario Selection Screen (`/scenarios`)
- **Visuals:** Tactical grid of training scenario cards with thumbnail representations and difficulty badges.
- **Card Metadata:**
  - Scenario Name (e.g., *Border Outpost Perimeter*, *Urban Rooftop Surveillance*, *Adverse Weather Intercept*)
  - Difficulty: `Beginner`, `Intermediate`, `Advanced`
  - Environment: Terrain type, time of day (Clear Daylight, Sunset Twilight, Dense Fog)
  - Objective: Number of aerial targets to detect and classify
  - Duration: e.g., 90–120 seconds
  - Type: Scripted Benchmark or Randomized Practice
- **Actions:** Select scenario card -> Proceed to `[ MISSION BRIEFING ]`.

#### 2.4 Mission Briefing Screen (`/briefing`)
- **Visuals:** High-contrast tactical briefing docket.
- **Sections:**
  - Target Scenario Dossier: Environmental conditions, expected flight corridors, rules of observation.
  - Recognition Target Reference: Silhouette silhouettes of potential aerial objects:
    - *Quadcopter Drone (Rotary)*: Slow hover, high maneuverability, 4 rotors.
    - *Fixed-Wing UAV*: High speed, linear flight path, gliding aerodynamics.
    - *Micro-UAV (Nano)*: Extremely small visual signature, low altitude, erratic gusts.
    - *Civilian Decoy / Toy*: Bright coloring, predictable loops, non-threatening signature.
  - Controls Reference:
    - `W, A, S, D`: Walk / Reposition observation post
    - `Mouse`: Free-look pan and tilt
    - `Right Mouse Button / Shift`: Engage 3x Binocular Zoom
    - `Space / Left Mouse Button`: Lock onto target / Open Classification Selector
    - `Esc / P`: Pause simulation
  - Action Buttons: `[ ABORT / BACK ]` and `[ COMMENCE SIMULATION ]`.

#### 2.5 3D Simulation Screen (`/simulation`)
- **Main Canvas:** Fullscreen Three.js WebGL2 canvas rendering 3D terrain, skybox, ambient foliage, structures, and dynamic drone entities.
- **Heads-Up Display (HUD):**
  - **Top Bar:** Scenario name, elapsed mission timer, remaining time progress bar.
  - **Compass & Pitch Tape:** Realistic military-styled bearing indicator at top center.
  - **Center Reticle:** Crosshair with dynamic rangefinder readout and lock-on bracket when hovering an aerial target.
  - **Objective Box:** Active targets spotted / Total targets, current objective text.
  - **Classification Dialog (Radial or Tactical Drawer):**
    - Triggers when trainee selects a spotted aerial contact.
    - Presents classification options: `Rotary Quadcopter`, `Fixed-Wing Recon`, `Micro-UAV`, `Civilian Toy`.
    - Confidence selection: `Confirmed` or `Suspected`.
    - Instant confirmation sound and event emission.
  - **Non-Operational Watermark:** Persistent subtle notice: *TRAINING SIMULATION ONLY - NO OPERATIONAL WEAPON CONTROL*.

#### 2.6 Pause Overlay (`modal`)
- Modal overlay over blurred 3D canvas (simulation clock pauses).
- Actions: `Resume Training`, `Restart Scenario`, `Adjust Settings`, `Abort to Main Menu`.

#### 2.7 Results Summary Screen (`/results`)
- **Header:** Pass / Needs Improvement evaluation badge with overall composite score (0–100%).
- **Score Metrics Breakdown:**
  - Detection Latency Score (Reaction time from drone entrance into view)
  - Classification Accuracy Score (Ground-truth alignment)
  - Target Tracking Coverage (Time spent maintaining visual contact)
  - Procedure Penalty (False alarms, unconfirmed guesses)
- **Summary Counters:** Targets Detected, Correct Classifications, Missed Contacts, Average Latency (s).
- **Actions:** `[ DETAILED AAR TIMELINE ]`, `[ RETRY SCENARIO ]`, `[ RETURN TO MENU ]`.

#### 2.8 After-Action Review (AAR) Dashboard (`/aar/:sessionId`)
- **Interactive Event Timeline:**
  - Scrubbable or stepped chronological timeline of simulation seconds (0s -> End).
  - Markers for:
    - Target Spawn Events (Ground truth entrance)
    - Trainee Initial Spotting Event
    - Trainee Classification Decision
    - Target Exit / Despawn
  - Delta measurement display: *Detected in 3.4s after emergence (+92 pts)*.
- **Target Analysis Table:**
  - Target ID, Drone Type, Actual Classification, Trainee Classification, Time to Classify, Outcome (Match / Mismatch).
- **Instructor / AI Feedback Notes:**
  - Automated diagnostic observations (e.g., *"Quick initial detection of Fixed-Wing UAV, but misclassified Micro-UAV as civilian toy due to long range"*).
- **Historical Comparison:** Chart comparing this session's score against trainee's prior attempts on this scenario.

#### 2.9 Settings & Diagnostics (`/settings`)
- **Graphics Quality:**
  - Presets: `Low` (no shadows, standard resolution, low foliage count), `Medium` (soft shadows, 1.0x res, balanced foliage), `High` (MSAA, 1.25x res, dynamic shadow maps, particles).
  - Field of View (FOV): 60° to 95°.
  - Resolution Scale: 0.75x, 1.0x, 1.25x.
- **Controls & Input:**
  - Mouse Sensitivity slider (0.1 to 3.0).
  - Invert Y-Axis checkbox.
  - Reduced Motion (disables screen wobble / head bob).
- **Audio:**
  - Master Volume, Ambient Sound, UI Audio FX, Mute All.
- **Data Management:**
  - View total saved sessions in IndexedDB.
  - `Export Session Data (JSON)`
  - `Clear Local Database` (with confirmation modal).

---

### 3. State Management & Lifecycle

1. **Session Creation:** When scenario commences, a new `Session` record is generated with a unique UUID, scenario ID, timestamp, and seed.
2. **Deterministic Event Bus:** Simulation events are emitted to an internal event bus:
   - `OBJECT_SPAWNED`
   - `OBJECT_IN_SIGHT`
   - `TARGET_LOCKED`
   - `CLASSIFICATION_SUBMITTED`
   - `SESSION_PAUSED` / `SESSION_RESUMED`
   - `SESSION_COMPLETED`
3. **Assessment Calculation:** On completion, the session event stream is fed into the pure, deterministic `ScoringEngine`.
4. **Persistence Write:** Session and Score entities are written asynchronously to IndexedDB.
5. **View Transition:** State transitions to `/results` and enables immediate AAR analysis.
