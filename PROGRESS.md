# Project Progress Tracker (PROGRESS)
## Virtual Drone-Threat Training Simulator

**Current Status:** Fully Verified in Browser & Production Ready  
**Last Updated:** Phase 8 Live Browser Verification & QA  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`

---

### Milestone Matrix

| Milestone | Status | Evidence Required | Verification State |
|---|---|---|---|
| **1. Requirements & Architecture** | **COMPLETED** | PRD, APP_FLOW, TECH_STACK, DB_BACKEND, FRONTEND_GUIDELINES, IMPLEMENTATION_PLAN, AGENTS, PROGRESS | All 8 planning documents generated & verified against specification. |
| **2. Repository & Foundation** | **COMPLETED** | Vite/React/TS app created, dependencies installed, strict typecheck & test passes | Node v22.15.0, React 18, Three.js, Lucide, Vitest initialized. Strict TypeScript compiles with 0 errors. |
| **3. UI Shell & Navigation** | **COMPLETED** | Welcome, Main Menu, Scenario Select, Briefing, Settings navigable | Full responsive state machine implemented in `App.tsx` with tactical slate/mint theme. |
| **4. First 3D Environment** | **COMPLETED** | Three.js scene, terrain, sky, lighting, FPS controls, binocular zoom | Procedural heightmap terrain, lighting, observation post, first-person WASD controls, 3.2x binocular zoom with lens vignette. |
| **5. Scenario Engine & 3D Drones** | **COMPLETED** | Quadcopter, Fixed-wing, Micro-UAV, Toy models with flight paths | Procedural 3D models with spinning rotors and strobe beacons. Waypoint flight path interpolation engine implemented. |
| **6. Assessment & Scoring Engine** | **COMPLETED** | Observation raycast, classification modal, deterministic scoring tests | Raycast angular target acquisition, classification drawer with hotkeys 1-4, pure deterministic scoring v1.0.0. Real session scored 79.1/100 (Qualified). |
| **7. AAR Dashboard & Persistence** | **COMPLETED** | IndexedDB storage, session logs, interactive timeline scrubber | `IndexedDbStorageAdapter` with auto-migrated stores. Results screen and interactive AAR timeline dashboard fully operational with persistent storage verified across hard browser reloads. |
| **8. Desktop Package (Tauri v2)** | **CONFIGURED** | Tauri config created, desktop compilation instructions | `src-tauri/tauri.conf.json`, `Cargo.toml`, and `src/main.rs` created. Native binary build requires local Rust/Cargo installation. |
| **9. End-to-End Live Browser QA** | **COMPLETED** | Complete flow validated in real Chromium browser with 13 screenshot artifacts, 0 console errors, 0 failed requests | 100% automated browser verification covering all screens, input controls, zoom, pause/resume, classification submit, results breakdown, AAR scrubber, history persistence across hard reload, and settings. |
| **10. Visual Quality & Environmental Fidelity Upgrade** | **COMPLETED** | Believable Three.js environments, detailed tactical props, high-fidelity drone silhouettes, aerodynamic banking, smoothed camera, mil-dot optics HUD, dynamic graphics presets | ACESFilmicToneMapping, multi-octave vertex-colored terrain, distant horizon mountain rings, fortified observation deck with comms tower, radar dome, sandbags, Pelican crates, and illuminated pylons. Custom 3D drone models with spinning rotor blur discs, strobes, and aerodynamic banking. Precision SVG binocular reticle with mil-dot stadia ticks and range ladder. 100% verified in tests & browser. |
| **11. Aiming Sensitivity, Interaction Speed & Responsive Layouts** | **COMPLETED** | Smooth framerate-independent mouse-look, exponential damping, blur/pause state synchronization, classification deduplication & visual feedback, 100dvh mobile/tablet/desktop layouts, zero per-frame Vector3 allocations | Calibrated base sensitivity (0.00135) and fine binocular zoom (0.22). Exponential damping `1.0 - Math.exp(-26.0 * dt)`. `tests/camera_fps.test.ts` confirms identical convergence across 30, 60, and 144 FPS. Mutex submission guard & `e.repeat` block. Paced 3s mission completion countdown. Viewport tests verify 1440x900, 1280x800, 768x1024, 390x844, and 80%/125% zoom. 11/11 tests pass. |
| **12. Critical Bug Fix Sprint: Aiming Precision, 5-Viewport Responsive Layout, Deliberate Timing** | **COMPLETED** | Precision mouse look (48.0 damping rate, 0.00085 base sensitivity, live slider in pause menu), responsive layout across 5 standard viewports (1920x1080, 1366x768, 1024x768, 768x1024, 390x844), removal of auto-advance timers, configurable observation pacing (standard/extended/relaxed), target expiry warnings, explicit exercise debrief modal | Fully resolved all 3 critical issues. 15/15 unit & integration tests pass (`npm test`). Strict type check passes (`npm run typecheck`, 0 errors). Production build passes (`npm run build`). Real Chrome browser test validates complete 10-step flow (0 console errors, 0 failed requests). Responsive suite verifies 5 viewports with 0 horizontal overflow. |
| **13. Localhost Blank Screen Fix & Origin Hardening** | **COMPLETED** | Root cause diagnosed (secure context origin service worker/cache interference on localhost, unhandled IDB `onblocked` lockouts, unvalidated legacy settings `.toFixed()` crashes), React `ErrorBoundary` mounted in `main.tsx`, origin cleanup script in `index.html`, `vite.config.ts` CORS & cache control headers, safe fallback sanitization | Diagnosed root cause why `localhost:5173` showed blank screen while `127.0.0.1` and LAN worked. Safe non-destructive fix implemented without wiping user data. Verified with Playwright across all 3 URLs: `http://localhost:5173/`, `http://127.0.0.1:5173/`, `http://172.29.219.240:5173/` (All HTTP 200, length 6297, 0 errors). |
| **14. Customizable PC Game Key Bindings System** | **COMPLETED** | Centralized `inputManager`, Settings → Controls / Key Bindings UI matching tactical theme, key-capture modal ("Press any key..."), conflict warning/resolution modal (Replace vs Cancel), individual reset, reset all to defaults, typing input guard, persistence via `StorageAdapter`, Vitest test suite | 14 actual simulation actions supported across 4 tactical categories. Seamless integration across `CameraController`, `SimulationScreen`, `ClassificationDrawer`, `BriefingScreen`, and `SettingsScreen`. All 27 unit/integration tests pass. Type check and build 100% clean. |
| **15. Hybrid AI AAR Assistant & Deterministic Insights** | **COMPLETED** | Pure deterministic insights engine v1.0.0, AI explanation provider boundary, schema validator, local rule engine + remote provider, AAR dashboard UI integration, StorageAdapter persistence, 46/46 tests pass | Fully verified. Grounded metrics, response-time ranges, trigger discipline, archetype breakdowns, and historical trend comparison. Local deterministic fallback ensures zero AAR crashes. Type check and production build 100% clean. |

