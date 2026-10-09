import React, { useEffect, useRef, useState } from 'react';
import {
  ScenarioDefinition,
  UserSettings,
  DroneThreatClass,
  SimulationEvent,
  TrainingSession,
  TrainingScore
} from '../../types';
import { RenderEngine } from '../../game/engine/RenderEngine';
import { CameraController } from '../../game/engine/CameraController';
import { EnvironmentScene } from '../../game/scenes/EnvironmentScene';
import { ScenarioEngine } from '../../game/scenarios/ScenarioEngine';
import { TargetTracker, TargetLockInfo } from '../../game/assessment/TargetTracker';
import { audio } from '../../game/assessment/AudioService';
import { evaluateSession } from '../../game/assessment/ScoringEngine';
import { storage } from '../../data/indexedDbAdapter';
import { CompassTape } from './CompassTape';
import { ClassificationDrawer } from './ClassificationDrawer';
import {
  Eye,
  Pause,
  Play,
  RotateCcw,
  LogOut,
  Volume2,
  VolumeX
} from 'lucide-react';

interface SimulationScreenProps {
  scenario: ScenarioDefinition;
  settings: UserSettings;
  onFinishSession: (session: TrainingSession, score: TrainingScore, events: SimulationEvent[]) => void;
  onAbortToMenu: () => void;
}

