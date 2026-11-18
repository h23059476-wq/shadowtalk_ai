import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Cloud, HardDrive, MonitorSmartphone, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import LandingInteractiveCard from "@/components/landing/LandingInteractiveCard";

/**
 * Market-gap band — the proof behind the claim on the offline band: "The
 * first AI chat in a browser that works offline — and syncs when you're
 * back." The market splits into three camps and each owns only half of what
 * ShadowTalk does; the intersection is empty. Every line is checkable as of
 * Nov 2026: LM Studio's device sync is an open feature request (#2467),
 * ChatterUI's WebDAV merge is unshipped, Proton Lumo's own security model
 * documents server-side decryption for inference, Locra/Pal Chat sync via
 * iCloud, and LocalMind needs your own Ollama/LM Studio server + S3.
 */
const MarketGapBand = () => {
  const { variants, viewport } = useLandingMotion();
  const navigate = useNavigate();

  const camps = [
    {
      icon: HardDrive,
      kicker: "Camp 1 · Offline AI",
      names: "LM Studio · web-llm-chat · Secret Llama",
      body: "Real models on your machine — and nothing else. No sync at all: LM Studio's device sync is still an open feature request (#2467) and ChatterUI's WebDAV merge never shipped.",
      missing: "Missing half: sync",
    },
    {
      icon: Cloud,
      kicker: "Camp 2 · Encrypted AI",
      names: "Proton Lumo · Confer",
      body: "Encrypted history — but cloud-only. It needs internet and an account, and the server decrypts your prompt in cleartext to answer it (Lumo's published security model).",
      missing: "Missing half: offline",
    },
    {
      icon: MonitorSmartphone,
      kicker: "Camp 3 · Local + sync attempts",
      names: "Locra & Pal Chat (iCloud) · LocalMind (your own Ollama + S3)",
      body: "Native apps or bring-your-own-server: Apple's walled garden or a self-hosted stack. Never just a browser tab.",
      missing: "Missing half: the browser",
    },
  ] as const;

  const intersection = [
    "Runs on-device, offline — the model lives on your device",
    "Chats queue with no signal and sync the moment you're back",
    "End-to-end encryption when Private Mode is on (AES-256)",
    "Nothing else to install — no Ollama, no S3, no app store",
    "One browser tab, free to start",
  ] as const;

  return (
    <section
      id="market-gap"
      className="relative py-14 sm:py-20 bg-background overflow-hidden"
      aria-labelledby="market-gap-title"
    >
      <div className="absolute inset-0 bg-grid-dense opacity-20" aria-hidden />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <LandingSectionHeader
          badge="The gap in the market"
          badgeIcon={Sparkles}
          title={
            <span id="market-gap-title">
              Everyone else holds <span className="gradient-text">half of this.</span>
            </span>
          }
          subtitle="Offline AI, encrypted AI, local+sync apps — each camp owns one half of what ShadowTalk does. The intersection is empty, and it is exactly where we live."
          className="mb-10 sm:mb-14"
        />

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5 max-w-5xl mx-auto">
          {camps.map((c, i) => (
            <LandingInteractiveCard key={c.kicker} index={i}>
              <motion.div variants={variants.fadeSlideUp} initial="hidden" whileInView="visible" viewport={viewport}>
                <div className="glass-subtle border border-border/50 rounded-2xl p-5 sm:p-6 h-full flex flex-col">
                  <c.icon className="h-5 w-5 text-primary mb-3" aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {c.kicker}
                  </p>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1.5">{c.names}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">{c.body}</p>
                  <p className="mt-3 text-[11px] font-semibold text-destructive/90">{c.missing}</p>
                </div>
              </motion.div>
            </LandingInteractiveCard>
          ))}
        </div>

        <motion.div
          variants={variants.fadeSlideUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="mt-6 sm:mt-8 max-w-5xl mx-auto"
        >
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 p-5 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <WifiOff className="h-4 w-4 text-primary" aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    ShadowTalk · the intersection
                  </p>
                </div>
                <h3 className="text-base sm:text-xl font-semibold text-foreground mb-4">
                  All three halves. One browser tab.
                </h3>
                <ul className="space-y-2">
                  {intersection.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-3 lg:pl-6 lg:border-l lg:border-border/60">
                <Button
                  size="lg"
                  className="btn-glow btn-3d-primary rounded-xl px-6 py-5 text-sm sm:text-base group bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 border-0"
                  onClick={() => navigate("/chatbot")}
                >
                  <WifiOff className="mr-2 h-4 w-4" />
                  Try it — even offline
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            <p className="mt-5 text-[11px] text-muted-foreground/80 leading-relaxed">
              Landscape checked Nov 2026, every line checkable: LM Studio #2467 and ChatterUI's WebDAV merge are
              still open feature requests; Proton's Lumo security model documents server-side decryption for
              inference; Locra and Pal Chat sync through iCloud; LocalMind pairs your own Ollama or LM Studio
              server with your own S3-compatible storage.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketGapBand;
