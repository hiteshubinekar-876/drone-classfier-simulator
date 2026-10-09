# Virtual Drone-Threat Training Simulator
## Project Requirements and Development Blueprint

**Document status:** Initial planning draft  
**Product type:** Lightweight 3D training simulator  
**Target platforms:** Modern web browsers and Windows desktop  
**Primary users:** Trainees, instructors, and training administrators

---

## 1. Project Overview

The Virtual Drone-Threat Training Simulator is a software-based training application that lets users practice observing, recognizing, and classifying simulated drone-like objects in repeatable virtual environments.

The product is designed to reduce reliance on costly, weather-dependent, or resource-intensive live exercises. It should be immersive enough to feel like a place the trainee can explore, while remaining lightweight enough for ordinary desktop computers and compatible browsers.

The initial release focuses on safe, non-operational training: visual observation, classification, awareness, decision-making under uncertainty, and after-action learning. It does not control real equipment or provide real-world weapon engagement instructions.

### Product vision

> Create an accessible, realistic-feeling training experience that combines a lightweight 3D world, meaningful learning tasks, transparent assessment, and useful performance feedback.

### Design principles

1. **Immersion without excessive hardware requirements.**
2. **One shared codebase for browser and desktop.**
3. **Short, replayable sessions with clear learning goals.**
4. **Transparent, explainable scoring.**
5. **Accessible controls and readable interface design.**
6. **Data minimization and privacy-aware performance records.**
7. **Modular architecture that supports future expansion.**

---

## 2. PRD.md — Product Requirements Document

### 2.1 Problem statement

Traditional drone-threat training can require real equipment, controlled locations, suitable weather, instructor time, and safety arrangements. These constraints can limit the number and variety of practice sessions.

### 2.2 Proposed solution

Provide a software simulator with scripted and randomized scenarios, lightweight 3D environments, trainee assessments, session records, and an after-action review (AAR) dashboard.

### 2.3 User roles

- **Trainee:** Starts assigned or practice scenarios, completes observation/classification tasks, and reviews personal results.
- **Instructor:** Selects training scenarios, reviews trainee performance, and provides feedback.
- **Administrator:** Manages local configuration, user access, and retention settings when multi-user functionality is enabled.

For the first offline prototype, role-based login may be deferred in favor of a guest/practice mode.

### 2.4 MVP scope

The first usable release should include:

- Responsive main menu and settings screen.
- One polished 3D training environment.
- First-person or free-look camera and keyboard/mouse controls.
- Simulated moving drone-like objects.
- Scripted scenarios with configurable event timing.
- A small set of randomized, non-operational observation scenarios.
- Day/night and visibility presets.
- Pause, resume, restart, and exit controls.
- Observation and classification tasks.
- Explainable, rules-based scoring.
- End-of-session results screen.
- AAR event timeline and session history.
- Local data persistence.
- Browser build and Windows desktop packaging.
- Quality settings for lower-powered hardware.
- Error handling and automated tests for core logic.

### 2.5 Out of scope for MVP

- Control of real drones, sensors, or counter-drone equipment.
- Live-fire or weapon-control integration.
- Real-world engagement tactics or target-engagement recommendations.
- Multiplayer simulation.
- Mandatory VR support.
- Large open-world maps.
- Cloud analytics or centralized identity management.
- Advanced procedural world generation.

These may be considered separately after the MVP is validated, subject to appropriate safety, security, and user requirements.

### 2.6 User stories

- As a trainee, I want to start a practice session quickly so I can repeat exercises without a long setup.
- As a trainee, I want clear objectives and controls so I understand what the exercise measures.
- As a trainee, I want feedback after each session so I know where to improve.
- As an instructor, I want to compare session results so I can identify learning needs.
- As a user on a lower-powered computer, I want adjustable graphics settings so the simulator remains usable.
- As a user, I want my progress saved locally so I can return to it later.

### 2.7 Functional requirements

**FR-01 — Launch and navigation:** Users can open the application, reach the main menu, start training, view results, and change settings.

**FR-02 — Environment:** The simulator renders a navigable 3D training location with terrain, sky, vegetation, and simple structures.

**FR-03 — Controls:** Keyboard and mouse controls support movement/look, pause, resume, and exit. Controls are documented and configurable where practical.

