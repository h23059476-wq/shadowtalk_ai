/**
 * Hardware & storage detection — the tier logic that gates the lineup.
 * navigator.deviceMemory / storage / WebGPU are mocked per scenario.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectDeviceCapabilities,
  getDeviceMemoryGB,
  getRecommendedTier,
  getStorageQuota,
  requestPersistentStorage,
} from "@/utils/deviceCapabilities";

type MutableNavigator = Record<string, unknown>;

function setNavigator(patch: MutableNavigator): void {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      delete (navigator as unknown as MutableNavigator)[k];
    } else {
      Object.defineProperty(navigator, k, { configurable: true, value: v });
    }
  }
}

const originalDescriptors: Array<PropertyKey> = [];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getDeviceMemoryGB — Safari/Firefox fallback", () => {
  it("returns the reported value on Chrome/Android", () => {
    setNavigator({ deviceMemory: 8 });
    expect(getDeviceMemoryGB()).toEqual({ gb: 8, estimated: false });
  });

  it("falls back to 4GB for mobile UAs that don't report memory (Safari iOS)", () => {
    setNavigator({
      deviceMemory: undefined,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    expect(getDeviceMemoryGB()).toEqual({ gb: 4, estimated: true });
  });

  it("falls back to 8GB for desktop UAs that don't report memory (Firefox)", () => {
    setNavigator({
      deviceMemory: undefined,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
    });
    expect(getDeviceMemoryGB()).toEqual({ gb: 8, estimated: true });
  });
});

describe("getRecommendedTier — mobile/light vs desktop/full", () => {
  const adapter = (over: { maxBufferSize?: number | null; shaderF16?: boolean } = {}) => ({
    maxBufferSize: over.maxBufferSize ?? 4 * 1024 * 1024 * 1024,
    maxComputeWorkgroupStorageSize: 16384,
    isFallbackAdapter: false,
    shaderF16: over.shaderF16 ?? true,
  });

  it("desktop/full for ≥8GB with a roomy adapter buffer", () => {
    expect(
      getRecommendedTier({ webgpu: true, deviceMemoryGB: 8, adapter: adapter() }),
    ).toBe("desktop/full");
    expect(
      getRecommendedTier({ webgpu: true, deviceMemoryGB: 16, adapter: adapter() }),
    ).toBe("desktop/full");
  });

  it("mobile/light below 8GB", () => {
    expect(
      getRecommendedTier({ webgpu: true, deviceMemoryGB: 4, adapter: adapter() }),
    ).toBe("mobile/light");
  });

  it("mobile/light when the GPU buffer cannot hold a 3B model", () => {
    expect(
      getRecommendedTier({
        webgpu: true,
        deviceMemoryGB: 16,
        adapter: adapter({ maxBufferSize: 1 * 1024 * 1024 * 1024 }),
      }),
    ).toBe("mobile/light");
  });

  it("unsupported without WebGPU", () => {
    expect(getRecommendedTier({ webgpu: false, deviceMemoryGB: 32, adapter: null })).toBe("unsupported");
  });
});

describe("storage helpers", () => {
  afterEach(() => {
    setNavigator({ storage: undefined });
  });

  it("requestPersistentStorage requests persist() once when not yet persisted", async () => {
    const persisted = vi.fn().mockResolvedValue(false);
    const persist = vi.fn().mockResolvedValue(true);
    setNavigator({ storage: { persisted, persist } });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("requestPersistentStorage is a no-op when already persisted", async () => {
    const persisted = vi.fn().mockResolvedValue(true);
    const persist = vi.fn().mockResolvedValue(false);
    setNavigator({ storage: { persisted, persist } });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("getStorageQuota maps estimate() to MB with available headroom", async () => {
    const GB = 1024 * 1024 * 1024;
    setNavigator({
      storage: {
        estimate: vi.fn().mockResolvedValue({ quota: 20 * GB, usage: 2 * GB }),
        persisted: vi.fn().mockResolvedValue(true),
      },
    });
    const q = await getStorageQuota();
    expect(q.quotaMB).toBeCloseTo(20 * 1024, 0);
    expect(q.usageMB).toBeCloseTo(2 * 1024, 0);
    expect(q.availableMB).toBeCloseTo(18 * 1024, 0);
    expect(q.persisted).toBe(true);
  });

  it("getStorageQuota degrades gracefully without the API", async () => {
    setNavigator({ storage: undefined });
    const q = await getStorageQuota();
    expect(q).toEqual({ usageMB: 0, quotaMB: 0, availableMB: 0, persisted: false });
  });
});

describe("detectDeviceCapabilities — caching", () => {
  it("caches the adapter probe across calls", async () => {
    const requestAdapter = vi.fn().mockResolvedValue({
      limits: { maxBufferSize: 4 * 1024 * 1024 * 1024, maxComputeWorkgroupStorageSize: 16384 },
      features: new Set(["shader-f16"]),
      isFallbackAdapter: false,
    });
    setNavigator({
      gpu: { requestAdapter },
      deviceMemory: 8,
      storage: { estimate: vi.fn().mockResolvedValue({ quota: 0, usage: 0 }), persisted: vi.fn().mockResolvedValue(true) },
      userAgent: "test-agent",
    });
    // force=true makes this test independent of any earlier probe in the file
    const a = await detectDeviceCapabilities(true);
    const b = await detectDeviceCapabilities();
    expect(requestAdapter).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
    expect(a.webgpu).toBe(true);
    expect(a.adapter?.shaderF16).toBe(true);
    expect(a.recommendedTier).toBe("desktop/full");
  });
});
