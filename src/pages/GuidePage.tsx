import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, ListChecks, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SEOHead from "@/components/SEOHead";
import {
  PAGE_SEO,
  getWebPageSchema,
  getFAQSchema,
  getBreadcrumbSchema,
  getHowToSchema,
  getSpeakableSchema,
} from "@/lib/seo";
import { SEO_GUIDES } from "@/content/seoGuides";

/**
 * SEO/GEO/AEO guide page — one search-intent cluster per route.
 *
 * Rendered from src/content/seoGuides.ts with an extractive "definition"
 * block right under the H1 (the passage answer engines quote), HowTo steps,
 * FAQ accordion with FAQPage JSON-LD, breadcrumb + speakable schema, and
 * internal links to the sibling guides. No animation libs — lean pages
 * for crawlers and slow connections.
 */
const GuidePage = ({ guide }: { guide: string }) => {
  const g = SEO_GUIDES[guide];
  if (!g) return null;
  const meta = PAGE_SEO[g.slug];

  const structuredData = [
    getWebPageSchema({ title: meta.title, description: meta.description, url: meta.canonical }),
    getFAQSchema(g.faqs),
    getBreadcrumbSchema([
      { name: "Home", url: "https://www.shadowtalk-ai.com/" },
      { name: g.breadcrumb, url: meta.canonical },
    ]),
    ...(g.howTo ? [getHowToSchema(g.howTo.name, g.howTo.steps)] : []),
    getSpeakableSchema(["#guide-definition"]),
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
          <span className="text-foreground/80">{g.breadcrumb}</span>
        </nav>

        {/* H1 + extractive definition (GEO answer block) */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">{g.h1}</h1>
        <div
          id="guide-definition"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 mb-4"
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
            <ListChecks className="h-4 w-4" aria-hidden />
            The short answer
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-foreground/95">{g.definition}</p>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-10">{g.intro}</p>

        {/* Body sections */}
        <div className="space-y-10">
          {g.sections.map((s) => (
            <section key={s.heading} aria-labelledby={`h-${s.heading.slice(0, 18).replace(/\W+/g, "-")}`}>
              <h2
                id={`h-${s.heading.slice(0, 18).replace(/\W+/g, "-")}`}
                className="text-xl sm:text-2xl font-semibold mb-3"
              >
                {s.heading}
              </h2>
              {s.paragraphs?.map((p) => (
                <p key={p.slice(0, 24)} className="text-sm sm:text-base text-foreground/85 leading-relaxed mb-3">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="space-y-2.5 my-4">
                  {s.bullets.map((b) => (
                    <li key={b.slice(0, 24)} className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/85 leading-relaxed">
                      <Check className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.table && (
                <div className="my-5 overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40">
                        {s.table.headers.map((h) => (
                          <th key={h} className="text-left font-semibold px-4 py-2.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row) => (
                        <tr key={row[0]} className="border-b border-border/40 last:border-0">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-2.5 text-foreground/85">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          {/* HowTo steps */}
          {g.howTo && (
            <section aria-labelledby="guide-howto" className="rounded-2xl border border-border/60 p-5 sm:p-6">
              <h2 id="guide-howto" className="text-xl sm:text-2xl font-semibold mb-4">{g.howTo.name}</h2>
              <ol className="space-y-3">
                {g.howTo.steps.map((step, i) => (
                  <li key={step.slice(0, 24)} className="flex items-start gap-3 text-sm sm:text-base text-foreground/85 leading-relaxed">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* FAQ — schema-pinned Q&A */}
          <section aria-labelledby="guide-faq">
            <h2 id="guide-faq" className="text-xl sm:text-2xl font-semibold mb-4">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {g.faqs.map((f, i) => (
                <AccordionItem key={f.question} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-sm sm:text-base font-medium">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Related guides — internal linking */}
          <section aria-labelledby="guide-related">
            <h2 id="guide-related" className="text-xl sm:text-2xl font-semibold mb-4">Keep reading</h2>
            <div className="grid gap-3">
              {g.related.map((r) => (
                <Link
                  key={r.href}
                  to={r.href}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="text-sm sm:text-base font-medium text-foreground">{r.label}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{r.note}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden />
                </Link>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 p-6 sm:p-8 text-center">
            <ShieldCheck className="h-6 w-6 text-primary mx-auto mb-3" aria-hidden />
            <p className="text-lg sm:text-xl font-semibold mb-1">Free to use — no account, no card.</p>
            <p className="text-sm text-muted-foreground mb-5">
              Works offline. Syncs when you're back. Your keys, your models, your chats.
            </p>
            <Button size="lg" asChild className="btn-glow rounded-xl px-6 py-5 text-sm sm:text-base bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 border-0">
              <a href="/chatbot">
                {g.ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </a>
            </Button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuidePage;
