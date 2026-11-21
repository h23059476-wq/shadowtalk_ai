import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { clearExplicitSignOut } from "@/lib/persistentAuth";
import { backend } from "@/integrations/local/client";
import { useAuth } from "@/components/AuthProvider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Zap,
  Lock,
  Mail,
  MailCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Fingerprint,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ChatbotLogo from "@/components/ChatbotLogo";
import { isEnterpriseDeployment } from "@/hooks/useEnterpriseExperience";
import { ENTERPRISE_TENANTS } from "@/lib/enterpriseTenants";
import { setStoredAuthDesignChoice } from "@/lib/authDesigns";
import { useOAuthReturnHandoff } from "@/lib/useOAuthReturnHandoff";

// Rate limiter hook — shared by every submit path (password, OAuth, reset).
const useRateLimiter = (maxAttempts = 5, windowMs = 60000) => {
  const attemptsRef = useRef<number[]>([]);

  const checkLimit = useCallback(() => {
    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter((t) => now - t < windowMs);
    if (attemptsRef.current.length >= maxAttempts) {
      const oldest = attemptsRef.current[0];
      const waitSec = Math.ceil((windowMs - (now - oldest)) / 1000);
      return { allowed: false, waitSec };
    }
    attemptsRef.current.push(now);
    return { allowed: true, waitSec: 0 };
  }, [maxAttempts, windowMs]);

  return { checkLimit };
};

// Password strength calculator
const getPasswordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-destructive", textColor: "text-destructive", pct: 25 };
  if (score <= 3) return { label: "Fair", color: "bg-amber-500", textColor: "text-amber-400", pct: 50 };
  if (score <= 4) return { label: "Good", color: "bg-cyan-500", textColor: "text-cyan-400", pct: 75 };
  return { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-400", pct: 100 };
};

const passwordRules = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getChatbotPath(searchParams: URLSearchParams): string {
  const prompt = searchParams.get("q")?.trim();
  return prompt ? `/chatbot?q=${encodeURIComponent(prompt)}` : "/chatbot";
}

/** Card mode: sign in / create account / dedicated password-reset view. */
type AuthMode = "login" | "signup" | "reset";

const GoogleMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const AppleMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<"google" | "apple" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authFlowNotice, setAuthFlowNotice] = useState("");

  const enterpriseFlow = isEnterpriseDeployment() || searchParams.get("enterprise") === "1";
  const enterpriseTenant = ENTERPRISE_TENANTS[0];

  const { checkLimit } = useRateLimiter(5, 60000);
  const strength = getPasswordStrength(password);

  // OAuth redirect return handoff — while auth is restoring, show the
  // "completing" state; when it finishes, either navigate to the intended
  // destination or surface a meaningful failure (see useOAuthReturnHandoff).
  const { completing: oauthCompleting } = useOAuthReturnHandoff({
    authenticated: !!user,
    authLoading,
    fallbackDestination: getChatbotPath(searchParams),
    toast,
  });

  useEffect(() => {
    setStoredAuthDesignChoice("sovereign-split");
  }, []);

  useEffect(() => {
    const flow = searchParams.get("flow");
    if (flow === "reset-complete") {
      setAuthFlowNotice("Password updated. You can now sign in with your new password.");
    } else if (flow === "verify-complete") {
      setAuthFlowNotice("Your verification link was processed. Email verification is optional for using ShadowTalk.");
      void backend.auth.reloadUser();
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !oauthCompleting) {
      // Hard redirect to the workspace — every sign-in path (password,
      // Google, Apple, fresh visit while signed in) lands on /chatbot.
      // A full page reload guarantees AuthProvider re-initializes from
      // Firebase persistence with the new session; client-side navigate()
      // races with onAuthStateChanged and can bounce back to /auth.
      window.location.assign(getChatbotPath(searchParams));
    }
  }, [user, oauthCompleting, searchParams]);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      toast({
        title: "OAuth failed",
        description: "Sign-in was canceled or could not be completed. Please try again.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const storageKey = "shadowtalk.firebase-auth-redirect-error";
    const showError = (message: string) => {
      toast({
        title: "Authentication Failed",
        description: message,
        variant: "destructive",
      });
    };

    try {
      const storedError = sessionStorage.getItem(storageKey);
      if (storedError) {
        sessionStorage.removeItem(storageKey);
        showError(storedError);
      }
    } catch {
      // Redirect errors are also delivered through the window event below.
    }

    const onRedirectError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (typeof message === "string" && message) showError(message);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore storage cleanup failure after displaying the error.
      }
    };
    window.addEventListener("shadowtalk:firebase-auth-redirect-error", onRedirectError);
    return () => window.removeEventListener("shadowtalk:firebase-auth-redirect-error", onRedirectError);
  }, [toast]);

  const sanitizeInput = (input: string) => input.trim().slice(0, 255);

  const playWelcomeVoice = useCallback(async (userName: string) => {
    const displayName = userName.split("@")[0];
    const welcomeMessages = [
      `Welcome back, ${displayName}. Your secure workspace is ready.`,
      `Hello ${displayName}. All systems encrypted and operational.`,
      `${displayName}, welcome to ShadowTalk. Your sovereign fortress awaits.`,
    ];
    const msg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

    try {
      const { speakWithElevenLabs } = await import("@/lib/elevenlabsTts");
      await speakWithElevenLabs(msg, { voiceId: "onwK4e9ZLuTAKqWW03F9" });
    } catch (err) {
      console.warn("Voice welcome skipped:", err);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateLimitMsg("");

    const cleanEmail = sanitizeInput(email);
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    if (mode === "signup" && cleanPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (mode === "signup" && strength.pct < 50) {
      toast({
        title: "Weak Password",
        description: "Please use a stronger password with mixed characters",
        variant: "destructive",
      });
      return;
    }

    const limit = checkLimit();
    if (!limit.allowed) {
      setRateLimitMsg(`Too many attempts. Try again in ${limit.waitSec}s`);
      toast({
        title: "Rate Limited",
        description: `Too many attempts. Wait ${limit.waitSec} seconds.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await backend.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) throw error;
        clearExplicitSignOut();
        toast({ title: "Welcome back!", description: "Logged in securely to ShadowTalk AI." });
        setLoading(false);
        // Hard redirect (full page reload) — guarantees AuthProvider
        // re-initializes from Firebase persistence with the new session.
        window.location.assign(getChatbotPath(searchParams));
        return;
      } else {
        const { data, error } = await backend.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: { emailRedirectTo: `${window.location.origin}/auth?flow=verify-complete` },
        });
        if (error) throw error;
        clearExplicitSignOut();
        toast({
          title: "Account Created!",
          description: data.verificationEmailSent
            ? "Check your email for an optional verification link. You can keep using ShadowTalk while verification is pending."
            : "Your account is ready. We could not send a verification email; you can request one from the notice in your workspace.",
        });
        setLoading(false);
        // Hard redirect — same reason as login (see comment above)
        window.location.assign(getChatbotPath(searchParams));
        return;
      }
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error?.message || "Invalid credentials or network issue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /** Dedicated password-reset mode — sends the Firebase reset email. */
  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = sanitizeInput(email);
    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast({
        title: "Email required",
        description: "Enter the email address you signed up with to receive a reset link.",
        variant: "destructive",
      });
      return;
    }
    const limit = checkLimit();
    if (!limit.allowed) {
      setRateLimitMsg(`Too many attempts. Try again in ${limit.waitSec}s`);
      return;
    }
    setResettingPassword(true);
    try {
      const { error } = await backend.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth?flow=reset-complete`,
      });
      if (error) throw error;
      // Deliberately shown even for unknown addresses — the adapter swallows
      // auth/user-not-found so we never leak which emails have accounts.
      setResetSent(true);
    } catch {
      toast({
        title: "Could not send reset link",
        description: "Check your connection and try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleFirebaseOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    setOauthProvider(provider);
    try {
      const { data, error } = await backend.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${getChatbotPath(searchParams)}`,
        },
      });
      if (error) throw error;
      if (data?.user) {
        clearExplicitSignOut();
        toast({ title: "Success", description: `Signed in with ${provider === "google" ? "Google" : "Apple"}.` });
        void playWelcomeVoice(data.user.email || "User");
        // Hard redirect — same reliability guarantee as the password path.
        window.location.assign(getChatbotPath(searchParams));
        return;
      }
      // No user returned → the adapter fell back to signInWithRedirect
      // (popup blocked). The browser is on its way to the provider; the
      // session handoff happens on return via useOAuthReturnHandoff.
    } catch (err: any) {
      const code: string = err?.code || "";
      // auth/operation-not-allowed → the provider is not enabled yet in the
      // Firebase console (Authentication → Sign-in method). Give the user a
      // clear, actionable message instead of a raw SDK string.
      if (code === "auth/operation-not-allowed") {
        toast({
          title: provider === "google" ? "Google sign-in is warming up" : "Apple sign-in is warming up",
          description: "This provider is being activated for ShadowTalk. Please use email sign-in for the moment.",
          variant: "destructive",
        });
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // User closed the window — not an error worth a red toast.
      } else {
        toast({
          title: "Authentication Failed",
          description: err?.message || "Sign-in was canceled or failed. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setOauthProvider(null);
    }
  };

  const headingTitle = () => {
    if (mode === "reset") return "Reset your password";
    if (enterpriseFlow) return enterpriseTenant.welcomeTitle;
    return mode === "login" ? "Welcome back" : "Create your account";
  };

  const headingSub = () => {
    if (mode === "reset")
      return "Enter your email and we'll send you a secure link to choose a new password.";
    if (enterpriseFlow) return enterpriseTenant.signInHint;
    return mode === "login"
      ? "Sign in to your encrypted ShadowTalk workspace."
      : "One account. Every model. Nothing leaves your device.";
  };

  // OAuth redirect in flight: auth is still restoring the Google session.
  // Show an explicit completing screen — never flash the login form here,
  // because that is exactly what reads to the user as "sign-in dropped me
  // back on /auth".
  if (oauthCompleting && authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#05070d] text-slate-100 flex flex-col items-center justify-center gap-4 font-sans">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-cyan-400/30 border-t-cyan-400" />
        <p className="text-sm text-slate-300">Completing sign-in…</p>
        <p className="text-xs text-slate-500">Restoring your session securely.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#05070d] text-slate-100 flex flex-col relative overflow-x-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient background — aurora glows + fine grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-cyan-500/[0.09] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[520px] h-[520px] bg-indigo-600/[0.08] rounded-full blur-[150px]" />
        <div className="absolute -bottom-48 -right-32 w-[560px] h-[560px] bg-purple-600/[0.08] rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:26px_26px] opacity-30" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 pt-6">
        <Link to="/" className="inline-flex items-center gap-2.5 select-none group">
          <div className="h-9 w-9 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <ChatbotLogo size={20} />
          </div>
          <div className="leading-tight">
            <span className="text-sm font-bold tracking-widest text-white uppercase font-sans">
              ShadowTalk
            </span>
            <span className="hidden sm:block text-[9px] font-mono text-cyan-400 font-semibold tracking-wider uppercase">
              Sovereign AI Engine
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-white/10 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>
        </div>
      </div>

      {/* Center stage */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-[440px] rounded-3xl border border-white/15 bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* Specular top highlight */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          <AnimatePresence mode="wait" initial={false}>
            {mode === "reset" ? (
              /* ================================================== */
              /* PASSWORD RESET VIEW                                 */
              /* ================================================== */
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setResetSent(false);
                    setRateLimitMsg("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer mb-5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>

                {resetSent ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 mb-4">
                      <MailCheck className="h-7 w-7 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Check your inbox</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      If an account can be recovered with{" "}
                      <span className="text-slate-200 font-medium">{sanitizeInput(email)}</span>, a
                      password reset link is on its way. The link expires shortly for your security.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setResetSent(false);
                        setMode("login");
                      }}
                      className="mt-6 w-full h-11 rounded-xl bg-slate-950/70 border border-white/15 hover:border-white/30 text-sm font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Return to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-semibold mb-4">
                      <KeyRound className="h-3 w-3" />
                      <span>Account recovery</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Reset your password</h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                      Enter your email and we'll send you a secure link to choose a new password.
                    </p>
                    <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="reset-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 pl-10 bg-slate-950/60 border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder:text-slate-500 rounded-xl"
                            maxLength={255}
                            autoComplete="email"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={resettingPassword}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {resettingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sending reset link…</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Send reset link</span>
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </motion.div>
            ) : (
              /* ================================================== */
              /* SIGN IN / CREATE ACCOUNT VIEW                       */
              /* ================================================== */
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "login" ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 24 : -24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* Segmented Pill Tab Switcher */}
                <div className="p-1 rounded-2xl bg-slate-950/80 border border-white/10 grid grid-cols-2 gap-1 mb-6 relative">
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m);
                        setRateLimitMsg("");
                      }}
                      className={`relative py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center select-none ${
                        mode === m ? "text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mode === m && (
                        <motion.div
                          layoutId="auth-tab-pill"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-purple-500/25 to-pink-500/20 border border-white/20 shadow-sm"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{m === "login" ? "Sign In" : "Create Account"}</span>
                    </button>
                  ))}
                </div>

                {/* Heading */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{headingTitle()}</h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">{headingSub()}</p>
                  {authFlowNotice && (
                    <p className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100" role="status" aria-live="polite">
                      {authFlowNotice}
                    </p>
                  )}
                </div>

                {/* One-tap OAuth — Continue with Google / Apple */}
                <div className="space-y-2.5">
                  <motion.button
                    type="button"
                    disabled={loading || !!oauthProvider}
                    onClick={() => handleFirebaseOAuth("google")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative w-full h-12 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-50 border border-white/20 text-sm font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer overflow-hidden disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {oauthProvider === "google" && loading ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-700" />
                    ) : (
                      <GoogleMark className="h-5 w-5 shrink-0" />
                    )}
                    <span>{oauthProvider === "google" && loading ? "Connecting…" : "Continue with Google"}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    disabled={loading || !!oauthProvider}
                    onClick={() => handleFirebaseOAuth("apple")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative w-full h-12 px-4 rounded-xl bg-black text-white hover:bg-slate-950 border border-white/25 hover:border-white/40 text-sm font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer overflow-hidden disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {oauthProvider === "apple" && loading ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
                    ) : (
                      <AppleMark className="h-5 w-5 shrink-0" />
                    )}
                    <span>{oauthProvider === "apple" && loading ? "Connecting…" : "Continue with Apple"}</span>
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5 text-center">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-widest font-mono shrink-0">
                    or continue with email
                  </span>
                  <div className="flex-1 border-t border-white/10" />
                </div>

                {/* Rate Limit Alert */}
                <AnimatePresence>
                  {rateLimitMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 p-3 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center gap-2 text-xs text-destructive"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{rateLimitMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email / Password form */}
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                      <Input
                        id="auth-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-10 bg-slate-950/60 border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder:text-slate-500 rounded-xl"
                        maxLength={255}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
                        Password
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode("reset");
                            setResetSent(false);
                            setRateLimitMsg("");
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer font-medium"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10 pr-10 bg-slate-950/60 border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder:text-slate-500 rounded-xl"
                        maxLength={128}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength (Sign Up Only) */}
                    {mode === "signup" && password.length > 0 && (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Password strength:</span>
                          <span className={cn("font-semibold", strength.textColor)}>{strength.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-300 rounded-full", strength.color)}
                            style={{ width: `${strength.pct}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                          {passwordRules.map((rule) => {
                            const passed = rule.test(password);
                            return (
                              <div key={rule.label} className="flex items-center gap-1.5">
                                {passed ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-slate-600 shrink-0" />
                                )}
                                <span className={passed ? "text-emerald-400" : "text-slate-500"}>
                                  {rule.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password (Sign Up Only) */}
                  {mode === "signup" && (
                    <div>
                      <label htmlFor="auth-confirm" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                        <Input
                          id="auth-confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={cn(
                            "h-11 pl-10 pr-10 bg-slate-950/60 border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder:text-slate-500 rounded-xl",
                            confirmPassword && confirmPassword !== password && "border-destructive/60"
                          )}
                          maxLength={128}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-[11px] text-destructive mt-1">Passwords do not match</p>
                      )}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 mt-1 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Authenticating…</span>
                      </>
                    ) : mode === "login" ? (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Sign in & enter workspace</span>
                        <ArrowRight className="h-4 w-4 opacity-70" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Create account & launch</span>
                        <ArrowRight className="h-4 w-4 opacity-70" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Security Trust Chips */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Shield className="h-3 w-3" />
              <span>E2E Encrypted</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-cyan-400">
              <Zap className="h-3 w-3" />
              <span>Zero Cloud Logs</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-purple-400">
              <Fingerprint className="h-3 w-3" />
              <span>2FA Ready</span>
            </span>
          </div>
        </motion.div>

        {/* Under-card privacy reassurance */}
        <p className="mt-5 max-w-[440px] text-center text-[11px] text-slate-500 leading-relaxed flex items-start justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-px" />
          <span>
            AI runs on your keys, on your device. Signing in only syncs your workspace —
            conversations are end-to-end encrypted and never readable by us.
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
