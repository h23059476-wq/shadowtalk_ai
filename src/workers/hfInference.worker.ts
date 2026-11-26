/**
 * Tier-1 local inference — Dedicated Web Worker for @huggingface/transformers.
 *
 * Every Tier-1 pipeline (embeddings / whisper ASR / compact chat) runs HERE,
 * never on the main thread. Design:
 *
 *  - LAZY: `@huggingface/transformers` (and the onnxruntime WASM runtime) is
 *    dynamically imported on the FIRST pipeline request only. The worker
 *    chunk stays tiny and the heavy lib ships in its own lazy chunk, so the
 *    initial page load never pays for local inference.
 *  - OFFLINE: `env.backends.onnx.wasm.wasmPaths` is pinned to the app-owned
 *    `/onnx/` directory (copied from node_modules by scripts/copy-ort-wasm.mjs)
 *    — the library's jsdelivr CDN default is overridden so ZERO external
 *    requests happen at runtime except the first-use weight download from
 *    the Hugging Face Hub, which the browser Cache API then serves forever.
 *  - DEVICE LADDER: webgpu + q4 → webgpu + fp32 → wasm + fp32, walked inside
 *    the worker on init failures; the `ready` message reports the device that
 *    actually won (and whether it was a downgrade).
 *  - ABORT: chat generation uses transformers.js InterruptableStoppingCriteria
 *    so a 'chat-abort' message returns the partial text instead of leaking.
 */

import type { HfInitPayload, HfWorkerRequest, HfWorkerResponse } from "@/lib/localInference/protocol";
import { classifyHfError, isHfWorkerRequest } from "@/lib/localInference/protocol";
import { deviceDtypeLadder, getHfModel, type HfDtypeValue, type HfModelDefinition } from "@/lib/localInference/hfModels";

type TransformersLib = typeof import("@huggingface/transformers");

let libPromise: Promise<TransformersLib | null> | null = null;
const pipelines = new Map<string, { pipeline: unknown; device: "webgpu" | "wasm" }>();
const stoppers = new Map<string, { interrupt: () => void }>();

function post(response: HfWorkerResponse): void {
  (self as unknown as Worker).postMessage(response);
}

function postStatus(
  state: "idle" | "loading" | "ready" | "recovering" | "dead",
  device: "webgpu" | "wasm" | null,
  detail: string,
): void {
  post({ type: "engine-status", id: "engine", payload: { state, device, detail } });
}

/** Load the library once; returns null when the import itself fails. */
async function loadLib(): Promise<TransformersLib | null> {
  if (!libPromise) {
    libPromise = (async () => {
      try {
        const lib = await import("@huggingface/transformers");
        // Offline-first: never probe app-relative model paths…
        lib.env.allowLocalModels = false;
        // …and never let ORT fetch its WASM runtime from a CDN — the runtime
        // ships inside the app (public/onnx/, see scripts/copy-ort-wasm.mjs).
        lib.env.backends.onnx.wasm.wasmPaths = "/onnx/";
        lib.env.backends.onnx.wasm.proxy = false; // we ARE the worker
        console.info("[hf.worker] transformers.js", lib.env.version, "ready (wasmPaths=/onnx/)");
        return lib;
      } catch (error) {
        console.error("[hf.worker] failed to load @huggingface/transformers:", error);
        return null;
      }
    })();
  }
  return libPromise;
}

// ── Progress aggregation ─────────────────────────────────────────────────
// transformers.js emits per-file events; aggregate into a single 0..1 stream
// for the Offline Model Manager progress bars (throttled to whole percents).

interface FileProgress {
  loaded: number;
  total: number;
}
let activeProgressFiles = new Map<string, FileProgress>();
let lastReportedPercent = -1;

function resetProgressTracking(): void {
  activeProgressFiles = new Map();
  lastReportedPercent = -1;
}

function makeProgressCallback(requestId: string) {
  return (event: Record<string, unknown>) => {
    const status = String(event.status ?? "");
    const file = typeof event.file === "string" ? event.file : "";
    if (status === "progress" && file) {
      const loaded = Number(event.loaded ?? 0);
      const total = Number(event.total ?? 0);
      if (total > 0) activeProgressFiles.set(file, { loaded, total });
    }
    if (status === "done" && file) {
      const current = activeProgressFiles.get(file);
      if (current && current.total > 0) {
        activeProgressFiles.set(file, { loaded: current.total, total: current.total });
      }
    }
    let loadedSum = 0;
    let totalSum = 0;
    for (const { loaded, total } of activeProgressFiles.values()) {
      loadedSum += loaded;
      totalSum += total;
    }
    const progress = totalSum > 0 ? Math.max(0, Math.min(1, loadedSum / totalSum)) : 0;
    const percent = Math.floor(progress * 100);
    if (percent !== lastReportedPercent || status === "initiate" || status === "done") {
      lastReportedPercent = percent;
      post({
        type: "progress",
        id: requestId,
        payload: { status, progress, file: file || undefined, loaded: loadedSum, total: totalSum },
      });
    }
  };
}

