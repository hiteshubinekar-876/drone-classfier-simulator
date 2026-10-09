# Technology Stack & Architecture (TECH_STACK)
## Virtual Drone-Threat Training Simulator

**Document Status:** Approved Engineering Architecture  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`

---

### 1. Technology Choices & Justification

| Layer | Technology | Version / Spec | Purpose & Rationale |
|---|---|---|---|
| **Language** | **TypeScript** | `^5.6.0` (Strict) | Enforces compile-time type safety across 3D math, event streams, and scoring contracts. |
| **Build Tool & Bundler** | **Vite** | `^6.0.0` | Ultra-fast HMR, clean ES module bundling, zero-config TypeScript compilation. |
| **UI Framework** | **React** | `^18.3.0` | Declarative UI for menus, HUD overlays, classification drawers, results, and AAR timelines. |
| **3D Engine** | **Three.js** | `^0.170.0` | Proven WebGL2 rendering pipeline; lightweight, robust camera/matrix math, customizable shaders. |
| **Styling & Design System** | **Vanilla CSS + Modern Tokens** | CSS3 custom properties | High performance, zero runtime overhead, custom military-grade glassmorphic tactical aesthetic. |
| **Browser Persistence** | **IndexedDB (via `idb` / native)** | W3C IndexedDB API | Durable client-side relational storage for hundreds of full session logs, timelines, and scores. |
| **Desktop Packaging** | **Tauri v2** | Tauri CLI + Rust core | Ultra-lightweight native Windows desktop executable (<20MB vs ~150MB Electron), minimal RAM footprint. |
| **Unit Testing** | **Vitest** | `^2.1.0` | High-speed in-memory testing for scenario logic, deterministic math, and scoring rules. |
| **E2E Testing** | **Playwright** | `^1.48.0` | Headless browser verification of user journeys and canvas rendering stability. |
| **Audio Engine** | **Web Audio API** | Native Browser API | Spatial drone engine hum, UI confirmation chirps, and ambient wind without heavy external libraries. |

---

### 2. Layered Architecture Diagram

```text
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|   React UI Components: Welcome | Main Menu | Briefing | HUD | Results | AAR | Settings |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               APPLICATION SERVICES                                |
|  - SessionManager: Lifecycle (Init, Running, Paused, Completed, Abandoned)         |
|  - ScenarioEngine: Event Scheduler, Path Interpolation, Spawning, Ground Truth    |
|  - AssessmentService: Detection Crosshair Raycasting, Latency Metrics             |
|  - ScoringEngine: Deterministic pure function (v1.0.0)                            |
|  - StorageService: Storage abstraction layer                                      |
+-----------------------------------------------------------------------------------+
                 |                                                   |
                 v                                                   v
+------------------------------------+           +----------------------------------+
|           3D LAYER (Three.js)      |           |          STORAGE ADAPTER         |
|  - RenderEngine & WebGLRenderer    |           |  - StorageAdapter Interface      |
|  - SceneGraph (Sky, Terrain, Foli) |           |  - IndexedDbStorageAdapter       |
|  - DroneObject3D (Rotors, Meshes)  |           |  - (Desktop Tauri / FS fallback) |
|  - FirstPersonCameraController     |           +----------------------------------+
|  - Lighting & Shadow Managers      |
+------------------------------------+
```

---

### 3. Critical Architectural Principles

#### Principle 1: Strict Decoupling of 3D Scene from Core Logic
- The **Three.js engine is strictly a view layer**.
- Game ticks, scenario timelines, target positions, and observation evaluations are driven by an independent simulation tick.
- The `ScoringEngine` and `ScenarioEngine` can run headlessly inside unit tests without initializing a WebGL canvas or mock DOM.

#### Principle 2: Storage Abstraction Interface
All data operations interact with `StorageAdapter`:
```typescript
export interface StorageAdapter {
  init(): Promise<void>;
  saveSession(session: TrainingSession): Promise<void>;
  getSession(id: string): Promise<TrainingSession | null>;
  getAllSessions(): Promise<TrainingSession[]>;
  saveScore(score: TrainingScore): Promise<void>;
  getScore(sessionId: string): Promise<TrainingScore | null>;
  saveSettings(settings: UserSettings): Promise<void>;
  getSettings(): Promise<UserSettings>;
  clearAllData(): Promise<void>;
}
```
This enables seamless swapping between `IndexedDbStorageAdapter` (browser) and SQLite / FileSystem (desktop Tauri) without altering UI or business logic.

#### Principle 3: Deterministic & Versioned Scoring
- Scoring algorithms are purely functional: `score = evaluateSession(events, groundTruth, rulesVersion)`.
- Given identical event streams and ground truth data, the returned score is bitwise identical every time.
- Changes to scoring rules increment the `scoring_version` string (e.g., `"v1.0.0"`), ensuring historical comparability.

---

### 4. Performance & Hardware Scalability Strategy

1. **Geometry & Meshes:**
   - Procedural heightmap terrain using indexed buffer geometries.
   - Low-poly drone archetypes with stylized silhouettes for instantaneous visual classification.
   - Instanced meshes (`InstancedMesh`) for scatter props, foliage, and obstacles to maintain 1 draw call per prop cluster.
2. **Quality Presets:**
   - **Low:** Shadows disabled, resolution scale 0.8x, terrain detail 64x64, particle limit 0, foliage count 50.
   - **Medium:** Dynamic directional shadow (1024x1024), resolution scale 1.0x, terrain detail 128x128, foliage count 200.
   - **High:** Soft PCF shadows (2048x2048), resolution scale 1.0x/1.25x, ambient occlusion approximation, foliage count 500.
3. **Resource Disposal:**
   - Complete disposal loop (`geometry.dispose()`, `material.dispose()`, `texture.dispose()`, `renderer.dispose()`) on unmounting the 3D scene to prevent memory leaks across sessions.

---

### 5. Desktop Parity & Tauri Integration

- The project maintains a single source tree for both web and desktop.
- Tauri runs the built Vite frontend inside a Windows WebView2 instance.
- Feature detection (`window.__TAURI_INTERNALS__`) determines if native OS features (e.g., closing window, native dialogs) are available.
- Where Cargo/Rust is available on the host machine, running `npm run tauri build` packages a self-contained `.exe`.
