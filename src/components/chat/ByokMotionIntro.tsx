import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * ByokMotionIntro — a looping motion graphic that explains BYOK
 * (Bring Your Own Key) visually instead of a wall of text.
 *
 * Three beats, ~4.2s each, looping:
 *   1. "Grab your free key"  — a key materialises from the provider card and
 *      travels toward the browser.
 *   2. "Paste it once"       — the key turns into the browser's keyhole, the
 *      shackle pops open and the browser glows (key lives in the browser).
 *   3. "Talk straight to the AI" — a dashed beam draws from the browser
 *      directly to the provider while the ShadowTalk-server node gets crossed
 *      out: the key never touches our servers.
 *
 * Respects prefers-reduced-motion: renders the final frame with all three
 * captions listed statically. Decorative SVG is aria-hidden; captions are
 * real HTML text.
 */

const BEAT_MS = 4200;

const BRAND = {
  primary: "#22cfff",
  card: "#0c0c11",
  border: "#26272c",
  muted: "#8b8c95",
  success: "#1fc98a",
  danger: "#ee4444",
  dim: "#131318",
};

const CAPTIONS = [
  {
    title: "Grab a free key",
    body: "Create an API key on OpenRouter, Groq, Gemini & more — most providers have a free tier.",
  },
  {
    title: "Paste it once",
    body: "Your key is stored in your browser only — it never touches ShadowTalk servers.",
  },
  {
    title: "Talk straight to the AI",
    body: "Your browser connects directly to your provider. Private — and no shared quota.",
  },
] as const;

const BEAM_PATH = "M 206 110 Q 234 84 262 72";

