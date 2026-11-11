/**
 * ReferralPage — ShadowTalk AI referral program landing + dashboard.
 *
 * Hero, "how it works" steps, referral link card with copy button,
 * commission tiers, and a stats summary.
 *
 * Route: /referral
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Gift,
  Link2,
  UserPlus,
  Wallet,
  Copy,
  Check,
  Share2,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

const REFERRAL_LINK = "https://www.shadowtalk-ai.com/?ref=ST-DEMO-2026";

const HOW_IT_WORKS = [
  {
    icon: Share2,
    title: "Share your link",
    body: "Post your unique referral link anywhere — DMs, social, blog, podcast show notes.",
  },
  {
    icon: UserPlus,
    title: "Friend signs up",
    body: "When someone signs up via your link and becomes a paid subscriber, they're tracked to you.",
  },
  {
    icon: Wallet,
    title: "You earn monthly",
    body: "Recurring commission hits your balance every month for as long as they stay subscribed.",
  },
];

const TIERS = [
  { name: "Bronze", rate: 20, threshold: "0 referrals", color: "from-amber-700 to-amber-600" },
  { name: "Silver", rate: 25, threshold: "5 referrals", color: "from-slate-400 to-slate-300" },
  { name: "Gold", rate: 30, threshold: "20 referrals", color: "from-yellow-500 to-amber-400" },
  { name: "Platinum", rate: 35, threshold: "50 referrals", color: "from-cyan-300 to-sky-400" },
  { name: "Diamond", rate: 40, threshold: "100 referrals", color: "from-indigo-400 to-purple-400" },
];

const STATS = [
  { label: "Total Referrals", value: "0", icon: Users, accent: "text-indigo-400 bg-indigo-500/10" },
  { label: "Active Referrals", value: "0", icon: TrendingUp, accent: "text-emerald-400 bg-emerald-500/10" },
  { label: "Monthly Earnings", value: "$0", icon: Wallet, accent: "text-amber-400 bg-amber-500/10" },
];

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked — fail silently.
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Referral Program — ShadowTalk AI",
          description:
            "Earn 20-40% recurring commission on every ShadowTalk AI subscriber you refer. Bronze to Diamond tiers. Share your link and earn monthly.",
          canonical: "https://www.shadowtalk-ai.com/referral",
          keywords: ["referral program", "recurring commission", "affiliate", "ShadowTalk referral"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: false,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <Gift className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Earn 20-40% Recurring Commission
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
              Refer creators, founders, and developers to ShadowTalk AI. You earn a slice of every
              monthly payment — for as long as they stay subscribed. No cap, no expiry.
            </p>
          </motion.div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 * i }}
                className="ios-glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex p-1.5 rounded-lg bg-white/5 border border-border/50">
                    <step.icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{step.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Referral link card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="ios-glass-card p-6 mb-12"
          >
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your Referral Link
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                readOnly
                value={REFERRAL_LINK}
                className="flex-1 rounded-xl bg-white/[0.03] border border-border/50 px-4 py-2.5 text-sm text-foreground font-mono"
                onFocus={(e) => e.target.select()}
              />
              <Button onClick={copyLink} className="gap-2 shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              Tip: append <code className="text-indigo-300">?ref=ST-DEMO-2026</code> to any
              shadowtalk-ai.com URL. Conversions are tracked for 60 days.
            </p>
          </motion.div>

          {/* Commission tiers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="ios-glass-card p-6 mb-12"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Commission Tiers
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-xl border border-border/50 bg-white/[0.02] p-4 text-center"
                >
                  <div
                    className={`mx-auto w-10 h-10 rounded-full bg-gradient-to-br ${tier.color} mb-3 flex items-center justify-center`}
                  >
                    <span className="text-[10px] font-bold text-white/90">{tier.rate}%</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">{tier.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{tier.threshold}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="ios-glass-card p-6 mb-8"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Your Stats
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/50 bg-white/[0.02] p-5"
                >
                  <div className={`inline-flex p-1.5 rounded-lg border border-border/50 mb-3 ${stat.accent}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6 gap-2" onClick={copyLink}>
              <Share2 className="h-4 w-4" />
              Start sharing
            </Button>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
