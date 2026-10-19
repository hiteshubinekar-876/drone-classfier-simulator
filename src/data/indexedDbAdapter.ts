import { StorageAdapter } from './storageAdapter';
import {
  TrainingSession,
  SimulationEvent,
  TrainingScore,
  UserSettings,
  AarInsightReport,
  DEFAULT_SETTINGS,
  DEFAULT_KEY_BINDINGS,
  KeyBindings
} from '../types';

export function sanitizeUserSettings(raw: unknown): UserSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
  }

  const r = raw as Partial<UserSettings>;

  const graphicsPreset = (['low', 'medium', 'high'] as const).includes(r.graphicsPreset as 'low')
    ? (r.graphicsPreset as 'low' | 'medium' | 'high')
    : DEFAULT_SETTINGS.graphicsPreset;

  const resolutionScale =
    typeof r.resolutionScale === 'number' && !isNaN(r.resolutionScale) && r.resolutionScale > 0
      ? r.resolutionScale
      : DEFAULT_SETTINGS.resolutionScale;

  const fieldOfView =
    typeof r.fieldOfView === 'number' && !isNaN(r.fieldOfView) && r.fieldOfView >= 45 && r.fieldOfView <= 120
      ? r.fieldOfView
      : DEFAULT_SETTINGS.fieldOfView;

  const shadowsEnabled =
    typeof r.shadowsEnabled === 'boolean'
      ? r.shadowsEnabled
      : DEFAULT_SETTINGS.shadowsEnabled;

  const masterVolume =
    typeof r.masterVolume === 'number' && !isNaN(r.masterVolume) && r.masterVolume >= 0 && r.masterVolume <= 1
      ? r.masterVolume
      : DEFAULT_SETTINGS.masterVolume;

  const ambientVolume =
    typeof r.ambientVolume === 'number' && !isNaN(r.ambientVolume) && r.ambientVolume >= 0 && r.ambientVolume <= 1
      ? r.ambientVolume
      : DEFAULT_SETTINGS.ambientVolume;

  const sfxVolume =
    typeof r.sfxVolume === 'number' && !isNaN(r.sfxVolume) && r.sfxVolume >= 0 && r.sfxVolume <= 1
      ? r.sfxVolume
      : DEFAULT_SETTINGS.sfxVolume;

  const mouseSensitivity =
    typeof r.mouseSensitivity === 'number' && !isNaN(r.mouseSensitivity) && r.mouseSensitivity > 0 && r.mouseSensitivity <= 10
      ? r.mouseSensitivity
      : DEFAULT_SETTINGS.mouseSensitivity;

  const invertY =
    typeof r.invertY === 'boolean'
      ? r.invertY
      : DEFAULT_SETTINGS.invertY;

  const reducedMotion =
    typeof r.reducedMotion === 'boolean'
      ? r.reducedMotion
      : DEFAULT_SETTINGS.reducedMotion;

  const targetObservationPacing =
    (['standard', 'extended', 'relaxed'] as const).includes(r.targetObservationPacing as 'standard')
      ? (r.targetObservationPacing as 'standard' | 'extended' | 'relaxed')
      : DEFAULT_SETTINGS.targetObservationPacing;

  // Validate and sanitize key bindings
  const keyBindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  if (r.keyBindings && typeof r.keyBindings === 'object') {
    for (const key of Object.keys(DEFAULT_KEY_BINDINGS) as (keyof KeyBindings)[]) {
      const candidate = (r.keyBindings as Record<string, unknown>)[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        keyBindings[key] = candidate;
      }
    }
  }

  return {
    graphicsPreset,
    resolutionScale,
    fieldOfView,
    shadowsEnabled,
    masterVolume,
    ambientVolume,
    sfxVolume,
    mouseSensitivity,
    invertY,
    reducedMotion,
    targetObservationPacing,
    keyBindings
  };
}

const DB_NAME = 'DroneThreatSimDB';
const DB_VERSION = 2;

