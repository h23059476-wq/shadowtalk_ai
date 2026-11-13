/**
 * Intelligent Workspace Batch 1 — real provider usage parsing.
 *
 * Every SSE `usage` payload used to be dropped at the stream layer, so the
 * cost tracker ran on char-based estimates against a hard-coded model. This
 * module parses the DOCUMENTED usage shapes of the providers we call:
 *
 *  - OpenAI-compatible (OpenAI, Groq, DeepSeek, OpenRouter, Together,
 *    Fireworks, xAI, Cerebras, Mistral, aggregators): `usage` on the final
 *    chunk when `stream_options.include_usage` is requested —
 *    `{ prompt_tokens, completion_tokens, prompt_tokens_details.cached_tokens }`
 *    — plus DeepSeek's `prompt_cache_hit_tokens` field.
 *  - Anthropic: `message_start` carries input usage
 *    (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`),
 *    `message_delta` carries cumulative `output_tokens`.
 *
 * Caching is REPORTED ONLY when the provider itself returns cached-token
 * counts. Nothing is inferred or fabricated.
 */

export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  /** Tokens the provider reported as served from its prompt cache. */
  cachedInputTokens?: number;
  /** true = numbers came from the provider; false = caller-side estimate. */
  measured: boolean;
}

export const ESTIMATED_USAGE: ProviderUsage = { measured: false };

export function measuredUsage(partial: Omit<ProviderUsage, "measured">): ProviderUsage {
  return { ...partial, measured: true };
}

function toInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

/** Parse an OpenAI-compatible SSE chunk. Returns null when no usage present. */
export function parseOpenAiUsageChunk(parsed: unknown): ProviderUsage | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const usage = (parsed as { usage?: unknown }).usage;
  if (typeof usage !== "object" || usage === null) return null;
  const u = usage as {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    prompt_tokens_details?: { cached_tokens?: unknown } | null;
    prompt_cache_hit_tokens?: unknown;
  };
  const inputTokens = toInt(u.prompt_tokens);
  const outputTokens = toInt(u.completion_tokens);
  const cached =
    toInt(u.prompt_tokens_details?.cached_tokens) ?? toInt(u.prompt_cache_hit_tokens);
  if (inputTokens === undefined && outputTokens === undefined) return null;
  return measuredUsage({
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(cached !== undefined ? { cachedInputTokens: cached } : {}),
  });
}

/**
 * Parse one Anthropic SSE event. `message_start` → input usage;
 * `message_delta` → cumulative output. Returns null for other event types.
 */
export function parseAnthropicUsageEvent(event: unknown): ProviderUsage | null {
  if (typeof event !== "object" || event === null) return null;
  const e = event as { type?: unknown; message?: unknown; usage?: unknown };
  if (e.type === "message_start" && typeof e.message === "object" && e.message !== null) {
    const u = (e.message as { usage?: unknown }).usage as
      | {
          input_tokens?: unknown;
          cache_read_input_tokens?: unknown;
          cache_creation_input_tokens?: unknown;
        }
      | undefined;
    if (!u) return null;
    const inputTokens = toInt(u.input_tokens);
    if (inputTokens === undefined) return null;
    // Anthropic counts cache reads and cache creation separately from base
    // input; all three are billed input. Cache READS are the "cached" figure
    // (served from cache); creation writes new cache entries.
    const cacheRead = toInt(u.cache_read_input_tokens) ?? 0;
    return measuredUsage({
      inputTokens: inputTokens + cacheRead + (toInt(u.cache_creation_input_tokens) ?? 0),
      cachedInputTokens: cacheRead > 0 ? cacheRead : undefined,
    });
  }
  if (e.type === "message_delta" && typeof e.usage === "object" && e.usage !== null) {
    const outputTokens = toInt((e.usage as { output_tokens?: unknown }).output_tokens);
    if (outputTokens === undefined) return null;
    return measuredUsage({ outputTokens });
  }
  return null;
}

/** Combine partial usage reports from the same stream (later values win). */
export function mergeUsage(a: ProviderUsage | null, b: ProviderUsage | null): ProviderUsage | null {
  if (!a) return b;
  if (!b) return a;
  return {
    inputTokens: b.inputTokens ?? a.inputTokens,
    outputTokens: b.outputTokens ?? a.outputTokens,
    cachedInputTokens: b.cachedInputTokens ?? a.cachedInputTokens,
    measured: a.measured || b.measured,
  };
}
