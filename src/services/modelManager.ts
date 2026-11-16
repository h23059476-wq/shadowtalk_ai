/**
 * Model Pre-Cache & Lifecycle Manager — the tiered pre-installed model manager.
 *
 * Coordinates everything around the model lineup in `src/config/models.ts`:
 *
 *  - BOOTSTRAP: after the UI mounts (requestIdleCallback / short delay) the
 *    embedding model (local vector RAG) is cached immediately, then the
 *    instant default chat model streams down in the background. Nothing
 *    blocks: the user keeps chatting via BYOK/escalation while shards land.
 *  - OFFLINE SAFETY: an offline browser pauses the bootstrap (phase
 *    `paused-offline`); coming back online resumes it — WebLLM caches
 *    weights per-shard, so a resume never re-fetches cached shards.
 *  - LIFECYCLE: cache checks (`hasModelInCache`), deletion
 *    (`deleteCachedModel`), activation (`switchActiveModel`) and
 *    OpenAI-compatible inference (`generateChatCompletion`,
 *    `generateEmbeddings`).
 *
 * Ownership boundaries (deliberate, to avoid two engines fighting over one
 * GPU): CHAT inference stays owned by the existing `LocalInferenceEngine`
 * singleton — cloudChat routing, the on-device shield badge and the privacy
 * ledger are all wired to it. This manager drives it for activation and
 * delegates generation. EMBEDDINGS run on a SECOND engine instance in its
 * own worker (a web-llm engine holds exactly one model), created lazily the
 * first time embeddings are needed. Both workers share the same
 * `src/workers/webllm.worker.ts` handler.
 *
 * The one-time ask (`PrivateAiBanner` / `BackgroundInstall`) stays coherent:
 * the chat step of the bootstrap REUSES `startBackgroundInstall` (adopting
 * its consent record, silent flip, ready event and ledger entry), and a
 * "Not now" decision aborts the whole bootstrap.
 */
import {
  hasModelInCache as webllmHasModelInCache,
  deleteModelAllInfoInCache,
  type InitProgressReport,
  type WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import {
  bootstrapPlanForDevice,
  getLocalModelDefinition,
  type LocalModelDefinition,
} from "@/config/models";
import { detectDeviceCapabilities, getDeviceMemoryGB, requestPersistentStorage, getStorageQuota } from "@/utils/deviceCapabilities";
import { getInstallDecision } from "@/offline/BackgroundInstall";
import type { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";

export type ModelManagerPhase =
  | "idle"
  | "waiting-idle"
  | "bootstrapping"
  | "paused-offline"
  | "ready"
  | "unsupported"
  | "failed";

export interface ModelManagerSnapshot {
  phase: ModelManagerPhase;
  /** Model currently being streamed/activated by the bootstrap (if any). */
  currentModelId: string | null;
  /** 0..1 granular progress of the current bootstrap step. */
  progress: number;
  progressText: string;
  /** Seconds since the bootstrap step started (from web-llm reports). */
  timeElapsedSec: number | null;
  /** Set when the embedding model failed but the chat step continued. */
  embeddingError: string | null;
  error: string | null;
  /** Set when the bootstrap was aborted by the one-time ask ("Not now"). */
  aborted: boolean;
}

const DEFAULT_SNAPSHOT: ModelManagerSnapshot = {
  phase: "idle",
  currentModelId: null,
  progress: 0,
  progressText: "",
  timeElapsedSec: null,
  embeddingError: null,
  error: null,
  aborted: false,
};

/** OpenAI-shaped embeddings response (structural — matches web-llm's type). */
export interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number; object: "embedding" }>;
  model: string;
  object: "list";
  usage: { prompt_tokens: number; total_tokens: number };
}

const listeners = new Set<(s: ModelManagerSnapshot) => void>();
let snapshot: ModelManagerSnapshot = { ...DEFAULT_SNAPSHOT };
let bootstrapStarted = false;
let abortRequested = false;
let embedEngine: WebWorkerMLCEngine | null = null;
let embedEngineModelId: string | null = null;
let embedEngineCreating: Promise<WebWorkerMLCEngine> | null = null;
let initialized = false;
let offlineHandlersAttached = false;

function patch(partial: Partial<ModelManagerSnapshot>): ModelManagerSnapshot {
  const prevPhase = snapshot.phase;
  snapshot = { ...snapshot, ...partial };
  if (partial.phase && partial.phase !== prevPhase) {
    // observability: the tiered bootstrap is invisible by design, so the
    // console is the only trace of its lifecycle
    console.info(`[model-manager] phase → ${partial.phase}`, partial.progressText ?? "");
  }
  listeners.forEach((l) => l(snapshot));
  return snapshot;
}

