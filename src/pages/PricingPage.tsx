import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import PricingPageContent from "@/components/pricing/PricingPageContent";

const PricingPage = () => {
  return (
    <>
      <SEOHead meta={PAGE_SEO.pricing} />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main>
          <PricingPageContent />
        </main>
        <Footer />
        <ChatWidget />
      </div>
    </>
  );
};

export default PricingPage;
