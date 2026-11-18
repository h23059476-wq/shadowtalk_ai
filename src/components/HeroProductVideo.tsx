import React from "react";

/**
 * Seamless 20s brand film — above-the-fold showcase.
 *
 * Rendered from the Remotion "BrandFilm" composition (1280x720 @ 30fps,
 * 600 frames, silent, no fake CTA buttons). Story: the ShadowTalk mark
 * blooms into the "SHADOWTALK · Think AI. Think ShadowTalk." lockup, the
 * statement "Every model. One voice." lands, a multi-model canvas switches
 * between GPT-5.1, Claude 4.5, Gemini 3 Pro and on-device Llama 4 while a
 * prompt is typed and answered, and the film closes on "Every model. One
 * voice." before resting back on the mark. Frame 599 matches frame 0
 * (loop seam PSNR ~45 dB vs ~53 dB for a normal frame step), so `loop`
 * restarts with zero visible jump.
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
          aria-label="ShadowTalk brand film: the ShadowTalk logo blooms into the Think AI, Think ShadowTalk lockup, the statement Every model. One voice. lands, a prompt runs across GPT-5.1, Claude 4.5, Gemini 3 Pro and on-device Llama 4, closing with Every model. One voice."
          ref={(el) => {
            if (el) el.muted = true;
          }}
        >
          <source src="/hero-loop.webm" type="video/webm" />
          <source src="/hero-loop.mp4" type="video/mp4" />
        </video>
      </div>
      <p className="text-center text-[11px] sm:text-xs text-muted-foreground/70 mt-2.5 font-mono">
        brand film · every model, one voice · think AI, think ShadowTalk
      </p>
    </div>
  );
};

export default HeroProductVideo;
