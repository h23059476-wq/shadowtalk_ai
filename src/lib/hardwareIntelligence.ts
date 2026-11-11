/**
 * Hardware intelligence — scores CPU/GPU and picks the fastest execution path.
 *
 * Strategy (auto mode):
 * - Strong GPU → WebGPU local inference (fastest on-device)
 * - Strong CPU, weak GPU → multi-thread WASM on CPU
 * - Modest GPU (WebGPU available but not "high-end") → still use WebGPU
 * - Weak CPU + weak GPU + online → cloud API (lowest latency to first token)
 */

import {
  getAccelerationPreference,
  getDeviceMemoryGb,
  probeWebGPU,
  type ComputeDevice,
  type WebGPUProbe,
} from "@/lib/webgpuRuntime";

export type HardwareTier = "turbo" | "performance" | "balanced" | "cloud";

export type ExecutionPath = "local-webgpu" | "local-wasm" | "cloud" | "hybrid";

export type HardwareProfile = {
  tier: HardwareTier;
  path: ExecutionPath;
  cpuScore: number;
  gpuScore: number;
  computeDevice: ComputeDevice;
  summary: string;
  probedAt: number;
};

const CACHE_KEY = "shadowtalk_hardware_profile_v1";
const GOOD_CPU = 55;
const GOOD_GPU = 50;
const TURBO_GPU = 70;
const TURBO_CPU = 65;

export function scoreCpu(): number {
  if (typeof navigator === "undefined") return 40;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = getDeviceMemoryGb();
  let score = 0;

  if (cores >= 16) score += 38;
  else if (cores >= 12) score += 32;
  else if (cores >= 8) score += 26;
  else if (cores >= 4) score += 16;
  else score += 8;

  if (mem >= 16) score += 38;
  else if (mem >= 8) score += 28;
  else if (mem >= 4) score += 14;
  else score += 6;

  return Math.min(100, score);
}

export function scoreGpu(probe: WebGPUProbe): number {
  if (!probe.available) return 0;

  let score = 42;
  if (probe.estimatedVRAMGb >= 8) score += 38;
  else if (probe.estimatedVRAMGb >= 4) score += 28;
  else if (probe.estimatedVRAMGb >= 2) score += 14;
  else score += 6;

  const label = `${probe.adapterLabel ?? ""} ${probe.vendor ?? ""}`.toLowerCase();
  if (/nvidia|geforce|rtx|quadro|amd|radeon|apple m[1-9]|metal/.test(label)) {
    score += 12;
  }

  return Math.min(100, score);
}

export function buildHardwareProfile(
  probe: WebGPUProbe,
  cpuScore = scoreCpu(),
  gpuScore = scoreGpu(probe),
): HardwareProfile {
  const preference = getAccelerationPreference();
  let tier: HardwareTier;
  let path: ExecutionPath;
  let computeDevice: ComputeDevice;
  let summary: string;

  const hasGoodCpu = cpuScore >= GOOD_CPU;
  const hasGoodGpu = gpuScore >= GOOD_GPU;
  const isTurboGpu = gpuScore >= TURBO_GPU;
  const isTurboCpu = cpuScore >= TURBO_CPU && !hasGoodGpu;

  if (preference === "cpu") {
    tier = hasGoodCpu ? "performance" : "balanced";
    path = "local-wasm";
    computeDevice = "wasm";
    summary = hasGoodCpu
      ? `Fast CPU (${cpuScore}/100) — multi-core WASM`
      : `CPU mode — ${cpuScore}/100 capability`;
  } else if (preference === "webgpu" || preference === "npu") {
    tier = probe.available ? (isTurboGpu ? "turbo" : "performance") : "cloud";
    path = probe.available ? "local-webgpu" : "cloud";
    computeDevice = probe.available ? "webgpu" : "wasm";
    summary = probe.available
      ? `WebGPU · ${probe.adapterLabel ?? "GPU"} (${gpuScore}/100)`
      : "WebGPU requested — GPU unavailable, using cloud";
  } else {
    // Auto: pick the best hardware path
    if (isTurboGpu || (hasGoodGpu && probe.available)) {
      tier = "turbo";
      path = "local-webgpu";
      computeDevice = "webgpu";
      summary = `Turbo GPU · ${probe.adapterLabel ?? "WebGPU"} (${gpuScore}/100)`;
    } else if (isTurboCpu) {
      tier = "performance";
      path = "local-wasm";
      computeDevice = "wasm";
      summary = `Fast CPU · ${navigator.hardwareConcurrency ?? "?"} cores (${cpuScore}/100)`;
    } else if (probe.available && gpuScore >= 30) {
      // Weaker discrete/integrated GPU — still use WebGPU (user expectation)
      tier = "balanced";
      path = "local-webgpu";
      computeDevice = "webgpu";
      summary = `WebGPU boost · ${probe.adapterLabel ?? "GPU"} (${gpuScore}/100)`;
    } else if (hasGoodCpu || hasGoodGpu) {
      tier = "balanced";
      path = "hybrid";
      computeDevice = probe.available ? "webgpu" : "wasm";
      summary = `Hybrid — CPU ${cpuScore}/100 · GPU ${gpuScore}/100`;
    } else {
      tier = "cloud";
      path = "cloud";
      computeDevice = probe.available ? "webgpu" : "wasm";
      summary = "Cloud turbo — fastest path on this device when online";
    }
  }

  return {
    tier,
    path,
    cpuScore,
    gpuScore,
    computeDevice,
    summary,
    probedAt: Date.now(),
  };
}

export function getCachedHardwareProfile(): HardwareProfile | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as HardwareProfile;
    if (Date.now() - profile.probedAt > 10 * 60 * 1000) return null;
    return profile;
  } catch {
    return null;
  }
}

function writeCache(profile: HardwareProfile) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function invalidateHardwareProfileCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Full hardware scan (cached ~10 min). */
export async function detectHardwareProfile(): Promise<HardwareProfile> {
  const cached = getCachedHardwareProfile();
  if (cached) return cached;

  const probe = await probeWebGPU();
  const profile = buildHardwareProfile(probe);
  writeCache(profile);
  return profile;
}

export function shouldPreferLocalInference(profile?: HardwareProfile | null): boolean {
  const p = profile ?? getCachedHardwareProfile();
  if (!p) return false;
  return p.path === "local-webgpu" || p.path === "local-wasm" || p.path === "hybrid";
}

export function shouldPrewarmLocalModels(profile?: HardwareProfile | null): boolean {
  const p = profile ?? getCachedHardwareProfile();
  if (!p) return false;
  return p.tier === "turbo" || p.tier === "performance";
}

/** Idle prewarm of Tier-A model on fast hardware. */
export function prewarmFastestLocalPath(): void {
  // Offline/local model prewarming removed
}

export function warmHardwareProfile(): void {
  if (typeof window === "undefined") return;
  const run = () => void detectHardwareProfile().catch(() => undefined);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 400);
  }
}
