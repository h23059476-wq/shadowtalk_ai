/**
 * Unit tests for the BYOK image generation pipeline (cloudImage.ts).
 *
 * Covers:
 * - decodeImageResult: OpenAI choices.images / data.url / data.b64_json shapes
 * - decodeGeminiImageResult: inlineData + inline_data shapes, safety blocks
 * - mapImageProviderError: auth, rate limit, content policy, server errors
 * - parseDataUrl
 * - generateCloudImage: prompt-length cap, unsupported-provider rejection
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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

const authMock = vi.hoisted(() => ({ uid: "image-test-uid" }));
vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: authMock.uid } }),
  functionsBaseUrl: "https://test.functions.example.com",
}));

const KEY = "shadowtalk.byok.v2.image-test-uid";
const setConfig = (cfg: Record<string, unknown>) =>
  localStorageMock.setItem(KEY, JSON.stringify(cfg));

describe("decodeImageResult (OpenAI / OpenRouter shapes)", () => {
  it("decodes choices[0].message.images[0].image_url.url (OpenRouter)", async () => {
    const { decodeImageResult } = await import("@/lib/cloudImage");
    expect(decodeImageResult({
      choices: [{ message: { images: [{ image_url: { url: "data:image/png;base64,AAA" } }] } }],
    })).toBe("data:image/png;base64,AAA");
  });
  it("decodes data[0].url (hosted image URL)", async () => {
    const { decodeImageResult } = await import("@/lib/cloudImage");
    expect(decodeImageResult({ data: [{ url: "https://cdn.example.com/img.png" }] }))
      .toBe("https://cdn.example.com/img.png");
  });
  it("decodes data[0].b64_json with explicit media_type", async () => {
    const { decodeImageResult } = await import("@/lib/cloudImage");
    expect(decodeImageResult({ data: [{ b64_json: "QUJD", media_type: "image/jpeg" }] }))
      .toBe("data:image/jpeg;base64,QUJD");
  });
  it("defaults mime type to image/png for bare b64_json", async () => {
    const { decodeImageResult } = await import("@/lib/cloudImage");
    expect(decodeImageResult({ data: [{ b64_json: "QUJD" }] }))
      .toBe("data:image/png;base64,QUJD");
  });
  it("throws when no image is present", async () => {
    const { decodeImageResult } = await import("@/lib/cloudImage");
    expect(() => decodeImageResult({ data: [] })).toThrow(/returned no image/);
  });
});

describe("decodeGeminiImageResult", () => {
  it("decodes camelCase inlineData parts", async () => {
    const { decodeGeminiImageResult } = await import("@/lib/cloudImage");
    expect(decodeGeminiImageResult({
      candidates: [{ content: { parts: [{ text: "here" }, { inlineData: { mimeType: "image/png", data: "R0hJ" } }] } }],
    })).toBe("data:image/png;base64,R0hJ");
  });
  it("decodes snake_case inline_data parts", async () => {
    const { decodeGeminiImageResult } = await import("@/lib/cloudImage");
    expect(decodeGeminiImageResult({
      candidates: [{ content: { parts: [{ inline_data: { mime_type: "image/jpeg", data: "R0hJ" } }] } }],
    })).toBe("data:image/jpeg;base64,R0hJ");
  });
  it("explains promptFeedback safety blocks", async () => {
    const { decodeGeminiImageResult } = await import("@/lib/cloudImage");
    expect(() => decodeGeminiImageResult({ promptFeedback: { blockReason: "SAFETY" }, candidates: [] }))
      .toThrow(/blocked this prompt \(SAFETY\)/);
  });
  it("explains non-STOP finish reasons", async () => {
    const { decodeGeminiImageResult } = await import("@/lib/cloudImage");
    expect(() => decodeGeminiImageResult({ candidates: [{ finishReason: "RECITATION", content: { parts: [{ text: "no image" }] } }] }))
      .toThrow(/RECITATION/);
  });
  it("throws a no-image error when the response is empty", async () => {
    const { decodeGeminiImageResult } = await import("@/lib/cloudImage");
    expect(() => decodeGeminiImageResult({})).toThrow(/returned no image/);
  });
});

describe("mapImageProviderError", () => {
  it("maps 401 to an invalid-key action", async () => {
    const { mapImageProviderError } = await import("@/lib/cloudImage");
    const err = mapImageProviderError("OpenAI", 401, { error: { message: "Incorrect API key provided" } });
    expect(err.message).toMatch(/key was rejected \(401\)/);
    expect(err.message).toMatch(/Settings/);
  });
  it("maps 429 to a quota action", async () => {
    const { mapImageProviderError } = await import("@/lib/cloudImage");
    expect(mapImageProviderError("OpenRouter", 429, {}).message).toMatch(/rate limit or quota/);
  });
  it("maps 400 content-policy rejections to a rephrase action", async () => {
    const { mapImageProviderError } = await import("@/lib/cloudImage");
    expect(mapImageProviderError("OpenAI", 400, {
      error: { code: "content_policy_violation", message: "Your request was rejected as a result of our safety system." },
    }).message).toMatch(/content policy/);
  });
  it("maps 500s to a retry action", async () => {
    const { mapImageProviderError } = await import("@/lib/cloudImage");
    expect(mapImageProviderError("Google Gemini", 503, {}).message).toMatch(/temporary problem \(503\)/);
  });
  it("never echoes the API key into the message", async () => {
    const { mapImageProviderError } = await import("@/lib/cloudImage");
    const secret = "sk-super-secret-value";
    const err = mapImageProviderError("OpenAI", 400, { error: { message: `Bad request near ${secret}` } });
    expect(err.message).not.toContain(secret);
  });
});

describe("parseDataUrl", () => {
  it("splits image data URLs", async () => {
    const { parseDataUrl } = await import("@/lib/cloudImage");
    expect(parseDataUrl("data:image/webp;base64,UVFSTg==")).toEqual({ mimeType: "image/webp", data: "UVFSTg==" });
  });
  it("rejects non-image and malformed URLs", async () => {
    const { parseDataUrl } = await import("@/lib/cloudImage");
    expect(parseDataUrl("data:text/plain;base64,aGk=")).toBeNull();
    expect(parseDataUrl("https://example.com/img.png")).toBeNull();
  });
});

describe("generateCloudImage guards", () => {
  beforeEach(() => { localStorageMock.clear(); authMock.uid = "image-test-uid"; });

  it("rejects oversized prompts before calling the provider", async () => {
    setConfig({ provider: "openai", apiKey: "sk-test", model: "gpt-4o-mini", mode: "always" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const { generateCloudImage } = await import("@/lib/cloudImage");
    await expect(generateCloudImage("x".repeat(33_000))).rejects.toThrow(/too long/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("tells groq-key users which providers support images", async () => {
    setConfig({ provider: "groq", apiKey: "gsk-test", model: "llama-3.3-70b-versatile", mode: "always" });
    const { generateCloudImage } = await import("@/lib/cloudImage");
    await expect(generateCloudImage("a cat")).rejects.toThrow(/OpenAI, OpenRouter or Google Gemini key/);
  });

  it("sends the dedicated image model for Gemini (not the chat model)", async () => {
    setConfig({ provider: "gemini", apiKey: "AIza-test", model: "gemini-2.0-flash", mode: "always" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "R0hJ" } }] } }],
    }), { status: 200 }));
    const { generateCloudImage } = await import("@/lib/cloudImage");
    const url = await generateCloudImage("a cat", { watermark: false });
    expect(url).toBe("data:image/png;base64,R0hJ");
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toContain("/v1beta/models/gemini-2.5-flash-image:generateContent");
    const body = JSON.parse(String(calledInit?.body));
    expect(body.generationConfig.responseModalities).toEqual(["TEXT", "IMAGE"]);
    expect(body.contents[0].parts[0].text).toBe("a cat");
    fetchSpy.mockRestore();
  });

  it("maps provider network failures to an actionable message naming the provider", async () => {
    setConfig({ provider: "openai", apiKey: "sk-test", model: "gpt-4o-mini", mode: "always" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const { generateCloudImage } = await import("@/lib/cloudImage");
    await expect(generateCloudImage("a cat")).rejects.toThrow(/Could not reach OpenAI \(network or DNS failure\)/);
    fetchSpy.mockRestore();
  });
});
