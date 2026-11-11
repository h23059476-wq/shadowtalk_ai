import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Code,
  Briefcase,
  Search,
  ExternalLink,
  Target,
  Sparkles,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";

interface CaseStudy {
  id: string;
  title: string;
  industry: "Fintech & Strategy" | "Developer Tooling" | "Research & Legal" | "E-Commerce";
  persona: string;
  companyContext: string;
  problem: string;
  solution: string;
  outcome: string;
  metrics: { label: string; value: string }[];
  framework: string;
  ctaPrompt: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "cs-1",
    title: "Scaling Cross-Border GTM & Investor Materials for B2B SaaS",
    industry: "Fintech & Strategy",
    persona: "Founders & Corporate Development",
    companyContext: "Series A cross-border payments startup operating between MENA and South Asia.",
    problem: "Founders spent 25+ hours weekly compiling competitive intelligence across multiple local regulatory regimes, juggling separate subscriptions for Perplexity, ChatGPT, and designer tools.",
    solution: "Deployed ShadowTalk Strategy Agent + Presentation Builder. The team configured automated weekly research missions to extract regulatory shifts, benchmark competitor fee structures, and generate structured slide outlines in one flow.",
    outcome: "Reduced deck preparation time from 4 days to 45 minutes while improving regional regulatory diligence accuracy.",
    metrics: [
      { label: "Hours Saved / Week", value: "24 hrs" },
      { label: "Deck Turnaround", value: "90% faster" },
      { label: "Tool Consolidation", value: "4 tools → 1" },
    ],
    framework: "Problem: Fragmented research tabs → Solution: Autonomous Strategy Agent mission → Outcome: Single-session board-ready deliverables.",
    ctaPrompt: "Analyze competitor pricing for cross-border B2B payments in MENA and build an executive brief.",
  },
  {
    id: "cs-2",
    title: "Accelerating Full-Stack Engineering Cycles with In-Browser Sandboxes",
    industry: "Developer Tooling",
    persona: "Senior Engineering Leads",
    companyContext: "Distributed team of 14 engineers building data pipelines and customer integration SDKs.",
    problem: "Developers frequently faced sandbox setup drift, requiring 20+ minutes just to spin up isolated environments for evaluating client webhook snippets and test scripts.",
    solution: "Integrated ShadowTalk Code IDE and Computer Mode (WebContainer). Engineers run real Node/Python shells directly inside the browser, passing API output immediately into chat for debugging.",
    outcome: "Integration testing velocity increased by 3.4x with zero local environment contamination.",
    metrics: [
      { label: "Environment Setup", value: "< 2 seconds" },
      { label: "Bug Resolution Speed", value: "+45%" },
      { label: "Developer Adoption", value: "100%" },
    ],
    framework: "Problem: Local setup latency & environment drift → Solution: WebContainer npm/node browser shell → Outcome: Instant script execution.",
    ctaPrompt: "Write an Express webhook handler that verifies HMAC signatures and runs test assertions.",
  },
  {
    id: "cs-3",
    title: "Multi-Source Deep Web Synthesis for Legal & Compliance Audits",
    industry: "Research & Legal",
    persona: "Compliance Officers & Counsel",
    companyContext: "Boutique advisory firm performing compliance audits across EU GDPR, CCPA, and regional laws.",
    problem: "Auditors required verifiable citations and full source bibliographies for every claim in their client deliverables, making typical chat models prone to hallucination risks.",
    solution: "Utilized ShadowTalk Deep Research with cited bibliographies and DeepSeek R1 chain-of-thought verification to inspect statutory sources and case precedents.",
    outcome: "Audit teams produced 40-page compliant regulatory memoranda in under 2 hours with 100% cited backing.",
    metrics: [
      { label: "Citation Verifiability", value: "100% cited" },
      { label: "Report Turnaround", value: "85% faster" },
      { label: "Compliance Risk", value: "Near-Zero" },
    ],
    framework: "Problem: Hallucinated claims in legal research → Solution: Deep Research engine with verifiable links → Outcome: Audit-grade compliance briefs.",
    ctaPrompt: "Synthesize statutory cross-border data transfer rules under EU GDPR and UK adequacy regulations.",
  },
  {
    id: "cs-4",
    title: "Zero-Telemetry Corporate Intelligence with & Client-Side Vault",
    industry: "E-Commerce",
    persona: "Enterprise CTOs & Data Directors",
    companyContext: "Omnichannel e-commerce retailer managing proprietary sales models and customer SKU trends.",
    problem: "Corporate policy prohibited sharing proprietary merchandising figures with public LLM vendors due to training and data retention fears.",
    solution: "Implemented ShadowTalk with  and client-side encrypted Business Memory. Key credentials and memory states remain inside the company's browser sandbox.",
    outcome: "Full enterprise AI adoption across 8 business units with absolute compliance with strict zero-training policies.",
    metrics: [
      { label: "Data Leakage Risk", value: "0%" },
      { label: "Internal Adoption", value: "250+ users" },
      { label: "API Cost Savings", value: "Zero Markup" },
    ],
    framework: "Problem: Corporate data privacy barriers → Solution: direct endpoint routing + client-side encrypted memory → Outcome: Safe enterprise scale.",
    ctaPrompt: "Forecast quarterly SKU replenishment demand based on seasonal inventory patterns.",
  },
];

