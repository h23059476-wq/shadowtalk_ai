/**
 * ProofLoopPage — AI Execution Verification Workspace
 *
 * Route: /proofloop
 */

import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProofLoopWorkspace from "@/components/proofloop/ProofLoopWorkspace";

export default function ProofLoopPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100">
      <SEOHead
        meta={{
          title: "ProofLoop — AI Execution Verification | ShadowTalk AI",
          description:
            "ShadowTalk ProofLoop verifies real-world outcomes and produces verifiable Proof of Completion with deterministic checks, human approval gates, and zero-trust evidence.",
          canonical: "https://www.shadowtalk-ai.com/proofloop",
          keywords: ["ProofLoop", "AI verification", "execution verifier", "autonomous AI proof", "deterministic AI verification"],
          ogType: "website",
          twitterCard: "summary_large_image",
        }}
      />
      <Navigation />

      <main className="flex-1 flex flex-col min-h-[calc(100vh-64px)] overflow-hidden">
        <ProofLoopWorkspace />
      </main>

      <Footer />
    </div>
  );
}
