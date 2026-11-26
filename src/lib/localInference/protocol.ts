/**
 * Tier-1 local inference — worker message protocol.
 *
 * The ONLY contract between the main thread (`localEngineClient.ts`) and the
 * dedicated worker (`workers/hfInference.worker.ts`). Both sides import the
 * TYPES from here; nothing at runtime is shared, so the worker stays a
 * self-contained bundle and the client stays mockable in tests.
 *
 * Design rules:
 *  - Every request carries a monotonically increasing string `id`; every
 *    response echoes it. The client maps ids → pending promises.
 *  - Long-running work (model download/init, chat generation) emits
 *    `progress` / `delta` messages keyed by the SAME id until a `result`
 *    or `error` settles the request.
 *  - Errors are TYPED (`HfErrorKind`) so the client can decide between a
 *    silent device downgrade (gpu-lost), a worker respawn (oom/gpu-lost)
 *    and a plain rejection (download/unsupported/unknown).
 */

export const HF_PROTOCOL_VERSION = 1;

export type HfTaskKind = "feature-extraction" | "automatic-speech-recognition" | "text-generation";

/** Typed failure classes the client's recovery ladder switches on. */
export type HfErrorKind =
  /** WebGPU context/adapter lost or destroyed — retry on WASM after respawn. */
  | "gpu-lost"
  /** Allocation failure / OOM — retry on WASM (fp32, less VRAM) after respawn. */
  | "oom"
  /** HF Hub fetch failed (offline first-use, 404, corrupt download). */
  | "download"
  /** Device cannot run the requested pipeline at all. */
  | "unsupported"
  | "unknown";

export interface HfInitPayload {
  task: HfTaskKind;
  /** Hugging Face Hub repo id, e.g. "onnx-community/whisper-tiny.en". */
  model: string;
  /** Requested ONNX quantization, e.g. "q4" / "fp32" / per-module object. */
  dtype?: string | Record<string, string>;
  /** true = force WASM even when WebGPU exists (tests, recovery ladder). */
  forceWasm?: boolean;
  /** Embedding pooling mode (feature-extraction only). */
  pooling?: "mean" | "cls";
  /** Extra generation config (text-generation only). */
  generation?: { maxNewTokens?: number; temperature?: number; topK?: number };
}

export interface HfEmbedPayload {
  texts: string[];
}

export interface HfTranscribePayload {
  /** 16 kHz mono PCM. Transferred (not cloned) into the worker. */
  audio: Float32Array;
  /** BCP-47 hint for multilingual models; ignored by .en models. */
  language?: string;
}

export interface HfChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface HfChatPayload {
  messages: HfChatMessage[];
  maxNewTokens?: number;
  temperature?: number;
  topK?: number;
}

export interface HfReadyPayload {
  task: HfTaskKind;
  model: string;
  /** Device the pipeline ACTUALLY came up on (after any fallback). */
  device: "webgpu" | "wasm";
  /** true when `device` differs from the originally requested device. */
  downgraded: boolean;
}

export interface HfProgressPayload {
  /** transformers.js progress_callback status, e.g. "initiate"/"download"/"done". */
  status: string;
  /** 0..1 aggregate for the whole pipeline load (client-side smoothing). */
  progress: number;
  file?: string;
  loaded?: number;
  total?: number;
}

export interface HfEmbedResultPayload {
  /** L2-normalized vectors, order matches the request. */
  embeddings: number[][];
  model: string;
  device: "webgpu" | "wasm";
}

export interface HfTranscribeResultPayload {
  text: string;
  model: string;
  device: "webgpu" | "wasm";
}

export interface HfChatResultPayload {
  /** Full assistant text (final; deltas were streamed separately). */
  text: string;
  model: string;
  device: "webgpu" | "wasm";
}

// ── Messages ──────────────────────────────────────────────────────────────

export type HfWorkerRequest =
  | { type: "init"; id: string; payload: HfInitPayload }
  | { type: "embed"; id: string; payload: HfEmbedPayload }
  | { type: "transcribe"; id: string; payload: HfTranscribePayload }
  | { type: "chat"; id: string; payload: HfChatPayload }
  | { type: "chat-abort"; id: string; payload: { reason?: string } }
  | { type: "reset"; id: string; payload?: Record<string, never> };

