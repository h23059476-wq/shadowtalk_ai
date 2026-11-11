/**
 * executeAIRequest — Centralized AI request wrapper for ShadowTalk AI.
 *
 * ALL AI features (Chatbot, Document Generation, Image Generation, Vision
 * Analysis, Code IDE) MUST route through this function. It reads the
 * AIKeyContext to decide which key/endpoint to use:
 *
 *  - TECH cohort:     Uses the user's own API key (BYOK) directly in the
 *                     Authorization header. Direct provider connection,
 *                     unlimited messages.
 *  - NON_TECH cohort: Routes through the OmniRoute AI Gateway (configured
 *                     via VITE_OMNIROUTE_ENDPOINT). OmniRoute provides
 *                     load-balanced access across Gemini, Groq, and Mistral
 *                     with token compression and automatic 429 circuit-
 *                     breaker key rotation. Uses the OmniRoute model
 *                     identifier `auto/fast` (or `auto/cheap` if configured).
 *                     Falls back to streamCloudChat if OmniRoute is not
 *                     configured. Subject to the 50/day cap enforced by
 *                     useDailyUsage.
 *
 * Error handling:
 *  - BYOK key invalid/exhausted (401/402/429): throws AIKeyError with
 *    code 'BYOK_KEY_FAILED' so the UI can prompt for a new key.
 *  - OmniRoute pool exhausted (all upstream keys rate-limited): throws
 *    AIKeyError with code 'SHARED_RATE_LIMITED' so the UI can show the
 *    upgrade modal.
 *  - Network errors: throws AIKeyError with code 'NETWORK_ERROR'.
 *
 * Backward compatibility:
 *  This is a NEW entry point — existing code paths (streamCloudChat,
 *  turboComplete, AIProviderRouter) continue to work unchanged. New
 *  features should adopt this wrapper for unified cohort-aware routing.
 */

import type { CloudChatMessage, CloudChatOptions, CloudChatResult } from '@/lib/cloudChat';
import { streamCloudChat } from '@/lib/cloudChat';
import { getByokConfig, streamByokChat } from '@/lib/byok';

// ── Types ──────────────────────────────────────────────────────────────

export type AICohort = 'TECH' | 'NON_TECH';

export interface ExecuteAIRequestParams {
  /** The cohort making the request (from AIKeyContext.userCohort). */
  cohort: AICohort;
  /** The user's API key (from AIKeyContext.userApiKey, TECH only). */
  userApiKey: string;
  /** Chat messages to send. */
  messages: CloudChatMessage[];
  /** Options (model, temperature, signal, onDelta for streaming, etc.). */
  options?: CloudChatOptions;
}

export type AIRequestErrorCode =
  | 'BYOK_KEY_FAILED'
  | 'BYOK_KEY_MISSING'
  | 'SHARED_RATE_LIMITED'
  | 'SHARED_KEY_MISSING'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class AIKeyError extends Error {
  code: AIRequestErrorCode;
  status?: number;
  constructor(code: AIRequestErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'AIKeyError';
    this.code = code;
    this.status = status;
  }
}

// ── OmniRoute gateway config (NON_TECH) ────────────────────────────────

/**
 * OmniRoute gateway configuration for NON_TECH users.
 *
 * Env vars (all optional — if absent, NON_TECH falls back to streamCloudChat):
 *  - VITE_OMNIROUTE_ENDPOINT: The OmniRoute /v1/chat/completions URL.
 *    e.g. "https://your-omniroute-instance/v1/chat/completions"
 *  - VITE_OMNIROUTE_API_KEY:  Bearer token for the OmniRoute instance.
 *    ⚠️  SECURITY: VITE_* vars are in browser builds. Only use OmniRoute with
 *    a key designed for client exposure (like a Stripe publishable key). For
 *    shared provider keys, use Firebase Functions Secret Manager (server-side).
 *  - VITE_OMNIROUTE_MODEL:    OmniRoute model identifier. Defaults to
 *    "auto/fast" (load-balanced across Gemini/Groq/Mistral with token
 *    compression). Use "auto/cheap" for the lowest-cost routing.
 */
