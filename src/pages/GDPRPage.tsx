import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Calendar,
  CheckCircle2,
  Globe,
  Lock,
  FileText,
  Mail,
  Download,
  Trash2,
  Eye,
  Edit,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Server,
  UserCheck,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const GDPRPage = () => {
  const navigate = useNavigate();
  const lastUpdated = "February 28, 2026";
  const [isExporting, setIsExporting] = useState(false);

  // Interactive tool to export all personal local data stored in browser
  const handleExportPersonalData = () => {
    setIsExporting(true);
    try {
      const exportPackage: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        platform: "ShadowTalk AI",
        userProfile: localStorage.getItem("shadowtalk_user_profile") || "Anonymous Session",
        customInstructions: localStorage.getItem("shadowtalk_custom_instructions") || "None set",
        businessMemory: localStorage.getItem("shadowtalk_business_memory") || "[]",
        recentInquiries: localStorage.getItem("shadowtalk_contact_inquiries") || "[]",
        localStorageKeys: Object.keys(localStorage).filter((k) => k.startsWith("shadowtalk_")),
      };

      const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shadowtalk-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Personal data archive generated and downloaded successfully.");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate data archive.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearLocalSessionData = () => {
    if (window.confirm("Are you sure you want to clear your local session caches and device memory? This action cannot be undone.")) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("shadowtalk_"))
        .forEach((k) => localStorage.removeItem(k));
      toast.success("Local storage caches and session states purged.");
    }
  };

  const yourRights = [
    {
      icon: Eye,
      title: "1. Right of Access (Art. 15 GDPR)",
      description: "You have the right to request confirmation as to whether your personal data is being processed, and to obtain a machine-readable copy of that data.",
    },
    {
      icon: Edit,
      title: "2. Right to Rectification (Art. 16 GDPR)",
      description: "You have the right to obtain without undue delay the rectification of inaccurate personal data or completion of incomplete records.",
    },
    {
      icon: Trash2,
      title: "3. Right to Erasure / To Be Forgotten (Art. 17 GDPR)",
      description: "You have the right to request the total deletion of your personal data when it is no longer necessary for the purposes for which it was collected.",
    },
    {
      icon: Lock,
      title: "4. Right to Restriction of Processing (Art. 18 GDPR)",
      description: "You can request that we restrict the processing of your personal data under certain conditions, such as during accuracy verification.",
    },
    {
      icon: Download,
      title: "5. Right to Data Portability (Art. 20 GDPR)",
      description: "You have the right to receive your personal data in a structured, commonly used, and machine-readable JSON or CSV format.",
    },
    {
      icon: Shield,
      title: "6. Right to Object (Art. 21 GDPR)",
      description: "You have the right to object at any time to processing of your personal data based on legitimate interests or for direct marketing purposes.",
    },
  ];

  const lawfulBases = [
    {
      basis: "Performance of a Contract",
      article: "Art. 6(1)(b) GDPR",
      description: "Processing is necessary to provide the conversational AI assistant, execute requested tool calls, manage accounts, and deliver subscribed features.",
    },
    {
      basis: "Legitimate Interests",
      article: "Art. 6(1)(f) GDPR",
      description: "Processing is necessary for securing the application, preventing malicious automated abuse, and maintaining high availability across inference clusters.",
    },
    {
      basis: "Explicit Consent",
      article: "Art. 6(1)(a) GDPR",
      description: "Where you have given clear, affirmative consent for optional capabilities, such as enabling microphone input for voice conversations.",
    },
    {
      basis: "Legal Obligation",
      article: "Art. 6(1)(c) GDPR",
      description: "Processing required to comply with financial, tax, or statutory disclosure obligations under applicable laws.",
    },
  ];

  const subProcessors = [
    { name: "Google Firebase", purpose: "Authentication & Hosting Infrastructure", location: "Global / US / EU" },
    { name: "Groq Cloud Inc.", purpose: "Hardware Inference Compute (Llama 3.3 70B)", location: "United States" },
    { name: "OpenAI LLC", purpose: "Frontier Multimodal Gateway", location: "United States" },
    { name: "Cloudflare Inc.", purpose: "DDoS Mitigation & Edge CDN", location: "Global Edge" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.gdpr} />
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 glass-subtle border-emerald-500/30 text-emerald-400 py-1 px-3">
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              European Union & UK Data Protection Compliance
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              GDPR <span className="gradient-text">Compliance Center</span>
            </h1>

            <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground mb-6">
              <Calendar className="h-3.5 w-3.5" />
              <span>Effective Date: {lastUpdated}</span>
              <span>·</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Compliant
              </span>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              ShadowTalk AI strictly adheres to the General Data Protection Regulation (Regulation (EU) 2016/679). 
              Understand our lawful bases, inspect sub-processors, and exercise your data rights below.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Interactive Data Rights Tools Card */}
      <section className="py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-subtle border-primary/30 bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 p-6 shadow-elevated">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-lg">
                <div className="flex items-center gap-2 text-primary font-bold text-lg">
                  <UserCheck className="h-5 w-5" />
                  <h3>Exercise Your Data Subject Rights Instantly</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download a machine-readable JSON archive of all your local session parameters and business memory, 
                  or purge all client-side storage with a single click.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Button
                  onClick={handleExportPersonalData}
                  disabled={isExporting}
                  size="sm"
                  className="bg-primary text-primary-foreground text-xs gap-1.5 shadow-md"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isExporting ? "Generating..." : "Download Data (JSON)"}
                </Button>
                <Button
                  onClick={handleClearLocalSessionData}
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Purge Local Sessions
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Your 6 Data Subject Rights */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Your Rights Under GDPR</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Articles 15 through 22 of the General Data Protection Regulation guarantee comprehensive control over your personal data.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {yourRights.map((right, idx) => {
              const Icon = right.icon;
              return (
                <Card key={idx} className="glass-subtle border-border/50 p-5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5 mb-2.5 text-primary">
                    <Icon className="h-5 w-5" />
                    <h3 className="font-semibold text-sm text-foreground">{right.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{right.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lawful Bases for Processing */}
      <section className="py-10 px-4 bg-muted/5 border-y border-border/40">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Lawful Bases for Data Processing</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Under Article 6 of the GDPR, we only process personal information where a valid legal basis exists.
            </p>
          </div>

          <div className="space-y-3">
            {lawfulBases.map((base, idx) => (
              <Card key={idx} className="glass-subtle border-border/50 p-5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-base text-foreground">{base.basis}</h3>
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/50">
                    {base.article}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{base.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Authorized Sub-Processors */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Authorized Infrastructure & Sub-Processors</h2>
            <p className="text-xs text-muted-foreground mt-1">
              We contract with leading technical vendors bound by Data Processing Addendums (DPAs) and Standard Contractual Clauses.
            </p>
          </div>

          <Card className="glass-subtle border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 font-semibold text-foreground">
                    <th className="p-3.5">Sub-Processor</th>
                    <th className="p-3.5">Purpose & Function</th>
                    <th className="p-3.5">Processing Jurisdiction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-muted-foreground">
                  {subProcessors.map((sp, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3.5 font-medium text-foreground">{sp.name}</td>
                      <td className="p-3.5">{sp.purpose}</td>
                      <td className="p-3.5 font-mono">{sp.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* DPO & Contact Information */}
      <section className="py-12 px-4 bg-muted/5 border-t border-border/40">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-subtle border-border/50 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 text-primary">
              <Mail className="h-5 w-5" />
              <h3 className="text-xl font-bold text-foreground">Data Protection Officer (DPO) Contact</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              To exercise your GDPR rights, request formal data rectification, or raise an inquiry regarding cross-border 
              transfers, contact our designated Data Protection Officer:
            </p>
            <div className="bg-background/80 p-4 rounded-xl border border-border/40 space-y-1 font-mono text-xs">
              <p><strong className="text-foreground">Data Controller:</strong> ShadowTalk AI (Zain Ahmed Fahad Patel)</p>
              <p><strong className="text-foreground">Official Email:</strong> shadowtalk@shadowtalk-ai.com</p>
              <p><strong className="text-foreground">Location:</strong> Karachi, Pakistan (Serving Global Users)</p>
              <p><strong className="text-foreground">Response SLA:</strong> Within 30 calendar days pursuant to Art. 12(3) GDPR</p>
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button asChild size="sm" className="bg-primary text-primary-foreground text-xs">
                <a href="mailto:shadowtalk@shadowtalk-ai.com?subject=GDPR%20Data%20Subject%20Request">
                  Contact DPO Directly &rarr;
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to="/privacy">Read Privacy Policy</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GDPRPage;
