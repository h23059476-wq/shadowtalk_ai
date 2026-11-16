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
  /** "embedding" models are served through engine.embeddings, not chat. Defaults to "chat". */
  modelKind?: "chat" | "embedding";
  /** Minimum navigator.deviceMemory (GB) to offer this tier — powerhouse gate. */
  minDeviceMemoryGB?: number;
}

// ── Legacy defaults (kept for compatibility with existing call sites) ────
// DEFAULT_LOCAL_MODEL now matches the "Instant Default Chat" tier (1B); the
// low tier (0.5B) remains the ultra-light safety net for very weak devices.

export const DEFAULT_LOCAL_MODEL: LocalModelDefinition = {
  id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Lite",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 880,
  approxVRAMRequirementMB: 879,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization", "basic_reasoning"],
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true,
  fallbackModelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC"
};

// ── Tier ladder (see src/config/models.ts for the orchestrated tiers) ────
// Instant default chat: Llama-3.2-1B (~880MB, f32 twin 1.1GB) — auto-cached
// in the background on first load. Ultra-light: Qwen2.5-0.5B stays for
// devices that cannot fit the 1B. Powerhouse: the two 3B instructs. Coder:
// Qwen2.5-Coder-3B (1.5B on lower-spec devices). Embeddings: Snowflake
// arctic-embed (auto-cached immediately — they power local vector RAG).

/** Ultra-light safety net (≤2GB-RAM devices): smallest viable chat model. */
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

/** Instant-default alternative with a bigger brain (1.7B, SmolLM2). */
export const SMOLLM2_1_7B_LOCAL_MODEL: LocalModelDefinition = {
  id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Lite+ (SmolLM2 1.7B)",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 1680,
  approxVRAMRequirementMB: 1774,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization", "basic_reasoning"],
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true,
  fallbackModelId: "SmolLM2-1.7B-Instruct-q4f32_1-MLC"
};

/** Desktop powerhouse tier — Qwen2.5 3B (best general chat quality). */
export const QWEN25_3B_LOCAL_MODEL: LocalModelDefinition = {
  id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Pro (Qwen2.5 3B)",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 2300,
  approxVRAMRequirementMB: 2505,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization", "basic_reasoning", "writing"],
  requiresWebGPU: true,
  isLowResourceCompatible: false,
  isAvailableOffline: true,
  minDeviceMemoryGB: 8,
  fallbackModelId: "Qwen2.5-3B-Instruct-q4f32_1-MLC"
};

/** Desktop powerhouse tier — Llama-3.2 3B (~2.2GB). */
export const HIGH_TIER_LOCAL_MODEL: LocalModelDefinition = {
  id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Pro",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 2100,
  approxVRAMRequirementMB: 2264,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization", "basic_reasoning", "writing"],
  requiresWebGPU: true,
  isLowResourceCompatible: false,
  isAvailableOffline: true,
  minDeviceMemoryGB: 8,
  fallbackModelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC"
};

/** Code IDE specialist — Qwen2.5-Coder 3B (~2.3GB). */
export const CODER_3B_LOCAL_MODEL: LocalModelDefinition = {
  id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Code - Specialist (3B)",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 2300,
  approxVRAMRequirementMB: 2505,
  contextLength: 4096,
  supportedCapabilities: ["chat", "code_completion", "basic_reasoning"],
  requiresWebGPU: true,
  isLowResourceCompatible: false,
  isAvailableOffline: true,
  minDeviceMemoryGB: 8,
  fallbackModelId: "Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC"
};

/** Code IDE specialist for lower-spec devices — Qwen2.5-Coder 1.5B (~1.5GB). */
export const CODER_1_5B_LOCAL_MODEL: LocalModelDefinition = {
  id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Code - Specialist Lite (1.5B)",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 1500,
  approxVRAMRequirementMB: 1630,
  contextLength: 4096,
  supportedCapabilities: ["chat", "code_completion"],
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true,
  fallbackModelId: "Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC"
};

/** Local vector RAG — Snowflake arctic-embed-s (auto-cached immediately). */
export const EMBEDDING_MODEL_S: LocalModelDefinition = {
  id: "snowflake-arctic-embed-s-q0f32-MLC-b4",
  displayName: "ShadowTalk Embeddings - S (arctic)",
  version: "1.0",
  quantization: "q0f32",
  approxStorageRequirementMB: 64,
  approxVRAMRequirementMB: 239,
  contextLength: 512,
  supportedCapabilities: ["embeddings"],
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true,
  modelKind: "embedding"
};

/** Local vector RAG — arctic-embed-m, stronger recall, RAM ≥ 8GB devices. */
export const EMBEDDING_MODEL_M: LocalModelDefinition = {
  id: "snowflake-arctic-embed-m-q0f32-MLC-b4",
  displayName: "ShadowTalk Embeddings - M (arctic)",
  version: "1.0",
  quantization: "q0f32",
  approxStorageRequirementMB: 208,
  approxVRAMRequirementMB: 539,
  contextLength: 512,
  supportedCapabilities: ["embeddings"],
  requiresWebGPU: true,
  isLowResourceCompatible: false,
  isAvailableOffline: true,
  modelKind: "embedding"
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
  approxVRAMRequirementMB: 1129,
  contextLength: 4096,
  supportedCapabilities: DEFAULT_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true
};

export const SMOLLM2_1_7B_LOCAL_MODEL_F32: LocalModelDefinition = {
  id: "SmolLM2-1.7B-Instruct-q4f32_1-MLC",
  displayName: "ShadowTalk Local - Lite+ (f32)",
  version: "1.0",
  quantization: "q4f32_1",
  approxStorageRequirementMB: 2000,
  approxVRAMRequirementMB: 2050,
  contextLength: 4096,
  supportedCapabilities: SMOLLM2_1_7B_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true
};