interface OmniRouteConfig {
  endpoint: string;
  apiKey: string | null;
  model: string;
}

function getOmniRouteConfig(): OmniRouteConfig | null {
  const env = (import.meta as any).env ?? {};
  const endpoint = env.VITE_OMNIROUTE_ENDPOINT;
  if (typeof endpoint !== 'string' || endpoint.trim().length === 0) {
    return null;
  }
  return {
    endpoint: endpoint.trim(),
    apiKey: typeof env.VITE_OMNIROUTE_API_KEY === 'string' ? env.VITE_OMNIROUTE_API_KEY.trim() : null,
    model: (typeof env.VITE_OMNIROUTE_MODEL === 'string' && env.VITE_OMNIROUTE_MODEL.trim().length > 0)
      ? env.VITE_OMNIROUTE_MODEL.trim()
      : 'auto/fast',
  };
}

// ── Legacy shared key resolution (fallback) ─────────────────────────────

/**
 * Legacy: Resolve the shared OpenRouter key for NON_TECH users.
 * Only used as a fallback when OmniRoute is not configured.
 */
// ── Legacy shared key resolution — REMOVED for security (audit ST-02) ───
// VITE_OPENROUTER_SHARED_KEY was a direct OpenRouter key in the client build.
// Shared keys must ONLY live in Firebase Functions Secret Manager (server-side).
// The Cloud Function `/chat` endpoint handles shared-mode requests securely.


// ── BYOK (TECH) execution ──────────────────────────────────────────────

async function executeByokRequest(
  apiKey: string,
  messages: CloudChatMessage[],
  options?: CloudChatOptions,
): Promise<CloudChatResult> {
  // Read the existing BYOK config to know which provider/model to use.
  // If the user just set their key via onboarding, AIKeyContext already
  // synced it to the BYOK system.
  const byokConfig = getByokConfig();

  if (!byokConfig && apiKey) {
    // Fallback: if BYOK config isn't set but we have a key, treat it as
    // an OpenRouter key (most common BYOK choice).
    const { saveByokConfig } = await import('@/lib/byok');
    saveByokConfig({
      provider: 'openrouter',
      apiKey,
      model: 'openai/gpt-4o-mini',
      mode: 'always',
    });
  }

  const config = byokConfig || { provider: 'openrouter' as const, apiKey, model: 'openai/gpt-4o-mini', mode: 'always' as const };

  try {
    const result = await streamByokChat(
      { ...config, apiKey },
      messages,
      options,
    );

    // Detect key failures from the result.
    if (result.error && !result.content) {
      const err = result.error.toLowerCase();
      if (err.includes('401') || err.includes('unauthorized') || err.includes('invalid')) {
        throw new AIKeyError('BYOK_KEY_FAILED', 'Your API key was rejected (invalid or expired). Please update your key in Settings.', 401);
      }
      if (err.includes('402') || err.includes('payment') || err.includes('quota') || err.includes('credits')) {
        throw new AIKeyError('BYOK_KEY_FAILED', 'Your API key has insufficient credits. Please top up your provider account or switch keys.', 402);
      }
      if (err.includes('429') || err.includes('rate')) {
        throw new AIKeyError('BYOK_KEY_FAILED', 'Your API key is rate-limited. Please try again in a moment.', 429);
      }
    }

    return result;
  } catch (err) {
    if (err instanceof AIKeyError) throw err;
    // Network/fetch errors from the BYOK provider.
    throw new AIKeyError('NETWORK_ERROR', `Could not reach your AI provider: ${(err as Error)?.message || 'network error'}`);
  }
}

// ── OmniRoute gateway execution (NON_TECH primary) ─────────────────────

