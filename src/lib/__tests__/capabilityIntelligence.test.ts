/**
 * Unit tests for the Provider Capability Intelligence Engine.
 *
 * Tests the capability registry, compatibility engine, and security boundaries.
 * No Firebase Emulator or live credentials required.
 */

import { describe, it, expect } from "vitest";
import {
  getModelCapabilities,
  getProviderProfile,
  findModelEntry,
  getRegistryVersion,
  type ModelCapabilities,
  type CapabilityStatus,
} from "../capabilityRegistry";
import {
  checkCompatibility,
  checkCompatibilityBatch,
  getCapabilitySummary,
  type FeatureRequirement,
} from "../capabilityCompatibility";
import type { ByokProvider } from "@/lib/byok";

describe("Capability Registry", () => {
  describe("getModelCapabilities", () => {
    it("returns capabilities for a known OpenAI model", () => {
      const caps = getModelCapabilities("openai", "gpt-4o-mini");
      expect(caps.textInput.status).toBe("supported");
      expect(caps.imageInput.status).toBe("supported");
      expect(caps.imageGeneration.status).toBe("unsupported");
      expect(caps.contextWindow).toBe(128000);
    });

    it("returns capabilities for a known Anthropic model", () => {
      const caps = getModelCapabilities("anthropic", "claude-haiku-4-5-20251001");
      expect(caps.textInput.status).toBe("supported");
      expect(caps.imageInput.status).toBe("supported");
      expect(caps.imageGeneration.status).toBe("unsupported");
      expect(caps.webSearch.status).toBe("unsupported");
      expect(caps.contextWindow).toBe(200000);
    });

    it("returns capabilities for a known Groq model", () => {
      const caps = getModelCapabilities("groq", "llama-3.3-70b-versatile");
      expect(caps.textInput.status).toBe("supported");
      expect(caps.imageInput.status).toBe("unsupported");
      expect(caps.imageGeneration.status).toBe("unsupported");
      expect(caps.contextWindow).toBe(128000);
    });

    it("returns capabilities for a known Gemini model", () => {
      const caps = getModelCapabilities("gemini", "gemini-2.0-flash");
      expect(caps.textInput.status).toBe("supported");
      expect(caps.imageInput.status).toBe("supported");
      expect(caps.audioInput.status).toBe("supported");
      expect(caps.contextWindow).toBe(1048576);
    });

    it("returns all-unknown for an unregistered model", () => {
      const caps = getModelCapabilities("openai", "some-future-model-2099");
      expect(caps.textInput.status).toBe("supported"); // text is always supported
      expect(caps.imageInput.status).toBe("unknown");
      expect(caps.contextWindow).toBeNull();
    });

    it("falls back via prefix match for model variants", () => {
      // gpt-4o-mini-2024-07-18 should match gpt-4o-mini
      const caps = getModelCapabilities("openai", "gpt-4o-mini-2024-07-18");
      expect(caps.contextWindow).toBe(128000);
      expect(caps.imageInput.status).toBe("supported");
    });
  });

  describe("getProviderProfile", () => {
    it("returns profile for OpenAI", () => {
      const profile = getProviderProfile("openai");
      expect(profile).not.toBeNull();
      expect(profile!.providerLabel).toBe("OpenAI");
      expect(profile!.models.length).toBeGreaterThan(0);
    });

    it("returns profile for all 16 providers", () => {
      const providers: ByokProvider[] = [
        "openai", "groq", "openrouter", "gemini", "anthropic",
        "mistral", "deepseek", "together", "fireworks", "perplexity",
        "cohere", "xai", "cerebras", "hyperbolic", "novita", "deepinfra",
      ];
      for (const p of providers) {
        const profile = getProviderProfile(p);
        expect(profile).not.toBeNull();
        expect(profile!.models.length).toBeGreaterThan(0);
      }
    });
  });

  describe("findModelEntry", () => {
    it("finds exact model match", () => {
      const entry = findModelEntry("openai", "gpt-4o-mini");
      expect(entry).not.toBeNull();
      expect(entry!.displayName).toBe("GPT-4o mini");
    });

    it("finds via prefix match", () => {
      const entry = findModelEntry("openai", "gpt-4o-mini-2024-07-18");
      expect(entry).not.toBeNull();
      expect(entry!.modelId).toBe("gpt-4o-mini");
    });

    it("returns null for unknown model", () => {
      const entry = findModelEntry("groq", "nonexistent-model");
      expect(entry).toBeNull();
    });
  });

  describe("registry metadata", () => {
    it("has a version string", () => {
      expect(getRegistryVersion()).toBe("1.0.0");
    });
  });
});

