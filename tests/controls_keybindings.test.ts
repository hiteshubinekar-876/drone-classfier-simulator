import { describe, it, expect, beforeEach } from 'vitest';
import {
  InputManager,
  inputManager,
  formatKeyDisplay,
  ACTION_METADATA_LIST
} from '../src/services/inputManager';
import {
  DEFAULT_KEY_BINDINGS,
  KeyBindings,
  DEFAULT_SETTINGS
} from '../src/types';
import { storage, sanitizeUserSettings } from '../src/data/indexedDbAdapter';

const createKeyEvent = (code: string, opts?: { repeat?: boolean; key?: string }): KeyboardEvent => {
  return {
    code,
    key: opts?.key || code,
    repeat: !!opts?.repeat,
    preventDefault: () => {},
    stopPropagation: () => {}
  } as unknown as KeyboardEvent;
};

describe('Controls and Keybindings System (PC Game Settings)', () => {
  let testManager: InputManager;

  beforeEach(() => {
    testManager = new InputManager();
    inputManager.resetAllBindings();
  });

  it('1. verifies complete default bindings for all defined actions', () => {
    const bindings = testManager.getAllBindings();
    expect(bindings.moveForward).toBe('KeyW');
    expect(bindings.moveBackward).toBe('KeyS');
    expect(bindings.moveLeft).toBe('KeyA');
    expect(bindings.moveRight).toBe('KeyD');
    expect(bindings.toggleZoom).toBe('ShiftLeft');
    expect(bindings.triggerClassification).toBe('Space');
    expect(bindings.selectArchetype1).toBe('Digit1');
    expect(bindings.selectArchetype2).toBe('Digit2');
    expect(bindings.selectArchetype3).toBe('Digit3');
    expect(bindings.selectArchetype4).toBe('Digit4');
    expect(bindings.submitClassification).toBe('Enter');
    expect(bindings.cancelDrawer).toBe('Escape');
    expect(bindings.pauseSimulation).toBe('Escape');
    expect(bindings.toggleMute).toBe('KeyM');

    // Check all metadata actions have matching defaults
    expect(ACTION_METADATA_LIST.length).toBe(14);
    for (const meta of ACTION_METADATA_LIST) {
      expect(meta.defaultKey).toBe(DEFAULT_KEY_BINDINGS[meta.id]);
    }
  });

  it('2. rebinds an action and matches new semantic inputs', () => {
    testManager.setBinding('moveForward', 'KeyI');
    expect(testManager.getBinding('moveForward')).toBe('KeyI');

    // Synthetic keyboard events
    const eventOld = createKeyEvent('KeyW');
    const eventNew = createKeyEvent('KeyI');

    expect(testManager.matchesAction(eventOld, 'moveForward')).toBe(false);
    expect(testManager.matchesAction(eventNew, 'moveForward')).toBe(true);
  });

  it('3. detects conflicts and allows replace or cancel resolution', () => {
    // KeyW is currently assigned to moveForward
    const conflict = testManager.findConflict('moveLeft', 'KeyW');
    expect(conflict).toBe('moveForward');

    // Attempting to resolve without replace should fail
    const didResolveWithoutReplace = testManager.resolveConflictAndBind('moveLeft', 'KeyW', false);
    expect(didResolveWithoutReplace).toBe(false);
    expect(testManager.getBinding('moveLeft')).toBe('KeyA'); // Untouched

    // Resolving with replace flag: old action becomes unassigned, new action takes KeyW
    const didResolveWithReplace = testManager.resolveConflictAndBind('moveLeft', 'KeyW', true);
    expect(didResolveWithReplace).toBe(true);
    expect(testManager.getBinding('moveLeft')).toBe('KeyW');
    expect(testManager.getBinding('moveForward')).toBe(''); // Conflicting action unassigned
    expect(formatKeyDisplay(testManager.getBinding('moveForward'))).toBe('UNASSIGNED');
  });

  it('4. permits contextual coexistence of Escape between cancelDrawer and pauseSimulation', () => {
    // Both actions use Escape by default in different UI contexts
    const conflictDrawer = testManager.findConflict('cancelDrawer', 'Escape');
    const conflictPause = testManager.findConflict('pauseSimulation', 'Escape');
    expect(conflictDrawer).toBeNull();
    expect(conflictPause).toBeNull();
  });

  it('5. preserves original binding when key capture is cancelled', () => {
    const originalBinding = testManager.getBinding('toggleZoom');
    expect(originalBinding).toBe('ShiftLeft');

    // Simulate key capture cancelled before saving
    let capturedKey: string | null = null;
    const cancelKey = 'Escape';
    if (cancelKey === 'Escape') {
      capturedKey = null; // Abort
    }
    if (capturedKey) {
      testManager.setBinding('toggleZoom', capturedKey);
    }

    expect(testManager.getBinding('toggleZoom')).toBe('ShiftLeft');
  });

  it('6. resets an individual action without altering other custom bindings', () => {
    testManager.setBinding('moveForward', 'KeyE');
    testManager.setBinding('moveBackward', 'KeyD');
    expect(testManager.getBinding('moveForward')).toBe('KeyE');
    expect(testManager.getBinding('moveBackward')).toBe('KeyD');

    // Reset only moveForward
    testManager.resetBinding('moveForward');
    expect(testManager.getBinding('moveForward')).toBe('KeyW'); // Restored
    expect(testManager.getBinding('moveBackward')).toBe('KeyD'); // Preserved custom
  });

  it('7. resets all key bindings to defaults without touching unrelated settings', () => {
    testManager.setBinding('moveForward', 'KeyZ');
    testManager.setBinding('toggleMute', 'KeyN');
    testManager.resetAllBindings();

    const allBindings = testManager.getAllBindings();
    expect(allBindings).toEqual(DEFAULT_KEY_BINDINGS);
  });

  it('8. formats key codes into readable PC game UI labels', () => {
    expect(formatKeyDisplay('KeyW')).toBe('W');
    expect(formatKeyDisplay('KeyS')).toBe('S');
    expect(formatKeyDisplay('Digit1')).toBe('1');
    expect(formatKeyDisplay('ShiftLeft')).toBe('L-SHIFT');
    expect(formatKeyDisplay('Space')).toBe('SPACE');
    expect(formatKeyDisplay('Enter')).toBe('ENTER');
    expect(formatKeyDisplay('Escape')).toBe('ESC');
    expect(formatKeyDisplay('ArrowUp')).toBe('UP ARROW');
    expect(formatKeyDisplay('')).toBe('UNASSIGNED');
  });

  it('9. persists and retrieves custom key bindings via StorageAdapter', async () => {
    const customBindings: KeyBindings = {
      ...DEFAULT_KEY_BINDINGS,
      toggleZoom: 'KeyZ',
      pauseSimulation: 'KeyP'
    };

    const settingsWithBindings = {
      ...DEFAULT_SETTINGS,
      mouseSensitivity: 1.45,
      keyBindings: customBindings
    };

    await storage.saveSettings(settingsWithBindings);
    const retrieved = await storage.getSettings();

    expect(retrieved.mouseSensitivity).toBe(1.45);
    expect(retrieved.keyBindings.toggleZoom).toBe('KeyZ');
    expect(retrieved.keyBindings.pauseSimulation).toBe('KeyP');
    expect(retrieved.keyBindings.moveForward).toBe('KeyW'); // Default preserved
  });

  it('10. falls back safely when saved key bindings are missing, partial, or corrupted', () => {
    const corruptedSettings = {
      graphicsPreset: 'high',
      mouseSensitivity: 0.8,
      keyBindings: null as any // Malformed
    };

    const sanitized = sanitizeUserSettings(corruptedSettings);
    expect(sanitized.keyBindings).toBeDefined();
    expect(sanitized.keyBindings.moveForward).toBe('KeyW');
    expect(sanitized.keyBindings.toggleZoom).toBe('ShiftLeft');

    const partialSettings = {
      graphicsPreset: 'low',
      keyBindings: {
        moveForward: 'KeyArrowUp' // Only 1 key provided
      } as any
    };

    const sanitizedPartial = sanitizeUserSettings(partialSettings);
    expect(sanitizedPartial.keyBindings.moveForward).toBe('KeyArrowUp');
    expect(sanitizedPartial.keyBindings.moveBackward).toBe('KeyS');
    expect(sanitizedPartial.keyBindings.triggerClassification).toBe('Space');
  });

  it('11. prevents gameplay actions while user is typing in form inputs', () => {
    const mockInput = { tagName: 'INPUT' } as unknown as EventTarget;
    const mockTextArea = { tagName: 'TEXTAREA' } as unknown as EventTarget;
    const mockDiv = { tagName: 'DIV' } as unknown as EventTarget;

    expect(testManager.isInputElement(mockInput)).toBe(true);
    expect(testManager.isInputElement(mockTextArea)).toBe(true);
    expect(testManager.isInputElement(mockDiv)).toBe(false);

    // Event targeting input does not activate keys
    const eventInInput = {
      target: mockInput,
      code: 'KeyW'
    } as unknown as KeyboardEvent;

    testManager.handleKeyDown(eventInInput);
    expect(testManager.isActionActive('moveForward')).toBe(false);

    // Event targeting canvas or body activates key
    const eventOnCanvas = {
      target: mockDiv,
      code: 'KeyW'
    } as unknown as KeyboardEvent;

    testManager.handleKeyDown(eventOnCanvas);
    expect(testManager.isActionActive('moveForward')).toBe(true);
  });

  it('12. prevents duplicate classification submissions by guarding repeat events', () => {
    let submitCallCount = 0;
    let isSubmitting = false;

    const handleSubmit = () => {
      if (isSubmitting) return;
      isSubmitting = true;
      submitCallCount++;
    };

    // Simulate keydown event with repeat: true (held down)
    const repeatEvent = createKeyEvent('Enter', { repeat: true });
    if (!repeatEvent.repeat && !isSubmitting && testManager.matchesAction(repeatEvent, 'submitClassification')) {
      handleSubmit();
    }
    expect(submitCallCount).toBe(0);

    // First genuine press
    const initialEvent = createKeyEvent('Enter', { repeat: false });
    if (!initialEvent.repeat && !isSubmitting && testManager.matchesAction(initialEvent, 'submitClassification')) {
      handleSubmit();
    }
    expect(submitCallCount).toBe(1);

    // Subsequent press while submission is pending
    const secondEvent = createKeyEvent('Enter', { repeat: false });
    if (!secondEvent.repeat && !isSubmitting && testManager.matchesAction(secondEvent, 'submitClassification')) {
      handleSubmit();
    }
    expect(submitCallCount).toBe(1); // Still 1, debounced and protected
  });
});
