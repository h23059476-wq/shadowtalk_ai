import { describe, it, expect } from "vitest";
import {
  parseHslTriplet,
  hslToTriplet,
  hslToHex,
  hexToHsl,
  contrastRatio,
  contrastBetween,
  ensureContrast,
  readableForeground,
  relativeLuminance,
  WCAG_AA_NORMAL,
  WCAG_AAA_NORMAL,
  type HSL,
} from "../contrast";

const WHITE: HSL = { h: 0, s: 0, l: 100 };
const BLACK: HSL = { h: 0, s: 0, l: 0 };

describe("contrast math", () => {
  it("round-trips HSL triplets", () => {
    const triplet = "220 14.5% 8%";
    const parsed = parseHslTriplet(triplet);
    expect(parsed).toEqual({ h: 220, s: 14.5, l: 8 });
    expect(hslToTriplet(parsed!)).toBe("220 14.5% 8%");
  });

  it("rejects malformed triplets", () => {
    expect(parseHslTriplet("not a color")).toBeNull();
    expect(parseHslTriplet("")).toBeNull();
    expect(parseHslTriplet("220 14%")).toBeNull();
  });

  it("converts hex to HSL and back", () => {
    const hsl = hexToHsl("#1e40af");
    expect(hsl).not.toBeNull();
    expect(hslToHex(hsl!)).toBe("#1e40af");
    expect(hexToHsl("zzz")).toBeNull();
    expect(hexToHsl("#12345")).toBeNull();
    expect(hexToHsl("")).toBeNull();
    // 3-digit shorthand
    expect(hexToHsl("#fff")).not.toBeNull();
  });

  it("computes canonical WCAG ratios", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 1);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
    // #767676 vs white is the classic 4.54:1 AA boundary gray
    expect(contrastBetween("0 0% 46.3%", "0 0% 100%")).toBeGreaterThanOrEqual(4.5);
  });

  it("relative luminance stays within 0..1", () => {
    const lum = relativeLuminance({ h: 200, s: 80, l: 50 });
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });

  it("ensureContrast fixes failing pairs and keeps passing ones", () => {
    const bg: HSL = { h: 240, s: 12, l: 6 };
    const failingFg: HSL = { h: 240, s: 30, l: 14 };
    const fixed = ensureContrast(failingFg, bg, WCAG_AA_NORMAL);
    expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);

    const alreadyGood: HSL = { h: 210, s: 20, l: 92 };
    expect(ensureContrast(alreadyGood, bg, WCAG_AA_NORMAL)).toEqual(alreadyGood);
  });

  it("ensureContrast terminates and returns a valid color even for impossible pairs", () => {
    const dark: HSL = { h: 240, s: 60, l: 8 };
    const darker: HSL = { h: 240, s: 60, l: 10 };
    const result = ensureContrast(darker, dark, WCAG_AAA_NORMAL);
    expect(result.l).toBeGreaterThanOrEqual(0);
    expect(result.l).toBeLessThanOrEqual(100);
    expect(Number.isFinite(result.h)).toBe(true);
  });

  it("readableForeground picks the better polarity", () => {
    const primary: HSL = { h: 210, s: 80, l: 45 };
    const dark = readableForeground(primary, { h: 0, s: 0, l: 10 }, { h: 0, s: 0, l: 98 }, WCAG_AA_NORMAL);
    expect(contrastRatio(dark, primary)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });
});