---

### Live Browser Verification Evidence (Chrome v140+ / Playwright)

An end-to-end browser test script (`tests/browser_verification.mjs`) ran against `http://localhost:5173/` in real Chrome, validating all 10 stages of the trainee journey and saving screenshot artifacts to `tests/screenshots/`:

1. **Welcome Screen (`01_welcome_screen.png`):**
   - Header: "Virtual Drone-Threat Training Simulator".
   - Non-operational disclaimer banner clearly rendered with zero kinetic/weapon capabilities.
   - Click "ENTER TRAINING FACILITY" transitions to Main Menu.
2. **Main Menu (`02_main_menu.png`):**
   - Navigation options: Start Training, Training Scenarios, Threat Recognition Dossier, Session History, Settings.
   - Tested "RECOGNITION DOSSIER" modal (`02b_recognition_dossier_modal.png`): opens 4 drone archetype profiles (Quadcopter, Fixed-Wing, Micro-UAV, Civilian Toy) with optical signatures, threat levels, and visual markers. Closes cleanly.
3. **Scenario Selection (`03_scenario_select.png`):**
   - Renders 3 scenario cards: OP-VANGUARD (Desert Outpost), OP-SKYLINE (Urban Rooftop), OP-MIST (Foggy Valley).
   - Tested difficulty filter pills (All, Beginner, Intermediate, Advanced).
4. **Mission Briefing (`04_briefing_screen.png`):**
   - Selected OP-VANGUARD: shows codename, operational context, airspace rules of engagement, 3 target profiles, environmental conditions, and keyboard/mouse control summary.
