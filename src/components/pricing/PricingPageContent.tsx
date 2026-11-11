import { Link } from "react-router-dom";
import { KeyRound, ShieldCheck, Wallet, Gauge, Sparkles, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PricingHero from "@/components/pricing/PricingHero";
import FreeTierLimitsStrip from "@/components/growth/FreeTierLimitsStrip";

const FREE_ACCESS_FACTS = [
  {
    icon: Wallet,
    title: "No subscription, no credit card",
    body: "There are no plans, tiers, or checkout flows. Create an account and use the full workspace — chat, missions, research, documents, IDE, and more.",
  },
  {
    icon: KeyRound,
    title: "Bring your own AI provider key",
    body: "Connect the AI provider you prefer by adding your own API key. You choose the provider and the models — switch any time.",
  },
  {
    icon: Gauge,
    title: "Provider limits still apply",
    body: "Your provider bills and rate-limits API usage directly. ShadowTalk never resells AI inference and never sits between you and your provider's bill.",
  },
  {
    icon: ShieldCheck,
    title: "Security and privacy unchanged",
    body: "Account security, encrypted storage (Stealth Vault), BYOK key encryption, and abuse protections all stay exactly as they were.",
  },
  {
    icon: Sparkles,
    title: "Every feature unlocked",
    body: "Formerly gated capabilities — Video Studio, fine-tuning controls, missions, deep research — are available to everyone at no charge.",
  },
  {
    icon: Lock,
    title: "Your keys stay yours",
    body: "API keys are encrypted before storage and are never shared, pooled, or used to serve other users.",
  },
];

const PricingPageContent = () => {
  return (
    <>
      <PricingHero />
      <div className="container mx-auto px-4 max-w-3xl mb-10">
        <FreeTierLimitsStrip className="mb-10" showUpgradeLink={false} />
        <div className="grid gap-4 sm:grid-cols-2">
          {FREE_ACCESS_FACTS.map((fact) => (
            <Card key={fact.title} className="border-border/60">
              <CardContent className="p-5">
                <fact.icon className="h-5 w-5 text-primary mb-3" aria-hidden />
                <h2 className="text-sm font-semibold mb-1.5">{fact.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{fact.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-10">
          Questions? See the <Link to="/faq" className="text-primary hover:underline">FAQ</Link> or{" "}
          <Link to="/docs" className="text-primary hover:underline">documentation</Link>.
        </p>
      </div>
    </>
  );
};

export default PricingPageContent;
