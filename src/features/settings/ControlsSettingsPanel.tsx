import React, { useState, useEffect, useCallback } from 'react';
import { KeyAction, KeyBindings, DEFAULT_KEY_BINDINGS, UserSettings } from '../../types';
import {
  inputManager,
  formatKeyDisplay,
  ACTION_METADATA_LIST,
  CATEGORY_LABELS,
  ActionMetadata
} from '../../services/inputManager';
import {
  Keyboard,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  X,
  Sliders,
  Eye,
  Crosshair,
  Settings
} from 'lucide-react';

interface ControlsSettingsPanelProps {
  currentSettings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onSaveNotice?: () => void;
}

interface ConflictState {
  action: KeyAction;
  proposedKey: string;
  conflictingAction: KeyAction;
}

export const ControlsSettingsPanel: React.FC<ControlsSettingsPanelProps> = ({
  currentSettings,
  onUpdateSettings,
  onSaveNotice
}) => {
  const [bindings, setBindings] = useState<KeyBindings>(
    currentSettings.keyBindings || { ...DEFAULT_KEY_BINDINGS }
  );
  const [capturingAction, setCapturingAction] = useState<KeyAction | null>(null);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync state if currentSettings changes externally
  useEffect(() => {
    if (currentSettings.keyBindings) {
      setBindings(currentSettings.keyBindings);
      inputManager.setAllBindings(currentSettings.keyBindings);
    }
  }, [currentSettings.keyBindings]);

  const showFeedback = useCallback((msg: string) => {
    setFeedbackMessage(msg);
    if (onSaveNotice) onSaveNotice();
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, [onSaveNotice]);

  const persistBindings = useCallback((newBindings: KeyBindings, msg?: string) => {
    setBindings(newBindings);
    inputManager.setAllBindings(newBindings);
    const updatedSettings: UserSettings = {
      ...currentSettings,
      keyBindings: newBindings
    };
    onUpdateSettings(updatedSettings);
    if (msg) showFeedback(msg);
  }, [currentSettings, onUpdateSettings, showFeedback]);

  // Key-capture listener
  useEffect(() => {
    if (!capturingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore repeat keys
      if (e.repeat) return;

      e.preventDefault();
      e.stopPropagation();

      // Escape cancels key capture
      if (e.key === 'Escape' || e.code === 'Escape') {
        setCapturingAction(null);
        showFeedback('Key rebinding cancelled');
        return;
      }

      const rawCode = e.code || e.key;
      const targetAction = capturingAction;

      // Check conflict
      const conflict = inputManager.findConflict(targetAction, rawCode);
      if (conflict) {
        setConflictState({
          action: targetAction,
          proposedKey: rawCode,
          conflictingAction: conflict
        });
        setCapturingAction(null);
        return;
      }

      // No conflict: apply directly
      const actionMeta = ACTION_METADATA_LIST.find((m) => m.id === targetAction);
      const newBindings = {
        ...bindings,
        [targetAction]: rawCode
      };
      setCapturingAction(null);
      persistBindings(
        newBindings,
        `Bound "${actionMeta?.name || targetAction}" to ${formatKeyDisplay(rawCode)}`
      );
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [capturingAction, bindings, persistBindings, showFeedback]);

  // Conflict resolution handlers
  const handleResolveConflictReplace = () => {
    if (!conflictState) return;
    const { action, proposedKey, conflictingAction } = conflictState;

    const actionMeta = ACTION_METADATA_LIST.find((m) => m.id === action);
    const conflictingMeta = ACTION_METADATA_LIST.find((m) => m.id === conflictingAction);

    const newBindings: KeyBindings = {
      ...bindings,
      [conflictingAction]: '', // Clear the conflicting action
      [action]: proposedKey
    };

    setConflictState(null);
    persistBindings(
      newBindings,
      `Replaced binding: "${actionMeta?.name}" is now ${formatKeyDisplay(proposedKey)} (unassigned "${conflictingMeta?.name}")`
    );
  };

  const handleResolveConflictCancel = () => {
    setConflictState(null);
    showFeedback('Rebinding cancelled due to conflict');
  };

  // Reset single action
  const handleResetSingle = (action: KeyAction) => {
    const defaultKey = DEFAULT_KEY_BINDINGS[action];
    const actionMeta = ACTION_METADATA_LIST.find((m) => m.id === action);
    const newBindings = {
      ...bindings,
      [action]: defaultKey
    };
    persistBindings(
      newBindings,
      `Reset "${actionMeta?.name || action}" to default (${formatKeyDisplay(defaultKey)})`
    );
  };

  // Reset all to defaults
  const handleResetAll = () => {
    const defaults = { ...DEFAULT_KEY_BINDINGS };
    persistBindings(defaults, 'All key bindings reset to factory defaults');
  };

  const getCategoryIcon = (category: ActionMetadata['category']) => {
    switch (category) {
      case 'movement':
        return <Sliders size={16} color="var(--color-accent-mint)" />;
      case 'optics':
        return <Eye size={16} color="var(--color-accent-mint)" />;
      case 'classification':
        return <Crosshair size={16} color="var(--color-accent-mint)" />;
      case 'system':
        return <Settings size={16} color="var(--color-accent-mint)" />;
    }
  };

  const categories: Array<ActionMetadata['category']> = ['movement', 'optics', 'classification', 'system'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Controls Header Bar */}
      <div
        className="tactical-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Keyboard size={20} color="var(--color-accent-mint)" />
          <div>
            <div className="tactical-header-tag">KEYBOARD MAPPINGS</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Customize simulator input commands. Click REBIND or a key badge to reassign.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {feedbackMessage && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                color: 'var(--color-success-green)',
                background: 'rgba(92, 214, 143, 0.12)',
                border: '1px solid var(--color-success-green)',
                borderRadius: '4px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={14} /> {feedbackMessage}
            </div>
          )}

          <button
            onClick={handleResetAll}
            className="tactical-btn"
            style={{ padding: '8px 14px', fontSize: '0.78rem' }}
            title="Reset all bindings to default values"
          >
            <RotateCcw size={14} /> RESET ALL TO DEFAULTS
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 540px), 1fr))',
          gap: '20px'
        }}
      >
        {categories.map((category) => {
          const categoryActions = ACTION_METADATA_LIST.filter((m) => m.category === category);
          const categoryLabel = CATEGORY_LABELS[category];

          return (
            <div key={category} className="tactical-panel" style={{ padding: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  paddingBottom: '10px'
                }}
              >
                {getCategoryIcon(category)}
                <span className="tactical-header-tag" style={{ fontSize: '0.8rem' }}>
                  {categoryLabel}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categoryActions.map((actionMeta) => {
                  const currentBoundKey = bindings[actionMeta.id] || '';
                  const isDefault = currentBoundKey === DEFAULT_KEY_BINDINGS[actionMeta.id];
                  const isBeingCaptured = capturingAction === actionMeta.id;

                  return (
                    <div
                      key={actionMeta.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isBeingCaptured
                          ? 'rgba(141, 217, 192, 0.15)'
                          : 'rgba(15, 24, 28, 0.65)',
                        border: isBeingCaptured
                          ? '1px solid var(--color-accent-mint)'
                          : '1px solid var(--color-border-subtle)',
                        borderRadius: '6px',
                        transition: 'all 0.15s ease',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ maxWidth: '60%' }}>
                        <div
                          style={{
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)'
                          }}
                        >
                          {actionMeta.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-text-muted)',
                            marginTop: '2px'
                          }}
                        >
                          {actionMeta.description}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Key Badge Button */}
                        <button
                          onClick={() => setCapturingAction(actionMeta.id)}
                          disabled={capturingAction !== null}
                          aria-label={`Rebind ${actionMeta.name}. Current key is ${formatKeyDisplay(currentBoundKey)}`}
                          style={{
                            minWidth: '78px',
                            padding: '6px 12px',
                            background: isBeingCaptured
                              ? 'var(--color-accent-mint)'
                              : currentBoundKey
                              ? 'rgba(36, 57, 64, 0.95)'
                              : 'rgba(217, 108, 108, 0.2)',
                            color: isBeingCaptured
                              ? '#0c1417'
                              : currentBoundKey
                              ? 'var(--color-accent-mint)'
                              : 'var(--color-error-red)',
                            border: isBeingCaptured
                              ? '1px solid #ffffff'
                              : '1px solid var(--color-border-bright)',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: isBeingCaptured
                              ? '0 0 12px var(--color-accent-mint)'
                              : undefined,
                            transition: 'all 0.15s ease'
                          }}
                          title="Click to rebind"
                        >
                          {isBeingCaptured
                            ? 'PRESS KEY'
                            : currentBoundKey
                            ? formatKeyDisplay(currentBoundKey)
                            : 'NONE'}
                        </button>

                        {/* Rebind Button */}
                        <button
                          onClick={() => setCapturingAction(actionMeta.id)}
                          disabled={capturingAction !== null}
                          className="tactical-btn"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.72rem',
                            color: isBeingCaptured ? 'var(--color-accent-mint)' : undefined
                          }}
                          title={`Rebind key for ${actionMeta.name}`}
                        >
                          {isBeingCaptured ? 'LISTENING...' : 'REBIND'}
                        </button>

                        {/* Reset Single Action Button */}
                        {!isDefault && (
                          <button
                            onClick={() => handleResetSingle(actionMeta.id)}
                            className="tactical-btn"
                            style={{
                              padding: '6px 8px',
                              fontSize: '0.72rem',
                              color: 'var(--color-text-muted)'
                            }}
                            title={`Reset to default (${formatKeyDisplay(DEFAULT_KEY_BINDINGS[actionMeta.id])})`}
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Key-Capture Overlay Modal */}
      {capturingAction && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 14, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCapturingAction(null);
            }
          }}
        >
          <div
            className="tactical-panel"
            style={{
              width: 'min(94vw, 480px)',
              padding: '28px',
              textAlign: 'center',
              border: '1px solid var(--color-accent-mint)',
              boxShadow: '0 0 36px rgba(141, 217, 192, 0.25)'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                padding: '12px',
                borderRadius: '50%',
                background: 'rgba(141, 217, 192, 0.15)',
                marginBottom: '16px'
              }}
            >
              <Keyboard size={32} color="var(--color-accent-mint)" />
            </div>

            <div className="tactical-header-tag" style={{ marginBottom: '8px' }}>
              KEY CAPTURE ACTIVE
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: '6px'
              }}
            >
              PRESS ANY KEY TO BIND
            </h2>

            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-accent-mint)',
                fontFamily: 'var(--font-mono)',
                marginBottom: '16px'
              }}
            >
              TARGET ACTION:{' '}
              {ACTION_METADATA_LIST.find((m) => m.id === capturingAction)?.name.toUpperCase()}
            </p>

            <div
              style={{
                background: 'rgba(15, 24, 28, 0.8)',
                border: '1px dashed var(--color-border-bright)',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '20px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5
              }}
            >
              Waiting for input on keyboard...
              <br />
              <span style={{ color: 'var(--color-warning-amber)' }}>
                Press <strong>ESC</strong> to cancel without reassigning.
              </span>
            </div>

            <button
              onClick={() => {
                setCapturingAction(null);
                showFeedback('Key rebinding cancelled');
              }}
              className="tactical-btn"
              style={{ padding: '8px 24px', fontSize: '0.82rem' }}
            >
              <X size={14} /> CANCEL KEY CAPTURE (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {conflictState && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 14, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="tactical-panel"
            style={{
              width: 'min(94vw, 500px)',
              padding: '28px',
              border: '1px solid var(--color-warning-amber)',
              boxShadow: '0 0 36px rgba(230, 182, 92, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '50%',
                  background: 'rgba(230, 182, 92, 0.15)'
                }}
              >
                <AlertTriangle size={24} color="var(--color-warning-amber)" />
              </div>
              <div>
                <div
                  className="tactical-header-tag"
                  style={{ color: 'var(--color-warning-amber)' }}
                >
                  BINDING CONFLICT DETECTED
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>KEY ALREADY ASSIGNED</h3>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              Key{' '}
              <strong style={{ color: 'var(--color-accent-mint)', fontFamily: 'var(--font-mono)' }}>
                [{formatKeyDisplay(conflictState.proposedKey)}]
              </strong>{' '}
              is currently bound to:{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {ACTION_METADATA_LIST.find((m) => m.id === conflictState.conflictingAction)?.name ||
                  conflictState.conflictingAction}
              </strong>
              .
            </p>

            <div
              style={{
                background: 'rgba(15, 24, 28, 0.8)',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-subtle)',
                marginBottom: '20px',
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.4
              }}
            >
              Choosing <strong>Replace</strong> will assign this key to{' '}
              <span style={{ color: 'var(--color-accent-mint)' }}>
                {ACTION_METADATA_LIST.find((m) => m.id === conflictState.action)?.name}
              </span>{' '}
              and unassign it from the conflicting action.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={handleResolveConflictCancel}
                className="tactical-btn"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                CANCEL
              </button>
              <button
                onClick={handleResolveConflictReplace}
                className="tactical-btn tactical-btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem' }}
              >
                REPLACE EXISTING
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
