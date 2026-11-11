import React from "react";
import { Star, KeyRound, Wallet, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { LANDING_COPY } from "@/lib/brand";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import LandingAmbientOrb from "@/components/landing/LandingAmbientOrb";
import FreeTierLimitsStrip from "@/components/growth/FreeTierLimitsStrip";

const FREE_ACCESS_POINTS = [
  {
    icon: Wallet,
    title: "No subscription, no credit card",
    body: "Every feature of the workspace is included with a free account. There are no plans or tiers to compare.",
  },
  {
    icon: KeyRound,
    title: "Bring your own AI provider key",
    body: "Connect your preferred AI provider with your own API key and pick the models you want — you stay in control.",
  },
  {
    icon: Sparkles,
    title: "Chat, missions, research, and more",
    body: "Agentic chat, Mission Control, deep research, documents, IDE, and 30+ tools are all part of free access.",
  },
  {
    icon: ShieldCheck,
    title: "Provider costs stay transparent",
    body: "Your AI provider may charge separately for API usage — billed by them, never mark-up by us.",
  },
];

const PricingSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { isMobile } = useLandingMotion();

  return (
    <section id="pricing" ref={sectionRef} className="py-16 sm:py-28 bg-muted/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dense opacity-20" />
      <LandingAmbientOrb
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 ${
          isMobile ? "w-[400px] h-[200px] blur-[80px]" : "w-[800px] h-[400px] blur-[150px]"
        } bg-secondary/5 rounded-full`}
        animate={isInView ? { scale: [1, 1.15, 1], opacity: [0.03, 0.06, 0.03] } : undefined}
        duration={10}
      />

      <div className="container mx-auto px-4 relative z-10">
        <FreeTierLimitsStrip className="mb-8 max-w-3xl mx-auto" />
        <LandingSectionHeader
          badge={LANDING_COPY.pricing.badge}
          badgeIcon={Star}
          title={
            <>
              {LANDING_COPY.pricing.title[0]}{" "}
              <span className="gradient-text">{LANDING_COPY.pricing.title[1]}</span>
            </>
          }
          subtitle={LANDING_COPY.pricing.subtitle}
          className="mb-10 sm:mb-14"
        />

        <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
          {FREE_ACCESS_POINTS.map((point) => (
            <Card key={point.title} className="border-border/60">
              <CardContent className="p-6">
                <point.icon className="h-5 w-5 text-primary mb-3" aria-hidden />
                <h3 className="text-base font-semibold mb-2">{point.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{point.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button asChild size="lg">
            <Link to="/chatbot">Start using ShadowTalk free</Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-3 max-w-md mx-auto">
            ShadowTalk AI is free to use. Bring your own AI provider API key and
            choose your preferred models. Your provider may charge separately for
            API usage.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
