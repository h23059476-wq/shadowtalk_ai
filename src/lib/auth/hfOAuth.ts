/**
 * Tier 2 — "Sign in with Hugging Face" (OAuth 2.0 Authorization Code + PKCE).
 *
 * Flow: BYOK card "Connect Hugging Face" → startHfSignIn() builds the HF
 * authorize URL (S256 code challenge, random state) and redirects. HF sends
 * the user back to /auth/hf/callback?code=...&state=... → handleHfCallback()
 * exchanges the code at https://huggingface.co/oauth/token and stores the
 * resulting `hf_...` access token through saveHfCredentials() — the SAME
 * encrypted SecureStore seam Tier 3's ZeroGPU provider reads. The token is
 * NEVER written to localStorage and NEVER leaves the device except to
 * huggingface.co endpoints over HTTPS.
 *
 * Configuration: VITE_HF_CLIENT_ID must be an OAuth client created at
 * https://huggingface.co/settings/connected-applications with redirect URI
 * `${origin}/auth/hf/callback` and scopes `openid profile inference-api`.
 */
import { saveHfCredentials, clearHfCredentials } from "@/lib/auth/hfCredentials";

const AUTHORIZE_ENDPOINT = "https://huggingface.co/oauth/authorize";
const TOKEN_ENDPOINT = "https://huggingface.co/oauth/token";
const USERINFO_ENDPOINT = "https://huggingface.co/oauth/userinfo";

/** Redirect path registered on the HF OAuth client. */
export const HF_CALLBACK_PATH = "/auth/hf/callback";
/** Scopes: identity (openid profile) + Inference Providers access. */
export const HF_OAUTH_SCOPES = "openid profile inference-api";

/** Read lazily so tests (vi.stubEnv) and runtime env loading both work. */
export function hfClientId(): string {
  return (import.meta.env.VITE_HF_CLIENT_ID as string | undefined)?.trim() ?? "";
}

export function isHfOAuthConfigured(): boolean {
  return hfClientId().length > 0;
}

// ── PKCE (RFC 7636) ──────────────────────────────────────────────────────

/** base64url of raw bytes — no padding, per RFC 7636. */
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  method: "S256";
}

/** High-entropy verifier + S256 challenge. Real Web Crypto, unit tested. */
export async function generatePkce(): Promise<PkcePair> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = base64url(raw);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return { codeVerifier, codeChallenge: base64url(new Uint8Array(digest)), method: "S256" };
}

// ── Transient sign-in state (sessionStorage — dies with the tab) ─────────

const PENDING_KEY = "shadowtalk.hf-oauth.pending.v1";

interface PendingHfSignIn {
  codeVerifier: string;
  state: string;
  startedAt: number;
}

function savePending(pending: PendingHfSignIn): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // sessionStorage unavailable (privacy mode) — the callback will fail
    // state validation and the user retries; never fall back to localStorage.
  }
}

function loadPending(): PendingHfSignIn | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingHfSignIn>;
    if (typeof parsed?.codeVerifier !== "string" || typeof parsed?.state !== "string") return null;
    return { codeVerifier: parsed.codeVerifier, state: parsed.state, startedAt: parsed.startedAt ?? 0 };
  } catch {
    return null;
  }
}

function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

// ── Sign-in start ────────────────────────────────────────────────────────

export class HfOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HfOAuthError";
  }
}

/**
 * Build the HF authorize URL, stash the PKCE verifier + state for the
 * callback, and return it (the caller navigates). Throws when the deployment
 * has no client id configured.
 */
export async function startHfSignIn(): Promise<string> {
  if (!isHfOAuthConfigured()) {
    throw new HfOAuthError(
      "Sign-in with Hugging Face is not configured on this deployment (missing VITE_HF_CLIENT_ID).",
    );
  }
  const pkce = await generatePkce();
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  savePending({ codeVerifier: pkce.codeVerifier, state, startedAt: Date.now() });

  const redirectUri = `${window.location.origin}${HF_CALLBACK_PATH}`;
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", hfClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", HF_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", pkce.codeChallenge);
  url.searchParams.set("code_challenge_method", pkce.method);
  // Never reuse a stale login session the user did not intend here.
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

// ── Callback handling ────────────────────────────────────────────────────

export interface HfCallbackParams {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  errorDescription?: string | null;
}

export interface HfCallbackSuccess {
  username?: string;
  displayName?: string;
  scopes?: string[];
}

/** Single round shape for the callback page: success or a user-readable failure. */
export type HfCallbackResult =
  | { ok: true; success: HfCallbackSuccess }
  | { ok: false; reason: string };

/** Validate state, exchange the code, fetch the profile, store credentials. */
export async function handleHfCallback(params: HfCallbackParams): Promise<HfCallbackResult> {
  if (params.error) {
    return {
      ok: false,
      reason: params.errorDescription
        ? `Hugging Face sign-in was declined: ${params.errorDescription}`
        : `Hugging Face sign-in was declined (${params.error}).`,
    };
  }
  if (!params.code) {
    return { ok: false, reason: "Hugging Face did not return an authorization code. Please try again." };
  }
  const pending = loadPending();
  clearPending();
  if (!pending) {
    return { ok: false, reason: "This sign-in attempt expired — start the connection again from Settings → BYOK." };
  }
  if (!params.state || params.state !== pending.state) {
    return { ok: false, reason: "Sign-in state mismatch — the request may have been tampered with. Please try again." };
  }
  if (pending.startedAt && Date.now() - pending.startedAt > 10 * 60_000) {
    return { ok: false, reason: "The sign-in attempt expired (older than 10 minutes). Please try again." };
  }

  // Token exchange — PKCE verifier proves the client that started the flow.
  let tokenPayload: { access_token?: string; error?: string; error_description?: string; scope?: string };
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: `${window.location.origin}${HF_CALLBACK_PATH}`,
        client_id: hfClientId(),
        code_verifier: pending.codeVerifier,
      }),
    });
    tokenPayload = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        reason: `Hugging Face rejected the token exchange (${response.status}).${tokenPayload?.error_description ? ` ${tokenPayload.error_description}` : ""}`,
      };
    }
  } catch {
    return { ok: false, reason: "Could not reach huggingface.co to finish the sign-in. Check your connection and retry." };
  }
  if (!tokenPayload.access_token || !tokenPayload.access_token.startsWith("hf_")) {
    return { ok: false, reason: "Hugging Face returned an unexpected token shape. Please try again." };
  }

  // Profile (best effort — the token is valid without it).
  let profile: { preferred_username?: string; name?: string } = {};
  try {
    const profileResponse = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    if (profileResponse.ok) profile = await profileResponse.json();
  } catch {
    /* profile is optional */
  }

  await saveHfCredentials({
    accessToken: tokenPayload.access_token,
    username: profile.preferred_username,
    scopes: typeof tokenPayload.scope === "string" ? tokenPayload.scope.split(" ") : undefined,
  });
  return { ok: true, success: { username: profile.preferred_username, displayName: profile.name } };
}

/** Disconnect — clears both the credential record and any half-finished sign-in. */
export async function disconnectHfAccount(): Promise<void> {
  clearPending();
  await clearHfCredentials();
}