**FR-04 — Scenarios:** A scenario defines its environment, duration, difficulty label, and scheduled simulation events.

**FR-05 — Simulated objects:** Virtual drone-like objects can move along predefined, non-tactical paths for observation exercises.

**FR-06 — Assessment:** The system records observation time, user-selected classification, correctness against the scenario's ground truth, and completion status.

**FR-07 — Scoring:** Score components and their weighting are visible to the trainee or instructor. Scores are calculated from documented training criteria.

**FR-08 — AAR:** The results view shows session summary, event timeline, classification outcomes, and feedback.

**FR-09 — History:** Completed sessions can be reviewed and compared over time.

**FR-10 — Difficulty:** Difficulty settings adjust observation complexity and time pressure without relying on operational engagement guidance.

**FR-11 — Randomization:** Scenario variants can vary event timing, object appearance, object count, environment, and visibility within validated bounds.

**FR-12 — Persistence:** Session records survive a browser refresh or desktop application restart.

**FR-13 — Platform support:** The web build runs in supported modern browsers; a desktop package uses the same core application.

**FR-14 — Accessibility:** UI text is readable, status is not communicated by color alone, and essential actions are keyboard accessible.

### 2.8 Non-functional requirements

- **Performance:** Aim for 60 FPS on target mid-range hardware and a stable 30 FPS fallback on supported lower-end hardware. Validate with profiling; these are targets, not guarantees.
- **Loading:** Keep the initial download small and load scene assets only when needed.
- **Reliability:** Pause, restart, and session completion should not corrupt saved results.
- **Maintainability:** Separate rendering, scenario logic, assessment, persistence, and UI.
- **Portability:** Avoid browser-specific APIs in shared game logic.
- **Privacy:** Store only necessary user and session data. Explain where records are saved.
- **Security:** Validate imported scenario data and avoid executing user-supplied code.
- **Offline support:** Core practice mode should work offline after the app and required assets are available.

### 2.9 Success criteria

The MVP is acceptable when:

1. A user can launch a scenario and complete it end-to-end.
2. Detection/observation and classification events are recorded consistently.
3. The same session produces the same score from the same event data and scoring version.
4. AAR results are visible after completion and remain available after restart.
5. The browser build and desktop package both pass core workflow tests.
6. Graphics settings demonstrably affect rendering cost.
7. Performance goals are measured on a documented hardware test set.
8. There are no known critical bugs in start, pause, completion, or persistence flows.

---

## 3. APP_FLOW.md — Application Flow

### 3.1 Primary trainee flow

```text
Launch
  |
  v
Welcome / Guest Practice
  |
  v
Main Menu
  |------ Training
  |          |
  |          v
  |     Scenario Selection
  |          |
  |          v
  |     Mission Briefing
  |          |
  |          v
  |     3D Simulation <----> Pause Menu
  |          |
  |          v
  |     Results Summary
  |          |
  |          v
  |     AAR Timeline / Session Details
  |          |
  |          +----> Retry Scenario
  |          +----> Main Menu
  |
  |------ Progress / History
  |
  |------ Settings
  |
  +------ Exit
```

### 3.2 Screen requirements

**Welcome**
- Product title and brief description.
- Start practice button.
- Compatibility or loading error message when necessary.

**Main Menu**
- Start Training.
- Progress / History.
- Settings.
- Exit or close guidance.

**Scenario Selection**
- Scenario name and learning objective.
- Environment and difficulty label.
- Estimated duration.
- Clear indication of whether the scenario is scripted or randomized.

**Mission Briefing**
- Exercise objectives.
- Keyboard/mouse controls.
- Accessibility and safety notes.
- Start and return buttons.

**Simulation**
- Main 3D canvas.
- Minimal HUD showing current objective, session state, and non-operational status.
- Pause, resume, restart, and exit.
- Classification/observation interface appropriate to the exercise.

**Results**
- Overall score and component breakdown.
- Correct/incorrect classification count.
- Observation timing.
- Completion state.
- Retry and AAR actions.

**AAR**
- Chronological event timeline.
- Expected event and trainee action comparison.
- Learning notes.
- Previous-session comparison where data exists.

