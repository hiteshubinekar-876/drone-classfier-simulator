import React, { useState } from 'react';
import { ScenarioDefinition } from '../../types';
import { SCENARIOS } from '../../data/mockScenarios';
import { ArrowLeft, Clock, Crosshair, Sun, CloudFog, Sunset, ChevronRight } from 'lucide-react';

interface ScenarioSelectScreenProps {
  onSelectScenario: (scenario: ScenarioDefinition) => void;
  onBack: () => void;
}

export const ScenarioSelectScreen: React.FC<ScenarioSelectScreenProps> = ({
  onSelectScenario,
  onBack
}) => {
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  const filteredScenarios = SCENARIOS.filter((s) => {
    if (filter === 'all') return true;
    return s.difficulty === filter;
  });

  const getTimeIcon = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'sunset':
        return <Sunset size={14} color="var(--color-warning-amber)" />;
      case 'fog':
        return <CloudFog size={14} color="var(--color-teal-muted)" />;
      case 'day':
      default:
        return <Sun size={14} color="var(--color-accent-mint)" />;
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
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={16} /> BACK
          </button>
          <div>
            <div className="tactical-header-tag">EXERCISE CURRICULUM</div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>SELECT TRAINING SCENARIO</h1>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="tactical-btn"
              style={{
                padding: '6px 14px',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                borderColor: filter === tab ? 'var(--color-accent-mint)' : 'var(--color-border-subtle)',
                background: filter === tab ? 'rgba(141, 217, 192, 0.2)' : 'transparent',
                color: filter === tab ? 'var(--color-text-primary)' : 'var(--color-text-muted)'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Scenario Grid */}
      <div
        style={{
          flex: 1,
          padding: '36px 48px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          alignContent: 'start'
        }}
      >
        {filteredScenarios.map((sc) => {
          return (
            <div
              key={sc.id}
              onClick={() => onSelectScenario(sc)}
              className="tactical-panel"
              style={{
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid var(--color-border-subtle)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-mint)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="tactical-header-tag">{sc.codename}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        background:
                          sc.difficulty === 'advanced'
                            ? 'rgba(217,108,108,0.2)'
                            : sc.difficulty === 'intermediate'
                            ? 'rgba(230,182,92,0.2)'
                            : 'rgba(92,214,143,0.2)',
                        color:
                          sc.difficulty === 'advanced'
                            ? 'var(--color-error-red)'
                            : sc.difficulty === 'intermediate'
                            ? 'var(--color-warning-amber)'
                            : 'var(--color-success-green)',
                        fontWeight: 700
                      }}
                    >
                      {sc.difficulty.toUpperCase()}
                    </span>

                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        background: 'rgba(23, 35, 41, 0.7)',
                        border: '1px solid var(--color-border-subtle)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {getTimeIcon(sc.timeOfDay)}
                      {sc.timeOfDay.toUpperCase()}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  {sc.name}
                </h3>

                <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45, marginBottom: '20px' }}>
                  {sc.description}
                </p>
              </div>

              <div>
                {/* Meta details footer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--color-border-subtle)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--color-teal-muted)" />
                    <span>DURATION: <strong>{sc.durationSeconds}s</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Crosshair size={14} color="var(--color-accent-mint)" />
                    <span>TARGETS: <strong>{sc.targets.length} CONTACTS</strong></span>
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', color: 'var(--color-accent-mint)', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span>COMMENCE BRIEFING</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