// ── Pipeline creation with the device/dtype ladder ───────────────────────

function definitionFor(payload: HfInitPayload): HfModelDefinition {
  const known = getHfModel(payload.model);
  if (known) return known;
  // Unknown repo — synthesize a definition so the ladder still has dtypes.
  return {
    repoId: payload.model,
    task: payload.task,
    displayName: payload.model,
    purpose: "",
    approxDownloadMB: 0,
    dtypeWebGPU: (payload.dtype ?? "q4") as HfDtypeValue,
    dtypeWasm: (payload.dtype ?? "fp32") as HfDtypeValue,
    pooling: payload.pooling,
  };
}

async function createPipeline(
  lib: TransformersLib,
  payload: HfInitPayload,
  requestId: string,
): Promise<{ pipeline: unknown; device: "webgpu" | "wasm"; downgraded: boolean }> {
  const model = definitionFor(payload);
  const forceWasm = !!payload.forceWasm || !("gpu" in navigator);
  const ladder = deviceDtypeLadder(model, forceWasm);
  const requestedDevice = forceWasm ? "wasm" : "webgpu";
  resetProgressTracking();
  const onProgress = makeProgressCallback(requestId);

  let lastError: unknown = null;
  for (const rung of ladder) {
    try {
      postStatus("loading", rung.device, `${model.repoId} on ${rung.device}`);
      const pipeline = await lib.pipeline(payload.task, model.repoId, {
        device: rung.device,
        dtype: rung.dtype as Parameters<typeof lib.pipeline>[2] extends { dtype?: infer D } ? D : never,
        progress_callback: onProgress,
      } as Parameters<typeof lib.pipeline>[2]);
      return { pipeline, device: rung.device, downgraded: rung.device !== requestedDevice };
    } catch (error) {
      lastError = error;
      const kind = classifyHfError(error instanceof Error ? error.message : String(error));
      console.warn(`[hf.worker] init failed on ${rung.device} (${kind}) — trying next rung`, error);
      if (kind === "download" || kind === "unsupported") throw error; // no point walking further
    }
  }
  throw lastError ?? new Error("Pipeline initialization failed on every device.");
}

function pipelineKey(task: string, model: string): string {
  return `${task}:${model}`;
}

// ── Task runners (every result echoes the request id) ────────────────────

interface PipelineEntry {
  pipeline: unknown;
  device: "webgpu" | "wasm";
}

async function runEmbed(
  entry: PipelineEntry,
  payload: { texts: string[] },
  init: HfInitPayload,
  requestId: string,
): Promise<void> {
  const extractor = entry.pipeline as (
    texts: string[],
    options?: Record<string, unknown>,
  ) => Promise<{ tolist: () => number[][] }>;
  const pooling = init.pooling ?? getHfModel(init.model)?.pooling ?? "mean";
  const output = await extractor(payload.texts, { pooling, normalize: true });
  post({
    type: "result",
    id: requestId,
    payload: { embeddings: output.tolist(), model: init.model, device: entry.device },
  });
}

async function runTranscribe(
  entry: PipelineEntry,
  payload: { audio: Float32Array; language?: string },
  init: HfInitPayload,
  requestId: string,
): Promise<void> {
  const asr = entry.pipeline as (
    audio: Float32Array,
    options?: Record<string, unknown>,
  ) => Promise<{ text: string }>;
  const options: Record<string, unknown> = {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  };
  // Multilingual models accept a language hint; .en models must not get one.
  if (payload.language && !getHfModel(init.model)?.englishOnly) {
    options.language = payload.language;
    options.task = "transcribe";
  }
  const output = await asr(payload.audio, options);
  post({
    type: "result",
    id: requestId,
    payload: { text: (output?.text ?? "").trim(), model: init.model, device: entry.device },
  });
}

async function runChat(
  lib: TransformersLib,
  entry: PipelineEntry,
  payload: {
    messages: { role: string; content: string }[];
    maxNewTokens?: number;
    temperature?: number;
    topK?: number;
  },
  init: HfInitPayload,
  requestId: string,
): Promise<void> {
  const llm = entry.pipeline as unknown as {
    tokenizer: unknown;
    (
      messages: unknown,
      options?: Record<string, unknown>,
    ): Promise<Array<{ generated_text: string | { content?: string } }>>;
  };

  const { TextStreamer, InterruptableStoppingCriteria } = lib;
  const stopper = new InterruptableStoppingCriteria();
  stoppers.set(requestId, stopper);
  let streamed = "";
  const streamer = new TextStreamer(
    llm.tokenizer as ConstructorParameters<typeof TextStreamer>[0],
    {
      skip_prompt: true,
      callback_function: (text: string) => {
        streamed += text;
        post({ type: "delta", id: requestId, payload: { text } });
      },
    },
  );

  const temperature = payload.temperature ?? 0.7;
  try {
    const output = await llm(payload.messages, {
      max_new_tokens: payload.maxNewTokens ?? 512,
      do_sample: temperature > 0,
      temperature,
      top_k: payload.topK ?? 50,
      repetition_penalty: 1.1,
      streamer,
      stopping_criteria: stopper,
      return_full_text: false,
    });
    const last = output?.[output.length - 1]?.generated_text;
    const text =
      typeof last === "string" ? last : typeof last?.content === "string" ? last.content : streamed;
    post({
      type: "result",
      id: requestId,
      payload: { text: (text || streamed).trim(), model: init.model, device: entry.device },
    });
  } finally {
    stoppers.delete(requestId);
  }
}

