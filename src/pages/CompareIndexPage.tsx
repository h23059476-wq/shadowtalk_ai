import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, ListChecks, Scale } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import {
  PAGE_SEO,
  SITE_URL,
  getWebPageSchema,
  getBreadcrumbSchema,
  getItemListSchema,
  getSpeakableSchema,
} from "@/lib/seo";
import { SEO_COMPARISONS, COMPARE_SLUGS, COMPARE_HUB_LINE } from "@/content/seoComparisons";

/**
 * /compare — the hub page for the programmatic comparison engine.
 * Lists every /vs/* page with its one-line verdict (answer-engine extract),
 * the dimensions we compare on, and the honest limits paragraph. ItemList +
 * WebPage + BreadcrumbList + Speakable JSON-LD.
 */
const COMPARE_CRITERIA = [
  "Offline — does it answer with no internet, after setup, and what exactly still needs the network?",
  "Sync — do chats follow you across devices, including messages queued while offline?",
  "Privacy — where is the prompt processed, who holds the keys, and what do the defaults store?",
  "Model choice — one provider's models, or 16+ providers plus an on-device model?",
  "Price — free to use with no card, or gated tiers and subscriptions?",
  "Honesty — are the limits documented in public, in plain language?",
];

const CompareIndexPage = () => {
  const meta = PAGE_SEO["compare"];

  const structuredData = [
    getWebPageSchema({ title: meta.title, description: meta.description, url: meta.canonical }),
    getBreadcrumbSchema([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Compare", url: `${SITE_URL}/compare` },
    ]),
    getItemListSchema(
      COMPARE_SLUGS.map((slug) => ({
        name: `ShadowTalk AI vs ${SEO_COMPARISONS[slug].competitor}`,
        url: `${SITE_URL}/vs/${slug}`,
        description: COMPARE_HUB_LINE[slug],
      })),
    ),
    getSpeakableSchema(["#compare-definition"]),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead meta={meta} structuredData={structuredData} />
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 max-w-3xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-foreground/80">Compare</span>
        </nav>

        {/* H1 + extractive definition (GEO answer block) */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
          ShadowTalk AI vs the market — every head-to-head, honestly scored
        </h1>
        <div
          id="compare-definition"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 mb-4"
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
            <Scale className="h-4 w-4" aria-hidden />
            The short answer
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-foreground/95">
            The AI market splits into camps that each own half of what ShadowTalk does: offline AI without sync,
            encrypted AI without offline, and local+sync attempts that need installs or your own servers. These
            head-to-heads score ShadowTalk against the tools people actually evaluate — ChatGPT, LM Studio, Proton
            Lumo, web-llm-chat, Ollama and Perplexity — on six dimensions, including where each competitor beats us.
          </p>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-10">
          Every comparison is grounded in shipped, verifiable behavior and dated landscape research (checked Nov
          2026) — LM Studio's sync is feature request #2467, Proton Lumo's security model documents server-side
          prompt decryption, browser demos like web-llm-chat and Secret Llama have no sync, and Ollama keeps chats
          on one machine. No rag claims: each page lists what the other tool does better.
        </p>

        {/* Comparison cards */}
        <section aria-labelledby="compare-pages" className="mb-10">
          <h2 id="compare-pages" className="text-xl sm:text-2xl font-semibold mb-4">
            The head-to-heads
          </h2>
          <div className="grid gap-3">
            {COMPARE_SLUGS.map((slug) => {
              const c = SEO_COMPARISONS[slug];
              return (
                <Link
                  key={slug}
                  to={`/vs/${slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="text-sm sm:text-base font-medium text-foreground">
                      ShadowTalk AI vs {c.competitor}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{COMPARE_HUB_LINE[slug]}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>

        {/* The six dimensions we score on */}
        <section aria-labelledby="compare-criteria" className="mb-10">
          <h2 id="compare-criteria" className="text-xl sm:text-2xl font-semibold mb-4">
            What every comparison scores
          </h2>
          <ul className="space-y-2.5">
            {COMPARE_CRITERIA.map((b) => (
              <li key={b.slice(0, 24)} className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/85 leading-relaxed">
                <ListChecks className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Honest limits — the trust block */}
        <section aria-labelledby="compare-limits" className="mb-10 rounded-2xl border border-border/60 p-5 sm:p-6">
          <h2 id="compare-limits" className="text-xl sm:text-2xl font-semibold mb-3">
            Our own limits, in the same plain language
          </h2>
          <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">
            ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back — and it has
            limits we publish rather than bury: the first visit and model download need a connection (WebGPU,
            Chrome/Edge 113+), on-device models are practical up to ~3B while cloud frontier models stay stronger
            for heavy reasoning, default chats are stored server-side when Private Mode is off (E2EE AES-256-GCM
            when it's on), free shared-mode requests transit ShadowTalk's server, and BYOK users pay their provider
            directly at cost. Every comparison page scores us by the same yardstick we score competitors.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 p-6 sm:p-8 text-center">
          <Check className="h-6 w-6 text-primary mx-auto mb-3" aria-hidden />
          <p className="text-lg sm:text-xl font-semibold mb-1">Compare in one tab — free.</p>
          <p className="text-sm text-muted-foreground mb-5">
            Works offline. Syncs when you're back. Your keys, your models, your chats.
          </p>
          <Button size="lg" asChild className="btn-glow rounded-xl px-6 py-5 text-sm sm:text-base bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 border-0">
            <a href="/chatbot">
              Try ShadowTalk AI
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </a>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CompareIndexPage;
