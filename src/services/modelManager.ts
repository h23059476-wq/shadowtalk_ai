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
import { getInstallDecision, hasDeviceInstallConsent, markDeviceInstallConsent } from "@/offline/BackgroundInstall";
import { buildMirrorAppConfig, isBuiltInMirroredModelId } from "@/offline/modelMirror";
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
  // web-llm caches shards under the URLs of the appConfig used at install
  // time. Models installed through the built-in mirror are keyed by the
  // mirrored URLs — the default-config check misses them, so warm-up / the
  // drawer offered a pointless re-download of an already-cached model.
  try {
    if (await webllmHasModelInCache(modelId)) return true;
  } catch {
    return false;
  }
  if (isBuiltInMirroredModelId(modelId)) {
    try {
      const mirrorConfig = buildMirrorAppConfig();
      if (mirrorConfig && (await webllmHasModelInCache(modelId, mirrorConfig))) return true;
    } catch {
      /* fall through — treated as uncached */
    }
  }
  return false;
}

/** Removes a cached model (unloading it first when it is the active one). */
export async function deleteCachedModel(modelId: string): Promise<void> {
  const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
  if (localInferenceEngine.getCurrentModelId() === modelId && localInferenceEngine.isLoaded()) {
    await localInferenceEngine.unload();
  }
  if (embedEngineModelId === modelId) await unloadEmbeddingEngine();
  // Delete under BOTH configs when the model may exist under mirrored URLs:
  // "Clear" previously left ~600MB+ of orphaned mirror shards behind and the
  // drawer kept offering a re-download. A delete against URLs that are not
  // in the cache is a no-op (cache misses never throw), so trying both is
  // always safe and always complete.
  const configs: Array<Parameters<typeof deleteModelAllInfoInCache>[1]> = [undefined];
  if (isBuiltInMirroredModelId(modelId)) configs.push(buildMirrorAppConfig() ?? undefined);
  let lastError: unknown = null;
  let deletedAny = false;
  for (const cfg of configs) {
    try {
      await deleteModelAllInfoInCache(modelId, cfg);
      deletedAny = true;
    } catch (error) {
      lastError = error;
      console.warn(`[model-manager] could not delete cache for ${modelId}:`, error);
    }
  }
  if (!deletedAny && lastError) throw lastError;
}

// ── Embedding engine (second worker, lazy) ──────────────────────────────

