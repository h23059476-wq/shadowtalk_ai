/**
 * Tier 3 — ZeroGPU Space provider tests.
 *
 * Mocks `@gradio/client` (the ONLY import surface) to exercise the full
 * contract without a network: connect (anonymous + HF-token), endpoint
 * discovery, queue/generation status streaming, image download, and the
 * typed error ladder (quota with countdown, space unavailable, stall
 * timeout, overall deadline, offline, no image, abort).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto"; // secureStore (hfCredentials) uses IndexedDB
import { webcrypto } from "node:crypto";

// Real Web Crypto — the shared setup.ts stub replaces `crypto` without .subtle.
vi.stubGlobal("crypto", webcrypto);

// ── @gradio/client mock (hoisted state swapped per test) ───────────────────
type FakeEvent = {
  type: string;
  stage?: string;
  queue?: boolean;
  position?: number;
  eta?: number;
  message?: unknown;
  success?: boolean;
  progress_data?: Array<{ progress: number | null; index: number | null; length: number | null; unit: string | null; desc: string | null }>;
  data?: unknown[];
};

interface FakeClientSpec {
  connectError?: Error;
  events?: FakeEvent[];
  /** Keep the iterator pending forever after the scripted events (stall). */
  hangAfterEvents?: boolean;
  /** Extra delay inserted before each event after the first. */
  delayBetweenEventsMs?: number;
  /** Thrown by the one-shot predict() recovery call (silent-end surfacing). */
  predictError?: Error;
  /** Returned by the one-shot predict() recovery call when it succeeds. */
  predictData?: unknown[];
  namedEndpoints?: Record<
    string,
    {
      parameters?: Array<{
        parameter_name?: string;
        type?: { type?: string };
        parameter_has_default?: boolean;
        parameter_default?: unknown;
        python_type?: { type?: string };
      }>;
    }
  >;
}

const gradioState = vi.hoisted(() => ({
  connectCalls: [] as Array<{ spaceId: string; options?: Record<string, unknown> }>,
  submitCalls: [] as Array<{ endpoint: string | number; payload: Record<string, unknown>; allEvents?: boolean }>,
  predictCalls: [] as Array<{ endpoint: string | number; payload: Record<string, unknown> }>,
  cancelCalls: 0,
  connectImpl: null as null | ((spaceId: string, options?: Record<string, unknown>) => Promise<unknown>),
}));

vi.mock("@gradio/client", () => ({
  Client: {
    connect: (spaceId: string, options?: Record<string, unknown>) => {
      if (!gradioState.connectImpl) throw new Error("fake @gradio/client not configured for this test");
      return gradioState.connectImpl(spaceId, options);
    },
  },
}));

function setFakeClient(spec: FakeClientSpec): void {
  gradioState.connectCalls = [];
  gradioState.submitCalls = [];
  gradioState.predictCalls = [];
  gradioState.cancelCalls = 0;
  gradioState.connectImpl = async (spaceId: string, options?: Record<string, unknown>) => {
    gradioState.connectCalls.push({ spaceId, options });
    if (spec.connectError) throw spec.connectError;
    const client = {
      view_api: vi.fn(async () => ({ named_endpoints: spec.namedEndpoints ?? {} })),
      submit: vi.fn(
        (
          endpoint: string | number,
          payload: Record<string, unknown>,
          _eventData?: unknown,
          _triggerId?: unknown,
          allEvents?: boolean,
        ) => {
          gradioState.submitCalls.push({ endpoint, payload, allEvents });
        const events = spec.events ?? [];
        let index = 0;
        const next = async (): Promise<IteratorResult<FakeEvent>> => {
          if (spec.delayBetweenEventsMs && index > 0) {
            await new Promise((resolve) => setTimeout(resolve, spec.delayBetweenEventsMs));
          }
          if (index < events.length) {
            const value = events[index++];
            return { value, done: false };
          }
          if (spec.hangAfterEvents) {
            await new Promise<void>(() => undefined); // never resolves — simulated stall
          }
          return { value: undefined, done: true };
        };
        return {
          [Symbol.asyncIterator]: () => ({ next }),
          next,
          cancel: vi.fn(async () => {
            gradioState.cancelCalls += 1;
          }),
        };
      }),
      predict: vi.fn(async (endpoint: string | number, payload: Record<string, unknown>) => {
        gradioState.predictCalls.push({ endpoint, payload });
        if (spec.predictError) throw spec.predictError;
        return { data: spec.predictData ?? [] };
      }),
    };
    return client;
  };
}

