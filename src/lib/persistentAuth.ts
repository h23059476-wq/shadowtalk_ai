import type { Session } from "@/lib/backend-types";

/** Set when user explicitly signs out — blocks silent re-login until they sign in again. */
export const SIGNED_OUT_FLAG = "shadowtalk_signed_out";
export const RETURN_TO_KEY = "shadowtalk_return_to";
export const LAST_WORKSPACE_KEY = "shadowtalk_last_workspace";

const DEFAULT_WORKSPACE = "/chatbot";
const LOCAL_AUTH_KEY = "shadowtalk-local-user";

export function markExplicitSignOut() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SIGNED_OUT_FLAG, "1");
    localStorage.removeItem(LOCAL_AUTH_KEY);
  }
}

export function clearExplicitSignOut() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SIGNED_OUT_FLAG);
  }
}

export function hasExplicitSignOut(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SIGNED_OUT_FLAG) === "1";
}

export function saveReturnPath(path: string) {
  if (typeof localStorage === "undefined") return;
  if (path.startsWith("/auth")) return;
  localStorage.setItem(RETURN_TO_KEY, path);
}

export function consumeReturnPath(): string {
  if (typeof localStorage === "undefined") return DEFAULT_WORKSPACE;
  const path = localStorage.getItem(RETURN_TO_KEY) || DEFAULT_WORKSPACE;
  localStorage.removeItem(RETURN_TO_KEY);
  if (!path.startsWith("/") || path.includes(":") || path.includes("index.html") || path === "/" || path === "/home" || path === "/auth" || path.startsWith("/auth/")) {
    return DEFAULT_WORKSPACE;
  }
  return path;
}

export function rememberWorkspacePath(path: string) {
  if (typeof localStorage === "undefined") return;
  if (!path.startsWith("/") || path === "/auth") return;
  localStorage.setItem(LAST_WORKSPACE_KEY, path);
}

export function getRememberedWorkspacePath(): string {
  if (typeof localStorage === "undefined") return DEFAULT_WORKSPACE;
  const path = localStorage.getItem(LAST_WORKSPACE_KEY);
  if (!path || !path.startsWith("/") || path.includes(":") || path.includes("index.html")) {
    return DEFAULT_WORKSPACE;
  }
  return path;
}

export function isAnonymousUser(session: Session | null): boolean {
  if (!session?.user) return false;
  return session.user.is_anonymous === true;
}

/** Build a local Session object from stored user data. */
export function buildLocalSession(email: string, id?: string): Session {
  const userId = id || `local-${email.split('@')[0]}-${Date.now().toString(36)}`;
  return {
    access_token: 'local-token',
    refresh_token: 'local-refresh',
    token_type: 'bearer',
    expires_in: 999999999,
    expires_at: Math.floor(Date.now() / 1000) + 999999999,
    user: {
      id: userId,
      email,
      is_anonymous: false,
      app_metadata: {},
      user_metadata: { email },
      aud: 'local',
      created_at: new Date().toISOString(),
    },
  };
}

export async function restoreOrCreateSession(): Promise<Session | null> {
  if (typeof localStorage === "undefined") return null;

  // If user explicitly signed out, don't auto-login
  if (hasExplicitSignOut()) {
    return null;
  }

  // Try to restore from localStorage
  const stored = localStorage.getItem(LOCAL_AUTH_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.email) {
        clearExplicitSignOut();
        return buildLocalSession(parsed.email, parsed.id);
      }
    } catch {}
  }

  return null;
}

/** Save user to localStorage after successful local login. */
export function saveLocalUser(email: string, id?: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({ email, id: id || `local-${email.split('@')[0]}` }));
  clearExplicitSignOut();
}

/** No-op — no remote session to refresh. */
export async function refreshSessionIfNeeded(): Promise<boolean> {
  return true;
}

/** Keys that must survive "clear local data" so users stay signed in. */
export const PRESERVE_ON_LOCAL_CLEAR = [
  SIGNED_OUT_FLAG,
  RETURN_TO_KEY,
  LAST_WORKSPACE_KEY,
  LOCAL_AUTH_KEY,
  "shadowtalk_session_token",
  "shadowtalk_offline_auth",
] as const;
