import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
  Target,
  Lock,
  Globe,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND, BRAND_PILLARS } from "@/lib/brand";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { formatTractionDaily, formatTractionUsers } from "@/lib/formatMetrics";

const WORKFLOW_PROOF = [
  {
    icon: Target,
    title: "Strategy in one thread",
    body: "Founders run CEO playbooks and marketing plans via /strategy — not five separate tabs.",
  },
  {
    icon: Lock,
    title: "Anonymous by default",
    body: "Start chatting with no signup wall. E2EE session when you want privacy on sensitive work.",
  },
  {
    icon: Globe,
    title: "11 languages built in",
    body: "Switch UI and chat context across en, es, fr, de, zh, ja, ar, hi, pt, ru, and ur.",
  },
  {
    icon: MessageSquare,
    title: "Real product, real limits",
    body: "Free tier with stated daily caps — we publish what ships in /changelog, not fake star ratings.",
  },
] as const;

const HIGHLIGHTS = BRAND_PILLARS.slice(0, 3);

/**
 * Trust + value-prop strip above the chat composer on empty /chatbot.
 * Phase 1 growth: hero, social proof, differentiators, legitimacy links.
 */
export function ChatbotTrustStrip() {
  const metrics = usePlatformMetrics();
  const usersLabel = metrics.isLoading
    ? "1.5K+ creators"
    : formatTractionUsers(metrics.totalUsers);
  const dailyLabel = metrics.isLoading
    ? "100+ daily active"
    : formatTractionDaily(metrics.dailyActiveUsers);

  return (
    <section
      className="w-full max-w-[720px] mx-auto px-4 sm:px-6 pt-4 pb-2 shrink-0"
      aria-label="What is ShadowTalk AI"
    >
      <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-border/30">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
            <div className="text-left min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                What is {BRAND.fullName}?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {BRAND.shortPitch}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/20 bg-muted/20">
          <div className="flex items-center gap-2 text-left">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
            <p className="text-xs font-medium text-foreground">
              Trusted by {usersLabel} · {dailyLabel}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
            <span>Founder-led · Cancel anytime</span>
          </div>
        </div>

        <div className="px-3 py-3 sm:px-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WORKFLOW_PROOF.map((item) => (
            <div
              key={item.title}
              className="flex gap-2.5 rounded-xl border border-border/30 bg-background/40 px-3 py-2.5 text-left"
            >
              <item.icon className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 sm:px-5 flex flex-wrap gap-1.5 justify-center border-t border-border/20">
          {HIGHLIGHTS.map((p) => (
            <span
              key={p.title}
              className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/50 px-2.5 py-1 text-[10px] sm:text-xs text-muted-foreground"
            >
              <span aria-hidden>{p.emoji}</span>
              {p.title}
            </span>
          ))}
        </div>

        <div className="px-4 py-3 sm:px-5 flex flex-wrap items-center justify-center gap-2 border-t border-border/30 bg-muted/10">
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/about">
              About
              <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/contact">Contact</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/ai-strategy-consultant">Strategy AI</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/anonymous-ai">No-login AI</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/pricing">Free to use</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default ChatbotTrustStrip;
