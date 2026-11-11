import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Handshake,
  MessageSquare,
  FileText,
  Users,
  Building2,
  Plug,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PLAN_DETAILS } from "@/lib/stripe";
import { Card, CardContent } from "@/components/ui/card";

const PARTNERSHIPS_META = {
  title: "Partnerships & Integrations — ShadowTalk AI",
  description:
    "Integrate ShadowTalk with Notion, Slack, Discord, and complementary tools. Team & enterprise pricing, co-marketing, and referral credits.",
  keywords: [
    "ShadowTalk integrations",
    "AI Slack integration",
    "Notion AI alternative",
    "enterprise AI pricing",
    "referral program",
  ],
  canonical: "https://www.shadowtalk-ai.com/partnerships",
  ogType: "website" as const,
};

const INTEGRATIONS = [
  {
    icon: MessageSquare,
    name: "Slack",
    status: "Roadmap",
    body: "Bring Mission Control summaries and chat into channels your team already lives in.",
  },
  {
    icon: FileText,
    name: "Notion",
    status: "Roadmap",
    body: "Push strategy outputs and research briefs into Notion pages — no copy-paste marathon.",
  },
  {
    icon: Users,
    name: "Discord",
    status: "Community",
    body: "Community bots and shareable outputs for builders — follow @shadowtalk_ai for pilots.",
  },
  {
    icon: Plug,
    name: "API & webhooks",
    status: "Available",
    body: "Developer API at /developers and /api for custom integrations today.",
  },
] as const;

const PartnershipsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead meta={PARTNERSHIPS_META} />
      <Navigation />

      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Handshake className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Phase 4 · Distribution</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Partnerships & integrations</h1>
          <p className="text-lg text-muted-foreground mb-10">
            Meet users inside tools they already use. Co-market with complementary products. Enterprise
            teams get custom pricing and security review.
          </p>

          <h2 className="text-2xl font-bold mb-4">Integrations</h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-12">
            {INTEGRATIONS.map((item) => (
              <Card key={item.name} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{item.name}</h3>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground ml-auto">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-4">Pricing strategy</h2>
          <div className="rounded-xl border border-border/50 p-5 mb-12 space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Free:</strong> Daily message caps create natural
              transparency — try everything; it is all included, free.
            </p>
            <p>
              <strong className="text-foreground">Pro (${PLAN_DETAILS.pro.price}/mo):</strong> Undercuts
              ChatGPT Plus (~$20) — unlimited daily messages for solo builders.
            </p>
            <p>
              <strong className="text-foreground">Premium & Elite:</strong> Agentic workflows, priority,
              and white-label for power users and agencies.
            </p>
            <p>
              <strong className="text-foreground">Team / Enterprise:</strong> Custom seats, SSO, audit
              logs — contact us for business features.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/pricing">See full pricing</Link>
            </Button>
          </div>

          <h2 className="text-2xl font-bold mb-4">Co-marketing & referrals</h2>
          <div className="flex items-start gap-3 mb-8">
            <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Complementary tools (research, CRM, dev platforms): list on /discover and cross-link
                case studies.
              </p>
              <p>
                Share ShadowTalk, earn Pro credits —{" "}
                <Link to="/referral" className="text-primary hover:underline">
                  20–40% referral commission
                </Link>{" "}
                for affiliates.
              </p>
              <p>
                Review platforms: we publish honest docs for G2, Capterra, and Product Hunt listings —
                ask happy users after positive sessions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="btn-glow">
              <Link to="/contact">
                Partner with us <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/enterprise">Enterprise inquiry</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/embed-widget.js">Blog embed widget</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PartnershipsPage;
