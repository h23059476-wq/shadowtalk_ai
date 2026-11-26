/**
 * Tier 2 — Hugging Face Inference Router provider (OpenAI-compatible chat).
 *
 * Streams `https://router.huggingface.co/v1/chat/completions` with the user's
 * own `hf_...` token (BYOM: bring your own MODEL quota — Hugging Face's free
 * monthly inference credits ride the user's account, zero cost to ShadowTalk).
 * Only reachable when the Tier 2 OAuth flow stored a token in the encrypted
 * credential store; never uses localStorage.
 *
 * Failure surface: 401 → the token died (user must reconnect), 402 → the
 * account's free monthly credits are exhausted (paid upgrade or Tier 3
 * ZeroGPU), 429 → rate limited. The chat layer degrades to the shared tier
 * with the banner copy from hfRouterUnavailableMessage().
 */
import { getHfAccessToken } from "@/lib/auth/hfCredentials";
import type { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";

const ROUTER_BASE = "https://router.huggingface.co/v1";
/** Any text-generation model the router hosts; small and fast for fallback chat. */
export const HF_ROUTER_DEFAULT_MODEL = "meta-llama/Llama-3.2-1B-Instruct:novita";

export type HfRouterErrorKind = "unauthorized" | "payment" | "rate_limited" | "network" | "unknown";

export class HfRouterError extends Error {
  kind: HfRouterErrorKind;
  status: number | null;
  constructor(kind: HfRouterErrorKind, status: number | null, message: string) {
    super(message);
    this.name = "HfRouterError";
    this.kind = kind;
    this.status = status;
  }
}

/** Map an HTTP status / error shape to the typed ladder. */
export function classifyHfRouterFailure(status: number | null, body: string): HfRouterErrorKind {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 402) return "payment";
  if (status === 429) return "rate_limited";
  if (status == null) return "network";
  return "unknown";
}

/** Banner copy the chat layer shows when the router path fails. */
export function hfRouterUnavailableMessage(kind: HfRouterErrorKind): string {
  switch (kind) {
    case "unauthorized":
      return "Your Hugging Face connection expired. Reconnect it in Settings → BYOK, or use another provider.";
    case "payment":
      return "This month's free Hugging Face inference credits are used up. Reconnect next month, add a paid provider key, or let the shared tier answer this one.";
    case "rate_limited":
      return "Hugging Face is rate-limiting your account right now. Retry shortly, or let another provider answer.";
    case "network":
      return "Could not reach the Hugging Face router. Check your connection, or use another provider.";
    default:
      return "The Hugging Face router could not answer this request. Try again or use another provider.";
  }
}

/** Whether the user has a stored HF token — gates the router path in the UI. */
export async function isHfRouterConfigured(): Promise<boolean> {
  const token = await getHfAccessToken();
  return !!token && token.startsWith("hf_");
}

/** OpenAI-compatible chat via the HF router, streamed (SSE). */
export async function streamHfRouterChat(
  messages: CloudChatMessage[],
  options: CloudChatOptions & { model?: string } = {},
): Promise<CloudChatResult> {
  const token = await getHfAccessToken();
  if (!token) {
    throw new HfRouterError("unauthorized", null, "No Hugging Face account is connected.");
  }
  const model = options.model || HF_ROUTER_DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(`${ROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      signal: options.signal,
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new HfRouterError("network", null, `Could not reach the Hugging Face router: ${(error as Error).message}`);
  }

  if (!response.ok || !response.body) {
    const bodyText = await response.text().catch(() => "");
    const kind = classifyHfRouterFailure(response.status || null, bodyText);
    const detail = bodyText.slice(0, 300) || "no detail";
    throw new HfRouterError(kind, response.status || null, `Hugging Face router error ${response.status}: ${detail}`);
  }

  // SSE stream parse — OpenAI-compatible `data:` lines, [DONE] terminator.
  let content = "";
  let modelUsed = model;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            model?: string;
            choices?: Array<{ delta?: { content?: string } }>;
          };
          if (chunk.model) modelUsed = chunk.model;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            content += delta;
            options.onDelta?.(content);
          }
        } catch {
          /* keepalive/comment line — ignore */
        }
      }
    }
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new HfRouterError("network", null, `The Hugging Face stream broke mid-answer: ${(error as Error).message}`);
  }

  return { content, source: "hf-router", modelUsed };
}
