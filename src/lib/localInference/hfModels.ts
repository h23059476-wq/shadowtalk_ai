/**
 * Tier-1 local model catalog — @huggingface/transformers pipelines.
 *
 * THREE zero-cost, on-device pipelines (requirement spec):
 *   a. feature-extraction  → mxbai-embed-xsmall-v1   (local vector RAG)
 *   b. ASR                 → whisper-tiny.en         (offline voice input)
 *   c. text-generation     → Qwen2.5-0.5B / 1.5B q4  (offline fallback chat)
 *
 * Every entry is a real Hugging Face Hub repo with ONNX weights verified for
 * transformers.js (the v3 docs use mxbai/whisper/Qwen onnx-community repos in
 * their official WebGPU examples). Weights download directly from the Hub on
 * first use, are cached by the browser Cache API ('transformers-cache'), and
 * every session after that is 100% offline.
 *
 * Device policy: WebGPU ('webgpu' + q4/fp16-family dtype) when the adapter
 * exists, else WASM. The dtype ladder keeps VRAM low on the tiny end and
 * quality acceptable on the chat end.
 */

import type { HfTaskKind } from "./protocol";

/** ONNX quantization names transformers.js accepts (`dtype` option). */
export type HfDtype = "auto" | "fp16" | "fp32" | "q8" | "int8" | "uint8" | "q4" | "bnb4" | "q4f16";
/** Scalar dtype or per-module map (encoder/decoder split for whisper). */
export type HfDtypeValue = HfDtype | Record<string, HfDtype>;

export interface HfModelDefinition {
  /** HF Hub repo id. */
  repoId: string;
  task: HfTaskKind;
  /** Human name for the Offline Model Manager. */
  displayName: string;
  /** What it does for ShadowTalk. */
  purpose: string;
  /** Rough total download size in MB (all ONNX shards + tokenizer). */
  approxDownloadMB: number;
  /** dtype requested on WebGPU. */
  dtypeWebGPU: HfDtypeValue;
  /** dtype requested on WASM (fp32 fallbacks keep tiny models honest). */
  dtypeWasm: HfDtypeValue;
  /** Pooling mode for feature-extraction models. */
  pooling?: "mean" | "cls";
  /** true = the model only understands English (whisper-tiny.en). */
  englishOnly?: boolean;
  /** Feature-dim the model outputs (embeddings). */
  dim?: number;
}

// ── Embeddings (local vector RAG) ────────────────────────────────────────

/** Primary embedder: 33M params, 384-dim, the official transformers.js
 *  WebGPU feature-extraction example model. */
export const HF_EMBED_MODEL: HfModelDefinition = {
  repoId: "mixedbread-ai/mxbai-embed-xsmall-v1",
  task: "feature-extraction",
  displayName: "Mxbai Embed XS (33M)",
  purpose: "Neural embeddings for private, on-device document RAG",
  approxDownloadMB: 90,
  dtypeWebGPU: "fp32",
  dtypeWasm: "fp32",
  pooling: "mean",
  dim: 384,
};

/** Known-good tiny alternative (22M params, 384-dim, mean pooling). */
export const HF_EMBED_MODEL_ALT: HfModelDefinition = {
  repoId: "Xenova/all-MiniLM-L6-v2",
  task: "feature-extraction",
  displayName: "MiniLM-L6 v2 (22M)",
  purpose: "Smaller neural embedder alternative for RAG",
  approxDownloadMB: 45,
  dtypeWebGPU: "fp32",
  dtypeWasm: "fp32",
  pooling: "mean",
  dim: 384,
};

// ── Speech-to-text (offline voice input) ─────────────────────────────────