describe("Compatibility Engine", () => {
  describe("checkCompatibility — text_chat", () => {
    it("compatible for OpenAI GPT-4o-mini", () => {
      const result = checkCompatibility("openai", "gpt-4o-mini", "text_chat");
      expect(result.compatible).toBe(true);
      expect(result.blocker).toBeNull();
    });

    it("compatible for all providers", () => {
      const providers: ByokProvider[] = ["openai", "groq", "openrouter", "gemini", "anthropic", "deepseek"];
      for (const p of providers) {
        const result = checkCompatibility(p, "any-model", "text_chat");
        expect(result.compatible).toBe(true);
      }
    });
  });

  describe("checkCompatibility — image_analysis", () => {
    it("compatible for OpenAI GPT-4o-mini", () => {
      const result = checkCompatibility("openai", "gpt-4o-mini", "image_analysis");
      expect(result.compatible).toBe(true);
    });

    it("compatible for Anthropic Claude", () => {
      const result = checkCompatibility("anthropic", "claude-haiku-4-5-20251001", "image_analysis");
      expect(result.compatible).toBe(true);
    });

    it("incompatible for Groq (no vision)", () => {
      const result = checkCompatibility("groq", "llama-3.3-70b-versatile", "image_analysis");
      expect(result.compatible).toBe(false);
      expect(result.blocker).toContain("image input");
      expect(result.limitationSource).toBe("model");
    });

    it("compatible with warning for unknown model", () => {
      const result = checkCompatibility("openai", "unknown-future-model", "image_analysis");
      expect(result.compatible).toBe(true); // soft pass
      expect(result.explanation).toContain("warning");
    });
  });

  describe("checkCompatibility — image_generation", () => {
    it("incompatible for Groq", () => {
      const result = checkCompatibility("groq", "llama-3.3-70b-versatile", "image_generation");
      expect(result.compatible).toBe(false);
      expect(result.limitationSource).toBe("model");
    });

    it("incompatible for Anthropic", () => {
      const result = checkCompatibility("anthropic", "claude-haiku-4-5-20251001", "image_generation");
      expect(result.compatible).toBe(false);
    });

    it("incompatible for OpenAI GPT-4o-mini (model doesn't generate images)", () => {
      const result = checkCompatibility("openai", "gpt-4o-mini", "image_generation");
      expect(result.compatible).toBe(false);
      expect(result.blocker).toContain("image generation");
    });
  });

  describe("checkCompatibility — web_search", () => {
    it("compatible for OpenRouter", () => {
      const result = checkCompatibility("openrouter", "openai/gpt-4o-mini", "web_search");
      expect(result.compatible).toBe(true);
    });

    it("compatible for Perplexity", () => {
      const result = checkCompatibility("perplexity", "llama-3.1-sonar-small-128k-online", "web_search");
      expect(result.compatible).toBe(true);
    });

    it("incompatible for OpenAI", () => {
      const result = checkCompatibility("openai", "gpt-4o-mini", "web_search");
      expect(result.compatible).toBe(false);
    });
  });

  describe("checkCompatibility — real_time_voice", () => {
    it("incompatible for all providers (ShadowTalk integration limitation)", () => {
      const result = checkCompatibility("openai", "gpt-4o-mini", "real_time_voice");
      expect(result.compatible).toBe(false);
      expect(result.limitationSource).toBe("shadowtalk_integration");
    });
  });

  describe("checkCompatibility — voice_input", () => {
    it("incompatible for all providers (ShadowTalk uses Web Speech API, not model audio)", () => {
      const result = checkCompatibility("openai", "gpt-4o-mini", "voice_input");
      expect(result.compatible).toBe(false);
      expect(result.limitationSource).toBe("shadowtalk_integration");
    });
  });

  describe("checkCompatibility — document_analysis", () => {
    it("compatible for all providers (documents are extracted to text)", () => {
      for (const p of ["openai", "groq", "anthropic", "deepseek"] as ByokProvider[]) {
        const result = checkCompatibility(p, "any-model", "document_analysis");
        expect(result.compatible).toBe(true);
      }
    });
  });

  describe("checkCompatibilityBatch", () => {
    it("returns null when all features are compatible", () => {
      const result = checkCompatibilityBatch("openai", "gpt-4o-mini", "text_chat", "image_analysis", "code_generation");
      expect(result).toBeNull();
    });

    it("returns the first incompatibility", () => {
      const result = checkCompatibilityBatch("groq", "llama-3.3-70b-versatile", "text_chat", "image_analysis");
      expect(result).not.toBeNull();
      expect(result!.compatible).toBe(false);
      expect(result!.blocker).toContain("image input");
    });
  });

  describe("getCapabilitySummary", () => {
    it("returns summary for OpenAI GPT-4o-mini", () => {
      const summary = getCapabilitySummary("openai", "gpt-4o-mini");
      expect(summary.supported).toContain("Text input");
      expect(summary.supported).toContain("Image analysis (vision)");
      expect(summary.unsupported).toContain("Image generation");
      expect(summary.unsupported).toContain("Web search");
    });

    it("returns summary for Groq (no multimodal)", () => {
      const summary = getCapabilitySummary("groq", "llama-3.3-70b-versatile");
      expect(summary.supported).toContain("Text input");
      expect(summary.unsupported).toContain("Image analysis (vision)");
      expect(summary.unsupported).toContain("Audio input");
    });

    it("returns unknown capabilities for unregistered model", () => {
      const summary = getCapabilitySummary("openai", "unknown-model");
      expect(summary.unknown).toContain("Image analysis (vision)");
      expect(summary.unknown).toContain("Tool/function calling");
    });
  });
});

