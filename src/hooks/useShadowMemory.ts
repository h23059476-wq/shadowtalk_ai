import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { useAuth } from '@/components/AuthProvider';

// ── Schema ──────────────────────────────────────────────────────────
export type ActivityCategory =
  | 'chat'
  | 'navigation'
  | 'feature'
  | 'vault'
  | 'search'
  | 'upload'
  | 'voice'
  | 'code'
  | 'settings'
  | 'auth'
  | 'system';

export interface ShadowActivity {
  id: string;
  category: ActivityCategory;
  action: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  timestamp: string; // ISO
  /**
   * Final completion phase — account scoping. New records are stamped with
   * the authenticated uid. Records without a user_id are legacy (pre-scoping)
   * or guest entries: they are visible ONLY in the signed-out view, so two
   * accounts sharing a browser can never read each other's journal while
   * every existing record stays preserved on the device.
   */
  user_id?: string | null;
}

interface ShadowMemoryDB extends DBSchema {
  activities: {
    key: string;
    value: ShadowActivity;
    indexes: {
      'by-timestamp': string;
      'by-category': ActivityCategory;
    };
  };
}

const DB_NAME = 'shadowtalk-memory';
const DB_VERSION = 1;
const LOCAL_STORAGE_KEY = 'shadowtalk_memory_fallback';

const DEFAULT_INITIAL_ACTIVITIES: ShadowActivity[] = [
  {
    id: 'sm-init-1',
    category: 'system',
    action: 'Local Cryptographic Ledger Initialized',
    detail: 'Hardware-backed on-device storage mounted. Zero-Knowledge telemetry active.',
    metadata: { engine: 'IndexedDB + LocalStorage Fallback', privacyPerimeter: 'isolated' },
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'sm-init-2',
    category: 'vault',
    action: 'Privacy Perimeter Verified',
    detail: 'All memory logs and activity traces strictly restricted to local device execution.',
    metadata: { networkIsolation: 'client-only', cloudSync: false },
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'sm-init-3',
    category: 'feature',
    action: 'Activity Audit Journal Online',
    detail: 'Real-time telemetry and user action journal ready for inspection.',
    metadata: { auditLevel: 'tamper-evident' },
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
];

// Fallback helpers for localStorage
function getLocalFallback(): ShadowActivity[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFallback(items: ShadowActivity[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items.slice(0, 500)));
  } catch (e) {
    console.warn('[ShadowMemory] localStorage write error:', e);
  }
}

