import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Calendar,
  Lock,
  EyeOff,
  Server,
  Key,
  Trash2,
  Cpu,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";

interface PolicySection {
  id: string;
  title: string;
  content: string;
}

const PRIVACY_SECTIONS: PolicySection[] = [
  {
    id: "section-1",
    title: "1. Overview & Transparency Commitment",
    content: `
This Privacy Policy describes how ShadowTalk AI ("ShadowTalk", "we", "us", or "our") collects, uses, processes, and safeguards information when you use our web application, AI workspace, APIs, and mission execution services.

We believe in complete transparency regarding AI telemetry and data flows. When you interact with multi-model agents in ShadowTalk, your prompts are transmitted to frontier inference providers to generate responses, while your local keys, encrypted vault items, and memory caches are maintained under strict client-side controls.

By accessing or using ShadowTalk AI, you acknowledge the data collection and processing practices described in this policy.
    `,
  },
  {
    id: "section-2",
    title: "2. Information We Collect",
    content: `
We collect information in the following categories:

### A. Account & Identity Information
- Email address, profile handle, and authentication metadata when creating an account via email or OAuth providers.
- Subscription tier status and transaction identifiers processed through our billing partners (we do not store raw credit card numbers).

### B. Workspace Prompts & Conversation History
- Prompts, input instructions, uploaded files, and contextual system instructions you submit to the chatbot.
- Model-generated responses, reasoning traces, and mission execution logs generated during your active sessions.
- In-memory workspace configurations, active agent mission definitions, and user-defined tool parameters.

### C. Technical & Telemetry Data
- Device hardware parameters (browser user agent, screen resolution, operating system version).
- WebGPU compatibility metrics (used to determine whether on-device browser LLM execution is feasible).
- IP addresses, connection latency, crash logs, and API response timings necessary for load balancing and abuse mitigation.

### D. Client-Side Keys & Vault Data
- ****: API keys you supply for external providers (e.g., Groq, OpenAI, OpenRouter, Google Gemini) are saved in your browser's local sandbox storage and never transmitted to our backend databases.
- **Private Vault Records**: Private credentials and secrets stored in the on-device vault are encrypted client-side using AES-GCM-256 before persistence.
    `,
  },
  {
    id: "section-3",
    title: "3. How We Process & Dispatch Your Information",
    content: `
We process data strictly to provide, maintain, and enhance our services:

1. **AI Model Inference**: When you submit a query, the prompt and any content you attach are sent to the provider selected for that feature. BYOK requests go directly to the configured provider; shared AI requests go through the configured ShadowTalk Cloud Function and its upstream provider.
2. **Provider Practices**: Data retention, training use, and processing location depend on the provider and account terms you select. Review that provider's current policy before sending sensitive content; ShadowTalk cannot promise a uniform provider retention period.
3. **Agent Orchestration**: Autonomous agent loops process multi-step instructions to trigger integrated tools (e.g., web search, code execution, slide deck generation).
4. **Platform Security & Abuse Prevention**: We analyze request volume, rate limits, and network anomalies to protect our systems from denial-of-service attacks and malicious exploit payloads.
    `,
  },
  {
    id: "section-4",
    title: "4. Data Storage, Encryption & Security Architecture",
    content: `
We implement layered defense-in-depth security measures to protect your data:

- **Encryption in Transit**: Firebase SDK and provider connections use their configured HTTPS/TLS endpoints. The repository does not establish a single protocol version for every connection.
- **Client-Side Secret Encryption**: Vault items utilize authenticated Web Crypto API primitives (AES-GCM with 256-bit keys derived via PBKDF2/SHA-256).
- **Session Sandboxing**: Code generated and executed inside our developer scratchpads runs within sandboxed browser workers with restricted network permissions.
- **Infrastructure Safeguards**: Firebase services provide the app's authentication, Firestore, Storage, Cloud Functions, and Hosting. Review Google's current service terms and security documentation for their controls and certifications.
    `,
  },
  {
    id: "section-5",
    title: "5. Sub-Processors & Third-Party Service Providers",
    content: `
To deliver high-speed multi-model AI capabilities, we partner with verified sub-processors bound by strict data processing agreements:

| Service Provider | Role / Purpose | Processing Location |
| :--- | :--- | :--- |
| **Google Firebase / Google Cloud** | Authentication, database, file storage, Cloud Functions, and Hosting | Set by Google service configuration and terms |
| **AI providers selected by the user or enabled for a feature** | Inference for direct BYOK requests or explicitly selected shared AI | Varies by provider and user configuration |
| **Other integrations** | Used only when a user invokes a feature that connects to that service | Varies by integration |

The app repository does not identify a complete, contract-verified subprocessor list or processing location for every optional integration. Check the provider's terms before use.
    `,
  },
  {
    id: "section-6",
    title: "6. Data Retention, Local Purging & Right to Erasure",
    content: `
You maintain full control over the lifespan of your data:

- **Local Storage Control**: You can purge all cached conversation transcriptskeys, and mission states at any moment via your browser settings or our [GDPR Management Page](/gdpr).
- **Server-Side Accounts**: Active account profiles and cloud sync records are retained while your account remains open. When account deletion succeeds, the app removes records matched to your account in its configured Firestore collections, your Firebase profile and role documents, private payment receipt files, and then the Firebase Authentication account. If cleanup fails, deletion reports an error and keeps the sign-in available so you can retry. Data held by external AI or payment providers follows those providers' retention practices; account deletion cannot erase their independent records.
- **Local Data**: Browser-local caches are stored on the device. Account deletion removes local-storage entries whose keys are namespaced with the account ID on the device where deletion is performed; browser databases and data on other devices may require separate local removal.
    `,
  },
  {
    id: "section-7",
    title: "7. Your Rights Under Global Regulations (GDPR, CCPA, APPI)",
    content: `
Regardless of your country of residence, ShadowTalk provides you with comprehensive data subject rights:

- **Right to Access & Portability**: Request a machine-readable JSON copy of your stored account data and conversation history.
- **Right to Rectification**: Update your name, email, or account settings at any time.
- **Right to Erasure ("Right to Be Forgotten")**: Permanently wipe all personal data and conversation memories associated with your identity.
- **Right to Restrict Processing**: Disable optional telemetry, analytics cookies, or cloud sync in favor of local-only browser storage.
- **Right to Lodge a Complaint**: You have the right to contact your local Data Protection Authority regarding our data processing practices.

To exercise any of these rights immediately, visit our interactive [GDPR Portal](/gdpr) or email our Data Protection Officer at **shadowtalk@shadowtalk-ai.com**.
    `,
  },
  {
    id: "section-8",
    title: "8. Children's Privacy",
    content: `
ShadowTalk AI is not directed to children under the age of 13 (or 16 in the European Economic Area). We do not knowingly collect personal identifiable information from minors. If we discover that a child has provided us with personal data without parental consent, we will promptly delete such records from our infrastructure.
    `,
  },
  {
    id: "section-9",
    title: "9. Updates to this Privacy Policy",
    content: `
We may periodically update this policy to reflect changes in our operational technologies, legal obligations, or new AI model integrations. When material updates are made, we will revise the "Last Revised" date at the top of this document and provide prominent in-app notification banners. Continued use of ShadowTalk AI after the effective date constitutes acceptance of the revised terms.
    `,
  },
  {
    id: "section-10",
    title: "10. Contact Our Data Protection Team",
    content: `
If you have questions, feedback, or privacy-related requests, please contact our Data Protection Officer and Founder:

- **Entity**: ShadowTalk AI
- **Founder & DPO**: Zain Ahmed Fahad Patel
- **Dedicated Privacy Email**: shadowtalk@shadowtalk-ai.com
- **Physical Headquarters**: Karachi, Pakistan
- **Response SLA**: All formal data privacy inquiries are acknowledged within 48 business hours.
    `,
  },
];

