/**
 * Cloud AI chat — streaming client.
 *
 * BYOK keys call the provider directly from the browser (streamByokChat).
 * Shared-mode users stream through the Firebase `chat` Cloud Function, which
 * proxies OpenRouter with `stream: true` and yields text via `onDelta`.
 */

import { fbAuth, functionsBaseUrl } from "@/integrations/firebase/app";
import { getByokConfig, streamByokChat } from "@/lib/byok";
import { getCachedAiAccessMode, getPreferLocal } from "@/lib/aiAccessMode";
import type { Citation } from "@/lib/visualization/types";
import { parseOpenAiUsageChunk, mergeUsage, type ProviderUsage } from "@/lib/tokenOptimizer/usage";

export type CloudChatContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

export interface CloudChatMessage {
  role: "system" | "user" | "assistant";
  content: CloudChatContent;
  /** Optional attached image (data URL) for vision-capable providers. */
  image?: string;
}

export interface CloudChatOptions {
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
  /** Called with the full accumulated text on every delta. */
  onDelta?: (accumulated: string) => void;
  /** Request a strict JSON output format when the provider supports it. */
  structuredOutput?: boolean;
  /** Request timeout in milliseconds (provider-dependent). */
  timeoutMs?: number;
  /** Maximum output tokens (provider-dependent). */
  maxTokens?: number;
  /** Use the user's provider-backed web search capability for this request. */
  webSearch?: boolean;
  /** Allow OpenRouter to fetch the URL asked about in this request. */
  webFetch?: boolean;
}

export interface CloudChatResult {
  content: string;
  error?: string;
  /** Provider-reported source identifier (adapter-specific).
   *  Batch 4 values: "byok" | "shared" | "local" | "omniroute". */
  source?: string;
  /** Model actually used (adapter-specific). */
  modelUsed?: string;
  /** Upstream provider name when known (e.g. "openrouter" for the shared
   *  Firebase Function path, or the BYOK provider id). */
  provider?: string;
  /** Provider-reported citations (Batch 1): OpenRouter web_search
   *  `url_citation` annotations, Perplexity `citations`, Anthropic citation
   *  deltas. Previously these were silently dropped at the SSE layer, which
   *  made source-preserving visualizations impossible. */
  citations?: Citation[];
  /** Intelligent-workspace Batch 1: provider-measured token usage when the
   *  provider reports it. Absent = caller falls back to documented
   *  char-based estimation (labeled as estimated in telemetry). */
  usage?: ProviderUsage;
}

export function isCloudChatConfigured(): boolean {
  return Boolean(functionsBaseUrl);
}

function getFunctionsUrl(): string {
  return `${functionsBaseUrl}/chat`;
}

// ── Private-by-default hybrid routing ────────────────────────────────────

/**
 * Payload size above which the on-device model is skipped and the request
 * escalates to a frontier model. The local engine runs a 2k-token context
 * (~8k chars); past that, quality collapses or the context overflows —
 * exactly the "document analysis" tier BYOK exists for.
 */
const LOCAL_CONTEXT_CHAR_LIMIT = 8000;

/** Total characters across all message contents (text parts only). */
function totalMessageChars(messages: CloudChatMessage[]): number {
  let total = 0;
  for (const m of messages) {
    if (typeof m.content === "string") total += m.content.length;
    else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === "text") total += part.text.length;
      }
    }
  }
  return total;
}

function textOf(content: CloudChatContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("\n");
}

// ── Chit-chat detection ──────────────────────────────────────────────────

/**
 * Greetings / small talk that ANY on-device model can serve. These must
 * never dead-end the conversation just because the surrounding context is
 * heavy — previously a plain "hi" hit the escalation error because the
 * app-generated system prompt alone blew the local context budget.
 */
