import { KeyAction, KeyBindings, DEFAULT_KEY_BINDINGS } from '../types';

export interface ActionMetadata {
  id: KeyAction;
  name: string;
  category: 'movement' | 'optics' | 'classification' | 'system';
  description: string;
  defaultKey: string;
}

export const ACTION_METADATA_LIST: ActionMetadata[] = [
  {
    id: 'moveForward',
    name: 'Move Forward',
    category: 'movement',
    description: 'Advance forward on observation platform',
    defaultKey: 'KeyW'
  },
  {
    id: 'moveBackward',
    name: 'Move Backward',
    category: 'movement',
    description: 'Retreat backward on observation platform',
    defaultKey: 'KeyS'
  },
  {
    id: 'moveLeft',
    name: 'Strafe Left',
    category: 'movement',
    description: 'Sidestep left on observation platform',
    defaultKey: 'KeyA'
  },
  {
    id: 'moveRight',
    name: 'Strafe Right',
    category: 'movement',
    description: 'Sidestep right on observation platform',
    defaultKey: 'KeyD'
  },
  {
    id: 'toggleZoom',
    name: 'Binocular Zoom (3.2x)',
    category: 'optics',
    description: 'Engage or disengage optical binocular magnification',
    defaultKey: 'ShiftLeft'
  },
  {
    id: 'triggerClassification',
    name: 'Acquire Target / Classify',
    category: 'optics',
    description: 'Acquire crosshair reticle lock and open classification drawer',
    defaultKey: 'Space'
  },
  {
    id: 'selectArchetype1',
    name: 'Select Quadcopter Profile',
    category: 'classification',
    description: 'Quick-select Rotary Quadcopter surveillance profile',
    defaultKey: 'Digit1'
  },
  {
    id: 'selectArchetype2',
    name: 'Select Fixed-Wing Profile',
    category: 'classification',
    description: 'Quick-select Fixed-Wing reconnaissance drone profile',
    defaultKey: 'Digit2'
  },
  {
    id: 'selectArchetype3',
    name: 'Select Micro-UAV Profile',
    category: 'classification',
    description: 'Quick-select Nano Swarm / Micro-UAV profile',
    defaultKey: 'Digit3'
  },
  {
    id: 'selectArchetype4',
    name: 'Select Civilian Toy Profile',
    category: 'classification',
    description: 'Quick-select Low-Risk Commercial Toy drone profile',
    defaultKey: 'Digit4'
  },
  {
    id: 'submitClassification',
    name: 'Confirm Classification',
    category: 'classification',
    description: 'Submit selected drone classification to assessment engine',
    defaultKey: 'Enter'
  },
  {
    id: 'cancelDrawer',
    name: 'Dismiss Classification',
    category: 'classification',
    description: 'Close classification drawer without recording assessment',
    defaultKey: 'Escape'
  },
  {
    id: 'pauseSimulation',
    name: 'Pause / Resume Simulation',
    category: 'system',
    description: 'Freeze simulation clock and open tactical pause menu',
    defaultKey: 'Escape'
  },
  {
    id: 'toggleMute',
    name: 'Toggle Audio Mute',
    category: 'system',
    description: 'Mute or unmute ambient wind and target acoustics',
    defaultKey: 'KeyM'
  }
];

export const CATEGORY_LABELS: Record<'movement' | 'optics' | 'classification' | 'system', string> = {
  movement: 'Observation Post Movement',
  optics: 'Optics & Reticle Targeting',
  classification: 'Threat Classification',
  system: 'Simulation & System Controls'
};

export function formatKeyDisplay(code: string): string {
  if (!code) return 'UNASSIGNED';

  // Letters
  if (code.startsWith('Key')) {
    return code.slice(3).toUpperCase();
  }
  // Digits
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  // Numpad
  if (code.startsWith('Numpad')) {
    return `NUM ${code.slice(6)}`;
  }

  // Common special keys
  switch (code) {
    case 'Space': return 'SPACE';
    case 'Enter': return 'ENTER';
    case 'Escape': return 'ESC';
    case 'ShiftLeft': return 'L-SHIFT';
    case 'ShiftRight': return 'R-SHIFT';
    case 'ControlLeft': return 'L-CTRL';
    case 'ControlRight': return 'R-CTRL';
    case 'AltLeft': return 'L-ALT';
    case 'AltRight': return 'R-ALT';
    case 'Tab': return 'TAB';
    case 'Backspace': return 'BACKSPACE';
    case 'CapsLock': return 'CAPS LOCK';
    case 'ArrowUp': return 'UP ARROW';
    case 'ArrowDown': return 'DOWN ARROW';
    case 'ArrowLeft': return 'LEFT ARROW';
    case 'ArrowRight': return 'RIGHT ARROW';
    case 'Minus': return '-';
    case 'Equal': return '=';
    case 'BracketLeft': return '[';
    case 'BracketRight': return ']';
    case 'Backslash': return '\\';
    case 'Semicolon': return ';';
    case 'Quote': return "'";
    case 'Comma': return ',';
    case 'Period': return '.';
    case 'Slash': return '/';
    default:
      return code.toUpperCase();
  }
}

