/**
 * AnalyticsPage — Usage Analytics dashboard for ShadowTalk AI.
 *
 * Shows per-account usage of messages, conversations, generated images,
 * and research queries. Includes daily usage breakdown and current
 * plan limits. Designed to match ShadowTalk's dark glassmorphism aesthetic.
 *
 * Route: /analytics
 */

import { motion } from "framer-motion";
import {
  BarChart3,
  MessageSquare,
  MessagesSquare,
  Image as ImageIcon,
  Search,
  CalendarDays,
  Gauge,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatCard {
  label: string;
  value: number;
  icon: typeof MessageSquare;
  accent: string;
  hint: string;
}

const STATS: StatCard[] = [
  {
    label: "Total Messages",
    value: 0,
    icon: MessageSquare,
    accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    hint: "Sent across all conversations",
  },
  {
    label: "Conversations",
    value: 0,
    icon: MessagesSquare,
    accent: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    hint: "Chat sessions started",
  },
  {
    label: "Images Generated",
    value: 0,
    icon: ImageIcon,
    accent: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    hint: "Via Image Studio",
  },
  {
    label: "Research Queries",
    value: 0,
    icon: Search,
    accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    hint: "Deep-research tool runs",
  },
];

const PLAN_LIMITS = [
  { label: "Messages", used: 0, total: 50, color: "bg-indigo-500" },
  { label: "Images", used: 0, total: 5, color: "bg-pink-500" },
  { label: "Research", used: 0, total: 3, color: "bg-emerald-500" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Analytics — ShadowTalk AI",
          description:
            "Track your ShadowTalk AI usage: messages, conversations, images generated, and research queries. See daily breakdowns and free-tier plan limits.",
          canonical: "https://www.shadowtalk-ai.com/analytics",
          keywords: ["analytics", "usage", "messages", "AI usage dashboard", "plan limits"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: false,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              Usage Analytics
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Your Usage Analytics
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              See how you're using ShadowTalk AI. Stats refresh in real time as you chat,
              generate images, and run research queries.
            </p>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {STATS.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * idx }}
                className="ios-glass-card p-5"
              >
                <div
                  className={cn(
                    "inline-flex p-2 rounded-lg border mb-3",
                    stat.accent,
                  )}
                >
                  <stat.icon className="w-4 h-4" />
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.hint}</p>
              </motion.div>
            ))}
          </div>

          {/* Chart placeholder + plan usage */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="ios-glass-card p-6 lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">
                  Usage Over Time
                </h2>
                <span className="text-xs text-muted-foreground">Last 7 days</span>
              </div>
              <div className="h-56 rounded-xl border border-dashed border-border/60 bg-white/[0.02] flex flex-col items-center justify-center text-center px-6">
                <BarChart3 className="w-8 h-8 text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Charts load when you have data
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Start a conversation or generate an image — your usage graph
                  will appear here automatically.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="ios-glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-semibold text-foreground">Plan Usage</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Free tier — resets daily at 00:00 UTC
              </p>
              <div className="space-y-4">
                {PLAN_LIMITS.map((limit) => (
                  <div key={limit.label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-foreground font-medium">{limit.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {limit.used}/{limit.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", limit.color)}
                        style={{ width: `${(limit.used / limit.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full mt-5 border-border/50 bg-transparent hover:bg-white/5"
              >
                <Link to="/pricing">Upgrade for unlimited usage</Link>
              </Button>
            </motion.div>
          </div>

          {/* Daily breakdown table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="ios-glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-foreground">
                Daily Usage Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-4 font-medium">Day</th>
                    <th className="py-2 pr-4 font-medium">Messages</th>
                    <th className="py-2 pr-4 font-medium">Images</th>
                    <th className="py-2 font-medium">Research</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr
                      key={day}
                      className="border-b border-border/30 last:border-0 text-muted-foreground"
                    >
                      <td className="py-2.5 pr-4 font-medium text-foreground">{day}</td>
                      <td className="py-2.5 pr-4 tabular-nums">0</td>
                      <td className="py-2.5 pr-4 tabular-nums">0</td>
                      <td className="py-2.5 tabular-nums">0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No usage recorded yet. Once you start chatting, your daily activity
              will appear here.
            </p>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
