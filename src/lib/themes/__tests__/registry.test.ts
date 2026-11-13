import { describe, it, expect } from "vitest";
import { THEME_REGISTRY, getThemeById, REQUIRED_THEME_CONCEPTS } from "../registry";
import { validateThemeContrast } from "../registry";
import { THEME_COLLECTIONS } from "../collections";
import { contrastBetween, WCAG_AAA_NORMAL } from "../contrast";

describe("Appearance Studio registry", () => {
  it("contains at least 100 themes", () => {
    expect(THEME_REGISTRY.length).toBeGreaterThanOrEqual(100);
  });

  it("has unique stable ids and unique names", () => {
    const ids = new Set(THEME_REGISTRY.map((t) => t.id));
    const names = new Set(THEME_REGISTRY.map((t) => t.name));
    expect(ids.size).toBe(THEME_REGISTRY.length);
    expect(names.size).toBe(THEME_REGISTRY.length);
  });

  it("matches the six collection counts", () => {
    for (const col of THEME_COLLECTIONS) {
      const themes = THEME_REGISTRY.filter((t) => t.collection === col.id);
      expect(themes.length, col.id).toBe(col.expectedCount);
    }
  });

  it("includes the required original design concepts", () => {
    for (const id of REQUIRED_THEME_CONCEPTS) {
      const theme = getThemeById(id);
      expect(theme, id).toBeDefined();
    }
  });

  it("gives every theme a complete semantic token configuration", () => {
    const required: Array<keyof typeof THEME_REGISTRY[0]["tokens"]> = [
      "background", "foreground", "card", "cardForeground", "primary",
      "primaryForeground", "primaryGlow", "secondary", "secondaryForeground",
      "muted", "mutedForeground", "accent", "accentForeground", "destructive",
      "destructiveForeground", "success", "warning", "border", "input", "ring",
      "sidebarBackground", "sidebarForeground", "sidebarPrimary", "sidebarBorder",
    ];
    for (const theme of THEME_REGISTRY) {
      for (const key of required) {
        expect(typeof theme.tokens[key], `${theme.id}.${key}`).toBe("string");
        expect((theme.tokens[key] as string).length, `${theme.id}.${key}`).toBeGreaterThan(0);
      }
      expect(theme.chartColors.length).toBe(5);
      expect(theme.codeColors.background.length).toBeGreaterThan(0);
      expect(["dark", "light"]).toContain(theme.mode);
      expect(theme.fontSans.length).toBeGreaterThan(0);
      expect(theme.fontMono.length).toBeGreaterThan(0);
    }
  });

  it("passes WCAG AA contrast for every text-carrying pair in all 100 themes", () => {
    const failures: string[] = [];
    for (const theme of THEME_REGISTRY) {
      const issues = validateThemeContrast(theme);
      if (issues.length > 0) {
        failures.push(`${theme.id}: ${issues.map((i) => `${i.pair}=${i.ratio}`).join(", ")}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("achieves AAA body-text contrast for the High Contrast collection", () => {
    for (const theme of THEME_REGISTRY.filter((t) => t.collection === "high-contrast")) {
      const ratio = contrastBetween(theme.tokens.foreground, theme.tokens.background);
      expect(ratio, theme.id).toBeGreaterThanOrEqual(WCAG_AAA_NORMAL);
    }
  });

  it("uses valid hex preview swatches", () => {
    for (const theme of THEME_REGISTRY) {
      expect(theme.preview.length).toBe(4);
      for (const swatch of theme.preview) {
        expect(swatch).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("keeps theme descriptions distinct and informative", () => {
    const descriptions = new Set(THEME_REGISTRY.map((t) => t.description));
    expect(descriptions.size).toBe(THEME_REGISTRY.length);
    for (const t of THEME_REGISTRY) {
      expect(t.description.length).toBeGreaterThan(30);
    }
  });
});
