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
    hasModelInCache: vi.fn(async () => false),
    deleteModelAllInfoInCache: vi.fn(async () => {}),
  };
});

// Mirror module — default to "mirror disabled"; the watchdog test relies on
// the default (a stalled install fails fast instead of mirror-retrying).
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
  getLocalModelDefinition: (id: string) =>
    id === "test-model-id" || id === "test-model-b"
      ? { id, displayName: "Test Model", approxStorageRequirementMB: 800 }
      : undefined,
  pickLocalModelForDevice: () => ({ id: "test-model-id", displayName: "Test Model", approxStorageRequirementMB: 800 }),
}));

import { localInferenceEngine } from "@/offline/LocalInferenceEngine";
import { CreateWebWorkerMLCEngine, deleteModelAllInfoInCache, hasModelInCache } from "@mlc-ai/web-llm";

const createEngineMock = vi.mocked(CreateWebWorkerMLCEngine);
const cacheCheckMock = vi.mocked(hasModelInCache);
const cacheDeleteMock = vi.mocked(deleteModelAllInfoInCache);

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
    cacheCheckMock.mockReset().mockResolvedValue(false);
    cacheDeleteMock.mockReset().mockResolvedValue(undefined);
    vi.unstubAllGlobals();
    vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });
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

  it("NEVER adopts an in-flight init of a different model — waits for it, then loads the requested one", async () => {
    // Regression: switchActiveModel("3B") while the bootstrap's 1B init is in
    // flight used to adopt the 1B run and report "Model activated." while the
    // wrong model loaded.
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    createEngineMock.mockImplementationOnce(async () => {
      await firstGate;
      return healthyEngine("a");
    });
    createEngineMock.mockResolvedValueOnce(healthyEngine("b"));

    const first = localInferenceEngine.initialize(undefined, "test-model-id");
    const second = localInferenceEngine.initialize(undefined, "test-model-b");
    releaseFirst(); // both calls are queued — the first init settles now
    const results = await Promise.all([first, second]);

    expect(results).toEqual([true, true]);
    // Two separate engine builds — one per model, never a cross-model adoption
    expect(createEngineMock).toHaveBeenCalledTimes(2);
    expect(createEngineMock.mock.calls[0][1]).toBe("test-model-id");
    expect(createEngineMock.mock.calls[1][1]).toBe("test-model-b");
    expect(localInferenceEngine.getCurrentModelId()).toBe("test-model-b");
    expect(localInferenceEngine.isLoaded()).toBe(true);
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

  // ── Corrupt-cache self-healing ─────────────────────────────────────────
  it("wipes a corrupt cache and retries once when init fails with a data-shaped error", async () => {
    // A browser crash truncated a cached shard: init throws a parse error —
    // never network-shaped, so the mirror retry skips it — and without
    // self-healing every later attempt failed against the same poisoned
    // bytes until the user manually cleared the cache.
    cacheCheckMock.mockResolvedValue(true);
    createEngineMock
      .mockRejectedValueOnce(new Error("Failed to parse model config: Unexpected token < in JSON"))
      .mockResolvedValueOnce(healthyEngine("healed"));

    const ok = await localInferenceEngine.initialize();
    expect(ok).toBe(true);
    expect(localInferenceEngine.getState()).toBe("ready");
    expect(cacheDeleteMock).toHaveBeenCalledTimes(1);
    expect(createEngineMock).toHaveBeenCalledTimes(2); // failed + post-wipe retry
  }, 5_000);

  it("does NOT wipe the cache on GPU-shaped errors (a re-download cannot fix a driver)", async () => {
    cacheCheckMock.mockResolvedValue(true);
    createEngineMock.mockRejectedValue(new Error("WebGPU device was lost during initialization"));

    const ok = await localInferenceEngine.initialize();
    expect(ok).toBe(false);
    expect(cacheDeleteMock).not.toHaveBeenCalled();
    expect(createEngineMock).toHaveBeenCalledTimes(1);
    expect(localInferenceEngine.getState()).toBe("error");
  }, 5_000);

  it("skips the cache wipe when nothing is cached (no pointless re-download)", async () => {
    cacheCheckMock.mockResolvedValue(false);
    createEngineMock.mockRejectedValue(new Error("Unexpected end of data while decoding weights"));

    const ok = await localInferenceEngine.initialize();
    expect(ok).toBe(false);
    expect(cacheDeleteMock).not.toHaveBeenCalled();
    expect(createEngineMock).toHaveBeenCalledTimes(1);
  }, 5_000);

  // ── One engine per device: Web Locks tab guard ─────────────────────────
  it("stands down when another tab holds the device engine lock", async () => {
    // Tab B must not spawn a second engine against the same GPU — the
    // classic weak-device failure where BOTH tabs die of device-lost.
    let calls = 0;
    vi.stubGlobal("navigator", {
      userAgent: "test-agent",
      locks: {
        request: vi.fn((_name: string, _opts: unknown, cb: (lock: unknown) => unknown) => {
          calls += 1;
          cb(null); // lock held by another tab — not granted
          return Promise.resolve(null);
        }),
      },
    });
    try {
      const ok = await localInferenceEngine.initialize();
      expect(ok).toBe(false);
      expect(calls).toBe(1);
      expect(createEngineMock).not.toHaveBeenCalled(); // no second GPU context
      expect(localInferenceEngine.getState()).toBe("idle");
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });
    }
  }, 5_000);

  it("takes the device engine lock when free and releases it on unload", async () => {
    let released = 0;
    const holdPromise = new Promise<void>((r) => { /* resolved via the callback's hold */ });
    vi.stubGlobal("navigator", {
      userAgent: "test-agent",
      locks: {
        request: vi.fn((_name: string, _opts: unknown, cb: (lock: unknown) => unknown) => {
          // Grant the lock; keep it held until the returned hold resolves.
          const hold = cb({ name: "shadowtalk-local-engine.v1" }) as Promise<void>;
          return (async () => {
            await hold;
            released += 1;
          })();
        }),
      },
    });
    void holdPromise;
    try {
      const ok = await localInferenceEngine.initialize();
      expect(ok).toBe(true);
      expect(createEngineMock).toHaveBeenCalledTimes(1);
      expect(released).toBe(0); // held while the engine is loaded
      await localInferenceEngine.unload();
      // The hold resolves asynchronously — give the lock manager mock a tick.
      await new Promise((r) => setTimeout(r, 0));
      expect(released).toBe(1); // freed for the next tab
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });
    }
  }, 5_000);

  it("degrades to legacy behavior when the Web Locks API is unavailable", async () => {
    vi.stubGlobal("navigator", { userAgent: "test-agent" }); // no locks
    try {
      const ok = await localInferenceEngine.initialize();
      expect(ok).toBe(true);
      expect(createEngineMock).toHaveBeenCalledTimes(1);
      expect(localInferenceEngine.getState()).toBe("ready");
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });
    }
  }, 5_000);
});
