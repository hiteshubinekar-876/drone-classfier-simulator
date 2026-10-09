import { TrainingSession, SimulationEvent, TrainingScore, UserSettings } from '../types';

export interface StorageAdapter {
  init(): Promise<void>;
  saveSession(session: TrainingSession): Promise<void>;
  getSession(id: string): Promise<TrainingSession | null>;
  getAllSessions(): Promise<TrainingSession[]>;
  saveEvents(sessionId: string, events: SimulationEvent[]): Promise<void>;
  getEvents(sessionId: string): Promise<SimulationEvent[]>;
  saveScore(score: TrainingScore): Promise<void>;
  getScore(sessionId: string): Promise<TrainingScore | null>;
  saveSettings(settings: UserSettings): Promise<void>;
  getSettings(): Promise<UserSettings>;
  clearAllData(): Promise<void>;
}