export const QWEN25_3B_LOCAL_MODEL_F32: LocalModelDefinition = {
  id: "Qwen2.5-3B-Instruct-q4f32_1-MLC",
  displayName: "ShadowTalk Local - Pro Qwen (f32)",
  version: "1.0",
  quantization: "q4f32_1",
  approxStorageRequirementMB: 2600,
  approxVRAMRequirementMB: 2800,
  contextLength: 4096,
  supportedCapabilities: QWEN25_3B_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: false,
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

export const CODER_3B_LOCAL_MODEL_F32: LocalModelDefinition = {
  id: "Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC",
  displayName: "ShadowTalk Code - Specialist (f32)",
  version: "1.0",
  quantization: "q4f32_1",
  approxStorageRequirementMB: 2600,
  approxVRAMRequirementMB: 2800,
  contextLength: 4096,
  supportedCapabilities: CODER_3B_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: false,
  isAvailableOffline: true
};

export const CODER_1_5B_LOCAL_MODEL_F32: LocalModelDefinition = {
  id: "Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC",
  displayName: "ShadowTalk Code - Specialist Lite (f32)",
  version: "1.0",
  quantization: "q4f32_1",
  approxStorageRequirementMB: 1850,
  approxVRAMRequirementMB: 1950,
  contextLength: 4096,
  supportedCapabilities: CODER_1_5B_LOCAL_MODEL.supportedCapabilities,
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true
};

export const MODEL_REGISTRY: Record<string, LocalModelDefinition> = {
  [LOW_TIER_LOCAL_MODEL.id]: LOW_TIER_LOCAL_MODEL,
  [DEFAULT_LOCAL_MODEL.id]: DEFAULT_LOCAL_MODEL,
  [SMOLLM2_1_7B_LOCAL_MODEL.id]: SMOLLM2_1_7B_LOCAL_MODEL,
  [QWEN25_3B_LOCAL_MODEL.id]: QWEN25_3B_LOCAL_MODEL,
  [HIGH_TIER_LOCAL_MODEL.id]: HIGH_TIER_LOCAL_MODEL,
  [CODER_3B_LOCAL_MODEL.id]: CODER_3B_LOCAL_MODEL,
  [CODER_1_5B_LOCAL_MODEL.id]: CODER_1_5B_LOCAL_MODEL,
  [EMBEDDING_MODEL_S.id]: EMBEDDING_MODEL_S,
  [EMBEDDING_MODEL_M.id]: EMBEDDING_MODEL_M,
  [LOW_TIER_LOCAL_MODEL_F32.id]: LOW_TIER_LOCAL_MODEL_F32,
  [DEFAULT_LOCAL_MODEL_F32.id]: DEFAULT_LOCAL_MODEL_F32,
  [SMOLLM2_1_7B_LOCAL_MODEL_F32.id]: SMOLLM2_1_7B_LOCAL_MODEL_F32,
  [QWEN25_3B_LOCAL_MODEL_F32.id]: QWEN25_3B_LOCAL_MODEL_F32,
  [HIGH_TIER_LOCAL_MODEL_F32.id]: HIGH_TIER_LOCAL_MODEL_F32,
  [CODER_3B_LOCAL_MODEL_F32.id]: CODER_3B_LOCAL_MODEL_F32,
  [CODER_1_5B_LOCAL_MODEL_F32.id]: CODER_1_5B_LOCAL_MODEL_F32
};

/** Every installable on-device chat model, ordered smallest → largest. */
export const LOCAL_MODEL_TIERS: LocalModelDefinition[] = [
  LOW_TIER_LOCAL_MODEL,
  DEFAULT_LOCAL_MODEL,
  CODER_1_5B_LOCAL_MODEL,
  SMOLLM2_1_7B_LOCAL_MODEL,
  HIGH_TIER_LOCAL_MODEL,
  QWEN25_3B_LOCAL_MODEL,
  CODER_3B_LOCAL_MODEL
];

export function getLocalModelDefinition(id: string): LocalModelDefinition | undefined {
  return MODEL_REGISTRY[id];
}

/**
 * The instant default chat model — Llama-3.2-1B (~880MB, f32 twin ~1.1GB).
 * Per the tiered pre-installed model manager, this is what the background
 * bootstrap auto-caches on first load, on every device that can fit it.
 */
export const STARTER_LOCAL_MODEL: LocalModelDefinition = DEFAULT_LOCAL_MODEL;

/**
 * Device-based pick. The 1B starter is the universal default; devices
 * reporting ≤2GB RAM cannot fit it (VRAM + KV cache), so they drop to the
 * 0.5B ultra-light safety net instead.
 */
export function pickLocalModelForDevice(
  deviceMemoryGB?: number,
  isMobile: boolean = false,
): LocalModelDefinition {
  void isMobile;
  if (typeof deviceMemoryGB === "number" && deviceMemoryGB > 0 && deviceMemoryGB <= 2) {
    return LOW_TIER_LOCAL_MODEL;
  }
  return STARTER_LOCAL_MODEL;
}

/** Embedding pick for local vector RAG: -m on ≥8GB devices, -s otherwise. */
export function pickEmbeddingModelForDevice(deviceMemoryGB?: number): LocalModelDefinition {
  if (typeof deviceMemoryGB === "number" && deviceMemoryGB >= 8) {
    return EMBEDDING_MODEL_M;
  }
  return EMBEDDING_MODEL_S;
}
