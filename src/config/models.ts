/**
 * Centralized model registry — the tiered pre-installed model manager.
 *
 * This is the single place that maps ShadowTalk's model lineup onto the MLC
 * prebuilt model ids. Raw definitions (sizes, twins, capabilities) live in
 * `src/ai/ModelRegistry.ts`; this module adds the TIER orchestration the
 * model manager and the ModelManagerDrawer render from:
 *
 *  - embeddings   auto-cached immediately on first visit (~64–208MB)
 *  - instant      auto-cached in the background on first load (~880MB–1.1GB)
 *  - ultralight   safety net for ≤2GB devices, mirror-hosted fallback
 *  - powerhouse   on-demand 1-click download (WebGPU + ≥8GB RAM, ~2.2–2.6GB)
 *  - coder        on-demand 1-click download (~1.5–2.6GB)
 *
 * All chat models carry a q4f32 twin (`fallbackModelId`) that the engine
 * swaps in when the WebGPU adapter lacks the shader-f16 feature, so the
 * "download size" shown to a user can differ per device — the twin-swap
 * happens at activation time inside LocalInferenceEngine.
 */
import {
  CODER_1_5B_LOCAL_MODEL,
  CODER_3B_LOCAL_MODEL,
  DEFAULT_LOCAL_MODEL,
  EMBEDDING_MODEL_M,
  EMBEDDING_MODEL_S,
  HIGH_TIER_LOCAL_MODEL,
  LOW_TIER_LOCAL_MODEL,
  QWEN25_3B_LOCAL_MODEL,
  SMOLLM2_1_7B_LOCAL_MODEL,
  MODEL_REGISTRY,
  getLocalModelDefinition,
  pickEmbeddingModelForDevice,
  pickLocalModelForDevice,
  STARTER_LOCAL_MODEL,
  type LocalModelDefinition,
} from "@/ai/ModelRegistry";

export type ModelTierId = "embeddings" | "instant" | "ultralight" | "powerhouse" | "coder";
export type ModelTierBadge = "auto-cache-now" | "auto-cache-background" | "on-demand";

export interface ModelTierEntry {
  /** MLC model id (must exist in web-llm's prebuiltAppConfig or our registry). */
  id: string;
  /** Role inside the tier. */
  role: "primary" | "alternative" | "low-spec-option";
}

export interface ModelTier {
  id: ModelTierId;
  label: string;
  description: string;
  /** When the tier's models are fetched. */
  badge: ModelTierBadge;
  /** Rough download size to display (MB, primary model). */
  approxDownloadMB: number;
  /** Hardware requirement line shown as a warning when unmet. */
  requiresWebGPU: boolean;
  minDeviceMemoryGB?: number;
  models: ModelTierEntry[];
}

/**
 * The tiered lineup, ordered exactly as the ModelManagerDrawer renders it.
 * Sizes/ids verified against @mlc-ai/web-llm 0.2.84 `prebuiltAppConfig`
 * (embeddings use the `-b4` batch-4 ids — that is what the prebuilt config
 * registers; `snowflake-arctic-embed-s-q0f32-MLC` without the suffix is not
 * an MLC model id).
 */
