/**
 * PublicProofCardPage — Shareable, Privacy-Safe Proof of Completion View
 *
 * Route: /proof/:proofId and /mission/:id
 *
 * Completely public, privacy-safe verification page.
 * Never exposes private prompts, API keys, or confidential business files.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  Lock,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ProofLoopMissionEngine } from "@/lib/proofloop/missionEngine";
import type { PublicProofCard } from "@/lib/proofloop/types";

export default function PublicProofCardPage() {
  const { proofId, id } = useParams<{ proofId?: string; id?: string }>();
  const targetId = proofId || id || "";

  const [card, setCard] = useState<PublicProofCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!targetId) {
      setIsLoading(false);
      return;
    }

    ProofLoopMissionEngine.getPublicProofCard(targetId)
      .then((data) => {
        if (mounted) {
          setCard(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [targetId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100">
      <SEOHead
        meta={{
          title: card ? `Verified Proof: ${card.title} | ShadowTalk ProofLoop` : "Verified Proof of Completion — ShadowTalk",
          description: "Cryptographically verifiable Proof of Completion with deterministic evidence.",
          canonical: `https://www.shadowtalk-ai.com/proof/${targetId}`,
          ogType: "website",
        }}
      />
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
        <Link
          to="/proofloop"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to ProofLoop Workspace
        </Link>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm animate-pulse">
            Verifying cryptographic proof records...
          </div>
        ) : !card ? (
          <div className="p-12 text-center rounded-2xl bg-[#0c101b] border border-white/10 space-y-4">
            <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Proof Card Not Found</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              This proof card either has not been published yet or the identifier is invalid.
            </p>
            <Button asChild size="sm" className="bg-cyan-500 text-black text-xs font-medium">
              <Link to="/proofloop">Open ProofLoop</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-to-b from-[#0e1424] to-[#090d16] border border-cyan-500/30 p-8 shadow-[0_0_60px_rgba(6,182,212,0.15)] space-y-8">
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                      Verified Proof of Completion
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                      Zero-Trust
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight mt-1">{card.title}</h1>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-2xl border border-white/10">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Verified Score</p>
                  <p className="text-xl font-bold font-mono text-emerald-400">
                    {card.verificationSummary.completionScore}%
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full border-2 border-emerald-500/40 flex items-center justify-center font-mono font-bold text-xs text-white">
                  {card.verificationSummary.verified}/{card.verificationSummary.total}
                </div>
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-black/30 border border-white/5 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">Completed:</span>
                <span className="text-slate-200">{new Date(card.completedAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Execution Duration:</span>
                <span className="text-slate-200">{(card.durationMs / 1000).toFixed(1)}s</span>
              </div>
              <div>
                <span className="text-slate-500 block">Audit Hash:</span>
                <span className="text-cyan-300 truncate block">{card.auditHash}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Issuer:</span>
                <span className="text-slate-200">{card.issuer}</span>
              </div>
            </div>

            {/* Verified Conditions Checklist */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Verified Completion Conditions ({card.verifiedConditions.length})
              </h3>
              <div className="space-y-2">
                {card.verifiedConditions.map((cond, idx) => (
                  <div
                    key={cond.id || idx}
                    className="p-3.5 rounded-xl bg-[#090d18] border border-emerald-500/20 flex items-start gap-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-white">{cond.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Verification Method: {cond.verificationMethod} • Independent Deterministic Verifier
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Independent Evidence Findings */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                Independent Proof Evidence ({card.evidenceItems.length})
              </h3>
              <div className="space-y-2">
                {card.evidenceItems.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="p-3.5 rounded-xl bg-[#090d18] border border-white/5 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-slate-200 font-medium">{ev.summary}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Source: {ev.source} • Verified at {new Date(ev.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shrink-0">
                      CONFIRMED
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Certification Guarantee */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 text-xs text-cyan-200/90">
              <Lock className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Privacy-Safe Verification Guarantee</strong>
                This Proof of Completion contains exclusively deterministic outcome certifications. Original user prompts, proprietary datasets, and API keys are strictly retained on-device and never published.
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/[0.08] text-xs text-slate-500">
              <span>Powered by ShadowTalk ProofLoop</span>
              <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-medium">
                <Link to="/proofloop">Verify Your Own Missions</Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
