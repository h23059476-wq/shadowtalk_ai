import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, Scale, ShieldCheck } from "lucide-react";
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
  getSpeakableSchema,
} from "@/lib/seo";
import { SEO_COMPARISONS } from "@/content/seoComparisons";

/**
 * SEO/GEO/AEO comparison page — one "X vs Y" intent cluster per route,
 * rendered from src/content/seoComparisons.ts.
 *
 * Structure mirrors GuidePage: extractive "short answer" block under the H1
 * (the passage answer engines quote), a comparison table (featured-snippet
 * bait), an honest "where the competitor wins" section, verdict with the
 * category claim, FAQ accordion with FAQPage JSON-LD, breadcrumb + speakable
 * schema, and internal links. No animation libs — lean pages for crawlers.
 */
const ComparePage = ({ cmp }: { cmp: string }) => {
  const c = SEO_COMPARISONS[cmp];
  if (!c) return null;
  const meta = PAGE_SEO[`vs-${c.slug}`];

  const structuredData = [
    getWebPageSchema({ title: meta.title, description: meta.description, url: meta.canonical }),
    getFAQSchema(c.faqs),
    getBreadcrumbSchema([
      { name: "Home", url: "https://www.shadowtalk-ai.com/" },
      { name: "Compare", url: "https://www.shadowtalk-ai.com/compare" },
      { name: c.breadcrumb, url: meta.canonical },
    ]),
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
          <Link to="/compare" className="hover:text-foreground">Compare</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-foreground/80">{c.breadcrumb}</span>
        </nav>

        {/* H1 + extractive verdict (GEO answer block) */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">{c.h1}</h1>
        <div
          id="compare-definition"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 mb-4"
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
            <Scale className="h-4 w-4" aria-hidden />
            The short answer
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-foreground/95">{c.definition}</p>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-10">{c.intro}</p>

        {/* Head-to-head table — featured-snippet bait */}
        <section aria-labelledby="compare-table" className="mb-10">
          <h2 id="compare-table" className="text-xl sm:text-2xl font-semibold mb-4">
            {c.competitor} vs ShadowTalk AI, dimension by dimension
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="text-left font-semibold px-4 py-2.5">Dimension</th>
                  <th className="text-left font-semibold px-4 py-2.5 text-primary">ShadowTalk AI</th>
                  <th className="text-left font-semibold px-4 py-2.5">{c.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((row) => (
                  <tr key={row.dimension} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2.5 align-top font-medium text-foreground/90">{row.dimension}</td>
                    <td
                      className={`px-4 py-2.5 align-top ${
                        row.edge === "shadowtalk" ? "bg-primary/5 font-medium text-foreground" : "text-foreground/75"
                      }`}
                    >
                      <span className="flex items-start gap-1.5">
                        {row.edge === "shadowtalk" && (
                          <Check className="h-3.5 w-3.5 text-primary mt-1 shrink-0" aria-label="ShadowTalk edge" />
                        )}
                        {row.edge === "both" && (
                          <Scale className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" aria-label="Both" />
                        )}
                        <span>{row.shadowtalk}</span>
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2.5 align-top ${
                        row.edge === "them" ? "bg-muted/40 text-foreground/85" : "text-foreground/75"
                      }`}
                    >
                      <span className="flex items-start gap-1.5">
                        {row.edge === "them" && (
                          <Check className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" aria-label={`${c.competitor} edge`} />
                        )}
                        {row.edge === "both" && (
                          <Scale className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" aria-hidden />
                        )}
                        <span>{row.them}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Landscape checked Nov 2026. Every checkmark is a shipped, verifiable behavior — not a roadmap item.
          </p>
        </section>

        {/* Honest competitor strengths */}
        <section aria-labelledby="compare-their-wins" className="mb-10">
          <h2 id="compare-their-wins" className="text-xl sm:text-2xl font-semibold mb-4">
            {c.whereTheyWinHeading}
          </h2>
          <ul className="space-y-2.5">
            {c.whereTheyWin.map((b) => (
              <li key={b.slice(0, 24)} className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/85 leading-relaxed">
                <Check className="h-4 w-4 text-muted-foreground mt-1 shrink-0" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Verdict */}
        <section aria-labelledby="compare-verdict" className="mb-10 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <h2 id="compare-verdict" className="text-xl sm:text-2xl font-semibold mb-3">{c.verdictHeading}</h2>
          {c.verdictParagraphs.map((p) => (
            <p key={p.slice(0, 24)} className="text-sm sm:text-base text-foreground/85 leading-relaxed mb-3 last:mb-0">
              {p}
            </p>
          ))}
        </section>

        {/* FAQ — schema-pinned Q&A */}
        <section aria-labelledby="compare-faq" className="mb-10">
          <h2 id="compare-faq" className="text-xl sm:text-2xl font-semibold mb-4">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {c.faqs.map((f, i) => (
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

        {/* Related — internal linking */}
        <section aria-labelledby="compare-related" className="mb-10">
          <h2 id="compare-related" className="text-xl sm:text-2xl font-semibold mb-4">Keep reading</h2>
          <div className="grid gap-3">
            {c.related.map((r) => (
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
              {c.ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </a>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ComparePage;
