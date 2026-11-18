/**
 * Offline guards — tiny shared helpers so the chat path can NEVER hang on a
 * network request when the device is offline or on a dying connection.
 *
 * Remote-area reality: "offline" is not just airplane mode. Captive portals,
 * tunnels and 2G links produce requests that neither succeed nor fail for
 * minutes. Every network touch on the send path gets both treatments:
 *   1. a fast `navigator.onLine` short-circuit (hard-offline ⇒ no request),
 *   2. a timeout race (soft-offline ⇒ request loses, fallback wins).
 */

/** Safe navigator.onLine read (true when the API is unavailable). */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export class NetworkTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms (network unavailable or stalled).`);
    this.name = "NetworkTimeoutError";
  }
}

/**
 * Race a promise against a wall-clock timeout so a hung request can never
 * block a user action forever. The losing promise's rejection is swallowed —
 * the caller sees the timeout instead.
 */
export function withNetworkTimeout<T = any>(
  promise: PromiseLike<T>,
  ms: number,
  label = "Request",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new NetworkTimeoutError(label, ms)), ms);
    let settled = false;
    void Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Linear backoff schedule for automatic install retries (ms before each
 * attempt). Deliberately short enough that a recovered connection is used
 * quickly, long enough to survive a tunnel portal re-auth.
 */
export function installRetryBackoffMs(attempt: number): number {
  // attempt 0 → 15s, 1 → 45s, 2 → 120s, anything outside the ladder → 0
  const ladder = [15_000, 45_000, 120_000];
  return Number.isInteger(attempt) && attempt >= 0 && attempt < ladder.length
    ? ladder[attempt]
    : 0;
}

export const INSTALL_RETRY_LIMIT = 3;
