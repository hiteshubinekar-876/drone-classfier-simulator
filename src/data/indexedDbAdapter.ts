import { StorageAdapter } from './storageAdapter';
import { TrainingSession, SimulationEvent, TrainingScore, UserSettings, DEFAULT_SETTINGS } from '../types';

const DB_NAME = 'DroneThreatSimDB';
const DB_VERSION = 1;

export class IndexedDbStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private memoryFallback: {
    sessions: Map<string, TrainingSession>;
    events: Map<string, SimulationEvent[]>;
    scores: Map<string, TrainingScore>;
    settings: UserSettings;
  } = {
    sessions: new Map(),
    events: new Map(),
    scores: new Map(),
    settings: { ...DEFAULT_SETTINGS }
  };

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[Storage] IndexedDB not supported; using in-memory fallback.');
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onerror = () => {
          console.warn('[Storage] IndexedDB open error; falling back to memory storage.', request.error);
          resolve();
        };
      } catch (err) {
        console.warn('[Storage] IndexedDB initialization failed:', err);
        resolve();
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

  async saveSettings(settings: UserSettings): Promise<void> {
    this.memoryFallback.settings = { ...settings };
    try {
      localStorage.setItem('drone_sim_settings', JSON.stringify(settings));
    } catch {}

    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put({ id: 'user_settings', ...settings });
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
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}

    if (!this.db) {
      return this.memoryFallback.settings;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('user_settings');
        req.onsuccess = () => {
          if (req.result) {
            const { id: _, ...rest } = req.result;
            resolve({ ...DEFAULT_SETTINGS, ...rest });
          } else {
            resolve({ ...DEFAULT_SETTINGS });
          }
        };
        req.onerror = () => resolve({ ...DEFAULT_SETTINGS });
      } catch {
        resolve({ ...DEFAULT_SETTINGS });
      }
    });
  }

  async clearAllData(): Promise<void> {
    this.memoryFallback.sessions.clear();
    this.memoryFallback.events.clear();
    this.memoryFallback.scores.clear();
    try {
      localStorage.removeItem('drone_sim_settings');
    } catch {}

    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(['sessions', 'events', 'scores'], 'readwrite');
        tx.objectStore('sessions').clear();
        tx.objectStore('events').clear();
        tx.objectStore('scores').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const storage = new IndexedDbStorageAdapter();
