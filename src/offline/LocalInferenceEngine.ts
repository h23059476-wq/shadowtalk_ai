import { CreateWebWorkerMLCEngine, WebWorkerMLCEngine, deleteModelAllInfoInCache, hasModelInCache, prebuiltAppConfig, type InitProgressCallback, type InitProgressReport, type MLCEngineConfig } from "@mlc-ai/web-llm";
import { DEFAULT_LOCAL_MODEL, getLocalModelDefinition, pickLocalModelForDevice, type LocalModelDefinition } from "@/ai/ModelRegistry";
import { CloudChatMessage, CloudChatOptions, CloudChatResult, LOCAL_OUTPUT_TOKEN_RESERVE } from "@/lib/cloudChat";
import { withNetworkTimeout } from "@/lib/offlineGuards";
import { DeviceCapability } from "@/offline/DeviceCapability";
import { buildMirrorAppConfig, isBuiltInMirroredModelId, isMirrorEligibleError } from "@/offline/modelMirror";

/**
 * Batch 4 — LocalInferenceEngine state machine.
 *
 * Exposes the engine's lifecycle state so the UI can render accurate status
 * (idle / downloading / loading / ready / generating / error / offline) and
 * subscribe to transitions, replacing the 1s polling that LocalModelStatus
 * used previously. The state machine is additive — existing methods
 * (initialize / isLoaded / generate / unload) keep their signatures.
 *
 * State transitions:
 *   idle      → downloading  (initialize() starts)
 *   downloading → loading     (web-llm reports model-load progress)
 *   loading   → ready        (engine created successfully)
 *   downloading|loading → error (initialize() throws)
 *   ready     → generating   (generate() starts)
 *   generating → ready       (generate() finishes — success or aborted)
 *   generating → error       (generate() throws)
 *   *         → idle         (unload())
 */
export type LocalEngineState =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "generating"
  | "error"
  | "offline";

// ── Never-fail watchdogs ───────────────────────────────────────────────────
// Engine init: web-llm reports progress through the download AND the shader
// compile. A silent gap means the install wedged (stalled CDN socket, hung
// GPU compile) — previously nothing bounded this, so initialize() could hang
// forever and every prefer-local message silently fell back to cloud.
const INIT_IDLE_TIMEOUT_MS = 45_000;

/**
 * Actionable guidance appended to GPU-shaped init failures. The engine used
 * to swallow the real reason (web-llm's "Unable to find a compatible GPU…")
 * behind a generic "Failed to initialize local AI engine.", leaving users on
 * GPU-less setups in a Try-Again loop that could never succeed.
 */
function friendlyInitError(raw: string): string {
  const trimmed = (raw || "").trim();
  if (/unable to find a compatible gpu|no webgpu|webgpu.*(not|un)support/i.test(trimmed)) {
    return `${trimmed} — Local AI needs WebGPU: in Chrome/Edge enable Settings → System → "Use hardware acceleration when available", reload, and check chrome://gpu or https://webgpureport.org/ to confirm it is active.`;
  }
  return trimmed;
}

// Generation: on a 1B model tokens stream at 20-60/s, so a 30s tokenless gap
// means the worker hung (WebGPU device lost mid-run) — not "thinking". The
// hard cap bounds a pathologically slow device: past it the partial reply is
// returned instead of spinning forever.
const GENERATION_IDLE_TIMEOUT_MS = 30_000;
const GENERATION_HARD_TIMEOUT_MS = 120_000;
// Whole recovery ladder budget (retry → re-init → retry) — guarantees the
// caller can never wait more than ~3 minutes even in the worst cascade.
const GENERATION_LADDER_DEADLINE_MS = 180_000;

// ── One engine per device: Web Locks tab guard ────────────────────────────
// Two tabs each spawning a WebGPU engine is the classic weak-GPU killer: 2×
// device memory → device-lost on BOTH tabs → the whole offline story
// collapses at once, usually mid-conversation. A device-scoped Web Lock
// makes the second tab stand down cleanly (bounded, honest, cloud/honest
// guidance) instead of corrupting the first tab's engine. Locks are
// document-scoped and auto-release when the owning tab closes, so no
// coordinator process is needed. Browsers without the API behave as before.
const ENGINE_LOCK_NAME = "shadowtalk-local-engine.v1";
// Escape hatch if the lock manager itself wedges — never let the guard
// become the hang it exists to prevent.
const ENGINE_LOCK_DECISION_TIMEOUT_MS = 2_000;

interface LockManagerLike {
  request?: (
    name: string,
    options: { ifAvailable?: boolean },
    callback: (lock: unknown) => Promise<void> | void,
  ) => Promise<void | null>;
}

