import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { backend } from "@/integrations/local/client";

export default function AuthActionPage() {
  const [params] = useSearchParams();
  const mode = params.get("mode") || "";
  const code = params.get("oobCode") || "";
  const started = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "complete" | "error">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!code) {
      setMessage("This link is invalid or incomplete. Return to sign in and request a new link.");
      setState("error");
      return;
    }
    if (mode === "resetPassword") {
      void backend.auth.verifyPasswordResetCode(code).then(({ data, error }: any) => {
        if (error || !data?.email) {
          setMessage("This password reset link is invalid or has expired. Request a new link to continue.");
          setState("error");
          return;
        }
        setEmail(data.email);
        setState("ready");
      });
      return;
    }
    if (mode === "verifyEmail") {
      void backend.auth.applyEmailVerificationCode(code).then(({ error }: any) => {
        if (error) {
          setMessage("This verification link is invalid or has expired. Sign in and request a new link.");
          setState("error");
          return;
        }
        setMessage("Your email address is verified. You can return to ShadowTalk and sign in.");
        setState("complete");
      });
      return;
    }
    setMessage("This account link is not supported. Return to sign in and request a new link.");
    setState("error");
  }, [mode, code]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }
    setState("saving");
    const { error } = await backend.auth.confirmPasswordReset(code, password);
    if (error) {
      setMessage(error.message || "The password could not be changed. Request a new link to continue.");
      setState("error");
      return;
    }
    setMessage("Your password has been changed. You can now sign in with it.");
    setState("complete");
  };

  return (
    <main className="min-h-screen bg-[#05070d] text-slate-100 flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl" aria-labelledby="auth-action-title">
        <Link to="/auth" className="text-sm text-cyan-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">ShadowTalk · Sign in</Link>
        <h1 id="auth-action-title" className="mt-6 text-2xl font-semibold">
          {mode === "resetPassword" ? "Choose a new password" : mode === "verifyEmail" ? "Verify your email" : "Account link"}
        </h1>
        {state === "loading" && <p className="mt-3 text-sm text-slate-300" role="status" aria-live="polite">Checking your secure link…</p>}
        {(state === "ready" || state === "saving") && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Reset password for <span className="font-medium text-white">{email}</span></p>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" />
            </div>
            <button type="submit" className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-60" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save new password"}</button>
          </form>
        )}
        {message && <p className="mt-4 text-sm text-slate-300" role={state === "error" ? "alert" : "status"} aria-live="polite">{message}</p>}
        {(state === "complete" || state === "error") && <Link className="mt-6 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" to="/auth">Return to sign in</Link>}
      </section>
    </main>
  );
}