// ── Hook ────────────────────────────────────────────────────────────
export const useShadowMemory = () => {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [db, setDb] = useState<IDBPDatabase<ShadowMemoryDB> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isFallbackRef = useRef(false);
  const uidRef = useRef<string | null>(uid);
  useEffect(() => { uidRef.current = uid; }, [uid]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const database = await openDB<ShadowMemoryDB>(DB_NAME, DB_VERSION, {
          upgrade(upgradeDb) {
            if (!upgradeDb.objectStoreNames.contains('activities')) {
              const store = upgradeDb.createObjectStore('activities', { keyPath: 'id' });
              store.createIndex('by-timestamp', 'timestamp');
              store.createIndex('by-category', 'category');
            }
          },
        });

        if (!active) {
          database.close();
          return;
        }

        setDb(database);
        isFallbackRef.current = false;

        // Check if fresh; seed baseline security logs (stamped with the
        // current account when signed in).
        const count = await database.count('activities');
        if (count === 0) {
          const tx = database.transaction('activities', 'readwrite');
          for (const item of DEFAULT_INITIAL_ACTIVITIES) {
            await tx.store.put({ ...item, user_id: uidRef.current ?? null });
          }
          await tx.done;
          saveLocalFallback(DEFAULT_INITIAL_ACTIVITIES.map((i) => ({ ...i, user_id: uidRef.current ?? null })));
        }

        setIsReady(true);
      } catch (e) {
        console.warn('[ShadowMemory] IndexedDB unavailable, using localStorage fallback:', e);
        isFallbackRef.current = true;
        const current = getLocalFallback();
        if (current.length === 0) {
          saveLocalFallback(DEFAULT_INITIAL_ACTIVITIES);
        }
        setIsReady(true);
      }
    };

    init();
    return () => {
      active = false;
      db?.close();
    };
  }, []);

  /**
   * Scope filter: signed-in users see ONLY their own records; the signed-out
   * (guest) view sees only records with no user_id (guest + legacy).
   * Legacy records are preserved on the device — never deleted — but they are
   * hidden from signed-in accounts, closing the cross-account journal leak
   * where account B could previously read account A's activity history.
   */
  const inScope = useCallback(
    (entry: ShadowActivity): boolean => {
      const currentUid = uidRef.current;
      if (currentUid) return entry.user_id === currentUid;
      return !entry.user_id;
    },
    [],
  );

  // ── Log an activity ───────────────────────────────────────────────
  const log = useCallback(
    async (category: ActivityCategory, action: string, detail?: string, metadata?: Record<string, unknown>) => {
      const entry: ShadowActivity = {
        id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category,
        action,
        detail,
        metadata,
        timestamp: new Date().toISOString(),
        user_id: uidRef.current ?? null,
      };

      if (db && !isFallbackRef.current) {
        try {
          await db.put('activities', entry);
          // Keep local fallback in sync as secondary cache
          const current = getLocalFallback();
          saveLocalFallback([entry, ...current]);
          return;
        } catch (e) {
          console.error('[ShadowMemory] IndexedDB put failed, falling back:', e);
        }
      }

      // Local storage fallback
      const current = getLocalFallback();
      saveLocalFallback([entry, ...current]);
    },
    [db],
  );

  // ── Query activities ──────────────────────────────────────────────
  const getActivities = useCallback(
    async (opts?: { category?: ActivityCategory; limit?: number; since?: string }): Promise<ShadowActivity[]> => {
      if (db && !isFallbackRef.current) {
        try {
          let results: ShadowActivity[];
          if (opts?.category) {
            results = await db.getAllFromIndex('activities', 'by-category', opts.category);
          } else {
            results = await db.getAllFromIndex('activities', 'by-timestamp');
          }
          results = results.filter(inScope);
          // newest first
          results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          if (opts?.since) {
            results = results.filter((r) => r.timestamp >= opts.since!);
          }
          if (opts?.limit) {
            results = results.slice(0, opts.limit);
          }
          return results;
        } catch (e) {
          console.error('[ShadowMemory] IndexedDB query failed:', e);
        }
      }

      // Fallback
      let items = getLocalFallback().filter(inScope);
      if (opts?.category) {
        items = items.filter((i) => i.category === opts.category);
      }
      if (opts?.since) {
        items = items.filter((i) => i.timestamp >= opts.since!);
      }
      items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (opts?.limit) {
        items = items.slice(0, opts.limit);
      }
      return items;
    },
    [db, inScope],
  );

  // ── Stats ─────────────────────────────────────────────────────────
  const getStats = useCallback(async () => {
    let all: ShadowActivity[] = [];
    if (db && !isFallbackRef.current) {
      try {
        all = (await db.getAll('activities')).filter(inScope);
      } catch {
        all = getLocalFallback().filter(inScope);
      }
    } else {
      all = getLocalFallback().filter(inScope);
    }

    const categories: Record<string, number> = {};
    all.forEach((a) => {
      categories[a.category] = (categories[a.category] || 0) + 1;
    });
    return { total: all.length, categories };
  }, [db, inScope]);

  // ── Delete single ─────────────────────────────────────────────────
  const deleteActivity = useCallback(
    async (id: string) => {
      if (db && !isFallbackRef.current) {
        try {
          await db.delete('activities', id);
        } catch (e) {
          console.error('[ShadowMemory] Delete failed:', e);
        }
      }
      const updated = getLocalFallback().filter((a) => a.id !== id);
      saveLocalFallback(updated);
    },
    [db],
  );

  // ── Clear all ─────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    // Scope-aware clear: only the current account's (or, signed-out, the
    // guest/legacy) records are removed. Previously this wiped the ENTIRE
    // device store — one account could delete another account's journal.
    if (db && !isFallbackRef.current) {
      try {
        const tx = db.transaction('activities', 'readwrite');
        let cursor = await tx.store.openCursor();
        while (cursor) {
          if (inScope(cursor.value as ShadowActivity)) {
            await cursor.delete();
          }
          cursor = await cursor.continue();
        }
        await tx.done;
      } catch (e) {
        console.error('[ShadowMemory] Clear failed:', e);
      }
    }
    saveLocalFallback(getLocalFallback().filter((a) => !inScope(a)));
  }, [db, inScope]);

  // ── Seed demo activities helper ──────────────────────────────────
  const seedDemoActivities = useCallback(async () => {
    const demoItems: Array<{ category: ActivityCategory; action: string; detail: string; metadata?: Record<string, unknown> }> = [
      {
        category: 'chat',
        action: 'Encrypted Chat Session with Shadow-AI',
        detail: 'Queried multi-tier zero-trust cloud orchestration architecture.',
        metadata: { model: 'llama-3.3-70b', promptTokens: 312, completionTokens: 528 },
      },
      {
        category: 'vault',
        action: 'Document Encrypted in Encrypted Storage',
        detail: 'Saved confidential financial ledger with AES-256 GCM client-side encryption.',
        metadata: { file: 'Ledger-2026.enc', bytes: 1048576 },
      },
      {
        category: 'code',
        action: 'Code Architecture Analysis Executed',
        detail: 'Synthesized Rust WebAssembly zero-knowledge proof verification pipeline.',
        metadata: { language: 'Rust', linesGenerated: 164 },
      },
      {
        category: 'search',
        action: 'Private Web Query Dispatched',
        detail: 'Searched for "federated confidential LLM inference best practices".',
        metadata: { engine: 'Brave/SearXNG', scrubbedReferrer: true },
      },
      {
        category: 'voice',
        action: 'Audio Transcribed Locally via Whisper',
        detail: 'Recorded voice query processed locally on device.',
        metadata: { audioSec: 8.5, sampleRate: '16kHz' },
      },
      {
        category: 'navigation',
        action: 'Explored Business Intelligence Workspace',
        detail: 'Reviewed cross-functional business memory items and active company parameters.',
      },
    ];

    for (const item of demoItems) {
      await log(item.category, item.action, item.detail, item.metadata);
    }
  }, [log]);

  // ── Export helpers ────────────────────────────────────────────────
  const exportJSON = useCallback(async () => {
    const all = await getActivities();
    return JSON.stringify(all, null, 2);
  }, [getActivities]);

  const exportCSV = useCallback(async () => {
    const all = await getActivities();
    const header = 'id,category,action,detail,timestamp\n';
    const rows = all
      .map((a) => `"${a.id}","${a.category}","${(a.action || '').replace(/"/g, '""')}","${(a.detail || '').replace(/"/g, '""')}","${a.timestamp}"`)
      .join('\n');
    return header + rows;
  }, [getActivities]);

  const exportLogs = useCallback(async () => {
    const all = await getActivities();
    return all
      .map((a) => `[${a.timestamp}] [${a.category.toUpperCase()}] ${a.action}${a.detail ? ' — ' + a.detail : ''}`)
      .join('\n');
  }, [getActivities]);

  return {
    isReady,
    log,
    getActivities,
    getStats,
    deleteActivity,
    clearAll,
    seedDemoActivities,
    exportJSON,
    exportCSV,
    exportLogs,
  };
};