const TRIVIAL_CHAT_RE =
  /^(hi+|hey+|hello+|yo|sup|gm|gn|howdy|(?:hi|hey|hello)\s+there|good\s?(morning|afternoon|evening|day|night)|how\s+(are|is|r)\s+(you|u|things|everything|it\s+going)|what'?s\s+up|whats\s+up|how'?s\s+it\s+going|how\s+do\s+you\s+do|thanks?(\s+(you|a\s+lot|a\s+bunch|so\s+much))?|thank\s+you(\s+(so|very)\s+much)?|ty|ok(ay)?|cool|nice|great|awesome|perfect|lol|lmao|haha+|hehe+|bye+|goodbye|good\s?night|see\s+(ya|you)|later)[!.,?~\s]*$/i;

function lastUserText(messages: CloudChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (m.image) return ""; // image turn is never trivial chit-chat
    return textOf(m.content);
  }
  return "";
}

/**
 * True when the newest user turn is plain small talk (greeting, thanks,
 * acknowledgment, farewell). Whole-word anchored, so "hire me" does not
 * match "hi". Exported for tests and for callers that want to bias routing
 * toward the on-device model.
 */
export function isTrivialChitChat(messages: CloudChatMessage[]): boolean {
  const text = lastUserText(messages).trim();
  return text.length > 0 && text.length <= 40 && TRIVIAL_CHAT_RE.test(text);
}

// ── Escalation policy ────────────────────────────────────────────────────

/**
 * Hard frontier triggers: capabilities the on-device model cannot serve at
 * all, regardless of payload size. Size alone is NOT a hard trigger — size
 * overflows degrade to a context-fitted local run (see fitMessagesToLocal).
 */
export function hasFrontierTrigger(
  messages: CloudChatMessage[],
  opts?: CloudChatOptions,
): boolean {
  if (opts?.model) return true;
  if (opts?.webSearch || opts?.webFetch) return true;
  if (opts?.structuredOutput) return true;
  if (messages.some((m) => m.image)) return true;
  return false;
}

/**
 * Decide whether this request exceeds the on-device model's competence:
 * explicit cloud model selection, web search/fetch, structured output,
 * vision input, or a payload beyond the local context window. Trivial
 * chit-chat is exempt from the size check — a greeting must always get a
 * reply (the payload is context-fitted before it reaches the engine).
 */
export function shouldEscalateToCloud(
  messages: CloudChatMessage[],
  opts?: CloudChatOptions,
): boolean {
  if (hasFrontierTrigger(messages, opts)) return true;
  if (isTrivialChitChat(messages)) return false;
  return totalMessageChars(messages) > LOCAL_CONTEXT_CHAR_LIMIT;
}

const ESCALATION_ERROR =
  "This task needs a frontier model. Your on-device model handles private chat, " +
  "but document analysis, vision, and agentic tasks require an API key — " +
  "add one in Settings → AI Access (works with OpenAI, Anthropic, Google, Groq, OpenRouter and more).";

// ── Local context fitting ────────────────────────────────────────────────

/**
 * Character cap for the system prompt when fitting a payload onto the
 * on-device model. The full persona prompt (~8k chars) alone overflows the
 * engine's 2k-token context; the top of the prompt carries identity and
 * tone, so a line-boundary truncation keeps it useful for ordinary chat.
 */
const LOCAL_SYSTEM_CHAR_LIMIT = 2000;

function trimSystem(content: string, cap: number): string {
  if (content.length <= cap) return content;
  const slice = content.slice(0, cap);
  const nl = slice.lastIndexOf("\n");
  const head = nl > cap * 0.5 ? slice.slice(0, nl) : slice;
  return `${head.trimEnd()}\n[...]`;
}

/**
 * Fit a (potentially oversized) payload onto the on-device engine's small
 * context window: the system prompt is truncated to its leading block,
 * image parts are stripped (local models cannot do vision), and history is
 * kept newest-first within the budget so the newest user turn is always
 * served verbatim. Oldest messages drop first.
 */
