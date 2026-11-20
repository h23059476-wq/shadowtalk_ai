import { motion } from "framer-motion";
import { ArrowUpRight, Clapperboard } from "lucide-react";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import { FOUNDER_SOCIAL_PROFILES } from "@/lib/founderIdentity";

/**
 * Trailer band — the 30-second airplane-mode demo, self-hosted on the home
 * page and mirrored as the ShadowTalk YouTube channel trailer.
 *
 * On purpose this is NOT autoplay/muted/looped like the hero brand film:
 * it is a narrated 30s demo, so it waits for an explicit play (controls +
 * hook-frame poster) and loads nothing until the user asks for it
 * (`preload="none"` keeps it out of every initial page weight budget).
 * The trailer mp4 is excluded from the PWA precache in vite.config.ts —
 * marketing media streams on demand, it is not app shell.
 */
const TrailerVideoBand = () => {
  const { variants, viewport } = useLandingMotion();

  return (
    <section
      id="demo-video"
      className="relative py-14 sm:py-20 bg-background overflow-hidden"
      aria-labelledby="demo-video-title"
    >
      <div className="absolute inset-0 bg-grid-dense opacity-20" aria-hidden />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <LandingSectionHeader
          badge="Watch it work"
          badgeIcon={Clapperboard}
          title={
            <span id="demo-video-title">
              The 30-second demo: <span className="gradient-text">airplane mode on, AI still answering.</span>
            </span>
          }
          subtitle="The same film that anchors our YouTube channel — shot from the real product. No network, no account. Press play, then try it yourself."
          className="mb-10 sm:mb-14"
        />

        <motion.div
          variants={variants.fadeSlideUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="relative w-full max-w-4xl mx-auto"
        >
          <div className="glass-subtle rounded-2xl border border-border/60 p-2 sm:p-3 shadow-2xl shadow-primary/5">
            <video
              className="w-full h-auto rounded-xl"
              poster="/shadowtalk-trailer-poster.webp"
              controls
              playsInline
              preload="none"
              width={1920}
              height={1080}
              aria-label="ShadowTalk 30-second demo: the internet dies and the AI keeps answering on-device in airplane mode; back online, chats sync across phone and desktop; private from the first pixel."
            >
              <source src="/shadowtalk-trailer-30s.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <p className="text-center text-[11px] sm:text-xs text-muted-foreground/70 mt-2.5 font-mono">
            30-second demo · airplane mode on · syncs when you&apos;re back
          </p>
          <p className="text-center mt-2">
            <a
              href={FOUNDER_SOCIAL_PROFILES.youtube.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline underline-offset-4"
            >
              Watch on YouTube ({FOUNDER_SOCIAL_PROFILES.youtube.name})
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TrailerVideoBand;
