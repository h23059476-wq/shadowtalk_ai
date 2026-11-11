import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { BENCHMARKS, BENCHMARK_CATEGORIES, type Benchmark } from "@/lib/benchmarksData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, ArrowRight, Sparkles, Zap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackShadowTalkEvent } from "@/lib/analyticsEventTracker";
import { ShareConsensusResult, type ConsensusPayload } from "@/components/growth/ShareConsensusResult";

/**
 * Public /benchmarks page — pre-loaded side-by-side model comparisons.
 *
 * Each benchmark renders as a read-only multi-model canvas demo so visitors
 * can see the value of the canvas before signing up. Includes a "Share"
 * button on each demo so visitors can export the comparison as a PNG (with
 * the "Powered by ShadowTalk AI" footer) — viral loop fuel.
 */

const CATEGORY_COLORS: Record<string, string> = {
  coding: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  reasoning: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  writing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  math: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  safety: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  multilingual: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

function BenchmarkCard({ benchmark }: { benchmark: Benchmark }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const consensusPayload: ConsensusPayload = {
    prompt: benchmark.prompt,
    responses: benchmark.responses.map((r) => ({
      model: r.model,
      provider: r.provider,
      response: r.response,
      latencyMs: r.latencyMs,
    })),
    timestamp: new Date().toISOString(),
  };

  const handleTryInWorkspace = () => {
    trackShadowTalkEvent("benchmarks_try_in_workspace", { benchmark: benchmark.slug });
    // Stash the prompt in sessionStorage so the chatbot can pre-fill it
    sessionStorage.setItem("shadowtalk_prefill_prompt", benchmark.prompt);
    navigate("/chatbot?demo=true");
  };

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={`text-[10px] uppercase tracking-wider ${CATEGORY_COLORS[benchmark.category]}`}
              >
                {benchmark.category}
              </Badge>
              <span className="text-[10px] text-muted-foreground/70">
                {benchmark.responses.length} models · {benchmark.responses[0]?.latencyMs ? `${(benchmark.responses[0].latencyMs / 1000).toFixed(1)}s` : ""}
              </span>
            </div>
            <CardTitle className="text-base sm:text-lg leading-tight">{benchmark.title}</CardTitle>
            <CardDescription className="text-xs mt-1.5">{benchmark.summary}</CardDescription>
          </div>
          <ShareConsensusResult payload={consensusPayload} compact />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Prompt */}
        <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Prompt</div>
          <p className="text-xs text-foreground/90 font-mono leading-relaxed">{benchmark.prompt}</p>
        </div>

        {/* Responses — collapsible to keep the grid scannable */}
        {expanded && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {benchmark.responses.map((r) => (
              <div
                key={r.model}
                className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{r.model}</span>
                  {r.latencyMs && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {(r.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                  {r.response}
                </pre>
              </div>
            ))}
            {benchmark.verdict && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Verdict</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{benchmark.verdict}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide responses" : "Show responses"}
            <ArrowRight className={`ml-1 h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1.5"
            onClick={handleTryInWorkspace}
          >
            <Zap className="h-3 w-3" />
            Try in workspace
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BenchmarksPage() {
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(
    () => (category === "all" ? BENCHMARKS : BENCHMARKS.filter((b) => b.category === category)),
    [category],
  );

  return (
    <>
      <SEOHead
        meta={{
          title: "Multi-Model Benchmarks — Side-by-Side AI Comparisons | ShadowTalk AI",
          description:
            "Live side-by-side AI model comparisons: Claude vs GPT-4o vs Gemini on coding, reasoning, writing, and math. See real prompt + real responses before signing up.",
          keywords: [
            "AI benchmarks",
            "Claude vs GPT-4o",
            "multi-model comparison",
            "BYOK AI benchmarks",
            "ShadowTalk benchmarks",
          ],
          canonical: "https://www.shadowtalk-ai.com/benchmarks",
          ogType: "website",
          twitterCard: "summary_large_image",
        }}
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-6xl">
          {/* Hero */}
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Live Multi-Model Comparisons</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
              <span className="gradient-text">AI Model Benchmarks</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Real prompts. Real responses. Side-by-side. See exactly how Claude, GPT-4o, and
              Gemini compare — then try the same prompt in the workspace with your own API key.
            </p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {BENCHMARK_CATEGORIES.map((c) => (
              <Button
                key={c.id}
                variant={category === c.id ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>

          {/* Benchmark grid */}
          <div className="grid gap-4 lg:gap-5">
            {filtered.map((b) => (
              <BenchmarkCard key={b.slug} benchmark={b} />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 sm:mt-16 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-cyan-500/5 p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Run your own comparison</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Paste your prompt, pick your models, see responses side-by-side with live diffing.
              Free, no signup, no card.
            </p>
            <Button
              size="lg"
              className="btn-glow"
              onClick={() => {
                trackShadowTalkEvent("benchmarks_cta_clicked");
                window.location.href = "/chatbot?demo=true";
              }}
            >
              <Zap className="mr-2 h-4 w-4 fill-current" />
              Open the canvas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
