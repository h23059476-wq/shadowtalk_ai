/**
 * Firebase Auth → Supabase-style auth surface.
 * Keeps the app's existing `backend.auth.*` call sites working unchanged.
 */
import {
  GoogleAuthProvider,
  OAuthProvider,
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously as fbSignInAnonymously,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut as fbSignOut,
  updateEmail,
  updatePassword,
  updateProfile,
  verifyPasswordResetCode,
  type User as FbUser,
} from 'firebase/auth';
import { fbAuth } from './app';
import {
  clearPendingOAuthFlag,
  hasPendingOAuthFlag,
  setOAuthReturnDestination,
  setPendingOAuthFlag,
} from '../../lib/oauthReturn';

export interface AdapterUser {
  id: string;
  email: string | null;
  is_anonymous: boolean;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  aud: string;
  created_at: string;
}

export interface AdapterSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: AdapterUser;
}

function friendlyError(err: any): Error {
  const code: string = err?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Unable to authenticate with these details. Check them or try another sign-in method.',
    'auth/wrong-password': 'Unable to authenticate with these details. Check them or try another sign-in method.',
    'auth/user-not-found': 'Unable to authenticate with these details. Check them or try another sign-in method.',
    'auth/email-already-in-use': 'Unable to authenticate with these details. Check them or try another sign-in method.',
    'auth/account-exists-with-different-credential': 'Unable to sign in with this provider. Try a sign-in method already connected to your account.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again in a few minutes.',
    'auth/operation-not-allowed':
      'This sign-in method is not enabled for the project yet.',
    'auth/unauthorized-domain':
      `Sign-in isn't allowed on ${typeof window !== 'undefined' ? window.location.hostname : 'this site'} yet. Add it under Firebase → Authentication → Settings → Authorized domains.`,
    'auth/popup-blocked':
      'Sign-in popup was blocked by your browser. Please allow popups for this site or try again.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
  };
  const e = new Error(map[code] || 'Authentication failed. Please try again.');
  (e as any).code = code;
  (e as any).status = code ? 400 : 500;
  return e;
}

function safeAuthContinueUrl(requested: string | undefined, fallbackPath: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const origin = window.location.origin;
  const fallback = new URL(fallbackPath, origin).toString();
  if (!requested) return fallback;
  try {
    const parsed = new URL(requested, origin);
    if (parsed.origin !== origin || !['/auth', '/chatbot'].includes(parsed.pathname)) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function toAdapterUser(u: FbUser | null): AdapterUser | null {
  if (!u) return null;
  return {
    id: u.uid,
    email: u.email,
    is_anonymous: u.isAnonymous,
    app_metadata: { provider: u.providerData?.[0]?.providerId || 'password' },
    user_metadata: {
      email: u.email,
      display_name: u.displayName || undefined,
      avatar_url: u.photoURL || undefined,
      email_verified: u.emailVerified,
    },
    aud: 'authenticated',
    created_at: u.metadata?.creationTime
      ? new Date(u.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  };
}

async function toAdapterSession(u: FbUser | null): Promise<AdapterSession | null> {
  if (!u) return null;
  let token = '';
  let expiresAt = 0;
  try {
    const tokenResult = await u.getIdTokenResult();
    token = tokenResult.token;
    expiresAt = Math.floor(Date.parse(tokenResult.expirationTime) / 1000);
  } catch {
    /* offline */
  }
  return {
    access_token: token,
    refresh_token: u.refreshToken || '',
    token_type: 'bearer',
    expires_in: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
    expires_at: expiresAt,
    user: toAdapterUser(u)!,
  };
}

/** Wait for the first auth state resolution so getSession() is reliable on boot. */
function currentUser(): Promise<FbUser | null> {
  const auth = fbAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        unsub();
        resolve(u);
      },
      () => {
        unsub();
        resolve(null);
      },
    );
  });
}

