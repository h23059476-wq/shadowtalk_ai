/**
 * Shared WebGPU / compute device runtime for ShadowTalk.
 * Powers on-device Gemma (Transformers.js) and respects the nav GPU selector.
 */

export type AccelerationMode = "auto" | "webgpu" | "npu" | "cpu";

export const ACCELERATION_MODE_KEY = "shadowtalk_acceleration_mode";
export const ACCELERATION_CHANGE_EVENT = "shadowtalk-acceleration-change";

export type WebGPUProbe = {
  available: boolean;
  adapterLabel: string | null;
  vendor: string | null;
  estimatedVRAMGb: number;
};

export type ComputeDevice = "webgpu" | "wasm";

let probeCache: WebGPUProbe | null = null;
let probePromise: Promise<WebGPUProbe> | null = null;

export function getAccelerationPreference(): AccelerationMode {
  if (typeof window === "undefined") return "auto";
  const raw = localStorage.getItem(ACCELERATION_MODE_KEY);
  if (raw === "webgpu" || raw === "npu" || raw === "cpu" || raw === "auto") return raw;
  return "auto";
}

export function setAccelerationPreference(mode: AccelerationMode): void {
  localStorage.setItem(ACCELERATION_MODE_KEY, mode);
  if (typeof window !== "undefined") {
    void import("@/lib/hardwareIntelligence").then(({ invalidateHardwareProfileCache }) =>
      invalidateHardwareProfileCache(),
    );
    window.dispatchEvent(new CustomEvent(ACCELERATION_CHANGE_EVENT, { detail: mode }));
  }
}

/** Probe GPU once per session (cached). */
export async function probeWebGPU(): Promise<WebGPUProbe> {
  if (probeCache) return probeCache;
  if (probePromise) return probePromise;

  probePromise = (async (): Promise<WebGPUProbe> => {
    const empty: WebGPUProbe = {
      available: false,
      adapterLabel: null,
      vendor: null,
      estimatedVRAMGb: 0,
    };

    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      probeCache = empty;
      return empty;
    }

    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter: (opts: { powerPreference: string }) => Promise<Record<string, unknown>> } }).gpu;
      const adapter = (await gpu?.requestAdapter({
        powerPreference: "high-performance",
      })) as { limits?: { maxBufferSize?: number }; requestAdapterInfo?: () => Promise<{ description?: string; device?: string; vendor?: string }> } | undefined;
      if (!adapter) {
        probeCache = empty;
        return empty;
      }

      const info = await adapter.requestAdapterInfo?.();
      const limits = adapter.limits;
      const estimatedVRAMBytes = (limits?.maxBufferSize ?? 0) * 4;
      let estimatedVRAMGb =
        Math.round((estimatedVRAMBytes / (1024 * 1024 * 1024)) * 10) / 10;
      const deviceMemory =
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
      if (estimatedVRAMGb < 2) {
        estimatedVRAMGb = Math.min(deviceMemory / 2, 4);
      }

      probeCache = {
        available: true,
        adapterLabel: info?.description || info?.device || "GPU",
        vendor: info?.vendor ?? null,
        estimatedVRAMGb,
      };
      return probeCache;
    } catch {
      probeCache = empty;
      return empty;
    } finally {
      probePromise = null;
    }
  })();

  return probePromise;
}

export function invalidateWebGPUProbe(): void {
  probeCache = null;
  probePromise = null;
}

/** Map user preference + hardware probe → ONNX/transformers device id. */
export function resolveComputeDevice(
  probe: WebGPUProbe,
  preference: AccelerationMode = getAccelerationPreference(),
): ComputeDevice {
  if (preference === "cpu") return "wasm";
  if (preference === "webgpu" || preference === "npu") {
    return probe.available ? "webgpu" : "wasm";
  }
  return probe.available ? "webgpu" : "wasm";
}

export function getDeviceMemoryGb(): number {
  return (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
}

/** Warm WebGPU adapter early so first model load is faster. */
export function warmWebGPUProbe(): void {
  if (typeof window === "undefined") return;
  const run = () => void probeWebGPU().catch(() => undefined);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    window.setTimeout(run, 500);
  }
}

export async function configureTransformersEnv(): Promise<void> {
  // Stubbed to avoid importing @huggingface/transformers
}

export function deviceLabel(device: ComputeDevice, probe: WebGPUProbe): string {
  if (device === "webgpu") {
    return probe.adapterLabel ? `WebGPU · ${probe.adapterLabel}` : "WebGPU";
  }
  return "CPU (WASM)";
}