5. **3D Simulation Viewport (`05_simulation_zoom_mode.png`, `06_simulation_paused.png`, `07_classification_drawer.png`, `08_simulation_in_progress.png`):**
   - WebGL Three.js canvas initialized cleanly with desert terrain, observation tower, sky gradient, and distant mountains.
   - HUD renders top telemetry (Codename, Time Elapsed, Contacts, Classification Count) and Compass Tape (Bearing and Pitch degrees).
   - **Binocular Zoom:** Tested toggle button & right mouse button: engages 3.2x optical zoom with circular SVG reticle and stadia ticks (`05_simulation_zoom_mode.png`).
   - **Pause / Resume:** Tested `Esc` key: freezes simulation time and physics, opens Tactical Pause Menu with Resume, Restart, and Abort buttons (`06_simulation_paused.png`). Resuming seamlessly unpauses.
   - **Controls & Mouse Look:** Verified WASD observation post movement, drag-to-look, and pointer lock.
   - **Target Acquisition & Classification:**
     - Target 1 (VULTURE-1) detected at T+4s; opened classification drawer (`07_classification_drawer.png`).
     - Selected archetype `[1] Rotary-Wing: Quadcopter Surveillance UAV`, confirmed confidence, submitted.
     - Telemetry updated to `CLASSIFIED: 1 / 3 CONTACTS`, and contact row showed green `✓ CLASSIFIED`.
     - Target 2 (SWIFT-2) spawned and classified as `[2] Fixed-Wing Reconnaissance UAV`.
     - Target 3 (MOSQUITO-3) spawned and classified as `[3] Micro-UAV (Nano Swarm Drone)`.
6. **Results Screen (`09_results_screen.png`):**
   - Score calculated deterministically using `v1.0.0` engine: **79.1 OUT OF 100 (QUALIFIED)**.
   - Classification accuracy: 50/50 PTS (all 3 correct).
   - Detection latency: 26.4/30 PTS (VULTURE-1: 4.9s, SWIFT-2: 1.2s, MOSQUITO-3: 1.0s).
   - Tracking coverage: 2.6/20 PTS.
   - Target audit table displays individual callsigns, ground truth, reported classification, latency, and points.
7. **After-Action Review (AAR) Dashboard (`10_aar_dashboard.png`):**
   - Chronological event timeline rendered 11 interactive event nodes (SESSION_START, TARGET_SPAWNED, TARGET_LOCK_ACQUIRED, CLASSIFICATION_SUBMITTED, SESSION_COMPLETED).
   - Clicked event nodes scrub event details, timestamps, and payload.
   - Ground Truth vs Trainee Action matrix compares all 3 target engagements.
   - Cognitive diagnostic recommendations list positive identification milestones.
   - Export AAR Data (JSON) button active.
8. **Session History & Data Persistence (`11_session_history.png`, `12_session_history_after_reload.png`):**
   - Navigated to Session History: displays completed session record with date, scenario, difficulty, score (79.1%), rating (QUALIFIED), and duration.
   - **Hard Browser Reload Test:** Browser reloaded completely (`page.reload()`). Verified IndexedDB record survived reload intact.
9. **Simulator Configuration (`13_settings_screen.png`):**
   - Configured graphics presets (Low, Balanced, High), resolution scale (0.5x - 1.5x), volume sliders, mouse sensitivity, inverted Y, field of view (60° - 100°), reduced motion toggle, and Storage Reset button.
10. **Console & Network Diagnostics:**
    - Total browser console errors: **0**
    - Total failed network/asset requests: **0**

---

### Visual Quality & Environmental Fidelity Upgrades (Milestone 10)

1. **Photometric Lighting & Atmosphere:**
   - Configured `ACESFilmicToneMapping` with `SRGBColorSpace` for natural contrast and highlight roll-off.
   - Procedural hemispheric atmospheric bounce lighting calibrated per biome (`desert_outpost`, `urban_rooftop`, `foggy_valley`).
   - Procedural celestial dome with radial sky gradients and bright solar corona disc.
   - Calibrated exponential atmospheric fog creating natural depth fading.

2. **Terrain Depth & Distant Horizon Scale:**
   - Multi-octave sinusoidal elevation terrain mesh with elevation-based vertex coloring (darker depressions, sun-warmed plateau peaks).
   - Distant horizon mountain silhouette ring (~340m radius, 120 segments) grounding the visual scale and eliminating floating-world edges.

3. **Detailed Observation Post Props & Tactical Fortifications:**
   - Steel treadplate observation platform with ballistic embrasure walls and heavy safety railings.
   - Tripod sighting pedestal with dual-aperture optical binocular head.
   - Communications terminal with illuminated status displays and blinking green power LEDs.
   - Heavy communications lattice tower with dipole antenna bars and blinking red FAA-standard aviation warning beacon.
   - Weather/early-warning radar dome with elevated mounting ring.
   - Sandbag revetments, tactical Pelican equipment crates, and illuminated perimeter boundary pylons with night warning beacons.

