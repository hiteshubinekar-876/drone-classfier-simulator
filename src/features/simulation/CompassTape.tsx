import React from 'react';

interface CompassTapeProps {
  bearingDeg: number;
  pitchDeg: number;
}

export const CompassTape: React.FC<CompassTapeProps> = ({ bearingDeg, pitchDeg }) => {
  const cardinalMap: Record<number, string> = {
    0: 'N',
    45: 'NE',
    90: 'E',
    135: 'SE',
    180: 'S',
    225: 'SW',
    270: 'W',
    315: 'NW',
    360: 'N'
  };

  // Generate ticks around current bearing (-60 to +60 deg)
  const ticks = [];
  const startDeg = Math.floor((bearingDeg - 50) / 5) * 5;
  const endDeg = Math.ceil((bearingDeg + 50) / 5) * 5;

  for (let d = startDeg; d <= endDeg; d += 5) {
    let normalized = d % 360;
    if (normalized < 0) normalized += 360;

    const offsetPercent = ((d - bearingDeg) / 100) * 100;
    const isMajor = d % 15 === 0;
    const cardinal = cardinalMap[normalized];

    ticks.push({
      deg: normalized,
      display: cardinal || (isMajor ? `${normalized.toString().padStart(3, '0')}` : ''),
      offset: offsetPercent,
      isMajor
    });
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
      userSelect: 'none'
    }}>
      {/* Compass Bar Window */}
      <div style={{
        position: 'relative',
        width: 'min(320px, 45vw)',
        minWidth: '180px',
        height: '40px',
        overflow: 'hidden',
        background: 'linear-gradient(90deg, rgba(12,20,23,0) 0%, rgba(27,43,48,0.7) 30%, rgba(27,43,48,0.7) 70%, rgba(12,20,23,0) 100%)',
        borderBottom: '1px solid var(--color-border-subtle)',
        maskImage: 'linear-gradient(90deg, transparent 0%, black 20%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 20%, black 80%, transparent 100%)'
      }}>
        {ticks.map((t, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${50 + t.offset}%`,
              transform: 'translateX(-50%)',
              top: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '1px',
                height: t.isMajor ? '10px' : '5px',
                backgroundColor: t.isMajor ? 'var(--color-accent-mint)' : 'var(--color-teal-muted)'
              }}
            />
            {t.display && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  fontWeight: t.display.length <= 2 ? 700 : 500,
                  color: t.display.length <= 2 ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                  marginTop: '2px'
                }}
              >
                {t.display}
              </span>
            )}
          </div>
        ))}

        {/* Center Pointer Indicator */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '0',
          transform: 'translateX(-50%)',
          width: '0',
          height: '0',
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: '6px solid var(--color-accent-mint)'
        }} />
      </div>

      {/* Numeric Readouts */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '4px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-accent-mint)',
        background: 'rgba(19, 31, 36, 0.75)',
        padding: '2px 10px',
        borderRadius: '3px',
        border: '1px solid var(--color-border-subtle)'
      }}>
        <span>HDG <strong>{bearingDeg.toString().padStart(3, '0')}°</strong></span>
        <span style={{ color: 'var(--color-teal-muted)' }}>|</span>
        <span>PITCH <strong>{pitchDeg > 0 ? `+${pitchDeg}` : pitchDeg}°</strong></span>
      </div>
    </div>
  );
};