export const PrivacyPolicyPage = () => {
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
      <SEOHead meta={PAGE_SEO.privacy} />
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
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Data Governance & Transparency
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Privacy <span className="gradient-text">Policy</span>
            </h1>

            <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground mb-6">
              <Calendar className="h-3.5 w-3.5" />
              <span>Last Revised: {lastUpdated}</span>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We provide complete transparency into our data pipelines, AI model inference, 
              client-side encryption, and your international privacy rights.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Transparency Guarantee Callouts */}
      <section className="py-4 px-4">
        <div className="container mx-auto max-w-5xl">
          <Card className="glass-subtle border-primary/30 p-6 bg-gradient-to-r from-primary/10 via-background to-secondary/10">
            <div className="grid sm:grid-cols-4 gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Zero Model Training
                </span>
                <p className="text-xs text-muted-foreground">Your prompts and business records are never used to train public LLMs.</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Key className="h-4 w-4" /> Client-Side 
                </span>
                <p className="text-xs text-muted-foreground">External API keys remain sandboxed inside your local browser storage.</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Lock className="h-4 w-4" /> AES-256 Vault
                </span>
                <p className="text-xs text-muted-foreground">On-device vault items are encrypted on-device before persistence.</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Trash2 className="h-4 w-4" /> Instant Erasure
                </span>
                <p className="text-xs text-muted-foreground">Purge local caches or request full account deletion at any time.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Main Content Layout with Sticky Sidebar */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Table of Contents Sidebar */}
            <aside className="lg:col-span-4 hidden lg:block">
              <div className="sticky top-28 space-y-4">
                <Card className="glass-subtle border-border/40 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Policy Navigation
                  </h3>
                  <nav className="space-y-1">
                    {PRIVACY_SECTIONS.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full text-left text-xs py-2 px-2.5 rounded transition-colors ${
                          activeSection === section.id
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </nav>
                </Card>

                {/* Related Legal Links */}
                <Card className="glass-subtle border-border/40 p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Related Legal Resources</div>
                  <Link
                    to="/gdpr"
                    className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    <span>GDPR & Subject Rights Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Link
                    to="/cookies"
                    className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    <span>Cookie Policy & Preferences</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Link
                    to="/terms"
                    className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    <span>Terms of Service</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Link
                    to="/contact"
                    className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    <span>Contact Privacy Officer</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Card>
              </div>
            </aside>

            {/* Policy Clauses Body */}
            <main className="lg:col-span-8 space-y-6">
              {PRIVACY_SECTIONS.map((section) => (
                <Card
                  key={section.id}
                  id={section.id}
                  className="glass-subtle border-border/40 p-6 scroll-mt-28 hover:border-primary/30 transition-colors"
                >
                  <h2 className="text-xl font-bold tracking-tight text-foreground mb-4 border-b border-border/30 pb-3 flex items-center justify-between">
                    <span>{section.title}</span>
                  </h2>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line space-y-3 font-sans">
                    {section.content}
                  </div>
                </Card>
              ))}

              {/* Action Banner */}
              <Card className="glass-subtle border-primary/40 p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-base font-semibold">Need to manage or export your personal data?</h3>
                    <p className="text-xs text-muted-foreground">
                      Use our self-service tools to export data in JSON format or purge local browser caches.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/gdpr")}
                      className="border-primary/40 hover:bg-primary/20 gap-1 text-xs"
                    >
                      GDPR Portal <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate("/contact")}
                      className="gap-1 text-xs"
                    >
                      Contact DPO
                    </Button>
                  </div>
                </div>
              </Card>
            </main>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
