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

const FEATURES = [
  { icon: KeyRound, title: "SSO / SAML", body: "SAML 2.0, OIDC, and Google Workspace. SCIM provisioning for automated user lifecycle." },
  { icon: Server, title: "Dedicated Infrastructure", body: "Single-tenant deployment with isolated compute, storage, and network paths." },
  { icon: ShieldCheck, title: "SLA Guarantee", body: "99.95% uptime SLA with service credits and 24/7 incident response." },
  { icon: Brain, title: "Custom Models", body: "Fine-tune on your corpus, host private model endpoints, and pin model versions." },
  { icon: Users, title: "Team Workspaces", body: "Shared memory, role-based access, audit logs, and per-team usage analytics." },
  { icon: Headphones, title: "Priority Support", body: "Named CSM, dedicated Slack channel, and 1-hour P1 response time." },
  { icon: FileLock2, title: "Compliance (GDPR / SOC 2)", body: "DPA, SCCs, SOC 2 Type II, and regional data residency options." },
  { icon: Code2, title: "API Access", body: "Unlimited API calls, BYOK or pooled, plus webhooks and signed audit exports." },
];

type Cell = boolean | string;

const COMPARISON_ROWS: { label: string; premium: Cell; elite: Cell; enterprise: Cell }[] = [
  { label: "Monthly messages", premium: "1,000", elite: "25,000", enterprise: "Unlimited" },
  { label: "SSO / SAML", premium: false, elite: false, enterprise: true },
  { label: "Dedicated infrastructure", premium: false, elite: false, enterprise: true },
  { label: "SLA guarantee", premium: false, elite: "99.5%", enterprise: "99.95%" },
  { label: "Custom models", premium: false, elite: false, enterprise: true },
  { label: "Team workspaces", premium: "1", elite: "5", enterprise: "Unlimited" },
  { label: "Priority support", premium: "Email", elite: "Priority queue", enterprise: "Named CSM + Slack" },
  { label: "Compliance (GDPR / SOC 2)", premium: false, elite: "GDPR", enterprise: "GDPR + SOC 2" },
  { label: "API access", premium: false, elite: true, enterprise: true },
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
            "ShadowTalk AI for Enterprise: SSO/SAML, dedicated infrastructure, 99.95% SLA, custom models, team workspaces, priority support, GDPR/SOC 2 compliance, and unlimited API access. Contact sales for custom pricing.",
          canonical: "https://www.shadowtalk-ai.com/enterprise",
          keywords: ["enterprise AI", "SSO SAML", "SOC 2", "dedicated infrastructure", "team workspaces"],
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
              Sovereign, compliant, and built for scale. Deploy ShadowTalk across your organization
              with SSO, dedicated infrastructure, and SOC 2-grade controls.
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
