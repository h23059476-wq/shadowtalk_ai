/**
 * StatusPage — service catalog with an explicit notice that monitoring is unavailable.
 *
 * Shows operational status of all critical infrastructure:
 *  - OmniRoute Proxy (NON_TECH AI gateway)
 *  - Firebase Auth (user authentication)
 *  - OpenRouter Gateway (BYOK provider)
 *  - Gemini API (BYOK provider)
 *
 * Also shows average response time, uptime percentage, and incident history.
 *
 * Design: dark-mode glassmorphism matching ShadowTalk's aesthetic.
 * Canvas: #030712, Cards: #0f172a, Accent: #6366f1 (indigo).
 */

import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  XCircle,
  Clock,
  Server,
  Zap,
  Shield,
  Globe,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

type ServiceStatus = "operational" | "degraded" | "outage" | "unknown";

interface ServiceHealth {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  latencyMs: number | null;
  uptime: number | null;
  icon: typeof Server;
  category: "ai" | "auth" | "infra";
}

// ── Status helpers ─────────────────────────────────────────────────────

function statusColor(status: ServiceStatus): string {
  switch (status) {
    case "degraded":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "outage":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

function statusIcon(status: ServiceStatus) {
  switch (status) {
    case "degraded":
      return AlertCircle;
    case "outage":
      return XCircle;
    default:
      return Activity;
  }
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case "degraded":
      return "Degraded";
    case "outage":
      return "Outage";
    default:
      return "Unknown";
  }
}

// ── Component ──────────────────────────────────────────────────────────

const StatusPage = () => {
  // ── Service health data ──
  // These are configured components, not live monitoring results.
  const services: ServiceHealth[] = [
    {
      id: "omniroute",
      name: "OmniRoute Proxy",
      description: "Load-balanced AI gateway for Instant Start (NON_TECH) users. Routes across Gemini, Groq, and Mistral with automatic 429 circuit-breaker rotation.",
      status: "unknown",
      latencyMs: null,
      uptime: null,
      icon: Zap,
      category: "ai",
    },
    {
      id: "firebase-auth",
      name: "Firebase Authentication",
      description: "User sign-in, session management, and OAuth (Google/Apple). Powers the /auth flow and persistent sessions.",
      status: "unknown",
      latencyMs: null,
      uptime: null,
      icon: Shield,
      category: "auth",
    },
    {
      id: "openrouter",
      name: "OpenRouter Gateway",
      description: "BYOK provider for Power User (TECH) cohort. Direct provider connection for OpenRouter API keys (sk-or-...).",
      status: "unknown",
      latencyMs: null,
      uptime: null,
      icon: Globe,
      category: "ai",
    },
    {
      id: "gemini",
      name: "Google Gemini API",
      description: "BYOK provider for Gemini API keys (AIza...). Direct provider connection for Google AI Studio models.",
      status: "unknown",
      latencyMs: null,
      uptime: null,
      icon: Globe,
      category: "ai",
    },
    {
      id: "firestore",
      name: "Cloud Firestore",
      description: "Primary database for conversations, messages, user profiles, and business memories. Per-user security rules enforced.",
      status: "unknown",
      latencyMs: null,
      uptime: null,
      icon: Server,
      category: "infra",
    },
    {
      id: "hosting",
      name: "Firebase Hosting",
      description: "Static asset delivery, SPA catch-all routing, and global CDN. Serves the ShadowTalk web app from edge locations worldwide.",
      status: "unknown",
      latencyMs: null,
      uptime: null,
      icon: Globe,
      category: "infra",
    },
  ];

  // Group services by category.
  const categories = [
    { id: "ai" as const, label: "AI Services", icon: Zap },
    { id: "auth" as const, label: "Authentication", icon: Shield },
    { id: "infra" as const, label: "Infrastructure", icon: Server },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      <SEOHead
        meta={{
          title: "System Status — ShadowTalk AI",
          description: "Configured ShadowTalk AI services. Live monitoring and incident reporting are not connected yet.",
          canonical: "https://www.shadowtalk-ai.com/status",
          keywords: ["ShadowTalk status", "AI system health", "OmniRoute uptime", "operational status"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: false,
        }}
      />
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300 text-xs font-semibold mb-4">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Live monitoring unavailable
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            System Status
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Service health, latency, uptime, and incident reporting are not connected to a monitoring source.
          </p>
        </motion.div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Overall Status", value: "Not monitored", icon: Activity, color: statusColor("unknown") },
            { label: "Avg Response Time", value: "Unavailable", icon: Zap, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
            { label: "Avg Uptime (30d)", value: "Unavailable", icon: Activity, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
            { label: "Configured Services", value: `${services.length}`, icon: Server, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * idx }}
            >
              <Card className="bg-[#0f172a] border-white/10">
                <CardContent className="p-4">
                  <div className={cn("inline-flex p-1.5 rounded-lg border mb-2", stat.color)}>
                    <stat.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Service groups ── */}
        <div className="space-y-8">
          {categories.map((category, catIdx) => {
            const categoryServices = services.filter((s) => s.category === category.id);
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + 0.05 * catIdx }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <category.icon className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{category.label}</h2>
                </div>
                <div className="space-y-3">
                  {categoryServices.map((service) => {
                    const StatusIcon = statusIcon(service.status);
                    return (
                      <Card
                        key={service.id}
                        className="bg-[#0f172a] border-white/10 hover:border-white/20 transition-colors"
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                                <service.icon className="h-4 w-4 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-white">{service.name}</h3>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                      statusColor(service.status),
                                    )}
                                  >
                                    <StatusIcon className="h-2.5 w-2.5" />
                                    {statusLabel(service.status)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {service.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                                  {service.latencyMs !== null && (
                                    <span className="flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      {service.latencyMs}ms avg
                                    </span>
                                  )}
                                  {service.uptime !== null && <span>{service.uptime}% uptime</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Incident history ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Incident History</h2>
          </div>
          <Card className="bg-[#0f172a] border-white/10"><CardContent className="p-4 text-sm text-slate-400">Incident reporting is not connected. This page has no verified incident history to display.</CardContent></Card>
        </motion.div>

        {/* ── Footer note ── */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-600">
            For service updates, contact{" "}
            <a href="mailto:shadowtalk@shadowtalk-ai.com" className="text-indigo-400 hover:underline">shadowtalk@shadowtalk-ai.com</a>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StatusPage;