// ── Corrupt-cache self-healing ───────────────────────────────────────────
// A cache shard truncated by a browser crash (or an eviction bug) used to
// brick private AI permanently: init throws a data-shaped error — never
// network-shaped, so the mirror retry skipped it — and every later attempt
// failed against the same poisoned bytes until the user manually cleared
// the cache. When init fails with a data-shaped error and the model IS in
// cache, wipe that model's cache entries (under both the default and the
// mirror config) and give init one fresh chance. GPU-shaped errors (device
// lost, out of memory, shader compile) must NOT trigger a wipe — re-
// downloading 600MB cannot fix a driver.
const DATA_CORRUPT_ERROR_RE =
  /parse|syntax|unexpected token|unexpected end|json|utf-8|utf8|decode|corrupt|truncat|webassembly|wasm/i;

// ── Cache-repair sweep (streamed-cache-write failure class) ─────────────
// A whole class of devices cannot install the model at all: their Cache API
// errors out with "Cache.add()/put() encountered a network error" on larger
// files while the very same URL streams fine through plain fetch (seen on
// certain Chromium storage backends, proxied/captive networks, and Android
// WebView builds — web-llm always uses the streamed cache path, so for those
// devices the install NEVER succeeds and offline mode never ships). The
// repair sweep sidesteps it: fetch each missing model file with plain fetch
// (the path that works), buffer it in memory, and store a Blob response —
// then retry init, whose cache hits now skip the broken write path entirely.
// Fully bounded: per-file best-effort (network down ⇒ sweep makes no progress
// ⇒ the honest init error still surfaces) and a wall-clock deadline caps the
// whole sweep so initialize() can never hang on a slow link.
const CACHE_WRITE_NETWORK_ERROR_RE = /encountered a network error|cache\.(add|put)\(\)/i;
const CACHE_REPAIR_DEADLINE_MS = 300_000;

/** web-llm routes model files into three cache buckets by filename. */
function webllmCacheNameFor(filename: string): string {
  if (filename === "mlc-chat-config.json") return "webllm/config";
  if (filename.endsWith(".wasm")) return "webllm/wasm";
  return "webllm/model";
}

/**
 * Normalize a ModelRecord.model URL exactly the way web-llm does internally
 * (its cleanModelUrl): guarantee a trailing slash and, for Hugging Face-style
 * URLs, the "/resolve/<rev>/" infix. web-llm 0.2.x stores the record RAW
 * ("https://huggingface.co/mlc-ai/<id>" — no /resolve/main/) and only
 * normalizes at fetch time, so building cache keys or repair URLs from the
 * raw record produced garbage ("...<id>tensor-cache.json" → 404 → CORS block
 * → the sweep "repaired" nothing and every install died on both CDNs).
 * Every external URL-building site MUST go through this helper so the keys
 * match what web-llm itself fetches and caches.
 */
