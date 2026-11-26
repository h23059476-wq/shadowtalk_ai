/**
 * Tier 3 image router tests — the BYOK → ZeroGPU → shared resolution chain
 * in imageGen.ts, including encrypted asset persistence, error-fallback
 * semantics, and the offline notice.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";

vi.stubGlobal("crypto", webcrypto);

// ── Swap the ZeroGPU tier per test (real error classes stay) ───────────────
const zerogpuMock = vi.hoisted(() => ({
  available: true,
  impl: null as null | ((prompt: string, options?: Record<string, unknown>) => Promise<unknown>),
}));

vi.mock("@/lib/providers/zeroGpuSpaceProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/providers/zeroGpuSpaceProvider")>();
  return {
    ...actual,
    isZeroGpuSpaceAvailable: () => zerogpuMock.available,
    generateImageViaZeroGpu: (prompt: string, options?: Record<string, unknown>) =>
      zerogpuMock.impl
        ? zerogpuMock.impl(prompt, options)
        : Promise.reject(new actual.ZeroGpuError("unknown", "no fake impl configured")),
  };
});

// ── Firebase auth mock (BYOK + shared eligibility) ─────────────────────────
const authMock = vi.hoisted(() => ({ uid: "test-uid-123" as string | null }));

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({
    currentUser: authMock.uid
      ? {
          uid: authMock.uid,
          getIdToken: () => Promise.resolve("test-id-token"),
        }
      : null,
  }),
  functionsBaseUrl: "https://test.functions.example.com",
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

import { ZeroGpuError } from "@/lib/providers/zeroGpuSpaceProvider";
import {
  IMAGE_OFFLINE_NOTICE,
  generateImageWithFallback,
  isImageGenerationReady,
} from "@/lib/imageGen";
import { estimateImageAssetUsage, loadImageAssetBlob } from "@/lib/imageAssetStore";

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

function fakeZerogpuResult() {
  return {
    blob: new Blob([PNG_BYTES], { type: "image/png" }),
    mimeType: "image/png",
    spaceId: "black-forest-labs/FLUX.1-schnell",
    endpoint: "/infer",
    seed: 42,
    usingHfToken: false,
  };
}

function setByok(provider: string, status: number, body: unknown): void {
  localStorageMock.setItem(
    "shadowtalk.byok.v2.test-uid-123",
    JSON.stringify({ provider, apiKey: "sk-test-key-12345678", model: "", mode: "always" }),
  );
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status }) as Response,
  );
}

beforeEach(async () => {
  localStorageMock.clear();
  authMock.uid = "test-uid-123";
  globalThis.indexedDB = new IDBFactory();
  zerogpuMock.available = true;
  zerogpuMock.impl = async () => fakeZerogpuResult();
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("crypto", webcrypto);
  // Happy-dom lacks URL.createObjectURL.
  if (typeof URL.createObjectURL !== "function") {
    Object.defineProperty(URL, "createObjectURL", { value: () => `blob:st-${Math.random()}`, configurable: true, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: () => undefined, configurable: true, writable: true });
  }
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.stubGlobal("crypto", webcrypto);
});

describe("resolution order", () => {
  it("routes to the free ZeroGPU tier when no BYOK key exists", async () => {
    const result = await generateImageWithFallback("a snowy owl", { watermark: false });
    expect(result.source).toBe("zerogpu");
    expect(result.imageUrl).toMatch(/^blob:/);
    expect(result.imageAssetId).toMatch(/^stimg_[0-9a-f]{24}$/);
  });

  it("persists the generated image as an encrypted IndexedDB asset", async () => {
    const result = await generateImageWithFallback("a snowy owl", { watermark: false });
    const usage = await estimateImageAssetUsage();
    expect(usage.count).toBe(1);
    const restored = await loadImageAssetBlob(result.imageAssetId!);
    expect(Array.from(new Uint8Array(await restored.arrayBuffer()))).toEqual(Array.from(PNG_BYTES));
  });

  it("prefers the user's BYOK key over ZeroGPU", async () => {
    localStorageMock.setItem(
      "shadowtalk.byok.v2.test-uid-123",
      JSON.stringify({ provider: "openai", apiKey: "sk-test-key-12345678", model: "", mode: "always" }),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [{ url: "https://cdn.example.com/x.png" }] }), { status: 200 }) as Response,
    );
    const result = await generateImageWithFallback("a cat", { watermark: false });
    expect(result.source).toBe("byok");
    expect(result.imageUrl).toBe("https://cdn.example.com/x.png");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("api.openai.com");
    expect(await estimateImageAssetUsage()).toEqual({ count: 0, bytes: 0 }); // untouched
  });

  it("skips ZeroGPU for reference-image edits (needs BYOK models)", async () => {
    const spy = vi.fn(async () => fakeZerogpuResult());
    zerogpuMock.impl = spy as unknown as typeof zerogpuMock.impl;
    await expect(generateImageWithFallback("enhance this", { watermark: false, referenceImage: "data:image/png;base64,AAA" }))
      .rejects.toThrow(/quick setup|unavailable|image generation/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("degrades a fallback-worthy BYOK failure to ZeroGPU", async () => {
    setByok("openai", 500, { error: { message: "OpenAI is unreachable" } });
    // "Could not reach" is the fallback-worthy phrasing the BYOK layer emits.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("api.openai.com")) {
        throw new Error("Could not reach OpenAI (network or DNS failure). Check your connection.");
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    const result = await generateImageWithFallback("a cat", { watermark: false });
    expect(result.source).toBe("zerogpu");
  });

  it("surfaces BYOK auth rejections instead of masking them with the free tier", async () => {
    setByok("openai", 401, { error: { message: "Incorrect API key provided" } });
    await expect(generateImageWithFallback("a cat", { watermark: false }))
      .rejects.toThrow(/key was rejected \(401\)/);
    expect(await estimateImageAssetUsage()).toEqual({ count: 0, bytes: 0 });
  });
});

describe("ZeroGPU error fallback", () => {
  it("degrades a quota-exceeded run to the shared pool when shared mode is active", async () => {
    localStorageMock.setItem("shadowtalk.ai-access-mode.v1.test-uid-123", "shared");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/generateImage")) {
        return new Response(JSON.stringify({ data: [{ b64_json: "data:image/png;base64,AAA" }] }), { status: 200 }) as Response;
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    zerogpuMock.impl = async () => {
      throw new ZeroGpuError("quota", "quota exceeded", 300);
    };
    const result = await generateImageWithFallback("a cat", { watermark: false });
    expect(result.source).toBe("shared");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/generateImage");
  });

  it("returns a clean quota message with countdown + connect hint when nothing else exists", async () => {
    zerogpuMock.impl = async () => {
      throw new ZeroGpuError("quota", "quota exceeded", 984);
    };
    // 984 s → ceiling 17 min — the copy never promises an earlier reset.
    await expect(generateImageWithFallback("a cat", { watermark: false })).rejects.toThrow(
      /ZeroGPU's free image quota is exhausted[\s\S]*17 min[\s\S]*Connect(ing)? your Hugging Face account[\s\S]*offline chart\/diagram mode/,
    );
  });

  it("explains the offline escape hatch (chart/diagram mode) when the device is offline", async () => {
    zerogpuMock.available = false;
    vi.stubGlobal("navigator", { onLine: false });
    await expect(generateImageWithFallback("a cat")).rejects.toThrow(IMAGE_OFFLINE_NOTICE);
    await expect(generateImageWithFallback("a cat")).rejects.toThrow(/chart or diagram mode/);
  });

  it("aborts propagate unchanged", async () => {
    zerogpuMock.impl = async () => {
      throw new ZeroGpuError("aborted", "Image generation was canceled.");
    };
    await expect(generateImageWithFallback("a cat", { watermark: false })).rejects.toThrow(/canceled/);
  });

  it("streams ZeroGPU status updates to onStatus", async () => {
    const updates: string[] = [];
    zerogpuMock.impl = async (_prompt, options) => {
      (options as { onStatus?: (u: Record<string, unknown>) => void }).onStatus?.({
        provider: "zerogpu",
        phase: "queued",
        message: "Queued on ZeroGPU — position 3, starting ~21s…",
        queuePosition: 3,
        etaSeconds: 21,
        progress: null,
      });
      (options as { onStatus?: (u: Record<string, unknown>) => void }).onStatus?.({
        provider: "zerogpu",
        phase: "generating",
        message: "Generating image on the ZeroGPU H200…",
        progress: 0.5,
        queuePosition: null,
        etaSeconds: null,
      });
      return fakeZerogpuResult();
    };
    await generateImageWithFallback("a cat", { watermark: false, onStatus: (u) => updates.push(u.message) });
    expect(updates).toContain("Queued on ZeroGPU — position 3, starting ~21s…");
    expect(updates).toContain("Generating image on the ZeroGPU H200…");
  });
});

describe("readiness gate", () => {
  it("counts the free ZeroGPU tier as ready when online", () => {
    expect(isImageGenerationReady()).toBe(true);
  });

  it("is not ready when offline with no key and no shared mode", () => {
    zerogpuMock.available = false;
    vi.stubGlobal("navigator", { onLine: false });
    expect(isImageGenerationReady()).toBe(false);
  });
});
