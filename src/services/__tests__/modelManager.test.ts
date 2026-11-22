/**
 * Model manager unit tests — bootstrap ordering, offline pause/resume,
 * consent coherence, cache lifecycle, and the OpenAI-compatible surfaces.
 * web-llm, the engine, BackgroundInstall and device detection are mocked.
 * jsdom has no Worker, so a stub is installed; every mock is re-primed in
 * beforeEach because mock implementations would otherwise leak between tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@mlc-ai/web-llm", () => ({
  CreateWebWorkerMLCEngine: vi.fn(),
  hasModelInCache: vi.fn(),
  deleteModelAllInfoInCache: vi.fn(),
  WebWorkerMLCEngine: class {},
  // modelMirror clones the prebuilt config to build the mirror appConfig —
  // an empty model_list keeps that path real without pulling the 2MB lib.
  prebuiltAppConfig: { model_list: [] },
}));

vi.mock("@/utils/deviceCapabilities", () => ({
  detectDeviceCapabilities: vi.fn(),
  getDeviceMemoryGB: vi.fn(),
  requestPersistentStorage: vi.fn().mockResolvedValue(true),
  getStorageQuota: vi.fn(),
}));

vi.mock("@/offline/BackgroundInstall", () => ({
  getInstallDecision: vi.fn(),
  hasDeviceInstallConsent: vi.fn(),
  markDeviceInstallConsent: vi.fn(),
  startBackgroundInstall: vi.fn().mockResolvedValue(undefined),
  getBackgroundInstallSnapshot: vi.fn(() => ({
    phase: "ready",
    progress: 1,
    progressText: "Ready",
    modelId: null,
    error: null,
  })),
}));

vi.mock("@/offline/LocalInferenceEngine", () => ({
  localInferenceEngine: {
    isLoaded: vi.fn(),
    getCurrentModelId: vi.fn(),
    initialize: vi.fn(),
    unload: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    getState: vi.fn(),
    generate: vi.fn(),
  },
}));

import {
  CreateWebWorkerMLCEngine,
  hasModelInCache as webllmHasModelInCache,
  deleteModelAllInfoInCache,
} from "@mlc-ai/web-llm";
import {
  detectDeviceCapabilities,
  getDeviceMemoryGB,
  getStorageQuota,
  requestPersistentStorage,
} from "@/utils/deviceCapabilities";
import { getInstallDecision, hasDeviceInstallConsent, markDeviceInstallConsent, startBackgroundInstall } from "@/offline/BackgroundInstall";
import { localInferenceEngine } from "@/offline/LocalInferenceEngine";
import {
  bootstrapDefaultModels,
  deleteCachedModel,
  generateChatCompletion,
  generateEmbeddings,
  getModelManagerSnapshot,
  hasModelInCache,
  initModelManager,
  switchActiveModel,
  __resetModelManagerForTests,
} from "@/services/modelManager";

const detectMock = vi.mocked(detectDeviceCapabilities);
const memoryMock = vi.mocked(getDeviceMemoryGB);
const quotaMock = vi.mocked(getStorageQuota);
const cacheMock = vi.mocked(webllmHasModelInCache);
const deleteCacheMock = vi.mocked(deleteModelAllInfoInCache);
const createMock = vi.mocked(CreateWebWorkerMLCEngine);
const decisionMock = vi.mocked(getInstallDecision);
const consentMock = vi.mocked(hasDeviceInstallConsent);
const markConsentMock = vi.mocked(markDeviceInstallConsent);
const startInstallMock = vi.mocked(startBackgroundInstall);
const engineMock = localInferenceEngine as unknown as {
  isLoaded: ReturnType<typeof vi.fn>;
  getCurrentModelId: ReturnType<typeof vi.fn>;
  initialize: ReturnType<typeof vi.fn>;
  unload: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  getState: ReturnType<typeof vi.fn>;
  generate: ReturnType<typeof vi.fn>;
};

const ARCTIC_M = "snowflake-arctic-embed-m-q0f32-MLC-b4";
const CHAT_1B = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const CHAT_05B = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

function caps(over: { webgpu?: boolean; memory?: number } = {}) {
  return {
    webgpu: over.webgpu ?? true,
    adapter:
      over.webgpu === false
      ? null
      : {
          maxBufferSize: 4 * 1024 * 1024 * 1024,
          maxComputeWorkgroupStorageSize: 16384,
          isFallbackAdapter: false,
          shaderF16: true,
        },
    deviceMemoryGB: over.memory ?? 8,
    deviceMemoryEstimated: false,
    isMobileUA: false,
    storagePersisted: true,
    storage: { usageMB: 0, quotaMB: 20480, availableMB: 20480 },
    recommendedTier: "desktop/full" as const,
  };
}

beforeEach(() => {
  __resetModelManagerForTests();
  vi.clearAllMocks();
  // jsdom has no Worker — the manager spawns one per engine.
  vi.stubGlobal(
    "Worker",
    class {
      terminate() {}
      addEventListener() {}
    },
  );

  detectMock.mockResolvedValue(caps());
  memoryMock.mockReturnValue({ gb: 8, estimated: false });
  quotaMock.mockResolvedValue({ usageMB: 100, quotaMB: 20480, availableMB: 20380, persisted: true });
  cacheMock.mockResolvedValue(false);
  deleteCacheMock.mockResolvedValue(undefined);
  createMock.mockResolvedValue({ unload: vi.fn() } as never);
  decisionMock.mockReturnValue(null);
  // Existing tests exercise the post-consent bootstrap; the consent-gate
  // behavior gets its own explicit tests below.
  consentMock.mockReturnValue(true);
  markConsentMock.mockReturnValue(undefined);
  startInstallMock.mockResolvedValue(undefined);
  engineMock.isLoaded.mockReturnValue(false);
  engineMock.getCurrentModelId.mockReturnValue(CHAT_1B);
  engineMock.initialize.mockResolvedValue(true);
  engineMock.unload.mockResolvedValue(undefined);
  engineMock.getState.mockReturnValue("idle");
  engineMock.subscribe.mockImplementation(() => () => {});
  engineMock.generate.mockResolvedValue({
    content: "ok",
    source: "local",
    modelUsed: CHAT_1B,
  });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("bootstrapDefaultModels — ordering and outcomes", () => {
  it("downloads the embedding model first, then kicks the chat background install", async () => {
    await bootstrapDefaultModels(undefined, "uid-1");

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][1]).toBe(ARCTIC_M); // ≥8GB → arctic-m
    expect(startInstallMock).toHaveBeenCalledWith("uid-1");
    // order: embeddings engine before the chat install
    expect(startInstallMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      createMock.mock.invocationCallOrder[0],
    );
    expect(getModelManagerSnapshot().phase).toBe("ready");
  });

  it("skips the embeddings download when the model is already cached", async () => {
    cacheMock.mockImplementation(async (id: string) => id === ARCTIC_M);
    await bootstrapDefaultModels();
    expect(createMock).not.toHaveBeenCalled();
    expect(startInstallMock).toHaveBeenCalled();
  });

  it("does nothing without WebGPU — phase unsupported, clear user message", async () => {
    detectMock.mockResolvedValue(caps({ webgpu: false }));
    await bootstrapDefaultModels();
    expect(createMock).not.toHaveBeenCalled();
    expect(startInstallMock).not.toHaveBeenCalled();
    const s = getModelManagerSnapshot();
    expect(s.phase).toBe("unsupported");
    expect(s.error).toMatch(/no WebGPU/i);
  });

  it("does nothing when the one-time ask was declined", async () => {
    decisionMock.mockReturnValue("declined");
    await bootstrapDefaultModels(undefined, "uid-1");
    expect(createMock).not.toHaveBeenCalled();
    expect(startInstallMock).not.toHaveBeenCalled();
    expect(getModelManagerSnapshot().phase).toBe("idle");
  });

  it("downloads nothing without device consent — silent idle, no error (guest consent gate)", async () => {
    consentMock.mockReturnValue(false);
    await bootstrapDefaultModels(undefined, "uid-1");
    expect(createMock).not.toHaveBeenCalled();
    expect(startInstallMock).not.toHaveBeenCalled();
    const s = getModelManagerSnapshot();
    expect(s.phase).toBe("idle");
    expect(s.error).toBeNull();
  });

  it("latches device consent when a model is activated via switchActiveModel", async () => {
    engineMock.isLoaded.mockReturnValue(false);
    await switchActiveModel(CHAT_1B);
    expect(markConsentMock).toHaveBeenCalled();
    expect(engineMock.initialize).toHaveBeenCalledWith(undefined, CHAT_1B);
  });

  it("pauses offline instead of failing; resumes cleanly when back online", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    initModelManager({ uid: "uid-1" });
    expect(getModelManagerSnapshot().phase).toBe("waiting-idle");
    expect(vi.mocked(requestPersistentStorage)).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3000); // idle delay fires
    expect(getModelManagerSnapshot().phase).toBe("paused-offline");
    expect(createMock).not.toHaveBeenCalled();

    // back online → automatic resume (cached shards would skip)
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    expect(createMock).toHaveBeenCalled();
    expect(startInstallMock).toHaveBeenCalledWith("uid-1");
  });

  it("reports a storage shortfall for the chat model as a failed phase", async () => {
    quotaMock.mockResolvedValue({ usageMB: 0, quotaMB: 100, availableMB: 50, persisted: true });
    cacheMock.mockImplementation(async (id: string) => id !== ARCTIC_M && id !== CHAT_1B);
    await bootstrapDefaultModels();
    const s = getModelManagerSnapshot();
    expect(s.phase).toBe("failed");
    expect(s.error).toMatch(/storage/i);
    expect(startInstallMock).not.toHaveBeenCalled();
  });

  it("keeps going to the chat model when embeddings fail", async () => {
    createMock.mockRejectedValueOnce(new Error("adapter vanished"));
    await bootstrapDefaultModels();
    const s = getModelManagerSnapshot();
    expect(s.embeddingError).toMatch(/adapter vanished/);
    expect(startInstallMock).toHaveBeenCalled();
    expect(s.phase).toBe("ready");
  });

  it("is idempotent — a second concurrent call returns immediately", async () => {
    let releaseCreate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    createMock.mockImplementation(
      () =>
        gate.then(() => ({ unload: vi.fn() })) as unknown as Promise<never> &
          import("@mlc-ai/web-llm").WebWorkerMLCEngine,
    );
    const first = bootstrapDefaultModels();
    const second = bootstrapDefaultModels();
    releaseCreate();
    await Promise.allSettled([first, second]);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

describe("cache lifecycle", () => {
  it("hasModelInCache passes through to web-llm and degrades to false on error", async () => {
    cacheMock.mockResolvedValueOnce(true);
    await expect(hasModelInCache(CHAT_1B)).resolves.toBe(true);
    cacheMock.mockRejectedValueOnce(new Error("boom"));
    await expect(hasModelInCache(CHAT_1B)).resolves.toBe(false);
  });

  it("deleteCachedModel unloads the active chat model first, then clears cache", async () => {
    engineMock.isLoaded.mockReturnValue(true);
    engineMock.getCurrentModelId.mockReturnValue(CHAT_1B);
    await deleteCachedModel(CHAT_1B);
    expect(engineMock.unload).toHaveBeenCalledTimes(1);
    expect(deleteCacheMock).toHaveBeenCalledWith(CHAT_1B, undefined);
  });

  it("deleteCachedModel also clears mirror-keyed cache for mirrored models (no orphaned shards)", async () => {
    engineMock.isLoaded.mockReturnValue(false);
    await deleteCachedModel(CHAT_05B); // built-in-mirrored 0.5B twin
    expect(deleteCacheMock).toHaveBeenCalledTimes(2);
    // second attempt runs under the mirror appConfig — without it, "Clear"
    // left ~600MB+ of mirror shards orphaned in the Cache API
    expect(deleteCacheMock.mock.calls[1][1]).toBeDefined();
  });

  it("deleteCachedModel uses only the default config for non-mirrored models", async () => {
    engineMock.isLoaded.mockReturnValue(false);
    await deleteCachedModel(CHAT_1B); // HF-only 1B starter
    expect(deleteCacheMock).toHaveBeenCalledTimes(1);
  });

  it("deleteCachedModel throws when web-llm cannot delete (visible in UI)", async () => {
    engineMock.isLoaded.mockReturnValue(false);
    deleteCacheMock.mockRejectedValueOnce(new Error("locked"));
    await expect(deleteCachedModel(CHAT_1B)).rejects.toThrow("locked");
  });
});

describe("switchActiveModel", () => {
  it("rejects unknown model ids", async () => {
    await expect(switchActiveModel("not-a-model")).resolves.toBe(false);
  });

  it("re-targets the embedding engine for embedding models", async () => {
    await expect(switchActiveModel(ARCTIC_M)).resolves.toBe(true);
    expect(createMock).toHaveBeenCalledWith(expect.anything(), ARCTIC_M, expect.anything());
  });

  it("no-ops when the requested chat model is already active", async () => {
    engineMock.isLoaded.mockReturnValue(true);
    engineMock.getCurrentModelId.mockReturnValue(CHAT_1B);
    await expect(switchActiveModel(CHAT_1B)).resolves.toBe(true);
    expect(engineMock.unload).not.toHaveBeenCalled();
    expect(engineMock.initialize).not.toHaveBeenCalled();
  });

  it("unloads then initializes a different chat model", async () => {
    engineMock.isLoaded.mockReturnValue(true);
    engineMock.getCurrentModelId.mockReturnValue(CHAT_05B);
    await expect(switchActiveModel(CHAT_1B)).resolves.toBe(true);
    expect(engineMock.unload).toHaveBeenCalledTimes(1);
    expect(engineMock.initialize).toHaveBeenCalledWith(undefined, CHAT_1B);
  });
});

describe("OpenAI-compatible surfaces", () => {
  it("generateChatCompletion fails with a clear message when the model is not cached", async () => {
    engineMock.isLoaded.mockReturnValue(false);
    cacheMock.mockResolvedValue(false);
    const res = await generateChatCompletion([{ role: "user", content: "hi" }]);
    expect(res.error).toMatch(/not cached yet|downloading in the background/i);
    expect(engineMock.generate).not.toHaveBeenCalled();
  });

  it("generateChatCompletion activates a cached model and delegates generation", async () => {
    // guard check sees "not loaded", post-initialize re-check sees "loaded"
    engineMock.isLoaded.mockReturnValueOnce(false).mockReturnValue(true);
    cacheMock.mockResolvedValue(true);
    const res = await generateChatCompletion([{ role: "user", content: "hi" }], { temperature: 0.4 });
    expect(engineMock.initialize).toHaveBeenCalledWith(undefined, CHAT_1B);
    expect(engineMock.generate).toHaveBeenCalled();
    expect(res.content).toBe("ok");
  });

  it("generateEmbeddings returns an OpenAI-shaped response", async () => {
    createMock.mockResolvedValueOnce({
      unload: vi.fn(),
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2], index: 0, object: "embedding" }],
          model: ARCTIC_M,
          object: "list",
          usage: { prompt_tokens: 5, total_tokens: 5, extra: { prefill_tokens_per_s: 10 } },
        }),
      },
    } as never);
    const res = await generateEmbeddings(["hello world"]);
    expect(res.object).toBe("list");
    expect(res.model).toBe(ARCTIC_M);
    expect(res.data[0].embedding).toEqual([0.1, 0.2]);
    expect(res.usage).toEqual({ prompt_tokens: 5, total_tokens: 5 });
  });
});
