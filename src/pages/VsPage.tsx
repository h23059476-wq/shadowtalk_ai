import { Link, useParams, Navigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, Table2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { getComparisonBySlug } from "@/lib/viral/comparisonCorpus";

const SITE_DEFINITION =
  "ShadowTalk AI is a sovereign agentic AI workspace: encrypted chat, Mission Control missions, 30+ tools, voice, code IDE, desktop app, and optional offline models. Free to use — no subscription. Bring your own AI provider API key; your provider may charge separately for API usage.";

const VsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? getComparisonBySlug(slug) : undefined;

  if (!page) {
    return <Navigate to="/discover" replace />;
  }

  const meta = {
    title: `${page.title} — Alternative To ${page.competitor}`,
    description: page.metaDescription,
    keywords: page.keywords,
    canonical: `https://www.shadowtalk-ai.com/vs/${page.slug}`,
    ogType: "article" as const,
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.metaDescription,
    url: `https://www.shadowtalk-ai.com/vs/${page.slug}`,
    about: [
      {
        "@type": "SoftwareApplication",
        name: "ShadowTalk AI",
        url: "https://www.shadowtalk-ai.com",
      },
      {
        "@type": "SoftwareApplication",
        name: page.competitor,
        url: `https://www.${page.competitor.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      },
    ],
  };

  const faqSchema = page.faq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        meta={meta}
        structuredData={[structuredData, faqSchema].filter(Boolean)}
      />

      <Navigation />

      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <p className="text-sm text-muted-foreground mb-2">
            <Link to="/discover" className="hover:text-primary">
              Discover
            </Link>
            {" / "}
            <span>{page.h1}</span>
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            {page.h1}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
            {SITE_DEFINITION}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Comparing <span className="font-medium">{page.competitor}</span> vs{" "}
            <span className="font-medium">ShadowTalk AI</span> on execution,
            privacy, offline support, and tool breadth.
          </p>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 mb-10">
            <p className="text-base sm:text-lg leading-relaxed font-medium">
              {page.verdict}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-10">
            <Button size="lg" className="btn-glow" asChild>
              <Link
                to={`/chatbot?utm_source=vs_${page.slug}&utm_medium=seo&utm_campaign=viral_compare`}
              >
                Try ShadowTalk free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-14">
            <div className="rounded-xl border border-border/60 bg-card/60 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Why users switch to ShadowTalk AI
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {page.shadowtalkWins.map((w) => (
                  <li key={w} className="flex gap-2">
                    <span className="text-success shrink-0">✓</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-warning" />
                Where {page.competitor} still leads
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {page.competitorWins.map((w) => (
                  <li key={w} className="flex gap-2">
                    <span className="text-warning shrink-0">·</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-14">
            <div className="flex items-center gap-2 mb-4">
              <Table2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Feature comparison</h2>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 font-medium">ShadowTalk AI</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {page.competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(page.rows ?? []).map((row) => (
                    <tr key={row.category} className="border-t border-border/50">
                      <td className="px-4 py-3 font-medium">{row.category}</td>
                      <td className="px-4 py-3">{row.shadowtalk}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this table as a quick decision aid. For deeper workflows, open
              the workspace.
            </p>
          </div>

          {page.faq && page.faq.length > 0 && (
            <div className="mb-14">
              <h2 className="text-2xl font-bold mb-4">
                {page.competitor} vs ShadowTalk AI —Frequently asked questions
              </h2>
              <div className="space-y-4">
                {page.faq.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/60 bg-card/60 p-5"
                  >
                    <h3 className="font-semibold mb-1">{item.question}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-card/60 p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-2">
              Ready to switch from {page.competitor}?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Start free, keep your existing workflows, and add missions, tools,
              and privacy when you’re ready.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="btn-glow" asChild>
                <Link
                  to={`/chatbot?utm_source=vs_${page.slug}&utm_medium=cta&utm_campaign=switch`}
                >
                  Open ShadowTalk AI <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/prompts">Browse prompt library</Link>
              </Button>
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Static copy for crawlers:{" "}
            <a
              href={`/vs/${page.slug}.html`}
              className="text-primary hover:underline"
            >
              /vs/{page.slug}.html
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default VsPage;
