# 🚁 Drone Classifier Simulator

**An interactive 3D drone-observation and classification training simulator built for the web.**

The Drone Classifier Simulator is a software-based training environment where users can observe simulated aerial objects, identify their categories, practice visual classification, and review their performance in a virtual 3D world.

The project focuses on safe, repeatable training without requiring physical drones or dedicated outdoor training facilities.

**Repository:** [hiteshubinekar-876/drone-classfier-simulator](https://github.com/hiteshubinekar-876/drone-classfier-simulator)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Available Commands](#-available-commands)
- [Training Workflow](#-training-workflow)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Safety and Scope](#-safety-and-scope)
- [Contributing](#-contributing)
- [Author](#-author)

## 🎯 Overview

Traditional drone-observation training can require physical equipment, suitable locations, and repeated instructor-led sessions. This project explores how an interactive 3D simulator can make observation and classification exercises more accessible.

The simulator is designed around three main goals:

- **Observe:** Explore a virtual environment and track simulated aerial objects.
- **Classify:** Identify an object's category using visual observation and classification controls.
- **Evaluate:** Review detection timing, classification accuracy, and training performance.

## ✨ Features

The project specification includes the following capabilities:

- 🌍 **Interactive 3D environment** — Explore a virtual terrain with environmental lighting and atmospheric effects.
- 🚁 **Simulated aerial objects** — Practice observing multirotor, fixed-wing, and micro-drone models.
- 🎮 **First-person controls** — Navigate the environment and use mouse-based camera controls.
- 🔭 **Observation mode** — Use zoom or binocular-style viewing to inspect distant objects.
- 🏷️ **Classification interface** — Assign categories to observed objects.
- 📊 **Performance scoring** — Evaluate classification correctness, detection latency, and tracking performance.
- 📝 **After-Action Review (AAR)** — Review event timelines, scores, and training feedback.
- 💾 **Local session history** — Designed to preserve training records and preferences in browser storage.
- ⚙️ **Graphics settings** — Adjustable quality presets for different hardware capabilities.
- 🖥️ **Desktop application path** — Tauri configuration for a potential standalone Windows application.

*Feature availability may vary as development progresses.*

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe application development |
| Vite | Development server and build tooling |
| Three.js | 3D rendering and simulation environment |
| Lucide React | Interface icons |
| Vitest | Unit testing |
| Playwright | Browser testing tools |
| Tauri | Desktop application packaging |

## 🚀 Getting Started

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/) — use a current supported LTS release.
- npm — included with Node.js.
- [Git](https://git-scm.com/) — for cloning the repository.

### 1. Clone the repository

```bash
git clone https://github.com/hiteshubinekar-876/drone-classfier-simulator.git
```

### 2. Enter the project directory

```bash
cd drone-classfier-simulator
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

### 5. Build for production

```bash
npm run build
```

The production build is generated in the `dist/` directory.

## 🧪 Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build the application |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run the Vitest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Check TypeScript types |

## 🎮 Training Workflow

The intended training workflow is:

1. Launch the simulator.
2. Select a training scenario and review its briefing.
3. Enter the virtual environment.
4. Observe and track simulated aerial objects.
5. Select the appropriate classification and confidence level.
6. Complete the scenario and review the results.
7. Examine the After-Action Review timeline and identify areas for improvement.

## 📂 Project Structure

The repository currently includes these main areas and documentation files:

```text
drone-classfier-simulator/
├── src/                                  # Application source
├── src-tauri/                            # Tauri desktop configuration
├── tests/                                # Test files
├── index.html                            # Application entry HTML
├── package.json                          # Dependencies and scripts
├── vite.config.ts                        # Vite configuration
├── tsconfig.json                         # TypeScript configuration
├── PRD.md                                # Product requirements
├── TECH_STACK.md                         # Technology and architecture
├── APP_FLOW.md                           # Application flow
├── IMPLEMENTATION_PLAN.md                # Development plan
├── PROGRESS.md                           # Development progress
└── virtual_drone_threat_training_simulator.md
```

## 🗺️ Roadmap

Planned development areas include:

- [ ] Complete the end-to-end scenario and training workflow.
- [ ] Improve 3D environment quality and rendering performance.
- [ ] Refine observation, classification, and scoring mechanics.
- [ ] Improve the After-Action Review dashboard.
- [ ] Expand automated tests for simulation and scoring logic.
- [ ] Validate persistent session history and settings.
- [ ] Test desktop packaging with Tauri.
- [ ] Improve accessibility and low-performance-device support.

## 🛡️ Safety and Scope

This project is intended for **virtual observation, visual recognition, and educational training**.

- It does not require a physical drone.
- It does not control real-world drone hardware.
- It does not implement radio-link interception or live drone telemetry.
- It does not provide weapon engagement or live-fire targeting functionality.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and run the relevant tests.
4. Commit your changes with a descriptive message.
5. Open a pull request explaining the improvement.

For example:

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

## 👨‍💻 Author

**Hitesh Binekar**

GitHub: [@hiteshubinekar-876](https://github.com/hiteshubinekar-876)

Interested in AI, robotics, simulation, and interactive engineering projects.

---

⭐ If you find this project interesting, consider starring the repository and sharing your feedback.

**Project status:** Under development. See [`PROGRESS.md`](PROGRESS.md) for development progress and [`PRD.md`](PRD.md) for the detailed product specification.
