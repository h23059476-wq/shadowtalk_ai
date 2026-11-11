import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Cookie,
  Calendar,
  Settings,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Database,
  Lock,
  ArrowLeft,
  ArrowRight,
  Info,
  Layers,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface StorageItem {
  key: string;
  type: "Cookie" | "LocalStorage" | "IndexedDB";
  purpose: string;
  duration: string;
}

const STORAGE_DETAILS: StorageItem[] = [
  {
    key: "firebase:authUser",
    type: "LocalStorage",
    purpose: "Maintains active authentication session across page reloads.",
    duration: "Persistent until sign-out",
  },
  {
    key: "shadowtalk-ui-theme",
    type: "LocalStorage",
    purpose: "Preserves user dark/light UI color mode preferences.",
    duration: "Persistent (1 year)",
  },
  {
    key: "shadowtalk_business_memory",
    type: "LocalStorage",
    purpose: "Stores user-defined project instructions and workspace parameters.",
    duration: "Persistent on-device",
  },
  {
    key: "shadowtalk-memory (IndexedDB)",
    type: "IndexedDB",
    purpose: "Client-side cryptographic ledger for secure session activity.",
    duration: "Persistent on-device",
  },
  {
    key: "cookie_consent_preferences",
    type: "LocalStorage",
    purpose: "Stores user consent selections made in this preference manager.",
    duration: "Persistent (6 months)",
  },
];

export const CookiePolicyPage = () => {
  const navigate = useNavigate();
  const lastUpdated = "February 28, 2026";

  const [functionalEnabled, setFunctionalEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cookie_consent_preferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.functional === "boolean") setFunctionalEnabled(parsed.functional);
        if (typeof parsed.analytics === "boolean") setAnalyticsEnabled(parsed.analytics);
      }
    } catch {}
  }, []);

  const handleSavePreferences = () => {
    try {
      const pref = {
        essential: true,
        functional: functionalEnabled,
        analytics: analyticsEnabled,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("cookie_consent_preferences", JSON.stringify(pref));
      toast.success("Storage and cookie preferences saved successfully.");
    } catch {
      toast.error("Failed to persist cookie preferences.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.cookies} />
      <Navigation />

      {/* Floating Back to Chatbot */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/chatbot")}
          className="gap-2 glass-strong border-border/50 hover:border-primary/40 shadow-lg backdrop-blur-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chatbot
        </Button>
      </div>

      {/* Hero Section */}
      <section className="pt-28 pb-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dense opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 glass-subtle border-amber-500/30 text-amber-400 py-1 px-3">
              <Cookie className="h-3.5 w-3.5 mr-1.5" />
              Transparent Storage Governance
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Cookie & <span className="gradient-text">Storage Policy</span>
            </h1>

            <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground mb-6">
              <Calendar className="h-3.5 w-3.5" />
              <span>Last Revised: {lastUpdated}</span>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Understand how ShadowTalk AI utilizes HTTP cookies, browser LocalStorage, and IndexedDB 
              to provide an ultra-responsive, persistent workspace without third-party ad brokers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Interactive Cookie Preference Manager */}
      <section className="py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-subtle border-primary/30 shadow-elevated p-6 sm:p-8 bg-gradient-to-br from-primary/5 via-background to-amber-500/5">
            <div className="flex items-center gap-2.5 mb-2 text-primary">
              <Settings className="h-5 w-5" />
              <h2 className="text-xl font-bold text-foreground">Interactive Storage Preference Manager</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              You have direct control over non-essential browser storage. Customize your preferences below and click save.
            </p>

            <div className="space-y-5 divide-y divide-border/40">
              {/* Strictly Necessary */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Strictly Necessary Storage</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Required
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    Essential for authentication tokens, routing security, cross-origin isolation headers, and core application rendering. Cannot be disabled.
                  </p>
                </div>
                <Switch checked={true} disabled className="opacity-70" />
              </div>

              {/* Functional Storage */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Functional & Local Memory</span>
                    <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    Enables on-device IndexedDB caching, Business Memory prompt persistence, and theme preference recall.
                  </p>
                </div>
                <Switch
                  checked={functionalEnabled}
                  onCheckedChange={setFunctionalEnabled}
                />
              </div>

              {/* Performance Telemetry */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">First-Party Performance Telemetry</span>
                    <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    Monitors message latency, token delivery velocity, and client error logs. Never sold to third parties.
                  </p>
                </div>
                <Switch
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                />
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground font-mono">
                Status: {functionalEnabled ? "Functional On" : "Functional Off"} · {analyticsEnabled ? "Telemetry On" : "Telemetry Off"}
              </span>
              <Button onClick={handleSavePreferences} size="sm" className="bg-primary text-primary-foreground text-xs shadow-md">
                Save Preferences
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Storage Technologies Deep Dive */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Storage Technologies We Employ</h2>
            <p className="text-xs text-muted-foreground mt-1">
              ShadowTalk uses modern HTML5 web storage APIs rather than legacy tracking cookies whenever possible.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="glass-subtle border-border/50 p-5">
              <Cookie className="h-5 w-5 text-amber-400 mb-2.5" />
              <h3 className="font-bold text-sm text-foreground mb-1">HTTP Cookies</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Small text files sent by servers with <code className="text-[10px] text-primary">SameSite=Lax</code> and <code className="text-[10px] text-primary">Secure</code> attributes to guard session security.
              </p>
            </Card>

            <Card className="glass-subtle border-border/50 p-5">
              <HardDrive className="h-5 w-5 text-cyan-400 mb-2.5" />
              <h3 className="font-bold text-sm text-foreground mb-1">Web LocalStorage</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Client-side key-value sandbox stored on your device for fast UI state loading without recurring network requests.
              </p>
            </Card>

            <Card className="glass-subtle border-border/50 p-5">
              <Database className="h-5 w-5 text-purple-400 mb-2.5" />
              <h3 className="font-bold text-sm text-foreground mb-1">IndexedDB</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A structured, high-capacity client database holding local embeddings, cached models, and encrypted audit logs.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Storage Keys Disclosure Table */}
      <section className="py-10 px-4 bg-muted/5 border-y border-border/40">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Exact Storage Identifiers & Durations</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Complete disclosure of keys initialized by the application.
            </p>
          </div>

          <Card className="glass-subtle border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 font-semibold text-foreground">
                    <th className="p-3.5">Storage Key / Target</th>
                    <th className="p-3.5">Technology</th>
                    <th className="p-3.5">Primary Function</th>
                    <th className="p-3.5">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-muted-foreground">
                  {STORAGE_DETAILS.map((item, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3.5 font-mono text-foreground font-medium">{item.key}</td>
                      <td className="p-3.5 font-mono">{item.type}</td>
                      <td className="p-3.5">{item.purpose}</td>
                      <td className="p-3.5">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* Third Party Disclosure */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-subtle border-border/50 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
              <ShieldCheck className="h-5 w-5" />
              <h3>Zero Advertising Trackers Guarantee</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              ShadowTalk AI does not install tracking pixels (such as Facebook Pixel, TikTok Pixel, or advertising retargeters). 
              We do not participate in cross-site identity graphs or sell browsing behavior to data brokers.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to="/privacy">Review Full Privacy Policy</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/contact">Contact Legal & Compliance</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CookiePolicyPage;
