import React, { useState, useEffect } from 'react';
import { DroneThreatClass, THREAT_CATALOG } from '../../types';
import { TargetLockInfo } from '../../game/assessment/TargetTracker';
import { Crosshair, CheckCircle2, X } from 'lucide-react';
import { audio } from '../../game/assessment/AudioService';

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

  const threatKeys: DroneThreatClass[] = [
    'quadcopter_surveillance',
    'fixed_wing_recon',
    'micro_uav',
    'civilian_toy'
  ];

  // Hotkey support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setSelectedClass('quadcopter_surveillance');
      if (e.key === '2') setSelectedClass('fixed_wing_recon');
      if (e.key === '3') setSelectedClass('micro_uav');
      if (e.key === '4') setSelectedClass('civilian_toy');
      if (e.key === 'Escape') {
        onCancel();
      }
      if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClass, confidence]);

  const handleSubmit = () => {
    audio.playClassificationSubmit();
    onSubmit(selectedClass, confidence);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(94vw, 680px)',
        zIndex: 50,
        pointerEvents: 'auto'
      }}
      className="tactical-panel"
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Crosshair size={20} color="var(--color-accent-mint)" />
          <div>
            <div className="tactical-header-tag">AERIAL CONTACT CLASSIFICATION</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              CONTACT TRACK: <span style={{ color: 'var(--color-accent-mint)' }}>{targetLock.callsign}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            RNG: <strong style={{ color: 'var(--color-text-primary)' }}>{targetLock.distanceMeters}m</strong> | BRG: <strong style={{ color: 'var(--color-text-primary)' }}>{targetLock.bearingDeg}°</strong>
          </div>
          <button
            onClick={onCancel}
            style={{ color: 'var(--color-text-muted)', display: 'flex', padding: '4px' }}
            title="Cancel (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
          SELECT RECOGNITION ARCHETYPE (Keys 1–4):
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {threatKeys.map((key, idx) => {
            const meta = THREAT_CATALOG[key];
            const isSelected = selectedClass === key;

            return (
              <div
                key={key}
                onClick={() => setSelectedClass(key)}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: isSelected
                    ? '1px solid var(--color-accent-mint)'
                    : '1px solid rgba(141, 217, 192, 0.12)',
                  background: isSelected
                    ? 'rgba(141, 217, 192, 0.12)'
                    : 'rgba(23, 35, 41, 0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-accent-mint)' }}>
                    [{idx + 1}] {meta.category}
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
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
                  {meta.visualIndicators[0]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confidence Selector & Confirm */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>CONFIDENCE:</span>
            <button
              onClick={() => setConfidence('confirmed')}
              className="tactical-btn"
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
              onClick={() => setConfidence('suspected')}
              className="tactical-btn"
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
            <button onClick={onCancel} className="tactical-btn" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              Cancel (Esc)
            </button>
            <button
              onClick={handleSubmit}
              className="tactical-btn tactical-btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.8rem' }}
            >
              <CheckCircle2 size={16} /> Submit (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
