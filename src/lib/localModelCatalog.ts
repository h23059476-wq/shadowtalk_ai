/**
 * Local model catalog helpers — pure functions behind the chat header's
 * on-device model switcher (and its tests).
 *
 * The chat header dropdown lists every DOWNLOADED on-device chat model so the
 * user can switch between the house cloud model and private on-device models
 * in one place. These helpers resolve which models to show and how to label
 * the currently active one; cache lookups and engine switching stay in
 * `useLocalChatModels` / `services/modelManager`.
 */
import {
  LOCAL_MODEL_TIERS,
  getLocalModelDefinition,
  type LocalModelDefinition,
} from "@/ai/ModelRegistry";

/**
 * On-device CHAT models, ordered smallest → largest (registry order).
 * Embedding models are excluded — they are internal RAG infrastructure,
 * managed by the background bootstrap, and never chat options.
 */
export function chatModelOptions(): LocalModelDefinition[] {
  return LOCAL_MODEL_TIERS.filter((def) => def.modelKind !== "embedding");
}

/**
 * A model counts as downloaded when the cache holds the primary id OR its
 * device twin (the q4f32 fallback the engine swaps in when the GPU lacks
 * shader-f16). The dropdown shows one row per primary model either way.
 */
export function isModelDownloaded(primaryId: string, cachedIds: Set<string>): boolean {
  if (cachedIds.has(primaryId)) return true;
  const fallbackId = getLocalModelDefinition(primaryId)?.fallbackModelId;
  return !!fallbackId && cachedIds.has(fallbackId);
}

/**
 * Map the engine's loaded model id back to the user-facing primary tier
 * entry. The engine sometimes runs the q4f32 twin (shader-f16 missing), and
 * twin display names carry a technical "(f32)" suffix — the trigger label
 * should show the same friendly name the dropdown row used.
 */
export function resolvePrimaryLocalModel(id: string): LocalModelDefinition | undefined {
  const direct = getLocalModelDefinition(id);
  if (direct?.fallbackModelId) return direct; // already a primary tier entry
  const primary = chatModelOptions().find((def) => def.fallbackModelId === id);
  return primary ?? direct;
}

/** "~880 MB" / "2.2 GB" — one decimal for GB, exact for MB. */
export function formatModelSize(sizeMB: number): string {
  if (sizeMB >= 1024) return `${(sizeMB / 1024).toFixed(1)} GB`;
  return `${Math.round(sizeMB)} MB`;
}