export function fitMessagesToLocal(
  messages: CloudChatMessage[],
  budget: number = LOCAL_CONTEXT_CHAR_LIMIT,
): CloudChatMessage[] {
  const sysOut: CloudChatMessage[] = messages
    .filter((m) => m.role === "system")
    .map((m) => ({
      role: "system" as const,
      content:
        typeof m.content === "string"
          ? trimSystem(m.content, LOCAL_SYSTEM_CHAR_LIMIT)
          : m.content,
    }));
  let used = sysOut.reduce((n, m) => n + textOf(m.content).length, 0);

  const convo = messages.filter((m) => m.role !== "system");
  const kept: CloudChatMessage[] = [];
  for (let i = convo.length - 1; i >= 0; i--) {
    const m = convo[i];
    // Local models cannot use images — text part only (vision never fits).
    const text = textOf(m.content);
    const len = text.length;
    if (used + len > budget) {
      if (kept.length === 0) {
        // Newest message alone overflows the budget — keep its head.
        kept.push({ role: m.role, content: text.slice(0, Math.max(0, budget - used)) });
        used = budget;
      }
      break;
    }
    used += len;
    kept.push({ role: m.role, content: text });
  }
  kept.reverse();
  return [...sysOut, ...kept];
}

/**
 * Stream a chat reply through the provider selected during account onboarding.
 *
 * Private-by-default hybrid routing: when the user provisioned the on-device
 * model (prefer_local) and the engine is loaded, ordinary chat runs locally —
 * nothing leaves the browser. Payloads are context-fitted before they reach
 * the engine, so greetings and everyday chat always get a reply.
 *
 * Escalation: hard frontier tasks (vision, web search/fetch, structured
 * agentic output, explicit cloud model) escalate to the cloud tier — the
 * user's BYOK key when present, otherwise a clear "add your API key" error
 * instead of a silent dead-end. Size-only overflows (heavy system prompt,
 * long history) no longer dead-end keyless users: they degrade to a
 * context-fitted on-device run — previously even "hi" hit the escalation
 * error because the app-generated system prompt alone exceeded the local
 * budget (the "Message failed" bug).
 */
export async function streamCloudChat(
  messages: CloudChatMessage[],
  opts: CloudChatOptions = {},
): Promise<CloudChatResult> {
  // ── Hybrid: on-device first when provisioned ──
  // Dynamic import on purpose: LocalInferenceEngine pulls in @mlc-ai/web-llm
  // (~large); statically importing it here would bloat every chunk that
  // touches cloudChat.
  if (getPreferLocal()) {
    const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
    if (localInferenceEngine.isLoaded()) {
      if (!shouldEscalateToCloud(messages, opts)) {
        return localInferenceEngine.generate(fitMessagesToLocal(messages), opts);
      }
      // Escalation: try the user's key first.
      const accessMode = getCachedAiAccessMode();
      if (accessMode === "byok") {
        const byok = getByokConfig();
        if (byok?.apiKey) return streamByokChat(byok, messages, opts);
      }
      // No key. Hard frontier triggers (vision, web, structured output,
      // explicit cloud model) genuinely cannot run on-device → the honest
      // escalation prompt. Size-only overflow → degrade to a context-fitted
      // on-device run instead of dead-ending the conversation.
      if (!hasFrontierTrigger(messages, opts)) {
        return localInferenceEngine.generate(fitMessagesToLocal(messages), opts);
      }
      return { content: "", error: ESCALATION_ERROR, source: "local" };
    }
    // Not provisioned → fall through to the standard mode logic.
  }

  const accessMode = getCachedAiAccessMode();
  if (accessMode === "byok") {
    const byok = getByokConfig();
    if (!byok?.apiKey) {
      return { content: "", error: "No API key set. Add your OpenAI/Anthropic/Google/Groq/OpenRouter key in Settings → Personalization → BYOK to start chatting." };
    }
    return streamByokChat(byok, messages, opts);
  }
  if (accessMode !== "shared") {
    return { content: "", error: "Add your API key in Settings → Personalization → BYOK to start chatting. ShadowTalk is BYOK-only." };
  }
  return streamBuiltInChat(messages, opts);
}

