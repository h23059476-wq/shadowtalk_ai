/**
 * Intelligent Workspace Batch 1 — provider/model context-window registry.
 *
 * Before this module existed the only context management in the app was a
 * fixed `slice(-14)` history cap and a hard-coded `maxTokens: 8192` — both
 * blind to what the selected provider can actually hold. Never assume every
 * provider has the same context window: this registry maps each BYOK provider
 * (and the shared gateway) to documented context limits, with known-model
 * overrides matched by substring and conservative defaults for unknown
 * models. When a model is unknown we deliberately round DOWN — compacting
 * slightly early is recoverable (summaries), overflowing the provider's
 * window is a hard 400 error.
 */

import type { ByokProvider } from "@/lib/byok";

/** Where a provider applies prompt caching. Only DOCUMENTED mechanisms. */
export type CacheSupport =
  /** Anthropic-style explicit `cache_control` breakpoints. */
  | "explicit"
  /** OpenAI/DeepSeek/Groq-style automatic caching — no request changes;
   *  usage is REPORTED only when the provider returns cached-token counts. */
  | "automatic"
  | "none";

export interface ModelWindow {
  /** Total prompt+completion tokens the model accepts. */
  contextWindow: number;
  /** Provider-capped completion tokens. */
  maxOutputTokens: number;
  caching: CacheSupport;
}

export type ProviderId = ByokProvider | "shared";

export interface ResolvedModelWindow extends ModelWindow {
  /** The registry entry that matched, or null when the provider default was used. */
  matchedModel: string | null;
  source: "documented-model" | "provider-default";
}

/**
 * Known-model overrides. Order matters — first match wins. Values are
 * documented provider limits, rounded down to round numbers so estimation
 * drift can never push a request over a real limit.
 */
const MODEL_WINDOWS: Array<{ match: RegExp; window: ModelWindow }> = [
  // OpenAI
  { match: /gpt-4o|gpt-4\.1|^o[34]-/i, window: { contextWindow: 128_000, maxOutputTokens: 16_384, caching: "automatic" } },
  { match: /gpt-4-turbo/i, window: { contextWindow: 128_000, maxOutputTokens: 4_096, caching: "automatic" } },
  { match: /gpt-3\.5/i, window: { contextWindow: 16_385, maxOutputTokens: 4_096, caching: "none" } },
  // Anthropic — 200K input on all current Claude families.
  { match: /claude-(?:3-5|3\.5|sonnet-4|haiku-4|opus-4)/i, window: { contextWindow: 200_000, maxOutputTokens: 8_192, caching: "explicit" } },
  { match: /claude/i, window: { contextWindow: 200_000, maxOutputTokens: 4_096, caching: "explicit" } },
  // Google — Gemini 1.5/2.x Pro hold 2M; flash families hold 1M.
  { match: /gemini-(?:1\.5|2\.5)-pro/i, window: { contextWindow: 2_097_152, maxOutputTokens: 8_192, caching: "automatic" } },
  { match: /gemini/i, window: { contextWindow: 1_048_576, maxOutputTokens: 8_192, caching: "automatic" } },
  // DeepSeek — V3/chat: 64K.
  { match: /deepseek/i, window: { contextWindow: 65_536, maxOutputTokens: 8_192, caching: "automatic" } },
  // Llama 3.x families (Groq/Together/Fireworks/Cerebras/aggregators).
  { match: /llama-?3\.3|llama-v3p3|meta-llama-3\.3/i, window: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "none" } },
  { match: /llama-?3\.[12]|llama-v3p[12]/i, window: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "none" } },
  // Perplexity Sonar online models.
  { match: /sonar/i, window: { contextWindow: 128_000, maxOutputTokens: 4_096, caching: "none" } },
  // Cohere command families.
  { match: /command/i, window: { contextWindow: 128_000, maxOutputTokens: 4_096, caching: "none" } },
  // xAI Grok.
  { match: /grok/i, window: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "none" } },
  // Mistral — small/medium/large 3.x hold 128K; older releases 32K.
  { match: /mistral-(?:small|medium|large|nemo)/i, window: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "none" } },
  { match: /mistral/i, window: { contextWindow: 32_768, maxOutputTokens: 4_096, caching: "none" } },
  // Qwen families commonly hosted by aggregators.
  { match: /qwen/i, window: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "none" } },
];

/**
 * Conservative per-provider defaults for models we cannot identify. Aggregator
 * providers host families with wildly different windows, so their unknown-model
 * default is deliberately the smallest plausible modern window (32K).
 */
const PROVIDER_DEFAULTS: Record<ProviderId, ModelWindow> = {
  openai: { contextWindow: 128_000, maxOutputTokens: 16_384, caching: "automatic" },
  anthropic: { contextWindow: 200_000, maxOutputTokens: 4_096, caching: "explicit" },
  gemini: { contextWindow: 1_048_576, maxOutputTokens: 8_192, caching: "automatic" },
  groq: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "automatic" },
  deepseek: { contextWindow: 65_536, maxOutputTokens: 8_192, caching: "automatic" },
  mistral: { contextWindow: 32_768, maxOutputTokens: 4_096, caching: "none" },
  perplexity: { contextWindow: 128_000, maxOutputTokens: 4_096, caching: "none" },
  cohere: { contextWindow: 128_000, maxOutputTokens: 4_096, caching: "none" },
  xai: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "none" },
  cerebras: { contextWindow: 131_072, maxOutputTokens: 8_192, caching: "none" },
  // Aggregators: unknown model → 32K (documented rationale above).
  openrouter: { contextWindow: 32_768, maxOutputTokens: 8_192, caching: "automatic" },
  together: { contextWindow: 32_768, maxOutputTokens: 8_192, caching: "none" },
  fireworks: { contextWindow: 32_768, maxOutputTokens: 8_192, caching: "none" },
  hyperbolic: { contextWindow: 32_768, maxOutputTokens: 8_192, caching: "none" },
  novita: { contextWindow: 32_768, maxOutputTokens: 8_192, caching: "none" },
  deepinfra: { contextWindow: 32_768, maxOutputTokens: 8_192, caching: "none" },
  // Shared Firebase gateway proxies an OpenRouter server-side key pool — the
  // target model is unknowable from the client, so stay conservative.
  shared: { contextWindow: 32_768, maxOutputTokens: 8_192, caching: "automatic" },
};

export function resolveModelWindow(provider: ProviderId, model?: string): ResolvedModelWindow {
  const fallback = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.shared;
  if (model) {
    for (const entry of MODEL_WINDOWS) {
      if (entry.match.test(model)) {
        return { ...entry.window, matchedModel: model, source: "documented-model" };
      }
    }
  }
  return { ...fallback, matchedModel: null, source: "provider-default" };
}

/**
 * OpenAI-compatible providers documented to accept
 * `stream_options: { include_usage: true }`. Providers outside this set get
 * NO extra request fields — an unknown-param 400 would break chat entirely —
 * and fall back to estimation.
 */
export const STREAM_USAGE_PROVIDERS: ReadonlySet<ProviderId> = new Set([
  "openai",
  "groq",
  "deepseek",
  "openrouter",
  "together",
  "fireworks",
  "xai",
  "cerebras",
  "hyperbolic",
  "novita",
  "deepinfra",
  "mistral",
]);
