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
import { NetworkTimeoutError, isOffline, withNetworkTimeout } from "@/lib/offlineGuards";
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
  /** Request timeout in milliseconds (provider-dependent).
   *
   *  Shared-gateway path: this is the SILENCE watchdog — when no SSE byte
   *  (including gateway heartbeats) arrives for this long, the request is
   *  aborted with an error instead of hanging forever. Defaults to 45s. */
  timeoutMs?: number;
  /** Maximum output tokens (provider-dependent). */
  maxTokens?: number;
  /** Use the user's provider-backed web search capability for this request. */
  webSearch?: boolean;
  /** Allow OpenRouter to fetch the URL asked about in this request. */
  webFetch?: boolean;
  /** Local-path only: silence watchdog for on-device generation — a tokenless gap longer than this aborts and retries (default 30s). */
  generationIdleTimeoutMs?: number;
  /** Local-path only: hard cap on total on-device generation time; past it the partial reply is returned (default 120s). */
  generationHardTimeoutMs?: number;
}

export interface CloudChatResult {
  content: string;
  error?: string;
  /** Provider-reported source identifier (adapter-specific).
   *  Batch 4 values: "byok" | "shared" | "local" | "omniroute";
   *  Free-AI router adds "free" (device-local free-tier key vault). */
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
  /** Free-AI router: true when every route (BYOK, key vault, on-device)
   *  was exhausted and the user must pick a setup path. The chat UI renders
   *  the ZeroSetupCard for this marker instead of a bare error toast. */
  needsSetup?: boolean;
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
 * The engine's fixed context window (LocalInferenceEngine.initialize creates
 * every engine with `context_window_size: 2048`). Single source of truth for
 * the fitting math below.
 */
export const LOCAL_ENGINE_CONTEXT_TOKENS = 2048;

/**
 * Output-token reserve: the fitted prompt must leave this much room inside
 * the engine's window. The old fitting budget (8,000 chars ≈ 2,000 tokens)
 * consumed the ENTIRE window, so replies were cut off mid-sentence as soon
 * as the KV cache filled — the "local answers are incomplete" bug.
 */
export const LOCAL_OUTPUT_TOKEN_RESERVE = 640;

/** Chat-template + sampling headroom between the prompt and the output. */
const LOCAL_TEMPLATE_HEADROOM_TOKENS = 128;

/** Conservative characters-per-token ratio for the fitted payload. */
const LOCAL_CHARS_PER_TOKEN = 4;

/**
 * Default character budget for fitMessagesToLocal:
 * (window − output reserve − template headroom) × chars/token.
 */
export const LOCAL_INPUT_CHAR_BUDGET = Math.max(
  0,
  (LOCAL_ENGINE_CONTEXT_TOKENS - LOCAL_OUTPUT_TOKEN_RESERVE - LOCAL_TEMPLATE_HEADROOM_TOKENS) *
    LOCAL_CHARS_PER_TOKEN,
);

/**
 * Character cap for the system prompt when fitting a payload onto the
 * on-device model. The full persona prompt (~8k chars) alone overflows the
 * engine's 2k-token context; the top of the prompt carries identity and
 * tone, so a line-boundary truncation keeps it useful for ordinary chat.
 * Kept well under the input budget so the newest user turn survives intact.
 */
const LOCAL_SYSTEM_CHAR_LIMIT = 1000;

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
 *
 * The default budget is derived from the engine's 2,048-token window MINUS
 * an output reserve — the prompt must never consume the whole window, or the
 * reply gets truncated mid-sentence (see LOCAL_OUTPUT_TOKEN_RESERVE).
 */