export class IndexedDbStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private memoryFallback: {
    sessions: Map<string, TrainingSession>;
    events: Map<string, SimulationEvent[]>;
    scores: Map<string, TrainingScore>;
    insights: Map<string, AarInsightReport>;
    settings: UserSettings;
  } = {
    sessions: new Map(),
    events: new Map(),
    scores: new Map(),
    insights: new Map(),
    settings: { ...DEFAULT_SETTINGS }
  };

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[Storage] IndexedDB not supported; using in-memory fallback.');
      return;
    }

    return new Promise((resolve) => {
      let settled = false;
      const safeResolve = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutTimer);
          resolve();
        }
      };

      // Failsafe: if IndexedDB hangs or is blocked, unblock after 1200ms
      const timeoutTimer = setTimeout(() => {
        console.warn('[Storage] IndexedDB initialization timed out; continuing with fallback.');
        safeResolve();
      }, 1200);

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onblocked = () => {
          console.warn('[Storage] IndexedDB open blocked by another tab; falling back to memory storage.');
          safeResolve();
        };

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('events')) {
            const eventStore = db.createObjectStore('events', { keyPath: 'id' });
            eventStore.createIndex('sessionId', 'sessionId', { unique: false });
          }
          if (!db.objectStoreNames.contains('scores')) {
            const scoreStore = db.createObjectStore('scores', { keyPath: 'id' });
            scoreStore.createIndex('sessionId', 'sessionId', { unique: true });
          }
          if (!db.objectStoreNames.contains('aar_insights')) {
            db.createObjectStore('aar_insights', { keyPath: 'sessionId' });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          safeResolve();
        };

        request.onerror = () => {
          console.warn('[Storage] IndexedDB open error; falling back to memory storage.', request.error);
          safeResolve();
        };
      } catch (err) {
        console.warn('[Storage] IndexedDB initialization failed:', err);
        safeResolve();
      }
    });
  }

  async saveSession(session: TrainingSession): Promise<void> {
    this.memoryFallback.sessions.set(session.id, session);
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('sessions', 'readwrite');
        const store = tx.objectStore('sessions');
        store.put(session);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        resolve();
      }
    });
  }

  async getSession(id: string): Promise<TrainingSession | null> {
    if (!this.db) {
      return this.memoryFallback.sessions.get(id) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(this.memoryFallback.sessions.get(id) || null);
      } catch {
        resolve(this.memoryFallback.sessions.get(id) || null);
      }
    });
  }

  async getAllSessions(): Promise<TrainingSession[]> {
    if (!this.db) {
      return Array.from(this.memoryFallback.sessions.values()).sort((a, b) => b.startedAt - a.startedAt);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const req = store.getAll();
        req.onsuccess = () => {
          const list: TrainingSession[] = req.result || [];
          list.sort((a, b) => b.startedAt - a.startedAt);
          resolve(list);
        };
        req.onerror = () => {
          resolve(Array.from(this.memoryFallback.sessions.values()).sort((a, b) => b.startedAt - a.startedAt));
        };
      } catch {
        resolve(Array.from(this.memoryFallback.sessions.values()).sort((a, b) => b.startedAt - a.startedAt));
      }
    });
  }

  async saveEvents(sessionId: string, events: SimulationEvent[]): Promise<void> {
    this.memoryFallback.events.set(sessionId, events);
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        for (const ev of events) {
          store.put(ev);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getEvents(sessionId: string): Promise<SimulationEvent[]> {
    if (!this.db) {
      return this.memoryFallback.events.get(sessionId) || [];
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const index = store.index('sessionId');
        const req = index.getAll(sessionId);
        req.onsuccess = () => {
          const list: SimulationEvent[] = req.result || [];
          list.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
          resolve(list);
        };
        req.onerror = () => {
          resolve(this.memoryFallback.events.get(sessionId) || []);
        };
      } catch {
        resolve(this.memoryFallback.events.get(sessionId) || []);
      }
    });
  }

  async saveScore(score: TrainingScore): Promise<void> {
    this.memoryFallback.scores.set(score.sessionId, score);
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('scores', 'readwrite');
        const store = tx.objectStore('scores');
        store.put(score);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getScore(sessionId: string): Promise<TrainingScore | null> {
    if (!this.db) {
      return this.memoryFallback.scores.get(sessionId) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('scores', 'readonly');
        const store = tx.objectStore('scores');
        const index = store.index('sessionId');
        const req = index.get(sessionId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(this.memoryFallback.scores.get(sessionId) || null);
      } catch {
        resolve(this.memoryFallback.scores.get(sessionId) || null);
      }
    });
  }

  async saveAarInsight(insight: AarInsightReport): Promise<void> {
    this.memoryFallback.insights.set(insight.sessionId, insight);
    if (!this.db || !this.db.objectStoreNames.contains('aar_insights')) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('aar_insights', 'readwrite');
        const store = tx.objectStore('aar_insights');
        store.put(insight);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getAarInsight(sessionId: string): Promise<AarInsightReport | null> {
    if (!this.db || !this.db.objectStoreNames.contains('aar_insights')) {
      return this.memoryFallback.insights.get(sessionId) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('aar_insights', 'readonly');
        const store = tx.objectStore('aar_insights');
        const req = store.get(sessionId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(this.memoryFallback.insights.get(sessionId) || null);
      } catch {
        resolve(this.memoryFallback.insights.get(sessionId) || null);
      }
    });
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    const sanitized = sanitizeUserSettings(settings);
    this.memoryFallback.settings = sanitized;
    try {
      localStorage.setItem('drone_sim_settings', JSON.stringify(sanitized));
    } catch {}

    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put({ id: 'user_settings', ...sanitized });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getSettings(): Promise<UserSettings> {
    try {
      const stored = localStorage.getItem('drone_sim_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeUserSettings(parsed);
        this.memoryFallback.settings = sanitized;
        return sanitized;
      }
    } catch {}

    if (!this.db) {
      return sanitizeUserSettings(this.memoryFallback.settings);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('user_settings');
        req.onsuccess = () => {
          if (req.result) {
            const { id: _, ...rest } = req.result;
            const sanitized = sanitizeUserSettings(rest);
            resolve(sanitized);
          } else {
            resolve(sanitizeUserSettings(this.memoryFallback.settings));
          }
        };
        req.onerror = () => resolve(sanitizeUserSettings(this.memoryFallback.settings));
      } catch {
        resolve(sanitizeUserSettings(this.memoryFallback.settings));
      }
    });
  }

  async clearAllData(): Promise<void> {
    this.memoryFallback.sessions.clear();
    this.memoryFallback.events.clear();
    this.memoryFallback.scores.clear();
    this.memoryFallback.insights.clear();
    try {
      localStorage.removeItem('drone_sim_settings');
    } catch {}

    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const stores = ['sessions', 'events', 'scores'];
        if (this.db!.objectStoreNames.contains('aar_insights')) {
          stores.push('aar_insights');
        }
        const tx = this.db!.transaction(stores, 'readwrite');
        tx.objectStore('sessions').clear();
        tx.objectStore('events').clear();
        tx.objectStore('scores').clear();
        if (this.db!.objectStoreNames.contains('aar_insights')) {
          tx.objectStore('aar_insights').clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const storage = new IndexedDbStorageAdapter();
