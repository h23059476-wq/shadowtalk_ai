/**
 * LocalInferenceEngine recovery — the "local models never fail" guarantees.
 *
 *  1. prewarm() adopts an in-flight initialize instead of racing a second
 *     engine against the same GPU.
 *  2. initialize() cannot hang forever: a no-progress watchdog terminates
 *     the wedged worker and fails fast (mirror retry still applies).
 *  3. generate() runs a retry ladder — silence-watchdog retry, then a full
 *     engine re-init (WebGPU device lost) — so a hung worker yields a reply
 *     or an honest error instead of an eternal spinner.
 *  4. The hard generation cap returns the partial reply WITHOUT retrying
 *     (a retry would just hit the same cap again).
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
  };
});

// Mirror module — default to "mirror disabled"; the watchdog test relies on
// the default (a stalled install fails fast instead of mirror-retrying).
vi.mock("@/offline/modelMirror", () => ({
  buildMirrorAppConfig: vi.fn(() => null),
  isMirrorEligibleError: vi.fn(() => false),
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
  getLocalModelDefinition: (id: string) =>
    id === "test-model-id"
      ? { id: "test-model-id", displayName: "Test Model", approxStorageRequirementMB: 800 }
      : undefined,
  pickLocalModelForDevice: () => ({ id: "test-model-id", displayName: "Test Model", approxStorageRequirementMB: 800 }),
}));

import { localInferenceEngine } from "@/offline/LocalInferenceEngine";
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

const createEngineMock = vi.mocked(CreateWebWorkerMLCEngine);

function healthyEngine(reply: string, extra: Record<string, unknown> = {}) {
  return {
    chat: { completions: { create: vi.fn(() => (async function* () {
      yield { choices: [{ delta: { content: reply } }] };
    })()) } },
    interruptGenerate: vi.fn(async () => {}),
    unload: vi.fn(async () => {}),
    ...extra,
  } as never;
}

describe("LocalInferenceEngine recovery", () => {
  beforeEach(() => {
    createEngineMock.mockReset();
    createEngineMock.mockResolvedValue(healthyEngine("hi"));
    return localInferenceEngine.unload();
  });
  afterEach(() => localInferenceEngine.unload());

  it("prewarm() adopts the in-flight initialize instead of racing a second engine", async () => {
    const first = localInferenceEngine.prewarm();
    const second = localInferenceEngine.prewarm();
    const results = await Promise.all([first, second]);
    expect(results).toEqual([true, true]);
    expect(createEngineMock).toHaveBeenCalledTimes(1);
    expect(localInferenceEngine.getState()).toBe("ready");
  });

  it("prewarm() is a no-op when the engine is already loaded", async () => {
    await localInferenceEngine.initialize();
    expect(createEngineMock).toHaveBeenCalledTimes(1);
    const ok = await localInferenceEngine.prewarm();
    expect(ok).toBe(true);
    expect(createEngineMock).toHaveBeenCalledTimes(1);
  });

  it("initialize fails fast (watchdog) when the worker never reports progress", async () => {
    // The create promise pends forever — the watchdog must terminate the
    // worker and reject instead of leaving the engine wedged in
    // downloading/loading for the whole session.
    createEngineMock.mockImplementation(() => new Promise(() => {}));
    const ok = await localInferenceEngine.initialize(undefined, undefined, { initIdleTimeoutMs: 20 });
    expect(ok).toBe(false);
    expect(localInferenceEngine.getState()).toBe("error");
    // The engine can start over afterwards (e.g. the next prewarm).
    createEngineMock.mockResolvedValue(healthyEngine("back"));
    const retry = await localInferenceEngine.initialize();
    expect(retry).toBe(true);
    expect(localInferenceEngine.getState()).toBe("ready");
  }, 5_000);

  it("retries a hung generation (silence watchdog) and recovers via re-init", async () => {
    // Engine 1: emits one token, then the worker hangs forever.
    createEngineMock
      .mockResolvedValueOnce({
        chat: { completions: { create: vi.fn(() => (async function* () {
          yield { choices: [{ delta: { content: "one" } }] };
          await new Promise(() => {}); // wedged worker
        })()) } },
        interruptGenerate: vi.fn(async () => {}),
        unload: vi.fn(async () => {}),
      } as never)
      .mockResolvedValueOnce(healthyEngine("recovered"));

    await localInferenceEngine.initialize();
    const result = await localInferenceEngine.generate(
      [{ role: "user", content: "hi" }],
      { generationIdleTimeoutMs: 20 },
    );
    // The ladder retried, re-initialized the engine, and still delivered.
    expect(result.content).toBe("recovered");
    expect(result.error).toBeUndefined();
    expect(createEngineMock).toHaveBeenCalledTimes(2); // initial + re-init
    expect(localInferenceEngine.getState()).toBe("ready");
  }, 5_000);

  it("retries a crashed stream, then recovers with a full engine re-init", async () => {
    // Engine 1: every create() throws (WebGPU device lost mid-run).
    createEngineMock
      .mockResolvedValueOnce({
        chat: { completions: { create: vi.fn(async () => {
          throw new Error("WebGPU device lost during generation");
        }) } },
        interruptGenerate: vi.fn(async () => {}),
        unload: vi.fn(async () => {}),
      } as never)
      .mockResolvedValueOnce(healthyEngine("recovered"));

    await localInferenceEngine.initialize();
    const result = await localInferenceEngine.generate([{ role: "user", content: "hi" }]);
    expect(result.content).toBe("recovered");
    expect(result.error).toBeUndefined();
    expect(createEngineMock).toHaveBeenCalledTimes(2);
  }, 5_000);

  it("returns the partial reply when the hard generation cap hits (no retry)", async () => {
    // Tokens keep flowing but far too slowly for the device: past the hard
    // cap the partial reply is returned honestly — a retry would run into
    // the same cap again.
    createEngineMock.mockResolvedValueOnce({
      chat: { completions: { create: vi.fn(() => (async function* () {
        for (let i = 0; i < 100; i++) {
          await new Promise((r) => setTimeout(r, 10));
          yield { choices: [{ delta: { content: "x" } }] };
        }
      })()) } },
      interruptGenerate: vi.fn(async () => {}),
      unload: vi.fn(async () => {}),
    } as never);

    await localInferenceEngine.initialize();
    const result = await localInferenceEngine.generate(
      [{ role: "user", content: "hi" }],
      { generationHardTimeoutMs: 60 },
    );
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.error).toContain("too long");
    expect(createEngineMock).toHaveBeenCalledTimes(1); // no ladder retry
  }, 5_000);
});
