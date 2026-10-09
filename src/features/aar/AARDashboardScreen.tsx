import React, { useState } from 'react';
import {
  TrainingScore,
  TrainingSession,
  SimulationEvent,
  ScenarioDefinition,
  THREAT_CATALOG
} from '../../types';
import {
  ArrowLeft,
  Download
} from 'lucide-react';

interface AARDashboardScreenProps {
  session: TrainingSession;
  score: TrainingScore;
  events: SimulationEvent[];
  scenario: ScenarioDefinition;
  onBack: () => void;
  onMainMenu: () => void;
}

export const AARDashboardScreen: React.FC<AARDashboardScreenProps> = ({
  session,
  score,
  events,
  scenario,
  onBack,
  onMainMenu
}) => {
  const [selectedEvent, setSelectedEvent] = useState<SimulationEvent | null>(events[0] || null);
  const totalDuration = scenario.durationSeconds;

  const handleExportJson = () => {
    const data = {
      session,
      score,
      scenario: {
        id: scenario.id,
        name: scenario.name,
        difficulty: scenario.difficulty,
        targets: scenario.targets
      },
      events
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AAR_Session_${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEventBadge = (ev: SimulationEvent) => {
    switch (ev.eventType) {
      case 'TARGET_SPAWNED':
        return { color: 'var(--color-warning-amber)', label: 'SPAWN' };
      case 'TARGET_LOCK_ACQUIRED':
        return { color: 'var(--color-accent-mint)', label: 'LOCK' };
      case 'CLASSIFICATION_SUBMITTED':
        return { color: 'var(--color-success-green)', label: 'CLASSIFY' };
      case 'TARGET_DESPAWNED':
        return { color: 'var(--color-text-muted)', label: 'DESPAWN' };
      default:
        return { color: 'var(--color-teal-muted)', label: 'SYS' };
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0c1417 0%, #131f24 50%, #070c0e 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 24, 28, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            className="tactical-btn"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={16} /> BACK TO RESULTS
          </button>
          <div>
            <div className="tactical-header-tag">AFTER-ACTION REVIEW (AAR) DASHBOARD</div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              MISSION LOG: {session.id}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportJson}
            className="tactical-btn"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <Download size={15} /> EXPORT AAR DATA (JSON)
          </button>
          <button
            onClick={onMainMenu}
            className="tactical-btn tactical-btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.8rem' }}
          >
            MAIN MENU
          </button>
        </div>
      </header>

      {/* Main AAR Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '28px 48px',
          overflowY: 'auto'
        }}
      >
        {/* Timeline Visualization Panel */}
        <div className="tactical-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="tactical-header-tag">CHRONOLOGICAL EVENT TIMELINE</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Click any timeline node below to inspect telemetry and trainee actions.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning-amber)' }} />
                TARGET SPOTTED / SPAWN
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-mint)' }} />
                RETICLE LOCK
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success-green)' }} />
                CLASSIFICATION SUBMITTED
              </span>
            </div>
          </div>

          {/* Interactive Timeline Bar */}
          <div style={{ position: 'relative', width: '100%', height: '70px', marginTop: '20px' }}>
            {/* Horizontal Timeline Track */}
            <div
              style={{
                position: 'absolute',
                top: '28px',
                left: 0,
                right: 0,
                height: '4px',
                background: 'rgba(108, 140, 138, 0.25)',
                borderRadius: '2px'
              }}
            />

            {/* Time Ticks */}
            {[0, 20, 40, 60, 80, 100].map((percent) => (
              <div
                key={percent}
                style={{
                  position: 'absolute',
                  left: `${percent}%`,
                  top: '40px',
                  transform: 'translateX(-50%)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: 'var(--color-text-muted)'
                }}
              >
                {Math.round((percent / 100) * totalDuration)}s
              </div>
            ))}

            {/* Event Markers */}
            {events.map((ev) => {
              const sec = ev.simulationTimeMs / 1000;
              const leftPercent = Math.min(100, Math.max(0, (sec / totalDuration) * 100));
              const badge = getEventBadge(ev);
              const isSelected = selectedEvent?.id === ev.id;

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: '20px',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 15 : 10
                  }}
                  title={`T+${sec.toFixed(1)}s: ${ev.eventType}`}
                >
                  <div
                    style={{
                      width: isSelected ? '18px' : '12px',
                      height: isSelected ? '18px' : '12px',
                      borderRadius: '50%',
                      background: badge.color,
                      border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.5)',
                      boxShadow: isSelected ? '0 0 12px var(--color-accent-mint)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Selected Event Details Card */}
          {selectedEvent && (
            <div
              style={{
                marginTop: '16px',
                background: 'rgba(15, 24, 28, 0.7)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '6px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <div>
                <span style={{ color: 'var(--color-accent-mint)', fontWeight: 700 }}>
                  EVENT #{selectedEvent.sequenceNumber}
                </span>{' '}
                | TIMESTAMP:{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  T+{(selectedEvent.simulationTimeMs / 1000).toFixed(2)}s
                </strong>{' '}
                | TYPE: <strong style={{ color: 'var(--color-text-primary)' }}>{selectedEvent.eventType}</strong>
              </div>

              <div style={{ color: 'var(--color-text-secondary)' }}>
                {selectedEvent.payload.targetId && (
                  <span>
                    TARGET: <strong style={{ color: 'var(--color-accent-mint)' }}>{selectedEvent.payload.targetId}</strong>{' '}
                  </span>
                )}
                {selectedEvent.payload.submittedClass && (
                  <span>
                    SUBMITTED: <strong style={{ color: 'var(--color-success-green)' }}>{selectedEvent.payload.submittedClass}</strong>
                  </span>
                )}
                {selectedEvent.payload.distanceMeters && (
                  <span>
                    RANGE: <strong>{selectedEvent.payload.distanceMeters}m</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Diagnostic Notes & Instructor Audit Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Target Performance Table */}
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div className="tactical-header-tag" style={{ marginBottom: '14px' }}>
              GROUND TRUTH VS TRAINEE ACTION MATRIX
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <th style={{ padding: '8px' }}>TARGET</th>
                  <th style={{ padding: '8px' }}>ACTUAL CLASS</th>
                  <th style={{ padding: '8px' }}>REPORTED</th>
                  <th style={{ padding: '8px' }}>LATENCY</th>
                  <th style={{ padding: '8px' }}>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {score.targetAssessments.map((t) => (
                  <tr key={t.targetId} style={{ borderBottom: '1px solid rgba(141, 217, 192, 0.08)' }}>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent-mint)' }}>
                      {t.callsign}
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--color-text-primary)' }}>
                      {THREAT_CATALOG[t.expectedClass].displayName}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ color: t.isCorrect ? 'var(--color-success-green)' : 'var(--color-error-red)', fontWeight: 600 }}>
                        {t.classifiedAs ? THREAT_CATALOG[t.classifiedAs].category : 'NO REPORT'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>
                      {t.detectionLatencySec !== null ? `${t.detectionLatencySec.toFixed(1)}s` : 'MISSED'}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent-mint)' }}>
                      +{t.scoreContribution}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI / Instructor Diagnostic Notes */}
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div className="tactical-header-tag" style={{ marginBottom: '14px' }}>
              COGNITIVE DIAGNOSTIC RECOMMENDATIONS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {score.feedbackNotes.map((note, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(15, 24, 28, 0.65)',
                    borderLeft: '3px solid var(--color-accent-mint)',
                    borderRadius: '0 4px 4px 0',
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.45
                  }}
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
