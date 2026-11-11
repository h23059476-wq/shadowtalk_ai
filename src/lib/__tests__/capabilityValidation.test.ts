import { describe, it, expect } from "vitest";
import { checkCapability, checkCapabilities, getProviderCapabilities, type Capability } from "../capabilityValidation";

describe("Capability Validation", () => {
  describe("checkCapability", () => {
    it("returns supported for text_chat on all providers", () => {
      const providers = ["openai", "groq", "openrouter", "gemini", "anthropic", "deepseek"] as const;
      for (const p of providers) {
        const result = checkCapability(p, "text_chat");
        expect(result.supported).toBe(true);
      }
    });

    it("returns supported for image_generation on OpenAI", () => {
      const result = checkCapability("openai", "image_generation");
      expect(result.supported).toBe(true);
    });

    it("returns supported for image_generation on OpenRouter", () => {
      const result = checkCapability("openrouter", "image_generation");
      expect(result.supported).toBe(true);
    });

    it("returns unsupported for image_generation on Groq", () => {
      const result = checkCapability("groq", "image_generation");
      expect(result.supported).toBe(false);
      expect(result.message).toContain("does not support");
      expect(result.message).toContain("OpenAI");
      expect(result.suggestedProviders).toContain("OpenAI");
      expect(result.suggestedProviders).toContain("OpenRouter");
    });

    it("returns supported for image_input on OpenAI", () => {
      expect(checkCapability("openai", "image_input").supported).toBe(true);
    });

    it("returns supported for image_input on Anthropic", () => {
      expect(checkCapability("anthropic", "image_input").supported).toBe(true);
    });

    it("returns unsupported for image_input on Groq", () => {
      const result = checkCapability("groq", "image_input");
      expect(result.supported).toBe(false);
    });

    it("returns supported for web_search on OpenRouter", () => {
      expect(checkCapability("openrouter", "web_search").supported).toBe(true);
    });

    it("returns supported for web_search on Perplexity", () => {
      expect(checkCapability("perplexity", "web_search").supported).toBe(true);
    });

    it("returns unsupported for web_search on OpenAI", () => {
      const result = checkCapability("openai", "web_search");
      expect(result.supported).toBe(false);
      expect(result.suggestedProviders).toContain("OpenRouter");
    });

    it("returns supported for document_processing on all providers", () => {
      for (const p of ["openai", "groq", "deepseek", "cerebras"] as const) {
        expect(checkCapability(p, "document_processing").supported).toBe(true);
      }
    });

    it("returns supported for video_analysis on Gemini", () => {
      expect(checkCapability("gemini", "video_analysis").supported).toBe(true);
    });

    it("returns unsupported for video_analysis on Groq", () => {
      expect(checkCapability("groq", "video_analysis").supported).toBe(false);
    });

    it("returns supported for audio_input on OpenAI", () => {
      expect(checkCapability("openai", "audio_input").supported).toBe(true);
    });

    it("returns unsupported for audio_input on Groq", () => {
      expect(checkCapability("groq", "audio_input").supported).toBe(false);
    });
  });

  describe("checkCapabilities", () => {
    it("returns null when all capabilities are supported", () => {
      const result = checkCapabilities("openai", "text_chat", "image_input", "image_generation");
      expect(result).toBeNull();
    });

    it("returns the first unsupported capability", () => {
      const result = checkCapabilities("groq", "text_chat", "image_generation");
      expect(result).not.toBeNull();
      expect(result!.supported).toBe(false);
      expect(result!.message).toContain("image generation");
    });
  });

  describe("getProviderCapabilities", () => {
    it("returns capabilities for OpenAI", () => {
      const caps = getProviderCapabilities("openai");
      expect(caps).toContain("text_chat");
      expect(caps).toContain("image_generation");
      expect(caps).toContain("image_input");
      expect(caps).not.toContain("web_search");
    });

    it("returns capabilities for Groq", () => {
      const caps = getProviderCapabilities("groq");
      expect(caps).toContain("text_chat");
      expect(caps).not.toContain("image_generation");
      expect(caps).not.toContain("image_input");
    });
  });
});
