/**
 * Hardware & storage capability detection for the tiered model manager.
 *
 * Answers three questions once per session (results are cached — adapter
 * requests are expensive):
 *   1. What WebGPU hardware is present? (`requestAdapter()` → limits +
 *      shader-f16 feature, which decides between q4f16_1 weights and their
 *      q4f32 twins.)
 *   2. How much RAM does the device report? (`navigator.deviceMemory` is
 *      Chrome/Android-only — Safari and Firefox leave it undefined, so we
 *      fall back to a conservative UA-based guess.)
 *   3. How much storage can we actually use for model shards? (Persistent
 *      storage is requested on startup so the browser never evicts the
 *      multi-GB caches; `storage.estimate()` exposes the quota.)
 *
 * `getRecommendedTier()` maps all of that onto the lineup in
 * `src/config/models.ts`: devices that can only carry the 1B–1.7B class get
 * the "mobile/light" tier, ≥8GB devices with enough adapter buffer get the
 * "desktop/full" tier (3B+ models).
 */

export type RecommendedTier = "mobile/light" | "desktop/full" | "unsupported";

export interface AdapterInfo {
  /** Largest single WebGPU buffer — a 3B model needs ~2.2GB of weights+KV. */
  maxBufferSize: number | null;
  maxComputeWorkgroupStorageSize: number | null;
  /** Software adapters (SwiftShader etc.) — present but very slow. */
  isFallbackAdapter: boolean;
  /** q4f16_1 weights need the shader-f16 feature; else the f32 twin is used. */
  shaderF16: boolean;
}

export interface DeviceCapabilities {
  webgpu: boolean;
  adapter: AdapterInfo | null;
  /** GB, best-effort. Chrome/Android report the real value; others get a UA guess. */
  deviceMemoryGB: number;
  /** True when deviceMemory was not reported and a UA heuristic was used. */
  deviceMemoryEstimated: boolean;
  isMobileUA: boolean;
  storagePersisted: boolean;
  storage: { usageMB: number; quotaMB: number; availableMB: number };
  recommendedTier: RecommendedTier;
}

const UNKNOWN_MEMORY_FALLBACK_DESKTOP_GB = 8;
const UNKNOWN_MEMORY_FALLBACK_MOBILE_GB = 4;
/** A 3B model (~2.2–2.6GB weights + KV cache) needs a buffer at least this big. */
const DESKTOP_TIER_MIN_BUFFER_BYTES = 2.0 * 1024 * 1024 * 1024;

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * `navigator.deviceMemory` with a safe fallback for Safari/Firefox, where it
 * is undefined: mobile UAs are assumed 4GB, desktops 8GB (the powerhouse
 * gate then simply stays open on unknown desktops, mirroring today's
 * behavior where the gate never fired on devices that don't report RAM).
 */
export function getDeviceMemoryGB(): { gb: number; estimated: boolean } {
  if (typeof navigator === "undefined") return { gb: UNKNOWN_MEMORY_FALLBACK_DESKTOP_GB, estimated: true };
  const reported = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof reported === "number" && reported > 0) return { gb: reported, estimated: false };
  return {
    gb: isMobileUserAgent() ? UNKNOWN_MEMORY_FALLBACK_MOBILE_GB : UNKNOWN_MEMORY_FALLBACK_DESKTOP_GB,
    estimated: true,
  };
}

// Minimal structural WebGPU types — @webgpu/types is not a dependency, and
// the few fields we read (limits, features, isFallbackAdapter) are all
// optional in real adapters.
interface GpuAdapterLike {
  limits?: Record<string, number>;
  features?: Set<string>;
  isFallbackAdapter?: boolean;
}
interface GpuLike {
  requestAdapter: (options?: { powerPreference?: string; forceSoftware?: boolean }) => Promise<GpuAdapterLike | null>;
}

/**
 * Adapter-request ladder, mirrored from the worker shim (webllm.worker.ts):
 * a plain request can return null on machines that still have a usable
 * low-power or software (SwiftShader) adapter — hardware acceleration
 * disabled, VMs, iGPU-only laptops. Walking the ladder here keeps the
 * settings card, the tier recommendation and the engine's shader-f16 decision
 * in agreement with what the engine can actually obtain.
 */
