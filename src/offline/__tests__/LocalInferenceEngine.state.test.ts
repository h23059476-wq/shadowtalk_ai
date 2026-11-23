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
    prebuiltAppConfig: { model_list: [] },
    CreateWebWorkerMLCEngine: vi.fn(async () => ({
      chat: { completions: { create: async function* () {
        yield { choices: [{ delta: { content: "hi" } }] };
      } } },
      unload: vi.fn(async () => {}),
    })),
    hasModelInCache: vi.fn(async () => false),
    deleteModelAllInfoInCache: vi.fn(async () => {}),
  };
});

// Mirror module — default to "mirror disabled"; the retry tests below flip it.
vi.mock("@/offline/modelMirror", () => ({
  buildMirrorAppConfig: vi.fn(() => null),
  isMirrorEligibleError: vi.fn(() => false),
  isBuiltInMirroredModelId: vi.fn(() => false),
}));

// Stub the worker constructor.
vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });

// Deterministic DEFAULT_LOCAL_MODEL.
vi.mock("@/ai/ModelRegistry", () => ({
  DEFAULT_LOCAL_MODEL: {
    id: "test-model-id",
    displayName: "Test Model",
    approxStorageRequirementMB: 800,
  },
  // Tier ladder — the engine resolves the model through these helpers.
  getLocalModelDefinition: (id: string) =>
    id === "test-model-id"
      ? { id: "test-model-id", displayName: "Test Model", approxStorageRequirementMB: 800 }
      : undefined,
  pickLocalModelForDevice: () => ({ id: "test-model-id", displayName: "Test Model", approxStorageRequirementMB: 800 }),
}));

import { localInferenceEngine, type LocalEngineState } from "@/offline/LocalInferenceEngine";
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { buildMirrorAppConfig, isMirrorEligibleError } from "@/offline/modelMirror";

const createEngineMock = vi.mocked(CreateWebWorkerMLCEngine);
const mirrorConfigMock = vi.mocked(buildMirrorAppConfig);
const eligibleMock = vi.mocked(isMirrorEligibleError);

describe("LocalInferenceEngine state machine", () => {
  beforeEach(() => {
    createEngineMock.mockClear();
    mirrorConfigMock.mockReturnValue(null);
    eligibleMock.mockReturnValue(false);
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

  it("retries from the mirror once when the primary download fails with a network error", async () => {
    eligibleMock.mockReturnValue(true);
    mirrorConfigMock.mockReturnValue({ model_list: [] } as never);
    createEngineMock.mockRejectedValueOnce(new Error("Failed to fetch"));

    const ok = await localInferenceEngine.initialize();

    expect(ok).toBe(true);
    expect(localInferenceEngine.getState()).toBe("ready");
    expect(createEngineMock).toHaveBeenCalledTimes(2);
    // The retry injects the mirrored appConfig into the engine configs.
    const retryConfigs = createEngineMock.mock.calls[1][2] as { appConfig?: unknown };
    expect(retryConfigs?.appConfig).toEqual({ model_list: [] });
  });

  it("does not retry device-shaped failures (a different CDN cannot fix a GPU)", async () => {
    eligibleMock.mockReturnValue(false);
    mirrorConfigMock.mockReturnValue({ model_list: [] } as never);
    createEngineMock.mockRejectedValueOnce(new Error("GPU device lost"));

    const ok = await localInferenceEngine.initialize();

    expect(ok).toBe(false);
    expect(createEngineMock).toHaveBeenCalledTimes(1);
    expect(localInferenceEngine.getState()).toBe("error");
  });

  it("skips the mirror retry when no mirror is configured", async () => {
    eligibleMock.mockReturnValue(true);
    mirrorConfigMock.mockReturnValue(null);
    createEngineMock.mockRejectedValueOnce(new Error("Failed to fetch"));

    const ok = await localInferenceEngine.initialize();

    expect(ok).toBe(false);
    expect(createEngineMock).toHaveBeenCalledTimes(1);
  });
});

describe("LocalInferenceEngine.generate — bounded, interruptible streaming", () => {
  beforeEach(() => {
    createEngineMock.mockReset();
    mirrorConfigMock.mockReturnValue(null);
    eligibleMock.mockReturnValue(false);
    createEngineMock.mockResolvedValue({
      chat: { completions: { create: async function* () {
        yield { choices: [{ delta: { content: "hi" } }] };
      } } },
      unload: vi.fn(async () => {}),
    } as never);
    return localInferenceEngine.unload();
  });
  afterEach(() => localInferenceEngine.unload());

  function engineWithStream(streamFactory: () => AsyncGenerator<any>, extra: Record<string, unknown> = {}) {
    const createSpy = vi.fn((_request: unknown) => streamFactory());
    const interruptSpy = vi.fn(async () => {});
    createEngineMock.mockResolvedValueOnce({
      chat: { completions: { create: createSpy } },
      interruptGenerate: interruptSpy,
      unload: vi.fn(async () => {}),
      ...extra,
    } as never);
    return { createSpy, interruptSpy };
  }

  it("passes an explicit max_tokens output cap to the engine", async () => {
    const { createSpy } = engineWithStream(async function* () {
      yield { choices: [{ delta: { content: "ok" } }] };
    });
    await localInferenceEngine.initialize();
    await localInferenceEngine.generate([{ role: "user", content: "hi" }]);
    const request = createSpy.mock.calls[0][0] as { max_tokens?: number };
    // The old request set no cap: a rambling reply generated until the
    // 2048-token window filled and died mid-sentence with no error.
    expect(request.max_tokens).toBeGreaterThan(0);
    expect(request.max_tokens).toBeLessThanOrEqual(1024);
  });

  it("interrupts the worker when the caller aborts mid-generation", async () => {
    const { interruptSpy } = engineWithStream(async function* () {
      yield { choices: [{ delta: { content: "one" } }] };
      yield { choices: [{ delta: { content: "-two" } }] };
      yield { choices: [{ delta: { content: "-three" } }] };
    });
    await localInferenceEngine.initialize();
    const controller = new AbortController();
    const result = await localInferenceEngine.generate([{ role: "user", content: "hi" }], {
      signal: controller.signal,
      onDelta: () => controller.abort(), // abort right after the first delta
    });
    // Breaking the loop only stops READING — without interruptGenerate() the
    // worker keeps generating and the NEXT message queues behind it.
    expect(interruptSpy).toHaveBeenCalledTimes(1);
    expect(result.content).toBe("one");
    expect(result.error).toBeUndefined();
  });

  it("flags finish_reason=length as an incomplete reply with partial content", async () => {
    engineWithStream(async function* () {
      yield { choices: [{ delta: { content: "long answer" }, finish_reason: null }] };
      yield { choices: [{ delta: {}, finish_reason: "length" }] };
    });
    await localInferenceEngine.initialize();
    const result = await localInferenceEngine.generate([{ role: "user", content: "hi" }]);
    expect(result.content).toBe("long answer");
    expect(result.error).toContain("output limit");
  });

  it("does not flag a clean finish as truncated", async () => {
    engineWithStream(async function* () {
      yield { choices: [{ delta: { content: "done" }, finish_reason: null }] };
      yield { choices: [{ delta: {}, finish_reason: "stop" }] };
    });
    await localInferenceEngine.initialize();
    const result = await localInferenceEngine.generate([{ role: "user", content: "hi" }]);
    expect(result.content).toBe("done");
    expect(result.error).toBeUndefined();
  });
});