4. **Realistic 3D Drone Models & Natural Aerodynamic Flight:**
   - **Rotary Quadcopter:** Tapered composite body, avionics pod dome, 4 carbon booms with brushless motor bells, 4 semi-transparent spinning rotor blur discs, emerald-coated optical camera gimbal, tubular landing skids, port/starboard navigation LEDs, and high-frequency white anti-collision strobe.
   - **Fixed-Wing Reconnaissance UAV:** Aerodynamic tapered fuselage with canopy blister, delta wings with angled wingtip winglets, twin V-tail stabilizers, ventral EO/IR optical sensor ball, rear pusher motor with spinner and rotor blur disc, and dual wingtip LEDs.
   - **Micro-UAV (Nano Swarm Drone):** Compact nano cylinder pod with optical sensor glass, counter-rotating coaxial dual micro rotor discs, blinking nano strobe, and high-frequency turbulence gust wobble.
   - **Civilian Toy Quadcopter:** Rounded consumer casing with canopy stripe, dual protective propeller duct bumper rings, and alternating novelty blue/yellow LEDs.
   - **Aerodynamic Flight Dynamics:** Added dynamic banking roll (up to ~24°) into turns calculated from waypoint yaw rate, eliminating rigid robotic heading snaps.

5. **Smooth First-Person Camera Movement:**
   - Inertial mouse look smoothing with exponential damping for fluid, military-grade optics panning.
   - Subtle procedural idle/breathing sway on the observation deck.
   - Unconstrained WASD movement across the observation deck in both pointer-lock and drag-to-look modes.
   - Smooth optical binocular FOV zoom transition (default 75° to 24°).
   - Instant response without damping when `reducedMotion` is toggled.

6. **Precision Tactical HUD & Reticle:**
   - Tactical central reticle with SVG crosshairs, center aiming pip, and dynamic animated corner lock brackets (`┌ ┐ └ ┘`).
   - In-world 3D contact markers with callsign tags and range badges (`VULTURE-1 [54m]`).
   - Military binocular overlay with milliradian stadia tick marks, vertical elevation ladder, and stadiametric rangefinder curve.
   - Clean telemetry cards, active contact radar list, and keyboard control legend.

7. **Tactical Design System & Component Consistency:**
   - Refined theme tokens with high-contrast tactical palette (deep slate `#060b10`, cyan accent `#00f0ff`, mint `#00ff9d`, amber `#ffb703`, coral `#ff4d6d`).
   - Accessible keyboard focus rings (`:focus-visible`).
   - Dynamic graphics presets (Low, Medium, High) that adjust shadow map resolution, antialiasing, and pixel ratio.
   - Smooth hover micro-animations, animated status indicator dots, and glowing circular score gauge on Results screen.

---

### Issues Fixed During Verification

1. **Pointer Lock Interception on HUD Elements:**
   - *Problem:* When returning from pause or submitting classifications, automatic pointer-lock capture caused `<canvas>` to intercept mouse clicks on UI elements in certain browser environments.
   - *Fix:* Camera controller was upgraded to support dual-mode camera control: drag-to-look (left-click drag) without requiring pointer lock, plus voluntary pointer lock on direct canvas click. Removed aggressive automatic pointer lock calls on pause resume and classification submit.
2. **React Re-render Rate & DOM Detachment:**
   - *Problem:* Updating React state on every Three.js render frame (60 FPS) churned the React DOM tree and caused input elements to detach during user interaction.
   - *Fix:* Throttled React HUD state updates to ~15-20 FPS (every 65ms) while keeping Three.js rendering at a smooth 60 FPS.
3. **Session Completion Idempotency & Paced Endings:**
   - *Problem:* If `scenarioEngine.isCompleted` triggered during high-frequency frame ticks, multiple session save attempts could occur. Additionally, the simulation previously advanced abruptly within 500ms without time to review target completions.
   - *Fix:* Added `isFinishingRef` guard in `SimulationScreen.tsx` ensuring `handleCompleteSession` executes strictly once. Replaced abrupt end with a 3.0-second completion banner countdown and `[PROCEED TO RESULTS NOW →]` button.
4. **Aiming Sensitivity & Framerate-Dependent Jitter:**
   - *Problem:* Base mouse sensitivity (0.0022) and zoom multiplier (0.35) were overly twitchy when tracking distant drone targets. Frame-rate dependent lerp caused inconsistent look speed between low and high refresh rates. Keys could stick when the window lost focus.
   - *Fix:* Calibrated base sensitivity to 0.00135 and binocular zoom sensitivity to 0.22. Implemented framerate-independent exponential damping `1.0 - Math.exp(-26.0 * deltaSec)`. Added `resetInput()` and window `blur` / `visibilitychange` listeners to clear stuck keys. Added `setPaused(isPaused)` to freeze camera look and eliminate camera jumps upon resume. Formally verified identical convergence across 30, 60, and 144 FPS in `tests/camera_fps.test.ts`.
5. **Accidental Duplicate Submissions & Keyboard Repeat:**
   - *Problem:* Trainees pressing classification hotkeys repeatedly could emit duplicate score events for the same drone contact, inflating penalty calculations.
   - *Fix:* Added `isSubmitting` mutex state in `ClassificationDrawer.tsx`, checked `e.repeat` to prevent auto-repeating hotkeys, added a visual feedback badge (`feedbackStatus: 'accepted'`) before closing, and enforced target deduplication via `classifiedTargetIds.has(targetId)`.
