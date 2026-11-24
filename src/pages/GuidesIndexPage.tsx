import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, ChevronRight, Compass } from "lucide-react";
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
import { SEO_GUIDES, GUIDE_HUB_LINE } from "@/content/seoGuides";
import { COMPARE_SLUGS } from "@/content/seoComparisons";

/**
 * /guides — the hub page for the intent-cluster guide fleet. Mirrors
 * /compare: every guide with its one-line summary (answer-engine extract),
 * the honesty paragraph, and links onward. WebPage + ItemList +
 * BreadcrumbList + Speakable JSON-LD.
 */
const GUIDE_ORDER = [
  "offline-ai-chat",
  "private-ai-chat",
  "who-can-read-your-ai-chats",
  "run-llm-in-browser",
  "what-is-on-device-ai",
  "best-offline-ai-chat",
  "ai-chat-without-account",
  "free-ai-chat",
  "is-chatgpt-plus-worth-it",
  "byok-ai-chat",
  "mobile-offline-ai",
  "webgpu-ai-chat",
  "local-vs-cloud-ai",
  "chatgpt-down",
  "ai-chat-for-travel",
  "ai-chat-for-students",
] as const;

const GuidesIndexPage = () => {
  const meta = PAGE_SEO["guides"];

  const structuredData = [
    getWebPageSchema({ title: meta.title, description: meta.description, url: meta.canonical }),
    getBreadcrumbSchema([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Guides", url: `${SITE_URL}/guides` },
    ]),
    getItemListSchema(
      GUIDE_ORDER.map((slug) => ({
        name: SEO_GUIDES[slug].h1,
        url: `${SITE_URL}/${slug}`,
        description: GUIDE_HUB_LINE[slug],
      })),
    ),
    getSpeakableSchema(["#guides-definition"]),
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
          <span className="text-foreground/80">Guides</span>
        </nav>

        {/* H1 + extractive definition (GEO answer block) */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
          The guides — offline, private and browser-native AI, explained honestly
        </h1>
        <div
          id="guides-definition"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 mb-4"
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
            <Compass className="h-4 w-4" aria-hidden />
            The short answer
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-foreground/95">
            These guides explain the things people actually search for about AI chat — how to use AI
            offline, how private AI chat really is, what WebGPU does, what "free" means, local vs
            cloud — with ShadowTalk AI as the worked example. Every page leads with a quotable short
            answer, states its requirements honestly (WebGPU, Chrome/Edge 113+; the first download
            needs a connection), and is grounded in shipped behavior with the landscape checked
            November 2026.
          </p>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-10">
          Ten guides, no fluff, no rag claims: each one says what works, what doesn't yet, and which
          tool wins where — including tools that beat us. Head-to-head scoring lives separately in{" "}
          <Link to="/compare" className="text-primary hover:underline">the comparison hub</Link>.
        </p>

        {/* Guide cards */}
        <section aria-labelledby="guide-pages" className="mb-10">
          <h2 id="guide-pages" className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            All fifteen guides
          </h2>
          <div className="grid gap-3">
            {GUIDE_ORDER.map((slug) => {
              const g = SEO_GUIDES[slug];
              return (
                <Link
                  key={slug}
                  to={`/${slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="text-sm sm:text-base font-medium text-foreground">{g.breadcrumb}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{GUIDE_HUB_LINE[slug]}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>

        {/* How to use these guides */}
        <section aria-labelledby="guides-howto" className="mb-10">
          <h2 id="guides-howto" className="text-xl sm:text-2xl font-semibold mb-4">
            Where to start
          </h2>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/85 leading-relaxed">
              <Check className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden />
              <span>New to on-device AI? Start with{" "}
                <Link to="/what-is-on-device-ai" className="text-primary hover:underline">what on-device AI is</Link>, then{" "}
                <Link to="/run-llm-in-browser" className="text-primary hover:underline">run one in your browser</Link>.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/85 leading-relaxed">
              <Check className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden />
              <span>Came for offline AI? The{" "}
                <Link to="/offline-ai-chat" className="text-primary hover:underline">offline AI chat guide</Link> is the core
                walkthrough — sync is the part nobody else ships.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/85 leading-relaxed">
              <Check className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden />
              <span>Comparing tools? Skip to the{" "}
                <Link to="/compare" className="text-primary hover:underline">head-to-head hub</Link> — {COMPARE_SLUGS.length} scored
                comparisons, each with a where-they-win section.</span>
            </li>
          </ul>
        </section>

        {/* Honest limits — the trust block */}
        <section aria-labelledby="guides-limits" className="mb-10 rounded-2xl border border-border/60 p-5 sm:p-6">
          <h2 id="guides-limits" className="text-xl sm:text-2xl font-semibold mb-3">
            The fine print these guides keep repeating
          </h2>
          <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">
            ShadowTalk is the first AI chat in a browser that works offline and syncs when you're
            back — and the fine print matters: the first visit and model download need a connection
            (WebGPU, Chrome/Edge 113+), on-device models are practical up to ~3B parameters while
            frontier reasoning still belongs to cloud models, default chats are stored server-side
            when Private Mode is off (end-to-end encrypted, AES-256-GCM, when it's on), and BYOK
            users pay their provider directly at cost. Every guide states its limits in the same
            plain language.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 p-6 sm:p-8 text-center">
          <Check className="h-6 w-6 text-primary mx-auto mb-3" aria-hidden />
          <p className="text-lg sm:text-xl font-semibold mb-1">Read less, try more — it's free.</p>
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

export default GuidesIndexPage;
