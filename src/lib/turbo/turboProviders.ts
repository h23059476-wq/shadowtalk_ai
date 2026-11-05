import { getCachedAiAccessMode } from "@/lib/aiAccessMode";
import { getByokConfig } from "@/lib/byok";

/**
 * Turbo Provider Configuration — Key resolution & provider constants.
 *
 * Shared between useTurboChat (React hook) and turboEngine (forge/execute).
 * Keeps key resolution logic DRY.
 */



// ---- Provider Constants ----

/** Primary Turbo model — fastest powerful model on Groq */
export const TURBO_MODEL_GROQ = 'llama-3.3-70b-versatile';

/** Chat-optimized Turbo model — smallest, fastest (used by useTurboChat) */
export const TURBO_MODEL_CHAT = 'llama-3.1-8b-instant';

/** OpenRouter free fallback model */
export const TURBO_MODEL_OPENROUTER = 'google/gemini-2.0-flash-exp:free';

/** Groq API endpoint */
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** OpenRouter API endpoint */
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** OpenAI API endpoint */
export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/** OpenAI model */
export const TURBO_MODEL_OPENAI = 'gpt-4o';

// ---- Key Resolution ----

/**
 * Resolve a user-supplied key only. Shared provider credentials must remain
 * server-side and are never bundled into the browser.
 *
 * Reads the v2 per-user BYOK namespace (`shadowtalk.byok.v2.<uid>`) — the
 * legacy un-namespaced `shadowtalk.byok.v1` key is no longer consulted.
 */
export function resolveTurboKey(): string | null {
  if (typeof window === "undefined" || getCachedAiAccessMode() !== "byok") return null;
  const cfg = getByokConfig();
  const key = cfg?.apiKey?.trim();
  return key ? key : null;
}

/**
 * Client-side provider API keys are configured through the BYOK settings UI,
 * not Vite environment variables.
 */
export function resolveOpenAIKey(): string | null {
  return null;
}

// ---- Provider Info ----

export interface TurboProviderInfo {
  id: 'groq' | 'openrouter' | 'openai';
  name: string;
  model: string;
  url: string;
  maxTokens: number;
  /** Approximate TTFB on Groq hardware */
  avgTtftMs: number;
}

export const TURBO_PROVIDERS: TurboProviderInfo[] = [
  {
    id: 'groq',
    name: 'Groq (Llama 3.3 70B)',
    model: TURBO_MODEL_GROQ,
    url: GROQ_API_URL,
    maxTokens: 8192,
    avgTtftMs: 250,
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o)',
    model: TURBO_MODEL_OPENAI,
    url: OPENAI_API_URL,
    maxTokens: 16384,
    avgTtftMs: 600,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Free (Gemini Flash)',
    model: TURBO_MODEL_OPENROUTER,
    url: OPENROUTER_API_URL,
    maxTokens: 4096,
    avgTtftMs: 600,
  },
];
