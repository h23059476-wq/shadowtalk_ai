/**
 * Tier-1 local inference — typed promise manager for the HF worker.
 *
 * Owns the Dedicated Web Worker lifecycle so the main chat thread NEVER runs
 * a pipeline:
 *
 *   spawn (lazy, on first call) ──► request ids ──► routed promises
 *                                     ▲                   │
 *   worker.onerror / fatal error ─────┘                   │
 *   terminate dead worker → respawn clean instance        │
 *   force-WASM downgrade after gpu-lost/OOM               ▼
 *                                        result | typed error
 *
 * Recovery ladder (requirement 3): a WebGPU context loss or an OOM abort is
 * caught, the dead worker is TERMINATED, a clean worker is respawned, and the
 * request retries ONCE on WASM. A second failure surfaces a clear typed error
 * and the status badge flips to `dead`. Download stalls have their own
 * watchdogs so a half-downloaded Hub never hangs the UI.
 *
 * Framework-free on purpose (no React) — the settings card and hooks
 * subscribe via subscribeStatus().
 */

import {
  classifyHfError,
  isFatalHfErrorKind,
  isHfWorkerResponse,
  type HfChatMessage,
  type HfChatResultPayload,
  type HfEmbedResultPayload,
  type HfEngineStatus,
  type HfErrorKind,
  type HfProgressPayload,
  type HfTaskKind,
  type HfTranscribeResultPayload,
  type HfWorkerRequest,
  type HfWorkerResponse,
} from "./protocol";
import {
  HF_ASR_MODEL,
  HF_CHAT_MODEL_SMALL,
  HF_CHAT_MODEL_MEDIUM,
  HF_EMBED_MODEL,
  getHfModel,
  hasWebGPU,
  type HfModelDefinition,
} from "./hfModels";

// ── Timing policy ────────────────────────────────────────────────────────
const INIT_IDLE_TIMEOUT_MS = 90_000; // no download/compile progress for 90s → stall
const INIT_HARD_TIMEOUT_MS = 15 * 60_000; // 1GB+ on slow mobile — allow 15 min total
const EMBED_TIMEOUT_MS = 60_000;
const TRANSCRIBE_TIMEOUT_MS = 5 * 60_000;
const CHAT_IDLE_TIMEOUT_MS = 120_000; // no new token for 2 min
const CHAT_HARD_TIMEOUT_MS = 15 * 60_000;

const MAX_RESPAWNS_PER_SESSION = 3;

interface PendingEntry {
  id: string;
  kind: "init" | "embed" | "transcribe" | "chat";
  /** Static request payload (safe to re-send: structured clone copies it). */
  payload: unknown;
  options: CallOptions;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  settled: boolean;
  idleTimer: ReturnType<typeof setTimeout> | null;
  hardTimer: ReturnType<typeof setTimeout> | null;
  timer: ReturnType<typeof setTimeout> | null;
  retriesLeft: number;
}

export interface CallOptions {
  task: HfTaskKind;
  model: HfModelDefinition;
  onProgress?: (p: HfProgressPayload) => void;
  onDelta?: (text: string) => void;
  onReady?: (device: "webgpu" | "wasm", downgraded: boolean) => void;
  /** Per-call timer overrides (tests). */
  initIdleTimeoutMs?: number;
  hardTimeoutMs?: number;
  timeoutMs?: number;
}

export interface LocalEngineStatus extends HfEngineStatus {
  /** How many times a dead worker was replaced this session. */
  respawns: number;
  /** Tasks that crashed on WebGPU this session and now run on WASM. */
  downgradedTasks: HfTaskKind[];
}

const INITIAL_STATUS: LocalEngineStatus = {
  state: "idle",
  device: null,
  detail: "",
  respawns: 0,
  downgradedTasks: [],
};

type WorkerCtor = new (scriptURL: string | URL, options?: WorkerOptions) => Worker;

function defaultSpawnWorker(): Worker {
  const WorkerCtor = (globalThis as unknown as { Worker?: WorkerCtor }).Worker;
  if (!WorkerCtor) throw new Error("Web Workers are unavailable in this environment.");
  return new WorkerCtor(new URL("../../workers/hfInference.worker.ts", import.meta.url), {
    type: "module",
    name: "shadowtalk-hf-inference",
  });
}

