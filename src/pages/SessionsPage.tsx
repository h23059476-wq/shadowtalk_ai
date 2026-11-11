/**
 * SessionsPage — Active session manager for ShadowTalk AI.
 *
 * Shows the current device session (with an "Active" badge), a list of
 * other active sessions (empty state by default), a "sign out all other
 * sessions" button, and a security tips card.
 *
 * Route: /sessions
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ShieldCheck,
  LogOut,
  Clock,
  MapPin,
  KeySquare,
  Fingerprint,
  RefreshCw,
  Lock,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

interface SessionInfo {
  id: string;
  device: "desktop" | "mobile" | "tablet" | "web";
  browser: string;
  location: string;
  lastActive: string;
  current?: boolean;
}

const CURRENT_SESSION: SessionInfo = {
  id: "this",
  device: "desktop",
  browser: "Chrome 128 · macOS",
  location: "Karachi, PK",
  lastActive: "Now",
  current: true,
};

const OTHER_SESSIONS: SessionInfo[] = [];

const SECURITY_TIPS = [
  {
    icon: KeySquare,
    title: "Use a strong, unique password",
    body: "Pair it with a password manager. Reused passwords are the #1 cause of account takeovers.",
  },
  {
    icon: Fingerprint,
    title: "Enable two-factor authentication",
    body: "TOTP or hardware keys. SMS 2FA is better than nothing but is interceptable via SIM-swap.",
  },
  {
    icon: RefreshCw,
    title: "Rotate your session periodically",
    body: "Sign out of stale devices every 30 days. ShadowTalk never stores plaintext session tokens.",
  },
  {
    icon: Lock,
    title: "Review connected apps",
    body: "Revoke OAuth grants you no longer use from Settings → Linked Accounts.",
  },
];

function DeviceIcon({ device }: { device: SessionInfo["device"] }) {
  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : device === "web" ? Globe : Monitor;
  return <Icon className="h-4 w-4 text-indigo-400" />;
}

export default function SessionsPage() {
  const [signingOut, setSigningOut] = useState(false);
  const [otherSessions, setOtherSessions] = useState<SessionInfo[]>(OTHER_SESSIONS);

  const signOutAllOthers = () => {
    setSigningOut(true);
    // In production this hits /api/sessions/revoke-others.
    setTimeout(() => {
      setOtherSessions([]);
      setSigningOut(false);
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Active Sessions — ShadowTalk AI",
          description:
            "Manage your ShadowTalk AI active sessions. View the current device, sign out of other sessions, and review security best practices.",
          canonical: "https://www.shadowtalk-ai.com/sessions",
          keywords: ["active sessions", "device management", "session security", "sign out devices"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: true,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-10"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Manage Your Active Sessions
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              See every device currently signed into your ShadowTalk account. Sign out remotely,
              review recent activity, and lock things down if anything looks off.
            </p>
          </motion.div>

          {/* Current session */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="ios-glass-card p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Current Session
              </h2>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-white/5 border border-border/50 shrink-0">
                  <DeviceIcon device={CURRENT_SESSION.device} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">This device</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{CURRENT_SESSION.browser}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground/80">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {CURRENT_SESSION.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {CURRENT_SESSION.lastActive}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Other sessions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="ios-glass-card p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Other Active Sessions
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground">{otherSessions.length} device(s)</span>
            </div>

            {otherSessions.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] border border-border/50 mb-3">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No other active sessions</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  You're only signed in on this device. Nice work.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {otherSessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-border/50 bg-white/[0.02] p-4 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-white/5 border border-border/50 shrink-0">
                      <DeviceIcon device={s.device} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{s.browser}</h3>
                      <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground/80">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {s.lastActive}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="outline"
              disabled={otherSessions.length === 0 || signingOut}
              onClick={signOutAllOthers}
              className="w-full mt-5 gap-2 border-border/50 bg-transparent hover:bg-white/5 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out all other sessions"}
            </Button>
          </motion.div>

          {/* Security tips */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="ios-glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Security Tips
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SECURITY_TIPS.map((tip) => (
                <div
                  key={tip.title}
                  className="rounded-xl border border-border/50 bg-white/[0.02] p-4"
                >
                  <tip.icon className="h-4 w-4 text-indigo-400 mb-2" />
                  <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{tip.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
