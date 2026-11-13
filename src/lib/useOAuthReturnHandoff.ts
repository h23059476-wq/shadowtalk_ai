/**
 * Deterministic handoff for the OAuth redirect return.
 *
 * signInWithRedirect always brings the browser back to /auth. While auth is
 * still initializing (session restore + getRedirectResult processing) the
 * auth page shows an explicit "completing sign-in" state instead of silently
 * re-rendering the login form. Once initialization finishes:
 *  - with a session: hard-navigate to the remembered post-login destination
 *    (falls back to /chatbot), so a completed Google sign-in always lands on
 *    the workspace;
 *  - without a session: the redirect genuinely failed to produce one
 *    (blocked sign-in cookies, storage partitioning, COOP interference) —
 *    clear the pending state and surface an actionable error instead of
 *    stranding the user on a silent login page.
 */
import { useEffect, useState } from 'react';
import {
  clearPendingOAuthFlag,
  consumeOAuthReturnDestination,
  hasPendingOAuthFlag,
} from '@/lib/oauthReturn';

interface ToastLike {
  (opts: { title: string; description: string; variant?: 'destructive' | 'default' }): void;
}

interface Options {
  /** AuthProvider finished restoring the session AND a user is present. */
  authenticated: boolean;
  /** AuthProvider initialization/restore is still in progress. */
  authLoading: boolean;
  /** Where to land when no destination was stored (getChatbotPath result). */
  fallbackDestination: string;
  toast: ToastLike;
  /** Injectable for tests; defaults to a full-page navigation. */
  hardNavigate?: (url: string) => void;
}

export function useOAuthReturnHandoff({
  authenticated,
  authLoading,
  fallbackDestination,
  toast,
  hardNavigate,
}: Options) {
  // Fresh pending flag = the user just came back from an OAuth redirect.
  // Stale or legacy flags (older than 5 min, or bare "1") don't count, so a
  // normal visit to /auth never triggers the completing state.
  const [completing, setCompleting] = useState(() => hasPendingOAuthFlag());
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    if (!completing || navigated || authLoading) return;

    if (authenticated) {
      setNavigated(true);
      clearPendingOAuthFlag();
      const destination = consumeOAuthReturnDestination() ?? fallbackDestination;
      if (hardNavigate) hardNavigate(destination);
      else window.location.assign(destination);
      return;
    }

    // Auth init finished, no session — the Google return handoff failed for
    // real. Clean up and tell the user instead of stranding them silently.
    clearPendingOAuthFlag();
    setCompleting(false);
    toast({
      title: "Google sign-in didn't complete",
      description:
        'Your browser may have blocked the cookies needed to finish signing in. Please try "Continue with Google" again.',
      variant: 'destructive',
    });
  }, [completing, navigated, authLoading, authenticated, fallbackDestination, toast, hardNavigate]);

  return { completing };
}
