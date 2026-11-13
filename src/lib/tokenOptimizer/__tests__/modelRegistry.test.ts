/**
 * Intelligent-workspace Batch 1 — model registry (provider-aware budgets).
 * The registry must never assume one context window fits all providers, and
 * unknown models must round DOWN to conservative defaults.
 */
import { describe, it, expect } from "vitest";
import { resolveModelWindow, STREAM_USAGE_PROVIDERS } from "@/lib/tokenOptimizer/modelRegistry";

describe("resolveModelWindow", () => {
  it("matches known OpenAI models with documented windows", () => {
    const gpt4o = resolveModelWindow("openai", "gpt-4o-mini");
    expect(gpt4o.contextWindow).toBe(128_000);
    expect(gpt4o.source).toBe("documented-model");
    expect(gpt4o.caching).toBe("automatic");
  });

  it("matches Anthropic models with 200K windows and explicit caching", () => {
    const claude = resolveModelWindow("anthropic", "claude-haiku-4-5-20251001");
    expect(claude.contextWindow).toBe(200_000);
    expect(claude.caching).toBe("explicit");
  });

  it("matches Gemini 1.5/2.5 Pro with the 2M window", () => {
    expect(resolveModelWindow("gemini", "gemini-1.5-pro").contextWindow).toBe(2_097_152);
    expect(resolveModelWindow("gemini", "gemini-2.0-flash").contextWindow).toBe(1_048_576);
  });

  it("matches DeepSeek with the 64K window", () => {
    expect(resolveModelWindow("deepseek", "deepseek-chat").contextWindow).toBe(65_536);
  });

  it("matches provider-prefixed OpenRouter models (vendor/model format)", () => {
    const resolved = resolveModelWindow("openrouter", "anthropic/claude-3.5-sonnet");
    expect(resolved.contextWindow).toBe(200_000);
    expect(resolved.source).toBe("documented-model");
  });

  it("rounds DOWN for unknown models on aggregator providers", () => {
    const resolved = resolveModelWindow("together", "totally-unknown-model-9000");
    expect(resolved.source).toBe("provider-default");
    expect(resolved.contextWindow).toBeLessThanOrEqual(32_768);
  });

  it("is conservative for the shared gateway (unknowable upstream model)", () => {
    const resolved = resolveModelWindow("shared");
    expect(resolved.source).toBe("provider-default");
    expect(resolved.contextWindow).toBeLessThanOrEqual(32_768);
    expect(reservedWithinWindow(resolved.contextWindow, resolved.maxOutputTokens)).toBe(true);
  });

  it("always keeps maxOutputTokens within the context window", () => {
    for (const provider of ["openai", "anthropic", "gemini", "groq", "shared"] as const) {
      const resolved = resolveModelWindow(provider);
      expect(reservedWithinWindow(resolved.contextWindow, resolved.maxOutputTokens)).toBe(true);
    }
  });
});

describe("STREAM_USAGE_PROVIDERS", () => {
  it("includes documented stream_options providers and excludes risky gateways", () => {
    expect(STREAM_USAGE_PROVIDERS.has("openai")).toBe(true);
    expect(STREAM_USAGE_PROVIDERS.has("groq")).toBe(true);
    expect(STREAM_USAGE_PROVIDERS.has("deepseek")).toBe(true);
    // Providers where the extra param is not documented to be safe:
    expect(STREAM_USAGE_PROVIDERS.has("gemini")).toBe(false);
    expect(STREAM_USAGE_PROVIDERS.has("perplexity")).toBe(false);
    expect(STREAM_USAGE_PROVIDERS.has("cohere")).toBe(false);
    expect(STREAM_USAGE_PROVIDERS.has("anthropic")).toBe(false); // own SSE protocol
  });
});

function reservedWithinWindow(contextWindow: number, maxOutputTokens: number): boolean {
  return maxOutputTokens > 0 && maxOutputTokens < contextWindow;
}