// The bootstrap awaits the embedding engine BEFORE the chat step, so a
// stalled embedding download previously hung the whole bootstrap in
// "bootstrapping" forever — the model-manager chip spun "Caching models…"
// indefinitely while the chat install's failure pill was already showing
// (two contradictory truths on screen). Watchdog mirrors
// LocalInferenceEngine.createEngine: no progress for 45s, or 150s total,
// fails the step; bootstrapDefaultModels catches, records embeddingError,
// and proceeds to the chat model.
const EMBEDDING_INIT_IDLE_TIMEOUT_MS = 45_000;
const EMBEDDING_INIT_HARD_TIMEOUT_MS = 150_000;

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
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let fail: ((reason: Error) => void) | null = null;
    const stallPromise = new Promise<never>((_, reject) => {
      fail = (reason) => {
        // A terminated worker makes the in-flight create reject shortly after.
        try {
          worker.terminate();
        } catch {
          /* already dead */
        }
        reject(reason);
      };
    });
    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        fail?.(new Error(
          `The embeddings model download stalled — no progress for ${Math.round(EMBEDDING_INIT_IDLE_TIMEOUT_MS / 1000)}s.`,
        ));
      }, EMBEDDING_INIT_IDLE_TIMEOUT_MS);
    };
    hardTimer = setTimeout(() => {
      fail?.(new Error("The embeddings model setup took too long and was stopped."));
    }, EMBEDDING_INIT_HARD_TIMEOUT_MS);
    armIdle();
    const createPromise = Create(worker, resolved, {
      initProgressCallback: (report) => {
        armIdle();
        onProgress?.(report);
      },
      // No context_window_size override — embedding models ship their own
      // (arctic: 512). No appConfig override — embeddings always load from
      // the primary CDN (the self-hosted mirror only hosts chat twins).
    });
    // After a watchdog terminate the create promise may reject (dead worker)
    // or pend forever — neither may surface as an unhandled rejection.
    createPromise.catch(() => {});
    try {
      const engine = (await Promise.race([createPromise, stallPromise])) as WebWorkerMLCEngine;
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
      if (idleTimer) clearTimeout(idleTimer);
      if (hardTimer) clearTimeout(hardTimer);
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
 * Tier-1 fallback: run the request on the HF transformers worker (Qwen2.5
 * 0.5B/1.5B q4) when the web-llm engine cannot serve it — WebGPU missing,
 * model not cached, or activation failed. Only engages when an HF chat
 * model is ALREADY cached (installs are explicit Offline Model Manager
 * actions — no surprise multi-hundred-MB downloads mid-chat).
 */
async function tryHfChatFallback(
  messages: ChatCompletionMessage[],
  options: ChatCompletionOptions,
): Promise<CloudChatResult | null> {
  try {
    const [{ getLocalInferenceClient, HF_CHAT_MODEL_SMALL, HF_CHAT_MODEL_MEDIUM }, { getHfCacheInventory }] =
      await Promise.all([
        import("@/lib/localInference/localEngineClient"),
        import("@/lib/localInference/hfCacheManager"),
      ]);
    const inventory = await getHfCacheInventory();
    const pick =
      inventory.models.find((m) => m.repoId === HF_CHAT_MODEL_SMALL.repoId && m.hasWeights)
        ? HF_CHAT_MODEL_SMALL
        : inventory.models.find((m) => m.repoId === HF_CHAT_MODEL_MEDIUM.repoId && m.hasWeights)
          ? HF_CHAT_MODEL_MEDIUM
          : null;
    if (!pick) return null;
    const client = getLocalInferenceClient();
    const result = await client.chat(
      messages.map((m) => ({ role: m.role, content: m.content })),
      {
        model: pick,
        temperature: options.temperature,
        onDelta: (delta) => options.onDelta?.(delta),
        signal: options.signal,
      },
    );
    return { content: result.text, source: "local", modelUsed: result.model };
  } catch (error) {
    console.warn("[model-manager] Tier-1 HF chat fallback failed:", error);
    return {
      content: "",
      error:
        error instanceof Error
          ? `The on-device fallback model could not run: ${error.message}`
          : "The on-device fallback model could not run.",
      source: "local",
      modelUsed: "hf-fallback",
    };
  }
}

/**
 * OpenAI-compatible chat completion on the ACTIVE local model. Activates
 * the instant default first when nothing is loaded but cached (seconds —
 * no download), and fails with a clear message when the model is not
 * cached yet (the bootstrap/ask flow owns downloading). When the web-llm
 * path cannot serve the request, the Tier-1 HF worker (WASM-capable) takes
 * over — that is the only chat path on WebGPU-less devices.
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
      const fallback = await tryHfChatFallback(messages, options);
      if (fallback) return fallback;
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
      // Carry the engine's real failure reason (WebGPU missing, watchdog, …)
      // into the honest-guidance path instead of a bare activation failure.
      const reason = localInferenceEngine.getLastError();
      const fallback = await tryHfChatFallback(messages, options);
      if (fallback && !fallback.error) return fallback;
      return {
        content: "",
        error: `Could not activate the on-device model.${reason ? ` ${reason}` : ""}${
          !fallback ? " On WebGPU-less devices, install the WASM chat model from Settings → Offline AI → Offline Model Manager." : ""
        }`,
        source: "local",
        modelUsed: modelId,
      };
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
  // Both callers (model-manager drawer, chat-header model switcher) are
  // explicit user installs — latch device consent so the bootstrap may
  // pre-cache tiers and resume these shards later.
  markDeviceInstallConsent();
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
          "This browser has no WebGPU, so the standard on-device models cannot run. Private chat still works via your cloud key — or install the small CPU (WASM) chat model from Settings → Offline AI → Offline Model Manager.",
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
    // Consent gate — nothing multi-hundred-MB downloads without an explicit
    // opt-in. The one-time ask banner is signed-in-only, so before this gate
    // a first-time GUEST (and even a signed-in user who had not answered the
    // ask yet) silently downloaded the ~880MB starter + 64MB embeddings in
    // the background. Every install surface (banner accept, onboarding
    // wizard, ZeroSetupCard, model-manager download) latches the device
    // consent flag; only after that does the bootstrap pre-cache tiers.
    if (!hasDeviceInstallConsent()) {
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

/**
 * The id of any local chat model whose weights are FULLY cached (default or
 * mirror URLs), smallest tier first — or null when nothing is cached.
 *
 * Warm-ups used to check only the device-tier pick: a user who installed the
 * Nano tier (or whose tier pick drifted between loads) reloaded OFFLINE to
 * "model install failed" while a perfectly usable cached model sat on disk.
 * Every warm-up path goes through this discovery so the engine loads the
 * model that actually exists on the device.
 */
export async function findCachedLocalModelId(): Promise<string | null> {
  const { LOCAL_MODEL_TIERS } = await import("@/ai/ModelRegistry");
  const tiers = [...LOCAL_MODEL_TIERS].sort(
    (a, b) => a.approxStorageRequirementMB - b.approxStorageRequirementMB,
  );
  for (const tier of tiers) {
    // Both quantizations count: on adapters without shader-f16 the engine
    // installs the q4f32 TWIN (fallbackModelId), so the primary id scans
    // empty while a fully usable twin sits in cache. Prefer the primary
    // when both are cached; the twin loads fine everywhere.
    const ids = tier.fallbackModelId && tier.fallbackModelId !== tier.id
      ? [tier.id, tier.fallbackModelId]
      : [tier.id];
    for (const id of ids) {
      try {
        if (await hasModelInCache(id)) return id;
      } catch {
        /* cache API unavailable — keep scanning */
      }
    }
  }
  return null;
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
