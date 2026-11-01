import React, { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Bot, Zap, ArrowRight, Search, Workflow, Target, Key, Cpu, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommandPaletteContext } from "@/App";
import { BRAND, BRAND_HOOKS, LANDING_COPY } from "@/lib/brand";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { formatTractionDaily, formatTractionUsers } from "@/lib/formatMetrics";
import { StealthKillSwitch } from "@/components/StealthKillSwitch";
import { useStealthKillSwitch } from "@/hooks/useStealthKillSwitch";
import { trackShadowTalkEvent } from "@/lib/analyticsEventTracker";
import FreeTierLimitsStrip from "@/components/growth/FreeTierLimitsStrip";
import ProofOverHypeBar from "@/components/growth/ProofOverHypeBar";

const HeroSection = () => {
  const navigate = useNavigate();
  const { open: openCommandPalette } = useContext(CommandPaletteContext);
  const [showDemo, setShowDemo] = useState(false);
  const metrics = usePlatformMetrics();
  const { isStealthMode } = useStealthKillSwitch();

  useEffect(() => {
    const dismissed = localStorage.getItem("shadowtalk-demo-dismissed");
    if (!dismissed) setShowDemo(true);
  }, []);

  const handleDismissDemo = () => {
    localStorage.setItem("shadowtalk-demo-dismissed", "true");
    setShowDemo(false);
  };

  return (
    <section className="shadowtalk-hero neural-bg relative min-h-[100dvh] min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-grid-dense opacity-20 z-[2]" aria-hidden />
      <div
        className="absolute top-1/4 left-1/4 w-[360px] h-[360px] blur-[60px] bg-primary/15 rounded-full z-[2] pointer-events-none"
        aria-hidden
        data-decorative="ambient"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[280px] h-[280px] blur-[50px] bg-secondary/10 rounded-full z-[2] pointer-events-none"
        aria-hidden
        data-decorative="ambient"
      />

      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Explicit value-prop eyebrow — screams core value within 3 seconds */}
          <div className="inline-flex items-center flex-wrap justify-center gap-2 glass-subtle rounded-full px-4 py-2 sm:px-5 sm:py-2.5 mb-6 sm:mb-8 max-w-[95vw] border-primary/30">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-center text-foreground">
              The World&apos;s First Zero-Knowledge, Multi-Model AI Canvas
            </span>
            <span className="w-2 h-2 bg-success rounded-full shrink-0 animate-pulse" />
          </div>

          {/* Two-line value-prop headline — instantly tells builders what we are */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-[1.1] tracking-tight px-1">
            <span className="gradient-text inline-block">{BRAND.heroHeadline[0]}</span>{" "}
            <br className="hidden sm:block" />
            <span className="gradient-text inline-block">{BRAND.heroHeadline[1]}</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-foreground/90 mb-5 max-w-3xl mx-auto leading-relaxed px-2 font-medium">
            100% BYOK &amp; WebGPU Local Vector RAG. One workspace, every frontier model, zero data leaves your device.
          </p>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-7 max-w-2xl mx-auto leading-relaxed px-2">
            {BRAND.heroSubtitle}
          </p>

          {/* Value Highlights */}
          {/* 1-click demo / connect key — above the fold, zero friction */}
          <div className="mb-5 w-full max-w-2xl mx-auto px-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Button
                size="lg"
                className="btn-glow text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 group rounded-xl w-full sm:w-auto bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 border-0"
                onClick={() => {
                  trackShadowTalkEvent("cta_clicked", { cta_name: "try_demo_no_signup" });
                  navigate("/chatbot?demo=true");
                }}
              >
                <Zap className="mr-2 sm:mr-3 h-5 w-5 fill-current" />
                Try Demo — No Signup
                <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base sm:text-lg px-6 sm:px-7 py-5 sm:py-6 border-primary/40 bg-card/40 hover:border-primary/60 hover:bg-card/60 rounded-xl w-full sm:w-auto gap-2 group"
                onClick={() => {
                  trackShadowTalkEvent("cta_clicked", { cta_name: "connect_api_key_byok" });
                  navigate("/chatbot?byok=true&view=settings");
                }}
              >
                <Key className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                Connect Your API Key
              </Button>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground/70 text-center mt-2.5">
              No card · No email · Pick Claude, GPT-4o, Gemini, Llama — all on your own keys
            </p>
          </div>

          {/* BYOK / WebGPU / RAG feature pills — explicit, scannable */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-2">
            {[
              { icon: Key, label: "100% BYOK" },
              { icon: Cpu, label: "WebGPU Local Inference" },
              { icon: Sparkles, label: "Local Vector RAG" },
              { icon: Workflow, label: "Multi-Model Canvas" },
            ].map((pill) => (
              <div
                key={pill.label}
                className="inline-flex items-center gap-1.5 glass-subtle rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-medium text-foreground/85 border-primary/15"
              >
                <pill.icon className="h-3.5 w-3.5 text-primary" />
                {pill.label}
              </div>
            ))}
          </div>

          <div className="mb-3 w-full max-w-2xl mx-auto px-2">
            <div className="glass-subtle rounded-xl border border-success/25 bg-success/5 px-4 py-2.5 text-sm sm:text-center">
              <span className="font-semibold text-success">Early access pricing now:</span>
              <span className="text-muted-foreground"> Unlimited plans from </span>
              <span className="font-semibold text-foreground">$5</span>
              <span className="text-muted-foreground">/mo</span>
              <span className="text-muted-foreground"> · activate within 2h · 14-day guarantee · cancel anytime.</span>
            </div>
          </div>

          <div className="mb-3 w-full max-w-2xl mx-auto px-2">
            <div className="glass-subtle rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs sm:text-center text-muted-foreground">
              Free plan is actually free: no credit card, no blocked tools, no hidden limits. Upgrade only when you’re ready.
            </div>
          </div>

          {/* Secondary CTAs — explore sections, pricing */}
          <div className="mb-10 sm:mb-14 w-full max-w-md sm:max-w-none mx-auto px-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
              <Button
                variant="outline"
                size="default"
                className="text-sm sm:text-base px-5 sm:px-6 py-4 sm:py-5 border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/60 rounded-xl w-full sm:w-auto gap-2 group"
                onClick={() => {
                  trackShadowTalkEvent("cta_clicked", { cta_name: "run_first_agent" });
                  navigate("/chatbot?demo=true");
                }}
              >
                <Zap className="h-4 w-4" />
                Run Your First Agent
                <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="default"
                className="text-sm sm:text-base px-5 sm:px-6 py-4 sm:py-5 border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/60 rounded-xl w-full sm:w-auto"
                onClick={() => navigate("/pricing")}
              >
                View pricing — from $5/mo
              </Button>
              <Button
                variant="outline"
                size="default"
                className="text-sm sm:text-base px-5 sm:px-6 py-4 sm:py-5 border-border/60 bg-card/40 hover:border-cyan-500/40 hover:bg-card/60 rounded-xl w-full sm:w-auto gap-2 group"
                onClick={() => {
                  document.getElementById("sections-hub")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Target className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Explore Sections</span>
                <span className="text-xs text-muted-foreground font-mono">↓</span>
              </Button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto mb-8 px-2">
            <FreeTierLimitsStrip />
          </div>

          <div className="mb-8 px-2">
            <ProofOverHypeBar />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Workflow className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Multi-Step Agents</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">E2EE Chat</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Deep Research</span>
            </div>
          </div>

          <div className="mt-6 text-xs sm:text-sm text-muted-foreground/90">
            {metrics.isLoading
              ? "Loading live metrics…"
              : `${formatTractionUsers(metrics.totalUsers)} · ${formatTractionDaily(metrics.dailyActiveUsers)}`}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-2">
            {[
              { label: "Anonymous AI", href: "/anonymous-ai" },
              { label: "AI Strategy Consultant", href: "/ai-strategy-consultant" },
              { label: "Multilingual AI", href: "/multilingual-ai" },
              { label: "Best AI non-English", href: "/best-ai-non-english" },
              { label: "GEO Docs", href: "/docs/geos" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="glass-subtle rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-2">
            {["🤖 Agentic missions", "⚡ Tool orchestration", "🎙️ Voice Mode", "⚡ Ultra-Low Latency Turbo"].map(
              (badge) => (
                <div
                  key={badge}
                  className="glass-subtle rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-medium text-muted-foreground"
                >
                  {badge}
                </div>
              ),
            )}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground/70 text-center">{LANDING_COPY.founder.line}</p>
            <div className="flex flex-col items-center gap-2 glass-subtle rounded-xl px-4 py-3 border border-border/50">
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                {isStealthMode
                  ? "Stealth is on — outbound requests are blocked. Use SURFACE in the bar above to reconnect."
                  : "Block outbound traffic from the browser and switch to the sovereign dark theme."}
              </p>
              <StealthKillSwitch />
            </div>
          </div>
        </div>

        {showDemo && (
          <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex items-center gap-2 sm:gap-3 max-w-[calc(100vw-2rem)]">
            <button
              onClick={() => {
                openCommandPalette();
                handleDismissDemo();
              }}
              className="group flex items-center gap-2 sm:gap-3 bg-primary text-primary-foreground px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-lg shadow-primary/25"
            >
              <Search className="h-5 w-5 shrink-0" />
              <span className="font-semibold text-sm">Explore ShadowTalk</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 bg-primary-foreground/20 text-primary-foreground/90 text-xs px-2 py-0.5 rounded-md font-mono">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={handleDismissDemo}
              className="text-muted-foreground hover:text-foreground bg-muted/80 backdrop-blur-sm rounded-full p-1.5"
              title="Dismiss"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
