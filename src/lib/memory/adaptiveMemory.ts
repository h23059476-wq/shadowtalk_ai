/**
 * Adaptive long-term memory for ShadowTalk.
 *
 * Principles:
 * - Capture high-signal turns: user facts, preferences, decisions, tasks.
 * - Forget low-signal noise: pleasantries, filler, one-off errors.
 * - Expose compact recall packets for prompts/UI.
 * - Stay local-first by default; never require cloud storage.
 * - Backed by IndexedDB (idb) when available; falls back to localStorage
 *   so the memory system still works in environments without IndexedDB
 *   (test runners, private browsing, old browsers).
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MemoryFact {
  id: string;
  kind: 'fact' | 'preference' | 'decision' | 'task' | 'identity';
  content: string;
  confidence: number;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  source?: string;
}

interface MemoryDB extends DBSchema {
  facts: {
    key: string;
    value: MemoryFact;
    indexes: { 'by-confidence': number, 'by-lastUsedAt': number };
  };
}

const STORAGE_KEY = 'shadowtalk_adaptive_memory_v2';
const DB_NAME = 'shadowtalk_memory_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MemoryDB>> | null = null;
let useLocalStorageFallback = false;

/** Detect whether IndexedDB is available in the current environment. */
function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function getDB(): Promise<IDBPDatabase<MemoryDB>> {
  if (!dbPromise && !useLocalStorageFallback) {
    if (!isIndexedDBAvailable()) {
      useLocalStorageFallback = true;
      return Promise.reject(new Error('IndexedDB unavailable'));
    }
    dbPromise = openDB<MemoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('facts')) {
          const store = db.createObjectStore('facts', { keyPath: 'id' });
          store.createIndex('by-confidence', 'confidence');
          store.createIndex('by-lastUsedAt', 'lastUsedAt');
        }
      },
    }).catch((err) => {
      // If IndexedDB fails to open (e.g. private browsing, test env),
      // permanently switch to the localStorage fallback.
      console.warn('[AdaptiveMemory] IndexedDB unavailable, using localStorage fallback:', err?.message || err);
      useLocalStorageFallback = true;
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise!;
}

// ── localStorage fallback helpers ──────────────────────────────────────

function readLocalFacts(): MemoryFact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalFacts(facts: MemoryFact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(facts));
  } catch {
    // storage full or unavailable — best-effort
  }
}

/** Get all facts from whichever storage backend is active. */
async function getAllFacts(): Promise<MemoryFact[]> {
  if (useLocalStorageFallback) {
    return readLocalFacts();
  }
  const db = await getDB();
  return db.getAll('facts');
}

/** Put a fact into whichever storage backend is active. */
async function putFact(fact: MemoryFact): Promise<void> {
  if (useLocalStorageFallback) {
    const facts = readLocalFacts();
    const idx = facts.findIndex((f) => f.id === fact.id);
    if (idx >= 0) facts[idx] = fact;
    else facts.push(fact);
    writeLocalFacts(facts);
    return;
  }
  const db = await getDB();
  await db.put('facts', fact);
}

/** Delete a fact by ID from whichever storage backend is active. */
async function deleteFact(id: string): Promise<void> {
  if (useLocalStorageFallback) {
    const facts = readLocalFacts().filter((f) => f.id !== id);
    writeLocalFacts(facts);
    return;
  }
  const db = await getDB();
  await db.delete('facts', id);
}

/** Count all facts in whichever storage backend is active. */
async function countFacts(): Promise<number> {
  if (useLocalStorageFallback) {
    return readLocalFacts().length;
  }
  const db = await getDB();
  return db.count('facts');
}

/** Clear all facts from whichever storage backend is active. */
async function clearFacts(): Promise<void> {
  if (useLocalStorageFallback) {
    writeLocalFacts([]);
    return;
  }
  const db = await getDB();
  await db.clear('facts');
}

function hashContent(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = (h << 5) - h + content.charCodeAt(i);
    h |= 0;
  }
  return `mem_${Math.abs(h).toString(36)}_${Date.now().toString(36)}`;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