export function createAuthAdapter() {
  let redirectResultHandled = false;

  return {
    async getSession() {
      try {
        const session = await toAdapterSession(await currentUser());
        return { data: { session }, error: null };
      } catch (error: any) {
        return { data: { session: null }, error: friendlyError(error) };
      }
    },

    async getUser() {
      try {
        const user = toAdapterUser(await currentUser());
        return { data: { user }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error: friendlyError(error) };
      }
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const cred = await signInWithEmailAndPassword(fbAuth(), email, password);
        return {
          data: { user: toAdapterUser(cred.user), session: await toAdapterSession(cred.user) },
          error: null,
        };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: friendlyError(error) };
      }
    },

    async signUp({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, any>; emailRedirectTo?: string };
    }) {
      try {
        const cred = await createUserWithEmailAndPassword(fbAuth(), email, password);
        const displayName = options?.data?.display_name || options?.data?.full_name;
        if (displayName) {
          try {
            await updateProfile(cred.user, { displayName });
          } catch {
            /* non-fatal */
          }
        }
        // Email verification is advisory; creation succeeds even if mail delivery fails.
        let verificationEmailSent = false;
        try {
          const actionCodeSettings = {
            url: safeAuthContinueUrl(options?.emailRedirectTo, '/auth?flow=verify-complete'),
            handleCodeInApp: false,
          };
          await sendEmailVerification(cred.user, actionCodeSettings);
          verificationEmailSent = true;
        } catch (verifyErr) {
          console.warn('[Firebase Auth] Email verification send failed:', verifyErr);
        }
        return {
          data: { user: toAdapterUser(cred.user), session: await toAdapterSession(cred.user), verificationEmailSent },
          error: null,
        };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: friendlyError(error) };
      }
    },

    async signInAnonymously() {
      try {
        const cred = await fbSignInAnonymously(fbAuth());
        return {
          data: { user: toAdapterUser(cred.user), session: await toAdapterSession(cred.user) },
          error: null,
        };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: friendlyError(error) };
      }
    },

    async signInWithOAuth({
      provider,
      options,
    }: {
      provider: string;
      options?: { redirectTo?: string; queryParams?: Record<string, string>; scopes?: string };
    }) {
      try {
        let p: GoogleAuthProvider | OAuthProvider;
        if (provider === 'google') {
          p = new GoogleAuthProvider();
          p.setCustomParameters({ prompt: 'select_account' });
        } else if (provider === 'apple') {
          p = new OAuthProvider('apple.com');
          p.addScope('email');
          p.addScope('name');
        } else {
          p = new OAuthProvider(provider.includes('.') ? provider : `${provider}.com`);
        }

        // signInWithRedirect always returns the browser to the initiating page
        // (/auth) — the caller's intended destination is honored by persisting
        // it here so the return handoff can navigate there once the session
        // is restored (the previous implementation dropped it entirely).
        setPendingOAuthFlag();
        if (options?.redirectTo) setOAuthReturnDestination(options.redirectTo);
        await signInWithRedirect(fbAuth(), p);
        return {
          data: { provider, url: window.location.href, user: null, session: null },
          error: null,
        };
      } catch (error: any) {
        // The redirect never left the page — clear the handoff state so the
        // auth page doesn't mistake the next visit for a return from Google.
        clearPendingOAuthFlag();
        return { data: { provider, url: '', user: null, session: null }, error: friendlyError(error) };
      }
    },

    async signOut() {
      try {
        await fbSignOut(fbAuth());
        return { error: null };
      } catch (error: any) {
        return { error: friendlyError(error) };
      }
    },

    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
      try {
        await sendPasswordResetEmail(fbAuth(), email, {
          url: safeAuthContinueUrl(options?.redirectTo, '/auth?flow=reset-complete'),
          handleCodeInApp: false,
        });
        return { data: {}, error: null };
      } catch (error: any) {
        if (error?.code === 'auth/user-not-found') return { data: {}, error: null };
        return { data: null, error: friendlyError(error) };
      }
    },

    async verifyPasswordResetCode(code: string) {
      try {
        const email = await verifyPasswordResetCode(fbAuth(), code);
        return { data: { email }, error: null };
      } catch {
        return { data: null, error: new Error('This password reset link is invalid or has expired. Request a new link to continue.') };
      }
    },

    async confirmPasswordReset(code: string, password: string) {
      try {
        await confirmPasswordReset(fbAuth(), code, password);
        return { data: {}, error: null };
      } catch (error: any) {
        return { data: null, error: friendlyError(error) };
      }
    },

    async applyEmailVerificationCode(code: string) {
      try {
        await applyActionCode(fbAuth(), code);
        const user = fbAuth().currentUser;
        if (user) await reload(user);
        return { data: { user: toAdapterUser(user) }, error: null };
      } catch {
        return { data: null, error: new Error('This verification link is invalid or has expired. Sign in and request a new link.') };
      }
    },

    async reloadUser() {
      const user = fbAuth().currentUser;
      if (!user) return { data: { user: null }, error: null };
      try {
        await reload(user);
        return { data: { user: toAdapterUser(user) }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error: friendlyError(error) };
      }
    },

    async updateUser(attrs: { email?: string; password?: string; data?: Record<string, any> }) {
      const user = fbAuth().currentUser;
      if (!user) return { data: { user: null }, error: new Error('Not signed in') };
      try {
        if (attrs.email) await updateEmail(user, attrs.email);
        if (attrs.password) await updatePassword(user, attrs.password);
        if (attrs.data) {
          await updateProfile(user, {
            displayName: attrs.data.display_name ?? attrs.data.full_name ?? user.displayName,
            photoURL: attrs.data.avatar_url ?? user.photoURL,
          });
        }
        return { data: { user: toAdapterUser(user) }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error: friendlyError(error) };
      }
    },

    async setSession() {
      return { data: { session: await toAdapterSession(fbAuth().currentUser) }, error: null };
    },

    async refreshSession() {
      const user = fbAuth().currentUser;
      try {
        if (user) await user.getIdToken(true);
      } catch {
        /* ignore */
      }
      return { data: { session: await toAdapterSession(user) }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: AdapterSession | null) => void) {
      const auth = fbAuth();
      const subscription = onAuthStateChanged(auth, async (u) => {
        const session = await toAdapterSession(u);
        callback(!u ? 'SIGNED_OUT' : 'SIGNED_IN', session);
      });

      // Handle OAuth redirect result. getRedirectResult() processes the
      // redirect callback and clears the redirect state from the URL.
      // Even if getRedirectResult fails (e.g., COOP interference),
      // onAuthStateChanged above will still fire with the signed-in user
      // because Firebase Auth persists the session in indexedDB.
      if (typeof window !== 'undefined' && !redirectResultHandled) {
        redirectResultHandled = true;
        void getRedirectResult(auth)
          .then(async (result) => {
            if (!result?.user) {
              // No redirect result — but check if there's a pending OAuth
              // flag AND the user is already signed in (Firebase may have
              // completed the sign-in internally without getRedirectResult
              // surfacing it).
              const pending = hasPendingOAuthFlag();
              if (pending) {
                clearPendingOAuthFlag();
                const currentUser = auth.currentUser;
                if (currentUser) {
                  const session = await toAdapterSession(currentUser);
                  callback('SIGNED_IN', session);
                }
              }
              return;
            }
            // Redirect completed successfully — clear the pending flag so a
            // later page load can't mistake the stale flag for a fresh
            // sign-in attempt (the previous code only cleared it on failure).
            clearPendingOAuthFlag();
            const session = await toAdapterSession(result.user);
            callback('SIGNED_IN', session);
          })
          .catch((error: unknown) => {
            const message = friendlyError(error).message;
            console.error('[Firebase Auth] OAuth redirect sign-in failed:', error);
            // Even on error, try to recover — Firebase may have persisted
            // the session despite the getRedirectResult failure.
            const currentUser = auth.currentUser;
            if (currentUser) {
              toAdapterSession(currentUser).then((session) => {
                callback('SIGNED_IN', session);
              });
            }
            try {
              clearPendingOAuthFlag();
              window.sessionStorage.setItem('shadowtalk.firebase-auth-redirect-error', message);
            } catch {
              // The console error remains available if browser storage is disabled.
            }
            window.dispatchEvent(
              new CustomEvent('shadowtalk:firebase-auth-redirect-error', { detail: message }),
            );
          });
      }
      return {
        data: { subscription: { unsubscribe: subscription, id: 'firebase-auth' } },
        error: null,
      };
    },

    async linkIdentity() {
      return { data: { user: null }, error: new Error('Identity linking is not available.') };
    },
    async unlinkIdentity() {
      return { data: { user: null }, error: new Error('Identity linking is not available.') };
    },

    // Send (or resend) email verification to the current user.
    async sendEmailVerification(options?: { redirectTo?: string }) {
      const user = fbAuth().currentUser;
      if (!user) return { data: null, error: new Error('Not signed in') };
      try {
        const actionCodeSettings = {
          url: safeAuthContinueUrl(options?.redirectTo, '/auth?flow=verify-complete'),
          handleCodeInApp: false,
        };
        await sendEmailVerification(user, actionCodeSettings);
        return { data: null, error: null };
      } catch (error: any) {
        return { data: null, error: friendlyError(error) };
      }
    },

    // Check if the current user's email is verified.
    isEmailVerified(): boolean {
      return fbAuth().currentUser?.emailVerified ?? false;
    },

    // Firebase MFA is enrolled through its own flow; expose safe no-ops.
    mfa: {
      challenge: async () => ({ data: null, error: null }),
      enroll: async () => ({
        data: { id: '', type: 'totp', totp: { qr_code: '', secret: '', uri: '' } },
        error: null,
      }),
      listFactors: async () => ({ data: { factors: [], next_page: null }, error: null }),
      unenroll: async () => ({ data: null, error: null }),
      verify: async () => ({ data: { data: null }, error: null }),
      getAuthenticatorAssuranceLevel: async () => ({
        data: { currentLevel: 'aal1', nextLevel: 'aal1' },
        error: null,
      }),
    },
  };
}
