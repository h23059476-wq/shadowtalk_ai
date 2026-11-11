import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyRound, ShieldCheck, Wallet, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Formerly the Pakistan (JazzCash / Easypaisa / bank) checkout page.
 * FREE ACCESS TRANSITION: ShadowTalk AI no longer sells plans, so this route
 * now explains free access and BYOK. The route is kept for existing links.
 */
const FounderAccessPage = () => {
  return (
    <>
      <SEOHead meta={PAGE_SEO.founderAccess} />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
          <Badge variant="outline" className="mb-4 gap-1.5">
            <Sparkles className="h-3 w-3" /> Free access
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            This used to be a checkout page
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            ShadowTalk AI is now completely free — there is nothing to buy.
            No plans, no payment methods, no regional checkout. Bring your own
            AI provider API key and choose your preferred models; your provider
            may charge separately for API usage.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 mb-10">
            <Card>
              <CardContent className="p-5">
                <Wallet className="h-5 w-5 text-primary mb-3" />
                <h2 className="text-sm font-semibold mb-1.5">No payments</h2>
                <p className="text-sm text-muted-foreground">
                  ShadowTalk AI does not collect payments of any kind.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <KeyRound className="h-5 w-5 text-primary mb-3" />
                <h2 className="text-sm font-semibold mb-1.5">Bring your key</h2>
                <p className="text-sm text-muted-foreground">
                  Add your provider API key in Settings — encrypted before storage.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <ShieldCheck className="h-5 w-5 text-primary mb-3" />
                <h2 className="text-sm font-semibold mb-1.5">Full workspace</h2>
                <p className="text-sm text-muted-foreground">
                  Every feature is unlocked for every account, at no charge.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg">
              <Link to="/chatbot">Open the workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">How free access works</Link>
            </Button>
          </div>
        </main>
        <Footer />
        <ChatWidget />
      </div>
    </>
  );
};

export default FounderAccessPage;