6. **Per-Frame Garbage Collector Pressure in TargetTracker:**
   - *Problem:* `TargetTracker.evaluate()` created 4 `THREE.Vector3` objects on every animation frame for every active drone.
   - *Fix:* Pre-allocated reusable scratchpad vectors (`camDir`, `toDrone`, `dirToDrone`, `projected`) on class instance, eliminating per-frame allocations.
7. **Cross-Device Layout Ratios & Mobile/Tablet Responsiveness:**
   - *Problem:* Fixed-pixel headers and standard `100vh` caused vertical overflow and iOS Safari URL bar clipping.
   - *Fix:* Updated layout shell and screens to `100dvh`, added `minmax(min(100%, ...), 1fr)` flexible grid templates, dynamic compass tape sizing, and table horizontal scroll containers. Verified across Desktop (1440x900), Laptop (1280x800), Tablet (768x1024), Mobile (390x844), and 80%/125% zoom levels with 26 screenshot artifacts.

---

### Critical Bug Fix Sprint — Root Causes & Fixes Implemented

#### 1. Mouse Aiming: Precision, Low Latency & Controllability
- **Root Cause:**
  - Base sensitivity (`0.00135`) combined with a damping rate of `26.0` (`1.0 - Math.exp(-26.0 * dt)`) left ~65% of angular error unresolved per frame at 60 FPS, introducing an artificial ~100ms lag/sluggish feeling. Trainees would keep moving the mouse to compensate, resulting in overshoot and erratic camera snapping.
  - In addition, browsers firing an initial delta spike upon pointer-lock acquisition caused the camera to snap. Releasing the mouse drag outside the canvas failed to reset `isMouseDown` because `mouseup` was bound to `domElement` instead of `window`.
- **Fixes Implemented:**
  - Calibrated base horizontal/vertical sensitivity from `0.00135` down to `0.00085`.
  - Tuned binocular optical zoom sensitivity factor to `0.30`.
  - Increased exponential damping rate from `26.0` to `48.0` (`1.0 - Math.exp(-48.0 * deltaSec)`). This retains full framerate independence (tested at 30, 60, and 144 FPS) while eliminating perceptible input delay (<25ms convergence).
  - Attached `mouseup` listener to `window` rather than `domElement`, guaranteeing drag release cleanup.
  - Added `justLocked` flag guarding against initial pointer-lock delta jumps.
  - Added live Mouse Sensitivity adjustment slider (0.1x to 3.0x in 0.05 increments) directly in the Tactical Pause Menu and Settings screen, dynamically synchronizing to the active camera controller without needing a restart.
  - Synchronized `targetEuler.copy(this.euler)` on pause and resume, preventing accumulated angular jumps.

#### 2. Responsive Layout System & 5 Viewports
- **Root Cause:**
  - Top HUD container used fixed flexbox with `justify-content: space-between` across a wide row, causing the 280px telemetry card, center compass tape (180px–320px), and quick buttons to collide and overflow on screens narrower than 860px.
  - Application root used `100vw` / `100vh` rather than `100%` and `100dvh`, causing scrollbars and mobile address bar clipping.
  - Inner grids in `MainMenuScreen`, `ClassificationDrawer`, `ResultsScreen`, and `BriefingScreen` lacked `min-width: 0` constraints or used rigid `repeat(2, 1fr)` and `minmax(340px, 1fr)` columns that clipped on 390px mobile viewports.
