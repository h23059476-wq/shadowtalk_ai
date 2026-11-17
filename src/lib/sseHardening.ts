/**
 * Shared SSE-stream hardening for direct-provider (BYOK) chat requests.
 *
 * The shared gateway path carries its own watchdogs (Firebase function +
 * cloudChat client), but BYOK streams used to call `fetch` with the caller's
 * bare signal and `reader.read()` in a plain loop — a hung provider socket
 * spun the composer forever with no error, and a stream closed by the
 * provider mid-generation looked like a complete answer.
 *
 * This helper ports the proven cloudChat pattern:
 *  - a silence watchdog (default 45s) that aborts the request when no byte
 *    arrives for `stallMs` — heartbeats and deltas keep rearming it;
 *  - a combined abort signal (caller abort OR watchdog) for fetch;
 *  - a read race so a wedged socket can never hang the consume loop.
 */

export interface SseHardening {
  /** Combined signal (caller abort OR silence watchdog) — pass to fetch. */
  signal: AbortSignal;
  /** True once the silence watchdog fired (as opposed to a caller abort). */
  timedOut(): boolean;
  /** Restart the silence timer — call on every received chunk. */
  arm(): void;
  /** Stop the silence timer (stream complete or disposed). */
  disarm(): void;
  /**
   * Race a `reader.read()` against watchdog/outer abort: rejects with an
   * AbortError DOMException instead of pending forever on a dead socket.
   */
  race<T>(read: Promise<T>): Promise<T>;
  /** Detach listeners and clear timers. Safe to call more than once. */
  dispose(): void;
}

export function createSseHardening(opts: { stallMs: number; outer?: AbortSignal }): SseHardening {
  const controller = new AbortController();
  let timedOut = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const arm = () => {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, opts.stallMs);
  };
  const disarm = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const onOuterAbort = () => controller.abort();
  if (opts.outer) {
    if (opts.outer.aborted) controller.abort();
    else opts.outer.addEventListener("abort", onOuterAbort, { once: true });
  }
  arm();

  // Race every read against the abort signal: a plain `reader.read()` may
  // never settle in some environments when the fetch signal aborts, which
  // would hang the loop even though the watchdog already fired.
  const abortPromise = new Promise<never>((_, reject) => {
    if (controller.signal.aborted) {
      reject(new DOMException("The AI stream stalled.", "AbortError"));
      return;
    }
    controller.signal.addEventListener(
      "abort",
      () => reject(new DOMException("The AI stream stalled.", "AbortError")),
      { once: true },
    );
  });
  // The watchdog may fire while no read is being raced (e.g. between fetch
  // attempts) — the rejection must be marked handled so it never surfaces as
  // an unhandled rejection; race() still observes the same rejection.
  abortPromise.catch(() => {});

  let pendingRead: Promise<unknown> | null = null;

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    arm,
    disarm,
    race<T>(read: Promise<T>): Promise<T> {
      pendingRead = read;
      return Promise.race([read, abortPromise]) as Promise<T>;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disarm();
      if (opts.outer) opts.outer.removeEventListener("abort", onOuterAbort);
      // Swallow the dangling read (if any) so cancelling never becomes an
      // unhandled rejection.
      pendingRead?.then(() => {}, () => {});
    },
  };
}

/**
 * Fetch with one automatic network-shaped retry: a dropped Wi-Fi moment on
 * the first request used to dead-end BYOK chat with "Could not reach …".
 * Caller aborts and watchdog timeouts are surfaced untouched — retrying a
 * dead stream would just double the user's wait.
 */
export async function fetchWithNetworkRetry(
  doFetch: () => Promise<Response>,
  opts: { hardening: SseHardening; outer?: AbortSignal; label: string; stallMs: number },
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      return await doFetch();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        if (opts.outer?.aborted) throw error; // caller-cancelled — propagate
        if (opts.hardening.timedOut()) {
          throw new StreamStalledError(
            `${opts.label} did not respond within ${Math.round(opts.stallMs / 1000)}s. Please try again.`,
          );
        }
        throw error; // linked abort without a caller cancel — propagate
      }
      if (attempt === 0) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      throw error;
    }
  }
}

/** Thrown when the silence watchdog fired before the stream produced anything. */
export class StreamStalledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamStalledError";
  }
}
