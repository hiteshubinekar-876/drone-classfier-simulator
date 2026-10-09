import React, { useState } from 'react';
import { UserSettings, DEFAULT_SETTINGS, GraphicsPreset } from '../../types';
import { storage } from '../../data/indexedDbAdapter';
import {
  ArrowLeft,
  Monitor,
  Volume2,
  Sliders,
  Check,
  RotateCcw
} from 'lucide-react';

interface SettingsScreenProps {
  currentSettings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentSettings,
  onUpdateSettings,
  onBack
}) => {
  const [settings, setSettings] = useState<UserSettings>(currentSettings);
  const [saveNotice, setSaveNotice] = useState<boolean>(false);

  const handlePresetChange = (preset: GraphicsPreset) => {
    let updated: Partial<UserSettings> = { graphicsPreset: preset };
    if (preset === 'low') {
      updated = {
        ...updated,
        shadowsEnabled: false,
        resolutionScale: 0.8
      };
    } else if (preset === 'medium') {
      updated = {
        ...updated,
        shadowsEnabled: true,
        resolutionScale: 1.0
      };
    } else if (preset === 'high') {
      updated = {
        ...updated,
        shadowsEnabled: true,
        resolutionScale: 1.25
      };
    }
    const newConfig = { ...settings, ...updated };
    setSettings(newConfig);
    save(newConfig);
  };

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newConfig = { ...settings, [key]: value };
    setSettings(newConfig);
    save(newConfig);
  };

  const save = async (cfg: UserSettings) => {
    onUpdateSettings(cfg);
    await storage.saveSettings(cfg);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 1500);
  };

  const handleResetDefaults = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    save({ ...DEFAULT_SETTINGS });
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
            <div className="tactical-header-tag">SYSTEM CALIBRATION</div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>SIMULATOR CONFIGURATION</h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveNotice && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-success-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} /> SETTINGS PERSISTED
            </span>
          )}
          <button
            onClick={handleResetDefaults}
            className="tactical-btn"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <RotateCcw size={14} /> RESET DEFAULTS
          </button>
        </div>
      </header>

      {/* Main Settings Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '28px',
          padding: '36px 48px',
          overflowY: 'auto'
        }}
      >
        {/* Graphics & Rendering Panel */}
        <div className="tactical-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Monitor size={18} color="var(--color-accent-mint)" />
            <div className="tactical-header-tag">GRAPHICS & PERFORMANCE</div>
          </div>

          {/* Preset Buttons */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
              QUALITY PRESET:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['low', 'medium', 'high'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className="tactical-btn"
                  style={{
                    padding: '10px',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    borderColor: settings.graphicsPreset === preset ? 'var(--color-accent-mint)' : 'var(--color-border-subtle)',
                    background: settings.graphicsPreset === preset ? 'rgba(141, 217, 192, 0.2)' : 'transparent',
                    color: settings.graphicsPreset === preset ? '#ffffff' : 'var(--color-text-secondary)'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Field of View Slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <span>CAMERA FIELD OF VIEW (FOV):</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-mint)' }}>{settings.fieldOfView}°</span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="1"
              value={settings.fieldOfView}
              onChange={(e) => handleChange('fieldOfView', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent-mint)' }}
            />
          </div>

          {/* Dynamic Shadows Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>REAL-TIME SHADOW MAPS</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Disable for higher frame rates on integrated GPUs</div>
            </div>
            <input
              type="checkbox"
              checked={settings.shadowsEnabled}
              onChange={(e) => handleChange('shadowsEnabled', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent-mint)', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Audio Calibration Panel */}
        <div className="tactical-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Volume2 size={18} color="var(--color-accent-mint)" />
            <div className="tactical-header-tag">AUDIO CALIBRATION</div>
          </div>

          {/* Master Volume */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <span>MASTER VOLUME:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-mint)' }}>{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => handleChange('masterVolume', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent-mint)' }}
            />
          </div>

          {/* SFX Volume */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <span>TACTICAL SFX / LOCK BEEP:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-mint)' }}>{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => handleChange('sfxVolume', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent-mint)' }}
            />
          </div>

          {/* Ambient Wind Volume */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <span>ATMOSPHERIC WIND:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-mint)' }}>{Math.round(settings.ambientVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.ambientVolume}
              onChange={(e) => handleChange('ambientVolume', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent-mint)' }}
            />
          </div>
        </div>

        {/* Input & Controls Panel */}
        <div className="tactical-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sliders size={18} color="var(--color-accent-mint)" />
            <div className="tactical-header-tag">INPUT & ACCESSIBILITY</div>
          </div>

          {/* Mouse Sensitivity */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <span>MOUSE LOOK SENSITIVITY:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-mint)' }}>{settings.mouseSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) => handleChange('mouseSensitivity', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent-mint)' }}
            />
          </div>

          {/* Invert Pitch */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>INVERT Y-AXIS (PITCH)</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Flight-sim style camera tilt inversion</div>
            </div>
            <input
              type="checkbox"
              checked={settings.invertY}
              onChange={(e) => handleChange('invertY', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent-mint)', cursor: 'pointer' }}
            />
          </div>

          {/* Reduced Motion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>REDUCED MOTION MODE</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Minimizes camera transitions and lens vibrations</div>
            </div>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => handleChange('reducedMotion', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent-mint)', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
