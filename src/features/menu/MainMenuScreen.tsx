import React, { useState, useEffect } from 'react';
import {
  Crosshair,
  Play,
  History,
  Settings,
  BookOpen,
  Award,
  TrendingUp,
  Shield,
  ChevronRight,
  Info
} from 'lucide-react';
import { storage } from '../../data/indexedDbAdapter';
import { TrainingSession, THREAT_CATALOG } from '../../types';

interface MainMenuScreenProps {
  onStartTraining: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  onStartTraining,
  onOpenHistory,
  onOpenSettings
}) => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const allSessions = await storage.getAllSessions();
        setSessions(allSessions);

        if (allSessions.length > 0) {
          let scoreSum = 0;
          let scoredCount = 0;
          for (const s of allSessions) {
            const sc = await storage.getScore(s.id);
            if (sc) {
              scoreSum += sc.totalScore;
              scoredCount++;
            }
          }
          if (scoredCount > 0) {
            setAvgScore(Math.round(scoreSum / scoredCount));
          }
        }
      } catch (e) {
        console.warn('Failed to load menu stats:', e);
      }
    };

    loadStats();
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0c1417 0%, #131f24 50%, #091013 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Top Tactical Command Header */}
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
          background: 'rgba(15, 24, 28, 0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Crosshair size={24} color="var(--color-accent-mint)" />
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-primary)' }}>
              VIRTUAL DRONE-THREAT TRAINING SIMULATOR
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-teal-muted)', letterSpacing: '0.08em' }}>
              TACTICAL OBSERVATION & CLASSIFICATION FACILITY
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(141, 217, 192, 0.08)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
            <Shield size={14} color="var(--color-accent-mint)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-primary)' }}>
              STATUS: <strong style={{ color: 'var(--color-accent-mint)' }}>ONLINE (STANDALONE)</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '24px',
          padding: 'clamp(20px, 3vw, 40px)',
          overflowY: 'auto',
          zIndex: 10
        }}
      >
        {/* Left Column: Primary Navigation Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="tactical-header-tag" style={{ marginBottom: '4px' }}>
            TACTICAL SIMULATOR MODULES
          </div>

          {/* Start Training Button Card */}
          <div
            onClick={onStartTraining}
            className="tactical-panel"
            style={{
              padding: '24px',
              cursor: 'pointer',
              border: '1px solid var(--color-accent-mint)',
              background: 'linear-gradient(135deg, rgba(141, 217, 192, 0.12) 0%, rgba(27, 43, 48, 0.8) 100%)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'var(--color-accent-mint)', color: '#0c1417', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={22} fill="#0c1417" />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-accent-mint)', background: 'rgba(141, 217, 192, 0.2)', padding: '2px 8px', borderRadius: '3px' }}>
                PRIMARY
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              START TRAINING
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Select from curated observation scenarios, review target flight envelopes, and conduct 3D classification exercises.
            </p>
          </div>

          {/* Session History & AAR Button Card */}
          <div
            onClick={onOpenHistory}
            className="tactical-panel"
            style={{ padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'rgba(108, 140, 138, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={20} color="var(--color-accent-mint)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>SESSION HISTORY & AAR</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    Review chronological timeline logs and accuracy breakdowns.
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="var(--color-text-muted)" />
            </div>
          </div>

          {/* Threat Recognition Catalog Button Card */}
          <div
            onClick={() => setShowDossierModal(true)}
            className="tactical-panel"
            style={{ padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'rgba(108, 140, 138, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={20} color="var(--color-accent-mint)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>RECOGNITION DOSSIER</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    Study silhouettes of quadcopters, fixed-wing UAVs, and nano drones.
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="var(--color-text-muted)" />
            </div>
          </div>

          {/* Simulator Settings Button Card */}
          <div
            onClick={onOpenSettings}
            className="tactical-panel"
            style={{ padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'rgba(108, 140, 138, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={20} color="var(--color-accent-mint)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>SIMULATOR SETTINGS</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    Adjust graphics quality presets, camera FOV, and controls.
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="var(--color-text-muted)" />
            </div>
          </div>
        </div>

        {/* Right Column: Performance Analytics Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="tactical-header-tag">TRAINEE PERFORMANCE RECORD</div>

          {/* Stats Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="tactical-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-teal-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                <Award size={16} /> COMPLETED SESSIONS
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '8px' }}>
                {sessions.length}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Persistent in IndexedDB
              </div>
            </div>

            <div className="tactical-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-teal-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                <TrendingUp size={16} /> MEAN ACCURACY SCORE
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: avgScore >= 70 ? 'var(--color-success-green)' : 'var(--color-accent-mint)', marginTop: '8px' }}>
                {sessions.length > 0 ? `${avgScore}%` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Passing threshold: 70%
              </div>
            </div>
          </div>

          {/* Operational Scope & Curriculum Card */}
          <div className="tactical-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Info size={18} color="var(--color-accent-mint)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>COGNITIVE TRAINING OBJECTIVES</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              This simulator trains air defense observers and security personnel on early visual acquisition and correct classification of asymmetric aerial threats. Trainees learn to spot visual tells such as rotor configurations, delta-wing trajectories, and commercial toy decoys under varied atmospheric conditions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px', marginTop: 'auto' }}>
              <div style={{ background: 'rgba(15, 24, 28, 0.6)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-accent-mint)', fontWeight: 700 }}>
                  01 // DETECTION SPEED
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Acquire aerial targets within 4 seconds of horizon emergence.
                </div>
              </div>

              <div style={{ background: 'rgba(15, 24, 28, 0.6)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-accent-mint)', fontWeight: 700 }}>
                  02 // SILHOUETTE DISCRIMINATION
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Distinguish tactical surveillance UAVs from harmless civilian toys.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recognition Dossier Modal */}
      {showDossierModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 16, 19, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div className="tactical-panel" style={{ width: 'min(92vw, 820px)', maxHeight: '85vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '16px' }}>
              <div>
                <div className="tactical-header-tag">INTELLIGENCE BRIEF</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>AERIAL THREAT RECOGNITION CATALOG</h2>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="tactical-btn"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                CLOSE
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
              {Object.values(THREAT_CATALOG).map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(15, 24, 28, 0.7)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-accent-mint)' }}>
                      CATEGORY: {item.category}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        background:
                          item.threatLevel === 'Severe'
                            ? 'rgba(217,108,108,0.25)'
                            : item.threatLevel === 'High'
                            ? 'rgba(230,182,92,0.25)'
                            : 'rgba(108,140,138,0.25)',
                        color:
                          item.threatLevel === 'Severe'
                            ? 'var(--color-error-red)'
                            : item.threatLevel === 'High'
                            ? 'var(--color-warning-amber)'
                            : 'var(--color-text-secondary)'
                      }}
                    >
                      {item.threatLevel} THREAT
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                    {item.displayName}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                    {item.description}
                  </p>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                    PRIMARY IDENTIFICATION CUES:
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '0.76rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    {item.visualIndicators.map((cue, idx) => (
                      <li key={idx}>{cue}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
