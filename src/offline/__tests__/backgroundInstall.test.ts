/**
 * Background install service — the non-blocking private AI download.
 *
 * Covers: the one-time ask (accepted → download starts + prefer-local flips on
 * ready; declined → nothing happens), failure handling (prefer-local untouched,
 * retryable state), adoption of an already-running install (no second engine
 * racing the same GPU), resume after a reload mid-download, and the wizard
 * hook that marks the install complete without a duplicate ready event.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};
const lsMock = makeStorage();
vi.stubGlobal("localStorage", lsMock);

const engineMock = vi.hoisted(() => {
  const listeners = new Set<(s: string) => void>();
  let state = "idle";
  let modelId = "engine-loaded-model";
  return {
    isLoaded: vi.fn(() => false),
    getState: vi.fn(() => state),
    getCurrentModelId: vi.fn(() => modelId),
    initialize: vi.fn(async (_onProgress?: (r: unknown) => void, _modelId?: string) => {
      state = "ready";
      listeners.forEach((l) => l("ready"));
      return true;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    }),
    setState(next: string) {
      state = next;
      listeners.forEach((l) => l(next));
    },
  };
});
vi.mock("@/offline/LocalInferenceEngine", () => ({
  localInferenceEngine: engineMock,
}));

const accessMock = vi.hoisted(() => ({
  setPreferLocal: vi.fn(),
}));
vi.mock("@/lib/aiAccessMode", () => ({
  setPreferLocal: accessMock.setPreferLocal,
  getPreferLocal: () => false,
}));

import {
  getBackgroundInstallSnapshot,
  getInstallDecision,
  recordInstallDecision,
  startBackgroundInstall,
  markInstalledViaWizard,
  LOCAL_MODEL_READY_EVENT,
  __patchSnapshotForTests,
} from "@/offline/BackgroundInstall";
import { STARTER_LOCAL_MODEL } from "@/ai/ModelRegistry";

const DECISION_KEY = (uid: string) => `shadowtalk.bginstall.decision.v1.${uid}`;

describe("BackgroundInstall — one-time ask", () => {
  let readyEvents = 0;
  const onReady = () => {
    readyEvents += 1;
  };

  beforeEach(() => {
    lsMock.clear();
    readyEvents = 0;
    window.addEventListener(LOCAL_MODEL_READY_EVENT, onReady);
    __patchSnapshotForTests({
      phase: "not-started",
      progress: 0,
      progressText: "",
      modelId: null,
      error: null,
    });
    engineMock.isLoaded.mockReturnValue(false);
    engineMock.setState("idle");
    engineMock.initialize.mockClear();
    engineMock.initialize.mockImplementation(async () => {
      engineMock.setState("ready");
      return true;
    });
    accessMock.setPreferLocal.mockClear();
  });

  afterEach(() => {
    window.removeEventListener(LOCAL_MODEL_READY_EVENT, onReady);
  });

  it("declining records the decision and never starts a download", () => {
    recordInstallDecision("u-decline", false);
    expect(getInstallDecision("u-decline")).toBe("declined");
    expect(engineMock.initialize).not.toHaveBeenCalled();
    expect(getBackgroundInstallSnapshot().phase).toBe("not-started");
    expect(accessMock.setPreferLocal).not.toHaveBeenCalled();
    expect(readyEvents).toBe(0);
  });

  it("accepting downloads the starter model and silently flips prefer-local on ready", async () => {
    recordInstallDecision("u-accept", true);
    await vi.waitFor(() => {
      expect(getBackgroundInstallSnapshot().phase).toBe("ready");
    });

    expect(engineMock.initialize).toHaveBeenCalledTimes(1);
    expect(engineMock.initialize.mock.calls[0][1]).toBe(STARTER_LOCAL_MODEL.id);
    expect(accessMock.setPreferLocal).toHaveBeenCalledWith("u-accept", true);
    expect(getBackgroundInstallSnapshot().modelId).toBe("engine-loaded-model");
    expect(readyEvents).toBe(1);
    expect(getInstallDecision("u-accept")).toBe("accepted");
  });

  it("does not flip prefer-local when the install fails, and supports retry", async () => {
    engineMock.initialize.mockImplementation(async () => {
      engineMock.setState("error");
      return false;
    });

    recordInstallDecision("u-fail", true);
    await vi.waitFor(() => {
      expect(getBackgroundInstallSnapshot().phase).toBe("failed");
    });

    expect(accessMock.setPreferLocal).not.toHaveBeenCalled();
    expect(readyEvents).toBe(0);
    expect(getBackgroundInstallSnapshot().error).toBeTruthy();

    // Retry succeeds → flip happens on the successful run.
    engineMock.initialize.mockImplementation(async () => {
      engineMock.setState("ready");
      return true;
    });
    await startBackgroundInstall("u-fail");
    expect(getBackgroundInstallSnapshot().phase).toBe("ready");
    expect(accessMock.setPreferLocal).toHaveBeenCalledWith("u-fail", true);
    expect(readyEvents).toBe(1);
  });

  it("adopts an already-running install instead of racing a second engine", async () => {
    engineMock.setState("downloading");
    const startPromise = startBackgroundInstall("u-adopt");
    // Wait until the adopt branch has actually subscribed (snapshot shows
    // "downloading" before the engine finishes) — startBackgroundInstall is
    // async (dynamic import), so the flip must happen after that.
    await vi.waitFor(() => {
      expect(getBackgroundInstallSnapshot().phase).toBe("downloading");
    });
    expect(engineMock.initialize).not.toHaveBeenCalled();

    engineMock.setState("ready");
    await startPromise;

    expect(engineMock.initialize).not.toHaveBeenCalled();
    expect(getBackgroundInstallSnapshot().phase).toBe("ready");
    expect(accessMock.setPreferLocal).toHaveBeenCalledWith("u-adopt", true);
    expect(readyEvents).toBe(1);
  });

  it("resumes after a reload mid-download (accepted decision + downloading marker)", async () => {
    lsMock.setItem(DECISION_KEY("u-resume"), "accepted");
    __patchSnapshotForTests({
      phase: "downloading",
      progress: 0.4,
      progressText: "",
      modelId: STARTER_LOCAL_MODEL.id,
      error: null,
    });

    await startBackgroundInstall("u-resume");

    expect(engineMock.initialize).toHaveBeenCalledTimes(1);
    expect(engineMock.initialize.mock.calls[0][1]).toBe(STARTER_LOCAL_MODEL.id);
    expect(getBackgroundInstallSnapshot().phase).toBe("ready");
    expect(accessMock.setPreferLocal).toHaveBeenCalledWith("u-resume", true);
  });

  it("marks a wizard-completed install ready without a duplicate ready event", () => {
    markInstalledViaWizard("u-wizard", "wizard-model");
    expect(getInstallDecision("u-wizard")).toBe("accepted");
    const snap = getBackgroundInstallSnapshot();
    expect(snap.phase).toBe("ready");
    expect(snap.modelId).toBe("wizard-model");
    expect(accessMock.setPreferLocal).not.toHaveBeenCalled();
    expect(readyEvents).toBe(0);
  });

  it("treats an engine that is already loaded as an immediate ready state", async () => {
    engineMock.isLoaded.mockReturnValue(true);
    engineMock.getCurrentModelId.mockReturnValue("already-loaded");

    await startBackgroundInstall("u-loaded");

    expect(engineMock.initialize).not.toHaveBeenCalled();
    expect(getBackgroundInstallSnapshot().phase).toBe("ready");
    expect(getBackgroundInstallSnapshot().modelId).toBe("already-loaded");
    expect(readyEvents).toBe(0);
  });
});
