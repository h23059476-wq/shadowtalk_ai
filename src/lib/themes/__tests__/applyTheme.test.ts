import { beforeEach, describe, expect, it } from "vitest";
import {
  applyTheme,
  clearAppliedTheme,
  getActiveThemeId,
  loadStoredThemeTemplate,
  restoreStoredTheme,
  TOKEN_MAP,
} from "../applyTheme";
import { getThemeById } from "../registry";
import { normalizeTheme } from "../normalize";
import { THEME_JSON_STORAGE_KEY, THEME_STORAGE_KEY } from "../types";

beforeEach(() => {
  localStorage.clear();
  clearAppliedTheme();
});

describe("applyTheme", () => {
  it("writes every semantic CSS variable to the document root", () => {
    const theme = getThemeById("obsidian-indigo")!;
    applyTheme(theme);
    const style = document.documentElement.style;
    for (const cssVar of Object.values(TOKEN_MAP)) {
      expect(style.getPropertyValue(cssVar), cssVar).not.toBe("");
    }
    expect(style.getPropertyValue("--radius")).not.toBe("");
    expect(style.getPropertyValue("--app-font-sans")).toContain("Inter");
    expect(style.getPropertyValue("--chart-1")).not.toBe("");
    expect(style.getPropertyValue("--code-background")).not.toBe("");
  });

  it("sets the light/dark mode attribute", () => {
    applyTheme(getThemeById("obsidian-indigo")!);
    expect(document.documentElement.dataset.shadowtalkMode).toBe("dark");
    applyTheme(getThemeById("arctic-light")!);
    expect(document.documentElement.dataset.shadowtalkMode).toBe("light");
    expect(document.documentElement.dataset.shadowtalkTemplate).toBe("arctic-light");
  });

  it("persists the active theme id and JSON by default", () => {
    applyTheme(getThemeById("graphite")!);
    expect(getActiveThemeId()).toBe("graphite");
    expect(localStorage.getItem(THEME_JSON_STORAGE_KEY)).toBeTruthy();
  });

  it("temporary preview does not persist", () => {
    applyTheme(getThemeById("graphite")!); // persisted baseline
    applyTheme(getThemeById("neon-quantum")!, { persist: false });
    expect(getActiveThemeId()).toBe("graphite");
    expect(document.documentElement.dataset.shadowtalkTemplate).toBe("neon-quantum");
  });

  it("dispatches an applied event", () => {
    let eventThemeId = "";
    window.addEventListener("shadowtalk-theme-applied", (e) => {
      eventThemeId = (e as CustomEvent).detail?.themeId ?? "";
    });
    applyTheme(getThemeById("graphite")!);
    expect(eventThemeId).toBe("graphite");
  });

  it("normalizes legacy 21-token themes and still applies", () => {
    const legacy = {
      id: "legacy-template",
      name: "Legacy",
      category: "Neural Core",
      description: "Old shape",
      version: 1 as const,
      motion: "calm" as const,
      density: "compact" as const,
      radiusRem: 0.5,
      preview: ["#000000", "#111111", "#222222", "#333333"] as [string, string, string, string],
      tokens: {
        background: "240 12% 3%",
        foreground: "0 0% 96%",
        card: "240 10% 5%",
        cardForeground: "0 0% 96%",
        primary: "195 100% 55%",
        primaryForeground: "240 12% 3%",
        primaryGlow: "195 100% 65%",
        secondary: "270 90% 62%",
        secondaryForeground: "240 12% 3%",
        muted: "240 6% 10%",
        mutedForeground: "240 5% 58%",
        accent: "315 90% 58%",
        accentForeground: "240 12% 3%",
        border: "240 6% 14%",
        ring: "195 100% 55%",
        success: "150 80% 45%",
        warning: "40 95% 55%",
        sidebarBackground: "240 10% 5%",
        sidebarForeground: "0 0% 96%",
        sidebarPrimary: "195 100% 55%",
        sidebarBorder: "240 6% 14%",
      },
    };
    const applied = applyTheme(legacy);
    expect(applied.mode).toBe("dark");
    expect(applied.tokens.popover.length).toBeGreaterThan(0);
    expect(applied.chartColors.length).toBe(5);
    expect(document.documentElement.style.getPropertyValue("--popover")).not.toBe("");
  });

  it("clearAppliedTheme removes everything", () => {
    applyTheme(getThemeById("graphite")!);
    clearAppliedTheme();
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--background")).toBe("");
    expect(document.documentElement.dataset.shadowtalkMode).toBeUndefined();
    expect(getActiveThemeId()).toBeNull();
  });

  it("restoreStoredTheme restores from the JSON snapshot", () => {
    applyTheme(getThemeById("midnight-emerald")!);
    const snapshot = localStorage.getItem(THEME_JSON_STORAGE_KEY)!;
    // Simulate a reload: wipe inline state, keep storage, then restore.
    clearAppliedTheme();
    expect(document.documentElement.dataset.shadowtalkMode).toBeUndefined();
    localStorage.setItem(THEME_JSON_STORAGE_KEY, snapshot);
    const restored = restoreStoredTheme();
    expect(restored?.id).toBe("midnight-emerald");
    expect(document.documentElement.dataset.shadowtalkMode).toBe("dark");
  });

  it("restoreStoredTheme falls back to the registry by id", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "deep-sapphire");
    const restored = restoreStoredTheme();
    expect(restored?.id).toBe("deep-sapphire");
  });

  it("restoreStoredTheme is a no-op for unknown ids", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "does-not-exist");
    expect(restoreStoredTheme()).toBeNull();
    expect(document.documentElement.dataset.shadowtalkMode).toBeUndefined();
  });

  it("survives corrupted stored JSON", () => {
    localStorage.setItem(THEME_JSON_STORAGE_KEY, "{broken");
    expect(loadStoredThemeTemplate()).toBeNull();
    expect(restoreStoredTheme()).toBeNull();
  });

  it("round-trips a custom theme through storage", () => {
    const custom = normalizeTheme({
      id: "custom-x",
      name: "Custom X",
      mode: "light",
      tokens: { background: "210 25% 97%", foreground: "212 40% 13%", primary: "205 75% 45%" },
      source: "custom",
    })!;
    applyTheme(custom);
    const stored = loadStoredThemeTemplate();
    expect(stored?.id).toBe("custom-x");
    expect(stored?.mode).toBe("light");
    expect(stored?.tokens.background).toBe(custom.tokens.background);
  });
});
