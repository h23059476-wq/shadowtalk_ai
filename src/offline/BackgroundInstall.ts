/**
 * Background install for the on-device starter model.
 *
 * The download never blocks anything: on first sign-in the user is asked once
 * ("Install private AI in background? ~700MB for the Lite starter, ~300MB for
 * the Nano tier"), then keeps chatting via their BYOK key / escalation
 * prompts while the shards stream down. WebLLM caches weights per-shard, so
 * an interrupted download resumes where it stopped.
 *
 * When the model lands, chat silently flips to on-device (setPreferLocal) and
 * a `shadowtalk:local-model-ready` window event fires — ChatbotPage turns that
 * into the "Private AI installed" toast + privacy-ledger entry, and the next
 * ordinary chat gets the green on-device shield badge.
 *
 * Storage scopes:
 *  - install state  → device-scoped key (weights live in the browser's cache,
 *    shared by every account on this browser);
 *  - the decision   → per-user key (the one-time ask is per account).
 */
import { setPreferLocal } from "@/lib/aiAccessMode";
import { STARTER_LOCAL_MODEL, getLocalModelDefinition } from "@/ai/ModelRegistry";
import { StorageManager } from "@/offline/StorageManager";
import { isMirrorEligibleError } from "@/offline/modelMirror";
import { INSTALL_RETRY_LIMIT, installRetryBackoffMs, isOffline } from "@/lib/offlineGuards";

export const LOCAL_MODEL_READY_EVENT = "shadowtalk:local-model-ready";

export type BackgroundInstallPhase = "not-started" | "downloading" | "ready" | "failed";

export interface BackgroundInstallSnapshot {
  phase: BackgroundInstallPhase;
  /** 0..1 best-effort download progress. */
  progress: number;
  progressText: string;
  modelId: string | null;
  error: string | null;
}

export type InstallDecision = "accepted" | "declined";

const STATE_KEY = "shadowtalk.bginstall.state.v1";
const DECISION_PREFIX = "shadowtalk.bginstall.decision.v1";

const DEFAULT_SNAPSHOT: BackgroundInstallSnapshot = {
  phase: "not-started",
  progress: 0,
  progressText: "",
  modelId: null,
  error: null,
};

let snapshot: BackgroundInstallSnapshot = loadSnapshot();
let starting = false;
let acceptedBy: string | null = null;
const listeners = new Set<(s: BackgroundInstallSnapshot) => void>();

// ── Never-fail install hardening ────────────────────────────────────────
//
// Remote-area connections fail mid-download for minutes at a time. Without
// the three knobs below, a single network hiccup left the banner stuck on
// "install failed" until the user noticed and pressed Retry manually.
//
//  1. AUTO-RETRY: network-shaped failures re-arm themselves with backoff
//     (15s / 45s / 120s), and a fresh `online` event retries immediately.
//  2. ABORT: declining the banner ("Not now") really stops the flow — the
//     snapshot goes back to not-started, no silent prefer-local flip and no
//     ready toast ever fire, even if the in-flight engine download completes
//     into cache.
//  3. SPACE CHECK: the storage pre-check the onboarding wizard always had
//     also guards the banner path, with a distinct "not enough storage"
//     failure instead of a generic engine error.
let declineAbort = false;
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function clearRetryTimer(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function storageFloorMB(): number {
  // The engine may fall back to the q4f32 twin on adapters without
  // shader-f16 — that twin is the bigger download, so require room for it.
  const twin = STARTER_LOCAL_MODEL.fallbackModelId
    ? getLocalModelDefinition(STARTER_LOCAL_MODEL.fallbackModelId)
    : undefined;
  return Math.max(STARTER_LOCAL_MODEL.approxStorageRequirementMB, twin?.approxStorageRequirementMB ?? 0);
}

/**
 * Schedule the next automatic retry for a network-shaped failure. Returns
 * the human-readable suffix to append to the failure message, or null when
 * no retry was scheduled (attempts exhausted / declined / not a network
 * problem).
 */
function scheduleRetryIfEligible(error: unknown): string | null {
  if (declineAbort) return null;
  if (retryAttempt >= INSTALL_RETRY_LIMIT) return null;
  if (!isMirrorEligibleError(error)) return null;
  if (isOffline()) {
    // Pointless to spin now — the `online` listener retries immediately.
    return null;
  }
  const delay = installRetryBackoffMs(retryAttempt);
  retryAttempt += 1;
  clearRetryTimer();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void startBackgroundInstall();
  }, delay);
  return ` Retrying automatically in ${Math.round(delay / 1000)}s…`;
}

