import React, { useState, useEffect } from 'react';
import { DroneThreatClass, THREAT_CATALOG, KeyAction } from '../../types';
import { TargetLockInfo } from '../../game/assessment/TargetTracker';
import { Crosshair, CheckCircle2, X } from 'lucide-react';
import { audio } from '../../game/assessment/AudioService';
import { inputManager, formatKeyDisplay } from '../../services/inputManager';

interface ClassificationDrawerProps {
  targetLock: TargetLockInfo;
  onSubmit: (submittedClass: DroneThreatClass, confidence: 'confirmed' | 'suspected') => void;
  onCancel: () => void;
}

export const ClassificationDrawer: React.FC<ClassificationDrawerProps> = ({
  targetLock,
  onSubmit,
  onCancel
}) => {
  const [selectedClass, setSelectedClass] = useState<DroneThreatClass>('quadcopter_surveillance');
  const [confidence, setConfidence] = useState<'confirmed' | 'suspected'>('confirmed');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'accepted'>('idle');

  const threatKeys: DroneThreatClass[] = [
    'quadcopter_surveillance',
    'fixed_wing_recon',
    'micro_uav',
    'civilian_toy'
  ];

  const archetypeActions: KeyAction[] = [
    'selectArchetype1',
    'selectArchetype2',
    'selectArchetype3',
    'selectArchetype4'
  ];

  // Hotkey support with inputManager, debounce, and e.repeat prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isSubmitting || inputManager.isInputElement(e.target)) return;

      if (inputManager.matchesAction(e, 'selectArchetype1')) {
        e.preventDefault();
        setSelectedClass('quadcopter_surveillance');
      } else if (inputManager.matchesAction(e, 'selectArchetype2')) {
        e.preventDefault();
        setSelectedClass('fixed_wing_recon');
      } else if (inputManager.matchesAction(e, 'selectArchetype3')) {
        e.preventDefault();
        setSelectedClass('micro_uav');
      } else if (inputManager.matchesAction(e, 'selectArchetype4')) {
        e.preventDefault();
        setSelectedClass('civilian_toy');
      } else if (inputManager.matchesAction(e, 'cancelDrawer')) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (inputManager.matchesAction(e, 'submitClassification')) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClass, confidence, isSubmitting, onCancel]);

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedbackStatus('accepted');
    audio.playClassificationSubmit();

    setTimeout(() => {
      onSubmit(selectedClass, confidence);
    }, 380);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(96vw, 680px)',
        maxHeight: '88dvh',
        overflowY: 'auto',
        zIndex: 50,
        pointerEvents: 'auto',
        border: feedbackStatus === 'accepted' ? '1px solid var(--color-success-green)' : '1px solid var(--color-border-subtle)',
        boxShadow: feedbackStatus === 'accepted' ? '0 0 32px rgba(92, 214, 143, 0.4)' : 'var(--shadow-elevation)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
      }}
      className="tactical-panel"
    >
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Crosshair size={20} color={feedbackStatus === 'accepted' ? 'var(--color-success-green)' : 'var(--color-accent-mint)'} />
          <div>
            <div className="tactical-header-tag">AERIAL CONTACT CLASSIFICATION</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              CONTACT TRACK: <span style={{ color: 'var(--color-accent-mint)' }}>{targetLock.callsign}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
            RNG: <strong style={{ color: 'var(--color-text-primary)' }}>{targetLock.distanceMeters}m</strong> | BRG: <strong style={{ color: 'var(--color-text-primary)' }}>{targetLock.bearingDeg}°</strong>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{ color: 'var(--color-text-muted)', display: 'flex', padding: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            title={`Cancel (${formatKeyDisplay(inputManager.getBinding('cancelDrawer'))})`}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <span>SELECT RECOGNITION ARCHETYPE:</span>
          {feedbackStatus === 'accepted' && (
            <span style={{ color: 'var(--color-success-green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ✓ CLASSIFICATION ACCEPTED & RECORDED
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '10px' }}>
          {threatKeys.map((key, idx) => {
            const meta = THREAT_CATALOG[key];
            const isSelected = selectedClass === key;
            const archetypeAction = archetypeActions[idx] || 'selectArchetype1';
            const keyLabel = formatKeyDisplay(inputManager.getBinding(archetypeAction));

            return (
              <div
                key={key}
                onClick={() => {
                  if (!isSubmitting) setSelectedClass(key);
                }}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: isSelected
                    ? feedbackStatus === 'accepted'
                      ? '1px solid var(--color-success-green)'
                      : '1px solid var(--color-accent-mint)'
                    : '1px solid rgba(141, 217, 192, 0.12)',
                  background: isSelected
                    ? feedbackStatus === 'accepted'
                      ? 'rgba(92, 214, 143, 0.18)'
                      : 'rgba(141, 217, 192, 0.12)'
                    : 'rgba(23, 35, 41, 0.6)',
                  cursor: isSubmitting ? 'default' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: isSelected ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)', fontWeight: isSelected ? 700 : 500 }}>
                    [{keyLabel}] {meta.category}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background:
                        meta.threatLevel === 'Severe'
                          ? 'rgba(217, 108, 108, 0.25)'
                          : meta.threatLevel === 'High'
                          ? 'rgba(230, 182, 92, 0.25)'
                          : 'rgba(108, 140, 138, 0.25)',
                      color:
                        meta.threatLevel === 'Severe'
                          ? 'var(--color-error-red)'
                          : meta.threatLevel === 'High'
                          ? 'var(--color-warning-amber)'
                          : 'var(--color-text-secondary)'
                    }}
                  >
                    {meta.threatLevel}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  {meta.displayName}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
                  {meta.visualIndicators[0]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confidence Selector & Confirm */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>CONFIDENCE:</span>
            <button
              onClick={() => {
                if (!isSubmitting) setConfidence('confirmed');
              }}
              className="tactical-btn"
              disabled={isSubmitting}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                borderColor: confidence === 'confirmed' ? 'var(--color-accent-mint)' : 'var(--color-border-subtle)',
                background: confidence === 'confirmed' ? 'rgba(141, 217, 192, 0.2)' : 'transparent'
              }}
            >
              Confirmed
            </button>
            <button
              onClick={() => {
                if (!isSubmitting) setConfidence('suspected');
              }}
              className="tactical-btn"
              disabled={isSubmitting}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                borderColor: confidence === 'suspected' ? 'var(--color-warning-amber)' : 'var(--color-border-subtle)',
                background: confidence === 'suspected' ? 'rgba(230, 182, 92, 0.2)' : 'transparent'
              }}
            >
              Suspected
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} disabled={isSubmitting} className="tactical-btn" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              Cancel ({formatKeyDisplay(inputManager.getBinding('cancelDrawer'))})
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`tactical-btn ${feedbackStatus === 'accepted' ? '' : 'tactical-btn-primary'}`}
              style={{
                padding: '8px 18px',
                fontSize: '0.8rem',
                background: feedbackStatus === 'accepted' ? 'var(--color-success-green)' : undefined,
                color: feedbackStatus === 'accepted' ? '#0c1417' : undefined
              }}
            >
              <CheckCircle2 size={16} /> {feedbackStatus === 'accepted' ? 'Recorded...' : `Submit (${formatKeyDisplay(inputManager.getBinding('submitClassification'))})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
