# Implementation & Execution Plan (IMPLEMENTATION_PLAN)
## Virtual Drone-Threat Training Simulator

**Document Status:** Active Execution Roadmap  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`

---

### Phase 0: Foundation & Core Scaffolding
- [x] Review source specification `virtual_drone_threat_training_simulator.md`.
- [ ] Initialize Vite + React + TypeScript project with strict configuration.
- [ ] Install dependencies (`three`, `@types/three`, `lucide-react` for icons, `vitest` for test runner).
- [ ] Establish architecture directory tree matching `AGENTS.md`:
  - `src/app/`: Navigation and view routers.
  - `src/components/`: Reusable UI elements (Buttons, Badges, Modals, Sliders).
  - `src/game/engine/`: Three.js renderer, lighting, post-processing, camera controller.
  - `src/game/scenes/`: Procedural terrain, sky, structures, props.
  - `src/game/scenarios/`: Scenario configurations, drone path interpolators.
  - `src/game/assessment/`: Raycasting, target tracking, deterministic scoring engine.
  - `src/features/training/`: Simulation HUD, Reticle, Classification modal.
  - `src/features/reports/`: Results summary, AAR timeline view.
  - `src/features/settings/`: Graphics, audio, controls, database management.
  - `src/data/`: IndexedDB storage adapter, types, default seeds.
  - `src/styles/`: Design tokens, tactical styling, reset.
  - `tests/`: Scoring and scenario unit test suites.
- [ ] Create initial Vitest smoke test and verify `npm test` and `npm run build`.

### Phase 1: UI Shell & Navigation State Machine
- [ ] Implement responsive application navigation router (`Welcome` -> `MainMenu` -> `ScenarioSelect` -> `Briefing` -> `Simulation` -> `Results` -> `AAR` -> `Settings`).
- [ ] Create design token system in `src/styles/theme.css` with tactical slate/mint theme.
- [ ] Build Welcome / Splash screen with system check diagnostics.
- [ ] Build Main Menu with training launcher, history link, settings link.
- [ ] Build Scenario Selection screen with 3 curated scenario configurations:
  - *Border Outpost Perimeter* (Daylight, Beginner, Rotary & Fixed-wing targets)
  - *Urban Rooftop Surveillance* (Dusk, Intermediate, Micro-UAV & Rotary targets)
  - *Foggy Valley Intercept* (Adverse Fog, Advanced, High-speed & Decoy targets)
- [ ] Build Mission Briefing screen with aerial target recognition silhouettes and control schematics.

### Phase 2: Interactive 3D Environment & Controls
- [ ] Build Three.js core renderer with resize observer and WebGL2 capabilities.
- [ ] Implement procedural terrain generator with elevation variance and material texturing.
- [ ] Implement dynamic skybox with sun/moon positioning, ambient fog, and horizon atmosphere.
- [ ] Add environmental structures (watchtower, observation deck, perimeter fences, radar mast).
- [ ] Build responsive First-Person Controller:
  - WASD translation with collision clamping.
  - Mouse-look with pointer lock.
  - Binocular Zoom mode (Smooth FOV 75° -> 25° with optical reticle overlay).
- [ ] Add graphics presets (`Low`, `Medium`, `High`) controlling shadow maps, resolution scaling, and foliage density.

### Phase 3: Scenario Engine & 3D Aerial Drone Models
- [ ] Build 3D Drone procedural meshes:
  - **Quadcopter:** Central body, 4 arms, spinning rotor blades, blinking navigational strobe.
  - **Fixed-Wing Recon UAV:** Sleek fuselage, swept delta wings, rear pusher propeller.
  - **Micro-UAV:** Compact nano-frame with dual counter-rotating micro blades.
  - **Civilian Toy / Decoy:** Bright commercial color scheme, distinct twin-boom structure.
- [ ] Implement spline-based flight path interpolator with altitude changes, banking angles, and realistic velocities.
- [ ] Implement Scenario Lifecycle State Machine (`START`, `RUNNING`, `PAUSED`, `COMPLETED`, `ABORTED`).

### Phase 4: Assessment & Scoring Engine
- [ ] Implement camera raycast target acquisition system to detect when trainee looks at drone.
- [ ] Implement Tactical Classification Drawer with quick keyboard triggers (`1-4` or mouse click).
- [ ] Implement audio feedback synthesizer using Web Audio API for locks, clicks, and alarms.
- [ ] Implement `ScoringEngine` (`v1.0.0`):
  - Latency score (reaction time from drone visibility).
  - Accuracy score (ground truth match vs classification).
  - Visual tracking duration score.
  - False alarm penalty for non-target acquisitions.
- [ ] Write comprehensive Vitest test suite for scoring edge cases (perfect run, delayed detection, wrong classification, missed targets).

### Phase 5: AAR Dashboard & IndexedDB Persistence
- [ ] Build `IndexedDbStorageAdapter` utilizing native IndexedDB with auto-migrating stores.
- [ ] Save completed sessions, event streams, and computed score records.
- [ ] Build Results Summary view with pass/fail evaluation and score breakdown bars.
- [ ] Build interactive After-Action Review (AAR) view:
  - Chronological timeline scrubber with interactive event pins.
  - Target analysis table (Actual vs Reported).
  - Automated diagnostic feedback recommendations.
- [ ] Build Session History view with past attempts, replayable AAR viewer, and database clear action.

### Phase 6: Desktop Packaging (Tauri v2)
- [ ] Add Tauri configuration files (`src-tauri/tauri.conf.json`, `Cargo.toml`).
- [ ] Verify build compatibility and package scripts in `package.json`.
- [ ] Document desktop compilation requirements (Rust/Cargo on Windows).

### Phase 7: QA, Polish & Delivery
- [ ] Run test suite (`npm run test`) and typechecker (`npm run typecheck`).
- [ ] Validate browser flow end-to-end (start -> scan -> classify -> score -> AAR -> history).
- [ ] Update `PROGRESS.md` with verified evidence and results.
