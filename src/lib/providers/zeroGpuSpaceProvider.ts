/**
 * Tier 3 — Zero-cost cloud image generation via Hugging Face ZeroGPU Spaces.
 *
 * Connects from the browser straight to a stateless ZeroGPU Gradio Space
 * (default: black-forest-labs/FLUX.1-schnell) through `@gradio/client`, and
 * hands back the generated raster image as a BLOB (the caller persists it in
 * the encrypted IndexedDB asset store — nothing here depends on temporary
 * Space URLs).
 *
 * Cost model: $0. Anonymous browser sessions run on HF's free anonymous
 * quota; when the user connected their Hugging Face account via Tier 2
 * OAuth, their `hf_...` token is passed to Client.connect() so the request
 * consumes THEIR personal daily ZeroGPU quota with higher queue priority.
 *
 * Bundle discipline: `@gradio/client` (~100 KB gzip) is dynamically imported
 * inside connectZeroGpuSpace() the FIRST time a raster image generation
 * actually runs — the initial app bundle never pays for it. This module
 * itself stays framework-free and side-effect-free.
 *
 * Failure surface: every failure is a typed ZeroGpuError (offline / quota /
 * space_unavailable / timeout / no_image / aborted) so the chat router can
 * decide between falling back and showing the non-intrusive upgrade notice.
 */
import { getHfAccessToken } from "@/lib/auth/hfCredentials";

/** Default public ZeroGPU Space — FLUX.1-schnell: 4-step, H200-backed, Apache-2.0. */
export const DEFAULT_ZERO_GPU_SPACE_ID = "black-forest-labs/FLUX.1-schnell";
/** Optional env override so a deployment can point at a different Space. */
const ENV_SPACE_ID = import.meta.env.VITE_ZERO_GPU_SPACE_ID?.trim();
/** Default FLUX.1-schnell generation parameters. */
export const FLUX_DEFAULTS = {
  width: 1024,
  height: 1024,
  numInferenceSteps: 4,
} as const;

const CONNECT_TIMEOUT_MS = 30_000; // Space handshake
const DEFAULT_IDLE_TIMEOUT_MS = 90_000; // no event for 90s → treat as stalled (cold starts run 5–25s, generously above)
const DEFAULT_TOTAL_TIMEOUT_MS = 4 * 60_000; // hard cap: cold start + queue + generation + download
const MAX_PROMPT_LENGTH = 2_000; // FLUX.1-schnell prompt encoder comfort zone

export const ZERO_GPU_QUOTA_HINT =
  "ZeroGPU free quota resets daily. Connecting your Hugging Face account (Settings → BYOK → Connect Hugging Face) gives you your own personal daily quota with higher queue priority.";

export type ZeroGpuPhase = "connecting" | "queued" | "generating" | "fetching" | "done";

export interface ZeroGpuStatusUpdate {
  phase: ZeroGpuPhase;
  /** Ready-to-render status line for the chat card. */
  message: string;
  queuePosition?: number | null;
  etaSeconds?: number | null;
  /** 0–1 when the Space reports progress_data. */
  progress?: number | null;
  /** Whether this run rides the user's own HF quota (Tier 2 connected). */
  usingHfToken?: boolean;
}

export interface ZeroGpuImageResult {
  /** The raw image Blob straight from the Space — caller persists it. */
  blob: Blob;
  mimeType: string;
  spaceId: string;
  endpoint: string;
  /** Seed echoed back by FLUX-style Spaces (second return value), when present. */
  seed: number | null;
  /** True when the user's personal HF quota was used instead of anonymous. */
  usingHfToken: boolean;
}

export type ZeroGpuErrorKind =
  | "offline"
  | "quota"
  | "space_unavailable"
  | "timeout"
  | "no_image"
  | "aborted"
  | "unknown";

export class ZeroGpuError extends Error {
  kind: ZeroGpuErrorKind;
  /** Seconds until the quota window resets (HF includes it in quota errors). */
  retryAfterSeconds?: number;

  constructor(kind: ZeroGpuErrorKind, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ZeroGpuError";
    this.kind = kind;
    if (typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      this.retryAfterSeconds = Math.round(retryAfterSeconds);
    }
  }
}

