/**
 * deviceCapabilities — the adapter-request ladder.
 *
 * A single `requestAdapter()` call misses machines that only expose a
 * low-power or software (SwiftShader) adapter (hardware acceleration
 * disabled, VMs, iGPU-only laptops). detectDeviceCapabilities() must walk
 * the same ladder the engine worker walks, and report the fallback adapter
 * honestly via `isFallbackAdapter`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectDeviceCapabilities } from "./deviceCapabilities";

function gpuMock(script: Array<{ opts: Record<string, unknown>; adapter: unknown }>) {
  const calls: Array<Record<string, unknown> | undefined> = [];
  return {
    calls,
    gpu: {
      requestAdapter: async (options?: Record<string, unknown>) => {
        calls.push(options);
        const hit = script.find((s) => JSON.stringify(s.opts) === JSON.stringify(options ?? {}));
        return hit ? hit.adapter : null;
      },
    },
  };
}

const HW_ADAPTER = { limits: { maxBufferSize: 4 * 1024 * 1024 * 1024 }, features: new Set(["shader-f16"]) };
const SW_ADAPTER = { limits: { maxBufferSize: 256 * 1024 * 1024 }, features: new Set(), isFallbackAdapter: true };

describe("detectDeviceCapabilities adapter ladder", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports hardware WebGPU when the plain request succeeds", async () => {
    const { gpu } = gpuMock([{ opts: {}, adapter: HW_ADAPTER }]);
    vi.stubGlobal("navigator", { gpu, storage: undefined, userAgent: "vitest" });

    const caps = await detectDeviceCapabilities(true);

    expect(caps.webgpu).toBe(true);
    expect(caps.adapter?.isFallbackAdapter).toBe(false);
    expect(caps.adapter?.shaderF16).toBe(true);
  });

  it("falls through to the software adapter when plain and low-power requests return null", async () => {
    const { gpu, calls } = gpuMock([
      { opts: {}, adapter: null },
      { opts: { powerPreference: "low-power" }, adapter: null },
      { opts: { forceSoftware: true }, adapter: SW_ADAPTER },
    ]);
    vi.stubGlobal("navigator", { gpu, storage: undefined, userAgent: "vitest" });

    const caps = await detectDeviceCapabilities(true);

    expect(calls.map((c) => JSON.stringify(c ?? {}))).toEqual(
      ["{}", JSON.stringify({ powerPreference: "low-power" }), JSON.stringify({ forceSoftware: true })],
    );
    expect(caps.webgpu).toBe(true);
    expect(caps.adapter?.isFallbackAdapter).toBe(true);
    expect(caps.adapter?.shaderF16).toBe(false);
  });

  it("reports no WebGPU when every rung of the ladder fails", async () => {
    const { gpu } = gpuMock([
      { opts: {}, adapter: null },
      { opts: { powerPreference: "low-power" }, adapter: null },
      { opts: { forceSoftware: true }, adapter: null },
    ]);
    vi.stubGlobal("navigator", { gpu, storage: undefined, userAgent: "vitest" });

    const caps = await detectDeviceCapabilities(true);

    expect(caps.webgpu).toBe(false);
    expect(caps.adapter).toBeNull();
    expect(caps.recommendedTier).toBe("unsupported");
  });

  it("reports no WebGPU when the API is missing entirely", async () => {
    vi.stubGlobal("navigator", { storage: undefined, userAgent: "vitest" });

    const caps = await detectDeviceCapabilities(true);

    expect(caps.webgpu).toBe(false);
    expect(caps.adapter).toBeNull();
  });
});
