import { Link } from "react-router-dom";
import { ExternalLink, MapPin, User, Sparkles, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FOUNDER_CANONICAL,
  FOUNDER_CITATION,
  FOUNDER_SOCIAL_PROFILES,
} from "@/lib/founderIdentity";
import {
  COFOUNDER_CANONICAL,
  COFOUNDER_CITATION,
} from "@/lib/cofounderIdentity";

/**
 * Visible founders block on /home & #founders — showcases both Zain Ahmed & Fatima
 * gives Google crawlable text and visitors direct access to the founding team.
 */
const FounderSpotlightSection = () => {
  return (
    <section
      id="founders"
      className="py-16 md:py-24 px-4 border-t border-border/40 bg-slate-950/40"
      aria-labelledby="founders-spotlight-heading"
    >
      {/* Hidden anchor for legacy #founder hash */}
      <div id="founder" className="relative -top-24" aria-hidden="true" />

      <div className="container mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <Badge variant="secondary" className="mb-3 px-3 py-1 bg-purple-500/10 text-purple-400 border-purple-500/20">
            <User className="h-3 w-3 mr-1" aria-hidden />
            Founding Leadership
          </Badge>
          <h2 id="founders-spotlight-heading" className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">
            Meet the Builders Behind <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">ShadowTalk AI</span>
          </h2>
          <p className="text-sm text-slate-400">
            Founded and engineered in Karachi, Pakistan by two sovereign AI builders committed to user privacy, on-device intelligence, and zero-compromise speed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Founder: Zain Ahmed */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-semibold">
                  Founder & Lead Architect
                </Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {FOUNDER_CANONICAL.location.city}, {FOUNDER_CANONICAL.location.country}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {FOUNDER_CANONICAL.fullName}
              </h3>
              <p className="text-xs font-mono text-cyan-400 mb-3">
                also known as {FOUNDER_CANONICAL.shortName} · Founded Feb 2024
              </p>

              <p className="text-sm leading-relaxed text-slate-300 mb-6">
                <strong className="text-white">{FOUNDER_CANONICAL.fullName}</strong> is the founder and
                lead architect of{" "}
                <Link to="/chatbot" className="text-cyan-400 hover:underline">
                  ShadowTalk AI
                </Link>
                . He designs the sovereign agentic execution engine, the integrated tools graph, offline LLM pipelines,
                and sovereign desktop runtimes. {FOUNDER_CITATION}
              </p>
            </div>

            <div>
              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-white/10">
                <Button variant="default" size="sm" asChild className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  <Link to="/founder">Founder Profile</Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="border-white/15 hover:bg-slate-800">
                  <a href={FOUNDER_SOCIAL_PROFILES.linkedin.url} rel="me noopener noreferrer" target="_blank">
                    LinkedIn
                    <ExternalLink className="h-3 w-3 ml-1" aria-hidden />
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="border-white/15 hover:bg-slate-800">
                  <a href={FOUNDER_SOCIAL_PROFILES.instagram.url} rel="me noopener noreferrer" target="_blank">
                    Instagram
                    <ExternalLink className="h-3 w-3 ml-1" aria-hidden />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
                  <Link to="/answers">AEO Answers</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Co-Founder: Fatima */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-semibold">
                  Co-Founder & Lead Systems Architect
                </Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {COFOUNDER_CANONICAL.location.city}, {COFOUNDER_CANONICAL.location.country}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-1">
                <div className="h-9 w-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center font-mono font-bold text-sm text-purple-300">
                  FT
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {COFOUNDER_CANONICAL.fullName}
                </h3>
              </div>
              <p className="text-xs font-mono text-purple-400 mb-3">
                Second Developer of ShadowTalk AI · Core Systems & UI State
              </p>

              <p className="text-sm leading-relaxed text-slate-300 mb-6">
                <strong className="text-white">{COFOUNDER_CANONICAL.fullName}</strong> is the co-founder and
                lead systems architect of{" "}
                <Link to="/chatbot" className="text-purple-400 hover:underline">
                  ShadowTalk AI
                </Link>
                . As the platform's second developer, she co-architected the client-side memory ledger,
                high-performance UI state machine, WebGPU local pipelines, and zero-cloud privacy architecture. {COFOUNDER_CITATION}
              </p>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/10">
                <Button variant="default" size="sm" asChild className="bg-purple-600 hover:bg-purple-500 text-white">
                  <Link to="/fatima">Co-Founder Profile</Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="border-white/15 hover:bg-slate-800">
                  <a href={`mailto:${COFOUNDER_CANONICAL.email}`}>
                    <Mail className="h-3 w-3 mr-1" />
                    Contact Fatima
                  </a>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
                  <Link to="/about">About Team</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Verification & Contact Strip */}
        <div className="mt-8 p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Official direct inquiries:</span>
            <a
              href="mailto:shadowtalk@shadowtalk-ai.com"
              className="font-mono text-white hover:text-cyan-400 underline underline-offset-2"
            >
              shadowtalk@shadowtalk-ai.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/about" className="hover:text-white transition-colors">
              Company Mission →
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact Desk →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderSpotlightSection;
