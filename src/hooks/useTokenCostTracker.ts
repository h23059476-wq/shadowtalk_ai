import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Real-time token + BYOK cost tracker.
 *
 * Wraps a chat completion call: counts streamed tokens, measures wall-clock
 * latency, and projects the per-request cost based on the active provider's
 * per-1M-token pricing. Also tracks cumulative spend in localStorage so the
 * "Saved $20/mo vs ChatGPT Plus" line uses real numbers.
 *
 * Pricing as of 2026-10 (per 1M tokens, USD):
 *   openai/gpt-4o-mini:      $0.15 in / $0.60 out
 *   openai/gpt-4o:           $2.50 in / $10 out
 *   anthropic/claude-3.5:    $3.00 in / $15 out
 *   google/gemini-2.0-flash: $0.075 in / $0.30 out
 *   groq/llama-3.3-70b:      $0.59 in / $0.79 out
 *   openrouter/* :           pass-through (use OpenRouter pricing header)
 */

export interface ProviderPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const PRICING: Record<string, ProviderPricing> = {
  // OpenAI
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.0 },
  "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },
  // Anthropic
  "claude-haiku-5-5": { inputPer1M: 0.10, outputPer1M: 0.50 },
  "claude-3-5-sonnet": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-3-5-haiku": { inputPer1M: 0.80, outputPer1M: 4.0 },
  // Google
  "gemini-2.0-flash": { inputPer1M: 0.075, outputPer1M: 0.30 },
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  // Groq
  "llama-3.3-70b-versatile": { inputPer1M: 0.59, outputPer1M: 0.79 },
  // Mistral
  "mistral-small-latest": { inputPer1M: 0.20, outputPer1M: 0.60 },
  "mistral-large-latest": { inputPer1M: 2.00, outputPer1M: 6.00 },
  // DeepSeek
  "deepseek-chat": { inputPer1M: 0.27, outputPer1M: 1.10 },
  // xAI
  "grok-2-latest": { inputPer1M: 2.00, outputPer1M: 10.0 },
  // Perplexity
  "llama-3.1-sonar-small-128k-online": { inputPer1M: 0.20, outputPer1M: 0.20 },
  // Cohere
  "command-r-plus": { inputPer1M: 2.50, outputPer1M: 10.0 },
  // Cerebras
  "llama-3.3-70b": { inputPer1M: 0.85, outputPer1M: 1.20 },
};

/** Fallback if the model isn't in our table — assume GPT-4o-mini pricing. */
const DEFAULT_PRICING: ProviderPricing = PRICING["gpt-4o-mini"];

export function pricingForModel(model: string): ProviderPricing {
  // Match by prefix — handle provider/model format like "openai/gpt-4o-mini"
  const normalized = model.toLowerCase().replace(/^.*\//, "");
  for (const key of Object.keys(PRICING)) {
    if (normalized.startsWith(key.toLowerCase())) return PRICING[key];
  }
  return DEFAULT_PRICING;
}

const SPEND_KEY = "shadowtalk_byok_spend_v1";

interface SpendState {
  /** Cumulative USD spent on BYOK tokens, all-time, this browser. */
  totalUsd: number;
  /** ISO date string for the first day of the current calendar month. */
  monthStart: string;
  /** USD spent in the current calendar month. */
  monthUsd: number;
  /** Total requests made. */
  requestCount: number;
}

function loadSpend(): SpendState {
  try {
    const raw = localStorage.getItem(SPEND_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SpendState;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartStr = monthStart.toISOString();
      if (parsed.monthStart !== monthStartStr) {
        // New month — reset monthUsd
        return { ...parsed, monthStart: monthStartStr, monthUsd: 0 };
      }
      return parsed;
    }
  } catch {
    /* fall through to default */
  }
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return {
    totalUsd: 0,
    monthStart: monthStart.toISOString(),
    monthUsd: 0,
    requestCount: 0,
  };
}

function saveSpend(s: SpendState) {
  try {
    localStorage.setItem(SPEND_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota errors */
  }
}

export interface TokenCostState {
  /** Tokens/sec for the most recent request (rolling). */
  tokensPerSecond: number;
  /** Last request cost in USD, e.g. 0.0014. */
  lastRequestCost: number;
  /** Cumulative monthly USD spent on BYOK. */
  monthSpendUsd: number;
  /** Cumulative all-time USD spent on BYOK. */
  totalSpendUsd: number;
  /** Total BYOK requests made. */
  requestCount: number;
  /** Projected savings vs ChatGPT Plus ($20/mo). */
  savingsVsChatGptPlus: number;
  /** Call this when a streamed token arrives. */
  onToken: (model: string) => void;
  /** Call this when a request completes. */
  onRequestComplete: (model: string, inputTokens: number, outputTokens: number) => void;
  /** Reset cumulative spend (for testing). */
  reset: () => void;
}

export function useTokenCostTracker(): TokenCostState {
  const [tokensPerSecond, setTokensPerSecond] = useState(0);
  const [lastRequestCost, setLastRequestCost] = useState(0);
  const [spend, setSpend] = useState<SpendState>(loadSpend);
  const tokenCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // Persist spend to localStorage whenever it changes
  useEffect(() => {
    saveSpend(spend);
  }, [spend]);

  const onToken = useCallback((_model: string) => {
    if (startTimeRef.current === 0) startTimeRef.current = performance.now();
    tokenCountRef.current += 1;
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    if (elapsed > 0.1) {
      setTokensPerSecond(tokenCountRef.current / elapsed);
    }
  }, []);

  const onRequestComplete = useCallback(
    (model: string, inputTokens: number, outputTokens: number) => {
      const pricing = pricingForModel(model);
      const cost =
        (inputTokens / 1_000_000) * pricing.inputPer1M +
        (outputTokens / 1_000_000) * pricing.outputPer1M;

      setLastRequestCost(cost);
      setSpend((prev) => ({
        ...prev,
        totalUsd: prev.totalUsd + cost,
        monthUsd: prev.monthUsd + cost,
        requestCount: prev.requestCount + 1,
      }));

      // Reset for next request
      tokenCountRef.current = 0;
      startTimeRef.current = 0;
      setTokensPerSecond(0);
    },
    [],
  );

  const reset = useCallback(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const fresh: SpendState = {
      totalUsd: 0,
      monthStart: monthStart.toISOString(),
      monthUsd: 0,
      requestCount: 0,
    };
    setSpend(fresh);
    saveSpend(fresh);
    setLastRequestCost(0);
    setTokensPerSecond(0);
  }, []);

  const savingsVsChatGptPlus = Math.max(0, 20 - spend.monthUsd);

  return {
    tokensPerSecond,
    lastRequestCost,
    monthSpendUsd: spend.monthUsd,
    totalSpendUsd: spend.totalUsd,
    requestCount: spend.requestCount,
    savingsVsChatGptPlus,
    onToken,
    onRequestComplete,
    reset,
  };
}

export default useTokenCostTracker;