**Settings**
- Graphics quality.
- Render resolution scale.
- Sound volume and mute.
- Camera sensitivity.
- Control reference.
- Reduced motion option.
- Local data management and reset controls.

### 3.3 Interaction principles

- Keep the most common path to training short.
- Show loading progress when scene assets are being prepared.
- Confirm destructive actions such as clearing history.
- Provide a graceful fallback if WebGL2 or required graphics features are unavailable.
- Never imply that a simulated assessment is a real-world threat determination.

---

## 4. TECH_STACK.md — Technology Stack

### 4.1 Recommended stack

| Layer | Choice | Purpose |
|---|---|---|
| Language | TypeScript | Shared typed application and simulation logic |
| Build tool | Vite | Fast development and web bundling |
| UI | React | Menus, HUD, settings, reports |
| 3D rendering | Three.js | Lightweight browser-based 3D environment |
| Styling | CSS modules or organized CSS + design tokens | Consistent responsive UI |
| Desktop packaging | Tauri | Package the web application for desktop |
| Browser persistence | IndexedDB | Local session history and settings |
| Local desktop persistence | SQLite through a reviewed Tauri plugin, or a shared persistence adapter | Durable local records |
| Optional backend | FastAPI | Central API for multi-user deployments |
| Optional central database | PostgreSQL | Shared user/session/report data |
| Unit testing | Vitest | Scenario and scoring logic tests |
| End-to-end testing | Playwright | Browser workflows |
| Desktop testing | Tauri-specific build and smoke tests | Packaging and launch validation |

### 4.2 Architecture

```text
React UI
  |-- Main menu / settings
  |-- Simulation HUD
  |-- Results / AAR
  |
Application Services
  |-- Scenario manager
  |-- Session lifecycle
  |-- Assessment and scoring
  |-- Persistence adapter
  |
3D Layer (Three.js)
  |-- Scene and camera
  |-- Terrain and environment
  |-- Simulated objects
  |-- Lighting and effects
  |
Storage Adapter
  |-- IndexedDB (browser)
  |-- Local database adapter (desktop)
  |
Optional future service
  |-- FastAPI
  |-- PostgreSQL
```

### 4.3 Key design decision

The 3D renderer must not own assessment rules or persistence. Scenario logic and scoring should be deterministic, testable modules that can run without rendering the 3D scene.

### 4.4 Performance strategy

- Use low-poly, stylized-realistic assets with sensible silhouettes.
- Use compressed textures and appropriate texture sizes.
- Use instancing for repeated vegetation and props.
- Use level of detail or simplified geometry for distant objects.
- Limit real-time shadows and expensive post-processing.
- Prefer baked lighting where suitable.
- Use frustum culling and avoid unnecessary scene updates.
- Load only assets required for the selected environment.
- Offer Low, Medium, and High presets.
- Profile CPU, GPU, memory, startup time, and frame-time spikes.

### 4.5 Desktop/browser parity

- Keep shared application and simulation logic platform-neutral.
- Put browser and desktop storage behind one interface.
- Keep desktop-specific filesystem access inside the Tauri layer.
- Use feature detection for browser graphics capabilities.
- Test keyboard focus, window resizing, fullscreen, and pause/resume on both targets.

---

## 5. DB_BACKEND.md — Data Model and Backend

### 5.1 MVP storage

The initial release should be offline-first. Use IndexedDB in the browser. The desktop app can use a local SQLite adapter if its plugin and permissions are reviewed; otherwise, begin with a simple versioned local persistence adapter and migrate later.

Do not require a server for a single-user practice prototype.

### 5.2 Proposed entities

#### users
- `id`: unique identifier
- `display_name`: optional display name
- `role`: trainee, instructor, or administrator
- `created_at`: timestamp

#### scenarios
- `id`: unique scenario identifier
- `name`: human-readable name
- `description`: learning objective
- `environment_id`: environment asset/config reference
- `difficulty`: beginner, intermediate, advanced
- `version`: scenario definition version
- `config_json`: validated scenario configuration
- `created_at`: timestamp

#### sessions
- `id`: unique session identifier
- `user_id`: nullable for guest mode
- `scenario_id`: scenario reference
- `scenario_version`: version used for the session
- `started_at`: timestamp
- `completed_at`: nullable timestamp
- `status`: in_progress, completed, abandoned
- `app_version`: application version

