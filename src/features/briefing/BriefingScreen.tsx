import React from 'react';
import { ScenarioDefinition, THREAT_CATALOG } from '../../types';
import {
  ArrowLeft,
  Play
} from 'lucide-react';
import { inputManager, formatKeyDisplay } from '../../services/inputManager';

interface BriefingScreenProps {
  scenario: ScenarioDefinition;
  onCommence: () => void;
  onBack: () => void;
}

export const BriefingScreen: React.FC<BriefingScreenProps> = ({
  scenario,
  onCommence,
  onBack
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0c1417 0%, #131f24 50%, #070c0e 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          minHeight: '64px',
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '12px clamp(16px, 3vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(15, 24, 28, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            className="tactical-btn"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={16} /> ABORT TO SELECTION
          </button>
          <div>
            <div className="tactical-header-tag">PRE-SIMULATION MISSION DOSSIER</div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>BRIEFING: {scenario.codename}</h1>
          </div>
        </div>

        <button
          onClick={onCommence}
          className="tactical-btn tactical-btn-primary"
          style={{ padding: '10px 24px', fontSize: '0.88rem' }}
        >
          <Play size={16} fill="#0c1417" /> COMMENCE SIMULATION
        </button>
      </header>

      {/* Main Content Layout */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '24px',
          padding: 'clamp(20px, 3vw, 40px)',
          overflowY: 'auto'
        }}
      >
        {/* Left Column: Mission Overview & Target Intel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="tactical-header-tag">EXERCISE PROFILE</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  background: 'rgba(141, 217, 192, 0.15)',
                  color: 'var(--color-accent-mint)'
                }}
              >
                {scenario.difficulty.toUpperCase()} TIER
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
              {scenario.name}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              {scenario.description}
            </p>

            {/* Mission Key Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(15, 24, 28, 0.6)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>DURATION</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {scenario.durationSeconds}s
                </div>
              </div>

              <div style={{ background: 'rgba(15, 24, 28, 0.6)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>TARGET COUNT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-mint)', marginTop: '2px' }}>
                  {scenario.targets.length} CONTACTS
                </div>
              </div>

              <div style={{ background: 'rgba(15, 24, 28, 0.6)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>ATMOSPHERE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-warning-amber)', marginTop: '2px', textTransform: 'capitalize' }}>
                  {scenario.timeOfDay}
                </div>
              </div>
            </div>
          </div>

          {/* Expected Aerial Signatures */}
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div className="tactical-header-tag" style={{ marginBottom: '12px' }}>
              INTEL BRIEF: SCHEDULED AERIAL SIGNATURES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scenario.targets.map((tgt, idx) => {
                const meta = THREAT_CATALOG[tgt.threatClass];

                return (
                  <div
                    key={tgt.id}
                    style={{
                      background: 'rgba(15, 24, 28, 0.6)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '6px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-accent-mint)', fontWeight: 700 }}>
                          CONTACT 0{idx + 1}: {tgt.callsign}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          (Flight: {tgt.flightProfile.replace('_', ' ')})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                        {meta.displayName}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Window: T+{tgt.spawnTimeSec}s to T+{tgt.despawnTimeSec}s
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          background:
                            meta.threatLevel === 'Severe'
                              ? 'rgba(217,108,108,0.25)'
                              : meta.threatLevel === 'High'
                              ? 'rgba(230,182,92,0.25)'
                              : 'rgba(108,140,138,0.25)',
                          color:
                            meta.threatLevel === 'Severe'
                              ? 'var(--color-error-red)'
                              : meta.threatLevel === 'High'
                              ? 'var(--color-warning-amber)'
                              : 'var(--color-text-secondary)'
                        }}
                      >
                        {meta.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Controls Schematics & Engagement Criteria */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div className="tactical-header-tag" style={{ marginBottom: '14px' }}>
              SIMULATOR CONTROLS REFERENCE
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {[
                {
                  key: `${formatKeyDisplay(inputManager.getBinding('moveForward'))} / ${formatKeyDisplay(inputManager.getBinding('moveLeft'))} / ${formatKeyDisplay(inputManager.getBinding('moveBackward'))} / ${formatKeyDisplay(inputManager.getBinding('moveRight'))}`,
                  desc: 'Walk and reposition inside observation post'
                },
                { key: 'MOUSE', desc: 'Free-look pan and pitch angle' },
                {
                  key: `${formatKeyDisplay(inputManager.getBinding('toggleZoom'))} or RMB`,
                  desc: 'Engage 3.2x Binocular Zoom magnification'
                },
                {
                  key: `${formatKeyDisplay(inputManager.getBinding('triggerClassification'))} or CLICK`,
                  desc: 'Acquire crosshair lock & trigger Classification'
                },
                {
                  key: `${formatKeyDisplay(inputManager.getBinding('selectArchetype1'))} – ${formatKeyDisplay(inputManager.getBinding('selectArchetype4'))}`,
                  desc: 'Rapid threat archetype selection hotkeys'
                },
                {
                  key: `${formatKeyDisplay(inputManager.getBinding('pauseSimulation'))}`,
                  desc: 'Pause simulation / open tactical options'
                }
              ].map((c) => (
                <div
                  key={c.desc}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'rgba(15, 24, 28, 0.7)',
                    border: '1px solid rgba(141, 217, 192, 0.1)'
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-accent-mint)' }}>
                    {c.key}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Criteria Card */}
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div className="tactical-header-tag" style={{ marginBottom: '12px' }}>
              DETERMINISTIC EVALUATION METRICS
            </div>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', paddingLeft: '18px', lineHeight: 1.4 }}>
              <li><strong>Classification Accuracy (50 pts):</strong> Correctly identifying the drone's aerodynamic class.</li>
              <li><strong>Detection Latency (30 pts):</strong> Speed in acquiring visual contact upon emergence.</li>
              <li><strong>Tracking Coverage (20 pts):</strong> Maintaining reticle lock on target flight path.</li>
              <li><strong>False Alarm Penalty (-10 pts):</strong> Submitting guesses without verified aerial targets.</li>
            </ul>

            <div style={{ marginTop: '24px' }}>
              <button
                onClick={onCommence}
                className="tactical-btn tactical-btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '0.92rem' }}
              >
                <Play size={18} fill="#0c1417" /> COMMENCE TRAINING SCENARIO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
