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
// everything from a $99 Android (WebGPU) to a 32GB workstation. Starter-first:
// pickLocalModelForDevice always returns the Nano starter (a ~600MB download,
// never a 20-minute ask) and the 1B/3B tiers are explicit user upgrades in
// OfflineSetup / the onboarding wizard.

/** Low-tier devices (≤2GB RAM reported, ≤2 cores, phones): smallest viable chat model. Also
 *  the universal starter everyone downloads first (see STARTER_LOCAL_MODEL below). */
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
 * The universal starter: the Nano tier streams down in minutes on any
 * connection (~600MB vs ~1.1–2.4GB for the larger tiers) and runs on every
 * WebGPU-capable device, from a $99 Android to a workstation. The 1B/3B
 * tiers remain available as explicit, user-chosen upgrades (OfflineSetup's
 * model picker) — nobody is blocked on a 20-minute download before their
 * first private chat.
 *
 * `deviceMemoryGB` / `isMobile` are kept for signature compatibility (they
 * were the old tier inputs); the starter-first policy intentionally ignores
 * them so every new install starts small and cheap.
 */
export const STARTER_LOCAL_MODEL: LocalModelDefinition = LOW_TIER_LOCAL_MODEL;

export function pickLocalModelForDevice(
  deviceMemoryGB?: number,
  isMobile: boolean = false,
): LocalModelDefinition {
  void deviceMemoryGB;
  void isMobile;
  return STARTER_LOCAL_MODEL;
}
