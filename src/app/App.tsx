import React, { useState, useEffect } from 'react';
import {
  ScenarioDefinition,
  TrainingSession,
  TrainingScore,
  SimulationEvent,
  UserSettings,
  DEFAULT_SETTINGS
} from '../types';
import { SCENARIOS } from '../data/mockScenarios';
import { storage } from '../data/indexedDbAdapter';
import { WelcomeScreen } from '../features/welcome/WelcomeScreen';
import { MainMenuScreen } from '../features/menu/MainMenuScreen';
import { ScenarioSelectScreen } from '../features/scenarios/ScenarioSelectScreen';
import { BriefingScreen } from '../features/briefing/BriefingScreen';
import { SimulationScreen } from '../features/simulation/SimulationScreen';
import { ResultsScreen } from '../features/results/ResultsScreen';
import { AARDashboardScreen } from '../features/aar/AARDashboardScreen';
import { SessionHistoryScreen } from '../features/history/SessionHistoryScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { inputManager } from '../services/inputManager';

type AppView =
  | 'welcome'
  | 'menu'
  | 'scenario_select'
  | 'briefing'
  | 'simulation'
  | 'results'
  | 'aar'
  | 'history'
  | 'settings';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDefinition>(SCENARIOS[0]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [aarReturnView, setAarReturnView] = useState<'results' | 'history'>('results');

  // Active session and score for results & AAR
  const [lastSession, setLastSession] = useState<TrainingSession | null>(null);
  const [lastScore, setLastScore] = useState<TrainingScore | null>(null);
  const [lastEvents, setLastEvents] = useState<SimulationEvent[]>([]);

  // Initialize storage and load settings
  useEffect(() => {
    const init = async () => {
      await storage.init();
      const savedSettings = await storage.getSettings();
      setSettings(savedSettings);
      if (savedSettings.keyBindings) {
        inputManager.setAllBindings(savedSettings.keyBindings);
      }
    };
    init();
  }, []);

  const handleFinishSimulation = (
    session: TrainingSession,
    score: TrainingScore,
    events: SimulationEvent[]
  ) => {
    setLastSession(session);
    setLastScore(score);
    setLastEvents(events);
    setCurrentView('results');
  };

  const handleInspectHistoricalAAR = (
    session: TrainingSession,
    score: TrainingScore,
    events: SimulationEvent[]
  ) => {
    setLastSession(session);
    setLastScore(score);
    setLastEvents(events);

    // Locate matching scenario if available
    const matched = SCENARIOS.find((s) => s.id === session.scenarioId) || SCENARIOS[0];
    setSelectedScenario(matched);
    setAarReturnView('history');
    setCurrentView('aar');
  };

  return (
    <div style={{ width: '100%', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      {currentView === 'welcome' && (
        <WelcomeScreen
          onEnter={() => setCurrentView('menu')}
          onQuickStart={() => {
            setSelectedScenario(SCENARIOS[0]);
            setCurrentView('briefing');
          }}
        />
      )}

      {currentView === 'menu' && (
        <MainMenuScreen
          onStartTraining={() => setCurrentView('scenario_select')}
          onOpenHistory={() => setCurrentView('history')}
          onOpenSettings={() => setCurrentView('settings')}
        />
      )}

      {currentView === 'scenario_select' && (
        <ScenarioSelectScreen
          onSelectScenario={(sc) => {
            setSelectedScenario(sc);
            setCurrentView('briefing');
          }}
          onBack={() => setCurrentView('menu')}
        />
      )}

      {currentView === 'briefing' && (
        <BriefingScreen
          scenario={selectedScenario}
          onCommence={() => setCurrentView('simulation')}
          onBack={() => setCurrentView('scenario_select')}
        />
      )}

      {currentView === 'simulation' && (
        <SimulationScreen
          scenario={selectedScenario}
          settings={settings}
          onFinishSession={handleFinishSimulation}
          onAbortToMenu={() => setCurrentView('menu')}
        />
      )}

      {currentView === 'results' && lastSession && lastScore && (
        <ResultsScreen
          session={lastSession}
          score={lastScore}
          scenario={selectedScenario}
          onOpenAAR={() => {
            setAarReturnView('results');
            setCurrentView('aar');
          }}
          onRetry={() => setCurrentView('simulation')}
          onMainMenu={() => setCurrentView('menu')}
        />
      )}

      {currentView === 'aar' && lastSession && lastScore && (
        <AARDashboardScreen
          session={lastSession}
          score={lastScore}
          events={lastEvents}
          scenario={selectedScenario}
          onBack={() => setCurrentView(aarReturnView)}
          onMainMenu={() => setCurrentView('menu')}
          backButtonLabel={aarReturnView === 'history' ? 'BACK TO HISTORY' : 'BACK TO RESULTS'}
        />
      )}

      {currentView === 'history' && (
        <SessionHistoryScreen
          onInspectSessionAAR={handleInspectHistoricalAAR}
          onBack={() => setCurrentView('menu')}
        />
      )}

      {currentView === 'settings' && (
        <SettingsScreen
          currentSettings={settings}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            if (newSettings.keyBindings) {
              inputManager.setAllBindings(newSettings.keyBindings);
            }
          }}
          onBack={() => setCurrentView('menu')}
        />
      )}
    </div>
  );
};
