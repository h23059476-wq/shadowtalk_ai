/**
 * Background install for the on-device starter model.
 *
 * The download never blocks anything: on first sign-in the user is asked once
 * ("Install private AI in background? ~600MB"), then keeps chatting via their
 * BYOK key / escalation prompts while the shards stream down. WebLLM caches
 * weights per-shard, so an interrupted download resumes where it stopped.
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
import { STARTER_LOCAL_MODEL } from "@/ai/ModelRegistry";

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
    void startBackgroundInstall(uid);
  } else {
    // "Not now" must also stop the automatic tier bootstrap (embeddings +
    // instant chat) — dynamic import keeps the module graph acyclic.
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
  if (snapshot.phase === "ready" || starting) return;
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

    const ok = await localInferenceEngine
      .initialize((report) => {
        const progress = Math.max(0, Math.min(1, report?.progress ?? 0));
        patchSnapshot({
          progress,
          progressText: report?.text || snapshot.progressText,
        });
      }, STARTER_LOCAL_MODEL.id)
      .catch(() => false);

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
    throw new Error(
      "The on-device engine could not start (WebGPU unavailable, blocked, or the download failed).",
    );
  } catch (error) {
    starting = false;
    patchSnapshot({
      phase: "failed",
      error:
        error instanceof Error
          ? error.message
          : "The background install failed. You can retry from Settings → Offline AI.",
    });
    // preferLocal intentionally untouched — the user keeps chatting via cloud.
    return;
  } finally {
    starting = false;
  }
}

function finishReady(modelId: string): void {
  starting = false;
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
    patchSnapshot({
      phase: "failed",
      error:
        state === "error"
          ? "The on-device engine failed to finish installing."
          : "The install was interrupted. Retry from Settings → Offline AI.",
    });
  }
}

export { patchSnapshot as __patchSnapshotForTests };