#### events
- `id`: unique event identifier
- `session_id`: session reference
- `sequence_number`: stable order within a session
- `simulation_time_ms`: simulation-relative time
- `event_type`: scenario event, observation, classification, pause, completion
- `payload_json`: validated event-specific data

#### scores
- `id`: unique score record
- `session_id`: session reference
- `scoring_version`: scoring rules version
- `total_score`: normalized score
- `component_scores_json`: explainable score breakdown
- `feedback_json`: learning feedback
- `calculated_at`: timestamp

#### instructor_notes (optional)
- `id`: unique note identifier
- `session_id`: session reference
- `author_id`: instructor reference
- `note_text`: feedback
- `created_at`: timestamp

### 5.3 Data relationships

- A user can have many sessions.
- A scenario can be used in many sessions.
- A session can contain many events.
- A completed session can have one or more versioned score records.
- A session can have multiple instructor notes.

### 5.4 Example assessment flow

1. Scenario manager creates a session with a frozen scenario version and random seed.
2. Simulation emits structured events with simulation-relative timestamps.
3. Assessment service compares trainee responses against scenario ground truth.
4. Scoring service computes a versioned, explainable score.
5. Persistence adapter saves the session, events, and score.
6. AAR view reads saved records and builds a timeline.

### 5.5 Scoring requirements

Scoring should be transparent and deterministic. A sample score may include:
- Observation performance.
- Classification correctness.
- Decision quality against approved training criteria.
- Completion and procedure adherence.

Exact weights must be configurable by authorized training owners and documented. Avoid rewarding speed alone if it encourages guessing. Show both accuracy and timing so instructors can interpret performance fairly.

### 5.6 Optional backend API

If centralized training management is later needed, possible API routes include:

- `GET /api/scenarios`
- `POST /api/sessions`
- `POST /api/sessions/{session_id}/events`
- `POST /api/sessions/{session_id}/complete`
- `GET /api/sessions/{session_id}/report`
- `GET /api/users/{user_id}/progress`

Use authentication, role-based authorization, request validation, audit logging, rate limiting where appropriate, and a documented retention policy before deploying a shared service.

### 5.7 Data validation and privacy

- Validate scenario configurations against a schema.
- Do not execute code contained in imported scenario files.
- Keep personal information to a minimum.
- Offer clear local-history deletion controls.
- Avoid storing sensitive operational details in logs.
- Document whether data is local or sent to a server.

---

## 6. FRONTEND_GUIDELINES.md — Visual and Interaction Guidelines

### 6.1 Art direction

Use a **stylized-realistic, lightweight 3D look**. The environment should feel like a physical place rather than a flat dashboard, but it does not need photorealistic assets.

Use:
- Layered terrain and a visible horizon.
- Believable object scale and silhouettes.
- Natural, restrained environmental colors.
- Directional lighting and subtle ambient occlusion where affordable.
- Simple wind animation in vegetation.
- Gentle ambient audio, with a mute control.
- Consistent camera movement and responsive input.

Avoid:
- Excessive bloom, motion blur, particles, and screen shake.
- High-resolution textures on every asset.
- Large HUD panels that obscure the environment.
- Rapid flashing or color-only alerts.
- Decorative animation that makes assessment harder to read.

### 6.2 Layout

**Main menu**
- Product name and a clear Start Training action.
- Secondary navigation for progress, settings, and help.

**Simulation screen**
- 3D canvas occupies most of the window.
- Compact objective and status panels.
- Clearly accessible pause and exit controls.
- Observation/classification controls appear only when relevant.

**AAR screen**
- Summary metrics at the top.
- Event timeline in the center.
- Detailed feedback and session comparison below.
- Export capability may be added after local persistence is stable.

### 6.3 Design tokens

Suggested initial palette:
- Deep slate: `#172329`
- Panel slate: `#26383D`
- Muted teal: `#6C8C8A`
- Pale text: `#E4EFEC`
- Secondary text: `#B9C8C7`
- Accent mint: `#8DD9C0`
- Warning amber: `#E6B65C`
- Error red: `#D96C6C`

Check contrast before finalizing colors. Status must also be represented through text, icons, or patterns.

### 6.4 Typography and controls

