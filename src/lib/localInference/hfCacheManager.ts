/**
 * Tier-1 local inference — offline model cache manager (Cache API).
 *
 * transformers.js v3 stores every downloaded model file as a full Response
 * object in the browser Cache API under the cache name 'transformers-cache'
 * (verified against the shipped v3.8.1 dist). This module is the main-thread
 * inventory layer behind the Offline Model Manager settings card:
 *
 *   - list which HF repos are fully/partially cached and their disk size
 *   - delete one repo's cache or the whole Tier-1 cache
 *   - pair the cache inventory with the download progress the engine reports
 *
 * Pure helpers (`groupHfCacheRequests`, `hfRepoIdFromUrl`) are exported for
 * unit tests; the IO wrappers take an injectable CacheStorage so tests never
 * touch real browser storage.
 */

import type { HfTaskKind } from "./protocol";
import { getHfModel } from "./hfModels";

/** The cache name transformers.js v3.8.1 opens (`caches.open` in FileCache). */
export const HF_CACHE_NAME = "transformers-cache";

export interface CachedHfModel {
  repoId: string;
  /** Bytes summed across cached files (0 when only headers were missing). */
  bytes: number;
  /** Number of cached files (shards, tokenizer, configs). */
  files: number;
  /** true when the cache contains the model's ONNX weights. */
  hasWeights: boolean;
  /** Catalog metadata when the repo is a known Tier-1 model. */
  definition?: ReturnType<typeof getHfModel>;
  task?: HfTaskKind;
}

export interface HfCacheInventory {
  models: CachedHfModel[];
  totalBytes: number;
  /** navigator.storage.estimate() usage (ALL origin storage) — when available. */
  originUsageBytes: number | null;
  originQuotaBytes: number | null;
}

const HF_URL_PATTERN = /^https:\/\/huggingface\.co\/([^/]+)\/([^/]+)\/(?:resolve|raw)\//;

/**
 * Extract the repo id ("org/name") from a HF resolve/raw URL, or null for
 * foreign URLs. Query strings are ignored.
 */
export function hfRepoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = HF_URL_PATTERN.exec(`${parsed.protocol}//${parsed.host}${parsed.pathname}`);
    if (!match) return null;
    return `${match[1]}/${match[2]}`;
  } catch {
    return null;
  }
}

export interface CacheFileFact {
  url: string;
  /** Content-Length when the stored Response carries it, else -1. */
  bytes: number;
}

/**
 * Group raw cache facts into per-repo summaries. Pure — no Cache API.
 * A repo counts as "hasWeights" when at least one URL under it points at an
 * .onnx / .onnx_data file.
 */
export function groupHfCacheRequests(facts: CacheFileFact[]): Map<string, CachedHfModel> {
  const groups = new Map<string, CachedHfModel>();
  for (const fact of facts) {
    const repoId = hfRepoIdFromUrl(fact.url);
    if (!repoId) continue;
    let group = groups.get(repoId);
    if (!group) {
      const definition = getHfModel(repoId);
      group = {
        repoId,
        bytes: 0,
        files: 0,
        hasWeights: false,
        definition,
        task: definition?.task,
      };
      groups.set(repoId, group);
    }
    group.files += 1;
    if (fact.bytes >= 0) group.bytes += fact.bytes;
    if (/\.onnx(_data)?(\?|$)/i.test(fact.url)) group.hasWeights = true;
  }
  return groups;
}

// ── IO wrappers (injectable CacheStorage — tests pass a stub) ────────────

type MinimalCache = {
  keys(): Promise<Request[]>;
  match(request: RequestInfo | URL): Promise<Response | undefined>;
  delete(request: RequestInfo | URL): Promise<boolean>;
};
export type { MinimalCache };
export type MinimalCacheStorage = {
  open(name: string): Promise<MinimalCache>;
  has?(name: string): Promise<boolean>;
};

function defaultCacheStorage(): MinimalCacheStorage | null {
  const g = globalThis as unknown as { caches?: MinimalCacheStorage };
  return typeof g.caches?.open === "function" ? g.caches : null;
}

function requestUrl(request: RequestInfo | URL): string {
  return typeof request === "string" ? request : request instanceof Request ? request.url : String(request);
}

async function bytesOf(cache: MinimalCache, request: Request): Promise<number> {
  try {
    const response = await cache.match(request);
    if (!response) return -1;
    const header = response.headers?.get?.("content-length");
    if (header && Number.isFinite(Number(header))) return Number(header);
    if (typeof response.blob === "function") return (await response.blob()).size;
  } catch {
    /* unreadable entry — count as 0 */
  }
  return -1;
}

/**
 * Snapshot the Tier-1 cache. Never throws — a missing/unavailable Cache API
 * (insecure context, private mode) resolves to an empty inventory.
 */
export async function getHfCacheInventory(
  storage: MinimalCacheStorage | null = defaultCacheStorage(),
): Promise<HfCacheInventory> {
  const empty: HfCacheInventory = {
    models: [],
    totalBytes: 0,
    originUsageBytes: null,
    originQuotaBytes: null,
  };
  if (!storage) return empty;
  let cache: MinimalCache;
  try {
    cache = await storage.open(HF_CACHE_NAME);
  } catch {
    return empty;
  }
  try {
    const requests = await cache.keys();
    const facts: CacheFileFact[] = [];
    for (const request of requests) {
      const url = requestUrl(request);
      if (!hfRepoIdFromUrl(url)) continue;
      facts.push({ url, bytes: await bytesOf(cache, request) });
    }
    const grouped = groupHfCacheRequests(facts);
    const models = [...grouped.values()].sort((a, b) => b.bytes - a.bytes);
    let originUsageBytes: number | null = null;
    let originQuotaBytes: number | null = null;
    try {
      const g = globalThis as unknown as {
        navigator?: { storage?: { estimate?: () => Promise<{ usage?: number; quota?: number }> } };
      };
      const estimate = await g.navigator?.storage?.estimate?.();
      if (estimate) {
        originUsageBytes = estimate.usage ?? null;
        originQuotaBytes = estimate.quota ?? null;
      }
    } catch {
      /* estimate unsupported */
    }
    return {
      models,
      totalBytes: models.reduce((sum, m) => sum + m.bytes, 0),
      originUsageBytes,
      originQuotaBytes,
    };
  } catch {
    return empty;
  }
}

/** Delete every cached file of ONE repo. Returns the number of files removed. */
export async function deleteHfModelCache(
  repoId: string,
  storage: MinimalCacheStorage | null = defaultCacheStorage(),
): Promise<number> {
  if (!storage) return 0;
  const cache = await storage.open(HF_CACHE_NAME);
  const requests = await cache.keys();
  let removed = 0;
  for (const request of requests) {
    const url = requestUrl(request);
    if (hfRepoIdFromUrl(url) === repoId) {
      if (await cache.delete(request)) removed += 1;
    }
  }
  return removed;
}

/** Wipe the whole Tier-1 cache ('transformers-cache'). */
export async function deleteAllHfCache(
  storage: MinimalCacheStorage | null = defaultCacheStorage(),
): Promise<number> {
  if (!storage) return 0;
  let removed = 0;
  try {
    const cache = await storage.open(HF_CACHE_NAME);
    const requests = await cache.keys();
    for (const request of requests) {
      if (await cache.delete(request)) removed += 1;
    }
  } catch {
    /* cache unavailable */
  }
  return removed;
}

/** MB formatter shared with the manager UI ("~880 MB" / "1.2 GB"). */
export function formatCacheBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(mb)} MB`;
}
