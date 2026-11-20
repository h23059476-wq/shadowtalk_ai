import { lazy, Suspense, useState, useEffect } from "react";
import LandingNavigation from "@/components/landing/LandingNavigation";
import HeroSection from "@/components/HeroSection";
import LandingSectionHub, { SectionHubTab } from "@/components/landing/LandingSectionHub";
import LandingContactSection from "@/components/landing/LandingContactSection";
import { SEOHead } from "@/components/SEOHead";
import {
  PAGE_SEO,
  getFounderHomeStructuredData,
  getItemListSchema,
  getSoftwareApplicationSchema,
  getVideoObjectSchema,
  getWebPageSchema,
  getWebSiteSchema,
} from "@/lib/seo";
import LandingPageShell from "@/components/landing/LandingPageShell";
import { PlatformMetricsProvider } from "@/contexts/PlatformMetricsContext";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const WhatIsShadowTalk = lazy(() => import("@/components/landing/WhatIsShadowTalk"));
const OfflineFirstBand = lazy(() => import("@/components/landing/OfflineFirstBand"));
const TrailerVideoBand = lazy(() => import("@/components/landing/TrailerVideoBand"));
const MarketGapBand = lazy(() => import("@/components/landing/MarketGapBand"));
const FounderSpotlightSection = lazy(() => import("@/components/founder/FounderSpotlightSection"));
const PricingSection = lazy(() => import("@/components/PricingSection"));
const LandingContactSectionComp = lazy(() => import("@/components/landing/LandingContactSection"));
const Footer = lazy(() => import("@/components/Footer"));

const Index = () => {
  const [activeSection, setActiveSection] = useState<SectionHubTab>("services");
  const [viewMode, setViewMode] = useState<"tabbed" | "all">("tabbed");

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (["services", "founders", "pricing", "contact"].includes(hash)) {
        setActiveSection(hash as SectionHubTab);
        // Wait for React to render the section, then scroll to it.
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const structuredData = [
    getWebSiteSchema(),
    getSoftwareApplicationSchema(),
    getWebPageSchema({
      title: PAGE_SEO.home.title,
      description: PAGE_SEO.home.description,
      url: PAGE_SEO.home.canonical || "https://www.shadowtalk-ai.com/home",
      about: [
        "Agentic AI workspace",
        "Encrypted multi-model chat",
        "Deep Research with citations",
        "ProofLoop verified missions",
        "ShadowTalk Live voice",
        "BYOK privacy",
      ],
    }),
    getItemListSchema(
      [
        PAGE_SEO.chatbot,
        PAGE_SEO.pricing,
        PAGE_SEO.docs,
        PAGE_SEO.proofloop,
        PAGE_SEO.themes,
        PAGE_SEO.faq,
      ].map((meta) => ({
        name: meta.title,
        url: meta.canonical!,
        description: meta.description,
      })),
    ),
    getVideoObjectSchema(),
    ...getFounderHomeStructuredData(),
  ];

  return (
    <>
      <SEOHead meta={PAGE_SEO.home} structuredData={structuredData} />
      <PlatformMetricsProvider>
        <LandingPageShell>
          <div className="min-h-screen bg-background text-foreground landing-page-content">
            <LandingNavigation />
            <HeroSection />

            {/* The category claim, on its own band — "the first AI chat in a browser
                that works offline — and syncs when you're back." Always visible
                (not hub-tabbed), followed by the market-gap differentiators. */}
            <Suspense fallback={<div className="py-8" aria-hidden /> }>
              <OfflineFirstBand />
            </Suspense>

            {/* The 30-second airplane-mode demo — self-hosted trailer + YouTube
                mirror, proving the claim above with moving pixels. */}
            <Suspense fallback={<div className="py-8" aria-hidden /> }>
              <TrailerVideoBand />
            </Suspense>

            {/* Why no one else can say the claim — the three-camp differentiators. */}
            <Suspense fallback={<div className="py-8" aria-hidden /> }>
              <MarketGapBand />
            </Suspense>

            <LandingSectionHub
              activeTab={activeSection}
              onTabChange={(tab) => {
                setActiveSection(tab);
                const el = document.getElementById(tab);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {viewMode === "tabbed" ? (
              <div className="relative min-h-[350px]">
                {activeSection === "services" && (
                  <div id="services" className="relative">
                    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading suite...</div>}>
                      <WhatIsShadowTalk />
                    </Suspense>
                  </div>
                )}
                {activeSection === "founders" && (
                  <div id="founders" className="relative">
                    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading founders...</div>}>
                      <FounderSpotlightSection />
                    </Suspense>
                  </div>
                )}
                {activeSection === "pricing" && (
                  <div id="pricing" className="relative">
                    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading pricing...</div>}>
                      <PricingSection />
                    </Suspense>
                  </div>
                )}
                {activeSection === "contact" && (
                  <div id="contact" className="relative">
                    <LandingContactSection />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative space-y-4">
                <div id="services" className="relative">
                  <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading suite...</div>}>
                    <WhatIsShadowTalk />
                  </Suspense>
                </div>
                <div id="founders" className="relative">
                  <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading founders...</div>}>
                    <FounderSpotlightSection />
                  </Suspense>
                </div>
                <div id="pricing" className="relative">
                  <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading pricing...</div>}>
                    <PricingSection />
                  </Suspense>
                </div>
                <div id="contact" className="relative">
                  <LandingContactSection />
                </div>
              </div>
            )}

            <Suspense fallback={null}>
              <Footer />
            </Suspense>
          </div>
        </LandingPageShell>
      </PlatformMetricsProvider>
    </>
  );
};

export default Index;