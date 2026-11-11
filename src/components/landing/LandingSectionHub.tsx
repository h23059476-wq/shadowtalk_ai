import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Users,
  CreditCard,
  Mail,
  ArrowRight,
  Bot,
  Brain,
  Sparkles,
  Shield,
  User,
  Activity,
  MessageSquare,
  HelpCircle,
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { FOUNDER_CANONICAL } from "@/lib/founderIdentity";
import { COFOUNDER_CANONICAL } from "@/lib/cofounderIdentity";

export type SectionHubTab = "services" | "founders" | "pricing" | "contact";

interface LandingSectionHubProps {
  activeTab?: SectionHubTab;
  onTabChange?: (tab: SectionHubTab) => void;
  viewMode?: "tabbed" | "all";
  onViewModeChange?: (mode: "tabbed" | "all") => void;
  showPreviewPanels?: boolean;
}

export const LandingSectionHub = ({
  activeTab: controlledTab,
  onTabChange,
  viewMode = "tabbed",
  onViewModeChange,
  showPreviewPanels = false,
}: LandingSectionHubProps) => {
  const [internalTab, setInternalTab] = useState<SectionHubTab>("services");
  const [copiedEmail, setCopiedEmail] = useState(false);

  const activeTab = controlledTab ?? internalTab;

  const handleTabSelect = (tab: SectionHubTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText("shadowtalk@shadowtalk-ai.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="sections-hub"
      className="relative py-8 sm:py-12 px-4 sm:px-6 bg-slate-950/70 border-y border-white/10 overflow-hidden"
      aria-labelledby="section-hub-title"
    >
      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Hub Header */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Section Hub</span>
          </div>
          <h2
            id="section-hub-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2"
          >
            Explore by <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">Options & Sections</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            No endless scrolling needed. Select any option below or jump directly to what you are looking for.
          </p>
        </div>

        {/* 4 Interactive Category Pills / Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {/* Tab 1: Services */}
          <button
            type="button"
            onClick={() => handleTabSelect("services")}
            className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeTab === "services"
                ? "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_24px_rgba(6,182,212,0.25)]"
                : "bg-slate-900/40 border-white/10 hover:border-cyan-500/30 hover:bg-slate-900/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-2 rounded-xl ${
                  activeTab === "services"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-800 text-slate-400 group-hover:text-cyan-400"
                }`}
              >
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">01</span>
            </div>
            <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
              Services
            </p>
            <p className="text-[11px] text-slate-400 truncate">AI Tools, Chat & Studio</p>
          </button>

          {/* Tab 2: About & Founders */}
          <button
            type="button"
            onClick={() => handleTabSelect("founders")}
            className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeTab === "founders"
                ? "bg-purple-950/40 border-purple-500/50 shadow-[0_0_24px_rgba(168,85,247,0.25)]"
                : "bg-slate-900/40 border-white/10 hover:border-purple-500/30 hover:bg-slate-900/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-2 rounded-xl ${
                  activeTab === "founders"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-slate-800 text-slate-400 group-hover:text-purple-400"
                }`}
              >
                <Users className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-mono text-purple-400 font-bold">02</span>
            </div>
            <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
              About / Founders
            </p>
            <p className="text-[11px] text-slate-400 truncate">Zain Ahmed & Fatima</p>
          </button>

          {/* Tab 3: Pricing */}
          <button
            type="button"
            onClick={() => handleTabSelect("pricing")}
            className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeTab === "pricing"
                ? "bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                : "bg-slate-900/40 border-white/10 hover:border-emerald-500/30 hover:bg-slate-900/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-2 rounded-xl ${
                  activeTab === "pricing"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 group-hover:text-emerald-400"
                }`}
              >
                <CreditCard className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">03</span>
            </div>
            <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
              Pricing
            </p>
            <p className="text-[11px] text-slate-400 truncate">Plans & Founder Tier</p>
          </button>

          {/* Tab 4: Contact */}
          <button
            type="button"
            onClick={() => handleTabSelect("contact")}
            className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeTab === "contact"
                ? "bg-pink-950/40 border-pink-500/50 shadow-[0_0_24px_rgba(236,72,153,0.25)]"
                : "bg-slate-900/40 border-white/10 hover:border-pink-500/30 hover:bg-slate-900/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-2 rounded-xl ${
                  activeTab === "contact"
                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/40"
                    : "bg-slate-800 text-slate-400 group-hover:text-pink-400"
                }`}
              >
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-mono text-pink-400 font-bold">04</span>
            </div>
            <p className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
              Contact Details
            </p>
            <p className="text-[11px] text-slate-400 truncate">Email, Desk & Support</p>
          </button>
        </div>

        {/* Controls Bar: Compact Tabbed View vs All Sections */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">
              {viewMode === "tabbed"
                ? `Active Focus: ${
                    activeTab === "services"
                      ? "01 Services & AI Tools"
                      : activeTab === "founders"
                      ? "02 Founders (Zain Ahmed & Fatima)"
                      : activeTab === "pricing"
                      ? "03 Membership Plans & Pricing"
                      : "04 Contact Details & Support"
                  }`
                : "Showing All 4 Modular Sections"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/80 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => onViewModeChange?.("tabbed")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer font-medium ${
                viewMode === "tabbed"
                  ? "bg-cyan-500 text-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Compact Tabbed (Fast)
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange?.("all")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer font-medium ${
                viewMode === "all"
                  ? "bg-purple-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              View All
            </button>
          </div>
        </div>

        {/* Tab Content Panels (Rendered when showPreviewPanels is enabled) */}
        {showPreviewPanels && (
          <div className="rounded-3xl border border-white/15 bg-slate-900/70 backdrop-blur-2xl p-5 sm:p-8 shadow-2xl relative">
            <AnimatePresence mode="wait">
            {/* PANEL 1: SERVICES */}
            {activeTab === "services" && (
              <motion.div
                key="services"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-cyan-400" />
                      Core Services & Autonomous Capabilities
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Sovereign AI workflows that execute and finish tasks instead of merely giving generic answers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToAnchor("services")}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/50 px-3 py-1.5 rounded-lg border border-cyan-500/30"
                    >
                      <span>Jump to Details</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Link
                    to="/chatbot"
                    className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/40 transition-all group flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Bot className="h-5 w-5 text-cyan-400" />
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-cyan-300">
                        AI Chatbot
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        Multi-model sovereign chat with built-in agentic tools.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400">Launch Tool →</span>
                  </Link>

                  <Link
                    to="/workspace"
                    className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-purple-500/40 transition-all group flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-purple-300">
                        Agentic Workspace
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        Multi-step agents chaining reasoning, tools & browser actions.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-purple-400">Launch Tool →</span>
                  </Link>

                  <Link
                    to="/deep-research"
                    className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-blue-500/40 transition-all group flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Brain className="h-5 w-5 text-blue-400" />
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-300">
                        Deep Research
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        Multi-tier web extraction, citations, and executive reports.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-blue-400">Launch Tool →</span>
                  </Link>

                  <Link
                    to="/private-ai"
                    className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 transition-all group flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Shield className="h-5 w-5 text-emerald-400" />
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-emerald-300">
                        Private AI & Vault
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        Zero-telemetry local models and AES-256 encrypted memory.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">Launch Tool →</span>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* PANEL 2: ABOUT US / FOUNDERS */}
            {activeTab === "founders" && (
              <motion.div
                key="founders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-400" />
                      Engineering Leadership & Co-Founders
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400">
                      ShadowTalk AI was founded and engineered in Karachi, Pakistan by two dedicated builders.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToAnchor("founders")}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-950/50 px-3 py-1.5 rounded-lg border border-purple-500/30"
                    >
                      <span>Jump to Spotlight</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Zain Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold">
                          Founder & Lead Architect
                        </span>
                        <span className="text-xs text-slate-400">Karachi, Pakistan</span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">
                        {FOUNDER_CANONICAL.fullName}
                      </h4>
                      <p className="text-xs text-slate-400 mb-3">
                        Also known as {FOUNDER_CANONICAL.shortName} · Founded ShadowTalk in Feb 2024
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Architect of autonomous agentic loops, sovereign runtime pipelines, and 30+ connected tools.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                      <Link
                        to="/founder"
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <span>Founder Profile</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Fatima Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/30 text-[11px] font-semibold">
                          Co-Founder & Lead Systems Architect
                        </span>
                        <span className="text-xs text-slate-400">Karachi, Pakistan</span>
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="h-7 w-7 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-center font-mono font-bold text-xs text-purple-300">
                          FT
                        </div>
                        <h4 className="text-base font-bold text-white">
                          {COFOUNDER_CANONICAL.fullName}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">
                        Second Developer of ShadowTalk AI · Core Systems & UI State
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Architect of the high-performance client-side state machine, encrypted memory ledger, and zero-leak privacy controls.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                      <Link
                        to="/fatima"
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <span>Co-Founder Profile</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    to="/about"
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
                  >
                    <span>Read the full ShadowTalk company vision and history</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* PANEL 3: PRICING */}
            {activeTab === "pricing" && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-400" />
                      Transparent, Developer-Friendly Pricing
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Free to start without credit card. Upgrade when you need sovereign enterprise limits.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToAnchor("pricing")}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-500/30"
                    >
                      <span>Jump to Tier Matrix</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-mono text-slate-400">Free Tier</span>
                      <p className="text-2xl font-bold text-white mt-1">$0</p>
                      <p className="text-xs text-slate-400 mt-2">
                        Core AI chat, deep research, code IDE — free forever without card.
                      </p>
                    </div>
                    <Link
                      to="/chatbot"
                      className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold text-center block transition-colors"
                    >
                      Start Free
                    </Link>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col justify-between relative overflow-hidden">
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      POPULAR
                    </span>
                    <div>
                      <span className="text-xs font-mono text-emerald-400">Pro</span>
                      <p className="text-2xl font-bold text-white mt-1">
                        $5<span className="text-xs text-slate-400 font-normal">/mo</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Unlimited reasoning, high-depth research, multi-agent workspaces, WebGPU priority.
                      </p>
                    </div>
                    <Link
                      to="/pricing"
                      className="mt-4 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold text-center block transition-colors"
                    >
                      View Pro Details
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PANEL 4: CONTACT DETAILS */}
            {activeTab === "contact" && (
              <motion.div
                key="contact"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <Mail className="h-5 w-5 text-pink-400" />
                      Direct Contact Details & Support Channels
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Reach the founding team directly without routing through outsourced support queues.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToAnchor("contact")}
                      className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1 bg-pink-950/50 px-3 py-1.5 rounded-lg border border-pink-500/30"
                    >
                      <span>Jump to Contact Card</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Box */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-pink-500/30 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-mono text-pink-400 uppercase tracking-wider block mb-1">
                        Official Business Inbox
                      </span>
                      <p className="text-lg font-mono text-white font-semibold break-all mb-2">
                        shadowtalk@shadowtalk-ai.com
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        For enterprise inquiries, partnerships, security reports, or questions for Zain & Fatima.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={copyEmail}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                      >
                        {copiedEmail ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-success" />
                            <span>Copied to Clipboard</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                      <a
                        href="mailto:shadowtalk@shadowtalk-ai.com"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white transition-colors"
                      >
                        <span>Send Email</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Channels Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/contact"
                      className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-pink-500/30 transition-all flex flex-col justify-between"
                    >
                      <MessageSquare className="h-5 w-5 text-pink-400 mb-1" />
                      <div>
                        <p className="text-sm font-semibold text-white">Contact Form</p>
                        <p className="text-[11px] text-slate-400">Direct message desk</p>
                      </div>
                      <span className="text-[10px] font-mono text-pink-400">Open Desk →</span>
                    </Link>

                    <Link
                      to="/status"
                      className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
                    >
                      <Activity className="h-5 w-5 text-cyan-400 mb-1" />
                      <div>
                        <p className="text-sm font-semibold text-white">Live Status</p>
                        <p className="text-[11px] text-slate-400">99.9% uptime track</p>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400">View Health →</span>
                    </Link>

                    <Link
                      to="/faq"
                      className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between"
                    >
                      <HelpCircle className="h-5 w-5 text-purple-400 mb-1" />
                      <div>
                        <p className="text-sm font-semibold text-white">FAQ</p>
                        <p className="text-[11px] text-slate-400">Answers & answers</p>
                      </div>
                      <span className="text-[10px] font-mono text-purple-400">Read FAQ →</span>
                    </Link>

                    <Link
                      to="/help"
                      className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                    >
                      <Shield className="h-5 w-5 text-emerald-400 mb-1" />
                      <div>
                        <p className="text-sm font-semibold text-white">Help Center</p>
                        <p className="text-[11px] text-slate-400">Docs & walkthroughs</p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">Get Help →</span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}
      </div>
    </section>
  );
};

export default LandingSectionHub;
