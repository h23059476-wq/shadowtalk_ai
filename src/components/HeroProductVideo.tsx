import React from "react";

/**
 * Seamless 14s product loop — above-the-fold showcase.
 *
 * Rendered from the Remotion "HeroLoop" composition (1280x720 @ 30fps,
 * 420 frames, silent, no fake CTA buttons). Frame 420 is pixel-identical to
 * frame 0, so `loop` restarts with zero visible jump.
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
          aria-label="ShadowTalk product preview: one prompt refactoring a RAG pipeline across Claude, GPT-4o, Gemini and Llama, with local IndexedDB vector search and WebGPU inference staying on-device"
          ref={(el) => {
            if (el) el.muted = true;
          }}
        >
          <source src="/hero-loop.webm" type="video/webm" />
          <source src="/hero-loop.mp4" type="video/mp4" />
        </video>
      </div>
      <p className="text-center text-[11px] sm:text-xs text-muted-foreground/70 mt-2.5 font-mono">
        live product loop · one prompt, four models · RAG stays on-device
      </p>
    </div>
  );
};

export default HeroProductVideo;