/**
 * Decline / teardown hook: stop any pending auto-retry and mark the flow
 * aborted. An engine download already in flight is left to finish into the
 * shard cache (bytes are not wasted), but no side effects fire: no
 * prefer-local flip, no ready toast, no "ready" snapshot.
 */
export function abortBackgroundInstall(): void {
  declineAbort = true;
  clearRetryTimer();
  if (snapshot.phase === "failed" || snapshot.phase === "downloading") {
    patchSnapshot({ phase: "not-started", progress: 0, progressText: "", error: null });
  }
}

if (typeof window !== "undefined") {
  // A fresh reconnect is the best possible moment to resume a failed
  // install — retry immediately instead of waiting out the backoff.
  window.addEventListener("online", () => {
    if (declineAbort || starting) return;
    if (snapshot.phase !== "failed") return;
    if (retryAttempt >= INSTALL_RETRY_LIMIT) return;
    clearRetryTimer();
    void startBackgroundInstall();
  });
}

function loadSnapshot(): BackgroundInstallSnapshot {
  if (typeof localStorage === "undefined") return { ...DEFAULT_SNAPSHOT };
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { ...DEFAULT_SNAPSHOT };
    const parsed = JSON.parse(raw) as Partial<BackgroundInstallSnapshot>;
    const phase: BackgroundInstallPhase =
      parsed.phase === "downloading" || parsed.phase === "ready" || parsed.phase === "failed"
        ? parsed.phase
        : "not-started";
    // A "downloading" marker from a dead session is a resume hint, not a
    // live state — the actual engine starts idle on every page load.
    return {
      phase,
      progress: typeof parsed.progress === "number" ? parsed.progress : 0,
      progressText: typeof parsed.progressText === "string" ? parsed.progressText : "",
      modelId: typeof parsed.modelId === "string" ? parsed.modelId : null,
      error: typeof parsed.error === "string" ? parsed.error : null,
    };
  } catch {
    return { ...DEFAULT_SNAPSHOT };
  }
}

function patchSnapshot(partial: Partial<BackgroundInstallSnapshot>): BackgroundInstallSnapshot {
  snapshot = { ...snapshot, ...partial };
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
    }
  } catch {
    // private browsing / quota — the in-memory state still drives the UI
  }
  listeners.forEach((l) => l(snapshot));
  return snapshot;
}

function notifyReady(modelId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(LOCAL_MODEL_READY_EVENT, { detail: { modelId } }));
  } catch {
    // non-fatal
  }
}

/** Current install snapshot (pure — safe for React state seeds). */
export function getBackgroundInstallSnapshot(): BackgroundInstallSnapshot {
  return snapshot;
}

