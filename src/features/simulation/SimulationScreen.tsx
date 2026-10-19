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
import { inputManager, formatKeyDisplay } from '../../services/inputManager';
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
  const [currentSensitivity, setCurrentSensitivity] = useState<number>(settings.mouseSensitivity || 1.0);
  const [isDebriefOpen, setIsDebriefOpen] = useState<boolean>(false);

  // Target tracking state
  const isFinishingRef = useRef<boolean>(false);
  const lastLockTargetIdRef = useRef<string | null>(null);
  const lastLockTimeRef = useRef<number>(0);
  const [activeLocks, setActiveLocks] = useState<TargetLockInfo[]>([]);
  const [activeTargetLock, setActiveTargetLock] = useState<TargetLockInfo | null>(null);
  const [classifyingTarget, setClassifyingTarget] = useState<TargetLockInfo | null>(null);
  const [classifiedTargetIds, setClassifiedTargetIds] = useState<Set<string>>(new Set());

  // Synchronize settings changes to camera controller dynamically
  useEffect(() => {
    if (cameraControllerRef.current) {
      cameraControllerRef.current.updateSettings({
        ...settings,
        mouseSensitivity: currentSensitivity
      });
    }
  }, [settings, currentSensitivity]);

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
      { ...settings, mouseSensitivity: currentSensitivity }
    );
    cameraControllerRef.current = cameraController;

    // Target Tracker
    const targetTracker = new TargetTracker(renderEngine.camera);
    targetTrackerRef.current = targetTracker;

    // Scenario Engine with configurable observation pacing
    const pacingMult =
      settings.targetObservationPacing === 'relaxed'
        ? 1.7
        : settings.targetObservationPacing === 'extended'
        ? 1.35
        : 1.0;
    const scenarioEngine = new ScenarioEngine(scenario, sessionId, renderEngine.scene, pacingMult);
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

        // Evaluate targets within container dimensions
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
          const nowMs = performance.now();
          if (
            lastLockTargetIdRef.current !== primary.targetId ||
            nowMs - lastLockTimeRef.current >= 2500
          ) {
            lastLockTargetIdRef.current = primary.targetId;
            lastLockTimeRef.current = nowMs;
            scenarioEngine.emitEvent('TARGET_LOCK_ACQUIRED', {
              targetId: primary.targetId,
              distanceMeters: primary.distanceMeters,
              cameraBearing: cameraController.getBearingDeg(),
              cameraPitch: cameraController.getPitchDeg()
            });
          }
        }
      }

      // Check scenario completion - halt simulation and present debrief without automatic navigation
      if (scenarioEngine.isCompleted) {
        cameraController.unlock();
        cameraController.setPaused(true);
        setIsDebriefOpen(true);
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
      if (inputManager.isInputElement(e.target)) return;

      if (inputManager.matchesAction(e, 'pauseSimulation')) {
        if (!classifyingTarget && !isDebriefOpen) {
          togglePause();
        }
      } else if (inputManager.matchesAction(e, 'triggerClassification')) {
        if (activeTargetLock && !classifyingTarget && !isDebriefOpen && !classifiedTargetIds.has(activeTargetLock.targetId)) {
          triggerClassification(activeTargetLock);
        }
      } else if (inputManager.matchesAction(e, 'toggleMute')) {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTargetLock, classifyingTarget, isPaused, isDebriefOpen, classifiedTargetIds]);

  const togglePause = () => {
    if (!scenarioEngineRef.current || scenarioEngineRef.current.isCompleted || isDebriefOpen) return;

    if (isPaused) {
      scenarioEngineRef.current.resume();
      cameraControllerRef.current?.setPaused(false);
      setIsPaused(false);
    } else {
      scenarioEngineRef.current.pause();
      cameraControllerRef.current?.setPaused(true);
      setIsPaused(true);
      cameraControllerRef.current?.unlock();
    }
  };

  const triggerClassification = (lock: TargetLockInfo) => {
    if (classifiedTargetIds.has(lock.targetId)) return;
    cameraControllerRef.current?.unlock();
    setClassifyingTarget(lock);
  };

  const handleClassificationSubmit = async (
    submittedClass: DroneThreatClass,
    confidence: 'confirmed' | 'suspected'
  ) => {
    if (!classifyingTarget || !scenarioEngineRef.current) return;

    const targetId = classifyingTarget.targetId;
    if (classifiedTargetIds.has(targetId)) {
      setClassifyingTarget(null);
      return;
    }

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

    // If all scheduled targets are classified, conclude and present debrief with deliberate proceed action
    const updatedCount = classifiedTargetIds.size + 1;
    if (updatedCount >= scenario.targets.length) {
      if (scenarioEngineRef.current) {
        scenarioEngineRef.current.complete();
      }
      cameraControllerRef.current?.unlock();
      cameraControllerRef.current?.setPaused(true);
      setIsDebriefOpen(true);
    }
  };

  const handleClassificationCancel = () => {
    setClassifyingTarget(null);
  };

  const handleCompleteSession = async (engine: ScenarioEngine) => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    const events = engine.getEvents();
    const score = evaluateSession(engine.scenario, events, sessionId);

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
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100dvh', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 1 }}
        onClick={() => {
          if (!isPaused && !classifyingTarget && !isDebriefOpen) {
            cameraControllerRef.current?.requestLock();
          }
        }}
      />

      {/* Binocular Zoom Optical Vignette */}
      {isZoomed && (
        <div className="binocular-overlay">
          <div className="binocular-crosshair">
            <svg
              viewBox="0 0 600 600"
              style={{
                width: 'min(82vmin, 560px)',
                height: 'min(82vmin, 560px)',
                maxWidth: '92vw',
                maxHeight: '92vh'
              }}
            >
              {/* Outer Optical Boundary */}
              <circle cx="300" cy="300" r="280" fill="none" stroke="rgba(141, 217, 192, 0.45)" strokeWidth="1.5" strokeDasharray="6 8" />
              <circle cx="300" cy="300" r="285" fill="none" stroke="rgba(141, 217, 192, 0.2)" strokeWidth="1" />
              
              {/* Main Axis Reticle Lines */}
              <line x1="30" y1="300" x2="570" y2="300" stroke="rgba(141, 217, 192, 0.65)" strokeWidth="1.2" />
              <line x1="300" y1="30" x2="300" y2="570" stroke="rgba(141, 217, 192, 0.65)" strokeWidth="1.2" />
              
              {/* Center Open Circle */}
              <circle cx="300" cy="300" r="16" fill="none" stroke="var(--color-accent-mint)" strokeWidth="1.5" />
              <circle cx="300" cy="300" r="2" fill="var(--color-accent-mint)" />

              {/* Horizontal Milliradian Stadia Ticks */}
              {[-220, -180, -140, -100, -60, 60, 100, 140, 180, 220].map((offset) => (
                <React.Fragment key={`h-${offset}`}>
                  <line x1={300 + offset} y1="293" x2={300 + offset} y2="307" stroke="var(--color-accent-mint)" strokeWidth="1.2" />
                  <text x={300 + offset} y="286" fill="rgba(141,217,192,0.8)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
                    {Math.abs(offset / 10)}
                  </text>
                </React.Fragment>
              ))}

              {/* Vertical Elevation Ladder Ticks */}
              {[-220, -180, -140, -100, -60, 60, 100, 140, 180, 220].map((offset) => (
                <React.Fragment key={`v-${offset}`}>
                  <line x1="293" y1={300 + offset} x2="307" y2={300 + offset} stroke="var(--color-accent-mint)" strokeWidth="1.2" />
                  <text x="316" y={303 + offset} fill="rgba(141,217,192,0.8)" fontSize="9" fontFamily="var(--font-mono)">
                    {Math.abs(offset / 10)}
                  </text>
                </React.Fragment>
              ))}

              {/* Stadiametric Rangefinder Guide curve (Lower Left) */}
              <path d="M 120 440 Q 180 435 240 370" fill="none" stroke="rgba(141, 217, 192, 0.5)" strokeWidth="1.2" strokeDasharray="3 3" />
              <line x1="120" y1="440" x2="240" y2="440" stroke="rgba(141, 217, 192, 0.4)" strokeWidth="1" />
              <text x="140" y="456" fill="var(--color-accent-mint)" fontSize="8.5" fontFamily="var(--font-mono)">
                TARGET HEIGHT 1.0M : RANGE ESTIMATE
              </text>
            </svg>
          </div>
          <div style={{
            position: 'absolute',
            bottom: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--color-accent-mint)',
            letterSpacing: '0.18em',
            background: 'rgba(12,20,23,0.75)',
            padding: '4px 16px',
            borderRadius: '4px',
            border: '1px solid var(--color-border-subtle)'
          }}>
            OPTICAL BINOCULAR MAGNIFICATION: 3.2X // MIL-DOT RETICLE
          </div>
        </div>
      )}

      {/* Center Tactical Reticle / Dynamic Lock Bracket */}
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
        <svg
          width={activeTargetLock ? '64' : '44'}
          height={activeTargetLock ? '64' : '44'}
          viewBox="0 0 64 64"
          style={{
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: activeTargetLock ? 'drop-shadow(0 0 8px rgba(141, 217, 192, 0.8))' : 'none'
          }}
        >
          {/* Outer circle */}
          <circle
            cx="32"
            cy="32"
            r={activeTargetLock ? '28' : '18'}
            fill="none"
            stroke={activeTargetLock ? 'var(--color-accent-mint)' : 'rgba(141, 217, 192, 0.35)'}
            strokeWidth="1.2"
            strokeDasharray={activeTargetLock ? '4 2' : 'none'}
          />

          {/* Crosshair ticks */}
          <line x1="32" y1="6" x2="32" y2="14" stroke={activeTargetLock ? 'var(--color-accent-mint)' : 'rgba(141, 217, 192, 0.5)'} strokeWidth="1.5" />
          <line x1="32" y1="50" x2="32" y2="58" stroke={activeTargetLock ? 'var(--color-accent-mint)' : 'rgba(141, 217, 192, 0.5)'} strokeWidth="1.5" />
          <line x1="6" y1="32" x2="14" y2="32" stroke={activeTargetLock ? 'var(--color-accent-mint)' : 'rgba(141, 217, 192, 0.5)'} strokeWidth="1.5" />
          <line x1="50" y1="32" x2="58" y2="32" stroke={activeTargetLock ? 'var(--color-accent-mint)' : 'rgba(141, 217, 192, 0.5)'} strokeWidth="1.5" />

          {/* Corner Lock Brackets */}
          {activeTargetLock && (
            <>
              {/* Top-Left */}
              <path d="M 12 20 L 12 12 L 20 12" fill="none" stroke="var(--color-accent-mint)" strokeWidth="2.5" />
              {/* Top-Right */}
              <path d="M 44 12 L 52 12 L 52 20" fill="none" stroke="var(--color-accent-mint)" strokeWidth="2.5" />
              {/* Bottom-Left */}
              <path d="M 12 44 L 12 52 L 20 52" fill="none" stroke="var(--color-accent-mint)" strokeWidth="2.5" />
              {/* Bottom-Right */}
              <path d="M 52 44 L 52 52 L 44 52" fill="none" stroke="var(--color-accent-mint)" strokeWidth="2.5" />
            </>
          )}

          {/* Center Pip */}
          <circle cx="32" cy="32" r="2.5" fill={activeTargetLock ? 'var(--color-accent-mint)' : 'rgba(141, 217, 192, 0.8)'} />
        </svg>

        {activeTargetLock && (
          <div
            style={{
              marginTop: '12px',
              background: 'rgba(12, 20, 23, 0.92)',
              border: '1px solid var(--color-accent-mint)',
              borderRadius: '6px',
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--color-accent-mint)',
              textAlign: 'center',
              boxShadow: '0 0 24px rgba(141, 217, 192, 0.35)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <div style={{ letterSpacing: '0.06em' }}>
              TARGET LOCK: <strong>{activeTargetLock.callsign}</strong>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              RNG: {activeTargetLock.distanceMeters}m | BRG: {activeTargetLock.bearingDeg}° | PITCH: {activeTargetLock.pitchDeg}°
            </div>
            <div style={{ marginTop: '5px', color: '#ffffff', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              [SPACE / CLICK TO CLASSIFY]
            </div>
          </div>
        )}
      </div>

      {/* Exercise Objectives Concluded - Deliberate Trainee Debrief Dialog */}
      {isDebriefOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 16, 19, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
        >
          <div
            className="tactical-panel"
            style={{
              width: 'min(94vw, 560px)',
              padding: 'clamp(20px, 4vw, 36px)',
              border: '1px solid var(--color-accent-mint)',
              boxShadow: '0 0 48px rgba(141, 217, 192, 0.3)',
              textAlign: 'center'
            }}
          >
            <div className="tactical-header-tag" style={{ marginBottom: '8px' }}>
              EXERCISE AIRSPACE ENGAGEMENT CONCLUDED
            </div>
            <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              {scenario.codename} DEBRIEF
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.45, marginBottom: '20px' }}>
              All scheduled aerial target corridors have completed. Review contact tracking outcomes below and confirm progression to After-Action Review.
            </p>

            {/* Target Outcome Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(15, 24, 28, 0.7)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>SIMULATION TIME</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {Math.floor(elapsedSec)}s / {scenario.durationSeconds}s
                </div>
              </div>
              <div style={{ background: 'rgba(15, 24, 28, 0.7)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>CLASSIFIED</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success-green)', marginTop: '2px' }}>
                  {classifiedTargetIds.size} / {scenario.targets.length}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 24, 28, 0.7)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>MISSED CONTACTS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: scenario.targets.length - classifiedTargetIds.size > 0 ? 'var(--color-error-red)' : 'var(--color-text-muted)', marginTop: '2px' }}>
                  {Math.max(0, scenario.targets.length - classifiedTargetIds.size)}
                </div>
              </div>
            </div>

            {/* Target Breakdown Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', textAlign: 'left' }}>
              {scenario.targets.map((tgt) => {
                const wasClassified = classifiedTargetIds.has(tgt.id);
                return (
                  <div
                    key={tgt.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      background: 'rgba(12, 20, 23, 0.6)',
                      border: `1px solid ${wasClassified ? 'rgba(92, 214, 143, 0.3)' : 'rgba(217, 108, 108, 0.3)'}`,
                      fontSize: '0.8rem'
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {tgt.callsign} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>({tgt.flightProfile.replace('_', ' ')})</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: wasClassified ? 'var(--color-success-green)' : 'var(--color-error-red)' }}>
                      {wasClassified ? '✓ CLASSIFIED' : 'MISSED (DEPARTED AIRSPACE)'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Deliberate Trainee Progression Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => scenarioEngineRef.current && handleCompleteSession(scenarioEngineRef.current)}
                className="tactical-btn tactical-btn-primary"
                style={{ padding: '12px', fontSize: '0.88rem' }}
              >
                PROCEED TO AFTER-ACTION RESULTS →
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleRestart}
                  className="tactical-btn"
                  style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                >
                  <RotateCcw size={15} /> RESTART SCENARIO
                </button>
                <button
                  onClick={onAbortToMenu}
                  className="tactical-btn tactical-btn-danger"
                  style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                >
                  <LogOut size={15} /> ABORT TO MENU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Screen Markers */}
      {activeLocks.map((lock) => {
        const screenW = containerRef.current?.clientWidth || window.innerWidth;
        const screenH = containerRef.current?.clientHeight || window.innerHeight;
        if (lock.screenX < 0 || lock.screenX > screenW || lock.screenY < 0 || lock.screenY > screenH) {
          return null;
        }

        const isClassified = classifiedTargetIds.has(lock.targetId);
        const targetDef = scenario.targets.find((t) => t.id === lock.targetId);
        const remainingLifetimeSec = targetDef ? targetDef.despawnTimeSec - elapsedSec : 999;
        const isExpiringSoon = !isClassified && remainingLifetimeSec <= 6 && remainingLifetimeSec > 0;

        return (
          <div
            key={lock.targetId}
            style={{
              position: 'absolute',
              left: `${lock.screenX}px`,
              top: `${lock.screenY}px`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
              cursor: isClassified ? 'default' : 'pointer',
              zIndex: 25
            }}
            onClick={() => {
              if (!isClassified && !isDebriefOpen) triggerClassification(lock);
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: isClassified
                    ? '1.5px dashed var(--color-success-green)'
                    : lock.isLocked
                    ? '2px solid var(--color-accent-mint)'
                    : isExpiringSoon
                    ? '2px solid var(--color-warning-amber)'
                    : '1px solid rgba(230, 182, 92, 0.75)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: lock.isLocked ? 'rgba(141, 217, 192, 0.12)' : 'rgba(12, 20, 23, 0.35)',
                  boxShadow: isExpiringSoon ? '0 0 16px rgba(230, 182, 92, 0.6)' : lock.isLocked ? '0 0 14px rgba(141, 217, 192, 0.5)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: isClassified ? 'var(--color-success-green)' : lock.isLocked ? 'var(--color-accent-mint)' : isExpiringSoon ? 'var(--color-warning-amber)' : 'var(--color-warning-amber)'
                  }}
                />
              </div>

              {/* Callsign & Range Label Badge */}
              <div
                style={{
                  marginTop: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.66rem',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: 'rgba(10, 16, 19, 0.85)',
                  border: `1px solid ${isClassified ? 'rgba(92, 214, 143, 0.4)' : lock.isLocked ? 'rgba(141, 217, 192, 0.6)' : isExpiringSoon ? 'rgba(230, 182, 92, 0.7)' : 'rgba(230, 182, 92, 0.35)'}`,
                  color: isClassified ? 'var(--color-success-green)' : lock.isLocked ? 'var(--color-accent-mint)' : isExpiringSoon ? 'var(--color-warning-amber)' : 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(4px)',
                  textAlign: 'center'
                }}
              >
                <div>{lock.callsign} <strong style={{ color: '#ffffff' }}>[{lock.distanceMeters}m]</strong></div>
                {isExpiringSoon && (
                  <div style={{ color: 'var(--color-warning-amber)', fontSize: '0.6rem', fontWeight: 700 }}>
                    ⚠️ EXITING: {Math.ceil(remainingLifetimeSec)}s
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Top HUD Telemetry & Compass Layout */}
      <div
        className="simulation-hud-top-bar"
        style={{
          position: 'absolute',
          top: '12px',
          left: '16px',
          right: '16px',
          pointerEvents: 'none',
          zIndex: 40
        }}
      >
        {/* Mission Telemetry Card */}
        <div
          className="tactical-panel simulation-hud-telemetry"
          style={{
            padding: '12px 16px',
            width: 'min(280px, calc(100vw - 32px))',
            maxWidth: '280px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="tactical-header-tag">{scenario.codename}</span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: 'rgba(141,217,192,0.15)', color: 'var(--color-accent-mint)', fontFamily: 'var(--font-mono)' }}>
              {scenario.difficulty.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {scenario.name}
          </div>

          {/* Time & Progress */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              <span>MISSION TIME</span>
              <span>{Math.floor(elapsedSec)}s / {scenario.durationSeconds}s</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--color-accent-mint)', transition: 'width 0.1s linear' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
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
                  const targetDef = scenario.targets.find((t) => t.id === lock.targetId);
                  const remainingSec = targetDef ? targetDef.despawnTimeSec - elapsedSec : 999;
                  const isExpiringSoon = !isClassified && remainingSec <= 6 && remainingSec > 0;

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
                        border: isExpiringSoon ? '1px solid rgba(230, 182, 92, 0.5)' : '1px solid rgba(141, 217, 192, 0.1)'
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isExpiringSoon && (
                            <span style={{ color: 'var(--color-warning-amber)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700 }}>
                              {Math.ceil(remainingSec)}s
                            </span>
                          )}
                          <button
                            onClick={() => triggerClassification(lock)}
                            className="tactical-btn"
                            style={{
                              padding: '2px 7px',
                              fontSize: '0.68rem',
                              borderColor: isExpiringSoon ? 'var(--color-warning-amber)' : 'var(--color-accent-mint)',
                              color: isExpiringSoon ? 'var(--color-warning-amber)' : 'var(--color-accent-mint)'
                            }}
                          >
                            CLASSIFY
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center Compass Tape */}
        <div className="simulation-hud-compass" style={{ pointerEvents: 'none', transform: 'scale(0.95)' }}>
          <CompassTape bearingDeg={bearingDeg} pitchDeg={pitchDeg} />
        </div>

        {/* Quick Tactical Controls */}
        <div className="simulation-hud-controls" style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
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
        className="hud-disclaimer-watermark"
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

      {/* Controls Hint Overlay at bottom left (responsive display) */}
      <div
        className="hud-controls-hint"
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
        <span>[{formatKeyDisplay(inputManager.getBinding('moveForward'))}{formatKeyDisplay(inputManager.getBinding('moveLeft'))}{formatKeyDisplay(inputManager.getBinding('moveBackward'))}{formatKeyDisplay(inputManager.getBinding('moveRight'))}] Move Post</span>
        <span>[MOUSE] Pan Camera</span>
        <span>[{formatKeyDisplay(inputManager.getBinding('toggleZoom'))}] Binoculars</span>
        <span>[{formatKeyDisplay(inputManager.getBinding('triggerClassification'))}] Classify Lock</span>
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
            zIndex: 100,
            padding: '16px'
          }}
        >
          <div className="tactical-panel" style={{ width: 'min(92vw, 420px)', padding: 'clamp(20px, 4vw, 32px)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div className="tactical-header-tag">SIMULATION SUSPENDED</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '6px' }}>PAUSE MENU</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Simulation clock and target physics are frozen.
              </p>
            </div>

            {/* Live Mouse Sensitivity Calibration */}
            <div style={{ marginBottom: '18px', padding: '12px 14px', background: 'rgba(12, 20, 23, 0.7)', borderRadius: '6px', border: '1px solid var(--color-border-subtle)', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                <span>AIM SENSITIVITY:</span>
                <span style={{ color: 'var(--color-accent-mint)', fontWeight: 700 }}>{currentSensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={currentSensitivity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentSensitivity(val);
                  const updated = { ...settings, mouseSensitivity: val };
                  cameraControllerRef.current?.updateSettings(updated);
                  storage.saveSettings(updated).catch(() => {});
                }}
                style={{ width: '100%', accentColor: 'var(--color-accent-mint)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                <span>0.1x (Fine)</span>
                <span>1.0x (Calibrated)</span>
                <span>3.0x (Fast)</span>
              </div>
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