/** Current manager snapshot (pure — safe as React state seed). */
export function getModelManagerSnapshot(): ModelManagerSnapshot {
  return snapshot;
}

/** Subscribe to manager snapshot changes. Returns an unsubscribe fn. */
export function subscribeModelManager(cb: (s: ModelManagerSnapshot) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ── Cache lifecycle ──────────────────────────────────────────────────────

/** What is already stored locally for a model (per-shard cache backend). */
export async function hasModelInCache(modelId: string): Promise<boolean> {
  try {
    return await webllmHasModelInCache(modelId);
  } catch {
    return false;
  }
}

/** Removes a cached model (unloading it first when it is the active one). */
export async function deleteCachedModel(modelId: string): Promise<void> {
  const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
  if (localInferenceEngine.getCurrentModelId() === modelId && localInferenceEngine.isLoaded()) {
    await localInferenceEngine.unload();
  }
  if (embedEngineModelId === modelId) await unloadEmbeddingEngine();
  try {
    await deleteModelAllInfoInCache(modelId);
  } catch (error) {
    console.warn(`[model-manager] could not delete cache for ${modelId}:`, error);
    throw error;
  }
}

// ── Embedding engine (second worker, lazy) ──────────────────────────────

async function ensureEmbeddingEngine(
  modelId?: string,
  onProgress?: (r: InitProgressReport) => void,
): Promise<WebWorkerMLCEngine> {
  const resolved = modelId ?? bootstrapPlanForDevice(getDeviceMemoryGB().gb).embeddingModelId;
  if (embedEngine && embedEngineModelId === resolved) return embedEngine;
  if (embedEngineCreating) return embedEngineCreating;

  const { CreateWebWorkerMLCEngine: Create } = await import("@mlc-ai/web-llm");
  embedEngineCreating = (async () => {
    const worker = new Worker(new URL("../workers/webllm.worker.ts", import.meta.url), {
      type: "module",
    });
    try {
      const engine = await Create(worker, resolved, {
        initProgressCallback: (report) => onProgress?.(report),
        // No context_window_size override — embedding models ship their own
        // (arctic: 512). No appConfig override — embeddings always load from
        // the primary CDN (the self-hosted mirror only hosts chat twins).
      });
      embedEngine = engine;
      embedEngineModelId = resolved;
      return engine;
    } catch (error) {
      try {
        worker.terminate();
      } catch {
        /* already dead */
      }
      throw error;
    } finally {
      embedEngineCreating = null;
    }
  })();
  return embedEngineCreating;
}

/** Frees the embedding engine's GPU memory (shards stay cached). */
export async function unloadEmbeddingEngine(): Promise<void> {
  if (!embedEngine) return;
  try {
    await embedEngine.unload();
  } catch {
    /* best effort */
  }
  embedEngine = null;
  embedEngineModelId = null;
}

// ── OpenAI-compatible inference ─────────────────────────────────────────

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  signal?: AbortSignal;
  onDelta?: (partial: string) => void;
}

/**
 * OpenAI-compatible chat completion on the ACTIVE local model. Activates
 * the instant default first when nothing is loaded but cached (seconds —
 * no download), and fails with a clear message when the model is not
 * cached yet (the bootstrap/ask flow owns downloading).
 */
export async function generateChatCompletion(
  messages: ChatCompletionMessage[],
  options: ChatCompletionOptions = {},
): Promise<CloudChatResult> {
  const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
  const modelId = localInferenceEngine.getCurrentModelId();
  if (!localInferenceEngine.isLoaded()) {
    const cached = await hasModelInCache(modelId);
    if (!cached) {
      return {
        content: "",
        error:
          "The on-device model is not cached yet — it is still downloading in the background. Try again shortly or use your cloud key.",
        source: "local",
        modelUsed: modelId,
      };
    }
    const ok = await localInferenceEngine.initialize(undefined, modelId);
    if (!ok || !localInferenceEngine.isLoaded()) {
      return { content: "", error: "Could not activate the on-device model.", source: "local", modelUsed: modelId };
    }
  }
  return localInferenceEngine.generate(messages as CloudChatMessage[], {
    temperature: options.temperature,
    signal: options.signal,
    onDelta: options.onDelta,
  } as CloudChatOptions);
}

/**
 * OpenAI-compatible embeddings for local vector RAG. Loads the arctic
 * embedding engine lazily (second worker), then calls
 * `engine.embeddings.create({ input })`.
 */