- Use a clean system sans-serif stack.
- Keep primary text comfortably readable at common desktop sizes.
- Provide visible keyboard focus.
- Use clear labels and meaningful icons.
- Support mouse and keyboard without requiring a game controller.
- Include sensitivity settings and optional reduced motion.
- Provide concise help for controls on the briefing screen.

### 6.5 Responsive behavior

- Desktop: full scene and side panels where space allows.
- Small browser window: collapse nonessential panels and preserve core controls.
- Avoid requiring hover to reveal essential actions.
- Handle window resize without breaking camera aspect ratio or UI layout.

---

## 7. IMPLEMENTATION_PLAN.md — Build Plan

### Phase 0 — Foundation
- Create repository and Vite/React/TypeScript app.
- Add linting, formatting, and test scripts.
- Establish folder conventions and shared types.
- Add error boundary and application-level loading state.

**Acceptance:** App starts locally, type-checks, and runs its first test.

### Phase 1 — UI shell
- Create main menu, scenario selection, briefing, settings, and results routes.
- Add design tokens and responsive layouts.
- Add mock scenario data.

**Acceptance:** All screens are navigable and usable without the 3D engine.

### Phase 2 — First 3D environment
- Initialize Three.js renderer, scene, and camera.
- Add terrain, sky, simple buildings, vegetation, and a visible horizon.
- Add keyboard/mouse movement and resize handling.
- Add low/medium/high graphics settings.

**Acceptance:** User can enter and navigate the environment at target frame rates on test hardware.

### Phase 3 — Scenario engine
- Define typed scenario configuration.
- Add session lifecycle: create, start, pause, resume, complete, abandon.
- Add simulated objects and safe observation events.
- Add deterministic seeded randomization within validated bounds.

**Acceptance:** The same seed and configuration reproduce the same scenario event schedule.

### Phase 4 — Assessment and scoring
- Record observation and classification actions.
- Implement deterministic scoring as a standalone module.
- Version the scoring rules.
- Add unit tests for correct, incorrect, missing, and late responses.

**Acceptance:** Scores are reproducible from the same session events and scoring version.

### Phase 5 — AAR and local persistence
- Add persistence adapter and IndexedDB implementation.
- Save sessions, events, and score records.
- Build session history and AAR timeline.
- Add clear-history controls and safe migration/versioning.

**Acceptance:** Completed sessions remain available after refresh/relaunch and render correctly in AAR.

### Phase 6 — Desktop package
- Add Tauri configuration and desktop build.
- Implement or select a reviewed local persistence adapter.
- Restrict filesystem and application permissions to what is necessary.
- Test window resizing, keyboard behavior, startup, and shutdown.

**Acceptance:** Desktop package installs/launches on target Windows test systems and completes the same core flow as the browser build.

### Phase 7 — QA and optimization
- Test supported browsers and documented hardware configurations.
- Profile CPU/GPU usage, memory, startup time, and frame pacing.
- Test pause/resume, restart, saving, corrupted records, and error states.
- Verify keyboard accessibility and reduced-motion settings.
- Fix critical and high-priority defects.

**Acceptance:** Release checklist passes and known limitations are documented.

### Phase 8 — Optional extensions
- Additional environments.
- More scenario templates.
- Instructor-led session assignment.
- Central backend and PostgreSQL.
- Optional VR exploration after browser/desktop UX is stable.

---

## 8. AGENTS.md — Instructions for AI Coding Agents

### Project mission

Build a lightweight, immersive, non-operational training simulator that runs in a modern browser and can be packaged as a Windows desktop application.

### Mandatory engineering rules

1. Read `PRD.md`, `APP_FLOW.md`, `TECH_STACK.md`, and this file before making structural changes.
2. Use TypeScript and keep strict type checking enabled.
3. Keep simulation logic independent from React rendering and Three.js scene objects.
4. Keep scoring deterministic and versioned.
5. Keep persistence behind an interface so browser and desktop storage can differ safely.
6. Do not put database or scoring logic directly inside UI components.
7. Dispose of Three.js geometries, materials, textures, event listeners, and renderers when no longer needed.
8. Pause animation loops and release resources when leaving the simulation.
9. Validate all scenario configuration data.
10. Do not execute imported scenario content as JavaScript.
11. Do not commit secrets, user data, build outputs, or local database files.
12. Keep interface controls keyboard-accessible and responsive.
13. Prefer small, focused changes over broad rewrites.
14. Add or update tests for behavior changes.
15. Do not claim a feature is complete unless its acceptance criteria and tests have been checked.
16. Update `PROGRESS.md` after each meaningful implementation milestone.
17. Document architectural decisions when they materially affect future development.

