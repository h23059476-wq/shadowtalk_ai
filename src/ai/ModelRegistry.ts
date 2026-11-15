export interface LocalModelDefinition {
  id: string;
  displayName: string;
  version: string;
  quantization: string;
  approxStorageRequirementMB: number;
  approxVRAMRequirementMB: number;
  contextLength: number;
  supportedCapabilities: string[];
  requiresWebGPU: true;
  isLowResourceCompatible: boolean;
  isAvailableOffline: boolean;
  /** q4f32 twin to use when the GPU lacks the shader-f16 feature. */
  fallbackModelId?: string;
}

// We start with a lightweight Llama-3 model as the default for browser inference
export const DEFAULT_LOCAL_MODEL: LocalModelDefinition = {
  id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Lite",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 800,
  approxVRAMRequirementMB: 900,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization", "basic_reasoning"],
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true,
  fallbackModelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC"
};

// ── Private-by-default tier ladder ──────────────────────────────────────
// One on-device model per hardware tier so the private chat path works on
// everything from a $99 Android (WebGPU) to a 32GB workstation. The device
// tier is picked automatically in pickLocalModelForDevice; OfflineSetup and
// the onboarding wizard let the user override it.

/** Low-tier devices (≤2GB RAM reported, ≤2 cores, phones): smallest viable chat model. */
export const LOW_TIER_LOCAL_MODEL: LocalModelDefinition = {
  id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Nano",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 600,
  approxVRAMRequirementMB: 700,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization"],
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true,
  fallbackModelId: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC"
};

/** High-tier devices (≥8GB RAM, many cores): the best on-device chat quality. */
export const HIGH_TIER_LOCAL_MODEL: LocalModelDefinition = {
  id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Pro",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 2000,
  approxVRAMRequirementMB: 2600,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization", "basic_reasoning", "writing"],
  requiresWebGPU: true,
  isLowResourceCompatible: false,
  isAvailableOffline: true,
  fallbackModelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC"
};

// ── q4f32 twins ─────────────────────────────────────────────────────────
// Same models without fp16 shader math — run on any WebGPU adapter, including
// software ones and drivers that don't expose the shader-f16 feature.

export const LOW_TIER_LOCAL_MODEL_F32: LocalModelDefinition = {
  id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
  displayName: "ShadowTalk Local - Nano (f32)",
  version: "1.0",
  quantization: "q4f32_1",
  approxStorageRequirementMB: 700,
  approxVRAMRequirementMB: 900,
  contextLength: 4096,
  supportedCapabilities: LOW_TIER_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true
};

export const DEFAULT_LOCAL_MODEL_F32: LocalModelDefinition = {
  id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  displayName: "ShadowTalk Local - Lite (f32)",
  version: "1.0",
  quantization: "q4f32_1",
  approxStorageRequirementMB: 1100,
  approxVRAMRequirementMB: 1300,
  contextLength: 4096,
  supportedCapabilities: DEFAULT_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true
};

export const HIGH_TIER_LOCAL_MODEL_F32: LocalModelDefinition = {
  id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
  displayName: "ShadowTalk Local - Pro (f32)",
  version: "1.0",
  quantization: "q4f32_1",
  approxStorageRequirementMB: 2400,
  approxVRAMRequirementMB: 3000,
  contextLength: 4096,
  supportedCapabilities: HIGH_TIER_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: false,
  isAvailableOffline: true
};

export const MODEL_REGISTRY: Record<string, LocalModelDefinition> = {
  [LOW_TIER_LOCAL_MODEL.id]: LOW_TIER_LOCAL_MODEL,
  [DEFAULT_LOCAL_MODEL.id]: DEFAULT_LOCAL_MODEL,
  [HIGH_TIER_LOCAL_MODEL.id]: HIGH_TIER_LOCAL_MODEL,
  [LOW_TIER_LOCAL_MODEL_F32.id]: LOW_TIER_LOCAL_MODEL_F32,
  [DEFAULT_LOCAL_MODEL_F32.id]: DEFAULT_LOCAL_MODEL_F32,
  [HIGH_TIER_LOCAL_MODEL_F32.id]: HIGH_TIER_LOCAL_MODEL_F32
};

/** Every installable on-device model, ordered smallest → largest. */
export const LOCAL_MODEL_TIERS: LocalModelDefinition[] = [
  LOW_TIER_LOCAL_MODEL,
  DEFAULT_LOCAL_MODEL,
  HIGH_TIER_LOCAL_MODEL
];

export function getLocalModelDefinition(id: string): LocalModelDefinition | undefined {
  return MODEL_REGISTRY[id];
}

/**
 * Pick the on-device model matching the hardware. Uses the same inputs as
 * devicePerfTier (navigator.deviceMemory / hardwareConcurrency) so the
 * private chat path degrades gracefully on weak devices instead of OOM-ing
 * the GPU. `deviceMemory` is in GB as reported by navigator.deviceMemory
 * (Chrome clamps it to 0.25/0.5/1/2/4/8); when unknown we assume 4GB (mid).
 */
export function pickLocalModelForDevice(
  deviceMemoryGB?: number,
  isMobile: boolean = false,
): LocalModelDefinition {
  const memory = typeof deviceMemoryGB === "number" && deviceMemoryGB > 0 ? deviceMemoryGB : 4;
  // Phones punch below their spec (thermal throttling, shared memory) — cap at 1B.
  if (isMobile) {
    return memory >= 8 ? DEFAULT_LOCAL_MODEL : LOW_TIER_LOCAL_MODEL;
  }
  if (memory >= 8) return HIGH_TIER_LOCAL_MODEL;
  if (memory >= 2) return DEFAULT_LOCAL_MODEL;
  return LOW_TIER_LOCAL_MODEL;
}
