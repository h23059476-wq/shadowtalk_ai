/**
 * Hugging Face credential contract — the single place the Tier 2
 * "Sign in with Hugging Face" OAuth flow stores its access token, and the
 * single place cloud features (Tier 3 ZeroGPU Spaces, HF Inference Router)
 * read it from.
 *
 * Storage policy (Stealth/BYOK rules):
 *  - The token lives in the ShadowTalk SecureStore (device-local IndexedDB
 *    backend, desktop secure backend when running under Tauri). It is NEVER
 *    written to localStorage, NEVER uploaded, and NEVER synced.
 *  - Every reader validates the `hf_` prefix so a malformed or future
 *    foreign token shape can never leak into an Authorization header.
 *  - Tier 2 (hfOAuth.ts, pending) writes through saveHfCredentials() after
 *    the PKCE token exchange; until then the record simply does not exist
 *    and consumers run in anonymous mode.
 */
import { getSecureStore } from "@/lib/secureStore";

const HF_CREDENTIALS_KEY = "shadowtalk.hf-oauth.v1";

export interface HfCredentials {
  /** OAuth access token from https://huggingface.co/oauth/token — starts with `hf_`. */
  accessToken: string;
  /** OAuth profile fields returned by the `openid profile` scopes. */
  username?: string;
  avatarUrl?: string;
  /** Scopes actually granted (e.g. ["openid", "profile", "inference-api"]). */
  scopes?: string[];
  connectedAt: string;
}

function isPlausibleToken(token: unknown): token is string {
  return typeof token === "string" && /^hf_[A-Za-z0-9_-]{10,}$/.test(token);
}

function decodeRecord(raw: string | null | undefined): HfCredentials | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HfCredentials> | null;
    if (!parsed || !isPlausibleToken(parsed.accessToken)) return null;
    const connectedAt =
      typeof parsed.connectedAt === "string" && parsed.connectedAt
        ? parsed.connectedAt
        : new Date(0).toISOString(); // legacy record without a timestamp
    return Object.assign(
      { accessToken: parsed.accessToken, connectedAt },
      typeof parsed.username === "string" && parsed.username ? { username: parsed.username } : {},
      typeof parsed.avatarUrl === "string" && /^https:\/\//.test(parsed.avatarUrl)
        ? { avatarUrl: parsed.avatarUrl }
        : {},
      Array.isArray(parsed.scopes)
        ? { scopes: parsed.scopes.filter((s): s is string => typeof s === "string") }
        : {},
    );
  } catch {
    return null;
  }
}

/** Store (or replace) the Tier 2 OAuth credentials. Throws on a malformed token. */
export async function saveHfCredentials(creds: {
  accessToken: string;
  username?: string;
  avatarUrl?: string;
  scopes?: string[];
}): Promise<HfCredentials> {
  if (!isPlausibleToken(creds.accessToken)) {
    throw new Error("That does not look like a Hugging Face access token (expected hf_...).");
  }
  const record: HfCredentials = Object.assign(
    { accessToken: creds.accessToken, connectedAt: new Date().toISOString() },
    creds.username ? { username: creds.username } : {},
    creds.avatarUrl ? { avatarUrl: creds.avatarUrl } : {},
    creds.scopes?.length ? { scopes: creds.scopes } : {},
  );
  const store = await getSecureStore();
  await store.setItem(HF_CREDENTIALS_KEY, JSON.stringify(record));
  return record;
}

/** The stored credentials, or null when Tier 2 has not connected an account. */
export async function getHfCredentials(): Promise<HfCredentials | null> {
  try {
    const store = await getSecureStore();
    return decodeRecord(await store.getItem(HF_CREDENTIALS_KEY));
  } catch {
    return null;
  }
}

/**
 * The access token for `Client.connect(..., { token })` / Authorization
 * headers — null when no account is connected or the stored token is
 * malformed. Anonymous callers must treat null as "use the free anonymous
 * quota".
 */
export async function getHfAccessToken(): Promise<string | null> {
  const creds = await getHfCredentials();
  return creds ? creds.accessToken : null;
}

export async function isHfAccountConnected(): Promise<boolean> {
  return (await getHfCredentials()) !== null;
}

/** Tier 2 "Disconnect" — removes the token from the device. */
export async function clearHfCredentials(): Promise<void> {
  try {
    const store = await getSecureStore();
    await store.removeItem(HF_CREDENTIALS_KEY);
  } catch {
    // ignore — nothing to clean up
  }
}

/** Test hook — wipes the persisted credentials. */
export async function __resetHfCredentialsForTests(): Promise<void> {
  await clearHfCredentials();
}
