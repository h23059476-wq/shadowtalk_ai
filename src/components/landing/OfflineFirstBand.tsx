import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BatteryCharging, Download, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import LandingInteractiveCard from "@/components/landing/LandingInteractiveCard";

/**
 * Offline-first band — the category claim, shown on its own so it can't be
 * skimmed past: "The first AI chat in a browser that works offline — and syncs when you're back."
 *
 * Three concrete promises, all backed by shipped engineering (zero third-
 * party app shell, resumable per-shard model install, durable IndexedDB
 * history), plus one honest footnote: on-device AI still needs ONE online
 * visit to install, and cloud models always need the network.
 */
const OfflineFirstBand = () => {
  const { variants, viewport } = useLandingMotion();
  const navigate = useNavigate();

  const promises = [
    {
      icon: Download,
      title: "Install once, then never wait",
      body: "The on-device model streams down in resumable shards — a dying connection just pauses it, it never restarts from zero.",
    },
    {
      icon: BatteryCharging,
      title: "Runs on your GPU, not the cloud",
      body: "WebGPU inference happens in your browser via a background worker — the UI stays at 60fps while the model thinks.",
    },
    {
      icon: ShieldCheck,
      title: "Your chats survive anything",
      body: "Messages queue in durable on-device storage — reloads, dead batteries and tunnel portals lose nothing, and it all syncs when the network returns.",
    },
  ] as const;

  return (
    <section
      id="offline-first"
      className="relative py-14 sm:py-20 bg-background overflow-hidden"
      aria-labelledby="offline-first-title"
    >
      <div className="absolute inset-0 bg-grid-dense opacity-20" aria-hidden />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <LandingSectionHeader
          badge="Offline-first, not offline-broken"
          badgeIcon={WifiOff}
          title={
            <span id="offline-first-title">
              The first AI chat in a browser that works <span className="gradient-text">offline — and syncs when you're back.</span>
            </span>
          }
          subtitle={BRAND.offlineSubline}
          className="mb-10 sm:mb-14"
        />

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5 max-w-5xl mx-auto">
          {promises.map((p, i) => (
            <LandingInteractiveCard key={p.title} index={i}>
              <motion.div variants={variants.fadeSlideUp} initial="hidden" whileInView="visible" viewport={viewport}>
                <div className="glass-subtle border border-border/50 rounded-2xl p-5 sm:p-6 h-full">
                  <p.icon className="h-5 w-5 text-primary mb-3" aria-hidden />
                  <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1.5">{p.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{p.body}</p>
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
          className="mt-8 sm:mt-10 flex flex-col items-center gap-3"
        >
          <Button
            size="lg"
            className="btn-glow btn-3d-primary rounded-xl px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg group bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 border-0"
            onClick={() => navigate("/chatbot")}
          >
            <WifiOff className="mr-2 sm:mr-3 h-5 w-5" />
            Try it — even offline
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-[11px] sm:text-xs text-muted-foreground/80 text-center max-w-xl leading-relaxed">
            Honest fine print: the very first visit needs a connection to install the offline shell, and the on-device
            model needs one online session to download (WebGPU-capable browser). Cloud models always use the network.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default OfflineFirstBand;