export class HfLocalEngineClient {
  private worker: Worker | null = null;
  private workerReady = false;
  private pending = new Map<string, PendingEntry>();
  private nextId = 0;
  private status: LocalEngineStatus = { ...INITIAL_STATUS };
  private statusListeners = new Set<(s: LocalEngineStatus) => void>();
  private respawns = 0;
  private downgradedTasks = new Set<HfTaskKind>();
  private readonly spawnWorker: () => Worker;
  private readonly now: () => number;

  constructor(options: { spawnWorker?: () => Worker; now?: () => number } = {}) {
    this.spawnWorker = options.spawnWorker ?? defaultSpawnWorker;
    this.now = options.now ?? Date.now;
  }

  // ── Status badge ────────────────────────────────────────────────────────

  getStatus(): LocalEngineStatus {
    return this.status;
  }

  subscribeStatus(cb: (s: LocalEngineStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  private setStatus(
    state: HfEngineStatus["state"],
    detail: string,
    device: HfEngineStatus["device"] = this.status.device,
  ): void {
    this.status = {
      ...this.status,
      state,
      detail,
      device,
      respawns: this.respawns,
      downgradedTasks: [...this.downgradedTasks],
    };
    this.statusListeners.forEach((l) => l(this.status));
  }

  // ── Worker lifecycle ────────────────────────────────────────────────────

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = this.spawnWorker();
    worker.onmessage = (event: MessageEvent) => this.handleMessage(event.data);
    worker.onerror = (event: ErrorEvent) => this.handleWorkerError(event.message || "worker crashed");
    worker.onmessageerror = () =>
      this.handleWorkerError("worker message could not be serialized (protocol violation)");
    this.worker = worker;
    this.workerReady = false;
    return worker;
  }

  private terminateWorker(): void {
    if (!this.worker) return;
    try {
      this.worker.terminate();
    } catch {
      /* already dead */
    }
    this.worker = null;
    this.workerReady = false;
  }

  private handleWorkerError(message: string): void {
    const kind = classifyHfError(message);
    console.warn(`[hf-inference] worker error (${kind}):`, message);
    if (this.pending.size === 0) {
      // Nothing in flight — just replace the dead worker for next time.
      this.terminateWorker();
      this.setStatus("idle", "Recovered from a worker crash.", null);
      return;
    }
    this.failAllPending(kind, message);
  }

  private recoveryMessage(kind: HfErrorKind, raw: string): string {
    if (kind === "gpu-lost") {
      return "The GPU session was lost while running the local model. The request did not complete — try again (it will use the CPU fallback).";
    }
    if (kind === "oom") {
      return "The device ran out of memory running the local model. Try a smaller model or shorter input.";
    }
    return raw;
  }

  /**
   * Shared fatal-error path: fail (or force-WASM retry) every pending
   * request, terminate the dead worker, respawn ONCE, update the badge.
   */
  private failAllPending(kind: HfErrorKind, message: string): void {
    const entries = [...this.pending.values()];
    this.pending.clear();
    const retried: PendingEntry[] = [];
    for (const entry of entries) {
      this.clearTimers(entry);
      if (entry.settled) continue;
      entry.settled = true;
      if (isFatalHfErrorKind(kind) && entry.retriesLeft > 0) {
        retried.push(entry);
      } else {
        entry.reject(this.makeError(kind, message));
      }
    }
    this.terminateWorker();
    if (retried.length > 0) {
      this.respawns += 1;
      this.setStatus(
        "recovering",
        "Recovered from a GPU/worker crash — retrying on the safe device.",
        null,
      );
      for (const entry of retried) {
        // Defer so the fresh worker exists after the current stack unwinds.
        setTimeout(() => this.attempt(entry, true, 0), 0);
      }
    } else if (entries.length > 0 && isFatalHfErrorKind(kind)) {
      this.respawns += 1;
      this.setStatus(
        this.respawns > MAX_RESPAWNS_PER_SESSION ? "dead" : "idle",
        this.respawns > MAX_RESPAWNS_PER_SESSION
          ? "The local inference engine crashed too many times — reload the page to try again."
          : "Recovered from a crash.",
        null,
      );
    }
  }

  private makeError(kind: HfErrorKind, raw: string): Error & { kind: HfErrorKind } {
    const error = new Error(this.recoveryMessage(kind, raw)) as Error & { kind: HfErrorKind };
    error.kind = kind;
    return error;
  }

  // ── Message routing ─────────────────────────────────────────────────────

  private handleMessage(data: unknown): void {
    if (!isHfWorkerResponse(data)) return;
    const message = data as HfWorkerResponse;

    if (message.type === "engine-status") {
      this.status = {
        ...this.status,
        state: message.payload.state,
        device: message.payload.device,
        detail: message.payload.detail,
        respawns: this.respawns,
        downgradedTasks: [...this.downgradedTasks],
      };
      this.statusListeners.forEach((l) => l(this.status));
      return;
    }

    const entry = this.pending.get(message.id);
    if (!entry) return; // late response for an aborted/timed-out request

    switch (message.type) {
      case "ready": {
        this.workerReady = true;
        this.clearTimers(entry);
        entry.options.onReady?.(message.payload.device, message.payload.downgraded);
        if (message.payload.downgraded) this.downgradedTasks.add(message.payload.task);
        this.setStatus(
          "ready",
          `${message.payload.task} ready on ${message.payload.device}`,
          message.payload.device,
        );
        break;
      }
      case "progress": {
        this.armIdleTimer(entry, INIT_IDLE_TIMEOUT_MS);
        entry.options.onProgress?.(message.payload);
        break;
      }
      case "delta": {
        this.armIdleTimer(entry, CHAT_IDLE_TIMEOUT_MS);
        entry.options.onDelta?.(message.payload.text);
        break;
      }
      case "result": {
        this.clearTimers(entry);
        entry.settled = true;
        this.pending.delete(message.id);
        entry.resolve(message.payload);
        break;
      }
      case "error": {
        this.clearTimers(entry);
        if (isFatalHfErrorKind(message.payload.kind) && entry.retriesLeft > 0) {
          // Route through the shared path: the entry STAYS in pending so
          // failAllPending counts it, respawns once, and re-attempts it on
          // WASM (attempt() re-arms timers and clears retriesLeft).
          this.failAllPending(message.payload.kind, message.payload.message);
          return;
        }
        this.pending.delete(message.id);
        entry.settled = true;
        entry.reject(this.makeError(message.payload.kind, message.payload.message));
        break;
      }
    }
  }

  // ── Timers ──────────────────────────────────────────────────────────────

  private clearTimers(entry: PendingEntry): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    if (entry.hardTimer) clearTimeout(entry.hardTimer);
    if (entry.timer) clearTimeout(entry.timer);
    entry.idleTimer = null;
    entry.hardTimer = null;
    entry.timer = null;
  }