/** Typed classification for any error — used by tests and the chat router. */
export function classifyZeroGpuError(error: unknown): { kind: ZeroGpuErrorKind; retryAfterSeconds?: number } {
  if (error instanceof ZeroGpuError) {
    return { kind: error.kind, retryAfterSeconds: error.retryAfterSeconds };
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return { kind: mapZeroGpuFailure(message), retryAfterSeconds: parseRetryAfterSeconds(message) };
}

export interface ZeroGpuSpaceOptions {
  /** Custom user-supplied Space id ("username/my-space"). Defaults to FLUX.1-schnell. */
  spaceId?: string;
  /** Explicit API endpoint (e.g. "/infer"); auto-discovered when omitted. */
  endpoint?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  /** Negative seed requests a randomized seed (FLUX-style spaces echo the seed back). */
  seed?: number;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  signal?: AbortSignal;
  onStatus?: (update: ZeroGpuStatusUpdate) => void;
}

export interface ZeroGpuAvailability {
  online: boolean;
  gradioClientImportable?: boolean;
}

/**
 * Cheap availability probe — no network, no import. True whenever the browser
 * reports connectivity; the chat router uses this to decide whether ZeroGPU
 * belongs in the fallback chain without paying the gradio bundle cost.
 */
export function isZeroGpuSpaceAvailable(): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    return navigator.onLine !== false;
  } catch {
    return false;
  }
}

function mapZeroGpuFailure(message: string): ZeroGpuErrorKind {
  const text = message || "";
  // The real anonymous-quota message reads "You have exceeded your ZeroGPU
  // runs limit. Authenticate with a Hugging Face token for more quota" —
  // verified live against black-forest-labs/FLUX.1-schnell (see
  // scripts/zerogpu_live_test.mjs), so match it explicitly.
  if (/exceeded your (gpu )?quota|gpu quota|quota exceeded|zerogpu (quota|runs limit)|runs limit/i.test(text)) return "quota";
  if (/network|offline|failed to fetch|dns|err_name_not_resolved|internet connection/i.test(text)) return "offline";
  if (
    /space is (asleep|paused|building|errored)|space_not_found|not_found|404|no_app_file|config_error|build_error|runtime_error|paused|sleeping|502|503|failed to (resolve|connect)|space (is )?unavailable/i.test(
      text,
    )
  ) {
    return "space_unavailable";
  }
  if (/timed? ?out|deadline|stalled/i.test(text)) return "timeout";
  return "unknown";
}

/**
 * Parse HF's "Try again in 0:16:24" / "in 1h 2m" / "in 45s" countdown from
 * a quota message into seconds.
 */
export function parseRetryAfterSeconds(message: string): number | undefined {
  if (!message) return undefined;
  const hms = /try again in\s*(\d+):(\d{1,2}):(\d{1,2})/i.exec(message);
  if (hms) {
    return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  }
  const composite = /try again in\s*(?:(\d+)\s*h(?:our)?s?)?\s*(?:(\d+)\s*m(?:in)?s?)?\s*(?:(\d+)\s*s(?:ec)?s?)?/i.exec(message);
  if (composite && (composite[1] || composite[2] || composite[3])) {
    return (
      (composite[1] ? Number(composite[1]) * 3600 : 0) +
      (composite[2] ? Number(composite[2]) * 60 : 0) +
      (composite[3] ? Number(composite[3]) : 0)
    );
  }
  return undefined;
}

function formatEta(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const s = Math.round(seconds);
  if (s < 60) return `~${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `~${m}m${s % 60 ? ` ${s % 60}s` : ""}`;
  return `~${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Throw an aborted error (or wait briefly) when the caller aborted the run. */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ZeroGpuError("aborted", "Image generation was canceled.");
  }
}

/** Local structural type for the subset of @gradio/client's Client we use. */
interface GradioEvent {
  type: string;
  stage?: string;
  queue?: boolean;
  position?: number;
  eta?: number;
  message?: unknown;
  success?: boolean;
  progress_data?: Array<{ progress: number | null; index: number | null; length: number | null; unit: string | null; desc: string | null }>;
  data?: unknown[];
}

