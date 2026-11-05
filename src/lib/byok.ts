/**
 * BYOK (Bring Your Own Key) — the user's own AI provider key, stored only on
 * their device and used directly from the browser for the signed-in account.
 */
import type { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";
import { fbAuth } from "@/integrations/firebase/app";

export type ByokProvider =
  | "openai"
  | "groq"
  | "openrouter"
  | "gemini"
  | "anthropic"
  | "mistral"
  | "deepseek"
  | "together"
  | "fireworks"
  | "perplexity"
  | "cohere"
  | "xai"
  | "cerebras"
  | "hyperbolic"
  | "novita"
  | "deepinfra";
export type ByokMode = "fallback" | "always";

export interface ByokConfig {
  provider: ByokProvider;
  apiKey: string;
  model: string;
  mode: ByokMode;
}

export const BYOK_PROVIDERS: Record<ByokProvider, { label: string; url: string; defaultModel: string; keyHint: string }> = {
  openai: { label: "OpenAI", url: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini", keyHint: "sk-..." },
  groq: { label: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.3-70b-versatile", keyHint: "gsk_..." },
  openrouter: { label: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "openai/gpt-4o-mini", keyHint: "sk-or-..." },
  gemini: { label: "Google Gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaultModel: "gemini-2.0-flash", keyHint: "AIza..." },
  anthropic: { label: "Anthropic (Claude)", url: "https://api.anthropic.com/v1/messages", defaultModel: "claude-haiku-4-5-20251001", keyHint: "sk-ant-..." },
  mistral: { label: "Mistral AI", url: "https://api.mistral.ai/v1/chat/completions", defaultModel: "mistral-small-latest", keyHint: "..." },
  deepseek: { label: "DeepSeek", url: "https://api.deepseek.com/v1/chat/completions", defaultModel: "deepseek-chat", keyHint: "sk-..." },
  together: { label: "Together AI", url: "https://api.together.xyz/v1/chat/completions", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", keyHint: "..." },
  fireworks: { label: "Fireworks AI", url: "https://api.fireworks.ai/inference/v1/chat/completions", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", keyHint: "fw_..." },
  perplexity: { label: "Perplexity", url: "https://api.perplexity.ai/chat/completions", defaultModel: "llama-3.1-sonar-small-128k-online", keyHint: "pplx-..." },
  cohere: { label: "Cohere", url: "https://api.cohere.com/v1/chat/completions", defaultModel: "command-r-plus", keyHint: "..." },
  xai: { label: "xAI (Grok)", url: "https://api.x.ai/v1/chat/completions", defaultModel: "grok-2-latest", keyHint: "xai-..." },
  cerebras: { label: "Cerebras", url: "https://api.cerebras.ai/v1/chat/completions", defaultModel: "llama-3.3-70b", keyHint: "csk-..." },
  hyperbolic: { label: "Hyperbolic", url: "https://api.hyperbolic.xyz/v1/chat/completions", defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct", keyHint: "sk-..." },
  novita: { label: "Novita AI", url: "https://api.novita.ai/v3/openai/chat/completions", defaultModel: "deepseek/deepseek-v3-turbo", keyHint: "sk_..." },
  deepinfra: { label: "DeepInfra", url: "https://api.deepinfra.com/v1/openai/chat/completions", defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", keyHint: "..." },
};

const STORAGE_KEY_PREFIX = "shadowtalk.byok.v2.";

function getStorageKey(): string | null {
  const uid = fbAuth().currentUser?.uid;
  return uid ? `${STORAGE_KEY_PREFIX}${uid}` : null;
}

export function getByokConfig(): ByokConfig | null {
  try {
    const key = getStorageKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as ByokConfig;
    if (!cfg?.apiKey || !BYOK_PROVIDERS[cfg.provider]) return null;
    return { ...cfg, model: (cfg.model || "").trim().replace(/^models\//i, "") || BYOK_PROVIDERS[cfg.provider].defaultModel, mode: cfg.mode === "always" ? "always" : "fallback" };
  } catch {
    return null;
  }
}

export function saveByokConfig(cfg: ByokConfig): void {
  const key = getStorageKey();
  if (!key) throw new Error("Sign in before saving a provider key.");
  localStorage.setItem(key, JSON.stringify({ ...cfg, apiKey: cfg.apiKey.trim() }));
}

export function clearByokConfig(): void {
  const key = getStorageKey();
  if (key) localStorage.removeItem(key);
}

function toPlainMessages(messages: CloudChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } | { type: "url"; url: string } };

function toAnthropicBlocks(message: CloudChatMessage): AnthropicContentBlock[] {
  if (typeof message.content === "string") {
    return [{ type: "text", text: message.content }];
  }
  return message.content.map((part): AnthropicContentBlock => {
    if (part.type === "text") return { type: "text", text: part.text };
    const url = part.image_url.url;
    const match = url.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([\s\S]+)$/i);
    if (match) {
      return {
        type: "image",
        source: { type: "base64", media_type: match[1].toLowerCase(), data: match[2] },
      };
    }
    return { type: "image", source: { type: "url", url } };
  });
}

function toAnthropicMessages(messages: CloudChatMessage[]) {
  const merged: Array<{ role: "user" | "assistant"; content: AnthropicContentBlock[] }> = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    const role = message.role === "assistant" ? ("assistant" as const) : ("user" as const);
    const blocks = toAnthropicBlocks(message);
    const last = merged[merged.length - 1];
    if (last && last.role === role) {
      // The Anthropic Messages API requires strict user/assistant alternation —
      // consecutive same-role messages must be merged or it rejects with 400.
      last.content = [...last.content, ...blocks];
    } else {
      merged.push({ role, content: blocks });
    }
  }
  return merged.filter((m) => m.content.length > 0);
}

async function streamAnthropicChat(
  cfg: ByokConfig,
  messages: CloudChatMessage[],
  opts: CloudChatOptions,
): Promise<CloudChatResult> {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => typeof message.content === "string" ? message.content : "")
    .filter(Boolean)
    .join("\n\n");
  let response: Response;
  try {
    response = await fetch(BYOK_PROVIDERS.anthropic.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: opts.model || cfg.model || BYOK_PROVIDERS.anthropic.defaultModel,
        max_tokens: opts.maxTokens ?? 4096,
        messages: toAnthropicMessages(messages),
        ...(system ? { system } : {}),
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
        stream: true,
      }),
      signal: opts.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    return { content: "", error: "Could not reach Anthropic from this browser. Check the connection and try again.", source: "byok" };
  }

  if (!response.ok || !response.body) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error?.message || "";
    } catch { /* ignore non-JSON error bodies */ }
    const error = response.status === 401
      ? "Your Anthropic key was rejected. Check it in Settings → Your own API key."
      : response.status === 429
        ? "Anthropic rate limit or quota reached on your key."
        : `Anthropic error (${response.status})${detail ? `: ${detail}` : ""}`;
    return { content: "", error, source: "byok" };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  // Anthropic emits `event: error` SSE events mid-stream (overloaded,
  // invalid_request, runtime errors). Swallowing them made truncated or
  // failed streams look like successful empty answers.
  let streamError: string | null = null;

  const handleDataLine = (payload: string): boolean => {
    if (!payload) return true;
    try {
      const event = JSON.parse(payload);
      if (event?.type === "content_block_delta" && typeof event.delta?.text === "string") {
        content += event.delta.text;
        opts.onDelta?.(content);
      } else if (event?.type === "error") {
        streamError = event.error?.message || "Anthropic reported a mid-stream error.";
      }
      return true;
    } catch {
      return false;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      handleDataLine(line.slice(5).trim());
    }
  }
  buffer += decoder.decode(); // flush the decoder

  // Flush the final buffered line (streams may end without a trailing newline).
  const tail = buffer.trim();
  if (tail.startsWith("data:")) {
    const parsedOk = handleDataLine(tail.slice(5).trim());
    if (!parsedOk && !streamError) {
      streamError = "The AI response was cut off. Please regenerate.";
    }
  }

  if (streamError) {
    return { content, error: streamError, source: "byok" };
  }
  return { content, source: "byok", modelUsed: opts.model || cfg.model };
}

/** Stream a chat completion directly from the user's own provider. */
export async function streamByokChat(
  cfg: ByokConfig,
  messages: CloudChatMessage[],
  opts: CloudChatOptions = {},
): Promise<CloudChatResult> {
  const provider = BYOK_PROVIDERS[cfg.provider];
  if ((opts.webSearch || opts.webFetch) && cfg.provider !== "openrouter" && cfg.provider !== "perplexity") {
    return {
      content: "",
      error: "Web tools need an OpenRouter key (or a Perplexity Sonar model for web research). Add one in AI settings to use this tool.",
      source: "byok",
    };
  }
  if (opts.webFetch && cfg.provider !== "openrouter") {
    return { content: "", error: "URL reading currently requires an OpenRouter key.", source: "byok" };
  }
  if (cfg.provider === "anthropic") return streamAnthropicChat(cfg, messages, opts);
  let resp: Response;
  try {
    resp = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: opts.model || cfg.model || provider.defaultModel,
        messages: toPlainMessages(messages),
        stream: true,
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
        ...(typeof opts.maxTokens === "number" ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.structuredOutput ? { response_format: { type: "json_object" } } : {}),
        ...(cfg.provider === "openrouter" && (opts.webSearch || opts.webFetch)
          ? { tools: [
              ...(opts.webSearch ? [{ type: "openrouter:web_search" }] : []),
              ...(opts.webFetch ? [{ type: "openrouter:web_fetch" }] : []),
            ] }
          : {}),
      }),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return { content: "", error: `Could not reach ${provider.label}.`, source: "byok" };
  }

  if (!resp.ok || !resp.body) {
    let detail = "";
    try {
      const body = await resp.json();
      detail = body?.error?.message || body?.error || "";
    } catch { /* ignore */ }
    const msg =
      resp.status === 401 ? `Your ${provider.label} key was rejected. Check it in Settings → Your own API key.`
      : resp.status === 429 ? `${provider.label} rate limit or quota reached on your key.`
      : `${provider.label} error (${resp.status})${detail ? `: ${detail}` : ""}`;
    return { content: "", error: msg, source: "byok" };
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  // OpenAI-compatible gateways emit `data: {"error": ...}` events mid-stream;
  // ignoring them made failed streams look like successful empty answers.
  let streamError: string | null = null;

  const handleDataLine = (payload: string): boolean => {
    if (!payload || payload === "[DONE]") return true;
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.error) {
        streamError =
          typeof parsed.error === "string"
            ? parsed.error
            : parsed.error?.message || `${provider.label} reported a mid-stream error.`;
        return true;
      }
      const delta = parsed?.choices?.[0]?.delta?.content;
      if (delta) {
        content += delta;
        opts.onDelta?.(content);
      }
      return true;
    } catch {
      return false;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      handleDataLine(line.slice(5).trim());
    }
  }
  buffer += decoder.decode(); // flush the decoder

  // Flush the final buffered line (streams may end without a trailing newline).
  const tail = buffer.trim();
  if (tail.startsWith("data:")) {
    const parsedOk = handleDataLine(tail.slice(5).trim());
    if (!parsedOk && !streamError) {
      streamError = "The AI response was cut off. Please regenerate.";
    }
  }

  if (streamError) {
    return { content, error: streamError, source: "byok" };
  }
  return { content, source: "byok", modelUsed: opts.model || cfg.model };
}
