/**
 * ResearchPage — Deep Research Mode for ShadowTalk AI.
 *
 * A focused workspace where users kick off multi-source research
 * queries and review past results. Powered by the user's BYOK key
 * or the shared OmniRoute pool.
 *
 * Route: /research
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Telescope, Sparkles, Search, Clock, FileText, KeyRound, Layers, ArrowRight, Quote } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

interface ResearchResult {
  id: string;
  query: string;
  status: "completed" | "running" | "failed";
  sources: number;
  createdAt: string;
  excerpt: string;
}

const SUGGESTED_QUERIES = [
  "Compare agentic AI frameworks in 2026",
  "Summarize the latest GDPR enforcement actions",
  "Best practices for WebGPU on-device LLMs",
  "How do privacy-first AI tools handle training data?",
];

const RECENT_RESULTS: ResearchResult[] = [];

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [researchNotice, setResearchNotice] = useState("");
  const results = RECENT_RESULTS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Deep Research — ShadowTalk AI",
          description:
            "Deep Research Mode is not connected to a provider-backed research workflow yet. No source search or report generation is currently available.",
          canonical: "https://www.shadowtalk-ai.com/research",
          keywords: ["deep research", "AI research", "cited reports", "OmniRoute", "BYOK"],
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
              <Telescope className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Deep Research Mode</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
              Provider-backed source discovery and cited report generation are not available on this page yet.
            </p>
          </motion.div>

          {/* Research input card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="ios-glass-card p-6 mb-8"
          >
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Research Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              placeholder="e.g. What are the trade-offs between on-device and cloud LLMs for privacy-first products?"
              className="w-full rounded-xl bg-white/[0.03] border border-border/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent resize-none"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUERIES.slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-border/50 text-muted-foreground hover:text-foreground hover:border-indigo-500/40 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setResearchNotice("No research was started. This workflow is not connected to a research provider yet.")}
                disabled={!query.trim()}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Research unavailable
              </Button>
            </div>
            {researchNotice && <p role="status" className="mt-3 text-sm text-amber-300">{researchNotice}</p>}
          </motion.div>

          {/* Recent results */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="ios-glass-card p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Research
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground">{results.length} total</span>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] border border-border/50 mb-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No research yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  No saved reports. Research execution is not connected on this page.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-border/50 bg-white/[0.02] p-4 hover:border-indigo-500/30 transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{r.query}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                          r.status === "completed"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                            : r.status === "running"
                              ? "border-amber-500/30 text-amber-400 bg-amber-500/5"
                              : "border-red-500/30 text-red-400 bg-red-500/5"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.excerpt}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/80">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {r.sources} sources
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Info card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="ios-glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                How Deep Research Works
              </h2>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed mb-4">
              Deep Research analyzes multiple sources, synthesizes findings, and produces cited
              reports. Powered by your BYOK key or the shared OmniRoute pool.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Layers,
                  title: "Multi-source",
                  body: "Pulls from web, docs, and your connected knowledge graph in parallel.",
                },
                {
                  icon: Quote,
                  title: "Cited",
                  body: "Every claim links back to a verifiable source — no hallucinated citations.",
                },
                {
                  icon: KeyRound,
                  title: "BYOK or pool",
                  body: "Use your own provider key for unlimited runs, or fall back to OmniRoute.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/50 bg-white/[0.02] p-4"
                >
                  <item.icon className="h-4 w-4 text-indigo-400 mb-2" />
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{item.body}</p>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-5 gap-2 border-border/50 bg-transparent hover:bg-white/5"
              onClick={() => (window.location.href = "/docs")}
            >
              Read the docs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
