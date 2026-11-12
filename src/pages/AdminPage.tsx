/**
 * AdminPage — ShadowTalk AI admin dashboard shell.
 *
 * Wraps the AdminDashboard component inside the standard site shell
 * (SEOHead + Navigation + PageTransition + Footer). If the admin
 * dashboard throws or the user lacks admin access, a graceful
 * fallback "Admin access required" card is shown instead.
 *
 * Route: /admin
 */

import { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Users,
  CreditCard,
  MessageSquare,
  DollarSign,
  Megaphone,
  Rocket,
  MessageSquareHeart,
  Activity,
  Lock,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

type AdminStats = {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  activeSubscribers: number;
  proSubscribers: number;
  eliteSubscribers: number;
  totalFeedback: number;
  pendingFeedback: number;
  pendingGrowthActions?: number;
};

type AdminDashboardProps = {
  stats: AdminStats;
  loading: boolean;
  onNavigate: (section: string) => void;
};

const AdminDashboardTyped = AdminDashboard as unknown as ComponentType<AdminDashboardProps>;

// Live Firestore aggregates are not yet wired. Until they are, we display
// honest placeholder values rather than fabricated metrics. The previous
// implementation hardcoded "12,847 users / $48,210 MRR" — those numbers
// were never real and have been removed.
const STATS = [
  { label: "Total Users", value: "—", icon: Users, accent: "text-indigo-400 bg-indigo-500/10" },
  { label: "Active Subscriptions", value: "N/A", icon: CreditCard, accent: "text-emerald-400 bg-emerald-500/10" },
  { label: "Daily Messages", value: "—", icon: MessageSquare, accent: "text-purple-400 bg-purple-500/10" },
  { label: "Revenue (MRR)", value: "Free", icon: DollarSign, accent: "text-amber-400 bg-amber-500/10" },
];

const QUICK_ACTIONS = [
  { label: "View Users", icon: Users, section: "users" },
  { label: "Broadcast Message", icon: Megaphone, section: "broadcast" },
  { label: "Ship Release", icon: Rocket, section: "release" },
  { label: "Review Feedback", icon: MessageSquareHeart, section: "feedback" },
];

// Recent activity feed is intentionally empty until real activity events
// are streamed from Firestore. Previously this array contained fabricated
// entries ("Pro subscriber upgraded to Elite tier", "Manual payment
// recorded — $99 Pro plan") that did not correspond to any real event.
const RECENT_ACTIVITY: { time: string; text: string }[] = [];

const AccessDeniedFallback = () => (
  <div className="ios-glass-card p-8 sm:p-10 text-center max-w-xl mx-auto">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
      <Lock className="h-7 w-7 text-amber-400" />
    </div>
    <h2 className="text-xl font-semibold">Admin access required</h2>
    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
      You need a verified admin session to view the live dashboard. Sign in with an
      admin-enabled account, or contact{" "}
      <a href="mailto:shadowtalk@shadowtalk-ai.com" className="text-indigo-400 hover:underline">
        shadowtalk@shadowtalk-ai.com
      </a>{" "}
      to request access.
    </p>
    <Button className="mt-6" onClick={() => (window.location.href = "/auth")}>
      Sign in
    </Button>
  </div>
);

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminCheck();
  const navigate = useNavigate();
  const accessGranted = Boolean(user && isAdmin);
  const accessLoading = authLoading || roleLoading;

  const handleNavigate = (section: string) => {
    // In production this would route to the admin subpage (e.g. /admin/users).
    // For now we keep the user on /admin and surface the action via state.
    if (section === "intelligence") { navigate("/admin/intelligence"); return; }
    void section;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Admin Dashboard — ShadowTalk AI",
          description:
            "Internal admin dashboard for ShadowTalk AI. Manage users, subscriptions, broadcasts, releases, and product feedback.",
          canonical: "https://www.shadowtalk-ai.com/admin",
          keywords: ["ShadowTalk admin", "admin dashboard", "internal tools"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: true,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <ShieldAlert className="h-3 w-3" />
              Restricted · Internal Only
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Operational overview for the ShadowTalk AI team. Live Firestore aggregates
              are not yet wired — all metrics below show zero or "—" until backend
              wiring is added.
            </p>
          </motion.div>

          {accessLoading ? (
            <p className="rounded-xl border border-border/50 bg-card/60 p-6 text-sm text-muted-foreground" role="status" aria-live="polite">Checking admin access…</p>
          ) : !accessGranted ? (
            <AccessDeniedFallback />
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {STATS.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.04 * i }}
                    className="ios-glass-card p-5"
                  >
                    <div className={`inline-flex p-1.5 rounded-lg border border-border/50 mb-3 ${stat.accent}`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="ios-glass-card p-6 mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.section}
                      onClick={() => handleNavigate(action.section)}
                      className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/40 transition text-left"
                    >
                      <action.icon className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AdminDashboard component — wrapped in ErrorBoundary so any
                  runtime throw degrades to the "Admin access required" card. */}
              <ErrorBoundary fallback={<AccessDeniedFallback />}>
                <div className="ios-glass-card p-6 mb-8">
                  <AdminDashboardTyped
                    stats={{
                      totalUsers: 0,
                      totalConversations: 0,
                      totalMessages: 0,
                      activeSubscribers: 0,
                      proSubscribers: 0,
                      eliteSubscribers: 0,
                      totalFeedback: 0,
                      pendingFeedback: 0,
                      pendingGrowthActions: 0,
                    }}
                    loading={false}
                    onNavigate={handleNavigate}
                  />
                </div>
              </ErrorBoundary>

              {/* Recent activity feed */}
              <div className="ios-glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Activity
                  </h2>
                </div>
                {RECENT_ACTIVITY.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No live activity yet. Activity events will appear here once
                    backend streaming is wired.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {RECENT_ACTIVITY.map((entry, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-16">
                          {entry.time}
                        </span>
                        <span className="flex-1 text-slate-200">{entry.text}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
