import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { backend } from "@/integrations/local/client";

export default function EmailVerificationNotice() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  if (!user?.email || user.user_metadata?.email_verified || verified) return null;

  const refreshStatus = async () => {
    setBusy(true);
    setMessage("");
    const { data, error } = await backend.auth.reloadUser();
    if (error) setMessage("Could not check verification right now. Try again when you are online.");
    else if (data?.user?.user_metadata?.email_verified) {
      setVerified(true);
      setMessage("Email verified. Thanks!");
    } else setMessage("Not verified yet. Open the link in your email, then check again.");
    setBusy(false);
  };

  const resend = async () => {
    setBusy(true);
    setMessage("");
    const redirectTo = `${window.location.origin}/auth?flow=verify-complete`;
    const { error } = await backend.auth.sendEmailVerification({ redirectTo });
    setMessage(error ? "Could not send a verification email. Check your connection and try again." : "If this address can receive verification mail, a new link is on its way.");
    setBusy(false);
  };

  return (
    <aside className="relative z-[60] border-b border-amber-400/20 bg-amber-950/70 px-4 py-3 text-amber-50" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">Verify {user.email} to secure account recovery. You can keep using ShadowTalk while verification is pending.{message && <span className="block text-xs text-amber-100/80">{message}</span>}</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => void refreshStatus()} disabled={busy} className="rounded-lg border border-amber-100/30 px-3 py-1.5 text-xs font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60">I verified</button>
          <button type="button" onClick={() => void resend()} disabled={busy} className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60">{busy ? "Please wait…" : "Resend email"}</button>
        </div>
      </div>
    </aside>
  );
}