/** SubmitIterable subset: async-iterable AND directly drivable via next()/cancel(). */
interface GradioJob extends AsyncIterable<GradioEvent> {
  next(): Promise<IteratorResult<GradioEvent>>;
  cancel(): Promise<void>;
}

interface GradioConnectOptions {
  token?: `hf_${string}`;
  /** Deprecated alias kept for older @gradio/client builds. */
  hf_token?: `hf_${string}`;
}

interface GradioClientModule {
  Client: {
    connect(app_reference: string, options?: GradioConnectOptions): Promise<{
      /**
       * `allEvents` MUST be true: without it @gradio/client filters event
       * types down to an empty allow-list, so join-time rejections (quota,
       * sleeping Space) arrive as a SILENT end-of-stream instead of a status
       * error — verified physically against FLUX.1-schnell.
       */
      submit(
        endpoint: string | number,
        data: unknown[] | Record<string, unknown>,
        eventData?: unknown,
        triggerId?: unknown,
        allEvents?: boolean,
      ): GradioJob;
      /** One-shot alternative that always surfaces the real error. */
      predict?(
        endpoint: string | number,
        data: unknown[] | Record<string, unknown>,
      ): Promise<{ data?: unknown[] } | undefined>;
      cancel?: () => Promise<void>;
      view_api: () => Promise<{
        named_endpoints?: Record<
          string,
          {
            parameters?: Array<{
              parameter_name?: string;
              parameter_has_default?: boolean;
              parameter_default?: unknown;
              python_type?: { type?: string };
              type?: { type?: string };
            }>;
          }
        >;
      }>;
    }>;
  };
}

/**
 * Lazy `@gradio/client` load — the ONLY place in the codebase that imports
 * the package. Keeps ~100 KB gzip out of the initial bundle.
 */
async function loadGradioClient(): Promise<GradioClientModule> {
  return (await import("@gradio/client")) as unknown as GradioClientModule;
}

/**
 * Connect to a ZeroGPU Space. When the user has a Tier 2 HF token, pass it so
 * the request uses their personal daily quota + queue priority; otherwise
 * connect anonymously.
 */
async function connectZeroGpuSpace(
  gradio: GradioClientModule,
  spaceId: string,
): Promise<{ client: Awaited<ReturnType<GradioClientModule["Client"]["connect"]>>; usingHfToken: boolean }> {
  const token = await getHfAccessToken();
  const usingHfToken = Boolean(token && /^hf_/.test(token));
  if (!usingHfToken) {
    // Anonymous — no connect options at all.
    const client = await gradio.Client.connect(spaceId);
    return { client, usingHfToken: false };
  }
  const connectOptions: GradioConnectOptions = {
    token: token as `hf_${string}`,
    hf_token: token as `hf_${string}`, // alias accepted by older client builds
  };
  const client = await gradio.Client.connect(spaceId, connectOptions);
  return { client, usingHfToken };
}

/**
 * Pick the text-to-image endpoint of a Space: the explicit override wins,
 * then the first named endpoint whose parameters include something like a
 * "prompt" string (FLUX.1-schnell exposes "/infer"). Falls back to "/infer".
 */
async function resolveTextToImageEndpoint(
  client: Awaited<ReturnType<GradioClientModule["Client"]["connect"]>>,
  explicitEndpoint: string | undefined,
): Promise<{ endpoint: string; parameters: Array<{ name: string; type: string; hasDefault: boolean; defaultValue: unknown }> | null }> {
  if (explicitEndpoint) return { endpoint: explicitEndpoint, parameters: null };
  try {
    const api = await client.view_api();
    const endpoints = Object.entries(api?.named_endpoints ?? {});
    for (const [name, def] of endpoints) {
      const params = def?.parameters ?? [];
      const hasPrompt = params.some(
        (p) => typeof p.parameter_name === "string" && /prompt/i.test(p.parameter_name),
      );
      if (hasPrompt) {
        return {
          endpoint: name,
          parameters: params.map((p) => ({
            name: String(p.parameter_name ?? ""),
            type: String(p.type?.type ?? p.python_type?.type ?? "Any"),
            hasDefault: Boolean(p.parameter_has_default),
            defaultValue: p.parameter_default,
          })),
        };
      }
    }
  } catch {
    // view_api can fail on exotic Spaces — fall through to the FLUX default.
  }
  return { endpoint: "/infer", parameters: null };
}

