/**
 * ShadowTalk AI — theme-driven Tailwind palette ramps.
 *
 * Most of the site (marketing pages, auth designs, dashboards) paints with
 * hardcoded Tailwind palette classes (bg-slate-900, text-purple-400,
 * bg-white/10, …) instead of semantic tokens. This module derives a full
 * palette of HSL-triplet CSS variables from the active theme, and
 * tailwind.config.ts remaps every palette family onto those variables — so
 * picking a theme in the Appearance Studio re-hues the entire website,
 * not just token-based pages.
 *
 * Variable contract (mirrored in tailwind.config.ts):
 *   --st-neutral-<shade>   slate/gray/zinc/neutral/stone
 *   --st-primary-<shade>   purple/violet/fuchsia/pink
 *   --st-glow-<shade>      indigo/blue/sky/cyan
 *   --st-success-<shade>   teal/emerald/green/lime
 *   --st-warning-<shade>   yellow/amber/orange
 *   --st-destructive-<shade> red/rose
 *   --st-white / --st-black
 *
 * Every variable holds a bare HSL triplet ("240 6% 14%") so utilities can
 * inject Tailwind's <alpha-value> (bg-white/10 etc. keep working).
 */
import type { ResolvedTheme } from "./types";
import { clampHsl, hslToTriplet, parseHslTriplet, type HSL } from "./contrast";

/** Tailwind shade keys, dark → light. */
export const PALETTE_SHADES = [950, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50] as const;

/** Anchor variable stems shared with tailwind.config.ts. */
export const PALETTE_ANCHORS = ["primary", "glow", "success", "warning", "destructive"] as const;

/** Lightness ladders per shade (950 → 50), modeled on Tailwind's ramps. */
const CHROMATIC_L = [19, 27, 33, 40, 47, 55, 64, 74, 84, 91, 96] as const;
const NEUTRAL_L = [7, 15, 28, 39, 47, 55, 70, 82, 90, 95, 98] as const;

const FALLBACK_BG: HSL = { h: 240, s: 12, l: 3 };
const FALLBACK_ANCHOR: HSL = { h: 195, s: 90, l: 55 };

function parseTriplet(value: string | undefined, fallback: HSL): HSL {
  if (!value) return fallback;
  return parseHslTriplet(value) ?? fallback;
}

/** Neutral ramp: theme-tinted grays (hue from the theme background, low sat). */
function neutralRamp(theme: ResolvedTheme): Record<string, string> {
  const bg = parseTriplet(theme.tokens.background, FALLBACK_BG);
  const tint = clampHsl({ h: bg.h, s: Math.min(16, Math.max(3, bg.s * 0.5)), l: 50 });
  const ramp: Record<string, string> = {};
  PALETTE_SHADES.forEach((shade, i) => {
    ramp[`--st-neutral-${shade}`] = hslToTriplet({ h: tint.h, s: tint.s, l: NEUTRAL_L[i] });
  });
  return ramp;
}

/** Chromatic ramp: one anchor color stretched over the full shade ladder. */
function anchorRamp(anchorVar: string, anchor: HSL): Record<string, string> {
  const base = clampHsl({ h: anchor.h, s: Math.max(10, anchor.s), l: anchor.l });
  const ramp: Record<string, string> = {};
  PALETTE_SHADES.forEach((shade, i) => {
    ramp[`--st-${anchorVar}-${shade}`] = hslToTriplet({ h: base.h, s: base.s, l: CHROMATIC_L[i] });
  });
  return ramp;
}

/**
 * Mode-aware extremes: in dark mode "white" is the theme's near-white ink
 * and "black" is the theme's deepest surface; in light mode both keep their
 * literal meaning so white cards and black sections stay recognizable.
 */
function extremes(theme: ResolvedTheme): Record<string, string> {
  const bg = parseTriplet(theme.tokens.background, FALLBACK_BG);
  if (theme.mode === "dark") {
    const fg = parseTriplet(theme.tokens.foreground, { h: 0, s: 0, l: 96 });
    return {
      "--st-white": hslToTriplet(fg),
      "--st-black": hslToTriplet({ h: bg.h, s: bg.s, l: Math.min(bg.l, 4) }),
    };
  }
  return { "--st-white": "0 0% 100%", "--st-black": "0 0% 9%" };
}

/** Full palette variable set for a theme: var name → HSL triplet. */
export function buildPaletteVars(theme: ResolvedTheme): Record<string, string> {
  const anchors: Record<(typeof PALETTE_ANCHORS)[number], HSL> = {
    primary: parseTriplet(theme.tokens.primary, FALLBACK_ANCHOR),
    glow: parseTriplet(theme.tokens.primaryGlow, { ...FALLBACK_ANCHOR, l: 65 }),
    success: parseTriplet(theme.tokens.success, { h: 150, s: 80, l: 45 }),
    warning: parseTriplet(theme.tokens.warning, { h: 40, s: 95, l: 55 }),
    destructive: parseTriplet(theme.tokens.destructive, { h: 0, s: 85, l: 55 }),
  };
  return {
    ...neutralRamp(theme),
    ...Object.fromEntries(
      Object.entries(anchors).flatMap(([name, hsl]) => Object.entries(anchorRamp(name, hsl))),
    ),
    ...extremes(theme),
  } as Record<string, string>;
}

/** All palette variable names (used by clearAppliedTheme). */
export const PALETTE_VAR_NAMES: string[] = [
  ...PALETTE_SHADES.flatMap((shade) => [
    `--st-neutral-${shade}`,
    ...PALETTE_ANCHORS.map((anchor) => `--st-${anchor}-${shade}`),
  ]),
  "--st-white",
  "--st-black",
];