export const SimulationScreen: React.FC<SimulationScreenProps> = ({
  scenario,
  settings,
  onFinishSession,
  onAbortToMenu
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Engine references
  const renderEngineRef = useRef<RenderEngine | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const scenarioEngineRef = useRef<ScenarioEngine | null>(null);
  const targetTrackerRef = useRef<TargetTracker | null>(null);

  // Simulation State
  const [sessionId] = useState<string>(() => `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [bearingDeg, setBearingDeg] = useState<number>(0);
  const [pitchDeg, setPitchDeg] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Target tracking state
  const isFinishingRef = useRef<boolean>(false);
  const [activeLocks, setActiveLocks] = useState<TargetLockInfo[]>([]);
  const [activeTargetLock, setActiveTargetLock] = useState<TargetLockInfo | null>(null);
  const [classifyingTarget, setClassifyingTarget] = useState<TargetLockInfo | null>(null);
  const [classifiedTargetIds, setClassifiedTargetIds] = useState<Set<string>>(new Set());

  // Initialize 3D Engine and Simulation
  useEffect(() => {
    if (!containerRef.current) return;

    // Audio init
    audio.init(settings.masterVolume, settings.ambientVolume, settings.sfxVolume);
    audio.startAmbientWind();

    // Render Engine
    const renderEngine = new RenderEngine(containerRef.current, settings);
    renderEngineRef.current = renderEngine;

    // Environment
    const envScene = new EnvironmentScene(renderEngine.scene);
    envScene.build(scenario, settings.graphicsPreset);

    // Camera Controls
    const cameraController = new CameraController(
      renderEngine.camera,
      renderEngine.renderer.domElement,
      settings
    );
    cameraControllerRef.current = cameraController;

    // Target Tracker
    const targetTracker = new TargetTracker(renderEngine.camera);
    targetTrackerRef.current = targetTracker;

    // Scenario Engine
    const scenarioEngine = new ScenarioEngine(scenario, sessionId, renderEngine.scene);
    scenarioEngineRef.current = scenarioEngine;
    scenarioEngine.start();

    let lastHudUpdateMs = 0;

    // Main Render / Tick Loop
    renderEngine.start((deltaSec) => {
      if (scenarioEngine.isPaused || scenarioEngine.isCompleted) return;

      scenarioEngine.update(deltaSec);
      cameraController.update(deltaSec);

      const now = performance.now();
      if (now - lastHudUpdateMs >= 65) { // ~15-20 FPS for React HUD state
        lastHudUpdateMs = now;

        const elapsed = scenarioEngine.elapsedSimTimeSec;
        setElapsedSec(elapsed);
        setIsZoomed(cameraController.isZoomed);
        setBearingDeg(cameraController.getBearingDeg());
        setPitchDeg(cameraController.getPitchDeg());

        // Evaluate targets
        const screenW = containerRef.current?.clientWidth || window.innerWidth;
        const screenH = containerRef.current?.clientHeight || window.innerHeight;

        const locks = targetTracker.evaluateActiveTargets(
          scenarioEngine.getActiveDrones(),
          cameraController.isZoomed,
          screenW,
          screenH
        );
        setActiveLocks(locks);

        const primary = locks.find((l) => l.isLocked) || null;
        setActiveTargetLock(primary);

        if (primary) {
          scenarioEngine.emitEvent('TARGET_LOCK_ACQUIRED', {
            targetId: primary.targetId,
            distanceMeters: primary.distanceMeters,
            cameraBearing: cameraController.getBearingDeg(),
            cameraPitch: cameraController.getPitchDeg()
          });
        }
      }

      // Check scenario completion
      if (scenarioEngine.isCompleted) {
        handleCompleteSession(scenarioEngine);
      }
    });

    return () => {
      audio.stopAmbientWind();
      cameraController.detach();
      scenarioEngine.dispose();
      envScene.dispose();
      renderEngine.dispose();
    };
  }, []);

  // Keyboard controls for pause and classification trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (!classifyingTarget) {
          togglePause();
        }
      } else if (e.code === 'Space') {
        if (activeTargetLock && !classifyingTarget) {
          triggerClassification(activeTargetLock);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTargetLock, classifyingTarget, isPaused]);

  const togglePause = () => {
    if (!scenarioEngineRef.current || scenarioEngineRef.current.isCompleted) return;

    if (isPaused) {
      scenarioEngineRef.current.resume();
      setIsPaused(false);
    } else {
      scenarioEngineRef.current.pause();
      setIsPaused(true);
      cameraControllerRef.current?.unlock();
    }
  };

  const triggerClassification = (lock: TargetLockInfo) => {
    cameraControllerRef.current?.unlock();
    setClassifyingTarget(lock);
  };

  const handleClassificationSubmit = async (
    submittedClass: DroneThreatClass,
    confidence: 'confirmed' | 'suspected'
  ) => {
    if (!classifyingTarget || !scenarioEngineRef.current) return;

    const targetId = classifyingTarget.targetId;
    setClassifiedTargetIds((prev) => new Set(prev).add(targetId));

    scenarioEngineRef.current.emitEvent('CLASSIFICATION_SUBMITTED', {
      targetId,
      submittedClass,
      confidence,
      distanceMeters: classifyingTarget.distanceMeters,
      cameraBearing: bearingDeg,
      cameraPitch: pitchDeg
    });

    setClassifyingTarget(null);

    // If all targets classified, complete mission early
    const updatedCount = classifiedTargetIds.size + 1;
    if (updatedCount >= scenario.targets.length) {
      setTimeout(() => {
        if (scenarioEngineRef.current) {
          scenarioEngineRef.current.complete();
          handleCompleteSession(scenarioEngineRef.current);
        }
      }, 500);
    }
  };

  const handleClassificationCancel = () => {
    setClassifyingTarget(null);
  };

  const handleCompleteSession = async (engine: ScenarioEngine) => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    const events = engine.getEvents();
    const score = evaluateSession(scenario, events, sessionId);

    const sessionRecord: TrainingSession = {
      id: sessionId,
      userId: 'guest-trainee',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioVersion: scenario.version,
      difficulty: scenario.difficulty,
      startedAt: Date.now() - Math.round(engine.elapsedSimTimeSec * 1000),
      completedAt: Date.now(),
      status: 'completed',
      appVersion: '1.0.0'
    };

    // Save to IndexedDB
    try {
      await storage.saveSession(sessionRecord);
      await storage.saveEvents(sessionId, events);
      await storage.saveScore(score);
    } catch (e) {
      console.warn('[Storage] Error persisting session records:', e);
    }

    onFinishSession(sessionRecord, score, events);
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audio.setMuted(nextMute);
  };

  const progressPercent = Math.min(100, (elapsedSec / scenario.durationSeconds) * 100);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 1 }}
        onClick={() => {
          if (!isPaused && !classifyingTarget) {
            cameraControllerRef.current?.requestLock();
          }
        }}
      />

      {/* Binocular Zoom Vignette */}
      {isZoomed && (
        <div className="binocular-overlay">
          <div className="binocular-crosshair">
            <svg width="420" height="420" viewBox="0 0 420 420">
              <circle cx="210" cy="210" r="200" fill="none" stroke="rgba(141, 217, 192, 0.4)" strokeWidth="1.5" strokeDasharray="4 6" />
              <line x1="10" y1="210" x2="410" y2="210" stroke="rgba(141, 217, 192, 0.6)" strokeWidth="1" />
              <line x1="210" y1="10" x2="210" y2="410" stroke="rgba(141, 217, 192, 0.6)" strokeWidth="1" />
              {/* Stadia ticks */}
              {[-120, -80, -40, 40, 80, 120].map((offset) => (
                <React.Fragment key={offset}>
                  <line x1={210 + offset} y1="205" x2={210 + offset} y2="215" stroke="var(--color-accent-mint)" strokeWidth="1" />
                  <line x1="205" y1={210 + offset} x2="215" y2={210 + offset} stroke="var(--color-accent-mint)" strokeWidth="1" />
                </React.Fragment>
              ))}
            </svg>
          </div>
          <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-accent-mint)', letterSpacing: '0.15em' }}>
            OPTICAL BINOCULAR MAGNIFICATION: 3.2X
          </div>
        </div>
      )}

      {/* Center Reticle / Dynamic Lock Bracket */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            width: activeTargetLock ? '48px' : '28px',
            height: activeTargetLock ? '48px' : '28px',
            border: activeTargetLock
              ? '2px solid var(--color-accent-mint)'
              : '1px solid rgba(141, 217, 192, 0.5)',
            borderRadius: activeTargetLock ? '4px' : '50%',
            transition: 'all 0.15s ease',
            boxShadow: activeTargetLock ? '0 0 16px rgba(141, 217, 192, 0.6)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '4px',
              height: '4px',
              backgroundColor: activeTargetLock ? 'var(--color-accent-mint)' : 'var(--color-teal-muted)',
              borderRadius: '50%'
            }}
          />
        </div>

        {activeTargetLock && (
          <div
            style={{
              marginTop: '10px',
              background: 'rgba(12, 20, 23, 0.85)',
              border: '1px solid var(--color-accent-mint)',
              borderRadius: '4px',
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-accent-mint)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <div>TARGET LOCK: <strong>{activeTargetLock.callsign}</strong></div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
              RANGE: {activeTargetLock.distanceMeters}m
            </div>
            <div style={{ marginTop: '4px', color: '#ffffff', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
              [SPACE / CLICK TO CLASSIFY]
            </div>
          </div>
        )}
      </div>

      {/* Target Screen Markers */}
      {activeLocks.map((lock) => {
        if (lock.screenX < 0 || lock.screenX > window.innerWidth || lock.screenY < 0 || lock.screenY > window.innerHeight) {
          return null;
        }

        const isClassified = classifiedTargetIds.has(lock.targetId);

        return (
          <div
            key={lock.targetId}
            style={{
              position: 'absolute',
              left: `${lock.screenX}px`,
              top: `${lock.screenY}px`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              zIndex: 25
            }}
            onClick={() => triggerClassification(lock)}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: isClassified
                  ? '1px dashed var(--color-success-green)'
                  : lock.isLocked
                  ? '2px solid var(--color-accent-mint)'
                  : '1px solid rgba(230, 182, 92, 0.6)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(12, 20, 23, 0.2)'
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: isClassified
                    ? 'var(--color-success-green)'
                    : lock.isLocked
                    ? 'var(--color-accent-mint)'
                    : 'var(--color-warning-amber)',
                  fontWeight: 700
                }}
              >
                {lock.callsign.substring(0, 3)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Top HUD Bar */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pointerEvents: 'none',
          zIndex: 40
        }}
      >
        {/* Mission Telemetry Card */}
        <div className="tactical-panel" style={{ padding: '12px 18px', minWidth: '240px', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="tactical-header-tag">{scenario.codename}</span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: 'rgba(141,217,192,0.15)', color: 'var(--color-accent-mint)', fontFamily: 'var(--font-mono)' }}>
              {scenario.difficulty.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {scenario.name}
          </div>

          {/* Time & Progress */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              <span>MISSION TIME</span>
              <span>{Math.floor(elapsedSec)}s / {scenario.durationSeconds}s</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--color-accent-mint)', transition: 'width 0.1s linear' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>CLASSIFIED:</span>
            <span style={{ color: 'var(--color-accent-mint)', fontWeight: 700 }}>
              {classifiedTargetIds.size} / {scenario.targets.length} CONTACTS
            </span>
          </div>

          {/* Active Contacts Quick Classification Tray */}
          {activeLocks.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-teal-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                AIRSPACE CONTACTS ({activeLocks.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {activeLocks.map((lock) => {
                  const isClassified = classifiedTargetIds.has(lock.targetId);
                  return (
                    <div
                      key={lock.targetId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.72rem',
                        background: 'rgba(12, 20, 23, 0.6)',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        border: '1px solid rgba(141, 217, 192, 0.1)'
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                        {lock.callsign} <span style={{ color: 'var(--color-text-muted)' }}>[{lock.distanceMeters}m]</span>
                      </span>
                      {isClassified ? (
                        <span style={{ color: 'var(--color-success-green)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                          ✓ CLASSIFIED
                        </span>
                      ) : (
                        <button
                          onClick={() => triggerClassification(lock)}
                          className="tactical-btn"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.68rem',
                            borderColor: 'var(--color-accent-mint)',
                            color: 'var(--color-accent-mint)'
                          }}
                        >
                          CLASSIFY
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center Compass Tape */}
        <CompassTape bearingDeg={bearingDeg} pitchDeg={pitchDeg} />

        {/* Quick Tactical Controls */}
        <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
          <button
            onClick={() => cameraControllerRef.current?.setZoom(!isZoomed)}
            className="tactical-btn"
            style={{ padding: '8px 12px', fontSize: '0.75rem' }}
            title="Toggle Binocular Zoom (Shift or RMB)"
          >
            <Eye size={16} color={isZoomed ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)'} />
            ZOOM
          </button>
          <button
            onClick={toggleMute}
            className="tactical-btn"
            style={{ padding: '8px 12px' }}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={togglePause}
            className="tactical-btn"
            style={{ padding: '8px 14px' }}
            title="Pause Simulation (Esc)"
          >
            <Pause size={16} />
          </button>
        </div>
      </div>

      {/* Non-Operational Safety Disclaimer Watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'rgba(185, 200, 199, 0.45)',
          letterSpacing: '0.08em',
          pointerEvents: 'none',
          zIndex: 35
        }}
      >
        TRAINING SIMULATION ONLY - NO OPERATIONAL WEAPON CONTROL
      </div>

      {/* Controls Hint Overlay at bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: 'var(--color-text-muted)',
          display: 'flex',
          gap: '12px',
          background: 'rgba(12, 20, 23, 0.7)',
          padding: '4px 10px',
          borderRadius: '4px',
          border: '1px solid rgba(141, 217, 192, 0.1)',
          pointerEvents: 'none',
          zIndex: 35
        }}
      >
        <span>[WASD] Move Post</span>
        <span>[MOUSE] Pan Camera</span>
        <span>[RMB / SHIFT] Binoculars</span>
        <span>[SPACE] Classify Lock</span>
      </div>

      {/* Target Classification Drawer */}
      {classifyingTarget && (
        <ClassificationDrawer
          targetLock={classifyingTarget}
          onSubmit={handleClassificationSubmit}
          onCancel={handleClassificationCancel}
        />
      )}

      {/* Pause Menu Modal */}
      {isPaused && (
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
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="tactical-header-tag">SIMULATION SUSPENDED</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '6px' }}>PAUSE MENU</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Simulation clock and target physics are frozen.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={togglePause}
                className="tactical-btn tactical-btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                <Play size={18} /> RESUME TRAINING
              </button>
              <button
                onClick={handleRestart}
                className="tactical-btn"
                style={{ width: '100%', padding: '12px' }}
              >
                <RotateCcw size={18} /> RESTART SCENARIO
              </button>
              <button
                onClick={onAbortToMenu}
                className="tactical-btn tactical-btn-danger"
                style={{ width: '100%', padding: '12px' }}
              >
                <LogOut size={18} /> ABORT TO MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
