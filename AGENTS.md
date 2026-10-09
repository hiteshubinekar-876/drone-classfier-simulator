# Instructions for AI Coding Agents (AGENTS)
## Virtual Drone-Threat Training Simulator

**Document Status:** Active Engineering Policy  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`

---

### 1. Project Mission
Build a lightweight, highly immersive, non-operational Virtual Drone-Threat Training Simulator that runs smoothly in modern web browsers and can be packaged as a standalone Windows desktop executable.

### 2. Mandatory Engineering Rules
1. **Source of Truth:** Consult `PRD.md`, `APP_FLOW.md`, `TECH_STACK.md`, `DB_BACKEND.md`, and `FRONTEND_GUIDELINES.md` before making architectural modifications.
2. **Strict Type Safety:** Use TypeScript with strict mode enabled; avoid `any` types.
3. **Decoupled Architecture:** Simulation logic and scoring algorithms must be purely independent of Three.js rendering and React DOM lifecycle.
4. **Deterministic Scoring:** The scoring engine must be versioned (`v1.0.0`) and purely functional (identical inputs yield identical score breakdowns).
5. **Storage Abstraction:** All persistence must flow through `StorageAdapter` to maintain browser (IndexedDB) and desktop compatibility.
6. **WebGL Resource Lifecycle:** Explicitly dispose of Three.js geometries, materials, textures, requestAnimationFrame loops, and event listeners upon unmounting.
7. **Pause Integrity:** When the simulation is paused or navigated away from, cancel animation frames and freeze the simulation timer.
8. **No Placeholders:** Deliver fully implemented logic. Do not write placeholder mock scores, dead buttons, or unhandled screens.
9. **Accessibility & Usability:** Maintain readable contrast, keyboard shortcuts for all actions, and responsive layout across window sizes.
10. **Progress Transparency:** Always keep `PROGRESS.md` up to date with verified evidence, test results, and next tasks.

### 3. Code Organization
```text
src/
├── app/                  # Application router, state machine, layout shell
├── components/           # Reusable tactical UI elements (Button, Card, Modal, Slider, Tabs)
├── game/
│   ├── engine/           # Three.js viewport, renderer, lighting, camera controls
│   ├── scenes/           # Procedural terrain, sky, horizon, environmental props
│   ├── scenarios/        # Scenario definitions, target waypoints, flight curves
│   └── assessment/       # Reticle raycasting, classification logic, scoring engine (v1.0.0)
├── features/
│   ├── training/         # Simulation HUD, compass, reticle, classification dialog, pause modal
│   ├── reports/          # Results summary, interactive AAR event timeline
│   └── settings/         # Graphics presets, audio, camera sensitivity, IndexedDB controls
├── data/                 # IndexedDB storage adapter, types, preset scenario seeds
├── styles/               # Tactical design tokens, theme variables, reset
└── test/                 # Vitest test suites for scoring, scenarios, and storage
```

### 4. Definition of Done
A phase or feature is done only when:
- Code compiles cleanly with zero TypeScript errors.
- Unit tests verify core deterministic logic and pass completely.
- Three.js scenes initialize, navigate, and dispose without errors or memory retention.
- End-to-end user loop (Select -> Brief -> Simulate -> Classify -> Results -> AAR -> History) functions seamlessly.
- Documentation and `PROGRESS.md` reflect verified current state.
