/**
 * EnterprisePage — Enterprise tier landing page for ShadowTalk AI.
 *
 * Hero, feature grid, comparison table (Enterprise vs Elite vs Premium),
 * pricing block, and a Contact Sales CTA.
 *
 * Route: /enterprise
 */

import { motion } from "framer-motion";
import {
  Building2,
  KeyRound,
  Server,
  ShieldCheck,
  Brain,
  Users,
  Headphones,
  FileLock2,
  Code2,
  Mail,
  Check,
  Minus,
  ArrowRight,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

// Free-access transition + audit findings: enterprise compliance claims
// (SOC 2 Type II, 99.95% SLA, DPA, SCCs, dedicated infrastructure, SSO/SAML,
// custom models) are not yet substantiated by third-party audits or
// implementation. They have been rewritten to describe what ShadowTalk
// actually offers today (BYOK, E2EE vault, account deletion, contact-email
// support) plus the founder's intention to scope enterprise needs via
// a sales conversation. See docs/audit/CLAIMS_REALITY_REPORT.md P1-6.
const FEATURES = [
  { icon: KeyRound, title: "BYOK + Provider Choice", body: "Bring your own OpenAI, Anthropic, Google, Groq, OpenRouter, or 11+ other provider API keys. Keys are stored encrypted in your browser; providers may charge separately for usage." },
  { icon: ShieldCheck, title: "End-to-End Encrypted Vault", body: "Opt-in E2EE vault (PBKDF2 100k + AES-GCM 256-bit) for sensitive chat content. Keys are held in-memory only and never leave the device." },
  { icon: Server, title: "On-Premise / Offline Option", body: "WebGPU / WebLLM models run entirely on-device with zero network egress. No silent cloud fallback — privacy-conscious users stay in control." },
  { icon: Brain, title: "Multi-Provider Routing", body: "Per-conversation provider and model selection across 16+ providers, with shared OpenRouter gateway (100 requests/day) as a free fallback for users without their own key." },
  { icon: Users, title: "Per-User Memory", body: "IndexedDB-backed ShadowMemory with JSON/CSV/logs export. Per-user activity ledger, distinct from shared team workspaces (which are on the roadmap, not yet shipped)." },
  { icon: Headphones, title: "Email Support", body: "Contact support via shadowtalk@shadowtalk-ai.com. Phone, dedicated CSM, and Slack channel support are not yet available." },
  { icon: FileLock2, title: "GDPR-Grade Account Deletion", body: "Real recursive Firestore + Storage cleanup with 5-minute auth-freshness check and 540s timeout. SOC 2 Type II, formal DPA, and SCCs are not yet audited — contact sales for current compliance status." },
  { icon: Code2, title: "PWA + APIs", body: "Installable PWA, Firebase Auth (Google, Apple, email/password), real-time chat with SSE streaming, image generation, document generation with PDF export, and ProofLoop verification engine." },
];

type Cell = boolean | string;

// Free-access transition: ShadowTalk AI is free to use. There are no
// Premium / Elite / Enterprise tiers anymore. The comparison table
// below has been replaced with a single "free-access" column showing
// what every user gets. See docs/audit/CLAIMS_REALITY_REPORT.md P1-1, P1-6.
const COMPARISON_ROWS: { label: string; premium: Cell; elite: Cell; enterprise: Cell }[] = [
  { label: "Daily messages (shared tier)", premium: "100", elite: "100", enterprise: "100" },
  { label: "Unlimited messages (BYOK)", premium: true, elite: true, enterprise: true },
  { label: "E2EE encrypted vault", premium: true, elite: true, enterprise: true },
  { label: "Offline WebLLM", premium: true, elite: true, enterprise: true },
  { label: "Account deletion (GDPR-grade)", premium: true, elite: true, enterprise: true },
  { label: "SSO / SAML / SCIM", premium: false, elite: false, enterprise: "On request — not yet audited" },
  { label: "Dedicated infrastructure", premium: false, elite: false, enterprise: "On request — not yet shipped" },
  { label: "SLA guarantee", premium: false, elite: false, enterprise: "Not yet offered — contact sales" },
  { label: "SOC 2 Type II", premium: false, elite: false, enterprise: "Not yet audited" },
  { label: "Phone / CSM support", premium: false, elite: false, enterprise: "Email only today" },
];

function CellView({ value }: { value: Cell }) {
  if (value === true) return <Check className="h-4 w-4 text-emerald-400 mx-auto" />;
  if (value === false) return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-slate-200">{value}</span>;
}

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Enterprise — ShadowTalk AI",
          description:
            "ShadowTalk AI for Enterprise: BYOK across 16+ providers, end-to-end encrypted vault, offline WebLLM, GDPR-grade account deletion, and contact-sales scoping for SSO, dedicated infrastructure, and compliance needs. SOC 2 Type II not yet audited.",
          canonical: "https://www.shadowtalk-ai.com/enterprise",
          keywords: ["enterprise AI", "BYOK", "end-to-end encryption", "offline AI", "GDPR account deletion"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: false,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <Building2 className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              ShadowTalk AI for Enterprise
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
              Sovereign, BYOK-first, and built for sensitive workflows. Deploy ShadowTalk across
              your organization with end-to-end encryption, on-device inference, and GDPR-grade
              account deletion. SSO, dedicated infrastructure, and formal SOC 2 audits are
              available on request — not yet shipped or audited.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button asChild className="gap-2">
                <a href="mailto:shadowtalk@shadowtalk-ai.com?subject=Enterprise%20inquiry">
                  <Mail className="h-4 w-4" />
                  Contact Sales
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">Custom pricing — contact sales</span>
            </div>
          </motion.div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.04 * i }}
                className="ios-glass-card p-5"
              >
                <div className="inline-flex p-2 rounded-lg bg-white/5 border border-border/50 mb-3">
                  <f.icon className="h-4 w-4 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{f.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Comparison table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="ios-glass-card p-6 mb-14"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Plan Comparison
            </h2>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left border-b border-border/50">
                    <th className="py-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      Premium
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      Elite
                    </th>
                    <th className="py-3 pl-3 text-xs font-semibold text-indigo-300 uppercase tracking-wider text-center">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-border/30 last:border-0">
                      <td className="py-3 pr-4 text-xs text-slate-200">{row.label}</td>
                      <td className="py-3 px-3 text-center">
                        <CellView value={row.premium} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <CellView value={row.elite} />
                      </td>
                      <td className="py-3 pl-3 text-center">
                        <CellView value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Pricing + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="ios-glass-card p-8 sm:p-10 text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight">Custom pricing — contact sales</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto leading-relaxed">
              Volume discounts, multi-year terms, and regional deployments available. Our team will
              design a plan around your usage, security, and compliance requirements.
            </p>
            <Button asChild className="mt-6 gap-2">
              <a href="mailto:shadowtalk@shadowtalk-ai.com?subject=Enterprise%20pricing%20request">
                <Mail className="h-4 w-4" />
                Contact Sales
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