function scoreContent(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  if (trimmed.length < 5) return 0.1;
  if (trimmed.length > 300) return clampScore(0.3 + (trimmed.length / 3000));

  const identitySignals = /\b(my name is|i am|i'm|call me|i work|i live|i build|i'm from)\b/i;
  const preferenceSignals = /\b(i prefer|i like|i hate|don't like|always|never|must|should|remind me)\b/i;
  const decisionSignals = /\b(we decided|i decided|let's go with|chose|picking|going with|final)\b/i;
  const taskSignals = /\b(build|create|make|implement|ship|launch|deploy|fix|update|generate)\b/i;

  let score = 0.2;
  if (identitySignals.test(trimmed)) score += 0.4;
  if (preferenceSignals.test(trimmed)) score += 0.35;
  if (decisionSignals.test(trimmed)) score += 0.3;
  if (taskSignals.test(trimmed)) score += 0.2;

  const words = trimmed.split(/\s+/).length;
  if (words >= 8 && words <= 60) score += 0.15;

  return clampScore(score);
}

function classifyKind(content: string): MemoryFact['kind'] {
  const lower = content.toLowerCase();
  if (/\b(my name is|i am|i'm|call me|i work|i live|i build)\b/.test(lower)) return 'identity';
  if (/\b(i prefer|i like|i hate|don't like|always|never|remind me)\b/.test(lower)) return 'preference';
  if (/\b(we decided|i decided|let's go with|chose|picking|going with)\b/.test(lower)) return 'decision';
  if (/\b(build|create|make|implement|ship|launch|deploy|fix|update)\b/.test(lower)) return 'task';
  return 'fact';
}

export interface MemoryOptions {
  maxFacts?: number;
  minConfidence?: number;
}

export class AdaptiveMemory {
  private options: MemoryOptions;
  private initialized = false;

  constructor(options: MemoryOptions = {}) {
    this.options = {
      maxFacts: options.maxFacts ?? 300,
      minConfidence: options.minConfidence ?? 0.25,
    };
  }

  async init() {
    if (this.initialized) return;

    // Try IndexedDB; if it fails, the fallback is already set inside getDB().
    try {
      await getDB();
    } catch {
      // useLocalStorageFallback is now true — init still succeeds.
    }

    // Migrate from localStorage to IndexedDB if we're NOT already in
    // fallback mode (i.e., IndexedDB just became available and there's
    // old data in localStorage).
    if (!useLocalStorageFallback) {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const db = await getDB();
              const tx = db.transaction('facts', 'readwrite');
              for (const item of parsed) {
                if (item && typeof item.content === 'string' && item.content.trim().length > 0) {
                  await tx.store.put(item);
                }
              }
              await tx.done;
            }
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        console.warn('Memory migration failed', e);
      }
    }
    
    this.initialized = true;
  }

  async ingest(conversationText: string, source?: string): Promise<MemoryFact[]> {
    await this.init();
    const sentences = conversationText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 8 && s.length <= 400);

    const added: MemoryFact[] = [];
    const now = Date.now();

    for (const sentence of sentences) {
      const confidence = scoreContent(sentence);
      if (confidence < this.options.minConfidence!) continue;

      const lower = sentence.toLowerCase();
      const allFacts = await getAllFacts();
      const existing = allFacts.find((f) => f.content.toLowerCase() === lower);

      if (existing) {
        existing.confidence = clampScore(existing.confidence + 0.05);
        existing.useCount += 1;
        existing.lastUsedAt = now;
        await putFact(existing);
        added.push(existing);
        continue;
      }

      const fact: MemoryFact = {
        id: hashContent(sentence),
        kind: classifyKind(sentence),
        content: sentence,
        confidence,
        createdAt: now,
        lastUsedAt: now,
        useCount: 1,
        source,
      };

      await putFact(fact);
      added.push(fact);
    }

    await this.prune();
    return added;
  }

  async recall(query: string, limit = 12): Promise<MemoryFact[]> {
    await this.init();
    const allFacts = await getAllFacts();
    const q = query.toLowerCase();
    
    const scored = allFacts.map((fact) => {
      const contentMatch = fact.content.toLowerCase().includes(q) ? 0.45 : 0;
      const kindMatch =
        fact.kind === 'preference' || fact.kind === 'identity' ? 0.15 : 0;
      const recency = Math.max(0, 1 - (Date.now() - fact.lastUsedAt) / 1000 / 86400) * 0.2;
      const usage = Math.min(fact.useCount, 20) / 20 * 0.15;
      const confidenceBoost = fact.confidence * 0.05;
      return { fact, score: contentMatch + kindMatch + recency + usage + confidenceBoost };
    });

    return scored
      .filter((s) => s.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.fact);
  }

  async getRecent(limit = 20): Promise<MemoryFact[]> {
    await this.init();
    const allFacts = await getAllFacts();
    return allFacts
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, limit);
  }

  async getTopFacts(limit = 40): Promise<MemoryFact[]> {
    await this.init();
    const allFacts = await getAllFacts();
    return allFacts
      .sort((a, b) => b.useCount - a.useCount || b.confidence - a.confidence)
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    await this.init();
    await clearFacts();
  }

  private async prune(): Promise<void> {
    const count = await countFacts();
    if (count <= this.options.maxFacts!) return;
    
    const allFacts = await getAllFacts();
    allFacts.sort((a, b) => b.confidence - a.confidence || b.useCount - a.useCount);
    
    const toDelete = allFacts.slice(this.options.maxFacts!);
    for (const f of toDelete) {
      await deleteFact(f.id);
    }
  }
}

export async function buildRecallPacket(memory: AdaptiveMemory, query: string): Promise<string> {
  const facts = await memory.recall(query, 10);
  if (!facts.length) return '';

  const lines = facts.map((f) => `- [${f.kind}] ${f.content}`);
  return `[Memory hints]\n${lines.join('\n')}`;
}

export const globalMemory = new AdaptiveMemory();