/**
 * Execute a chat request via the OmniRoute AI Gateway.
 *
 * OmniRoute provides:
 *  - Load balancing across Gemini, Groq, and Mistral upstream providers.
 *  - Token compression to reduce cost and latency.
 *  - Automatic 429 circuit-breaker key rotation (if one upstream key is
 *    rate-limited, OmniRoute transparently rotates to the next).
 *  - OpenAI-compatible /v1/chat/completions API (SSE streaming supported).
 *
 * The model identifier is `auto/fast` by default (or `auto/cheap` if
 * VITE_OMNIROUTE_MODEL is set). These tell OmniRoute to pick the best
 * upstream model automatically.
 *
 * If OmniRoute returns a 429 or pool-exhausted error, we throw
 * AIKeyError('SHARED_RATE_LIMITED') so the UI can prompt the user to
 * switch to BYOK.
 */
async function executeOmniRouteRequest(
  config: OmniRouteConfig,
  messages: CloudChatMessage[],
  options?: CloudChatOptions,
): Promise<CloudChatResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const body: Record<string, any> = {
    model: options?.model || config.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
    temperature: options?.temperature ?? 0.7,
  };
  if (options?.maxTokens) {
    body.max_tokens = options.maxTokens;
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    // ── Error handling ──
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const status = response.status;
      const lowerErr = errorText.toLowerCase();

      // 429 or pool-exhausted → prompt BYOK upgrade.
      if (status === 429 || lowerErr.includes('rate') || lowerErr.includes('circuit') || lowerErr.includes('pool')) {
        throw new AIKeyError(
          'SHARED_RATE_LIMITED',
          'The OmniRoute gateway is currently at capacity (all upstream providers rate-limited). Please try again in a moment, or switch to BYOK mode for unlimited access.',
          status,
        );
      }
      // 402 / payment → credits exhausted.
      if (status === 402 || lowerErr.includes('credit') || lowerErr.includes('payment') || lowerErr.includes('exhausted')) {
        throw new AIKeyError(
          'SHARED_RATE_LIMITED',
          'The OmniRoute gateway credits are exhausted. Switch to BYOK mode with your own key for unlimited access.',
          status,
        );
      }
      // 401 / auth → OmniRoute key misconfigured.
      if (status === 401 || lowerErr.includes('unauthorized') || lowerErr.includes('invalid')) {
        throw new AIKeyError(
          'SHARED_KEY_MISSING',
          'The OmniRoute gateway rejected the request (authentication error). Please contact support or switch to BYOK mode.',
          status,
        );
      }
      // Other errors.
      throw new AIKeyError(
        'NETWORK_ERROR',
        `OmniRoute gateway error (${status}): ${errorText.slice(0, 200) || 'unknown error'}`,
        status,
      );
    }

    // ── Stream the SSE response ──
    // OmniRoute speaks OpenAI-compatible SSE: data: {choices:[{delta:{content}}]}\n\n
    // terminated by data: [DONE]\n\n.
    if (!response.body) {
      // Non-streaming fallback.
      const json = await response.json().catch(() => ({}));
      const content = json?.choices?.[0]?.message?.content ?? '';
      return {
        content,
        source: 'omniroute',
        modelUsed: body.model,
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines.
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              accumulated += delta;
              // Call onDelta with the accumulated text (matching CloudChatOptions contract).
              if (options?.onDelta) {
                options.onDelta(accumulated);
              }
            }
          } catch {
            // Skip malformed JSON lines (keep-alive comments, etc.).
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: accumulated,
      source: 'omniroute',
      modelUsed: body.model,
    };
  } catch (err) {
    // Re-throw AIKeyError as-is.
    if (err instanceof AIKeyError) throw err;

    // Abort signals should propagate.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }

    // Network errors (fetch failed, CORS, DNS, etc.).
    throw new AIKeyError(
      'NETWORK_ERROR',
      `Could not reach the OmniRoute gateway: ${(err as Error)?.message || 'network error'}`,
    );
  }
}

// ── Shared pool (NON_TECH) execution ───────────────────────────────────

