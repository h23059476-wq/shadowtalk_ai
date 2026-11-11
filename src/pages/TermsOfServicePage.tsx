import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Scale,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Lock,
  Layers,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";

interface TermSection {
  id: string;
  title: string;
  content: string;
}

const TERMS_SECTIONS: TermSection[] = [
  {
    id: "section-1",
    title: "1. Acceptance of Terms & Eligibility",
    content: `
By creating an account, accessing, or using ShadowTalk AI (the "Service"), you agree to be legally bound by these Terms of Service ("Terms"). If you disagree with any provision of these Terms, you must immediately discontinue all access to and use of the Service.

**Eligibility**: You represent and warrant that you are at least 13 years of age, or the age of legal majority in your jurisdiction, whichever is greater. If you are accepting these Terms on behalf of an enterprise, company, or legal entity, you represent that you possess full legal authority to bind that entity to these Terms.
    `,
  },
  {
    id: "section-2",
    title: "2. Description of Services & Multi-Model Architecture",
    content: `
ShadowTalk AI provides a software workspace designed for agentic AI workflows, including:
- Natural-language access to multiple frontier AI models (including Groq-accelerated Llama, DeepSeek reasoning, OpenAI multimodal engines, and client-side WebGPU edge runtimes).
- Autonomous agent execution via Sense, Evaluate, Execute loops.
- Integrated tool graph capabilities (web search, deep research, sandboxed code execution, slide generation).
- Long-term workspace context management via Business Memory and on-device Shadow Memory.

We reserve the right to modify, upgrade, or deprecate specific model versions, features, or tool integrations as technological standards evolve.
    `,
  },
  {
    id: "section-3",
    title: "3. User Accounts & Security Responsibilities",
    content: `
To access advanced capabilities, you must authenticate through an authorized provider (such as email/password or OAuth). You agree to:
- Provide accurate, complete, and truthful account credentials.
- Maintain the absolute confidentiality of your authentication credentials and API keys.
- Accept sole responsibility for all activities, token consumption, and outputs generated under your account credentials.
- Notify our support team immediately at **shadowtalk@shadowtalk-ai.com** if you suspect any unauthorized breach of your account.
    `,
  },
  {
    id: "section-4",
    title: "4. Acceptable Use Policy",
    content: `
You agree not to misuse the Service or facilitate any of the following prohibited activities:
- Generating malware, malicious exploit scripts, ransomware, or coordinating unauthorized cyberattacks.
- Generating deceptive impersonations, defamatory disinformation, or fraudulent financial schemes.
- Attempting to reverse engineer, decompile, or extract proprietary model weights or source code from our infrastructure without explicit written permission.
- Submitting abusive automated denial-of-service (DoS) traffic that disrupts normal operations for other users.
- Generating content that infringes upon third-party copyrights, trademarks, or trade secrets.
    `,
  },
  {
    id: "section-5",
    title: "5. Intellectual Property & 100% User Output Ownership",
    content: `
**Your Ownership of Generated Outputs**: As between you and ShadowTalk AI, you retain **100% intellectual property ownership** of all prompts, custom memory contexts, code files, slide presentations, and textual outputs generated through your use of the Service. ShadowTalk claims zero copyright over your creations.

**Platform Ownership**: The ShadowTalk AI platform interface, proprietary agentic orchestration software, logos, trade dress, and system documentation remain the exclusive intellectual property of ShadowTalk AI and its founder.

**No Model Training on User Data**: We do not use your proprietary business conversations or private memory slots to train public foundation models.
    `,
  },
  {
    id: "section-6",
    title: "6. Free Access, BYOK and Provider Costs",
    content: `
**Free access**: ShadowTalk AI is provided free of charge. There are no subscriptions, no paid tiers, and no checkout. We do not collect payment information.

**Bring your own key (BYOK)**: AI features require you to connect your own AI provider API key. You are responsible for that key, for complying with the provider's terms, and for any charges the provider bills you directly. ShadowTalk AI never resells AI inference and never marks up provider costs.

**No refunds**: Because ShadowTalk AI collects no payments, there is nothing to refund. Disputes about provider API charges must be resolved with your provider.
    `,
  },
  {
    id: "section-7",
    title: "7. API Access & ",
    content: `
Users utilizing  configurations:
- Acknowledge that API keys are stored client-side in their browser's secure sandbox.
- Remain solely responsible for monitoring direct billing, token consumption, and rate limits incurred directly with their third-party AI model providers (Groq, OpenAI, Anthropic).
- Indemnify ShadowTalk AI against any unauthorized API expenditures resulting from compromised local client environments.
    `,
  },
  {
    id: "section-8",
    title: "8. Autonomous Missions & Human-in-the-Loop Safeguards",
    content: `
ShadowTalk's autonomous agents operate on an execution loop. While ShadowTalk incorporates strict Human-in-the-Loop (HITL) approval gates for high-risk operations, you acknowledge that autonomous agents execute commands according to your natural language instructions. You are responsible for inspecting and approving agent task graphs prior to execution.
    `,
  },
  {
    id: "section-9",
    title: "9. Limitation of Liability & Disclaimers",
    content: `
**"AS IS" Basis**: THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. AI OUTPUTS ARE PROBABILISTIC IN NATURE; YOU ARE RESPONSIBLE FOR VERIFYING CODE, FINANCIAL, OR LEGAL FACTUALITY BEFORE RELYING UPON THEM.

**Liability Cap**: TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SHADOWTALK AI, ITS FOUNDER, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE TOTAL FEES ACTUALLY PAID BY YOU TO SHADOWTALK AI IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
    `,
  },
  {
    id: "section-10",
    title: "10. Governing Law, Dispute Resolution & Contact",
    content: `
These Terms shall be governed by and construed in accordance with applicable commercial and international contract principles. Any dispute arising out of or relating to these Terms shall first be submitted to good-faith informal negotiation between the parties.

For legal notices, terms inquiries, or formal communication:
- **Entity**: ShadowTalk AI (Zain Ahmed Fahad Patel)
- **Legal Email**: shadowtalk@shadowtalk-ai.com
- **Physical Headquarters**: Karachi, Pakistan
    `,
  },
];

