/**
 * Tier-1 neural embedder — bridges the localInference worker into the
 * existing `EmbeddingProvider` interface (the extension slot documented in
 * rag/embeddings.ts since Batch 2).
 *
 * Honest labeling (matching the module's discipline): this IS a real neural
 * embedding model (mxbai-embed-xsmall-v1, 33M params) computed fully
 * on-device via the dedicated HF worker — but the user must explicitly opt
 * in (preference kind 'local-hf'), because switching embedders changes the
 * vector space and stale indexes must be re-ingested.
 */

import { getLocalInferenceClient } from "@/lib/localInference/localEngineClient";
import { HF_EMBED_MODEL, type HfModelDefinition } from "@/lib/localInference/hfModels";

export class LocalHFEmbedder {
  readonly id: string;
  readonly label: string;
  readonly local: true;
  readonly dim: number;
  private readonly model: HfModelDefinition;

  constructor(model: HfModelDefinition = HF_EMBED_MODEL) {
    this.model = model;
    this.id = "local-hf";
    this.label = `Local neural (${model.displayName}, on-device GPU/CPU)`;
    this.local = true;
    this.dim = model.dim ?? 384;
  }

  /**
   * Embed a batch of texts through the worker. When the model is not cached
   * yet this FAILS (download is an explicit Offline Model Manager action) —
   * callers fall back to the lexical embedder rather than silently paying
   * hundreds of MB.
   */
  async embed(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    if (texts.length === 0) return [];
    const client = getLocalInferenceClient();
    const result = await client.embedTexts(texts, { model: this.model });
    void signal; // worker-side generation is not cancellable per-batch today
    return result.embeddings;
  }
}