async function executeSharedRequest(
  messages: CloudChatMessage[],
  options?: CloudChatOptions,
): Promise<CloudChatResult> {
  // ── Primary: OmniRoute gateway ──
  const omniRoute = getOmniRouteConfig();
  if (omniRoute) {
    return executeOmniRouteRequest(omniRoute, messages, options);
  }

  // ── Fallback 1: Legacy shared OpenRouter key ──
  const sharedKey = null; // Removed (audit ST-02)
  if (sharedKey) {
    try {
      const result = await streamByokChat(
        {
          provider: 'openrouter',
          apiKey: sharedKey,
          model: 'openai/gpt-4o-mini',
          mode: 'always',
        },
        messages,
        options,
      );

      if (result.error && !result.content) {
        const err = result.error.toLowerCase();
        if (err.includes('429') || err.includes('rate')) {
          throw new AIKeyError('SHARED_RATE_LIMITED', 'The shared AI pool is rate-limited. Try again shortly, or switch to BYOK mode for unlimited access.');
        }
        if (err.includes('402') || err.includes('credits') || err.includes('insufficient')) {
          throw new AIKeyError('SHARED_RATE_LIMITED', 'The shared AI pool credits are exhausted. Switch to BYOK mode for unlimited access.');
        }
      }

      return result;
    } catch (err) {
      if (err instanceof AIKeyError) throw err;
      throw new AIKeyError('NETWORK_ERROR', `Shared AI request failed: ${(err as Error)?.message || 'network error'}`);
    }
  }

  // ── Fallback 2: Firebase Cloud Functions (streamCloudChat) ──
  // This ensures the app works out-of-the-box even without OmniRoute or shared key env vars.
  try {
    const result = await streamCloudChat(messages, options);
    if (result.error && !result.content) {
      const err = result.error.toLowerCase();
      if (err.includes('429') || err.includes('rate')) {
        throw new AIKeyError('SHARED_RATE_LIMITED', 'The shared AI pool is busy right now. Try again in a moment, or switch to BYOK mode for unlimited access.');
      }
      if (err.includes('402') || err.includes('credits') || err.includes('exhausted')) {
        throw new AIKeyError('SHARED_RATE_LIMITED', 'The shared AI pool credits are exhausted. Switch to BYOK mode with your own key for unlimited access.');
      }
    }
    return result;
  } catch (err) {
    if (err instanceof AIKeyError) throw err;
    throw new AIKeyError('NETWORK_ERROR', `Shared AI request failed: ${(err as Error)?.message || 'network error'}`);
  }
}

// ── Master execution function ──────────────────────────────────────────

/**
 * Execute an AI request with cohort-aware routing.
 *
 * @example
 * ```tsx
 * const { userCohort, userApiKey } = useAIKeyContext();
 * const { checkAndIncrement } = useDailyUsage();
 *
 * if (!checkAndIncrement()) {
 *   setShowLimitModal(true);
 *   return;
 * }
 *
 * try {
 *   const result = await executeAIRequest({
 *     cohort: userCohort!,
 *     userApiKey,
 *     messages,
 *     options: { onDelta: (text) => setStreaming(text) },
 *   });
 *   setResponse(result.content);
 * } catch (err) {
 *   if (err instanceof AIKeyError) {
 *     if (err.code === 'BYOK_KEY_FAILED') setShowKeyErrorModal(true);
 *     if (err.code === 'SHARED_RATE_LIMITED') setShowLimitModal(true);
 *   }
 * }
 * ```
 */
export async function executeAIRequest(
  params: ExecuteAIRequestParams,
): Promise<CloudChatResult> {
  const { cohort, userApiKey, messages, options } = params;

  if (cohort === 'TECH') {
    if (!userApiKey) {
      throw new AIKeyError('BYOK_KEY_MISSING', 'No API key configured. Please add your key in Settings or restart onboarding.');
    }
    return executeByokRequest(userApiKey, messages, options);
  }

  // NON_TECH
  return executeSharedRequest(messages, options);
}

export default executeAIRequest;
