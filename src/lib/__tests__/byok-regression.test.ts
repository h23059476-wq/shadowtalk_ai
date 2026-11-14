/**
 * Regression tests for the BYOK-only migration fixes (commit 9a3dba3).
 *
 * Covers:
 * - isCloudImageConfigured() doesn't reference removed variables
 * - BYOK credential lookup (valid + missing)
 * - Unsupported image-generation providers fail clearly
 * - Image analysis preserves image_url arrays
 * - Live Mode error handling (missing chat + TTS credentials)
 * - No silent fallback to platform-funded keys
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockByokConfig = {
  provider: "openrouter" as const,
  apiKey: "sk-or-test-key-1234567890",
  model: "openai/gpt-4o-mini",
  mode: "always" as const,
};

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

const authMock = vi.hoisted(() => ({ uid: "test-uid-123" }));

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({
    currentUser: {
      uid: authMock.uid,
      // Needed by the shared-image fallback client (mirrors cloudChat usage).
      getIdToken: () => Promise.resolve("test-id-token"),
    },
  }),
  functionsBaseUrl: "https://test.functions.example.com",
}));

describe("BYOK regression fixes (commit 9a3dba3)", () => {
  beforeEach(() => { localStorageMock.clear(); });

  it("does not expose a saved provider key after switching Firebase users", async () => {
    authMock.uid = "test-uid-123";
    localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123", JSON.stringify(mockByokConfig));
    const { getByokConfig } = await import("@/lib/byok");

    authMock.uid = "another-user";
    expect(getByokConfig()).toBeNull();
    authMock.uid = "test-uid-123";
    expect(getByokConfig()?.apiKey).toBe(mockByokConfig.apiKey);
  });

  it("scopes ElevenLabs credentials to the signed-in Firebase user", async () => {
    authMock.uid = "test-uid-123";
    const { getElevenLabsKey, setElevenLabsKey } = await import("@/lib/elevenlabsTts");
    setElevenLabsKey("eleven-a");
    authMock.uid = "another-user";
    expect(getElevenLabsKey()).toBeNull();
    setElevenLabsKey("eleven-b");
    authMock.uid = "test-uid-123";
    expect(getElevenLabsKey()).toBe("eleven-a");
  });

  describe("isCloudImageConfigured", () => {
    it("returns false when no BYOK key is configured", async () => {
      const { isCloudImageConfigured } = await import("@/lib/cloudImage");
      expect(isCloudImageConfigured()).toBe(false);
    });
    it("returns true when OpenAI key is configured", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123",
        JSON.stringify({ ...mockByokConfig, provider: "openai" }));
      const { isCloudImageConfigured } = await import("@/lib/cloudImage");
      expect(isCloudImageConfigured()).toBe(true);
    });
    it("returns true when OpenRouter key is configured", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123", JSON.stringify(mockByokConfig));
      const { isCloudImageConfigured } = await import("@/lib/cloudImage");
      expect(isCloudImageConfigured()).toBe(true);
    });
    it("returns true when Gemini key is configured", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123",
        JSON.stringify({ ...mockByokConfig, provider: "gemini" }));
      const { isCloudImageConfigured } = await import("@/lib/cloudImage");
      expect(isCloudImageConfigured()).toBe(true);
    });
    it("returns false for providers that don't support image generation", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123",
        JSON.stringify({ ...mockByokConfig, provider: "groq" }));
      const { isCloudImageConfigured } = await import("@/lib/cloudImage");
      expect(isCloudImageConfigured()).toBe(false);
    });
  });

  describe("getByokConfig", () => {
    it("returns null when no key is stored", async () => {
      const { getByokConfig } = await import("@/lib/byok");
      expect(getByokConfig()).toBeNull();
    });
    it("returns the config when a valid key is stored", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123", JSON.stringify(mockByokConfig));
      const { getByokConfig } = await import("@/lib/byok");
      const cfg = getByokConfig();
      expect(cfg).not.toBeNull();
      expect(cfg?.apiKey).toBe(mockByokConfig.apiKey);
      expect(cfg?.provider).toBe("openrouter");
    });
    it("returns null for invalid JSON", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123", "not json");
      const { getByokConfig } = await import("@/lib/byok");
      expect(getByokConfig()).toBeNull();
    });
  });

  describe("generateCloudImage error handling", () => {
    it("throws clear error when no BYOK key is set", async () => {
      const { generateCloudImage } = await import("@/lib/cloudImage");
      await expect(generateCloudImage("a cat")).rejects.toThrow(/Image generation requires your own API key/);
    });
    it("throws clear error for empty prompt", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123", JSON.stringify(mockByokConfig));
      const { generateCloudImage } = await import("@/lib/cloudImage");
      await expect(generateCloudImage("")).rejects.toThrow(/Describe the image/);
    });
  });

  describe("explicit, gated shared-image fallback", () => {
    it("keeps cloudImage BYOK-pure (no functionsBaseUrl in code)", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../../lib/cloudImage.ts"), "utf-8");
      const withoutComments = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(withoutComments).not.toContain("functionsBaseUrl");
      expect(src).not.toContain("VITE_OPENROUTER_SHARED_KEY");
      expect(src).not.toContain("getSharedKey");
    });

    it("routes the shared fallback through dedicated, gated modules", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const shared = fs.readFileSync(
        path.resolve(__dirname, "../../lib/sharedImage.ts"), "utf-8");
      expect(shared).toContain("/generateImage");
      expect(shared).toContain("getCachedAiAccessMode");
      const gen = fs.readFileSync(
        path.resolve(__dirname, "../../lib/imageGen.ts"), "utf-8");
      expect(gen).toContain("isCloudImageConfigured");
      expect(gen).toContain("isSharedImageEligible");
    });
  });

  describe("generateImageWithFallback", () => {
    beforeEach(() => { localStorageMock.clear(); authMock.uid = "test-uid-123"; });

    it("uses the BYOK key first when an image-capable provider is configured", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123",
        JSON.stringify({ ...mockByokConfig, provider: "openai" }));
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ data: [{ url: "https://cdn.example.com/x.png" }] }), { status: 200 }));
      const { generateImageWithFallback } = await import("@/lib/imageGen");
      const result = await generateImageWithFallback("a cat", { watermark: false });
      expect(result.source).toBe("byok");
      expect(result.imageUrl).toBe("https://cdn.example.com/x.png");
      expect(String(fetchSpy.mock.calls[0][0])).toContain("api.openai.com");
      fetchSpy.mockRestore();
    });

    it("falls back to the shared generateImage Function when no key exists and mode is shared", async () => {
      localStorageMock.setItem("shadowtalk.ai-access-mode.v1.test-uid-123", "shared");
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ data: [{ b64_json: "data:image/png;base64,AAA" }] }), { status: 200 }));
      const { generateImageWithFallback } = await import("@/lib/imageGen");
      const result = await generateImageWithFallback("a cat", { watermark: false });
      expect(result.source).toBe("shared");
      expect(result.imageUrl).toBe("data:image/png;base64,AAA");
      expect(String(fetchSpy.mock.calls[0][0])).toContain("/generateImage");
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(JSON.parse(String(init.body)).prompt).toBe("a cat");
      fetchSpy.mockRestore();
    });

    it("returns the actionable setup error when neither path is available", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { generateImageWithFallback } = await import("@/lib/imageGen");
      await expect(generateImageWithFallback("a cat")).rejects.toThrow(/quick setup/);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("surfaces BYOK provider rejections instead of masking them with the shared fallback", async () => {
      localStorageMock.setItem("shadowtalk.byok.v2.test-uid-123",
        JSON.stringify({ ...mockByokConfig, provider: "openai" }));
      localStorageMock.setItem("shadowtalk.ai-access-mode.v1.test-uid-123", "shared");
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), { status: 401 }));
      const { generateImageWithFallback } = await import("@/lib/imageGen");
      await expect(generateImageWithFallback("a cat", { watermark: false }))
        .rejects.toThrow(/key was rejected \(401\)/);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // only the BYOK call, no shared retry
      fetchSpy.mockRestore();
    });

    it("explains mode mismatch when the shared Function rejects the account", async () => {
      localStorageMock.setItem("shadowtalk.ai-access-mode.v1.test-uid-123", "shared");
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: "This account uses BYOK. Send the request directly through the selected provider." }), { status: 403 }));
      const { generateImageWithFallback } = await import("@/lib/imageGen");
      await expect(generateImageWithFallback("a cat", { watermark: false }))
        .rejects.toThrow(/This account uses BYOK/);
      fetchSpy.mockRestore();
    });
  });

  describe("error messages are BYOK-only", () => {
    it("turboEngine has no 'Tech-User' messaging", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../../lib/turbo/turboEngine.ts"), "utf-8");
      expect(src).not.toContain("Tech-User or Non-Tech-Users");
      expect(src).toContain("BYOK");
    });
    it("cloudChat has no 'Tech-User' messaging", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../../lib/cloudChat.ts"), "utf-8");
      expect(src).not.toContain("Tech-User or Non-Tech-Users");
      expect(src).toContain("BYOK");
    });
  });

  describe("LiveVoiceMode BYOK path", () => {
    it("uses getByokConfig directly (not userCohort gate)", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../../components/chat/LiveVoiceMode.tsx"), "utf-8");
      expect(src).toContain("const byokConfig = getByokConfig()");
      expect(src).not.toContain('userCohort === "TECH" && userApiKey');
    });
  });
});
