import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { consumeReturnPath } from "@/lib/persistentAuth";
import { hasPendingOAuthFlag } from "@/lib/oauthReturn";

/**
 * When a persisted session exists, send users straight to the workspace
 * (like opening Gemini while already signed into Google).
 *
 * Handles fresh OAuth return flows as well as already signed-in users visiting
 * the auth page.
 */
const PersistedAuthRedirect = () => {
  const { user, loading, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (loading) return;
    if (isAnonymous) return;
    if (!user) return;

    const path = location.pathname;
    // Fresh (< 5 min) pending flag = the user just came back from an OAuth
    // redirect. The previous inline check compared against the legacy bare
    // "1" format, which the current timestamp-format writer never produces,
    // so the fast-path branch was dead code.
    const oauthRedirectPending = hasPendingOAuthFlag();

    if (oauthRedirectPending || path === "/auth" || path === "/auth/") {
      try {
        sessionStorage.removeItem("shadowtalk_auth_redirect_pending");
      } catch {
        // Continue navigation even if session storage is unavailable.
      }
      navigate('/chatbot', { replace: true });
    }
  }, [user, loading, isAnonymous, location.pathname, navigate]);

  return null;
};

export default PersistedAuthRedirect;