describe("Security — API key isolation", () => {
  it("capability registry does not import or reference API keys", () => {
    // The capabilityRegistry.ts file should not import from byok.ts's apiKey-related code
    // It only imports the ByokProvider type
    const registrySource = require("fs").readFileSync(
      require("path").join(__dirname, "../capabilityRegistry.ts"),
      "utf-8",
    );
    expect(registrySource).not.toContain("apiKey");
    expect(registrySource).not.toContain("cfg.apiKey");
    expect(registrySource).not.toContain("getByokConfig");
  });

  it("compatibility engine does not import or reference API keys", () => {
    const compatSource = require("fs").readFileSync(
      require("path").join(__dirname, "../capabilityCompatibility.ts"),
      "utf-8",
    );
    expect(compatSource).not.toContain("apiKey");
    expect(compatSource).not.toContain("getByokConfig");
  });
});

describe("No silent fallback", () => {
  it("checkCompatibility never silently switches providers", () => {
    // The compatibility engine only CHECKS — it never modifies the provider or model
    // It returns a result object; the caller decides what to do
    const result = checkCompatibility("groq", "llama-3.3-70b-versatile", "image_generation");
    expect(result.compatible).toBe(false);
    // The result does not contain any "switch to" or "fallback" suggestion
    expect(result.explanation).not.toContain("switch");
    expect(result.explanation).not.toContain("fallback");
  });
});
