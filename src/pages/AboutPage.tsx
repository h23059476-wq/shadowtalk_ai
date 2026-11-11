import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AboutScrollProgress from "@/components/about/AboutScrollProgress";
import AboutHero from "@/components/about/AboutHero";
import AboutQuoteMarquee from "@/components/about/AboutQuoteMarquee";
import AboutInspire from "@/components/about/AboutInspire";
import AboutFounderStory from "@/components/about/AboutFounderStory";
import AboutStats from "@/components/about/AboutStats";
import AboutMission from "@/components/about/AboutMission";
import AboutSpotlight from "@/components/about/AboutSpotlight";
import AboutCoFounderSpotlight from "@/components/about/AboutCoFounderSpotlight";
import AboutTimeline from "@/components/about/AboutTimeline";
import AboutSkills from "@/components/about/AboutSkills";
import AboutStack from "@/components/about/AboutStack";
import AboutUserFeedback from "@/components/about/AboutUserFeedback";
import AboutProof from "@/components/about/AboutProof";
import AboutTeam from "@/components/about/AboutTeam";
import AboutProjects from "@/components/about/AboutProjects";
import AboutCTA from "@/components/about/AboutCTA";
import AboutForms from "@/components/about/AboutForms";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO, getPersonSchema, getFAQSchema, GEO_CANONICAL_SUMMARIES, getSpeakableSchema } from "@/lib/seo";
import GeoCanonicalSummaries from "@/components/seo/GeoCanonicalSummaries";

const AboutPage = () => {
  const navigate = useNavigate();
  const structuredData = [
    getPersonSchema(),
    getFAQSchema(GEO_CANONICAL_SUMMARIES.map((s) => ({ question: s.question, answer: s.answer }))),
    getSpeakableSchema(["#geo-canonical-heading", "[data-speakable]"]),
  ];

  return (
    <div className="min-h-screen bg-background about-page">
      <SEOHead meta={PAGE_SEO.about} structuredData={structuredData} />
      <AboutScrollProgress />
      <Navigation />

      <div className="fixed bottom-6 left-6 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/chatbot")}
          className="gap-2 glass-strong border-border/50 hover:border-primary/40 shadow-lg backdrop-blur-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      <AboutHero />
      <AboutQuoteMarquee />
      <AboutInspire />
      <AboutFounderStory />
      <GeoCanonicalSummaries />
      <Separator className="max-w-4xl mx-auto opacity-30" />
      <AboutStats />
      <Separator className="max-w-4xl mx-auto opacity-30" />
      <AboutMission />
      <AboutUserFeedback />
      <AboutSpotlight />
      <AboutCoFounderSpotlight />
      <AboutTimeline />
      <Separator className="max-w-4xl mx-auto opacity-30" />
      <AboutSkills />
      <AboutStack />
      <AboutProof />
      <AboutTeam />
      <Separator className="max-w-4xl mx-auto opacity-30" />
      <AboutProjects />
      <AboutForms />
      <AboutCTA />
      <Footer />
    </div>
  );
};

export default AboutPage;