- **Fixes Implemented:**
  - Converted application shell and all screens to `100%` width and `100dvh` height with `overflow: hidden`.
  - Added responsive CSS Grid layout for `.simulation-hud-top-bar` below 860px breakpoint: compass centers at top, tactical buttons sit at top-right, and telemetry card wraps below without colliding.
  - Hid desktop keyboard hints (`.hud-controls-hint`) on screens under 768px.
  - Converted grids to flexible templates: `minmax(min(100%, 250px), 1fr)` and `minmax(min(100%, 180px), 1fr)`.
  - Added `flex-wrap: wrap` and minimum width bounds to navigation buttons in `ResultsScreen`, `AARDashboardScreen`, and `BriefingScreen`.
  - Fully tested and verified with zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`) across all 5 target viewports: **1920×1080**, **1366×768**, **1024×768**, **768×1024**, and **390×844**, as well as 80% and 125% zoom levels.

#### 3. Classification Timer, Pacing & Deliberate Trainee Flow
- **Root Cause:**
  - `SimulationScreen.tsx` previously ran an automatic 3-second countdown upon scenario target completion and immediately transitioned to the Results screen without trainee confirmation.
  - Target transit windows were hardcoded to standard timing, giving trainees little time to observe visual markers on fast fixed-wing contacts.
  - Active targets lacked visual warnings before departing the observation airspace.
- **Fixes Implemented:**
  - Removed all automatic completion navigation.
  - Implemented an explicit **Exercise Airspace Engagement Debrief Modal** that displays classified vs missed target tallies and requires the trainee to explicitly click `[PROCEED TO AFTER-ACTION RESULTS →]`.
  - Added active target lifetime expiry warnings (`⚠️ EXITING: Xs` when despawn time <= 6s) in both 3D markers and the active contact HUD list.
  - Added configurable **Target Observation Window Pacing** (`standard` 1.0x, `extended` 1.35x, `relaxed` 1.7x) in `ScenarioEngine.ts` and `SettingsScreen.tsx`.
  - Added unit test suite `tests/timing_and_classification.test.ts` verifying timer freeze on pause, resumption accuracy, pacing multiplier scaling, duplicate submission rejection, and ground-truth missed target recording.

---

### Root Cause Analysis: Localhost Blank Screen (Task 1)

1. **Origin-Scoped Service Worker & Cache Interception:**
   - Browsers (Chromium/Firefox) treat `http://localhost:5173` as a *Trustworthy / Secure Context* (`isSecureContext === true`), which allows Service Workers and CacheStorage to run and persist indefinitely across different projects previously tested on port 5173.
   - Raw IP addresses like `http://127.0.0.1:5173/` and LAN IP `http://172.29.219.240:5173/` are often not granted the same origin-scoped Service Worker scope by browser engines, bypassing stale interceptors. A stale service worker or cache from another project intercepted `localhost:5173` asset script requests, failing silently.
2. **Missing Top-Level Error Boundary:**
   - Any runtime initialization error caused React 18 to completely unmount the DOM tree into an unrendered blank white page with no visual recovery UI.
3. **Storage Sanitization & IndexedDB Lockout:**
   - Legacy stored settings or unhandled IndexedDB `onblocked` events when multiple tabs or connections were opened caused unhandled storage initialization promises to hang indefinitely.
   - Accessing undefined properties (like `mouseSensitivity.toFixed(2)`) on unvalidated settings objects would crash component rendering without fallback defaults.

**Smallest Safe Non-Destructive Fixes Applied:**
- Created `src/components/ErrorBoundary.tsx` and wrapped `<App />` in `src/main.tsx` with a tactical recovery UI and self-healing diagnostic options.
- Added self-healing script in `index.html` to unregister foreign service workers and clean stale caches on page load.
- Added explicit `cors: true` and `Cache-Control: no-cache, no-store, must-revalidate` response headers in `vite.config.ts`.
- Added robust `sanitizeUserSettings()` in `src/data/indexedDbAdapter.ts` with complete type guards and fallbacks.
- Added a 1200ms failsafe timeout to `storage.init()` and handled `onblocked` states, ensuring the database opens or falls back gracefully without ever stalling React startup.
- Did **not** clear existing user settings or session history.

---

### Customizable PC Game Controls System (Task 2)

1. **Centralized Input Manager (`src/services/inputManager.ts`):**
   - Singleton `inputManager` manages all 14 actual simulation actions:
     - **Movement:** `moveForward` (W), `moveBackward` (S), `moveLeft` (A), `moveRight` (D)
     - **Optics & Targeting:** `toggleZoom` (ShiftLeft), `triggerClassification` (Space)
     - **Threat Classification:** `selectArchetype1` (1), `selectArchetype2` (2), `selectArchetype3` (3), `selectArchetype4` (4), `submitClassification` (Enter), `cancelDrawer` (Escape)
     - **Simulation & Interface:** `pauseSimulation` (Escape), `toggleMute` (M)
   - Normalized key display (`formatKeyDisplay`) converting raw codes (`KeyW`, `ShiftLeft`, `Digit1`) into clean PC labels (`W`, `L-SHIFT`, `1`, etc.).
   - Conflict detection (`findConflict`) with explicit contextual coexistence (e.g., `Escape` shared safely between `cancelDrawer` when drawer is open and `pauseSimulation` when in free gameplay).
   - Conflict resolution (`resolveConflictAndBind`) supporting Replace or Cancel.
   - Typing input isolation (`isInputElement`) preventing accidental gameplay actions while typing in text inputs or dialogs.
   - Subscriptions to broadcast binding updates to active components.