/** Build a typed payload for the resolved endpoint (FLUX shape when unknown). */
function buildPredictPayload(
  prompt: string,
  options: ZeroGpuSpaceOptions,
  parameters: Array<{ name: string; type: string; hasDefault: boolean; defaultValue: unknown }> | null,
): Record<string, unknown> {
  const wants = (name: string) => !parameters || parameters.some((p) => p.name === name);
  const payload: Record<string, unknown> = {};
  if (wants("prompt")) payload.prompt = prompt;
  if (wants("seed")) payload.seed = typeof options.seed === "number" ? options.seed : 0;
  if (wants("randomize_seed")) payload.randomize_seed = typeof options.seed === "number" ? false : true;
  if (wants("width")) payload.width = options.width ?? FLUX_DEFAULTS.width;
  if (wants("height")) payload.height = options.height ?? FLUX_DEFAULTS.height;
  if (wants("num_inference_steps")) payload.num_inference_steps = options.numInferenceSteps ?? FLUX_DEFAULTS.numInferenceSteps;
  if (wants("guidance_scale")) payload.guidance_scale = 3.5;
  if (parameters) {
    // Fill every remaining required parameter with a safe type-based default
    // so arbitrary custom Spaces don't fail on missing args.
    for (const p of parameters) {
      if (p.name in payload || p.hasDefault) continue;
      const t = p.type.toLowerCase();
      if (t.includes("str")) payload[p.name] = "";
      else if (t.includes("bool")) payload[p.name] = false;
      else if (t.includes("int") || t.includes("float") || t.includes("number")) payload[p.name] = 0;
      else payload[p.name] = null;
    }
  }
  return payload;
}

/** Extract the image URL/Blob payload from the gradio result tuple. */
function extractImageValue(data: unknown[]): { value: string; seed: number | null } | null {
  const first = data?.[0];
  let value: unknown = first;
  if (Array.isArray(first)) value = first[0]; // some Spaces wrap the image in a gallery list
  let url: string | null = null;
  if (typeof value === "string" && value) url = value;
  else if (value && typeof value === "object") {
    const record = value as { url?: unknown; data?: unknown; path?: unknown; name?: unknown };
    if (typeof record.url === "string" && record.url) url = record.url;
    else if (typeof record.data === "string" && /^(https?:|data:image\/)/i.test(record.data)) url = record.data;
    else if (typeof record.path === "string" && /^(https?:|data:image\/)/i.test(record.path)) url = record.path;
  }
  if (!url) return null;
  const seedRaw = data?.[1];
  const seed = typeof seedRaw === "number" && Number.isFinite(seedRaw) ? seedRaw : null;
  return { value: url, seed };
}

async function fetchImageBlob(url: string, signal?: AbortSignal): Promise<{ blob: Blob; mimeType: string }> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new ZeroGpuError(
      "space_unavailable",
      `The ZeroGPU Space finished generating but the image download failed (${response.status}). Try again in a moment.`,
    );
  }
  const blob = await response.blob();
  const mimeType = blob.type && /^image\//i.test(blob.type) ? blob.type : "image/png";
  return { blob: blob.type === mimeType ? blob : new Blob([blob], { type: mimeType }), mimeType };
}

/**
 * Generate a raster image on a ZeroGPU Space and return the raw Blob.
 *
 * Queue/timeout UX contract: onStatus receives a human-readable update for
 * every phase transition (connecting → queued → generating → fetching) so
 * the chat card can show live progress, including queue position and ETA.
 */