export const MODEL_TIERS: ModelTier[] = [
  {
    id: "embeddings",
    label: "Embeddings",
    description:
      "Local vector memory for RAG. Cached immediately on first visit — small and instant.",
    badge: "auto-cache-now",
    approxDownloadMB: EMBEDDING_MODEL_S.approxStorageRequirementMB,
    requiresWebGPU: true,
    models: [
      { id: EMBEDDING_MODEL_S.id, role: "primary" },
      { id: EMBEDDING_MODEL_M.id, role: "alternative" },
    ],
  },
  {
    id: "instant",
    label: "Instant Default Chat",
    description:
      "Your everyday private chat model, streamed down in the background on first load.",
    badge: "auto-cache-background",
    approxDownloadMB: DEFAULT_LOCAL_MODEL.approxStorageRequirementMB,
    requiresWebGPU: true,
    models: [
      { id: DEFAULT_LOCAL_MODEL.id, role: "primary" },
      { id: SMOLLM2_1_7B_LOCAL_MODEL.id, role: "alternative" },
    ],
  },
  {
    id: "ultralight",
    label: "Ultra-light",
    description:
      "Safety net for very weak devices (≤2GB RAM). Also the tier served by the self-hosted mirror.",
    badge: "on-demand",
    approxDownloadMB: LOW_TIER_LOCAL_MODEL.approxStorageRequirementMB,
    requiresWebGPU: true,
    models: [{ id: LOW_TIER_LOCAL_MODEL.id, role: "primary" }],
  },
  {
    id: "powerhouse",
    label: "Desktop Powerhouse",
    description:
      "The strongest on-device chat. One-click download, needs WebGPU + 8GB RAM.",
    badge: "on-demand",
    approxDownloadMB: HIGH_TIER_LOCAL_MODEL.approxStorageRequirementMB,
    requiresWebGPU: true,
    minDeviceMemoryGB: 8,
    models: [
      { id: QWEN25_3B_LOCAL_MODEL.id, role: "primary" },
      { id: HIGH_TIER_LOCAL_MODEL.id, role: "alternative" },
    ],
  },
  {
    id: "coder",
    label: "Code IDE Specialist",
    description:
      "Qwen2.5-Coder for in-IDE completion and refactors. The 1.5B variant fits lower-spec devices.",
    badge: "on-demand",
    approxDownloadMB: CODER_3B_LOCAL_MODEL.approxStorageRequirementMB,
    requiresWebGPU: true,
    models: [
      { id: CODER_3B_LOCAL_MODEL.id, role: "primary" },
      { id: CODER_1_5B_LOCAL_MODEL.id, role: "low-spec-option" },
    ],
  },
];

/** The tier auto-cached immediately on first visit. */
export const AUTO_CACHE_NOW_TIERS: ModelTierId[] = ["embeddings"];
/** The tier auto-cached in the background after the UI mounts. */
export const AUTO_CACHE_BACKGROUND_TIERS: ModelTierId[] = ["instant"];

/** Resolve a tier entry's definition. */
export function getTierModelDefinition(entry: ModelTierEntry): LocalModelDefinition | undefined {
  return getLocalModelDefinition(entry.id);
}

/** Every model id referenced by the tier table (incl. via fallback twins). */
export function allTierModelIds(): string[] {
  const ids = new Set<string>();
  for (const tier of MODEL_TIERS) {
    for (const entry of tier.models) {
      ids.add(entry.id);
      const def = getLocalModelDefinition(entry.id);
      if (def?.fallbackModelId) ids.add(def.fallbackModelId);
    }
  }
  return [...ids];
}

/**
 * The bootstrap plan: which model ids to cache, in order. The embedding
 * model is picked by device RAM (arctic-m on ≥8GB), the chat model by
 * `pickLocalModelForDevice` (1B default, 0.5B ultra-light on ≤2GB devices).
 */
export function bootstrapPlanForDevice(deviceMemoryGB?: number): {
  embeddingModelId: string;
  chatModelId: string;
} {
  return {
    embeddingModelId: pickEmbeddingModelForDevice(deviceMemoryGB).id,
    chatModelId: pickLocalModelForDevice(deviceMemoryGB).id,
  };
}

/** Human "Ready offline"-style status for a single model id. */
export function describeModel(id: string): LocalModelDefinition | undefined {
  return MODEL_REGISTRY[id];
}

// Re-exports so `@/config/models` is the single import surface for the
// model manager, the drawer, and future RAG code.
export {
  MODEL_REGISTRY,
  getLocalModelDefinition,
  pickLocalModelForDevice,
  pickEmbeddingModelForDevice,
  STARTER_LOCAL_MODEL,
  DEFAULT_LOCAL_MODEL,
  LOW_TIER_LOCAL_MODEL,
  SMOLLM2_1_7B_LOCAL_MODEL,
  QWEN25_3B_LOCAL_MODEL,
  HIGH_TIER_LOCAL_MODEL,
  CODER_3B_LOCAL_MODEL,
  CODER_1_5B_LOCAL_MODEL,
  EMBEDDING_MODEL_S,
  EMBEDDING_MODEL_M,
  type LocalModelDefinition,
};
