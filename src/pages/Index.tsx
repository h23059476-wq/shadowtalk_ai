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
  getWebPageSchema,
  getWebSiteSchema,
} from "@/lib/seo";
import LandingPageShell from "@/components/landing/LandingPageShell";
import { PlatformMetricsProvider } from "@/contexts/PlatformMetricsContext";
import { COMPARISON_PAGES } from "@/lib/comparisonPages";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const WhatIsShadowTalk = lazy(() => import("@/components/landing/WhatIsShadowTalk"));
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
        "Professional Intelligence Suite",
        "Strategy Agent",
        "Neural Memory",
        "E2EE Privacy",
        "Document Studio",
        "Presentation Builder",
      ],
    }),
    getItemListSchema(
      COMPARISON_PAGES.map((page) => ({
        name: page.title,
        url: page.canonical,
        description: page.description,
      })),
    ),
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