# Product Requirements Document (PRD)
## Virtual Drone-Threat Training Simulator

**Document Status:** Approved MVP Specification  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`  
**Target Platforms:** Modern Web Browsers (Chrome/Edge/Firefox/Safari WebGL2) and Windows Desktop (via Tauri)  
**Primary Users:** Trainees, Instructors, Training Administrators  

---

### 1. Problem Statement
Traditional drone-threat training requires live equipment, dedicated outdoor locations, suitable weather conditions, extensive instructor supervision, and complex safety coordination. These constraints significantly limit training repetition, scenario diversity, and accessibility for routine practice.

### 2. Proposed Solution
A lightweight, high-fidelity software training simulator that delivers:
- Interactive 3D environments with responsive first-person navigation.
- Realistic simulated moving drone-like objects with parameterized flight paths (hover, patrol, reconnaissance trajectory, erratic vectors).
- Safe, non-operational observation and classification exercises (e.g., rotary quadcopter, fixed-wing reconnaissance, micro-UAV, decoy/commercial toy).
- Explainable, deterministic scoring based on detection latency, classification accuracy, and observation tracking.
- An After-Action Review (AAR) dashboard featuring timeline drilldowns and persistent session history via local IndexedDB storage.
- Adjustable graphics presets (Low / Medium / High) to accommodate lower-powered machines.

### 3. User Roles
- **Trainee:** Launches practice and graded scenarios, controls the observation camera/avatar, identifies and classifies aerial objects, and reviews after-action diagnostics.
- **Instructor:** Reviews session histories, audits assessment scores and timeline replays, and evaluates trainee classification accuracy.
- **Administrator:** Manages scenario definitions, graphics quality profiles, and local session data retention.
*(Note: MVP adopts guest/practice mode by default to enable immediate zero-friction offline execution).*

### 4. MVP Scope
1. **Welcome & Navigation Shell:** Welcome screen, main menu, scenario browser, settings, and session history viewer.
2. **Interactive 3D Environment:** Terrain with elevation contours, directional sun/sky lighting, horizon backdrop, ground grid/structures, foliage props, and realistic scale.
3. **First-Person Controls:** WASD movement, mouse-look camera with pointer lock, zoom binoculars mode, sprint, and pause toggle.
4. **Simulated Moving Drone Objects:** Scripted and randomized 3D drone models (multirotor, fixed-wing, micro-drone) with visual signatures (propeller rotation, navigation beacons, altitude flight paths).
5. **Observation & Classification Mechanics:** Crosshair target acquisition, range estimation, HUD classification selector, confidence tagging, and detection timestamp recording.
6. **Deterministic Scoring Engine:** Rule-based algorithm combining detection latency, classification correctness, false positive penalties, and tracking stability.
7. **Results & AAR Dashboard:** Final score breakdown (0–100%), event timeline log, side-by-side ground truth comparison, and constructive feedback pointers.
8. **Local Persistence:** Full session records, events, scores, and preferences persisted across reloads via browser IndexedDB.
9. **Performance & Graphics Settings:** Preset toggles (Low, Medium, High), resolution scaling, sensitivity controls, audio volume, and reduced motion option.
10. **Automated Testing & Desktop Packaging:** Vitest unit test suite for simulation and scoring rules, plus Tauri packaging configuration.

### 5. Out of Scope for MVP
- Live drone hardware telemetry, radio link interception, or remote control.
- Kinetic weapon engagement, live-fire firing solutions, or tactical counter-UAS targeting instructions.
- Real-world tactical rules of engagement or combat doctrine.
- Real-time multi-user network synchronization.
- Mandatory VR headsets (can be added as an optional WebXR layer post-MVP).
- Cloud identity provider or remote cloud database dependency.

### 6. User Stories
- **US-01 (Trainee):** As a trainee, I want to launch a training scenario within seconds so I can rapidly repeat exercises without tedious setup.
- **US-02 (Trainee):** As a trainee, I want an intuitive 3D camera with binocular zoom and clear HUD indicators so I can spot and classify distant aerial threats.
- **US-03 (Trainee):** As a trainee, I want an explainable score and feedback report showing exactly when I detected each drone and whether my classification was correct.
- **US-04 (Instructor):** As an instructor, I want to inspect a trainee's AAR event timeline to identify observation delays and classification errors.
- **US-05 (Low-spec User):** As a user on integrated graphics, I want adjustable graphics presets so the simulation runs smoothly at 30+ FPS.
- **US-06 (User):** As a user, I want my session logs and highest scores stored locally so my progress is preserved across browser sessions.

### 7. Functional Requirements
- **FR-01 Launch & Navigation:** Seamless route transitions across Welcome, Main Menu, Scenarios, Briefing, Simulation, Results, AAR, and Settings.
- **FR-02 3D Scene Rendering:** Three.js scene featuring layered terrain, skybox/dome, directional lighting, atmospheric fog, and reference environmental structures.
- **FR-03 Camera & Controls:** Dual-mode controls (FPS walk + Binocular observation look), mouse sensitivity adjustment, ESC pause trigger.
- **FR-04 Scenario Config:** Declarative JSON/TypeScript scenario definitions containing duration, environmental conditions, drone flight schedules, and ground-truth metadata.
- **FR-05 Simulated Aerial Objects:** Multiple drone types moving along spline/waypoint trajectories with altitude variations, speed tiers, and distinct visual signatures.
- **FR-06 Detection & Classification:** Interactive classification tool allowing the user to select classification class (e.g. Surveillance Quadcopter, Fast Recon Wing, Micro Drone, Commercial Toy) with instant timestamping.
- **FR-07 Deterministic Scoring:** Versioned mathematical formula computing normalized scores with zero randomness in the evaluator.
- **FR-08 AAR Timeline:** Chronological visual timeline plotting object appearance, trainee detection point, classification event, and ground truth.
- **FR-09 Session History:** Filterable historical log table displaying date, scenario name, difficulty, score, and AAR drilldown link.
- **FR-10 Difficulty Presets:** Beginner (slower drones, closer distance, clear day), Intermediate (higher speed, varying altitudes), Advanced (low visibility dusk/fog, multiple fast targets).
- **FR-11 Seeded Randomization:** Seed-controlled scenario variations enabling reproducible randomized runs.
- **FR-12 Persistence:** IndexedDB storage adapter storing users, scenarios, sessions, events, scores, and settings.
- **FR-13 Desktop Readiness:** Tauri configuration and build scripts for packaging into a standalone Windows binary.
- **FR-14 Accessibility:** High-contrast text overlays, readable typography, keyboard navigation, and reduced motion mode.

### 8. Non-Functional Requirements
- **Target Frame Rate:** 60 FPS on mid-range hardware; minimum stable 30 FPS fallback on Low settings.
- **Zero Server Dependency:** Fully functional offline in standalone client mode.
- **Modular Decoupling:** Scoring engine and scenario state machine must be strictly independent of Three.js rendering and DOM APIs.
- **Startup Latency:** Simulation initializes in < 2 seconds.

### 9. Assumptions and Decisions
1. **Offline Guest Mode First:** User accounts default to local "Trainee Guest" profile; no remote authentication server required for MVP.
2. **Safety Disclaimer:** The simulator is strictly for visual recognition training and explicitly displays non-operational disclaimers on briefing and HUD.
3. **Tauri Windows Build:** Tauri v2 configuration included. Compilation requires local Rust/Cargo toolchain; browser build runs anywhere immediately.