const INDUSTRIES = ["All", "Fintech & Strategy", "Developer Tooling", "Research & Legal", "E-Commerce"];

export const CaseStudiesPage = () => {
  const navigate = useNavigate();
  const [activeIndustry, setActiveIndustry] = useState("All");

  const filteredStudies = useMemo(() => {
    if (activeIndustry === "All") return CASE_STUDIES;
    return CASE_STUDIES.filter((cs) => cs.industry === activeIndustry);
  }, [activeIndustry]);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.caseStudies} />
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

        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 glass-subtle border-primary/30 text-primary py-1 px-3">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Verified Enterprise & Builder Case Studies
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Real Workflows. <span className="gradient-text">Measurable ROI.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Explore how software engineers, venture founders, compliance leaders, and fast-moving teams 
              use ShadowTalk to eliminate fragmented tabs and automate complex objectives.
            </p>

            {/* Aggregate Metric Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { value: "85%", label: "Faster Research Velocity", sub: "Multi-source synthesis" },
                { value: "10x", label: "Workflow Throughput", sub: "Autonomous agents" },
                { value: "40+ hrs", label: "Saved per Engineer/Mo", sub: "In-browser shell & IDE" },
                { value: "100%", label: "Client Data Sovereignty", sub: "& Local Memory" },
              ].map((stat, i) => (
                <div key={i} className="glass-subtle rounded-xl p-4 border border-border/50 text-center">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-xs font-semibold text-foreground mt-1">{stat.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Industry Filter Tabs */}
      <section className="py-4 px-4 border-y border-border/40 bg-muted/5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start sm:justify-center flex-wrap">
            {INDUSTRIES.map((ind) => {
              const isActive = activeIndustry === ind;
              return (
                <button
                  key={ind}
                  onClick={() => setActiveIndustry(ind)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "glass-subtle text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  {ind}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Case Studies Detailed Cards */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-10">
          {filteredStudies.map((study, idx) => (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
            >
              <Card className="glass-subtle border-border/50 hover:border-primary/40 transition-all duration-300 shadow-elevated overflow-hidden">
                <CardHeader className="p-6 sm:p-8 pb-4 border-b border-border/30">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                        {study.industry}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {study.persona}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">PSOF Verified</span>
                  </div>

                  <CardTitle className="text-2xl sm:text-3xl font-bold leading-tight">
                    {study.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground/90 mt-1">
                    {study.companyContext}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Problem vs Solution vs Outcome */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        The Problem
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {study.problem}
                      </p>
                    </div>

                    <div className="space-y-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        The Solution
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {study.solution}
                      </p>
                    </div>

                    <div className="space-y-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        The Outcome
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {study.outcome}
                      </p>
                    </div>
                  </div>

                  {/* Quantitative Metrics Bar */}
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/30">
                    {study.metrics.map((m, i) => (
                      <div key={i} className="text-center p-3 rounded-lg glass-subtle border border-border/30">
                        <div className="text-lg sm:text-2xl font-bold text-foreground">{m.value}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Framework & Direct CTA */}
                  <div className="pt-4 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground/80 italic max-w-xl">
                      <strong>Framework Insight:</strong> {study.framework}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 text-xs shadow-md"
                    >
                      <Link to={`/chatbot?prompt=${encodeURIComponent(study.ctaPrompt)}`}>
                        Test This Workflow &rarr;
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Enterprise CTA Footer */}
      <section className="py-14 px-4 bg-muted/5 border-t border-border/40">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="glass-subtle border-primary/30 p-8 bg-gradient-to-br from-primary/10 via-transparent to-accent/5">
            <h3 className="text-2xl font-bold mb-2">Have a unique enterprise workflow?</h3>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
              Our engineering team routinely develops custom tool graph connectors and dedicated model instances for enterprise deployments.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground font-medium shadow-md">
                <Link to="/chatbot">Open Free Workspace</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">Schedule Technical Briefing</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CaseStudiesPage;