  private armIdleTimer(entry: PendingEntry, ms: number): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      this.settleTimeout(entry, `No progress for ${Math.round(ms / 1000)}s — the operation stalled.`);
    }, ms);
  }

  private armHardTimer(entry: PendingEntry, ms: number, what: string): void {
    if (entry.hardTimer) clearTimeout(entry.hardTimer);
    entry.hardTimer = setTimeout(() => {
      this.settleTimeout(entry, `${what} took too long and was stopped.`);
    }, ms);
  }

  private settleTimeout(entry: PendingEntry, message: string): void {
    if (entry.settled) return;
    entry.settled = true;
    this.clearTimers(entry);
    this.pending.delete(entry.id);
    if (entry.kind === "chat") {
      this.postMessageSafe({ type: "chat-abort", id: entry.id, payload: { reason: "timeout" } });
    }
    const error = new Error(message) as Error & { kind: HfErrorKind };
    error.kind = "unknown";
    entry.reject(error);
  }

  private postMessageSafe(request: HfWorkerRequest): boolean {
    try {
      const worker = this.ensureWorker();
      worker.postMessage(request);
      return true;
    } catch (error) {
      console.warn("[hf-inference] postMessage failed:", error);
      return false;
    }
  }

  /** One send attempt for a pending entry. forceWasm is latched into init payloads. */
  private attempt(entry: PendingEntry, forceWasm: boolean, retriesLeft: number): void {
    if (forceWasm) {
      this.downgradedTasks.add(entry.options.task);
      this.setStatus("loading", "Loading on CPU (WASM) after the GPU error.", "wasm");
    }
    const request = this.buildRequest(entry, forceWasm);
    entry.retriesLeft = retriesLeft;
    this.pending.set(entry.id, entry);
    if (!this.postMessageSafe(request)) {
      this.pending.delete(entry.id);
      entry.settled = true;
      entry.reject(this.makeError("unsupported", "Could not start the local inference worker."));
      return;
    }
    // Timers: init-style attempts get idle+hard watchdogs (downloads stall);
    // one-shot ops get a total timeout; chat gets idle+hard.
    if (entry.kind === "init" || !this.isWorkerAlive()) {
      this.armIdleTimer(entry, entry.options.initIdleTimeoutMs ?? INIT_IDLE_TIMEOUT_MS);
      this.armHardTimer(entry, INIT_HARD_TIMEOUT_MS, "The model setup");
    } else if (entry.kind === "embed") {
      entry.timer = setTimeout(
        () => this.settleTimeout(entry, "Embedding timed out."),
        entry.options.timeoutMs ?? EMBED_TIMEOUT_MS,
      );
    } else if (entry.kind === "transcribe") {
      entry.timer = setTimeout(
        () => this.settleTimeout(entry, "Transcription timed out."),
        entry.options.timeoutMs ?? TRANSCRIBE_TIMEOUT_MS,
      );
    } else if (entry.kind === "chat") {
      this.armIdleTimer(entry, CHAT_IDLE_TIMEOUT_MS);
      this.armHardTimer(entry, entry.options.hardTimeoutMs ?? CHAT_HARD_TIMEOUT_MS, "The chat generation");
    }
  }

  private isWorkerAlive(): boolean {
    return !!this.worker && this.workerReady;
  }

  private buildRequest(entry: PendingEntry, forceWasm: boolean): HfWorkerRequest {
    if (entry.kind === "init") {
      const payload = { ...(entry.payload as Record<string, unknown>), forceWasm };
      return { type: "init", id: entry.id, payload } as HfWorkerRequest;
    }
    switch (entry.kind) {
      case "embed":
        return { type: "embed", id: entry.id, payload: entry.payload as never };
      case "transcribe":
        return { type: "transcribe", id: entry.id, payload: entry.payload as never };
      case "chat":
        return { type: "chat", id: entry.id, payload: entry.payload as never };
    }
  }

  private nextRequestId(): string {
    return `hf-${(this.now() % 1_000_000).toString(36)}-${++this.nextId}`;
  }

  private call<T>(
    kind: PendingEntry["kind"],
    payload: unknown,
    options: CallOptions,
    explicitId?: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const entry: PendingEntry = {
        id: explicitId ?? this.nextRequestId(),
        kind,
        payload,
        options,
        resolve: resolve as (value: unknown) => void,
        reject,
        settled: false,
        idleTimer: null,
        hardTimer: null,
        timer: null,
        retriesLeft: 1, // every call may retry ONCE on WASM after a fatal device error
      };
      const forceWasm = !hasWebGPU() || this.downgradedTasks.has(options.task);
      if (forceWasm && hasWebGPU() && this.downgradedTasks.has(options.task)) {
        console.info(`[hf-inference] ${options.task} stays on WASM for the rest of this session (earlier GPU loss)`);
      }
      this.attempt(entry, forceWasm, forceWasm ? 0 : 1);
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Warm-up / explicit download of a Tier-1 model. Resolves when the pipeline
   * is ready (weights cached in the browser Cache API). Progress is 0..1.
   */
  async downloadModel(
    model: HfModelDefinition,
    onProgress?: (progress: number, status: string) => void,
  ): Promise<{ device: "webgpu" | "wasm"; downgraded: boolean }> {
    let device: "webgpu" | "wasm" = hasWebGPU() ? "webgpu" : "wasm";
    let downgraded = false;
    await this.call<Record<string, unknown>>(
      "init",
      {
        task: model.task,
        model: model.repoId,
        dtype: undefined, // worker resolves dtype from its device ladder
        pooling: model.pooling,
      },
      {
        task: model.task,
        model,
        onProgress: (p) => onProgress?.(p.progress, p.status),
        onReady: (d, dg) => {
          device = d;
          downgraded = dg;
        },
      },
    );
    return { device, downgraded };
  }

  /** Neural embeddings (L2-normalized), order matches `texts`. */
  async embedTexts(
    texts: string[],
    options: { model?: HfModelDefinition; timeoutMs?: number } = {},
  ): Promise<HfEmbedResultPayload> {
    const model = options.model ?? HF_EMBED_MODEL;
    if (texts.length === 0) {
      return { embeddings: [], model: model.repoId, device: this.status.device ?? "wasm" };
    }
    return this.call<HfEmbedResultPayload>("embed", { texts }, { task: model.task, model, timeoutMs: options.timeoutMs });
  }

  /** Offline speech-to-text on 16 kHz mono PCM. */
  async transcribeAudio(
    audio: Float32Array,
    options: { model?: HfModelDefinition; language?: string; timeoutMs?: number } = {},
  ): Promise<HfTranscribeResultPayload> {
    const model = options.model ?? HF_ASR_MODEL;
    // `.slice()` + structured clone: the caller's buffer is never detached,
    // so a force-WASM retry always has valid audio.
    return this.call<HfTranscribeResultPayload>(
      "transcribe",
      { audio: audio.slice(), language: options.language },
      { task: model.task, model, timeoutMs: options.timeoutMs },
    );
  }

  /**
   * Offline compact chat. Deltas stream through `onDelta`; the returned text
   * is the full assistant message. `signal` aborts mid-generation (the worker
   * returns the partial text).
   */
  async chat(
    messages: HfChatMessage[],
    options: {
      model?: HfModelDefinition;
      maxNewTokens?: number;
      temperature?: number;
      topK?: number;
      onDelta?: (text: string) => void;
      signal?: AbortSignal;
      hardTimeoutMs?: number;
      timeoutMs?: number;
    } = {},
  ): Promise<HfChatResultPayload> {
    const model = options.model ?? HF_CHAT_MODEL_SMALL;
    // The id is minted HERE so the AbortSignal can stop this exact request.
    const requestId = this.nextRequestId();
    if (options.signal) {
      if (options.signal.aborted) throw new DOMException("Aborted", "AbortError");
      options.signal.addEventListener(
        "abort",
        () => {
          this.abortChat(requestId);
        },
        { once: true },
      );
    }
    return this.call<HfChatResultPayload>(
      "chat",
      {
        messages,
        maxNewTokens: options.maxNewTokens,
        temperature: options.temperature,
        topK: options.topK,
      },
      {
        task: model.task,
        model,
        onDelta: options.onDelta,
        hardTimeoutMs: options.hardTimeoutMs,
        timeoutMs: options.timeoutMs,
      },
      requestId,
    );
  }

  /** Best-effort stop of an in-flight generation (partial text is returned). */
  abortChat(requestId: string): void {
    this.postMessageSafe({ type: "chat-abort", id: requestId, payload: { reason: "user" } });
  }

  /** Fail everything and drop the worker (next call respawns fresh). */
  dispose(): void {
    this.failAllPending("unknown", "The local inference client was disposed.");
    this.terminateWorker();
  }

  /** Test hook — reset every field. */
  __resetForTests(): void {
    this.pending.clear();
    this.terminateWorker();
    this.nextId = 0;
    this.respawns = 0;
    this.downgradedTasks.clear();
    this.status = { ...INITIAL_STATUS };
    this.statusListeners.clear();
    this.workerReady = false;
  }
}

/** Singleton accessor — the app talks to exactly one worker per page. */
let singleton: HfLocalEngineClient | null = null;

export function getLocalInferenceClient(): HfLocalEngineClient {
  if (!singleton) singleton = new HfLocalEngineClient();
  return singleton;
}

export function __resetLocalInferenceClientForTests(): void {
  singleton?.__resetForTests();
  singleton = null;
}

/** Re-export catalog picks so callers import from one place. */
export { HF_ASR_MODEL, HF_CHAT_MODEL_SMALL, HF_CHAT_MODEL_MEDIUM, HF_EMBED_MODEL, getHfModel };
