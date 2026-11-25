/**
 * LocalInferenceEngine — failure-reason surfacing.
 *
 * initialize() reports failures as `false`; the engine must ALSO expose WHY
 * via getLastError() so the UI (setup wizard, model switcher toast, model
 * manager, status card) can show the real cause — missing WebGPU, GPU-less
 * adapters, watchdog timeouts — instead of a generic dead-end.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@mlc-ai/web-llm", () => ({
  prebuiltAppConfig: {
    model_list: [
      {
        model_id: "test-model-id",
        model: "https://cdn.test/test-model",
        model_lib: "https://cdn.test/libs/test.wasm",
      },
    ],
  },
  CreateWebWorkerMLCEngine: vi.fn(),
  hasModelInCache: vi.fn(async () => false),
  deleteModelAllInfoInCache: vi.fn(async () => {}),
}));

vi.mock("@/offline/modelMirror", () => ({
  buildMirrorAppConfig: vi.fn(() => null),
  isMirrorEligibleError: vi.fn(() => false),
  isBuiltInMirroredModelId: vi.fn(() => false),
}));

vi.mock("@/ai/ModelRegistry", () => ({
  DEFAULT_LOCAL_MODEL: {
    id: "test-model-id",
    displayName: "Test Model",
    approxStorageRequirementMB: 800,
  },
  getLocalModelDefinition: (id: string) =>
    id === "test-model-id"
      ? { id, displayName: "Test Model", approxStorageRequirementMB: 800 }
      : undefined,
  pickLocalModelForDevice: () => ({ id: "test-model-id", displayName: "Test Model", approxStorageRequirementMB: 800 }),
}));

vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });

import { localInferenceEngine } from "@/offline/LocalInferenceEngine";
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

const createEngineMock = vi.mocked(CreateWebWorkerMLCEngine);

describe("LocalInferenceEngine.getLastError", () => {
  beforeEach(() => {
    createEngineMock.mockReset();
    vi.unstubAllGlobals();
    vi.stubGlobal("Worker", class { constructor() {} postMessage() {} terminate() {} });
    return localInferenceEngine.unload();
  });

  afterEach(() => localInferenceEngine.unload());

  it("fails fast with actionable guidance when navigator.gpu is missing entirely", async () => {
    // happy-dom navigator has no `gpu` — exactly the browser-without-WebGPU case.
    vi.stubGlobal("navigator", { onLine: true, userAgent: "vitest" });

    const ok = await localInferenceEngine.initialize();

    expect(ok).toBe(false);
    expect(createEngineMock).not.toHaveBeenCalled();
    const reason = localInferenceEngine.getLastError();
    expect(reason).toContain("does not expose WebGPU");
    expect(reason).toContain("hardware acceleration");
    expect(localInferenceEngine.getState()).toBe("error");
  });

  it("surfaces web-llm's GPU error with guidance instead of swallowing it", async () => {
    vi.stubGlobal("navigator", { gpu: {}, onLine: true, deviceMemory: undefined, userAgent: "vitest" });
    createEngineMock.mockRejectedValue(
      new Error(
        "Unable to find a compatible GPU. This issue might be because your computer doesn't have a GPU, " +
          "or your system settings are not configured properly.",
      ),
    );

    const ok = await localInferenceEngine.initialize();

    expect(ok).toBe(false);
    const reason = localInferenceEngine.getLastError();
    expect(reason).toContain("Unable to find a compatible GPU");
    // The web-llm message alone leaves users in a dead-end loop — the reason
    // must carry the fix (hardware acceleration setting / chrome://gpu).
    expect(reason).toContain("hardware acceleration");
    expect(localInferenceEngine.getState()).toBe("error");
  });

  it("clears the stale reason when a later init succeeds", async () => {
    vi.stubGlobal("navigator", { gpu: {}, onLine: true, deviceMemory: undefined, userAgent: "vitest" });
    createEngineMock
      .mockRejectedValueOnce(new Error("Unable to find a compatible GPU"))
      .mockResolvedValue({
        chat: { completions: { create: async function* () { yield { choices: [{ delta: { content: "hi" } }] }; } } },
        unload: vi.fn(async () => {}),
      } as never);

    expect(await localInferenceEngine.initialize()).toBe(false);
    expect(localInferenceEngine.getLastError()).toContain("compatible GPU");

    expect(await localInferenceEngine.initialize()).toBe(true);
    expect(localInferenceEngine.getLastError()).toBeNull();
    expect(localInferenceEngine.getState()).toBe("ready");
  });

  it("names the owning tab when the device engine lock is held elsewhere", async () => {
    vi.stubGlobal("navigator", {
      gpu: {},
      onLine: true,
      userAgent: "vitest",
      locks: {
        request: vi.fn(async (_name: string, _opts: unknown, cb: (lock: unknown) => void) => {
          cb(null); // lock unavailable — another tab owns the engine
          return null;
        }),
      },
    });

    const ok = await localInferenceEngine.initialize();

    expect(ok).toBe(false);
    expect(createEngineMock).not.toHaveBeenCalled();
    expect(localInferenceEngine.getLastError()).toContain("another tab");
  });
});