### Code organization

- `src/app/`: app setup and navigation.
- `src/components/`: reusable UI components.
- `src/game/engine/`: rendering and camera setup.
- `src/game/scenes/`: environment construction.
- `src/game/scenarios/`: scenario definitions and lifecycle.
- `src/game/assessment/`: event evaluation and scoring.
- `src/features/training/`: training screens and interactions.
- `src/features/reports/`: results and AAR.
- `src/features/settings/`: settings and quality controls.
- `src/data/`: storage adapters and data access.
- `src/styles/`: tokens and global styles.
- `tests/`: unit and end-to-end tests.

### Definition of done

A task is complete only when:
- The intended behavior is implemented.
- Type-checking and relevant tests pass.
- Loading, empty, and error states are handled where relevant.
- The UI remains usable at supported window sizes.
- Performance impact is considered for rendering changes.
- Documentation and `PROGRESS.md` are updated where appropriate.

### Agent workflow

1. Inspect existing code before editing.
2. State the task and acceptance criteria.
3. Make the smallest coherent implementation.
4. Run type-checks and relevant tests.
5. Report changed files, test results, and known limitations.
6. Update the progress log.
7. Do not silently replace working architecture or remove unrelated functionality.

---

## 9. PROGRESS.md — Project Tracker

**Current status:** Planning / not yet implemented  
**Last updated:** Initial blueprint

### Milestones

| Milestone | Status | Evidence required |
|---|---|---|
| Requirements and architecture | Drafted | Review and approve documents |
| Repository setup | Not started | App runs; type-check and test scripts pass |
| UI shell | Not started | Main routes navigable |
| First 3D scene | Not started | Scene renders and controls work |
| Scenario engine | Not started | Scenario lifecycle tests pass |
| Assessment/scoring | Not started | Deterministic scoring tests pass |
| AAR dashboard | Not started | Timeline and score breakdown render |
| Local persistence | Not started | Data survives restart |
| Browser QA | Not started | Supported browser test report |
| Desktop package | Not started | Windows build launches and passes smoke test |
| Performance pass | Not started | Profile results documented |

### Current priorities

1. Confirm MVP scope and target hardware.
2. Set up repository, scripts, and application shell.
3. Build one small, polished 3D environment.
4. Implement the complete scenario-to-AAR loop.
5. Validate browser performance before desktop packaging.

### Blockers / decisions to confirm

- Minimum supported hardware and browser versions.
- Whether guest mode is sufficient for the first prototype.
- Required data retention and export behavior.
- Whether the first desktop release must work fully offline.
- Whether VR is a later phase or a funded MVP requirement.

### Update template

For each development update, record:

- **Date:**
- **Completed:**
- **Tests run and results:**
- **Known issues:**
- **Blockers:**
- **Next tasks:**

---

## 10. Suggested Initial Commands

These commands are a starting point; verify current package versions and Tauri platform prerequisites before installing.

```bash
npm create vite@latest drone-training-simulator -- --template react-ts
cd drone-training-simulator
npm install
npm install three
npm install -D @types/three vitest
npm run dev
```

Add React Router only if the chosen navigation design requires it. Add Tauri after the browser MVP is running.

Typical validation commands, once configured in `package.json`:

```bash
npm run typecheck
npm run test
npm run build
```

---

## 11. Final Recommendation

Start with a single-player browser prototype that includes one believable 3D training location, responsive movement controls, simulated moving objects, a short observation/classification exercise, deterministic scoring, and an AAR screen.

Once the complete training loop is stable and lightweight in the browser, package the same codebase for desktop. Add more environments, richer randomization, centralized instructor tools, and optional VR only after validating the core experience.

**Core principle:** Prioritize a believable environment, responsive controls, repeatable learning scenarios, transparent assessment, and stable performance over expensive graphics or a large feature list.
