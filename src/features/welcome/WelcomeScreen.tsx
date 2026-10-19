import React, { useEffect, useState } from 'react';
import { Shield, Crosshair, Cpu, CheckCircle2, ArrowRight, Play } from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
  onQuickStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter, onQuickStart }) => {
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setWebGlSupported(!!gl);
    } catch {
      setWebGlSupported(true);
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, #172b33 0%, #0c1417 75%, #070c0e 100%)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 'clamp(16px, 3vw, 40px)'
      }}
    >
      {/* Background Decorative Radar Grid */}
      <div
        style={{
          position: 'absolute',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          border: '1px solid rgba(141, 217, 192, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <div style={{ width: '480px', height: '480px', borderRadius: '50%', border: '1px dashed rgba(141, 217, 192, 0.06)' }} />
        <div style={{ position: 'absolute', width: '2px', height: '100%', background: 'rgba(141, 217, 192, 0.05)' }} />
        <div style={{ position: 'absolute', height: '2px', width: '100%', background: 'rgba(141, 217, 192, 0.05)' }} />
      </div>

      <div
        className="tactical-panel"
        style={{
          width: 'min(94vw, 760px)',
          padding: 'clamp(24px, 4vw, 48px)',
          zIndex: 10,
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          margin: 'auto'
        }}
      >
        {/* Top Header Tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crosshair size={22} color="var(--color-accent-mint)" />
            <span className="tactical-header-tag">SIM-UAS // COGNITIVE RECOGNITION FACILITY</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-teal-muted)' }}>
            VERSION 1.0.0
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            color: 'var(--color-text-primary)',
            marginBottom: '12px'
          }}
        >
          Virtual Drone-Threat <br />
          <span style={{ color: 'var(--color-accent-mint)', textShadow: '0 0 20px rgba(141,217,192,0.3)' }}>
            Training Simulator
          </span>
        </h1>

        <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '28px', maxWidth: '600px' }}>
          Practice real-time visual observation, distance estimation, and aerodynamic classification of simulated multirotor, fixed-wing, and micro unmanned aerial contacts in interactive 3D airspace.
        </p>

        {/* Hardware & Diagnostics Verification */}
        <div
          style={{
            background: 'rgba(15, 24, 28, 0.7)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '6px',
            padding: '14px 18px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--color-success-green)" />
            <span style={{ color: 'var(--color-text-muted)' }}>GRAPHICS ENGINE:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{webGlSupported ? 'WebGL2 Active' : 'Fallback'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="var(--color-accent-mint)" />
            <span style={{ color: 'var(--color-text-muted)' }}>TARGET FRAMERATE:</span>
            <span style={{ color: 'var(--color-accent-mint)' }}>60 FPS V-SYNC</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--color-teal-muted)" />
            <span style={{ color: 'var(--color-text-muted)' }}>PERSISTENCE:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>Local IndexedDB</span>
          </div>
        </div>

        {/* Disclaimer Callout */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '4px',
            background: 'rgba(230, 182, 92, 0.08)',
            borderLeft: '3px solid var(--color-warning-amber)',
            fontSize: '0.76rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '32px',
            lineHeight: 1.4
          }}
        >
          <strong>NON-OPERATIONAL TRAINING DISCLAIMER:</strong> This software is strictly for cognitive observation and threat classification exercises. It does not provide real-world weapon guidance, kinetic targeting, or live drone radio controls.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={onEnter}
            className="tactical-btn tactical-btn-primary"
            style={{ padding: '14px 28px', fontSize: '0.95rem' }}
          >
            ENTER TRAINING FACILITY <ArrowRight size={18} />
          </button>

          <button
            onClick={onQuickStart}
            className="tactical-btn"
            style={{ padding: '14px 22px', fontSize: '0.9rem' }}
          >
            <Play size={16} color="var(--color-accent-mint)" /> QUICK BENCHMARK
          </button>
        </div>
      </div>
    </div>
  );
};