export async function generateEmbeddings(
  input: string | string[],
  options: { modelId?: string; onProgress?: (r: InitProgressReport) => void } = {},
): Promise<EmbeddingResponse> {
  const engine = await ensureEmbeddingEngine(options.modelId, options.onProgress);
  const modelId = options.modelId ?? embedEngineModelId!;
  const response = await engine.embeddings.create({ input, model: modelId });
  return {
    data: response.data.map((e) => ({ embedding: e.embedding, index: e.index, object: "embedding" })),
    model: response.model,
    object: "list",
    usage: {
      prompt_tokens: response.usage.prompt_tokens,
      total_tokens: response.usage.total_tokens,
    },
  };
}

/**
 * Switch the active chat model (e.g. to a 3B powerhouse or the coder). For
 * embedding models this re-targets the embedding engine instead. Cached
 * models activate in seconds; uncached ones download first (progress via
 * `onProgress`).
 */
export async function switchActiveModel(
  modelId: string,
  onProgress?: (r: InitProgressReport) => void,
): Promise<boolean> {
  const definition = getLocalModelDefinition(modelId);
  if (!definition) {
    console.warn(`[model-manager] unknown model id: ${modelId}`);
    return false;
  }
  if (definition.modelKind === "embedding") {
    try {
      await ensureEmbeddingEngine(modelId, onProgress);
      return true;
    } catch (error) {
      console.error("[model-manager] embedding engine switch failed:", error);
      return false;
    }
  }
  const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
  if (localInferenceEngine.isLoaded() && localInferenceEngine.getCurrentModelId() === modelId) {
    return true;
  }
  if (localInferenceEngine.isLoaded()) {
    await localInferenceEngine.unload();
  }
  return localInferenceEngine.initialize(onProgress, modelId);
}

// ── Bootstrap (auto pre-cache on first visit) ───────────────────────────

async function patchFromReport(report: InitProgressReport | undefined): Promise<void> {
  await Promise.resolve();
  patch({
    progress: Math.max(0, Math.min(1, report?.progress ?? snapshot.progress)),
    progressText: report?.text || snapshot.progressText,
    timeElapsedSec: typeof report?.timeElapsed === "number" ? report.timeElapsed : snapshot.timeElapsedSec,
  });
}