export function cleanModelBaseUrl(modelUrl: string): string {
  let url = modelUrl + (modelUrl.endsWith("/") ? "" : "/");
  if (!url.match(/.+\/resolve\/.+\//)) url += "resolve/main/";
  try {
    return new URL(url).href;
  } catch {
    return url; // relative/odd shapes — keep the string form
  }
}

export interface LocalEngineConfig {
  contextWindowSize?: number;
  /** Silence watchdog for initialize(): no progress for this long → fail (and retry via the mirror when eligible). */
  initIdleTimeoutMs?: number;
}

export class LocalInferenceEngine {
  private engine: WebWorkerMLCEngine | null = null;
  private isInitializing = false;
  private isReady = false;
  /** Model actually loaded into the engine (tier-picked or user-selected). */
  private currentModelId: string = DEFAULT_LOCAL_MODEL.id;
  /** Why the last initialize() failed — surfaced by the UI instead of a generic message. */
  private lastError: string | null = null;

  // Batch 4: state machine
  private state: LocalEngineState = "idle";
  private listeners = new Set<(s: LocalEngineState) => void>();

  /** In-flight initialize() — concurrent callers adopt it instead of racing a second engine against the same GPU. */
  private initPromise: Promise<boolean> | null = null;
  /** Model id requested by the in-flight initialize() (null = tier pick) — adoption never crosses models. */
  private initModelId: string | null = null;
  /** Release handle for the device engine lock (null = this document holds no lock). */
  private engineLockRelease: (() => void) | null = null;

  /**
   * Try to take the device-wide engine lock without blocking. Returns true
   * when this document may spawn the engine (lock taken, already held here,
   * or the Web Locks API is unavailable); false when another tab owns the
   * GPU — the caller must NOT spawn a second engine.
   */
  private async acquireEngineLock(): Promise<boolean> {
    if (this.engineLockRelease) return true; // this document already holds it
    const locks = (navigator as unknown as { locks?: LockManagerLike } | undefined)?.locks;
    if (!locks?.request) return true; // API unavailable — legacy single-tab behavior
    try {
      const decision = new Promise<boolean>((resolve) => {
        let holdResolve: (() => void) | null = null;
        const hold = new Promise<void>((r) => { holdResolve = r; });
        locks.request!(ENGINE_LOCK_NAME, { ifAvailable: true }, (lock: unknown) => {
          if (!lock) {
            resolve(false);
            return;
          }
          this.engineLockRelease = () => {
            this.engineLockRelease = null;
            try { holdResolve?.(); } catch { /* already released */ }
          };
          resolve(true);
          return hold; // keep holding until releaseEngineLock()
        }).catch(() => {
          // Lock API hiccup — degrade to legacy behavior, never block.
          if (!this.engineLockRelease) resolve(true);
        });
      });
      let decisionTimeout: ReturnType<typeof setTimeout> | null = null;
      const verdict = await Promise.race([
        decision,
        new Promise<boolean>((r) => {
          decisionTimeout = setTimeout(() => r(true), ENGINE_LOCK_DECISION_TIMEOUT_MS);
        }),
      ]);
      if (decisionTimeout) clearTimeout(decisionTimeout);
      return verdict;
    } catch {
      return true; // never fail the engine because of the lock
    }
  }

  /** Release the device engine lock (no-op when not held). */
  private releaseEngineLock(): void {
    const release = this.engineLockRelease;
    this.engineLockRelease = null;
    try { release?.(); } catch { /* already released */ }
  }

  /** Whether the model sits in cache under the default or the mirror config. */
  private async anyCacheForModel(modelId: string): Promise<boolean> {
    try { if (await hasModelInCache(modelId)) return true; } catch { /* fall through */ }
    if (isBuiltInMirroredModelId(modelId)) {
      const cfg = buildMirrorAppConfig();
      if (cfg) {
        try { if (await hasModelInCache(modelId, cfg)) return true; } catch { /* fall through */ }
      }
    }
    return false;
  }

  /** Best-effort wipe of a model's cache entries under every known config. */
  private async wipeModelCache(modelId: string): Promise<void> {
    const configs: Array<Parameters<typeof deleteModelAllInfoInCache>[1]> = [undefined];
    if (isBuiltInMirroredModelId(modelId)) {
      const cfg = buildMirrorAppConfig();
      if (cfg) configs.push(cfg);
    }
    for (const cfg of configs) {
      try { await deleteModelAllInfoInCache(modelId, cfg); } catch { /* best-effort */ }
    }
  }

  /**
   * Cache-repair sweep: pre-populate web-llm's caches for `modelId` under the
   * URL base of the FAILED attempt (mirror URLs when the mirror run was the
   * one that died, default CDN URLs otherwise). Plain fetch + buffered Blob
   * put works on devices where the cache writer's own streamed fetch errors.
   * Returns how many files were repaired (0 = nothing done — offline, cache
   * API unavailable, or nothing fetched). Bounded by CACHE_REPAIR_DEADLINE_MS.
   */
  private async repairModelCache(modelId: string, useMirror: boolean): Promise<number> {
    if (typeof caches === "undefined") return 0;
    const record = (useMirror ? buildMirrorAppConfig() ?? prebuiltAppConfig : prebuiltAppConfig)
      .model_list.find((r) => r.model_id === modelId);
    if (!record) return 0;
    // web-llm fetches/caches everything under cleanModelUrl(record.model) —
    // the raw record for the default HF CDN lacks the /resolve/main/ infix,
    // and keys built from it never match what the engine reads back.
    const base = cleanModelBaseUrl(record.model);
    const files = ["mlc-chat-config.json", "tokenizer.json", "tokenizer_config.json", "tensor-cache.json"];
    try {
      const tcCache = await caches.open("webllm/model");
      const tcResp = (await tcCache.match(base + "tensor-cache.json")) ?? (await fetch(base + "tensor-cache.json"));
      if (tcResp?.ok) {
        const tc = await tcResp.json();
        for (const rec of tc?.records ?? []) {
          if (typeof rec?.dataPath === "string" && rec.dataPath) files.push(rec.dataPath);
        }
      }
    } catch { /* repair the file list we know — init retry surfaces the rest */ }
    // The model_lib WASM rides its own URL (third-party repo or our mirror) —
    // repair it too when missing.
    if (record.model_lib) files.push(record.model_lib);
    const deadline = Date.now() + CACHE_REPAIR_DEADLINE_MS;
    let repaired = 0;
    for (const file of files) {
      if (Date.now() >= deadline) break;
      const url = file.endsWith(".wasm") ? (record.model_lib ?? "") : base + file;
      if (!url) continue;
      try {
        const bucket = await caches.open(webllmCacheNameFor(file));
        if (await bucket.match(url)) continue; // already present — skip
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const buf = await resp.arrayBuffer(); // buffered — avoids the streamed put path
        await bucket.put(
          new Request(url),
          new Response(new Blob([buf]), {
            status: 200,
            statusText: "OK",
            headers: { "content-type": resp.headers.get("content-type") ?? "application/octet-stream" },
          }),
        );
        repaired += 1;
      } catch {
        // Network down or single file failed — keep going; the post-sweep
        // init retry reports the honest error when the engine still can't load.
      }
    }
    return repaired;
  }

  /** Current engine state. */
  getState(): LocalEngineState {
    return this.state;
  }

  /** Why the last initialize() attempt failed (null while healthy/loaded). */
  getLastError(): string | null {
    return this.lastError;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: (s: LocalEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private setState(next: LocalEngineState) {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }

  /**
   * Build the WebWorkerMLC engine for one model, under a no-progress
   * watchdog. Isolated so the mirror retry gets a pristine worker (a failed
   * Create can leave the old one wedged) and can inject the mirrored
   * appConfig.
   *
   * The watchdog terminates the worker when initialization stops reporting
   * progress — a stalled download socket or a hung GPU compile previously
   * left the promise pending forever, wedging the engine in
   * downloading/loading for the whole session. The thrown error is phrased
   * so isMirrorEligibleError() treats it as network-shaped (mirror retry
   * applies).
   */
  private async createEngine(
    model: LocalModelDefinition,
    contextWindowSize: number,
    progressCb: InitProgressCallback,
    useMirror: boolean,
    idleTimeoutMs: number = INIT_IDLE_TIMEOUT_MS,
  ): Promise<WebWorkerMLCEngine> {
    const worker = new Worker(new URL('../workers/webllm.worker.ts', import.meta.url), { type: 'module' });
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
    let fireWatchdog: (() => void) | null = null;
    const watchdogPromise = new Promise<never>((_, reject) => {
      fireWatchdog = () => {
        reject(new Error(
          `The model install timed out — no progress for ${Math.round(idleTimeoutMs / 1000)}s. ` +
          "Check the connection and retry from Settings → Offline AI.",
        ));
      };
    });
    const arm = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        watchdogTimer = null;
        try { worker.terminate(); } catch { /* already dead */ }
        fireWatchdog?.();
      }, idleTimeoutMs);
    };
    // Reset the watchdog on every progress report — a healthy download or
    // compile keeps pushing reports, so only a genuine stall fires it.
    const watchedCb: InitProgressCallback = (report) => {
      arm();
      progressCb(report);
    };
    const engineConfigs: MLCEngineConfig = { initProgressCallback: watchedCb };
    if (useMirror) {
      const mirrorAppConfig = buildMirrorAppConfig();
      if (mirrorAppConfig) engineConfigs.appConfig = mirrorAppConfig;
    }
    arm();
    const createPromise = CreateWebWorkerMLCEngine(
      worker,
      model.id,
      engineConfigs,
      // web-llm ChatOptions — snake_case ChatConfig overrides. The context
      // window cap lands here; engine-level config stays in createEngine.
      { context_window_size: contextWindowSize },
    );
    // After a watchdog terminate the create promise may reject (dead worker)
    // or pend forever — neither may surface as an unhandled rejection.
    createPromise.catch(() => {});
    try {
      return await Promise.race([createPromise, watchdogPromise]);
    } catch (error) {
      // The worker is unusable after a failed create — free it before the
      // caller decides whether to retry on the mirror.
      try { worker.terminate(); } catch { /* already dead */ }
      throw error;
    } finally {
      if (watchdogTimer) clearTimeout(watchdogTimer);
    }
  }

  async initialize(
    onProgress?: (progress: InitProgressReport) => void,
    /** Optional explicit model id; defaults to the device-tier pick. */
    modelId?: string,
    /** Optional engine config overrides (contextWindowSize, watchdog). */
    engineConfig?: LocalEngineConfig,
  ): Promise<boolean> {
    if (this.isReady) {
      this.setState("ready");
      return true;
    }
    while (this.initPromise) {
      // Dedupe concurrent starts (mount prewarm + background install + a
      // message-triggered prewarm): adopt the in-flight run instead of
      // spawning a second engine against the same GPU.
      if (!modelId || modelId === this.initModelId) return this.initPromise;
      // NEVER adopt across models: switchActiveModel("3B") while the
      // bootstrap's 1B init is in flight would otherwise report "Model
      // activated." while the wrong model loads. Let the in-flight run
      // settle (watchdog-bounded, so this cannot hang), then take the slot.
      try {
        await this.initPromise;
      } catch {
        /* failed init — the slot clears in its finally */
      }
    }
    const promise = this.runInitialize(onProgress, modelId, engineConfig);
    this.initModelId = modelId ?? null;
    const wrapped = promise.finally(() => {
      this.initPromise = null;
      this.initModelId = null;
    });
    this.initPromise = wrapped;
    return wrapped;
  }

  /**
   * Bring the engine up for the next message without any UI: no-op when
   * already loaded (or loading), otherwise initializes with the default
   * device-tier model. Weights are already cached after the one-time
   * install, so this costs seconds of worker-spawn + shader compile — what
   * makes the FIRST chat message of a session run on-device instead of
   * silently falling back to cloud while the engine sits idle.
   */
  async prewarm(): Promise<boolean> {
    if (this.isReady) {
      this.setState("ready");
      return true;
    }
    return this.initialize();
  }

  private async runInitialize(
    onProgress?: (progress: InitProgressReport) => void,
    modelId?: string,
    engineConfig?: LocalEngineConfig,
  ): Promise<boolean> {
    this.isInitializing = true;
    this.setState("downloading");
    this.lastError = null;
    let sawModelLoadStart = false;
    // Resolve the model: explicit id when valid, else the device-tier pick.
    const requested = modelId ? getLocalModelDefinition(modelId) : undefined;
    let model = requested ?? pickLocalModelForDevice(
      typeof navigator !== "undefined" ? (navigator as any).deviceMemory : undefined,
      typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    );
    // fp16 weights need the shader-f16 GPU feature — swap to the q4f32 twin
    // when the adapter lacks it (software adapters, older drivers).
    if (model.fallbackModelId && !(await DeviceCapability.supportsShaderF16())) {
      const twin = getLocalModelDefinition(model.fallbackModelId);
      if (twin) {
        console.info(`[local-engine] shader-f16 unavailable — falling back to ${twin.id}`);
        model = twin;
      }
    }
    this.currentModelId = model.id;
    // KV-cache cap: the 0.5B–3B local models can't fit a 4k context on weak
    // GPUs (device-lost errors under memory pressure). 2k tokens covers
    // everyday private chat and roughly halves KV memory.
    const resolvedEngineConfig: LocalEngineConfig = {
      contextWindowSize: 2048,
      initIdleTimeoutMs: INIT_IDLE_TIMEOUT_MS,
      ...engineConfig,
    };
    const progressCb: InitProgressCallback = (report) => {
      // web-llm emits progress through both the download and the model
      // load. The progress text changes from "Fetching..." to
      // "Loading..." once weights arrive; use that as the signal to
      // move from `downloading` to `loading`.
      const text = (report?.text || "").toLowerCase();
      if (!sawModelLoadStart && (text.includes("loading") || text.includes("initializing"))) {
        sawModelLoadStart = true;
        this.setState("loading");
      }
      onProgress?.(report);
    };
    try {
      // No WebGPU API at all — fail fast with the fix instead of spawning a
      // worker doomed to throw. (The worker's adapter ladder can rescue
      // software/low-power adapters; nothing can rescue a missing API.)
      if (typeof navigator !== "undefined" && !("gpu" in navigator)) {
        this.lastError =
          "This browser does not expose WebGPU, which local AI requires. " +
          "Use Chrome or Edge, keep Settings → System → “Use hardware acceleration when available” enabled, " +
          "then reload and verify at chrome://gpu.";
        console.warn("[local-engine] navigator.gpu is missing — failing fast with guidance");
        this.setState("error");
        return false;
      }
      // One engine per device — a second tab must not fight this one for
      // the GPU (weak devices lose BOTH engines to device-lost otherwise).
      const lockTaken = await this.acquireEngineLock();
      if (!lockTaken) {
        console.info("[local-engine] the engine is already owned by another tab — standing down here");
        this.lastError = "The local engine is already running in another tab — close it or use that tab.";
        this.setState("idle");
        return false;
      }
      // OFFLINE with an incomplete cache: a download can make zero progress,
      // and web-llm's internal fetch-retry loop keeps emitting progress
      // reports while it churns, which starves the 45s idle watchdog — the
      // init pends forever (seen live: the mirror retry sat through a whole
      // 200s turn with no failure). Fail fast; routing lands its honest
      // guidance immediately instead of waiting on a doomed download.
      const offlineNow = typeof navigator !== "undefined" && navigator.onLine === false;
      if (offlineNow && !(await this.anyCacheForModel(model.id).catch(() => false))) {
        console.info(`[local-engine] offline and ${model.id} is not fully cached — skipping the doomed download`);
        this.lastError = "You are offline and this model is not fully downloaded yet — reconnect and let the install finish.";
        this.releaseEngineLock();
        this.setState("error");
        return false;
      }
      this.engine = await this.createEngine(model, resolvedEngineConfig.contextWindowSize!, progressCb, false, resolvedEngineConfig.initIdleTimeoutMs);
      this.isReady = true;
      this.setState("ready");
      return true;
    } catch (error) {
      // Mirror retry: a Hugging Face CDN hiccup should never brick private AI.
      // One attempt against the self-hosted mirror (when configured) for
      // network-shaped failures; GPU/device errors are not worth a retry.
      let lastError: unknown = error;
      let lastUseMirror = false;
      if (isMirrorEligibleError(error) && buildMirrorAppConfig()) {
        console.info("[local-engine] primary download failed — retrying from the configured mirror");
        try {
          this.engine = await this.createEngine(model, resolvedEngineConfig.contextWindowSize!, progressCb, true, resolvedEngineConfig.initIdleTimeoutMs);
          this.isReady = true;
          this.setState("ready");
          return true;
        } catch (mirrorError) {
          console.error("Mirror download also failed:", mirrorError);
          lastError = mirrorError;
          lastUseMirror = true;
        }
      }
      const message =
        lastError instanceof Error
          ? lastError.message
          : typeof lastError === "string"
            ? lastError
            : "";
      // Cache-repair sweep: devices whose Cache API errors on streamed large
      // writes ("Cache.add() encountered a network error" while plain fetch
      // streams the same URL fine) can never install through web-llm's own
      // path — fetch + buffer + put the missing files ourselves, then retry.
      if (message && CACHE_WRITE_NETWORK_ERROR_RE.test(message)) {
        const repaired = await this.repairModelCache(model.id, lastUseMirror).catch(() => 0);
        if (repaired > 0) {
          console.info(`[local-engine] cache-repair sweep stored ${repaired} file(s) — retrying init`);
          try {
            this.engine = await this.createEngine(model, resolvedEngineConfig.contextWindowSize!, progressCb, lastUseMirror, resolvedEngineConfig.initIdleTimeoutMs);
            this.isReady = true;
            this.setState("ready");
            return true;
          } catch (repairRetryError) {
            console.error("Post-repair init also failed:", repairRetryError);
          }
        }
      }
      // Corrupt-cache self-healing: data-shaped failures against an existing
      // cache get ONE wipe-and-retry (bounded — never a download loop).
      if (
        message &&
        DATA_CORRUPT_ERROR_RE.test(message) &&
        (await this.anyCacheForModel(model.id).catch(() => false))
      ) {
        console.warn(`[local-engine] init failed with a data-shaped error — clearing the possibly-corrupt cache for ${model.id} and retrying once`);
        await this.wipeModelCache(model.id);
        try {
          this.engine = await this.createEngine(model, resolvedEngineConfig.contextWindowSize!, progressCb, false, resolvedEngineConfig.initIdleTimeoutMs);
          this.isReady = true;
          this.setState("ready");
          return true;
        } catch (recoveryError) {
          console.error("Cache-cleared retry also failed:", recoveryError);
        }
      }
      console.error("Failed to initialize WebLLM engine:", error);
      this.lastError = friendlyInitError(
        lastError instanceof Error
          ? lastError.message
          : typeof lastError === "string"
            ? lastError
            : String(lastError || "Unknown init failure."),
      );
      // The engine never came up — free the device slot for another tab.
      this.releaseEngineLock();
      this.setState("error");
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  isLoaded(): boolean {
    return this.isReady;
  }

  /** Model id currently loaded (or selected for the next initialize). */
  getCurrentModelId(): string {
    return this.currentModelId;
  }

  /**
   * Resolve when the engine reaches `ready`, or bail out on terminal
   * failure / timeout. Used by callers that kicked off a prewarm (page
   * mount, background install) and want the CURRENT message to stay
   * on-device instead of bouncing to cloud while the engine compiles.
   * Strictly bounded — the wait can never outlive `timeoutMs`.
   */
  async waitForReady(timeoutMs: number = 25_000, outer?: AbortSignal): Promise<boolean> {
    if (this.isReady) return true;
    if (this.state === "error") return false; // dead engine — don't wait
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        unsub();
        if (outer) outer.removeEventListener("abort", onAbort);
        resolve(ok);
      };
      const unsub = this.subscribe((s) => {
        if (s === "ready") finish(true);
        else if (s === "error" || s === "idle") finish(false);
      });
      const onAbort = () => finish(false);
      if (outer) {
        if (outer.aborted) { finish(false); return; }
        outer.addEventListener("abort", onAbort, { once: true });
      }
      timer = setTimeout(() => finish(false), timeoutMs);
    });
  }

  async generate(messages: CloudChatMessage[], options?: CloudChatOptions): Promise<CloudChatResult> {
    if (!this.engine || !this.isReady) {
      return { content: "", error: "Local engine not ready.", source: "local", modelUsed: this.currentModelId };
    }
    console.info(`[local-engine] generate: start state=${this.state} model=${this.currentModelId}`);

    // Pile-on guard: a previous generate that is still wedged in
    // "generating" (hung worker, deadline-raced turn) would make every new
    // message queue behind it or fail in parallel. Interrupt it and give it
    // a bounded moment to unwind before this attempt starts.
    if (this.state === "generating") {
      console.info("[local-engine] a previous generation is still in flight — interrupting before the new attempt");
      await this.safeInterrupt();
      await new Promise((r) => setTimeout(r, 300));
    }

    this.setState("generating");
    try {
      // The ladder below is bounded in spirit (idle/hard caps per attempt)
      // but a wedged re-init inside it can still overrun — the whole ladder
      // races GENERATION_LADDER_DEADLINE_MS so generate() can NEVER pend
      // past its own budget (the live drill watched it sit past the 200s
      // routing deadline while the engine stayed wedged in "generating").
      const ladderPromise = (async () => {
        let attempt = await this.attemptGenerate(messages, options);
        const callerAborted = () => options?.signal?.aborted === true;
        const ladderDeadline = Date.now() + GENERATION_LADDER_DEADLINE_MS;

        // Never-fail ladder. Caller aborts never retry.
        //   1. Immediate retry after interruptGenerate — clears a wedged or
        //      still-generating stream (the previous message's stop sometimes
        //      leaves the worker busy; the retry then queues behind it).
        //   2. Full engine re-init (WebGPU device lost mid-run) + one last
        //      attempt — weights are cached, so this costs seconds.
        if (attempt.result.error && attempt.retryable && !callerAborted() && Date.now() < ladderDeadline) {
          await this.safeInterrupt();
          attempt = await this.attemptGenerate(messages, options);
          if (attempt.result.error && attempt.retryable && !callerAborted() && Date.now() < ladderDeadline) {
            const reinitOk = await this.reinitialize();
            if (reinitOk && this.isReady) {
              attempt = await this.attemptGenerate(messages, options);
            }
          }
        }
        return attempt;
      })();
      const attempt = await withNetworkTimeout(
        ladderPromise,
        GENERATION_LADDER_DEADLINE_MS,
        "Local generation",
      ).catch(() => {
        console.warn("[local-engine] generate: ladder overran its budget — landing the honest error");
        return {
          result: {
            content: "",
            error: "The on-device model did not finish in time — try again.",
            source: "local",
            modelUsed: this.currentModelId,
          } as CloudChatResult,
          retryable: false,
        };
      });
      console.info(`[local-engine] generate: settled content=${(attempt.result.content || "").length}ch error=${attempt.result.error ? "yes" : "no"}`);

      const result = attempt.result;
      if (result.error && !result.content) {
        // Terminal failure — keep the state machine honest, then recover so
        // the next message can proceed without a manual reload.
        this.setState("error");
        if (this.isReady) {
          setTimeout(() => { if (this.isReady) this.setState("ready"); }, 1500);
        }
      } else {
        this.setState("ready");
      }
      return result;
    } catch (error: any) {
      console.error("Local generation error:", error);
      this.setState("error");
      // The engine is still loaded — recover to `ready` shortly so the next
      // call can proceed, but keep the error visible in the meantime.
      if (this.isReady) {
        setTimeout(() => { if (this.isReady) this.setState("ready"); }, 1500);
      }
      return { content: "", error: error.message || "Local generation failed.", source: "local", modelUsed: this.currentModelId };
    }
  }

  private async safeInterrupt(): Promise<void> {
    try {
      await (this.engine as unknown as { interruptGenerate?: () => Promise<void> } | null)?.interruptGenerate?.();
    } catch { /* engine was not generating — nothing to interrupt */ }
  }

  /** Tear down and rebuild the engine (device-lost recovery), watchdog-capped. */
  private async reinitialize(): Promise<boolean> {
    try { await this.engine?.unload(); } catch { /* already dead */ }
    this.engine = null;
    this.isReady = false;
    this.setState("idle");
    return this.initialize(undefined, this.currentModelId);
  }

  /**
   * One bounded generation attempt. Returns the attempt's result plus
   * whether the never-fail ladder may retry it (silence watchdog, worker
   * crash). Terminal truncations (output cap, hard timeout) are NOT
   * retried — a retry would just run into the same cap again.
   */
  private async attemptGenerate(
    messages: CloudChatMessage[],
    options?: CloudChatOptions,
  ): Promise<{ result: CloudChatResult; retryable: boolean }> {
    if (!this.engine || !this.isReady) {
      return {
        result: { content: "", error: "Local engine not ready.", source: "local", modelUsed: this.currentModelId },
        retryable: false,
      };
    }

    const webLlmMessages = messages.map(m => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content
    }));

    const idleMs = options?.generationIdleTimeoutMs ?? GENERATION_IDLE_TIMEOUT_MS;
    const hardMs = options?.generationHardTimeoutMs ?? GENERATION_HARD_TIMEOUT_MS;

    let chunks: AsyncIterable<any>;
    try {
      chunks = await this.engine.chat.completions.create({
        messages: webLlmMessages as any,
        temperature: options?.temperature ?? 0.7,
        // Explicit output cap (≈2 long chat replies). Previously no cap was
        // set: a rambling response generated until the 2,048-token window
        // filled and the reply died mid-sentence with no error anywhere.
        max_tokens: options?.maxTokens ?? LOCAL_OUTPUT_TOKEN_RESERVE,
        stream: true,
      });
      console.info("[local-engine] stream created — reading chunks");
    } catch (error: any) {
      console.error("Local generation error:", error);
      return {
        result: { content: "", error: error?.message || "Local generation failed.", source: "local", modelUsed: this.currentModelId },
        retryable: true,
      };
    }

    let content = "";
    let finishReason: string | null = null;
    let aborted = false;
    let idleTimedOut = false;
    let hardTimedOut = false;
    let readError: unknown = null;
    let sawFirstToken = false;

    // Silence watchdog: a tokenless gap means the worker hung (WebGPU device
    // lost mid-run) — racing every read against a timer turns that hang into
    // a retryable failure instead of an eternal spinner. The clock arms ONLY
    // after the first token: prompt PREFILL on weak GPUs legitimately runs
    // 30–90s with zero output (SwiftShader measured live), and the old
    // arm-at-start killed every attempt before the model ever spoke — every
    // offline reply died as "stopped responding" after a full ladder of
    // doomed 30s attempts. Prefill is instead bounded by the HARD clock,
    // which is raced below (the loop body can't check it while blocked in
    // iterator.next()).
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let settleIdle: (() => void) | null = null;
    const idlePromise = new Promise<void>((resolve) => { settleIdle = resolve; });
    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { idleTimedOut = true; settleIdle?.(); }, idleMs);
    };
    const hardPromise = new Promise<void>((resolve) => setTimeout(resolve, hardMs));

    const startedAt = Date.now();
    const iterator = (chunks as AsyncIterable<any>)[Symbol.asyncIterator]();
    try {
      while (true) {
        const raced = await Promise.race([
          iterator.next(),
          hardPromise.then(() => ({ hard: true as const })),
          ...(sawFirstToken ? [idlePromise.then(() => ({ stalled: true as const }))] : []),
        ]);
        if (idleTimer) clearTimeout(idleTimer);
        if ("hard" in raced && raced.hard) { hardTimedOut = true; break; }
        if ("stalled" in raced && raced.stalled) break; // silence watchdog fired
        if (options?.signal?.aborted) { aborted = true; break; }
        const { done, value } = raced as { done: boolean; value?: any };
        if (done) break;
        const choice = value?.choices?.[0];
        const delta = choice?.delta?.content || "";
        content += delta;
        if (choice?.finish_reason) finishReason = choice.finish_reason;
        options?.onDelta?.(content);
        if (!sawFirstToken && delta) {
          sawFirstToken = true;
          console.info(`[local-engine] first token after ${Date.now() - startedAt}ms (prefill done)`);
        }
        if (sawFirstToken) armIdle();
      }
    } catch (error) {
      readError = error;
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
    }

    // Breaking the read loop only stops CONSUMING the stream — the worker
    // keeps generating the full reply in the background, and the next
    // message queues behind it (looked like the model "stopped reacting").
    // interruptGenerate() actually halts token production in the worker.
    if (aborted || idleTimedOut || hardTimedOut || readError) {
      // Cancel the underlying stream without awaiting it — a hung generator
      // must never turn the watchdog back into a hang.
      Promise.resolve((iterator as AsyncIterator<any>).return?.()).catch(() => {});
      await this.safeInterrupt();
    }

    if (aborted) {
      return { result: { content, source: "local", modelUsed: this.currentModelId }, retryable: false };
    }
    if (readError) {
      console.error("Local generation error:", readError);
      const message = readError instanceof Error ? readError.message : "Local generation failed.";
      return {
        result: { content, error: message || "Local generation failed.", source: "local", modelUsed: this.currentModelId },
        retryable: true,
      };
    }
    if (idleTimedOut) {
      return {
        result: {
          content,
          error: "The on-device model stopped responding mid-reply.",
          source: "local",
          modelUsed: this.currentModelId,
        },
        retryable: true,
      };
    }
    if (hardTimedOut) {
      return {
        result: {
          content,
          // Distinguish "partial reply arrived, the rest was cut" from "the
          // device never produced a single token" — the old message told a
          // user with ZERO output to "ask to continue for the rest".
          error: content
            ? "The reply took too long on this device and was stopped. Ask to continue for the rest."
            : "This device could not finish the on-device reply in time — it may be too slow for the model right now. Try again, or send a shorter message.",
          source: "local",
          modelUsed: this.currentModelId,
        },
        retryable: false,
      };
    }
    if (!aborted && finishReason === "length") {
      // Honest truncation: the reply hit the output cap (window ran out).
      // Content is still returned so the UI shows what arrived, and the
      // error lets callers mark the answer as incomplete.
      return {
        result: {
          content,
          error: "The reply hit the on-device model's output limit and was trimmed. Ask to continue for the rest.",
          source: "local",
          modelUsed: this.currentModelId,
        },
        retryable: false,
      };
    }
    return { result: { content, source: "local", modelUsed: this.currentModelId }, retryable: false };
  }

  async unload() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.isReady = false;
    }
    // Free the device engine slot — another tab may now bring its own
    // engine up without fighting a dead one for GPU memory.
    this.releaseEngineLock();
    this.setState("idle");
  }
}

// Singleton instance
export const localInferenceEngine = new LocalInferenceEngine();

/**
 * Module-level helper for callers that dynamically import the engine module
 * (streamCloudChat, ChatbotPage): wait for the singleton engine to reach
 * `ready`, or bail out on terminal failure / timeout / caller abort.
 */
export function waitForLocalEngineReady(timeoutMs: number = 25_000, outer?: AbortSignal): Promise<boolean> {
  return localInferenceEngine.waitForReady(timeoutMs, outer);
}