const IMAGE_URL = "https://flux-space.hf.space/gradio_api/file=/tmp/gradio/abc/image.png";

/** Verbatim anonymous-quota rejection captured LIVE from black-forest-labs/FLUX.1-schnell. */
const REAL_ANON_QUOTA_MESSAGE =
  "You have exceeded your ZeroGPU runs limit. Authenticate with a Hugging Face token for more quota - https://huggingface.co/settings/tokens";

const FLUX_ENDPOINT_PARAMS = {
  "/infer": {
    parameters: [
      { parameter_name: "prompt", type: { type: "string" } },
      { parameter_name: "seed", type: { type: "int" }, parameter_has_default: true, parameter_default: 0 },
      { parameter_name: "randomize_seed", type: { type: "boolean" }, parameter_has_default: true, parameter_default: true },
      { parameter_name: "width", type: { type: "int" }, parameter_has_default: true, parameter_default: 1024 },
      { parameter_name: "height", type: { type: "int" }, parameter_has_default: true, parameter_default: 1024 },
      { parameter_name: "num_inference_steps", type: { type: "int" }, parameter_has_default: true, parameter_default: 4 },
    ],
  },
};

function fakeImageResponse(): Response {
  // Undici Response from ArrayBuffer avoids cross-realm Blob brand checks.
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4, 5, 6, 7, 8]).buffer;
  return new Response(bytes, { status: 200, headers: { "Content-Type": "image/png" } });
}

function successEvents(): FakeEvent[] {
  return [
    { type: "status", stage: "pending", queue: true, position: 3, eta: 21 },
    { type: "status", stage: "generating", progress_data: [{ progress: 0.5, index: null, length: null, unit: null, desc: null }] },
    { type: "data", data: [{ url: IMAGE_URL, path: "/tmp/gradio/abc/image.png", orig_name: "image.png" }, 1234] },
    { type: "status", stage: "complete", success: true },
  ];
}

import {
  DEFAULT_ZERO_GPU_SPACE_ID,
  FLUX_DEFAULTS,
  ZERO_GPU_QUOTA_HINT,
  ZeroGpuError,
  classifyZeroGpuError,
  generateImageViaZeroGpu,
  isZeroGpuSpaceAvailable,
  parseRetryAfterSeconds,
  type ZeroGpuStatusUpdate,
} from "@/lib/providers/zeroGpuSpaceProvider";
import { clearHfCredentials, saveHfCredentials } from "@/lib/auth/hfCredentials";

describe("parseRetryAfterSeconds", () => {
  it("parses the HF h:mm:ss countdown", () => {
    expect(parseRetryAfterSeconds("You have exceeded your GPU quota. Try again in 0:16:24")).toBe(16 * 60 + 24);
  });

  it("parses composite and plain-second countdowns", () => {
    expect(parseRetryAfterSeconds("Try again in 1h 2m 3s")).toBe(3600 + 120 + 3);
    expect(parseRetryAfterSeconds("Try again in 45s")).toBe(45);
    expect(parseRetryAfterSeconds("Try again in 5m")).toBe(300);
  });

  it("returns undefined when no countdown is present", () => {
    expect(parseRetryAfterSeconds("quota exhausted")).toBeUndefined();
    expect(parseRetryAfterSeconds("")).toBeUndefined();
  });
});

describe("isZeroGpuSpaceAvailable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("crypto", webcrypto);
  });

  it("is true when the browser reports online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isZeroGpuSpaceAvailable()).toBe(true);
  });

  it("is false when the browser reports offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isZeroGpuSpaceAvailable()).toBe(false);
  });
});

