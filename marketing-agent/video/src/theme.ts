/**
 * ShadowTalk brand system — pulled verbatim from the landing page theme
 * (shadowtalk_ai/src/index.css :root tokens) and the original
 * shadowtalk-remotion project, so the video matches the site pixel-for-pixel.
 * Geometry here is VERTICAL (1080x1920) for Shorts/Reels/TikTok.
 *
 *  --background: 240 12% 3%   -> #070709
 *  --foreground: 0 0% 96%     -> #F5F5F5
 *  --muted-foreground: 240 5% 58% -> #8F8F99
 *  --primary: 195 100% 55%    -> #1AC6FF
 *  --primary-glow: 195 100% 65% -> #4CD2FF
 *  --secondary: 270 90% 62%   -> #9E47F5
 *  --accent: 315 90% 58%      -> #F434C4
 *  --success: 150 80% 45%     -> #17CF73
 */

export const C = {
  bg: "#070709",
  card: "#0B0B10",
  fg: "#F5F5F5",
  fgSoft: "rgba(245,245,245,0.85)",
  muted: "#8F8F99",
  dim: "rgba(143,143,153,0.55)",
  primary: "#1AC6FF",
  glow: "#4CD2FF",
  secondary: "#9E47F5",
  accent: "#F434C4",
  success: "#17CF73",
  border: "rgba(255,255,255,0.11)",
  borderPrimary: "rgba(26,198,255,0.42)",
  glass: "rgba(255,255,255,0.05)",
} as const;

/** Site headline gradient: from-primary via-secondary to-accent */
export const BRAND_GRADIENT = `linear-gradient(90deg, ${C.primary} 0%, ${C.secondary} 55%, ${C.accent} 100%)`;

export const FONT = {
  headline: "Sora, sans-serif",
  body: '"Hanken Grotesk", sans-serif',
  mono: '"JetBrains Mono", monospace',
} as const;

/** Vertical composition geometry — 9% safe margins for Shorts UI overlays. */
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const DURATION_FRAMES = 900; // 30s
export const SAFE_X = Math.round(WIDTH * 0.09); // 97
export const SAFE_Y = Math.round(HEIGHT * 0.075); // 144

export const SPRING_CONFIG = { damping: 14, stiffness: 120 } as const;

/**
 * Legacy color palette — the pre-refactor export that copied components
 * (Typewriter, etc.) still import. Aliased onto the site tokens so old and
 * new components stay visually identical.
 */
export const COLORS = {
  bg: C.bg,
  card: C.card,
  cardAlt: "#101018",
  border: C.border,
  text: C.fg,
  body: C.fgSoft,
  muted: C.muted,
  dim: C.dim,
  cyan: C.primary,
  cyanSoft: "rgba(26,198,255,0.65)",
  emerald: C.success,
  emeraldSoft: "rgba(23,207,115,0.65)",
  amber: "#F5A524",
  red: "#EF4444",
} as const;

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Deterministic PRNG (mulberry32) — no Math.random anywhere. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