function scheduleIdle(fn: () => void): void {
  const ric = (typeof window !== "undefined" ? (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback : undefined);
  if (typeof ric === "function") {
    ric(fn, { timeout: 4000 });
  } else {
    setTimeout(fn, 2500);
  }
}

/** Abort a running bootstrap (used by the one-time ask's "Not now"). */
export function abortBootstrap(): void {
  abortRequested = true;
  if (bootstrapStarted) {
    patch({ phase: "idle", progressText: "Background install cancelled.", aborted: true });
  }
}

async function uidDeclined(uid?: string | null): Promise<boolean> {
  if (!uid) return false;
  return getInstallDecision(uid) === "declined";
}

async function hasRoomFor(model: LocalModelDefinition): Promise<boolean> {
  const { availableMB } = await getStorageQuota();
  if (availableMB <= 0) return true; // estimate unsupported — don't block
  return availableMB >= model.approxStorageRequirementMB * 0.9;
}

/**
 * Auto pre-cache of the default tiers:
 *   1. embedding model (immediately — small)
 *   2. instant default chat model (background, via the existing
 *      BackgroundInstall flow so the silent flip / ready event / consent
 *      records stay in one place)
 *
 * Idempotent and resumable: cached shards are skipped by web-llm, an
 * offline browser pauses (`paused-offline`) and a later call resumes.
 */
export async function bootstrapDefaultModels(
  onProgress?: (s: ModelManagerSnapshot) => void,
  uid?: string | null,
): Promise<void> {
  if (bootstrapStarted) return;
  bootstrapStarted = true;
  abortRequested = false;

  const emit = () => onProgress?.(snapshot);

  try {
    const caps = await detectDeviceCapabilities();
    if (!caps.webgpu) {
      patch({
        phase: "unsupported",
        error:
          "This browser has no WebGPU, so models cannot run on-device. Private chat still works via your cloud key.",
      });
      return;
    }
    if (navigator.onLine === false) {
      patch({ phase: "paused-offline", progressText: "Waiting for a connection…" });
      return;
    }
    if (await uidDeclined(uid)) {
      patch({ phase: "idle", progressText: "" });
      return;
    }

    patch({ phase: "bootstrapping", error: null, aborted: false });
    emit();

    // 1 — Embedding model (immediately, it is small and powers vector RAG).
    const plan = bootstrapPlanForDevice(caps.deviceMemoryGB);
    try {
      if (!(await hasModelInCache(plan.embeddingModelId))) {
        if (!(await hasRoomFor(getLocalModelDefinition(plan.embeddingModelId)!))) {
          patch({
            embeddingError:
              "Not enough browser storage free for the embedding model — free up space and retry from the model manager.",
          });
        } else {
          patch({ currentModelId: plan.embeddingModelId, progress: 0, progressText: "Caching embeddings model…" });
          emit();
          await ensureEmbeddingEngine(plan.embeddingModelId, (r) => void patchFromReport(r).then(emit));
        }
      }
    } catch (error) {
      // Embeddings failing must not block the chat model.
      patch({
        embeddingError: error instanceof Error ? error.message : "Embedding model download failed.",
      });
      emit();
    }

    if (abortRequested) return;

    // 2 — Instant default chat model (background; silent flip when done).
    if (!(await hasModelInCache(plan.chatModelId))) {
      if (!(await hasRoomFor(getLocalModelDefinition(plan.chatModelId)!))) {
        patch({
          phase: "failed",
          error:
            "Not enough browser storage free for the chat model. Clear a cached model in the model manager and retry.",
        });
        return;
      }
    }
    const { startBackgroundInstall } = await import("@/offline/BackgroundInstall");
    patch({ currentModelId: plan.chatModelId, progressText: "Downloading the chat model…" });
    emit();
    await startBackgroundInstall(uid ?? undefined);
    if (abortRequested) return;

    // Chat settled — mirror the outcome into the manager snapshot.
    const { getBackgroundInstallSnapshot } = await import("@/offline/BackgroundInstall");
    const bg = getBackgroundInstallSnapshot();
    if (bg.phase === "ready") {
      patch({ phase: "ready", progress: 1, progressText: "Ready", error: null });
    } else if (bg.phase === "failed") {
      patch({ phase: "failed", error: bg.error ?? "Background install failed." });
    } else {
      // downloading/loading (adopted run) or not-started (declined mid-run)
      patch({ phase: "bootstrapping", progressText: bg.progressText || snapshot.progressText });
    }
    emit();
  } catch (error) {
    if (!abortRequested) {
      patch({
        phase: "failed",
        error: error instanceof Error ? error.message : "The background model setup failed.",
      });
      emit();
    }
  } finally {
    bootstrapStarted = false;
  }
}

/** App-boot entry: persistent storage + offline listeners + idle bootstrap. */
export function initModelManager(options: { uid?: string | null; onProgress?: (s: ModelManagerSnapshot) => void } = {}): void {
  const { uid, onProgress } = options;
  if (!initialized) {
    initialized = true;
    void requestPersistentStorage();
    if (!offlineHandlersAttached && typeof window !== "undefined") {
      offlineHandlersAttached = true;
      window.addEventListener("offline", () => {
        if (snapshot.phase === "bootstrapping" || snapshot.phase === "waiting-idle") {
          patch({ phase: "paused-offline", progressText: "Paused — you are offline. Shards resume automatically." });
        }
      });
      window.addEventListener("online", () => {
        if (snapshot.phase === "paused-offline") {
          patch({ phase: "idle" });
          void bootstrapDefaultModels(onProgress, uid); // resume — cached shards skip
        }
      });
    }
  }
  // Fresh sessions (or a resume after being offline) enter the idle queue.
  if (snapshot.phase === "idle") {
    patch({ phase: "waiting-idle", progressText: "Queued…" });
    scheduleIdle(() => {
      if (snapshot.phase === "waiting-idle") {
        void bootstrapDefaultModels(onProgress, uid);
      }
    });
  } else if (snapshot.phase === "paused-offline" && navigator.onLine) {
    void bootstrapDefaultModels(onProgress, uid);
  }
}

/** True once the instant chat model is cached (or the engine is loaded). */
export async function isInstantModelReady(): Promise<boolean> {
  const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
  if (localInferenceEngine.isLoaded()) return true;
  return hasModelInCache(localInferenceEngine.getCurrentModelId());
}

// Test hooks
export function __resetModelManagerForTests(): void {
  listeners.clear();
  snapshot = { ...DEFAULT_SNAPSHOT };
  bootstrapStarted = false;
  abortRequested = false;
  embedEngine = null;
  embedEngineModelId = null;
  embedEngineCreating = null;
  initialized = false;
  offlineHandlersAttached = false;
}
