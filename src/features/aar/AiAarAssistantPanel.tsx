import React, { useState, useEffect, useCallback } from 'react';
import {
  TrainingSession,
  TrainingScore,
  SimulationEvent,
  ScenarioDefinition,
  AarInsightReport
} from '../../types';
import { aiAarService } from '../../services/aiAarService';
import { storage } from '../../data/indexedDbAdapter';
import {
  Sparkles,
  Cpu,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Info,
  ShieldCheck
} from 'lucide-react';

interface AiAarAssistantPanelProps {
  session: TrainingSession;
  score: TrainingScore;
  events: SimulationEvent[];
  scenario: ScenarioDefinition;
  onReportLoaded?: (report: AarInsightReport) => void;
}

export const AiAarAssistantPanel: React.FC<AiAarAssistantPanelProps> = ({
  session,
  score,
  events,
  scenario,
  onReportLoaded
}) => {
  const [report, setReport] = useState<AarInsightReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAnalysis = useCallback(
    async (forceRegenerate = false) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Load historical sessions for trend metrics
        const allSessions = await storage.getAllSessions();
        const scoreMap = new Map<string, TrainingScore>();

        for (const s of allSessions) {
          if (s.id !== session.id) {
            const sc = await storage.getScore(s.id);
            if (sc) {
              scoreMap.set(s.id, sc);
            }
          }
        }

        const generated = await aiAarService.generateAarReport({
          session,
          score,
          events,
          scenario,
          forceRegenerate,
          historicalSessions: allSessions,
          historicalScores: scoreMap
        });

        setReport(generated);
        if (onReportLoaded) {
          onReportLoaded(generated);
        }
      } catch (err: unknown) {
        console.error('[AiAarAssistantPanel] Failed to generate AAR report:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while analyzing session telemetry.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [session, score, events, scenario, onReportLoaded]
  );

  useEffect(() => {
    loadAnalysis(false);
  }, [loadAnalysis]);

  if (isLoading && !report) {
    return (
      <div className="tactical-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--color-accent-mint)' }}>
          <RotateCcw size={20} className="spinning-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', letterSpacing: '0.08em', fontWeight: 600 }}>
            SYNTHESIZING HYBRID AAR PERFORMANCE ANALYSIS...
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
          Correlating chronological event telemetry, target appearance truth, and cognitive response benchmarks.
        </p>
      </div>
    );
  }

  if (errorMessage && !report) {
    return (
      <div
        className="tactical-panel"
        style={{
          padding: '24px',
          borderLeft: '4px solid var(--color-error-red)',
          background: 'rgba(217, 108, 108, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-error-red)', marginBottom: '8px' }}>
          <AlertCircle size={20} />
          <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>AAR ANALYSIS TEMPORARILY UNAVAILABLE</strong>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
          {errorMessage}
        </p>
        <button
          onClick={() => loadAnalysis(true)}
          className="tactical-btn"
          style={{ padding: '8px 16px', fontSize: '0.8rem' }}
        >
          <RotateCcw size={14} /> RETRY ANALYSIS
        </button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { deterministicInsights, explanation } = report;
  const { metrics, recommendations, dataLimitations } = deterministicInsights;

  return (
    <div className="tactical-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with Title and Mode Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="tactical-header-tag" style={{ margin: 0 }}>
              HYBRID AI AFTER-ACTION REVIEW ASSISTANT
            </div>
            {/* Truthful Provider Status Pill */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '2px 8px',
                borderRadius: '3px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: explanation.isAiGenerated
                  ? 'linear-gradient(90deg, rgba(141, 217, 192, 0.2), rgba(168, 85, 247, 0.2))'
                  : 'rgba(108, 140, 138, 0.2)',
                border: `1px solid ${explanation.isAiGenerated ? 'var(--color-accent-mint)' : 'var(--color-teal-muted)'}`,
                color: explanation.isAiGenerated ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)'
              }}
            >
              {explanation.isAiGenerated ? <Sparkles size={11} /> : <Cpu size={11} />}
              {explanation.isAiGenerated ? 'AI-GENERATED EXPLANATION' : 'RULE-BASED ANALYSIS'}
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {explanation.isAiGenerated
              ? `AI-generated narrative explanation (${explanation.providerName}), grounded strictly in verified metrics.`
              : 'Rule-based analysis engine. Remote AI unconfigured or offline; verified metrics evaluated deterministically.'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => loadAnalysis(true)}
            disabled={isLoading}
            className="tactical-btn"
            style={{ padding: '6px 14px', fontSize: '0.75rem', opacity: isLoading ? 0.6 : 1 }}
            title="Re-run deterministic analysis and regenerate tactical explanation"
          >
            <RotateCcw size={13} style={{ animation: isLoading ? 'spin 1.5s linear infinite' : 'none' }} />
            {isLoading ? 'ANALYZING...' : 'REGENERATE ANALYSIS'}
          </button>
        </div>
      </div>

      {/* Authoritative Score Reference Banner */}
      <div
        style={{
          background: 'rgba(15, 24, 28, 0.75)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '4px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--color-accent-mint)" />
          <span>
            AUTHORITATIVE MISSION SCORE:{' '}
            <strong style={{ color: score.passed ? 'var(--color-success-green)' : 'var(--color-error-red)', fontSize: '0.88rem' }}>
              {score.totalScore}/100 [{score.rating}]
            </strong>{' '}
            (Engine {score.scoringVersion})
          </span>
        </div>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
          * AI synthesis provides advisory feedback and cannot modify recorded mission scores.
        </span>
      </div>

      {/* Verified Telemetry Metrics Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: '12px'
        }}
      >
        {/* Metric 1: Accuracy */}
        <div style={{ background: 'rgba(15, 24, 28, 0.6)', border: '1px solid rgba(141, 217, 192, 0.12)', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Target size={13} color="var(--color-accent-mint)" />
            ACCURACY
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
            {metrics.accuracyPercentage !== null ? `${metrics.accuracyPercentage}%` : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {metrics.correctClassifications} / {metrics.totalAttempts} verified
          </div>
        </div>

        {/* Metric 2: Mean Latency */}
        <div style={{ background: 'rgba(15, 24, 28, 0.6)', border: '1px solid rgba(141, 217, 192, 0.12)', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Clock size={13} color="var(--color-teal-muted)" />
            MEAN LATENCY
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
            {metrics.averageLatencySec !== null ? `${metrics.averageLatencySec}s` : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {metrics.minLatencySec !== null && metrics.maxLatencySec !== null
              ? `Range: ${metrics.minLatencySec}s - ${metrics.maxLatencySec}s`
              : 'No latency logged'}
          </div>
        </div>

        {/* Metric 3: Airspace Coverage */}
        <div style={{ background: 'rgba(15, 24, 28, 0.6)', border: '1px solid rgba(141, 217, 192, 0.12)', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            <CheckCircle2 size={13} color="var(--color-success-green)" />
            COVERAGE
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
            {metrics.targetCoveragePercentage}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {metrics.totalTargets - metrics.unattemptedTargets} / {metrics.totalTargets} contacts engaged
          </div>
        </div>

        {/* Metric 4: Trigger Discipline */}
        <div style={{ background: 'rgba(15, 24, 28, 0.6)', border: '1px solid rgba(141, 217, 192, 0.12)', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            <AlertCircle size={13} color={metrics.falseAlarmCount > 0 ? 'var(--color-error-red)' : 'var(--color-accent-mint)'} />
            FALSE ALARMS
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: metrics.falseAlarmCount > 0 ? 'var(--color-error-red)' : 'var(--color-text-primary)', marginTop: '4px' }}>
            {metrics.falseAlarmCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {score.breakdown.falseAlarmPenalty > 0 ? `-${score.breakdown.falseAlarmPenalty} pts penalty` : 'Zero deductions'}
          </div>
        </div>

        {/* Metric 5: Historical Trend */}
        <div style={{ background: 'rgba(15, 24, 28, 0.6)', border: '1px solid rgba(141, 217, 192, 0.12)', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {metrics.historicalTrend.trendDirection === 'improving' ? (
              <TrendingUp size={13} color="var(--color-success-green)" />
            ) : metrics.historicalTrend.trendDirection === 'declining' ? (
              <TrendingDown size={13} color="var(--color-error-red)" />
            ) : (
              <Info size={13} color="var(--color-teal-muted)" />
            )}
            HISTORICAL TREND
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
            {metrics.historicalTrend.hasBaseline && metrics.historicalTrend.scoreDelta !== null
              ? `${metrics.historicalTrend.scoreDelta >= 0 ? '+' : ''}${metrics.historicalTrend.scoreDelta} PTS`
              : 'BASELINE'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {metrics.historicalTrend.hasBaseline
              ? `vs ${metrics.historicalTrend.priorSessionCount} prior attempt(s)`
              : 'Initial scenario completion'}
          </div>
        </div>
      </div>

      {/* Performance Summary Narrative Card */}
      <div
        style={{
          background: 'rgba(15, 24, 28, 0.7)',
          borderLeft: '3px solid var(--color-accent-mint)',
          borderRadius: '0 4px 4px 0',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--color-accent-mint)', fontWeight: 700, letterSpacing: '0.05em' }}>
          EXECUTIVE PERFORMANCE SUMMARY
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
          {explanation.performanceSummary}
        </p>
      </div>

      {/* 2-Column Grid: What Went Well & Areas to Improve */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '16px'
        }}
      >
        {/* Column 1: What Went Well */}
        <div
          style={{
            background: 'rgba(15, 24, 28, 0.55)',
            border: '1px solid rgba(92, 214, 143, 0.25)',
            borderRadius: '6px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success-green)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} />
            WHAT WENT WELL (VERIFIED STRENGTHS)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {explanation.whatWentWell.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(12, 20, 23, 0.7)',
                  borderLeft: '2px solid var(--color-success-green)',
                  borderRadius: '0 4px 4px 0',
                  padding: '10px 12px',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.45
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Areas to Improve */}
        <div
          style={{
            background: 'rgba(15, 24, 28, 0.55)',
            border: '1px solid rgba(230, 182, 92, 0.25)',
            borderRadius: '6px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning-amber)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700 }}>
            <AlertCircle size={16} />
            AREAS TO IMPROVE (MEASURED DEFICIENCIES)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {explanation.areasToImprove.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(12, 20, 23, 0.7)',
                  borderLeft: '2px solid var(--color-warning-amber)',
                  borderRadius: '0 4px 4px 0',
                  padding: '10px 12px',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.45
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Practice Drills */}
      <div
        style={{
          background: 'rgba(15, 24, 28, 0.55)',
          border: '1px solid rgba(141, 217, 192, 0.2)',
          borderRadius: '6px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-mint)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700 }}>
          <Target size={16} />
          RECOMMENDED TACTICAL PRACTICE DRILLS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '12px' }}>
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              style={{
                background: 'rgba(12, 20, 23, 0.7)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '4px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {rec.title}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '2px',
                    background: rec.priority === 'high' ? 'rgba(217, 108, 108, 0.2)' : 'rgba(141, 217, 192, 0.15)',
                    color: rec.priority === 'high' ? 'var(--color-error-red)' : 'var(--color-accent-mint)'
                  }}
                >
                  {rec.priority.toUpperCase()} PRIORITY
                </span>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                {rec.actionPlan}
              </p>

              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                Rationale: {rec.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Limitations & Integrity Disclaimers */}
      {dataLimitations.length > 0 && (
        <div
          style={{
            background: 'rgba(15, 24, 28, 0.45)',
            border: '1px dashed var(--color-border-subtle)',
            borderRadius: '4px',
            padding: '12px 14px',
            fontSize: '0.74rem',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-teal-muted)', marginBottom: '4px', fontWeight: 600 }}>
            <Info size={13} /> DATA LIMITATIONS & AUDIT AUDIENCE NOTES:
          </div>
          <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {dataLimitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
