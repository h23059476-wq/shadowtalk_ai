/**
 * Batch 4 — LocalInferenceEngine state machine.
 *
 * Verifies the exported state type, getState(), subscribe(), and that the
 * state transitions correctly through initialize() → downloading/loading →
 * ready, generate() → generating → ready, and unload() → idle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub the web-llm worker factory so we don't load a real model.
vi.mock("@mlc-ai/web-llm", () => {
  return {
    CreateWebWorkerMLCEngine: vi.fn(async () => ({
      chat: { completions: { create: async function* () {
        yield { choices: [{ delta: { content: "hi" } }] };
      } } },
      unload: vi.fn(async () => {}),
    })),
  };
});

// Stub the worker constructor.
vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });

// Deterministic DEFAULT_LOCAL_MODEL.
vi.mock("@/ai/ModelRegistry", () => ({
  DEFAULT_LOCAL_MODEL: {
    id: "test-model-id",
    displayName: "Test Model",
    approxStorageRequirementMB: 800,
  },
}));

import { localInferenceEngine, type LocalEngineState } from "@/offline/LocalInferenceEngine";

describe("LocalInferenceEngine state machine", () => {
  beforeEach(() => {
    return localInferenceEngine.unload();
  });
  afterEach(() => localInferenceEngine.unload());

  it("starts in the idle state", () => {
    expect(localInferenceEngine.getState()).toBe("idle");
  });

  it("transitions idle → downloading → ready on successful initialize()", async () => {
    const states: LocalEngineState[] = [];
    const unsub = localInferenceEngine.subscribe((s) => states.push(s));
    const ok = await localInferenceEngine.initialize();
    expect(ok).toBe(true);
    expect(localInferenceEngine.getState()).toBe("ready");
    expect(states).toContain("downloading");
    unsub();
  });

  it("transitions ready → generating → ready on generate()", async () => {
    await localInferenceEngine.initialize();
    const states: LocalEngineState[] = [];
    const unsub = localInferenceEngine.subscribe((s) => states.push(s));
    const result = await localInferenceEngine.generate([{ role: "user", content: "hi" }]);
    expect(result.source).toBe("local");
    expect(result.modelUsed).toBe("test-model-id");
    expect(result.content).toBe("hi");
    expect(localInferenceEngine.getState()).toBe("ready");
    expect(states).toContain("generating");
    unsub();
  });

  it("transitions → idle on unload()", async () => {
    await localInferenceEngine.initialize();
    expect(localInferenceEngine.getState()).toBe("ready");
    await localInferenceEngine.unload();
    expect(localInferenceEngine.getState()).toBe("idle");
  });

  it("returns source='local' on the not-ready path", async () => {
    const r = await localInferenceEngine.generate([{ role: "user", content: "x" }]);
    expect(r.source).toBe("local");
    expect(r.error).toBeTruthy();
  });

  it("subscribe returns an unsubscribe function that stops callbacks", async () => {
    const seen: LocalEngineState[] = [];
    const unsub = localInferenceEngine.subscribe((s) => seen.push(s));
    unsub();
    await localInferenceEngine.initialize();
    expect(seen.length).toBe(0);
    await localInferenceEngine.unload();
  });
});
