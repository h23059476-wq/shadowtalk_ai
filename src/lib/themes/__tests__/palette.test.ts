import { beforeEach, describe, expect, it } from "vitest";
import {
  PALETTE_ANCHORS,
  PALETTE_SHADES,
  PALETTE_VAR_NAMES,
  buildPaletteVars,
} from "../palette";
import { parseHslTriplet } from "../contrast";
import { applyTheme, clearAppliedTheme } from "../applyTheme";
import { getThemeById } from "../registry";

beforeEach(() => {
  localStorage.clear();
  clearAppliedTheme();
});

const DARK = getThemeById("obsidian-indigo")!;
const LIGHT = getThemeById("arctic-light")!;

describe("buildPaletteVars", () => {
  it("covers every shade of every anchor ramp plus neutrals and extremes", () => {
    const vars = buildPaletteVars(DARK);
    const expected = [
      ...PALETTE_SHADES.flatMap((shade) => [
        `--st-neutral-${shade}`,
        ...PALETTE_ANCHORS.map((anchor) => `--st-${anchor}-${shade}`),
      ]),
      "--st-white",
      "--st-black",
    ].sort();
    expect(Object.keys(vars).sort()).toEqual(expected);
  });

  it("emits parseable HSL triplets with a monotonic lightness ramp", () => {
    const vars = buildPaletteVars(DARK);
    for (const [name, triplet] of Object.entries(vars)) {
      const hsl = parseHslTriplet(triplet);
      expect(hsl, `${name} = ${triplet}`).not.toBeNull();
    }
    const ladder = PALETTE_SHADES.map((s) => parseHslTriplet(vars[`--st-primary-${s}`])!.l);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
    }
  });

  it("tints the neutral ramp with the theme background hue", () => {
    const vars = buildPaletteVars(DARK);
    const bg = parseHslTriplet(DARK.tokens.background)!;
    const mid = parseHslTriplet(vars["--st-neutral-500"])!;
    // Hue follows the background (±15° tolerance), saturation stays subtle.
    expect(Math.abs(mid.h - bg.h)).toBeLessThanOrEqual(15);
    expect(mid.s).toBeLessThanOrEqual(16);
  });

  it("follows the theme primary hue on chromatic ramps", () => {
    const vars = buildPaletteVars(DARK);
    const primary = parseHslTriplet(DARK.tokens.primary)!;
    const mid = parseHslTriplet(vars["--st-primary-500"])!;
    expect(Math.round(mid.h)).toBe(Math.round(primary.h));
  });

  it("maps white/black to theme ink and surface in dark mode", () => {
    const vars = buildPaletteVars(DARK);
    expect(vars["--st-white"]).toBe(DARK.tokens.foreground);
    const black = parseHslTriplet(vars["--st-black"])!;
    expect(black.l).toBeLessThanOrEqual(4);
  });

  it("keeps white/black literal in light mode", () => {
    const vars = buildPaletteVars(LIGHT);
    expect(vars["--st-white"]).toBe("0 0% 100%");
    expect(vars["--st-black"]).toBe("0 0% 9%");
  });
});

describe("applyTheme × palette", () => {
  it("writes the palette variables to the document root", () => {
    applyTheme(DARK);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--st-primary-500")).not.toBe("");
    expect(style.getPropertyValue("--st-neutral-950")).not.toBe("");
    expect(style.getPropertyValue("--st-white")).not.toBe("");
  });

  it("clears the palette variables on reset", () => {
    applyTheme(DARK);
    clearAppliedTheme();
    const style = document.documentElement.style;
    for (const name of PALETTE_VAR_NAMES) {
      expect(style.getPropertyValue(name), name).toBe("");
    }
  });

  it("switches palette ramps when a light theme replaces a dark one", () => {
    applyTheme(DARK);
    const darkWhite = document.documentElement.style.getPropertyValue("--st-white");
    applyTheme(LIGHT);
    expect(document.documentElement.style.getPropertyValue("--st-white")).toBe("0 0% 100%");
    expect(darkWhite).not.toBe("0 0% 100%");
  });
});
