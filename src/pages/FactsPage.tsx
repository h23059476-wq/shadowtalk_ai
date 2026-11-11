import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, ExternalLink, FileJson, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { SHADOWTALK_AI_KNOWLEDGE } from "@/lib/aiPublicKnowledge";
import { FOUNDER_NOT_THE_SAME_AS } from "@/lib/founderIdentity";
import { FollowUsSection } from "@/components/FollowUsSection";

const FactsPage = () => {
  const k = SHADOWTALK_AI_KNOWLEDGE;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead meta={PAGE_SEO.facts} />
      <Navigation />

      <section className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <Badge variant="secondary" className="mb-4">
            <Bot className="h-3 w-3 mr-1" />
            AI &amp; search facts
          </Badge>
          <h1 className="text-4xl font-bold mb-4">ShadowTalk AI — canonical facts</h1>
          <p className="text-lg text-muted-foreground mb-6">{k.canonical_pitch}</p>

          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                This page is for humans, search engines, and AI assistants. Static copies (no JavaScript required):
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/facts.html" target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    facts.html
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/llms-full.txt" target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    llms-full.txt
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/shadowtalk.json" target="_blank" rel="noopener noreferrer">
                    <FileJson className="h-4 w-4 mr-2" />
                    shadowtalk.json
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-3">Founder</h2>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">{k.founder.name}</strong> — {k.founder.role}
                  {k.founder.additional_role ? ` · ${k.founder.additional_role}` : ""}, age {k.founder.age},{" "}
                  {k.founder.location}
                </li>
                <li>
                  <a href={k.founder.linkedin} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                  {" · "}
                  <a href={k.founder.instagram} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Instagram @shadowtalk_ai
                  </a>
                  {" · "}
                  <a href="/zain-ahmed-fahad-patel.html" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Zain Ahmed Fahad Patel — founder profile
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Not the same person as</h2>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-5">
                {FOUNDER_NOT_THE_SAME_AS.map((d) => (
                  <li key={d.name + d.domain}>
                    <strong className="text-foreground">{d.name}</strong> ({d.domain}) — {d.note}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Access &amp; pricing</h2>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground capitalize">Model</strong>
                  {": free_access_byok — free to use, no subscriptions, no paid feature tiers"}
                </li>
                <li>
                  <strong className="text-foreground">Summary</strong>
                  {": " + k.pricing.summary}
                </li>
                <li>
                  <strong className="text-foreground">Details</strong>
                  {": " + k.pricing.details}
                </li>
                <li>
                  <strong className="text-foreground">Provider costs</strong>
                  {": " + k.pricing.provider_costs}
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Core features</h2>
              <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
                {k.core_features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Try it</h2>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/chatbot">Open workspace</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/pricing">Pricing</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href={k.repository} target="_blank" rel="noopener noreferrer">
                    GitHub <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
              </div>
            </section>

            <FollowUsSection variant="buttons" />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FactsPage;