2. **Controls Menu UI (`src/features/settings/ControlsSettingsPanel.tsx` & `SettingsScreen.tsx`):**
   - Polished responsive screen matching tactical theme (`tactical-panel`, `--color-accent-mint`).
   - Grouped into 4 tactical categories: Observation Post Movement, Optics & Reticle Targeting, Threat Classification, Simulation & System Controls.
   - Each action displays action name, tactical description, current key badge button, "REBIND" button, and single-action "RESET" button (visible when customized).
   - Key-capture state modal: "PRESS ANY KEY TO BIND", displaying target action, waiting for keyboard input, with `Escape` to cancel.
   - Conflict Warning Modal: warns when a proposed key is already bound to another action, offering "REPLACE EXISTING" or "CANCEL".
   - "RESET ALL TO DEFAULTS" button restoring default key bindings without resetting graphics, volume, or mouse sensitivity.
   - Clear feedback notification toasts when bindings are updated or reset.

3. **Gameplay Wiring:**
   - `CameraController.ts`: refactored `onKeyDown`, `onKeyUp`, and `resetInput` to query `inputManager` for movement and zoom actions.
   - `SimulationScreen.tsx`: refactored pause, classification trigger, and audio mute hotkeys to use `inputManager.matchesAction`, and updated the HUD controls overlay to dynamically display currently bound keys.
   - `ClassificationDrawer.tsx`: refactored archetype selection hotkeys (`1`–`4`), submit (`Enter`), and dismiss (`Escape`) to use `inputManager`, dynamically updating archetype badges and button labels.
   - `BriefingScreen.tsx`: dynamically renders current user-configured key bindings in the Pre-Simulation Controls Reference dossier card.
   - `App.tsx` & `StorageAdapter`: seamlessly synchronizes keybindings on startup, settings updates, and persists them to IndexedDB.

---

### Hybrid AI After-Action Review (AAR) Assistant & Deterministic Insights Engine (Milestone 15)

1. **Codebase Audit Findings:**
   - **Architecture:** Client-side React 18 + TypeScript + Three.js application with optional Tauri v2 desktop shell. Zero existing remote backend services, API proxies, or hardcoded AI credentials exist.
   - **Persistence:** Local persistence via `StorageAdapter` (`IndexedDbStorageAdapter` with memory and local storage fallback). All session data is stored locally.
   - **Data Flow:** `ScenarioEngine` emits chronological `SimulationEvent`s → `handleCompleteSession` evaluates `TrainingScore` via `ScoringEngine.ts` (`v1.0.0`) → records saved to IndexedDB (`sessions`, `events`, `scores`) → `ResultsScreen` → `AARDashboardScreen`.
   - **Available Metrics:**
     - Ground truth targets from `ScenarioDefinition.targets` (id, callsign, threatClass, spawnTimeSec, despawnTimeSec, flightProfile).
     - Authoritative assessments from `TrainingScore.targetAssessments` (targetId, callsign, expectedClass, classifiedAs, isCorrect, detectionLatencySec, trackingDurationSec, scoreContribution).
     - Breakdown points: `detectionLatencyScore`, `classificationAccuracyScore`, `trackingCoverageScore`, `falseAlarmPenalty`.
     - Chronological event timeline (`SimulationEvent[]`).
     - Historical sessions from `storage.getAllSessions()` and `storage.getScore()`.

2. **Deterministic Insights Engine (`src/game/assessment/insightsEngine.ts`):**
   - **Pure Functional & Versioned (`v1.0.0`):** Same input strictly produces identical outputs. Completely decoupled from UI and WebGL rendering.
   - **Supported Metrics:**
     - Evaluated attempts, correct & incorrect classifications, and unattempted/missed targets.
     - Accurate classification accuracy percentage with safe-division guard (null when 0 attempts).
     - Airspace coverage percentage (`(totalTargets - unattempted) / totalTargets`).
     - Detection latency metrics: mean latency, fastest (min) latency, slowest (max) latency (or null when no targets evaluated).
     - False alarm count derived from penalties and unverified classification events.
     - Archetype recognition matrix across Rotary, Fixed-Wing, Nano/Micro, and Civilian Decoy profiles.
     - Historical comparison: score delta, prior attempt count, trend direction (`improving`, `declining`, `stable`, `insufficient_history`).
   - **Edge Case Robustness:** Zero targets in scenario, zero trainee attempts, abandoned/incomplete sessions, and missing latency values are safely handled without `NaN`, division-by-zero, or unhandled exceptions.
   - **Evidence Grounding:** Strengths, areas to improve, and practice drill recommendations only reference recorded, verified facts.

