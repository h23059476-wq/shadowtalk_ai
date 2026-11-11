/**
 * Local-only authentication for preview environments.
 *
 * Used when `isPreviewEnvironment()` is true (Lovable preview surfaces where
 * Firebase Auth rejects the domain). All data stays in localStorage — no
 * network calls, no Firebase, no real security. This exists purely so the app
 * is testable in the Lovable editor.
 *
 * Production always uses real Firebase Auth via `backend.auth.*`.
 */
import type { Session, User } from '@/lib/backend-types';
import {
  buildLocalSession,
  saveLocalUser,
  hasExplicitSignOut,
} from '@/lib/persistentAuth';

const LOCAL_USERS_KEY = 'shadowtalk_local_users';
const LOCAL_SESSION_KEY = 'shadowtalk_local_session';

interface LocalUserRecord {
  id: string;
  email: string;
  password: string; // plaintext — preview only, never used in production
  display_name?: string;
  created_at: string;
}

function readLocalUsers(): Record<string, LocalUserRecord> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalUsers(users: Record<string, LocalUserRecord>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function readLocalSession(): Session | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalSession(session: Session | null): void {
  if (typeof localStorage === 'undefined') return;
  if (session) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
}

function emailKey(email: string): string {
  return email.toLowerCase().trim();
}

export interface LocalAuthResult {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

function ok(session: Session): LocalAuthResult {
  return { user: session.user, session, error: null };
}

function err(message: string): LocalAuthResult {
  const e = new Error(message);
  (e as any).code = 'local_auth_error';
  return { user: null, session: null, error: e };
}

/**
 * Sign in with email + password against the local user store.
 */
export function localSignInWithPassword(email: string, password: string): LocalAuthResult {
  const key = emailKey(email);
  const users = readLocalUsers();
  const record = users[key];
  if (!record) {
    return err('No account found with that email.');
  }
  if (record.password !== password) {
    return err('Invalid email or password.');
  }
  const session = buildLocalSession(record.email, record.id);
  // Override the user_metadata with display_name if available.
  if (record.display_name) {
    session.user.user_metadata = {
      ...session.user.user_metadata,
      display_name: record.display_name,
    };
  }
  writeLocalSession(session);
  saveLocalUser(record.email, record.id);
  return ok(session);
}

/**
 * Create a new local user account.
 */
export function localSignUp(
  email: string,
  password: string,
  options?: { display_name?: string },
): LocalAuthResult {
  const key = emailKey(email);
  const users = readLocalUsers();
  if (users[key]) {
    return err('An account already exists with that email.');
  }
  if (password.length < 6) {
    return err('Password must be at least 6 characters.');
  }
  const id = `local-${key.split('@')[0]}-${Date.now().toString(36)}`;
  const record: LocalUserRecord = {
    id,
    email: email.trim(),
    password,
    display_name: options?.display_name,
    created_at: new Date().toISOString(),
  };
  users[key] = record;
  writeLocalUsers(users);
  const session = buildLocalSession(record.email, record.id);
  if (record.display_name) {
    session.user.user_metadata = {
      ...session.user.user_metadata,
      display_name: record.display_name,
    };
  }
  writeLocalSession(session);
  saveLocalUser(record.email, record.id);
  return ok(session);
}

/**
 * Sign in anonymously (creates a throwaway local session).
 */
export function localSignInAnonymously(): LocalAuthResult {
  const id = `anon-${Date.now().toString(36)}`;
  const session: Session = {
    access_token: 'local-anon-token',
    refresh_token: 'local-anon-refresh',
    token_type: 'bearer',
    expires_in: 999999999,
    expires_at: Math.floor(Date.now() / 1000) + 999999999,
    user: {
      id,
      email: null,
      is_anonymous: true,
      app_metadata: {},
      user_metadata: {},
      aud: 'anonymous',
      created_at: new Date().toISOString(),
    },
  };
  writeLocalSession(session);
  return ok(session);
}

/**
 * Get the current local session (if any and not explicitly signed out).
 */
export function localGetSession(): Session | null {
  if (hasExplicitSignOut()) return null;
  return readLocalSession();
}

/**
 * Sign out of the local session.
 */
export function localSignOut(): void {
  writeLocalSession(null);
}

/**
 * Reset password for a local user (preview-only — just sets the new password).
 */
export function localResetPassword(email: string, newPassword: string): LocalAuthResult {
  const key = emailKey(email);
  const users = readLocalUsers();
  const record = users[key];
  if (!record) {
    // For security, don't reveal whether the email exists.
    return ok(buildLocalSession(email));
  }
  if (newPassword.length < 6) {
    return err('Password must be at least 6 characters.');
  }
  record.password = newPassword;
  users[key] = record;
  writeLocalUsers(users);
  return ok(buildLocalSession(email));
}