// ── Message pump ─────────────────────────────────────────────────────────

async function handleRequest(request: HfWorkerRequest): Promise<void> {
  switch (request.type) {
    case "reset": {
      pipelines.clear();
      stoppers.clear();
      postStatus("idle", null, "Engine reset");
      post({ type: "result", id: request.id, payload: { text: "reset", model: "", device: "wasm" } });
      return;
    }
    case "chat-abort": {
      const stopper = stoppers.get(request.id);
      if (stopper) stopper.interrupt();
      return; // no dedicated response — the interrupted generation posts its result
    }
    default:
      break;
  }

  postStatus("loading", null, `${request.type} in flight`);
  const lib = await loadLib();
  if (!lib) {
    post({
      type: "error",
      id: request.id,
      payload: {
        kind: "unsupported",
        message: "The local inference library failed to load in this browser.",
      },
    });
    return;
  }

  try {
    if (request.type === "init") {
      const key = pipelineKey(request.payload.task, request.payload.model);
      let entry = pipelines.get(key);
      let downgraded = false;
      let device: "webgpu" | "wasm" = "wasm";
      if (!entry) {
        const created = await createPipeline(lib, request.payload, request.id);
        entry = { pipeline: created.pipeline, device: created.device };
        pipelines.set(key, entry);
        downgraded = created.downgraded;
        device = created.device;
      } else {
        device = entry.device;
      }
      post({
        type: "ready",
        id: request.id,
        payload: { task: request.payload.task, model: request.payload.model, device, downgraded },
      });
      postStatus("ready", device, `${request.payload.task} ready`);
      // Settle the client's init/download promise (the promise resolves on
      // `result`; `ready` only feeds the status badge + onReady callbacks).
      post({
        type: "result",
        id: request.id,
        payload: { text: "ready", model: request.payload.model, device },
      });
      return;
    }

    if (request.type === "embed") {
      const modelId = await ensureModelForTask(lib, "feature-extraction", request);
      const entry = pipelines.get(pipelineKey("feature-extraction", modelId))!;
      await runEmbed(
        entry,
        request.payload,
        { task: "feature-extraction", model: modelId, pooling: getHfModel(modelId)?.pooling },
        request.id,
      );
      return;
    }
    if (request.type === "transcribe") {
      const modelId = await ensureModelForTask(lib, "automatic-speech-recognition", request);
      const entry = pipelines.get(pipelineKey("automatic-speech-recognition", modelId))!;
      await runTranscribe(entry, request.payload, { task: "automatic-speech-recognition", model: modelId }, request.id);
      return;
    }
    if (request.type === "chat") {
      const modelId = await ensureModelForTask(lib, "text-generation", request);
      const entry = pipelines.get(pipelineKey("text-generation", modelId))!;
      await runChat(lib, entry, request.payload, { task: "text-generation", model: modelId }, request.id);
      return;
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    post({
      type: "error",
      id: request.id,
      payload: { kind: classifyHfError(raw), message: raw },
    });
  }
}

/**
 * Task requests (embed/transcribe/chat) may arrive without a prior init —
 * make sure the DEFAULT model for that task is loaded, then return its id.
 */
async function ensureModelForTask(
  lib: TransformersLib,
  task: "feature-extraction" | "automatic-speech-recognition" | "text-generation",
  request: HfWorkerRequest,
): Promise<string> {
  const { HF_EMBED_MODEL, HF_ASR_MODEL, HF_CHAT_MODEL_SMALL } = await import("@/lib/localInference/hfModels");
  const defaultModel =
    task === "feature-extraction"
      ? HF_EMBED_MODEL
      : task === "automatic-speech-recognition"
        ? HF_ASR_MODEL
        : HF_CHAT_MODEL_SMALL;
  const key = pipelineKey(task, defaultModel.repoId);
  if (!pipelines.has(key)) {
    const created = await createPipeline(
      lib,
      { task, model: defaultModel.repoId, pooling: defaultModel.pooling },
      request.id,
    );
    pipelines.set(key, { pipeline: created.pipeline, device: created.device });
    post({
      type: "ready",
      id: request.id,
      payload: { task, model: defaultModel.repoId, device: created.device, downgraded: created.downgraded },
    });
  }
  return defaultModel.repoId;
}

self.onmessage = (event: MessageEvent) => {
  const data: unknown = event.data;
  if (!isHfWorkerRequest(data)) {
    console.warn("[hf.worker] ignoring malformed message", data);
    return;
  }
  void handleRequest(data);
};

export {};