export const TermsOfServicePage = () => {
  const navigate = useNavigate();
  const lastUpdated = "February 28, 2026";
  const [activeSection, setActiveSection] = useState<string>("section-1");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.terms} />
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
            <Badge variant="outline" className="mb-4 glass-subtle border-primary/30 text-primary py-1 px-3">
              <Scale className="h-3.5 w-3.5 mr-1.5" />
              Legal & Platform Governance
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Terms of <span className="gradient-text">Service</span>
            </h1>

            <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground mb-6">
              <Calendar className="h-3.5 w-3.5" />
              <span>Last Revised: {lastUpdated}</span>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              These terms establish the legal agreement between you and ShadowTalk AI. 
              Please read them carefully before utilizing our workspace and models.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Principles Summary Callout */}
      <section className="py-4 px-4">
        <div className="container mx-auto max-w-5xl">
          <Card className="glass-subtle border-primary/30 p-6 bg-gradient-to-r from-primary/10 via-background to-secondary/10">
            <div className="grid sm:grid-cols-3 gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> 100% User Ownership
                </span>
                <p className="text-xs text-muted-foreground">You retain total intellectual property rights to all AI outputs generated.</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Nothing to Pay
                </span>
                <p className="text-xs text-muted-foreground">ShadowTalk AI is free to use — no subscriptions, no invoices. Provider API charges are billed by your provider.</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Zero Model Training
                </span>
                <p className="text-xs text-muted-foreground">Your business memory and conversations are never used to train public foundation models.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Main Content with Sticky TOC */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Sticky Table of Contents */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-2">
              <Card className="glass-subtle border-border/50 p-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 px-2">
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {TERMS_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate ${
                        activeSection === sec.id
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {sec.title}
                    </button>
                  ))}
                </nav>
              </Card>

              <Card className="glass-subtle border-border/50 p-4 text-xs space-y-2">
                <p className="font-semibold text-foreground">Need legal clarification?</p>
                <p className="text-muted-foreground">Our team responds promptly to all enterprise compliance and contractual inquiries.</p>
                <Button asChild variant="outline" size="sm" className="w-full text-xs mt-1">
                  <Link to="/contact">Contact Legal Counsel</Link>
                </Button>
              </Card>
            </div>

            {/* Terms Articles Content */}
            <div className="lg:col-span-8 space-y-8">
              {TERMS_SECTIONS.map((sec) => (
                <Card
                  key={sec.id}
                  id={sec.id}
                  className="glass-subtle border-border/50 p-6 sm:p-8 scroll-mt-24"
                >
                  <h3 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border/40">
                    {sec.title}
                  </h3>
                  <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed text-xs sm:text-sm space-y-3">
                    {sec.content.split("\n\n").map((para, i) => {
                      const trimmed = para.trim();
                      if (trimmed.startsWith("- ")) {
                        return (
                          <ul key={i} className="list-disc pl-5 space-y-1">
                            {trimmed.split("\n- ").map((item, j) => (
                              <li key={j}>{item.replace(/^- /, "")}</li>
                            ))}
                          </ul>
                        );
                      }
                      return <p key={i}>{trimmed}</p>;
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