export async function generateImageViaZeroGpu(
  prompt: string,
  options: ZeroGpuSpaceOptions = {},
): Promise<ZeroGpuImageResult> {
  const trimmed = (prompt || "").trim();
  if (!trimmed) throw new ZeroGpuError("unknown", "Describe the image you want to generate.");
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new ZeroGpuError("unknown", `The image prompt is too long (${trimmed.length} characters). Keep it under ${MAX_PROMPT_LENGTH}.`);
  }
  throwIfAborted(options.signal);

  if (!isZeroGpuSpaceAvailable()) {
    throw new ZeroGpuError(
      "offline",
      "You appear to be offline — ZeroGPU image generation needs an internet connection. Charts and diagrams still work offline.",
    );
  }

  const spaceId = (options.spaceId || ENV_SPACE_ID || DEFAULT_ZERO_GPU_SPACE_ID).trim();
  const totalDeadline = Date.now() + (options.timeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS);
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const emit = (update: ZeroGpuStatusUpdate) => options.onStatus?.(update);

  let gradio: GradioClientModule;
  try {
    gradio = await loadGradioClient();
  } catch (error) {
    throw new ZeroGpuError("unknown", `The ZeroGPU client failed to load: ${(error as Error).message}`);
  }

  emit({ phase: "connecting", message: "Connecting to the ZeroGPU H200 pool…" });
  let connected: Awaited<ReturnType<typeof connectZeroGpuSpace>>;
  try {
    connected = await withDeadline(
      connectZeroGpuSpace(gradio, spaceId),
      Math.min(CONNECT_TIMEOUT_MS, totalDeadline - Date.now()),
      () => new ZeroGpuError("timeout", `Connecting to ${spaceId} timed out. The Space may be sleeping — try again shortly.`),
      options.signal,
      () => new ZeroGpuError("aborted", "Image generation was canceled."),
    );
  } catch (error) {
    if (error instanceof ZeroGpuError) throw error;
    const message = (error as Error)?.message || String(error);
    throw new ZeroGpuError(
      mapZeroGpuFailure(message),
      `Could not connect to the ZeroGPU Space (${spaceId}). It may be sleeping, paused, or blocked by your network. ${message}`,
    );
  }
  throwIfAborted(options.signal);
  const { client, usingHfToken } = connected;

  const { endpoint, parameters } = await resolveTextToImageEndpoint(client, options.endpoint);
  const payload = buildPredictPayload(trimmed, options, parameters);

  emit({
    phase: "queued",
    message: usingHfToken
      ? "Request accepted — riding your personal Hugging Face quota…"
      : "Request accepted — waiting for a free ZeroGPU slot…",
    usingHfToken,
  });

  const startedAt = Date.now();
  try {
    const job = client.submit(endpoint, payload, undefined, undefined, true);
    let image: { value: string; seed: number | null } | null = null;
    let sawStreamEvent = false;

    for (;;) {
      throwIfAborted(options.signal);
      if (Date.now() > totalDeadline) {
        await job.cancel?.().catch(() => undefined);
        throw new ZeroGpuError(
          "timeout",
          "The ZeroGPU Space took too long to answer (cold start + queue can exceed a minute during peak hours). Please retry — connecting your HF account also improves queue priority.",
        );
      }
      const next = await withIdleTimeout(
        job.next(),
        idleTimeoutMs,
        async () => {
          await job.cancel?.().catch(() => undefined);
          throw new ZeroGpuError(
            "timeout",
            "The ZeroGPU Space stopped responding mid-run. Please retry in a moment.",
          );
        },
      );
      if (next.done) break;
      const event = next.value;

      if (event.type === "status") {
        sawStreamEvent = true;
        if (event.stage === "error") {
          await job.cancel?.().catch(() => undefined);
          const message = typeof event.message === "string" ? event.message : "The ZeroGPU run failed.";
          const kind = mapZeroGpuFailure(message);
          throw new ZeroGpuError(
            kind,
            kind === "quota"
              ? `The ZeroGPU Space reported an error: ${message} ${ZERO_GPU_QUOTA_HINT}`
              : `The ZeroGPU Space reported an error: ${message}`,
            parseRetryAfterSeconds(message),
          );
        }
        if (event.stage === "pending" && event.queue) {
          const eta = formatEta(event.eta);
          emit({
            phase: "queued",
            message: `Queued on ZeroGPU${event.position ? ` — position ${event.position}` : ""}${eta ? `, starting ${eta}` : ""}…`,
            queuePosition: event.position ?? null,
            etaSeconds: event.eta ?? null,
            usingHfToken,
          });
        } else if (event.stage === "generating") {
          const progress = Array.isArray(event.progress_data) && event.progress_data.length
            ? event.progress_data[0]?.progress
            : null;
          emit({
            phase: "generating",
            message: "Generating image on the ZeroGPU H200…",
            progress: typeof progress === "number" ? progress : null,
            usingHfToken,
          });
        }
      } else if (event.type === "data") {
        sawStreamEvent = true;
        image = extractImageValue(event.data ?? []);
        if (image) emit({ phase: "fetching", message: "Fetching your image…", usingHfToken });
      } else if (event.type === "log") {
        // Log lines carry no actionable payload for this flow — ignore.
      }
    }

    if (!image && !sawStreamEvent) {
      // Silent end-of-stream: the submission was rejected before the queue
      // stream opened (quota / sleeping Space) and this @gradio/client build
      // suppressed the status event. predict() re-issues with all_events and
      // throws the REAL error immediately — ZeroGPU checks quota before any
      // GPU time is consumed, so this costs nothing and never double-bills.
      const recovered = await withDeadline(
        Promise.resolve(client.predict?.(endpoint, payload)),
        Math.max(totalDeadline - Date.now(), 0),
        () =>
          new ZeroGpuError(
            "timeout",
            "The ZeroGPU Space took too long to answer (cold start + queue can exceed a minute during peak hours). Please retry — connecting your HF account also improves queue priority.",
          ),
        options.signal,
        () => new ZeroGpuError("aborted", "Image generation was canceled."),
      );
      const recoveredImage = extractImageValue(recovered?.data ?? []);
      if (recoveredImage) {
        image = recoveredImage;
        emit({ phase: "fetching", message: "Fetching your image…", usingHfToken });
      }
    }

    if (!image) {
      throw new ZeroGpuError(
        "no_image",
        "The ZeroGPU Space finished but returned no image. If this keeps happening, the Space's pipeline may not accept text-to-image prompts.",
      );
    }

    const { blob, mimeType } = await fetchImageBlob(image.value, options.signal);
    emit({ phase: "done", message: "Image ready.", usingHfToken });
    return {
      blob,
      mimeType,
      spaceId,
      endpoint,
      seed: image.seed,
      usingHfToken,
    };
  } catch (error) {
    if (error instanceof ZeroGpuError) throw error;
    const message = (error as Error)?.message || String(error);
    if (options.signal?.aborted) throw new ZeroGpuError("aborted", "Image generation was canceled.");
    const kind = mapZeroGpuFailure(message);
    const retryAfterSeconds = kind === "quota" ? parseRetryAfterSeconds(message) : undefined;
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    throw new ZeroGpuError(
      kind,
      kind === "quota"
        ? `ZeroGPU quota exceeded. ${ZERO_GPU_QUOTA_HINT}${retryAfterSeconds ? ` Resets in about ${Math.ceil(retryAfterSeconds / 60)} minutes.` : ""}`
        : `ZeroGPU image generation failed after ${elapsedSeconds}s: ${message}`,
      retryAfterSeconds,
    );
  }
}

/** Reject when the promise misses the deadline or the caller aborts. */
async function withDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
  signal?: AbortSignal,
  onAbort?: () => Error,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    if (signal && abortListener) signal.removeEventListener("abort", abortListener);
  };
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(onTimeout()), Math.max(timeoutMs, 0));
        if (signal) {
          abortListener = () => reject(onAbort!());
          signal.addEventListener("abort", abortListener, { once: true });
        }
      }),
    ]);
  } finally {
    cleanup();
  }
}

/** Reject when a single iterator step stalls longer than idleTimeoutMs. */
async function withIdleTimeout<T>(
  promise: Promise<T>,
  idleTimeoutMs: number,
  onStall: () => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new ZeroGpuError("timeout", "ZeroGPU stall detected.")), idleTimeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof ZeroGpuError && error.kind === "timeout" && error.message.includes("stall")) {
      return onStall();
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
