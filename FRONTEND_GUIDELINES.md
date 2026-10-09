# Frontend & Visual Guidelines (FRONTEND_GUIDELINES)
## Virtual Drone-Threat Training Simulator

**Document Status:** Approved Design System  
**Source of Truth:** `virtual_drone_threat_training_simulator.md`

---

### 1. Aesthetic Direction & Visual Philosophy

The Virtual Drone-Threat Training Simulator implements a **modern, military-grade tactical simulation interface** that balances high technical utility with visual elegance:
- **Stylized-Realistic 3D Atmosphere:** Low-to-medium poly procedural terrain with contoured elevation, horizon haze/fog, sun elevation, atmospheric scattering, and clear object silhouettes against diverse sky backdrops.
- **Tactical Glassmorphism:** Semitransparent slate panels with subtle frosted-glass blur (`backdrop-filter: blur(12px)`), crisp hairline borders (`1px solid rgba(141, 217, 192, 0.15)`), and high-contrast typography.
- **Unobtrusive Heads-Up Display (HUD):** Clear reticle and peripheral telemetry that does not occlude trainee line-of-sight during active aerial scanning.
- **Auditory Feedback:** Subtle ambient airfield/desert wind loop, mechanical binocular zoom sound, and crisp tactical audio chirps upon target lock and classification confirmation.

---

### 2. Design Tokens & Color Palette

```css
:root {
  /* Surface & Background Colors */
  --color-bg-base: #0c1417;          /* Deep tactical void */
  --color-bg-deep: #131f24;          /* Deep slate base */
  --color-panel-surface: #1b2b30;    /* Semi-opaque panel slate */
  --color-panel-elevated: #243940;   /* Interactive card surface */
  --color-border-subtle: rgba(141, 217, 192, 0.18);
  --color-border-bright: rgba(141, 217, 192, 0.45);

  /* Tactical Functional Colors */
  --color-accent-mint: #8dd9c0;      /* Primary telemetry / target acquired */
  --color-accent-glow: rgba(141, 217, 192, 0.3);
  --color-teal-muted: #6c8c8a;       /* Secondary metrics / grid guides */
  --color-warning-amber: #e6b65c;    /* Target unconfirmed / warning */
  --color-error-red: #d96c6c;        /* Penalty / misclassification */
  --color-success-green: #5cd68f;    /* Verified match / pass */

  /* Text & Typography */
  --color-text-primary: #e4efec;     /* High contrast pale mint-white */
  --color-text-secondary: #b9c8c7;   /* Readout subheaders */
  --color-text-muted: #78908f;       /* Inactive tabs / metadata */

  /* Fonts */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: "JetBrains Mono", "SF Mono", "Consolas", monospace;

  /* Elevations & Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 14px;
  --shadow-elevation: 0 8px 32px rgba(0, 0, 0, 0.45);
}
```

---

### 3. Screen Layout & Component Structure

#### 3.1 Navigation Shell & Welcome Screen
- Deep backdrop with geometric radar / telemetry vector animations.
- Prominent branding: Large high-contrast typography with military-spec monospaced badges (`SPEC-UAS-V1`).
- Direct 1-click progression to scenario selection or instant guest practice.

#### 3.2 3D Viewport & In-Game HUD
- **3D Canvas:** `position: absolute; inset: 0; width: 100vw; height: 100vh;`
- **HUD Layers (Pointer Events Decoupled):**
  - **Compass & Horizon Tape:** Top center; displays live camera bearing (`000°` - `359°`) and pitch angle.
  - **Mission Timer & Objectives:** Top left; sleek glass card indicating active time remaining and classification count.
  - **Crosshair / Reticle:** Center viewport. Changes dynamic bracket color from `--color-teal-muted` to `--color-accent-mint` when pointing directly at an aerial target within identification distance.
  - **Binocular Mode:** When holding `RMB` or pressing `Shift`, smoothly zooms field of view from 75° to 25° with an authentic circular optical vignette and range estimation stadia markings.
  - **Classification Drawer (Interactive):** When a target is selected, an intuitive tactical radial or modal palette slides up allowing keyboard (`1`, `2`, `3`, `4`) or mouse classification.
  - **Non-Operational Notice:** Pinned to bottom right: `TRAINING SIMULATION ENVIRONMENT - NON-OPERATIONAL`.

#### 3.3 Results & After-Action Review (AAR)
- **Score Card:** Prominent circular or gauge readout of composite score (0–100%) with status badge (`EXEMPLARY`, `QUALIFIED`, `REMEDIATION REQUIRED`).
- **Interactive Event Timeline:**
  - Horizontal bar spanning scenario duration with color-coded pins:
    - Yellow: Target entered airspace
    - Blue: Trainee crosshair acquisition
    - Green: Trainee submitted correct classification
    - Red: Misclassification or penalty
  - Clicking any pin displays a breakdown card showing ground truth vs trainee perception.

---

### 4. Responsiveness & Accessibility

- **Resolution Adaptability:** Fully fluid from 1024x768 up to 4K Ultrawide displays without UI clipping.
- **Color Independence:** Status indicators always couple color with descriptive text badges and distinct icon glyphs.
- **Keyboard Navigation:** Every menu item and classification action supports direct keyboard shortcuts.
- **Motion Sensitivity:** Includes a dedicated "Reduced Motion" setting that disables head bob, camera smoothing delays, and high-frequency animations.
