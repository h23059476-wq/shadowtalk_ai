import { streamCloudChat } from "@/lib/cloudChat";
import { getCachedAiAccessMode } from "@/lib/aiAccessMode";
import type { CloudChatMessage } from "@/lib/cloudChat";

export interface TurboMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface TurboOptions {
  apiKey?: string | null;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  personality?: string;
  signal?: AbortSignal;
  onDelta?: (accumulated: string) => void;
  useCache?: boolean;
}

export interface TurboResult {
  content: string;
  source: "shared" | "byok" | "cache" | "error";
  ttftMs?: number;
  totalMs?: number;
  model?: string;
  error?: string;
}

const CACHE_LIMIT = 40;
const cache = new Map<string, string>();

function cacheKey(messages: TurboMessage[], opts: TurboOptions): string {
  return JSON.stringify({
    messages: messages.slice(-6),
    systemPrompt: opts.systemPrompt ?? "",
    model: opts.model ?? "",
  });
}

export function clearTurboCache(): void {
  cache.clear();
}

export function getTurboCacheStats(): { size: number; limit: number } {
  return { size: cache.size, limit: CACHE_LIMIT };
}

export async function turboChat(
  messages: TurboMessage[],
  opts: TurboOptions = {},
): Promise<TurboResult> {
  const startedAt = performance.now();
  const key = cacheKey(messages, opts);
  const accessMode = getCachedAiAccessMode();

  if (!accessMode) {
    return {
      content: "",
      source: "error",
      error: "Choose Tech-User or Non-Tech-Users in the chatbot setup before using AI.",
      totalMs: performance.now() - startedAt,
    };
  }

  if (opts.useCache !== false) {
    const cached = cache.get(key);
    if (cached) {
      opts.onDelta?.(cached);
      return {
        content: cached,
        source: "cache",
        totalMs: performance.now() - startedAt,
      };
    }
  }

  const cloudMessages: CloudChatMessage[] = [
    ...(opts.systemPrompt ? [{ role: "system" as const, content: opts.systemPrompt }] : []),
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
  const result = await streamCloudChat(cloudMessages, {
    model: opts.model,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    signal: opts.signal,
    onDelta: opts.onDelta,
  });

  if (result.error) {
    return {
      content: "",
      source: "error",
      error: result.error,
      totalMs: performance.now() - startedAt,
    };
  }

  if (opts.useCache !== false && result.content) {
    cache.set(key, result.content);
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }

  return {
    content: result.content,
    source: accessMode,
    model: result.modelUsed || opts.model,
    totalMs: performance.now() - startedAt,
  };
}