describe("generateImageViaZeroGpu", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const statusUpdates: ZeroGpuStatusUpdate[] = [];

  beforeEach(async () => {
    gradioState.connectCalls = [];
    gradioState.submitCalls = [];
    gradioState.cancelCalls = 0;
    statusUpdates.length = 0;
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("crypto", webcrypto);
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith("https://flux-space.hf.space/")) return fakeImageResponse();
      throw new Error(`unexpected fetch ${url}`);
    });
    await clearHfCredentials();
  });

  afterEach(async () => {
    fetchSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.stubGlobal("crypto", webcrypto);
    await clearHfCredentials();
  });

  it("generates an image blob anonymously on the default FLUX Space", async () => {
    setFakeClient({ namedEndpoints: FLUX_ENDPOINT_PARAMS, events: successEvents() });

    const result = await generateImageViaZeroGpu("a photorealistic snowy owl", {
      onStatus: (u) => statusUpdates.push(u),
    });

    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.mimeType).toBe("image/png");
    expect(result.spaceId).toBe(DEFAULT_ZERO_GPU_SPACE_ID);
    expect(result.endpoint).toBe("/infer");
    expect(result.seed).toBe(1234);
    expect(result.usingHfToken).toBe(false);

    expect(gradioState.connectCalls[0].spaceId).toBe(DEFAULT_ZERO_GPU_SPACE_ID);
    expect(gradioState.connectCalls[0].options).toBeUndefined(); // anonymous
    expect(gradioState.submitCalls[0].endpoint).toBe("/infer");
    expect(gradioState.submitCalls[0].allEvents).toBe(true); // error events must not be filtered
    expect(gradioState.submitCalls[0].payload).toMatchObject({
      prompt: "a photorealistic snowy owl",
      randomize_seed: true,
      width: FLUX_DEFAULTS.width,
      height: FLUX_DEFAULTS.height,
      num_inference_steps: FLUX_DEFAULTS.numInferenceSteps,
    });

    const phases = statusUpdates.map((u) => u.phase);
    expect(phases[0]).toBe("connecting");
    expect(phases[1]).toBe("queued"); // accepted
    expect(phases).toContain("generating");
    expect(phases).toContain("fetching");
    expect(phases[phases.length - 1]).toBe("done");
    expect(statusUpdates[2].queuePosition).toBe(3);
    expect(statusUpdates[2].message).toContain("position 3");
    expect(statusUpdates[3].progress).toBe(0.5);
  });

  it("passes the Tier 2 HF token to Client.connect when an account is connected", async () => {
    await saveHfCredentials({ accessToken: "hf_test_token_123456", username: "shadowfan" });
    setFakeClient({ events: successEvents() });

    const result = await generateImageViaZeroGpu("test", { onStatus: (u) => statusUpdates.push(u) });
    expect(result.usingHfToken).toBe(true);
    expect(gradioState.connectCalls[0].options?.token).toBe("hf_test_token_123456");
    expect(statusUpdates.some((u) => u.message.includes("personal Hugging Face quota"))).toBe(true);
  });

  it("rejects a malformed prompt before connecting", async () => {
    setFakeClient({});
    await expect(generateImageViaZeroGpu("   ")).rejects.toMatchObject({ kind: "unknown" });
    expect(gradioState.connectCalls).toHaveLength(0);
    await expect(generateImageViaZeroGpu("x".repeat(2001))).rejects.toMatchObject({ kind: "unknown" });
    expect(gradioState.connectCalls).toHaveLength(0);
  });

  it("throws offline before any network activity when navigator reports offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    setFakeClient({});
    await expect(generateImageViaZeroGpu("test")).rejects.toMatchObject({ kind: "offline" });
    expect(gradioState.connectCalls).toHaveLength(0);
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("classifies quota-exceeded status errors and surfaces the countdown", async () => {
    setFakeClient({
      events: [
        { type: "status", stage: "pending", queue: true, position: 1, eta: 5 },
        {
          type: "status",
          stage: "error",
          message: "You have exceeded your GPU quota (60s reserved, 51.5s used). Try again in 0:16:24",
        },
      ],
    });
    await expect(generateImageViaZeroGpu("test", { onStatus: (u) => statusUpdates.push(u) })).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ZeroGpuError);
        const zerr = error as ZeroGpuError;
        expect(zerr.kind).toBe("quota");
        expect(zerr.retryAfterSeconds).toBe(16 * 60 + 24);
        expect(zerr.message).toContain("exceeded your GPU quota");
        expect(zerr.message).toContain("0:16:24");
        return true;
      },
    );
    expect(gradioState.cancelCalls).toBe(1); // the job was cancelled cleanly
  });

  it("classifies the REAL anonymous quota rejection streamed by the Space (captured live)", async () => {
    // Live capture from black-forest-labs/FLUX.1-schnell: the join is
    // rejected AFTER a queued status event, with this exact message shape.
    setFakeClient({
      namedEndpoints: FLUX_ENDPOINT_PARAMS,
      events: [
        { type: "status", stage: "pending", queue: true, position: 0, eta: 7.07 },
        { type: "status", stage: "error", message: REAL_ANON_QUOTA_MESSAGE },
      ],
    });
    await expect(generateImageViaZeroGpu("test")).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ZeroGpuError);
      const zerr = error as ZeroGpuError;
      expect(zerr.kind).toBe("quota");
      expect(zerr.message).toContain("ZeroGPU runs limit");
      expect(zerr.retryAfterSeconds).toBeUndefined(); // the anonymous message carries no countdown
      return true;
    });
    expect(gradioState.cancelCalls).toBe(1);
  });

  it("surfaces the real quota error when the event stream ends silently (submit suppression)", async () => {
    // Older/some @gradio/client builds filter join-time rejections out of the
    // default event stream entirely — the iterator just ends. The provider
    // must re-issue via predict() and surface the real error, not no_image.
    setFakeClient({ namedEndpoints: FLUX_ENDPOINT_PARAMS, predictError: new Error(REAL_ANON_QUOTA_MESSAGE) });
    await expect(generateImageViaZeroGpu("test")).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ZeroGpuError);
      const zerr = error as ZeroGpuError;
      expect(zerr.kind).toBe("quota");
      expect(zerr.message).toContain(ZERO_GPU_QUOTA_HINT);
      return true;
    });
    expect(gradioState.predictCalls).toHaveLength(1);
    expect(gradioState.predictCalls[0].endpoint).toBe("/infer");
  });

  it("keeps no_image (no predict retry) when the stream ran but produced nothing usable", async () => {
    setFakeClient({
      namedEndpoints: FLUX_ENDPOINT_PARAMS,
      events: [
        { type: "status", stage: "generating" },
        { type: "data", data: [{ some: "junk" }] },
        { type: "status", stage: "complete", success: true },
      ],
    });
    await expect(generateImageViaZeroGpu("test")).rejects.toMatchObject({ kind: "no_image" });
    expect(gradioState.predictCalls).toHaveLength(0); // a real run happened — never double-bill quota
  });

  it("treats a sleeping/paused Space as space_unavailable", async () => {
    setFakeClient({
      connectError: new Error("The Space is asleep or paused (SLEEPING). Wake it up to use it."),
    });
    await expect(generateImageViaZeroGpu("test")).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ZeroGpuError);
      const zerr = error as ZeroGpuError;
      expect(zerr.kind).toBe("space_unavailable");
      expect(zerr.message).toContain(DEFAULT_ZERO_GPU_SPACE_ID);
      return true;
    });
  });

  it("cancels the job and reports timeout when the Space stalls mid-run", async () => {
    setFakeClient({
      events: [{ type: "status", stage: "pending", queue: true, position: 5 }],
      hangAfterEvents: true,
    });
    await expect(
      generateImageViaZeroGpu("test", { idleTimeoutMs: 30 }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ZeroGpuError);
      expect((error as ZeroGpuError).kind).toBe("timeout");
      expect((error as ZeroGpuError).message).toContain("stopped responding");
      return true;
    });
    expect(gradioState.cancelCalls).toBe(1);
  });

  it("enforces the overall deadline when events trickle slowly", async () => {
    setFakeClient({
      events: [
        { type: "status", stage: "pending", queue: true, position: 9 },
        { type: "status", stage: "generating" },
        { type: "data", data: [{ url: IMAGE_URL }, 7] },
      ],
      delayBetweenEventsMs: 60,
    });
    await expect(
      generateImageViaZeroGpu("test", { timeoutMs: 40, idleTimeoutMs: 500 }),
    ).rejects.toMatchObject({ kind: "timeout" });
    expect(gradioState.cancelCalls).toBe(1);
  });

  it("respects an aborted signal and cancels before connecting", async () => {
    setFakeClient({ events: successEvents() });
    const controller = new AbortController();
    controller.abort();
    await expect(generateImageViaZeroGpu("test", { signal: controller.signal })).rejects.toMatchObject({
      kind: "aborted",
    });
    expect(gradioState.connectCalls).toHaveLength(0);
  });

  it("reports no_image when the Space finishes without a usable payload", async () => {
    setFakeClient({
      events: [
        { type: "status", stage: "generating" },
        { type: "data", data: [{ some: "junk" }] },
        { type: "status", stage: "complete", success: true },
      ],
    });
    await expect(generateImageViaZeroGpu("test")).rejects.toMatchObject({ kind: "no_image" });
  });

  it("supports a custom user-supplied Space id and endpoint override", async () => {
    setFakeClient({ events: successEvents() });
    const result = await generateImageViaZeroGpu("test", {
      spaceId: "shadowfan/my-private-flux",
      endpoint: "/generate",
    });
    expect(result.spaceId).toBe("shadowfan/my-private-flux");
    expect(result.endpoint).toBe("/generate");
    expect(gradioState.connectCalls[0].spaceId).toBe("shadowfan/my-private-flux");
  });

  it("uses compact payload defaults for custom Spaces (free CPU hardware, physically measured)", async () => {
    // Live finding: a free non-ZeroGPU Space (Collov-Labs/Monetico) needed 297s
    // for 512²/4 — a 1024² render would blow the deadline. Custom Spaces must
    // submit the compact 512² shape unless the caller overrides the dims.
    setFakeClient({ events: successEvents() });
    await generateImageViaZeroGpu("test", { spaceId: "shadowfan/cpu-space" });

    expect(gradioState.submitCalls[0].payload).toMatchObject({
      width: 512,
      height: 512,
      num_inference_steps: 4,
    });
  });

  it("keeps FLUX 1024² defaults for the default ZeroGPU Space", async () => {
    setFakeClient({ events: successEvents() });
    await generateImageViaZeroGpu("test");
    expect(gradioState.submitCalls[0].payload).toMatchObject({
      width: FLUX_DEFAULTS.width,
      height: FLUX_DEFAULTS.height,
    });
  });

  it("honors explicit dimension overrides on a custom Space", async () => {
    setFakeClient({ events: successEvents() });
    await generateImageViaZeroGpu("test", {
      spaceId: "shadowfan/cpu-space",
      width: 768,
      height: 768,
      numInferenceSteps: 2,
    });
    expect(gradioState.submitCalls[0].payload).toMatchObject({
      width: 768,
      height: 768,
      num_inference_steps: 2,
    });
  });
});

describe("classifyZeroGpuError", () => {
  it("passes through ZeroGpuError instances", () => {
    const original = new ZeroGpuError("quota", "quota hit", 90);
    expect(classifyZeroGpuError(original)).toEqual({ kind: "quota", retryAfterSeconds: 90 });
  });

  it("maps raw provider messages to typed kinds", () => {
    expect(classifyZeroGpuError(new Error("Failed to fetch")).kind).toBe("offline");
    expect(classifyZeroGpuError(new Error("ZeroGPU quota exceeded for today")).kind).toBe("quota");
    expect(classifyZeroGpuError(new Error(REAL_ANON_QUOTA_MESSAGE)).kind).toBe("quota"); // live message shape
    expect(classifyZeroGpuError(new Error("Space is asleep")).kind).toBe("space_unavailable");
    expect(classifyZeroGpuError(new Error("404: Not Found")).kind).toBe("space_unavailable"); // live 404 shape (cycling Space / gateway rejection)
    expect(classifyZeroGpuError(new Error("Connection timed out")).kind).toBe("timeout");
    expect(classifyZeroGpuError(new Error("mystery")).kind).toBe("unknown");
  });
});