/** Subscribe to snapshot changes. Returns an unsubscribe function. */
export function subscribeBackgroundInstall(
  cb: (s: BackgroundInstallSnapshot) => void,
): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** The user's one-time ask decision (null = never asked). */
export function getInstallDecision(uid: string | null | undefined): InstallDecision | null {
  if (!uid || typeof localStorage === "undefined") return null;
  try {
    const value = localStorage.getItem(`${DECISION_PREFIX}.${uid}`);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

function writeDecision(uid: string, decision: InstallDecision): void {
  try {
    localStorage.setItem(`${DECISION_PREFIX}.${uid}`, decision);
  } catch {
    // non-fatal — decision only gates the banner this session
  }
}

/**
 * Record the one-time ask answer. Accepting immediately kicks off the
 * background download; declining just stores the answer (Settings → Offline
 * AI remains the manual path).
 */
export function recordInstallDecision(uid: string, accepted: boolean): void {
  writeDecision(uid, accepted ? "accepted" : "declined");
  if (accepted) {
    acceptedBy = uid;
    // A fresh accept overrides any earlier decline this session (Settings →
    // Offline AI path) and re-arms the auto-retry ladder.
    declineAbort = false;
    retryAttempt = 0;
    void startBackgroundInstall(uid);
  } else {
    // "Not now" must also stop the automatic tier bootstrap (embeddings +
    // instant chat) and any in-flight/retrying install — dynamic import
    // keeps the module graph acyclic.
    abortBackgroundInstall();
    void import("@/services/modelManager")
      .then((m) => m.abortBootstrap())
      .catch(() => {});
  }
}

/**
 * Wizard hook: the onboarding's blocking "Download & activate" flow already
 * initializes the engine + preferLocal — record the decision and snapshot so
 * the background banner never shows on top of it. (No ready-event: the wizard
 * renders its own success screen.)
 */
export function markInstalledViaWizard(uid: string, modelId?: string): void {
  writeDecision(uid, "accepted");
  patchSnapshot({
    phase: "ready",
    progress: 1,
    progressText: "Ready",
    modelId: modelId ?? snapshot.modelId,
    error: null,
  });
}

/**
 * Start (or resume) the background install of the starter model.
 * Idempotent: safe to call from the banner effect, decision handler, and
 * resume paths concurrently.
 */
export async function startBackgroundInstall(uid?: string): Promise<void> {
  if (typeof uid === "string" && uid) acceptedBy = uid;
  if (snapshot.phase === "ready" || starting || declineAbort) return;
  clearRetryTimer();
  starting = true;
  try {
    const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");

    if (localInferenceEngine.isLoaded()) {
      patchSnapshot({
        phase: "ready",
        progress: 1,
        progressText: "Ready",
        modelId: localInferenceEngine.getCurrentModelId(),
        error: null,
      });
      return;
    }

    // Another install is already running (e.g. the onboarding wizard's
    // blocking flow, or a previous resume) — adopt it instead of racing a
    // second engine against the same GPU.
    const engineState = localInferenceEngine.getState();
    if (engineState === "downloading" || engineState === "loading") {
      patchSnapshot({
        phase: "downloading",
        modelId: STARTER_LOCAL_MODEL.id,
        progressText: snapshot.progressText || "Downloading the model…",
        error: null,
      });
      await awaitEngineSettled(localInferenceEngine);
      return;
    }

    // Storage pre-check — the wizard path always had one; the banner path
    // skipped it, so low-disk devices surfaced a generic engine error after
    // minutes of downloading. Check the q4f32-twin-sized floor.
    const floorMB = storageFloorMB();
    const storage = await StorageManager.getStorageEstimate().catch(() => null);
    if (storage && storage.availableMB > 0 && storage.availableMB < floorMB * 0.9) {
      patchSnapshot({
        phase: "failed",
        error: `Not enough browser storage free for the on-device model (~${Math.round(floorMB)}MB needed, ${Math.round(storage.availableMB)}MB free). Free up space and retry from Settings → Offline AI.`,
      });
      return;
    }

    patchSnapshot({
      phase: "downloading",
      progress: snapshot.phase === "failed" ? 0 : snapshot.progress,
      progressText: "Downloading the model…",
      modelId: STARTER_LOCAL_MODEL.id,
      error: null,
    });

    // Durable cache before the big download (best-effort).
    try {
      if (typeof navigator !== "undefined" && navigator.storage?.persist) {
        await navigator.storage.persist();
      }
    } catch {
      // persistence denied — weights still cache, just evictable
    }

    let initError: unknown = null;
    const ok = await localInferenceEngine
      .initialize((report) => {
        const progress = Math.max(0, Math.min(1, report?.progress ?? 0));
        patchSnapshot({
          progress,
          progressText: report?.text || snapshot.progressText,
        });
      }, STARTER_LOCAL_MODEL.id)
      .catch((error) => {
        initError = error;
        return false;
      });

    if (ok && localInferenceEngine.isLoaded()) {
      finishReady(localInferenceEngine.getCurrentModelId());
      return;
    }

    const stateAfter = localInferenceEngine.getState();
    if (stateAfter === "ready") {
      finishReady(localInferenceEngine.getCurrentModelId());
      return;
    }
    if (stateAfter === "downloading" || stateAfter === "loading") {
      // initialize() returned false because someone else started first —
      // wait for that run instead of declaring failure.
      await awaitEngineSettled(localInferenceEngine);
      return;
    }
    throw initError ?? new Error(
      "The on-device engine could not start (WebGPU unavailable, blocked, or the download failed).",
    );
  } catch (error) {
    starting = false;
    if (declineAbort) {
      // The user declined while the engine was still working — land the
      // flow silently on not-started. Cached shards stay; no flip, no toast.
      patchSnapshot({ phase: "not-started", progress: 0, progressText: "", error: null });
      return;
    }
    const retrySuffix = scheduleRetryIfEligible(error);
    patchSnapshot({
      phase: "failed",
      error:
        error instanceof Error
          ? `${error.message}${retrySuffix ?? ""}`
          : `The background install failed. You can retry from Settings → Offline AI.${retrySuffix ?? ""}`,
    });
    // preferLocal intentionally untouched — the user keeps chatting via cloud.
    return;
  } finally {
    starting = false;
  }
}

function finishReady(modelId: string): void {
  starting = false;
  if (declineAbort) {
    // Declined mid-download: the engine finished into cache on its own.
    // Honor the decline — no flip, no event, snapshot back to not-started.
    patchSnapshot({ phase: "not-started", progress: 0, progressText: "", error: null });
    return;
  }
  retryAttempt = 0;
  patchSnapshot({ phase: "ready", progress: 1, progressText: "Ready", modelId, error: null });
  // Silent flip: ordinary chat now runs on-device for the accepting account.
  if (acceptedBy) setPreferLocal(acceptedBy, true);
  notifyReady(modelId);
}

/** Wait for an engine owned by someone else to reach a terminal state. */
async function awaitEngineSettled(engine: {
  getState: () => string;
  subscribe: (cb: (s: string) => void) => () => void;
  getCurrentModelId?: () => string;
}): Promise<void> {
  const settled = (state: string) => state === "ready" || state === "error" || state === "idle";
  const current = engine.getState();
  if (settled(current)) {
    if (current === "ready" && engine.getCurrentModelId) {
      finishReady(engine.getCurrentModelId());
    } else if (current === "error") {
      patchSnapshot({
        phase: "failed",
        error: "The on-device engine failed to finish installing.",
      });
    }
    return;
  }
  await new Promise<void>((resolve) => {
    const unsub = engine.subscribe((state) => {
      if (!settled(state)) return;
      unsub();
      resolve();
    });
  });
  const state = engine.getState();
  if (state === "ready" && engine.getCurrentModelId) {
    finishReady(engine.getCurrentModelId());
  } else if (state !== "ready") {
    if (declineAbort) {
      patchSnapshot({ phase: "not-started", progress: 0, progressText: "", error: null });
      return;
    }
    const retrySuffix = scheduleRetryIfEligible(
      state === "error" ? "engine fetch failed" : "install interrupted",
    );
    patchSnapshot({
      phase: "failed",
      error:
        state === "error"
          ? `The on-device engine failed to finish installing.${retrySuffix ?? ""}`
          : `The install was interrupted. Retry from Settings → Offline AI.${retrySuffix ?? ""}`,
    });
  }
}

export {
  patchSnapshot as __patchSnapshotForTests,
  // Exposed for tests: the decline/abort latch is module state that must not
  // leak between test cases.
  __resetInstallLatchesForTests,
};

function __resetInstallLatchesForTests(): void {
  declineAbort = false;
  retryAttempt = 0;
  clearRetryTimer();
}