export type HfWorkerResponse =
  | { type: "ready"; id: string; payload: HfReadyPayload }
  | { type: "progress"; id: string; payload: HfProgressPayload }
  | { type: "delta"; id: string; payload: { text: string } }
  | { type: "result"; id: string; payload: HfEmbedResultPayload | HfTranscribeResultPayload | HfChatResultPayload }
  | { type: "error"; id: string; payload: { kind: HfErrorKind; message: string } }
  | { type: "engine-status"; id: string; payload: HfEngineStatus };

/** Cross-cutting engine health reported outside any single request. */
export interface HfEngineStatus {
  state: "idle" | "loading" | "ready" | "recovering" | "dead";
  device: "webgpu" | "wasm" | null;
  detail: string;
}

// ── Error classification (pure — unit tested) ────────────────────────────

const GPU_LOST_PATTERNS = [
  "device lost",
  "was lost",
  "context lost",
  "gpuadapter",
  "webgpu device",
  "destroyed",
  "lost the device",
  "gpucanvascontext",
  "validation error",
  "no adapter",
  "unable to find a compatible gpu",
];
const OOM_PATTERNS = [
  "out of memory",
  "oom",
  "allocation failed",
  "buffer allocation",
  "memory allocation",
  "ran out of",
  "heap",
];
const DOWNLOAD_PATTERNS = [
  "fetch",
  "networkerror",
  "network error",
  "offline",
  "404",
  "status code 5",
  "invalid model",
  "unrecognized model",
  "failed to download",
  "load failed",
];
const UNSUPPORTED_PATTERNS = ["not supported", "unsupported", "no webgpu", "is not a function", "opset"];

/** Best-effort classification of a raw error message from the worker/ORT. */
export function classifyHfError(raw: string | undefined | null): HfErrorKind {
  const msg = (raw ?? "").toLowerCase();
  if (!msg) return "unknown";
  if (GPU_LOST_PATTERNS.some((p) => msg.includes(p))) return "gpu-lost";
  if (OOM_PATTERNS.some((p) => msg.includes(p))) return "oom";
  if (UNSUPPORTED_PATTERNS.some((p) => msg.includes(p))) return "unsupported";
  if (DOWNLOAD_PATTERNS.some((p) => msg.includes(p))) return "download";
  return "unknown";
}

/**
 * Errors that mean "this worker/GPU session is toast" — the client must
 * terminate and respawn instead of retrying in place.
 */
export function isFatalHfErrorKind(kind: HfErrorKind): boolean {
  return kind === "gpu-lost" || kind === "oom";
}

// ── Validation (pure — unit tested; guards the postMessage boundary) ─────

export function isHfWorkerRequest(value: unknown): value is HfWorkerRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  switch (v.type) {
    case "init":
      return (
        typeof v.payload === "object" &&
        v.payload !== null &&
        typeof (v.payload as HfInitPayload).task === "string" &&
        typeof (v.payload as HfInitPayload).model === "string"
      );
    case "embed":
      return (
        typeof v.payload === "object" &&
        v.payload !== null &&
        Array.isArray((v.payload as HfEmbedPayload).texts)
      );
    case "transcribe":
      return (
        typeof v.payload === "object" &&
        v.payload !== null &&
        (v.payload as HfTranscribePayload).audio instanceof Float32Array
      );
    case "chat":
      return (
        typeof v.payload === "object" &&
        v.payload !== null &&
        Array.isArray((v.payload as HfChatPayload).messages)
      );
    case "chat-abort":
      return true;
    case "reset":
      return true;
    default:
      return false;
  }
}

export function isHfWorkerResponse(value: unknown): value is HfWorkerResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case "ready":
    case "result":
    case "delta":
    case "progress":
    case "error":
      return (
        typeof v.id === "string" &&
        typeof v.payload === "object" &&
        v.payload !== null
      );
    case "engine-status":
      return typeof v.payload === "object";
    default:
      return false;
  }
}
