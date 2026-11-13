/**
 * OAuth redirect return-handoff state.
 *
 * `signInWithRedirect` always returns the browser to the page that initiated
 * it (/auth), so the intended post-login destination (/chatbot, optionally
 * with a ?q= prompt) must be remembered client-side and consumed after the
 * session is restored. The pending flag also lets the /auth page show an
 * explicit "completing sign-in" state instead of silently re-rendering the
 * login form when the redirect finishes without producing a session.
 *
 * The pending flag stores a timestamp; values older than 5 minutes (or the
 * legacy bare-'1' format written by earlier builds) are treated as stale so
 * a leftover flag can never make the auth page report a failure for a
 * sign-in the user did not just attempt.
 */

const PENDING_OAUTH_KEY = "shadowtalk_auth_redirect_pending";
const OAUTH_RETURN_KEY = "shadowtalk_oauth_return_destination";
const PENDING_FLAG_MAX_AGE_MS = 5 * 60 * 1000;

export function setPendingOAuthFlag(): void {
  try {
    window.sessionStorage.setItem(PENDING_OAUTH_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode / ITP) — the handoff degrades to the
    // pre-existing behavior (return to /auth and restore normally).
  }
}

export function hasPendingOAuthFlag(): boolean {
  try {
    const raw = window.sessionStorage.getItem(PENDING_OAUTH_KEY);
    if (!raw) return false;
    // Legacy format was the bare string "1" — no timestamp to trust.
    if (raw === "1") return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < PENDING_FLAG_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function clearPendingOAuthFlag(): void {
  try {
    window.sessionStorage.removeItem(PENDING_OAUTH_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function setOAuthReturnDestination(url: string): void {
  if (!url) return;
  try {
    window.sessionStorage.setItem(OAUTH_RETURN_KEY, url);
  } catch {
    // Destination is a convenience — navigation falls back to /chatbot.
  }
}

/** Read and clear the stored post-login destination. */
export function consumeOAuthReturnDestination(): string | null {
  try {
    const url = window.sessionStorage.getItem(OAUTH_RETURN_KEY);
    window.sessionStorage.removeItem(OAUTH_RETURN_KEY);
    return url || null;
  } catch {
    return null;
  }
}