export function ByokMotionIntro() {
  const reduced = useReducedMotion();
  const [beat, setBeat] = useState(reduced ? 2 : 0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setBeat((b) => (b + 1) % CAPTIONS.length), BEAT_MS);
    return () => clearInterval(timer);
  }, [reduced]);

  const final = reduced ? 2 : beat;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden select-none">
      <div className="px-3 pt-2.5 flex items-center justify-between">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary/80">
          How BYOK works
        </p>
        {!reduced && (
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground/70">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            live loop
          </span>
        )}
      </div>

      <svg
        viewBox="0 0 320 190"
        className="w-full h-auto block"
        aria-hidden="true"
        role="presentation"
      >
        <defs>
          <filter id="byok-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Provider card (top-left) ── */}
        <g>
          <rect x={14} y={16} width={92} height={54} rx={10} fill={BRAND.card} stroke={BRAND.border} />
          <rect x={26} y={28} width={48} height={5} rx={2.5} fill={BRAND.border} />
          <rect x={26} y={39} width={34} height={5} rx={2.5} fill={BRAND.border} />
          <text
            x={60}
            y={61}
            textAnchor="middle"
            fontSize={9}
            fill={BRAND.muted}
            style={{ fontFamily: "inherit" }}
          >
            Your AI provider
          </text>
        </g>

        {/* ── AI models card (top-right) ── */}
        <g>
          <rect x={214} y={16} width={92} height={54} rx={10} fill={BRAND.card} stroke={BRAND.border} />
          <rect x={242} y={26} width={36} height={18} rx={6} fill="rgba(34,207,255,0.12)" stroke={BRAND.primary} strokeOpacity={0.6} />
          <text
            x={260}
            y={38.5}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill={BRAND.primary}
            style={{ fontFamily: "inherit" }}
          >
            AI
          </text>
          <text
            x={260}
            y={61}
            textAnchor="middle"
            fontSize={9}
            fill={BRAND.muted}
            style={{ fontFamily: "inherit" }}
          >
            Provider models
          </text>
        </g>

        {/* ── Trajectory hint (provider → keyhole) ── */}
        <path
          d="M 60 74 Q 112 116 146 124"
          fill="none"
          stroke={BRAND.muted}
          strokeWidth={1.4}
          strokeDasharray="2 7"
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* ── ShadowTalk server node (bottom-right) — bypassed ── */}
        <motion.g animate={{ opacity: final >= 2 ? 0.42 : 1 }} transition={{ duration: 0.6 }}>
          <rect x={214} y={106} width={92} height={62} rx={10} fill={BRAND.dim} stroke={BRAND.border} />
          <rect x={228} y={118} width={44} height={5} rx={2.5} fill={BRAND.border} />
          <rect x={228} y={129} width={30} height={5} rx={2.5} fill={BRAND.border} />
          <text
            x={260}
            y={158}
            textAnchor="middle"
            fontSize={9}
            fill={BRAND.muted}
            style={{ fontFamily: "inherit" }}
          >
            ShadowTalk server
          </text>
        </motion.g>
        <motion.path
          d="M 222 114 L 298 160"
          stroke={BRAND.danger}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
          initial={false}
          animate={{ pathLength: final >= 2 ? 1 : 0, opacity: final >= 2 ? 1 : 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
        <motion.path
          d="M 298 114 L 222 160"
          stroke={BRAND.danger}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
          initial={false}
          animate={{ pathLength: final >= 2 ? 1 : 0, opacity: final >= 2 ? 1 : 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: final >= 2 ? 0.25 : 0 }}
        />

        {/* ── Browser card (bottom-center) ── */}
        <g>
          {/* glow ring when the key is inserted */}
          <motion.rect
            x={114}
            y={106}
            width={92}
            height={62}
            rx={12}
            fill="none"
            stroke={BRAND.primary}
            strokeWidth={2.4}
            filter="url(#byok-glow)"
            initial={false}
            animate={{ strokeOpacity: final >= 1 ? 0.55 : 0 }}
            transition={{ duration: 0.8 }}
          />
          <rect x={114} y={106} width={92} height={62} rx={12} fill={BRAND.card} stroke={BRAND.border} />
          {/* shackle — pops open on beat 2 */}
          <motion.path
            d="M 152 126 a 8 8 0 0 1 16 0"
            fill="none"
            stroke={final >= 1 ? BRAND.success : BRAND.muted}
            strokeWidth={3}
            strokeLinecap="round"
            initial={false}
            animate={{ y: final >= 1 ? -5 : 0, stroke: final >= 1 ? BRAND.success : BRAND.muted }}
            transition={{ duration: 0.5, ease: "backOut" }}
          />
          {/* keyhole */}
          <motion.circle
            cx={160}
            cy={128}
            r={5.5}
            initial={false}
            animate={{ fill: final >= 1 ? BRAND.primary : BRAND.muted }}
            transition={{ duration: 0.4 }}
          />
          <motion.rect
            x={157.6}
            y={131.5}
            width={4.8}
            height={9}
            rx={2}
            initial={false}
            animate={{ fill: final >= 1 ? BRAND.primary : BRAND.muted }}
            transition={{ duration: 0.4 }}
          />
          <text
            x={160}
            y={161}
            textAnchor="middle"
            fontSize={9}
            fill={BRAND.muted}
            style={{ fontFamily: "inherit" }}
          >
            Your browser
          </text>
        </g>

        {/* ── Direct beam (browser → provider) on beat 3 ── */}
        <motion.path
          d={BEAM_PATH}
          fill="none"
          stroke={BRAND.primary}
          strokeWidth={2.2}
          strokeDasharray="5 6"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: final >= 2 ? 1 : 0, opacity: final >= 2 ? 1 : 0 }}
          transition={{ duration: 1.3, ease: "easeOut" }}
        />
        <motion.path
          d={BEAM_PATH}
          fill="none"
          stroke={BRAND.success}
          strokeWidth={1.4}
          strokeDasharray="4 7"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: final >= 2 ? 1 : 0, opacity: final >= 2 ? 0.55 : 0 }}
          transition={{ duration: 1.3, ease: "easeOut", delay: final >= 2 ? 0.5 : 0 }}
        />
        {/* travelling pulse along the beam */}
        {final >= 2 && !reduced && (
          <circle r={3} fill={BRAND.primary}>
            <animateMotion dur="1.6s" repeatCount="indefinite" path={BEAM_PATH} />
          </circle>
        )}

        {/* ── The key ── */}
        <motion.g
          style={{ originX: 0.23, originY: 0.5 }}
          initial={{ x: 60, y: 70, opacity: 0 }}
          animate={
            final === 0
              ? { x: 152, y: 124, opacity: 1, rotate: 0, scale: 1 }
              : final === 1
                ? { x: 160, y: 130, opacity: 1, rotate: 90, scale: 1 }
                : { x: 160, y: 130, opacity: 0, rotate: 90, scale: 0.5 }
          }
          transition={
            final === 0
              ? { duration: 2.0, ease: "easeInOut" }
              : final === 1
                ? { duration: 0.9, ease: "backOut" }
                : { duration: 0.4 }
          }
        >
          <circle cx={0} cy={0} r={7.5} fill={BRAND.card} stroke={BRAND.primary} strokeWidth={3} />
          <rect x={6.5} y={-2.5} width={20} height={5} rx={2.5} fill={BRAND.primary} />
          <rect x={20} y={2.5} width={4} height={6} rx={1.5} fill={BRAND.primary} />
        </motion.g>
      </svg>

      {/* ── Captions ── */}
      <div className="px-3 pb-2.5">
        {reduced ? (
          <div className="space-y-1.5">
            {CAPTIONS.map((c) => (
              <p key={c.title} className="text-[11px] leading-snug text-muted-foreground">
                <span className="font-semibold text-foreground">{c.title} — </span>
                {c.body}
              </p>
            ))}
          </div>
        ) : (
          <>
            <div className="h-[44px] flex items-start">
              <AnimatePresence mode="wait">
                <motion.div
                  key={final}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.32 }}
                >
                  <p className="text-xs font-semibold text-foreground">{CAPTIONS[final].title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {CAPTIONS[final].body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex gap-1.5 justify-center pt-1">
              {CAPTIONS.map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-1.5 rounded-full transition-all duration-300 " +
                    (i === final ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
