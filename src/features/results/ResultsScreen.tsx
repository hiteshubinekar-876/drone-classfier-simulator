import React from 'react';
import { TrainingScore, TrainingSession, ScenarioDefinition, THREAT_CATALOG } from '../../types';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Home
} from 'lucide-react';

interface ResultsScreenProps {
  score: TrainingScore;
  session: TrainingSession;
  scenario: ScenarioDefinition;
  onOpenAAR: () => void;
  onRetry: () => void;
  onMainMenu: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  score,
  session,
  scenario,
  onOpenAAR,
  onRetry,
  onMainMenu
}) => {
  const getBadgeStyle = () => {
    switch (score.rating) {
      case 'EXEMPLARY':
        return {
          bg: 'rgba(92, 214, 143, 0.15)',
          border: 'var(--color-success-green)',
          color: 'var(--color-success-green)',
          label: 'EXEMPLARY PERFORMANCE'
        };
      case 'QUALIFIED':
        return {
          bg: 'rgba(141, 217, 192, 0.15)',
          border: 'var(--color-accent-mint)',
          color: 'var(--color-accent-mint)',
          label: 'QUALIFIED'
        };
      case 'NEEDS_REMEDIATION':
      default:
        return {
          bg: 'rgba(217, 108, 108, 0.15)',
          border: 'var(--color-error-red)',
          color: 'var(--color-error-red)',
          label: 'REMEDIATION REQUIRED'
        };
    }
  };

  const badge = getBadgeStyle();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Award size={22} color="var(--color-accent-mint)" />
          <div>
            <div className="tactical-header-tag">ASSESSMENT COMPLETED</div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              MISSION RESULTS: {scenario.codename} ({session.id.slice(0, 10)})
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onRetry}
            className="tactical-btn"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <RotateCcw size={15} /> RETRY SCENARIO
          </button>
          <button
            onClick={onOpenAAR}
            className="tactical-btn tactical-btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.8rem' }}
          >
            AFTER-ACTION REVIEW (AAR) <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* Main Results Grid */}
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
        {/* Left Column: Overall Score & Rating */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="tactical-panel" style={{ padding: '28px', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '4px 14px',
                borderRadius: '4px',
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                color: badge.color,
                marginBottom: '16px'
              }}
            >
              {badge.label}
            </div>

            {/* Score Ring Display */}
            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 16px' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke={badge.color}
                  strokeWidth="12"
                  strokeDasharray="440"
                  strokeDashoffset={440 - (440 * score.totalScore) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  {score.totalScore}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  OUT OF 100
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Deterministic scoring version <strong>{score.scoringVersion}</strong>. Trainee evaluated against ground-truth contact appearances.
            </p>
          </div>

          {/* Breakdown Bars Card */}
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div className="tactical-header-tag" style={{ marginBottom: '16px' }}>
              SCORE CONTRIBUTION BREAKDOWN
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  <span>CLASSIFICATION ACCURACY</span>
                  <strong style={{ color: 'var(--color-accent-mint)' }}>
                    {score.breakdown.classificationAccuracyScore} / 50 PTS
                  </strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(score.breakdown.classificationAccuracyScore / 50) * 100}%`, height: '100%', background: 'var(--color-accent-mint)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  <span>DETECTION LATENCY</span>
                  <strong style={{ color: 'var(--color-accent-mint)' }}>
                    {score.breakdown.detectionLatencyScore} / 30 PTS
                  </strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(score.breakdown.detectionLatencyScore / 30) * 100}%`, height: '100%', background: 'var(--color-teal-muted)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  <span>TRACKING COVERAGE</span>
                  <strong style={{ color: 'var(--color-accent-mint)' }}>
                    {score.breakdown.trackingCoverageScore} / 20 PTS
                  </strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(score.breakdown.trackingCoverageScore / 20) * 100}%`, height: '100%', background: 'var(--color-warning-amber)' }} />
                </div>
              </div>

              {score.breakdown.falseAlarmPenalty > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--color-error-red)', paddingTop: '6px', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <span>FALSE ALARM PENALTY</span>
                  <strong>-{score.breakdown.falseAlarmPenalty} PTS</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Target-by-Target Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="tactical-panel" style={{ padding: '24px' }}>
            <div className="tactical-header-tag" style={{ marginBottom: '16px' }}>
              AERIAL CONTACT AUDIT TABLE
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {score.targetAssessments.map((t) => {
                const expectedMeta = THREAT_CATALOG[t.expectedClass];

                return (
                  <div
                    key={t.targetId}
                    style={{
                      background: 'rgba(15, 24, 28, 0.65)',
                      border: t.isCorrect
                        ? '1px solid rgba(92, 214, 143, 0.3)'
                        : '1px solid rgba(217, 108, 108, 0.3)',
                      borderRadius: '6px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {t.isCorrect ? (
                        <CheckCircle2 size={24} color="var(--color-success-green)" />
                      ) : (
                        <XCircle size={24} color="var(--color-error-red)" />
                      )}
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-accent-mint)', fontWeight: 700 }}>
                          CONTACT: {t.callsign}
                        </div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          Ground Truth: {expectedMeta.displayName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Reported As:{' '}
                          <strong style={{ color: t.isCorrect ? 'var(--color-success-green)' : 'var(--color-error-red)' }}>
                            {t.classifiedAs ? THREAT_CATALOG[t.classifiedAs].displayName : 'MISSED (NO REPORT)'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        LATENCY: <strong style={{ color: 'var(--color-text-primary)' }}>{t.detectionLatencySec !== null ? `${t.detectionLatencySec.toFixed(1)}s` : 'N/A'}</strong>
                      </div>
                      <div style={{ color: 'var(--color-accent-mint)', fontWeight: 700, marginTop: '2px' }}>
                        +{t.scoreContribution} PTS
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Nav Footer */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: 'auto' }}>
            <button
              onClick={onMainMenu}
              className="tactical-btn"
              style={{ flex: 1, minWidth: 'min(100%, 200px)', padding: '14px', fontSize: '0.88rem' }}
            >
              <Home size={18} /> RETURN TO MAIN MENU
            </button>
            <button
              onClick={onOpenAAR}
              className="tactical-btn tactical-btn-primary"
              style={{ flex: 2, minWidth: 'min(100%, 240px)', padding: '14px', fontSize: '0.92rem' }}
            >
              DRILL DOWN INTO AFTER-ACTION REVIEW (AAR) <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