export const HF_ASR_MODEL: HfModelDefinition = {
  repoId: "onnx-community/whisper-tiny.en",
  task: "automatic-speech-recognition",
  displayName: "Whisper Tiny (EN)",
  purpose: "Offline dictation — voice input without any cloud speech API",
  approxDownloadMB: 130,
  // Whisper on WebGPU: q4 keeps the encoder+decoder lean; fp32 stays the
  // honest WASM fallback (quantized decoders hallucinate more on CPU).
  dtypeWebGPU: { encoder_model: "fp32", decoder_model_merged: "q4" },
  dtypeWasm: { encoder_model: "fp32", decoder_model_merged: "fp32" },
  englishOnly: true,
};

/** Multilingual alternative for non-English users. */
export const HF_ASR_MODEL_MULTILINGUAL: HfModelDefinition = {
  repoId: "onnx-community/whisper-base",
  task: "automatic-speech-recognition",
  displayName: "Whisper Base (multilingual)",
  purpose: "Offline dictation for non-English speech",
  approxDownloadMB: 190,
  dtypeWebGPU: { encoder_model: "fp32", decoder_model_merged: "q4" },
  dtypeWasm: { encoder_model: "fp32", decoder_model_merged: "fp32" },
};

// ── Compact chat (offline fallback when web-llm/WebGPU cannot run) ───────

export const HF_CHAT_MODEL_SMALL: HfModelDefinition = {
  repoId: "onnx-community/Qwen2.5-0.5B-Instruct",
  task: "text-generation",
  displayName: "Qwen2.5 0.5B Instruct (q4)",
  purpose: "Private offline fallback chat — fits devices without usable WebGPU",
  approxDownloadMB: 520,
  dtypeWebGPU: "q4",
  dtypeWasm: "q4",
};

export const HF_CHAT_MODEL_MEDIUM: HfModelDefinition = {
  repoId: "onnx-community/Qwen2.5-1.5B-Instruct",
  task: "text-generation",
  displayName: "Qwen2.5 1.5B Instruct (q4)",
  purpose: "Stronger offline fallback chat for larger devices",
  approxDownloadMB: 1100,
  dtypeWebGPU: "q4",
  dtypeWasm: "q4",
};

/** All Tier-1 models in manager display order. */
export const HF_MODELS: HfModelDefinition[] = [
  HF_EMBED_MODEL,
  HF_EMBED_MODEL_ALT,
  HF_ASR_MODEL,
  HF_ASR_MODEL_MULTILINGUAL,
  HF_CHAT_MODEL_SMALL,
  HF_CHAT_MODEL_MEDIUM,
];

export function getHfModel(repoId: string): HfModelDefinition | undefined {
  return HF_MODELS.find((m) => m.repoId === repoId);
}

/** Human task label for the manager UI. */
export function taskLabel(task: HfTaskKind): string {
  switch (task) {
    case "feature-extraction":
      return "Embeddings";
    case "automatic-speech-recognition":
      return "Speech-to-text";
    case "text-generation":
      return "Compact chat";
  }
}

/**
 * Ordered dtype/device ladder the client walks when init fails:
 *   1. webgpu + model's WebGPU dtype
 *   2. webgpu + model's WASM dtype (some quantizations lack WebGPU kernels)
 *   3. wasm + model's WASM dtype (the always-works floor)
 */
export function deviceDtypeLadder(model: HfModelDefinition, forceWasm: boolean): Array<{
  device: "webgpu" | "wasm";
  dtype: HfDtypeValue;
}> {
  const wasmRung = { device: "wasm" as const, dtype: model.dtypeWasm };
  if (forceWasm) return [wasmRung];
  const rungs: Array<{ device: "webgpu" | "wasm"; dtype: HfDtypeValue }> = [
    { device: "webgpu", dtype: model.dtypeWebGPU },
  ];
  if (model.dtypeWebGPU !== model.dtypeWasm) {
    rungs.push({ device: "webgpu", dtype: model.dtypeWasm });
  }
  rungs.push(wasmRung);
  return rungs;
}

/** True when this runtime can attempt WebGPU at all. */
export function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
