import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const BillingPage = () => {
  return (
    <>
      <SEOHead meta={PAGE_SEO.billing} />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
          <Badge variant="outline" className="mb-4 gap-1.5">
            <Wallet className="h-3 w-3" /> Billing
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            There is nothing to pay here
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            ShadowTalk AI is free to use. Bring your own AI provider API key and
            choose your preferred models. Your provider may charge separately for
            API usage.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 mb-10">
            <Card>
              <CardContent className="p-5">
                <Sparkles className="h-5 w-5 text-primary mb-3" />
                <h2 className="text-sm font-semibold mb-1.5">No subscriptions</h2>
                <p className="text-sm text-muted-foreground">
                  No plans, no tiers, no renewals. Your account includes every feature.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <Wallet className="h-5 w-5 text-primary mb-3" />
                <h2 className="text-sm font-semibold mb-1.5">No invoices</h2>
                <p className="text-muted-foreground text-sm">
                  ShadowTalk AI does not collect payments, so there are no bills or receipts.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <KeyRound className="h-5 w-5 text-primary mb-3" />
                <h2 className="text-sm font-semibold mb-1.5">Your provider bills you</h2>
                <p className="text-muted-foreground text-sm">
                  AI usage costs come from your provider, billed directly to you — never through us.
                </p>
              </CardContent>
            </Card>
          </div>
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Manage your AI provider keys</p>
                <p className="text-sm text-muted-foreground">
                  Add or rotate API keys in Settings. Keys are encrypted before storage.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/settings">Open Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <ChatWidget />
      </div>
    </>
  );
};

export default BillingPage;
