/**
 * ShadowTalk AI — color math for theme validation.
 *
 * All themes (built-in, custom, imported) run through these helpers so the
 * studio can guarantee WCAG AA contrast for text-carrying token pairs.
 * Pure functions only — no DOM access — so they are directly unit-testable.
 */

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function clampHsl(hsl: HSL): HSL {
  return {
    h: ((hsl.h % 360) + 360) % 360,
    s: clamp(hsl.s, 0, 100),
    l: clamp(hsl.l, 0, 100),
  };
}

/** Parse a CSS-variable HSL triplet: "H S% L%" or "H S% L% / a". */
export function parseHslTriplet(value: string): HSL | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(value);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

export function hslToTriplet({ h, s, l }: HSL): HslTriplet {
  const hh = Math.round(((h % 360) + 360) % 360 * 10) / 10;
  const ss = Math.round(s * 10) / 10;
  const ll = Math.round(l * 10) / 10;
  return `${hh} ${ss}% ${ll}%`;
}

/** "#rgb" / "#rrggbb" → HSL. Returns null for invalid input. */
export function hexToHsl(hex: string): HSL | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let raw = m[1];
  if (raw.length === 3) raw = raw.split("").map((c) => c + c).join("");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): { r: number; g: number; b: number } {
  const H = ((h % 360) + 360) % 360;
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (H < 60) [rp, gp, bp] = [c, x, 0];
  else if (H < 120) [rp, gp, bp] = [x, c, 0];
  else if (H < 180) [rp, gp, bp] = [0, c, x];
  else if (H < 240) [rp, gp, bp] = [0, x, c];
  else if (H < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

export function hslToHex(hsl: HSL): string {
  const { r, g, b } = hslToRgb(hsl);
  const toHex = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function tripletToHex(triplet: string): string {
  const hsl = parseHslTriplet(triplet);
  return hsl ? hslToHex(hsl) : "#000000";
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0-1). */
export function relativeLuminance(hsl: HSL): number {
  const { r, g, b } = hslToRgb(hsl);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio (1-21). */
export function contrastRatio(a: HSL, b: HSL): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastBetween(a: string, b: string): number {
  const ha = parseHslTriplet(a);
  const hb = parseHslTriplet(b);
  if (!ha || !hb) return 1;
  return contrastRatio(ha, hb);
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
export const WCAG_AAA_NORMAL = 7;

export function meetsAA(fg: string, bg: string, threshold: number = WCAG_AA_NORMAL): boolean {
  return contrastBetween(fg, bg) >= threshold;
}

/**
 * Nudge the foreground lightness (away from the background) until the pair
 * reaches `min` contrast. Saturation/hue are preserved so hand-tuned colors
 * stay recognizable. Returns the original value when it already passes.
 * Never recurses: falls back through desaturation steps and finally to the
 * theoretical extreme, always returning a valid color.
 */
export function ensureContrast(fg: HSL, bg: HSL, min: number = WCAG_AA_NORMAL): HSL {
  const start = clampHsl(fg);
  if (contrastRatio(start, bg) >= min) return start;

  const direction = relativeLuminance(start) > relativeLuminance(bg) ? 1 : -1;
  let best = start;
  let bestRatio = contrastRatio(start, bg);

  const sweep = (candidate: HSL): HSL | null => {
    let cur = clampHsl(candidate);
    for (let step = 0; step < 120; step++) {
      cur = clampHsl({ ...cur, l: cur.l + direction * 1.25 });
      const ratio = contrastRatio(cur, bg);
      if (ratio > bestRatio) {
        best = cur;
        bestRatio = ratio;
      }
      if (ratio >= min) return cur;
      if (cur.l <= 0 || cur.l >= 100) return null;
    }
    return null;
  };

  const direct = sweep(start);
  if (direct) return direct;

  const desaturated = sweep({ ...start, s: start.s * 0.35 });
  if (desaturated) return desaturated;

  const neutral = sweep({ ...start, s: 0 });
  if (neutral) return neutral;

  const extreme: HSL = { ...start, s: 0, l: direction > 0 ? 100 : 0 };
  return contrastRatio(extreme, bg) > bestRatio ? extreme : best;
}

/** Choose whichever of two candidates (e.g. near-black / near-white) reads better on bg. */
export function readableForeground(
  bg: HSL,
  darkCandidate: HSL,
  lightCandidate: HSL,
  min: number = WCAG_AA_NORMAL,
): HSL {
  const darkRatio = contrastRatio(darkCandidate, bg);
  const lightRatio = contrastRatio(lightCandidate, bg);
  const best = lightRatio >= darkRatio ? lightCandidate : darkCandidate;
  return ensureContrast(best, bg, min);
}

export function adjustL(hsl: HSL, delta: number): HSL {
  return clampHsl({ ...hsl, l: hsl.l + delta });
}

export function withL(hsl: HSL, l: number): HSL {
  return clampHsl({ ...hsl, l });
}
