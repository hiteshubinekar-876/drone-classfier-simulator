import React, { useState, useEffect } from 'react';
import { TrainingSession, TrainingScore, SimulationEvent } from '../../types';
import { storage } from '../../data/indexedDbAdapter';
import {
  ArrowLeft,
  History,
  Trash2,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface SessionHistoryScreenProps {
  onInspectSessionAAR: (session: TrainingSession, score: TrainingScore, events: SimulationEvent[]) => void;
  onBack: () => void;
}

export const SessionHistoryScreen: React.FC<SessionHistoryScreenProps> = ({
  onInspectSessionAAR,
  onBack
}) => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [scores, setScores] = useState<Map<string, TrainingScore>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allSessions = await storage.getAllSessions();
      setSessions(allSessions);

      const scoreMap = new Map<string, TrainingScore>();
      for (const s of allSessions) {
        const sc = await storage.getScore(s.id);
        if (sc) {
          scoreMap.set(s.id, sc);
        }
      }
      setScores(scoreMap);
    } catch (e) {
      console.warn('Failed to load session history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspect = async (session: TrainingSession) => {
    try {
      const score = await storage.getScore(session.id);
      const events = await storage.getEvents(session.id);

      if (score) {
        onInspectSessionAAR(session, score, events);
      }
    } catch (e) {
      console.warn('Error loading session details for AAR:', e);
    }
  };

  const handleClearHistory = async () => {
    await storage.clearAllData();
    setSessions([]);
    setScores(new Map());
    setShowClearConfirm(false);
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
            <ArrowLeft size={16} /> MAIN MENU
          </button>
          <div>
            <div className="tactical-header-tag">LOCAL RECORD REPOSITORY</div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>SESSION HISTORY & AUDIT LOGS</h1>
          </div>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="tactical-btn tactical-btn-danger"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <Trash2 size={15} /> PURGE HISTORY
          </button>
        )}
      </header>

      {/* Main Table Content */}
      <div style={{ flex: 1, padding: '36px 48px', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '80px', fontFamily: 'var(--font-mono)' }}>
            LOADING INDEXEDDB SESSIONS...
          </div>
        ) : sessions.length === 0 ? (
          <div className="tactical-panel" style={{ padding: '48px', textAlign: 'center', maxWidth: '540px', margin: '40px auto' }}>
            <History size={38} color="var(--color-teal-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>NO SESSIONS RECORDED</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Complete a 3D observation training exercise to generate session logs and after-action review timelines.
            </p>
          </div>
        ) : (
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <th style={{ padding: '12px' }}>DATE / TIME</th>
                  <th style={{ padding: '12px' }}>SCENARIO</th>
                  <th style={{ padding: '12px' }}>DIFFICULTY</th>
                  <th style={{ padding: '12px' }}>STATUS</th>
                  <th style={{ padding: '12px' }}>SCORE</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((sess) => {
                  const score = scores.get(sess.id);
                  const dateStr = new Date(sess.startedAt).toLocaleString();

                  return (
                    <tr
                      key={sess.id}
                      style={{ borderBottom: '1px solid rgba(141, 217, 192, 0.08)', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {sess.scenarioName}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            background: 'rgba(141, 217, 192, 0.12)',
                            color: 'var(--color-accent-mint)'
                          }}
                        >
                          {sess.difficulty.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        {sess.status.toUpperCase()}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {score ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.95rem', color: score.passed ? 'var(--color-success-green)' : 'var(--color-error-red)' }}>
                              {score.totalScore}%
                            </strong>
                            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                              [{score.rating}]
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        {score && (
                          <button
                            onClick={() => handleInspect(sess)}
                            className="tactical-btn"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            <Eye size={14} /> VIEW AAR
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 16, 19, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div className="tactical-panel" style={{ width: '420px', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <AlertTriangle size={32} color="var(--color-error-red)" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>PURGE ALL SESSION RECORDS?</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                This will delete all saved sessions, scores, and event timelines from IndexedDB. This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="tactical-btn"
                style={{ flex: 1, padding: '10px' }}
              >
                CANCEL
              </button>
              <button
                onClick={handleClearHistory}
                className="tactical-btn tactical-btn-danger"
                style={{ flex: 1, padding: '10px' }}
              >
                CONFIRM PURGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