3. **AI Explanation Service Boundary (`src/services/aiAarService.ts`):**
   - **Provider Independence:** Defined `AiExplanationProvider` interface.
   - **Schema Validation (`validateAiExplanation`):** Enforces strict validation on `performanceSummary`, `whatWentWell`, `areasToImprove`, `recommendedPractice`, `dataLimitations`, `providerName`, `isAiGenerated`.
   - **Local Deterministic Provider (`LocalDeterministicExplanationProvider`):** Offline, zero-dependency, tactical natural language synthesis. Clearly labelled as `Rule-Based Expert Engine (Local Offline)` with `isAiGenerated = false`.
   - **Remote Provider Boundary (`RemoteAiExplanationProvider`):** Configurable via `VITE_AI_API_ENDPOINT` and `VITE_AI_API_KEY`. Enforces 8s timeout via `AbortController`, strictly minimal sanitized payloads (no raw freeform inputs), and seamless fallback on failure or unconfigured endpoint.
   - **Request Deduplication:** In-flight promise map prevents duplicate API calls from repeated clicks or React component re-renders.
   - **Authoritative Score Invariance:** Explanations are advisory and cannot alter the official mission score, breakdown, or classifications.

4. **Storage & Dashboard Integration:**
   - Upgraded `DB_VERSION` to 2 in `IndexedDbStorageAdapter` with auto-migrated `aar_insights` store and memory fallback.
   - Mounted `AiAarAssistantPanel` in `AARDashboardScreen.tsx`, featuring metrics ribbon, executive summary, strength cards, gap cards, practice drills, and data limitations.
   - Enriched JSON export with comprehensive AAR report and insights.
   - Fixed navigation in `App.tsx` so viewing historical AAR records returns to Session History rather than forcing results navigation.

5. **Files Added / Modified:**
   - `src/types/aarInsights.ts`: Complete TypeScript interfaces for insights, evidence, and AI explanations.
   - `src/types/index.ts`: Re-exported AAR insight models.
   - `src/game/assessment/insightsEngine.ts`: Pure functional deterministic insights engine (`v1.0.0`).
   - `src/services/aiAarService.ts`: AI service layer, schema validation, local & remote providers, and in-flight mutex.
   - `src/data/storageAdapter.ts`: Added `saveAarInsight` and `getAarInsight` methods.
   - `src/data/indexedDbAdapter.ts`: IndexedDB v2 schema migration and memory fallback storage for AAR reports.
   - `src/features/aar/AiAarAssistantPanel.tsx`: Responsive tactical UI component with telemetry ribbon and insight cards.
   - `src/features/aar/AARDashboardScreen.tsx`: Mounted assistant panel and enriched JSON export.
   - `src/app/App.tsx`: Contextual navigation returning back to History or Results.
   - `tests/insights_engine.test.ts`: 8 unit tests covering metrics, zero attempts, empty scenarios, false alarms, and trends.
   - `tests/ai_aar_service.test.ts`: 10 unit tests covering schema validation, local provider, fallback, and deduplication.
   - `tests/aar_integration.test.ts`: End-to-end integration test validating simulation, scoring, insights, and persistence.

---

### Verification Commands & Results

| Check | Command | Result |
|---|---|---|
| Unit & Integration Tests | `npm test` | **46/46 PASS** across 9 test suites (scoring, insights engine, AI service, AAR integration, controls, scenarios, e2e, camera, timing) |
| TypeScript Strict Check | `npm run typecheck` | **0 errors** (Strict mode) |
| Production Bundle Build | `npm run build` | **BUILT in 15.44s** (0 errors, `dist/` ready) |
| Insights Engine Tests | `vitest run tests/insights_engine.test.ts` | **8/8 PASS** (Accuracy, zero attempts, empty scenario, incomplete session, false alarms, archetype confusion, historical trends, baseline) |
| AI Service & Fallback Tests | `vitest run tests/ai_aar_service.test.ts` | **10/10 PASS** (Schema validator, local provider, mock provider, failure fallback, deduplication mutex, storage persistence, score invariance) |
| AAR End-to-End Integration | `vitest run tests/aar_integration.test.ts` | **1/1 PASS** (Full session simulation -> scoring -> insights -> persistence -> targeted historical review) |

---

### Known Environment Notes
- **Tauri Desktop Native Binary:** Tauri v2 configuration (`src-tauri/tauri.conf.json`, `Cargo.toml`, `src/main.rs`) is completely configured and ready. Building the native `.exe` binary requires installing Rust and Cargo on the host machine (`winget install Rustlang.Rustup`). The browser build (`dist/`) is 100% self-contained and functions out of the box.
- **Remote AI Integration:** Remote AI generation can be configured by supplying `VITE_AI_API_ENDPOINT` (and optionally `VITE_AI_API_KEY`) in an environment file or backend proxy. When unconfigured (default secure client mode), the simulator operates with the built-in deterministic rule engine with zero crashes and clear audit labeling.