async function streamBuiltInChat(
  messages: CloudChatMessage[],
  opts: CloudChatOptions = {},
): Promise<CloudChatResult> {
  const url = getFunctionsUrl();
  if (!url) {
    return { content: "", error: "Firebase Cloud Functions are not configured." };
  }

  const idToken = await fbAuth().currentUser?.getIdToken().catch(() => null);
  if (!idToken) {
    return { content: "", error: "Sign in to use ShadowTalk AI." };
  }

  const maxRetries = 1;
  let attempt = 0;
  let resp: Response | null = null;
  
  while (attempt <= maxRetries) {
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages,
          ...(opts.model ? { model: opts.model } : {}),
          ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
          ...(typeof opts.maxTokens === "number" ? { maxTokens: opts.maxTokens } : {}),
          ...(opts.structuredOutput ? { structuredOutput: true } : {}),
          stream: true,
        }),
        signal: opts.signal,
      });
      
      if (resp.ok || (resp.status !== 502 && resp.status !== 503 && resp.status !== 504)) {
        break; // Success or a non-retriable error
      }
    } catch (err) {
      if (attempt === maxRetries) throw err;
    }
    
    attempt++;
    if (attempt <= maxRetries) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  if (!resp || !resp.ok) {
    let message = `AI request failed (${resp?.status || 'Network Error'})`;
    try {
      const body = await resp?.json();
      message = body?.error || message;
    } catch {
      /* keep default */
    }
    if (resp?.status === 429) message = "Rate limit reached — please try again in a moment.";
    if (resp?.status === 402) message = "AI credits exhausted — check your plan or billing.";
    if (resp?.status === 401) message = "AI gateway authentication failed — please sign in again.";
    if (resp?.status && resp.status >= 500) message = "AI service is temporarily unavailable — please try again.";
    return { content: "", error: message, source: "shared" };
  }

  if (!resp.body) return { content: "", error: "Empty response from AI service.", source: "shared" };

  // Batch 4: provider-source labeling. The Firebase `chat` function emits
  // `X-Provider` and `X-Model` response headers (functions/src/index.ts).
  // Capture them so the chat UI can label the response's source. The optional
  // chaining guards against non-Response mocks in tests.
  const headerProvider = resp.headers?.get?.("X-Provider") || undefined;
  const headerModel = resp.headers?.get?.("X-Model") || undefined;

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  // Mid-stream `data: {"error": ...}` events must surface — previously they
  // were swallowed, so a failed stream returned an empty answer with no error.
  let streamError: string | null = null;
  // Intelligent-workspace Batch 1: the shared gateway proxies OpenRouter,
  // which emits a usage-bearing final chunk. Parse when present; absence is
  // normal and callers fall back to estimation.
  let sharedUsage: ProviderUsage | null = null;

  const handleDataLine = (payload: string): boolean => {
    if (!payload || payload === "[DONE]") return true;
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.error) {
        streamError =
          typeof parsed.error === "string"
            ? parsed.error
            : parsed.error?.message || "The AI service reported an error mid-stream.";
        return true;
      }
      const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
      if (delta) {
        content += delta;
        opts.onDelta?.(content);
      }
      const usageChunk = parseOpenAiUsageChunk(parsed);
      if (usageChunk) sharedUsage = mergeUsage(sharedUsage, usageChunk);
      return true;
    } catch {
      return false; // partial JSON — caller decides whether it's a truncation
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

  // Flush the final buffered line — streams may end without a trailing
  // newline, and the last event (or a truncated JSON payload) lives there.
  const tail = buffer.trim();
  if (tail.startsWith("data:")) {
    const parsedOk = handleDataLine(tail.slice(5).trim());
    if (!parsedOk && !streamError) {
      // Truncated final event — the response was cut off mid-generation.
      streamError = "The AI response was cut off. Please regenerate.";
    }
  }

  if (streamError) {
    // Partial content is still returned so the UI can show it, but the
    // error forces callers to treat this as an incomplete response.
    return { content, error: streamError, source: "shared", modelUsed: headerModel, usage: sharedUsage ?? undefined };
  }
  return { content, source: "shared", modelUsed: headerModel, provider: headerProvider, usage: sharedUsage ?? undefined };
}