export function fitMessagesToLocal(
  messages: CloudChatMessage[],
  budget: number = LOCAL_INPUT_CHAR_BUDGET,
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
    // DEADLINE GUARD around the whole on-device routing decision. Every
    // internal step is individually bounded EXCEPT web-llm's own cache layer
    // (Cache.add() has no timeout and no abort — on a black-holed connection
    // a single missing cache entry stalls the turn forever, observed live as
    // an eternal "Thinking…" with zero console output). The wall-clock race
    // turns ANY such hang into the honest offline guidance; legitimate work
    // keeps running in the background (its result simply loses the race) and
    // the engine still becomes ready for the NEXT message. The deadline
    // exceeds the engine's own generation-ladder budget (180s) so a healthy
    // slow device is never cut short.
    const PREFER_LOCAL_DEADLINE_MS = 200_000;
    const guidanceError = (
      frontier: boolean,
    ): CloudChatResult =>
      frontier
        ? { content: "", error: ESCALATION_ERROR, source: "local" }
        : {
            content: "",
            error:
              "You're offline and the on-device model isn't loaded yet. Reconnect once to install it " +
              "(chat header → model switcher → download) — after that, chat works fully offline.",
            source: "local",
          };
    try {
      const raced = await withNetworkTimeout(
        (async () => {
          const { localInferenceEngine, waitForLocalEngineReady } = await import("@/offline/LocalInferenceEngine");
          // One-line routing truth: state / escalation verdict / connectivity —
          // the live drill's "pending 200s with zero output" demanded visibility.
          console.info(
            `[cloud-chat] prefer-local routing: state=${localInferenceEngine.getState()} ` +
            `escalate=${shouldEscalateToCloud(messages, opts)} frontier=${hasFrontierTrigger(messages, opts)} ` +
            `online=${typeof navigator !== "undefined" ? navigator.onLine : "?"} model=${opts?.model ?? "-"} ` +
            `chunk=${(performance.getEntriesByType("resource").find((r) => /LocalInferenceEngine-.*\.js/.test(r.name))?.name || "").split("/").pop()}`,
          );
          if (localInferenceEngine.isLoaded()) {
            if (!shouldEscalateToCloud(messages, opts)) {
              return localInferenceEngine.generate(fitMessagesToLocal(messages), opts);
            }
            // OFFLINE with the engine loaded: the cloud tier is unreachable, and a
            // BYOK call would die in an opaque "Failed to fetch" even for tasks a
            // context-fitted local run can serve (size-only overflows — a long
            // history that merely exceeds the local window). Degrate to fitted
            // local; hard frontier triggers (vision/web/structured) get the honest
            // escalation error below — they genuinely cannot run on-device.
            if (typeof navigator !== "undefined" && navigator.onLine === false && !hasFrontierTrigger(messages, opts)) {
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
          // Engine not loaded yet, but its initialization is already in flight
          // (mount prewarm / background install): give it a bounded chance to
          // finish so ordinary chat stays on-device instead of bouncing to the
          // cloud tier while the engine compiles. The wait is watchdog-capped and
          // skipped entirely for frontier tasks (cloud serves those better) — and
          // skipped OFFLINE: a download can make no progress without a network,
          // so waiting only delays the honest answer below.
          const engineState = localInferenceEngine.getState();
          const offline = typeof navigator !== "undefined" && navigator.onLine === false;
          if (
            (engineState === "downloading" || engineState === "loading") &&
            !shouldEscalateToCloud(messages, opts) &&
            !offline
          ) {
            console.info("[cloud-chat] an init is in flight — bounded 25s wait for it");
            const warmed = await waitForLocalEngineReady(25_000, opts.signal).catch(() => false);
            if (warmed && localInferenceEngine.isLoaded()) {
              return localInferenceEngine.generate(fitMessagesToLocal(messages), opts);
            }
          }
          // OFFLINE with any engine state below "ready": every viable path
          // runs on-device (the cloud tier is unreachable). ONE unified
          // bounded warm-up: an in-flight cached warm-up (mount prewarm) needs
          // no network and IS worth waiting for offline; a cold one starts
          // here from whatever tier is actually cached. Size-only overflows
          // degrade to a fitted local run; hard frontier tasks (vision / web /
          // structured) genuinely cannot run on-device → the escalation error.
          if (offline && !hasFrontierTrigger(messages, opts)) {
            console.info(`[cloud-chat] offline cold-engine branch: state=${localInferenceEngine.getState()}`);
            const { findCachedLocalModelId } = await import("@/services/modelManager");
            const cachedModelId = await findCachedLocalModelId().catch(() => null);
            console.info(`[cloud-chat] offline warm-up: cachedModelId=${cachedModelId ?? "none"}`);
            if (cachedModelId) {
              const stateNow = localInferenceEngine.getState();
              if (stateNow === "idle" || stateNow === "error") {
                // Load the model that is ACTUALLY on disk — the device-tier
                // pick may point at a different (uncached) tier and would
                // report failure while a usable cached model sits right there.
                void localInferenceEngine.initialize(undefined, cachedModelId).catch(() => {});
              }
              // An in-flight initialize (mount prewarm / this warm-up) loads
              // from cache hits offline — waiting for it is the whole point.
              const warmed = await waitForLocalEngineReady(45_000, opts.signal).catch(() => false);
              console.info(`[cloud-chat] offline warm-up: warmed=${warmed} loaded=${localInferenceEngine.isLoaded()}`);
              if (warmed && localInferenceEngine.isLoaded()) {
                return localInferenceEngine.generate(fitMessagesToLocal(messages), opts);
              }
            }
            return guidanceError(false);
          }
          // Not provisioned → fall through to the standard mode logic. The
          // sentinel tells the outer router to continue (it cannot "return"
          // from inside this raced block).
          throw new Error("__PREFER_LOCAL_FALLTHROUGH__");
        })(),
        PREFER_LOCAL_DEADLINE_MS,
        "On-device routing",
      ).catch((err) => {
        if (err instanceof NetworkTimeoutError) {
          console.warn("[cloud-chat] on-device routing hit the wall-clock deadline — landing the honest result");
          return guidanceError(hasFrontierTrigger(messages, opts));
        }
        throw err;
      });
      // The raced block cannot "fall through" by itself — the sentinel tells
      // this outer function to continue into the standard mode logic below.
      if ((raced as CloudChatResult).error !== "__PREFER_LOCAL_FALLTHROUGH__") {
        return raced;
      }
    } catch (err) {
      // The raced block only surfaces non-deadline errors from the engine
      // paths it owns; treat anything unexpected as the offline guidance so
      // the turn NEVER dies inside on-device routing. The sentinel is a
      // control-flow marker, not a user-facing error.
      if ((err as Error)?.message === "__PREFER_LOCAL_FALLTHROUGH__") {
        // fall through to the standard mode logic
      } else {
        console.warn("[cloud-chat] on-device routing threw — landing the honest result", err);
        return guidanceError(hasFrontierTrigger(messages, opts));
      }
    }
  }

  const accessMode = getCachedAiAccessMode();
  if (accessMode === "byok") {
    const byok = getByokConfig();
    if (!byok?.apiKey) {
      // BYOK mode selected but no key saved (or the storage was cleared).
      // Never dead-end: the free-AI router fails over through the device
      // vault and the on-device model before asking for setup.
      const { streamFreeChat } = await import("@/ai/FreeAIRouter");
      return streamFreeChat(messages, opts);
    }
    return streamByokChat(byok, messages, opts);
  }
  if (accessMode !== "shared") {
    // Keyless visitor (guest, or signed-in without a saved key): zero-setup
    // routing — vault keys → on-device model → actionable setup guidance.
    const { streamFreeChat } = await import("@/ai/FreeAIRouter");
    return streamFreeChat(messages, opts);
  }
  return streamBuiltInChat(messages, opts);
}

async function streamBuiltInChat(
  messages: CloudChatMessage[],
  opts: CloudChatOptions = {},
): Promise<CloudChatResult> {
  // Shared mode is a server round-trip (Firebase Function + auth token) — it
  // cannot work offline, and offline token refresh used to fall through to a
  // misleading "Sign in to use ShadowTalk AI." Say what is actually wrong.
  if (isOffline()) {
    return {
      content: "",
      error:
        "You're offline — shared-mode chat needs a connection. The on-device model still works offline: Settings → Offline AI.",
    };
  }
  const url = getFunctionsUrl();
  if (!url) {
    return { content: "", error: "Firebase Cloud Functions are not configured." };
  }

  const currentUser = fbAuth().currentUser;
  const idToken = await currentUser?.getIdToken().catch(() => null);
  if (!idToken) {
    // A signed-in user whose token cannot be refreshed is an offline/stale
    // session, not a signed-out visitor — never tell them to "sign in".
    return {
      content: "",
      error: currentUser
        ? "Your session couldn't be refreshed (you may be offline). Reconnect and try again, or add your own API key in Settings → Personalization → BYOK."
        : "Sign in to use ShadowTalk AI.",
    };
  }

  const maxRetries = 1;
  let attempt = 0;
  let resp: Response | null = null;

  // ── Silence watchdog ──────────────────────────────────────────────────
  // The gateway emits SSE heartbeat comments while it waits on OpenRouter,
  // so a silent period longer than `stallMs` means the stream is genuinely
  // dead (killed function instance, dropped connection, hung upstream).
  // Previously nothing bounded this: the bubble spun forever with no error.
  const stallMs = opts.timeoutMs ?? 45_000;
  const stallController = new AbortController();
  const onOuterAbort = () => stallController.abort();
  if (opts.signal) {
    if (opts.signal.aborted) stallController.abort();
    else opts.signal.addEventListener("abort", onOuterAbort, { once: true });
  }
  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;
  const armWatchdog = () => {
    if (watchdogTimer !== null) clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => {
      timedOut = true;
      stallController.abort();
    }, stallMs);
  };
  const disarmWatchdog = () => {
    if (watchdogTimer !== null) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
  };

  // A hung fetch (cold start + dead upstream) is bounded by the same watchdog:
  // the timer marks `timedOut`, aborts the fetch, and we return a friendly
  // error instead of an unhelpful thrown AbortError.
  armWatchdog();
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
        signal: stallController.signal,
      });
      
      if (resp.ok || (resp.status !== 502 && resp.status !== 503 && resp.status !== 504)) {
        break; // Success or a non-retriable error
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        if (opts.signal?.aborted) throw err; // caller-cancelled — never retried
        if (timedOut) {
          return { content: "", error: `The AI service did not respond within ${Math.round(stallMs / 1000)}s. Please try again.`, source: "shared" };
        }
        throw err;
      }
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
  // Termination tracking: `sawDone` distinguishes a complete stream from one
  // killed mid-generation (the gateway instance timeout produces exactly
  // this), and `finishLength` flags a reply capped by max_tokens.
  let sawDone = false;
  let finishLength = false;
  // Intelligent-workspace Batch 1: the shared gateway proxies OpenRouter,
  // which emits a usage-bearing final chunk. Parse when present; absence is
  // normal and callers fall back to estimation.
  let sharedUsage: ProviderUsage | null = null;

  const handleDataLine = (payload: string): boolean => {
    if (!payload) return true;
    if (payload === "[DONE]") {
      sawDone = true;
      return true;
    }
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.error) {
        streamError =
          typeof parsed.error === "string"
            ? parsed.error
            : parsed.error?.message || "The AI service reported an error mid-stream.";
        return true;
      }
      const choice = parsed?.choices?.[0];
      const delta: string | undefined = choice?.delta?.content;
      if (delta) {
        content += delta;
        opts.onDelta?.(content);
      }
      if (choice?.finish_reason === "length") finishLength = true;
      const usageChunk = parseOpenAiUsageChunk(parsed);
      if (usageChunk) sharedUsage = mergeUsage(sharedUsage, usageChunk);
      return true;
    } catch {
      return false; // partial JSON — caller decides whether it's a truncation
    }
  };

  // Race every read against the abort signal: a plain `reader.read()` may
  // never settle in some environments when the fetch signal aborts, which
  // would hang the loop even though the watchdog already fired.
  const abortPromise = new Promise<never>((_, reject) => {
    if (stallController.signal.aborted) {
      // Aborted between fetch resolution and here — reject immediately,
      // the `abort` event already fired so a listener would never run.
      reject(new DOMException("The AI stream stalled.", "AbortError"));
      return;
    }
    stallController.signal.addEventListener(
      "abort",
      () => reject(new DOMException("The AI stream stalled.", "AbortError")),
      { once: true },
    );
  });
  let pendingRead: Promise<{ done: boolean; value?: Uint8Array }> | null = null;
  const readChunk = () => {
    pendingRead = reader.read() as Promise<{ done: boolean; value?: Uint8Array }>;
    return Promise.race([pendingRead, abortPromise]);
  };

  armWatchdog();
  try {
    while (true) {
      const { done, value } = await readChunk();
      if (done) break;
      armWatchdog();
      buffer += decoder.decode(value!, { stream: true });

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
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      if (opts.signal?.aborted) throw err; // caller-cancelled — propagate
      timedOut = true; // silence watchdog fired — handled below
    } else {
      throw err;
    }
  } finally {
    disarmWatchdog();
    if (opts.signal) opts.signal.removeEventListener("abort", onOuterAbort);
    // Swallow the dangling read (if any) so cancelling never becomes an
    // unhandled rejection, then release the connection.
    pendingRead?.then(() => {}, () => {});
    void reader.cancel().catch(() => {});
  }

  if (!streamError) {
    if (timedOut) {
      streamError = "The AI stopped responding — the connection stalled. Please regenerate.";
    } else if (!sawDone) {
      // The stream closed without the terminating [DONE] event: the gateway
      // or upstream was killed mid-generation (e.g. instance timeout). Mark
      // the answer incomplete instead of silently showing a truncated reply.
      streamError = content
        ? "The reply was cut off mid-stream and may be incomplete."
        : "The AI service closed the connection before sending a reply.";
    } else if (finishLength) {
      streamError = "The reply hit the model's maximum output length and was trimmed. Ask to continue for the rest.";
    }
  }

  if (streamError) {
    // Partial content is still returned so the UI can show it, but the
    // error forces callers to treat this as an incomplete response.
    return { content, error: streamError, source: "shared", modelUsed: headerModel, usage: sharedUsage ?? undefined };
  }
  return { content, source: "shared", modelUsed: headerModel, provider: headerProvider, usage: sharedUsage ?? undefined };
}
