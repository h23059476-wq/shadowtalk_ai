import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type AiEventName = 
  | 'llm_completion'
  | 'agent_loop_failure'
  | 'agent_action_success';

export interface AiMetricPayload {
  model?: string;
  source?: string;
  ttftMs?: number;      // Time to first token
  totalMs?: number;     // Total duration
  inputTokens?: number; // Estimated
  outputTokens?: number;// Estimated
  error?: string;
  actionId?: string;
}

export interface StoredMetric extends AiMetricPayload {
  id: string;
  timestamp: string;
  event: AiEventName;
  estimatedCostUsd: number;
}

interface TelemetryDB extends DBSchema {
  metrics: {
    key: string;
    value: StoredMetric;
    indexes: { 'by-timestamp': string };
  };
}

const DB_NAME = 'shadowtalk_telemetry_db';
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<TelemetryDB>> | null = null;

function getDB() {
  if (!dbPromise && typeof window !== 'undefined') {
    dbPromise = openDB<TelemetryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('metrics')) {
          const store = db.createObjectStore('metrics', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

function calculateCost(source: string, inputTokens: number = 0, outputTokens: number = 0): number {
  if (source === 'webgpu-local') return 0;
  
  // Rough estimate for Llama 3 8B via Groq
  const inputCost = (inputTokens / 1_000_000) * 0.05;
  const outputCost = (outputTokens / 1_000_000) * 0.08;
  return inputCost + outputCost;
}

export async function trackAiMetrics(eventName: AiEventName, payload: AiMetricPayload) {
  const timestamp = new Date().toISOString();
  const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const estimatedCostUsd = calculateCost(payload.source || 'unknown', payload.inputTokens, payload.outputTokens);

  const logData: StoredMetric = {
    id,
    timestamp,
    event: eventName,
    estimatedCostUsd,
    ...payload,
  };

  console.log(`[agentic-metrics] ${JSON.stringify(logData)}`);

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction('metrics', 'readwrite');
      await tx.store.put(logData);
      await tx.done;
    }
  } catch (err) {
    console.warn("Failed to persist telemetry metric:", err);
  }
}

export async function getTelemetryMetrics(): Promise<StoredMetric[]> {
  try {
    const db = await getDB();
    if (!db) return [];
    return await db.getAllFromIndex('metrics', 'by-timestamp');
  } catch {
    return [];
  }
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
