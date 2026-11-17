import React from "react";

/**
 * Seamless 20s welcome loop — above-the-fold showcase.
 *
 * Rendered from the Remotion "WelcomeShadowTalk" composition (1280x720 @
 * 30fps, 600 frames, silent, no fake CTA buttons). It welcomes the visitor
 * and explains what ShadowTalk is: a zero-knowledge, multi-model AI canvas
 * where nothing leaves the device. Frame 599 is pixel-identical to frame 0,
 * so `loop` restarts with zero visible jump.
 *
 * `muted` is re-asserted inside the ref callback: React drops the muted
 * attribute in prerendered HTML, which blocks autoplay in Safari and some
 * Chromium builds. WebM/VP9 is preferred (smaller), MP4/H.264 is the
 * universal fallback.
 */
const HeroProductVideo: React.FC = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto mt-8 sm:mt-10 px-2">
      <div className="glass-subtle rounded-2xl border border-border/60 p-2 sm:p-3 shadow-2xl shadow-primary/5">
        <video
          className="w-full h-auto rounded-xl"
          poster="/hero-poster.webp"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label="ShadowTalk welcome tour: what ShadowTalk is — a zero-knowledge, multi-model AI canvas on your own keys — and how your conversations stay encrypted and on-device"
          ref={(el) => {
            if (el) el.muted = true;
          }}
        >
          <source src="/hero-loop.webm" type="video/webm" />
          <source src="/hero-loop.mp4" type="video/mp4" />
        </video>
      </div>
      <p className="text-center text-[11px] sm:text-xs text-muted-foreground/70 mt-2.5 font-mono">
        welcome tour · zero-knowledge, multi-model canvas · nothing leaves your device
      </p>
    </div>
  );
};

export default HeroProductVideo;