const ADAPTER_LADDER: Array<{ powerPreference?: string; forceSoftware?: boolean }> = [
  {},
  { powerPreference: "low-power" },
  { forceSoftware: true },
];

/** Reads `adapter.limits` + features defensively across browsers. */
async function inspectAdapter(): Promise<AdapterInfo | null> {
  const gpu = (navigator as unknown as { gpu?: GpuLike }).gpu;
  if (!gpu) return null;
  for (const options of ADAPTER_LADDER) {
    try {
      const adapter = await gpu.requestAdapter(options);
      if (!adapter) continue;
      const limits = adapter.limits ?? {};
      return {
        maxBufferSize: typeof limits.maxBufferSize === "number" ? limits.maxBufferSize : null,
        maxComputeWorkgroupStorageSize:
          typeof limits.maxComputeWorkgroupStorageSize === "number"
            ? limits.maxComputeWorkgroupStorageSize
            : null,
        isFallbackAdapter: adapter.isFallbackAdapter === true,
        shaderF16: adapter.features?.has?.("shader-f16") === true,
      };
    } catch {
      /* try the next rung */
    }
  }
  return null;
}

/** Requests persistent storage so cached shards are never evicted under pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** used/available quota via `navigator.storage.estimate()`. */
export async function getStorageQuota(): Promise<{
  usageMB: number;
  quotaMB: number;
  availableMB: number;
  persisted: boolean;
}> {
  const empty = { usageMB: 0, quotaMB: 0, availableMB: 0, persisted: false };
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return empty;
  try {
    const est = await navigator.storage.estimate();
    const quotaMB = (est.quota ?? 0) / (1024 * 1024);
    const usageMB = (est.usage ?? 0) / (1024 * 1024);
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    return { usageMB, quotaMB, availableMB: Math.max(0, quotaMB - usageMB), persisted };
  } catch {
    return empty;
  }
}

/** Maps capabilities onto the lineup: only ≥8GB devices with enough adapter
 *  buffer unlock the 3B+ desktop tier. */
export function getRecommendedTier(caps: {
  webgpu: boolean;
  deviceMemoryGB: number;
  adapter: AdapterInfo | null;
}): RecommendedTier {
  if (!caps.webgpu) return "unsupported";
  const bufferOk =
    caps.adapter?.maxBufferSize == null || caps.adapter.maxBufferSize >= DESKTOP_TIER_MIN_BUFFER_BYTES;
  const memoryOk =
    caps.deviceMemoryGB >= 8 || (caps.adapter?.maxBufferSize == null && !isMobileUserAgent());
  return bufferOk && memoryOk ? "desktop/full" : "mobile/light";
}

let cachedDetection: Promise<DeviceCapabilities> | null = null;

/** Full detection, cached per session. Pass force=true to re-probe. */
export function detectDeviceCapabilities(force = false): Promise<DeviceCapabilities> {
  if (!cachedDetection || force) {
    cachedDetection = (async (): Promise<DeviceCapabilities> => {
      const adapter = await inspectAdapter();
      const webgpu = adapter !== null;
      const { gb, estimated } = getDeviceMemoryGB();
      const storage = await getStorageQuota();
      return {
        webgpu,
        adapter,
        deviceMemoryGB: gb,
        deviceMemoryEstimated: estimated,
        isMobileUA: isMobileUserAgent(),
        storagePersisted: storage.persisted,
        storage: { usageMB: storage.usageMB, quotaMB: storage.quotaMB, availableMB: storage.availableMB },
        recommendedTier: getRecommendedTier({ webgpu, deviceMemoryGB: gb, adapter }),
      };
    })();
  }
  return cachedDetection;
}

/** Convenience boolean used all over the offline code paths. */
export async function hasWebGPU(): Promise<boolean> {
  try {
    return (await detectDeviceCapabilities()).webgpu;
  } catch {
    return false;
  }
}