export class InputManager {
  private bindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  private activeKeys = new Set<string>();
  private listeners = new Set<(bindings: KeyBindings) => void>();

  constructor(initialBindings?: Partial<KeyBindings>) {
    if (initialBindings) {
      this.setAllBindings(initialBindings);
    }
  }

  getAllBindings(): KeyBindings {
    return { ...this.bindings };
  }

  getBinding(action: KeyAction): string {
    if (this.bindings[action] !== undefined) {
      return this.bindings[action];
    }
    return DEFAULT_KEY_BINDINGS[action] ?? '';
  }

  setBinding(action: KeyAction, code: string): void {
    this.bindings[action] = code;
    this.notify();
  }

  setAllBindings(bindings: Partial<KeyBindings>): void {
    this.bindings = {
      ...DEFAULT_KEY_BINDINGS,
      ...bindings
    };
    this.notify();
  }

  resetBinding(action: KeyAction): void {
    this.bindings[action] = DEFAULT_KEY_BINDINGS[action];
    this.notify();
  }

  resetAllBindings(): void {
    this.bindings = { ...DEFAULT_KEY_BINDINGS };
    this.notify();
  }

  findConflict(action: KeyAction, candidateKey: string): KeyAction | null {
    // Escape can safely coexist between cancelDrawer (in drawer) and pauseSimulation (in game)
    if (
      candidateKey === 'Escape' &&
      (action === 'cancelDrawer' || action === 'pauseSimulation')
    ) {
      return null;
    }

    for (const [otherAction, boundKey] of Object.entries(this.bindings)) {
      if (otherAction === action) continue;
      if (boundKey.toLowerCase() === candidateKey.toLowerCase()) {
        return otherAction as KeyAction;
      }
    }
    return null;
  }

  resolveConflictAndBind(
    action: KeyAction,
    candidateKey: string,
    replace: boolean
  ): boolean {
    const conflict = this.findConflict(action, candidateKey);
    if (conflict && !replace) {
      return false;
    }
    if (conflict && replace) {
      // Unassign the conflicting action
      this.bindings[conflict] = '';
    }
    this.bindings[action] = candidateKey;
    this.notify();
    return true;
  }

  matchesAction(e: KeyboardEvent, action: KeyAction): boolean {
    const bound = this.bindings[action];
    if (!bound) return false;

    // Check code directly (e.g. 'KeyW', 'Space')
    if (e.code === bound) return true;

    // Fallback checks for Shift/Ctrl/Alt generic comparisons
    if (bound === 'ShiftLeft' || bound === 'ShiftRight') {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') return true;
    }
    if (bound === 'ControlLeft' || bound === 'ControlRight') {
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') return true;
    }
    if (bound === 'AltLeft' || bound === 'AltRight') {
      if (e.code === 'AltLeft' || e.code === 'AltRight') return true;
    }

    // Default secondary fallbacks when using default bindings
    if (bound === DEFAULT_KEY_BINDINGS[action]) {
      if (action === 'moveForward' && e.code === 'ArrowUp') return true;
      if (action === 'moveBackward' && e.code === 'ArrowDown') return true;
      if (action === 'moveLeft' && e.code === 'ArrowLeft') return true;
      if (action === 'moveRight' && e.code === 'ArrowRight') return true;
      if (action === 'pauseSimulation' && (e.code === 'KeyP' || e.key === 'p' || e.key === 'P')) return true;
    }

    return false;
  }

  isActionActive(action: KeyAction): boolean {
    const bound = this.bindings[action];
    if (!bound) return false;

    if (this.activeKeys.has(bound)) return true;

    // Shift variants
    if (bound === 'ShiftLeft' || bound === 'ShiftRight') {
      if (this.activeKeys.has('ShiftLeft') || this.activeKeys.has('ShiftRight')) return true;
    }

    // Secondary arrow fallbacks for defaults
    if (bound === DEFAULT_KEY_BINDINGS[action]) {
      if (action === 'moveForward' && this.activeKeys.has('ArrowUp')) return true;
      if (action === 'moveBackward' && this.activeKeys.has('ArrowDown')) return true;
      if (action === 'moveLeft' && this.activeKeys.has('ArrowLeft')) return true;
      if (action === 'moveRight' && this.activeKeys.has('ArrowRight')) return true;
    }

    return false;
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (this.isInputElement(e.target)) return;
    this.activeKeys.add(e.code);
  }

  handleKeyUp(e: KeyboardEvent): void {
    this.activeKeys.delete(e.code);
  }

  resetActiveKeys(): void {
    this.activeKeys.clear();
  }

  isInputElement(target: EventTarget | null): boolean {
    if (!target) return false;
    if (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) return true;
    if (typeof HTMLTextAreaElement !== 'undefined' && target instanceof HTMLTextAreaElement) return true;
    if (typeof HTMLSelectElement !== 'undefined' && target instanceof HTMLSelectElement) return true;
    const el = target as HTMLElement;
    if (el) {
      const tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
    }
    return false;
  }

  subscribe(listener: (bindings: KeyBindings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = this.getAllBindings();
    for (const listener of this.listeners) {
      listener(copy);
    }
  }
}

export const inputManager = new InputManager();
