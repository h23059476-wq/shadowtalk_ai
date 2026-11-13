/**
 * ShadowTalk AI — theme application engine.
 *
 * Writes the complete semantic token set (plus fonts, radius, chart and code
 * colors) as inline CSS variables on <html>, tags the document with
 * data-shadowtalk-* attributes, and persists the active theme to
 * localStorage. Inline variables beat every stylesheet rule, so themes work
 * across the whole app without touching component code.
 */
import type { ResolvedTheme, ThemeTemplate } from "./types";
import { THEME_JSON_STORAGE_KEY, THEME_STORAGE_KEY } from "./types";
import { normalizeTheme } from "./normalize";
import { getMonoFont, getSansFont } from "./fonts";
import { getThemeById } from "./registry";

/** Semantic token → CSS variable. Complete set used by tailwind.config + index.css. */
export const TOKEN_MAP: Record<string, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  primaryGlow: "--primary-glow",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  success: "--success",
  warning: "--warning",
  border: "--border",
  input: "--input",
  ring: "--ring",
  sidebarBackground: "--sidebar-background",
  sidebarForeground: "--sidebar-foreground",
  sidebarPrimary: "--sidebar-primary",
  sidebarBorder: "--sidebar-border",
  sidebarAccent: "--sidebar-accent",
  sidebarAccentForeground: "--sidebar-accent-foreground",
  sidebarRing: "--sidebar-ring",
};

const CHART_VAR_NAMES = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

export interface ApplyThemeOptions {
  /** Persist as the active theme (default true). False = temporary preview. */
  persist?: boolean;
  /** Suppress the shadowtalk-theme-applied event (used for batch updates). */
  silent?: boolean;
}

/**
 * Apply any theme (builtin, custom, legacy) to the live document.
 * Legacy/partial themes are normalized first, so this never throws.
 */
export function applyTheme(themeInput: ThemeTemplate | ResolvedTheme, options: ApplyThemeOptions = {}): ResolvedTheme {
  const { persist = true, silent = false } = options;
  const theme = normalizeTheme(themeInput);
  if (!theme) return normalizeTheme(getThemeById("graphite"))!;

  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(TOKEN_MAP)) {
    const value = (theme.tokens as unknown as Record<string, string>)[key];
    if (typeof value === "string") root.style.setProperty(cssVar, value);
  }

  // Radius + fonts
  root.style.setProperty("--radius", `${theme.radiusRem}rem`);
  root.style.setProperty("--app-font-sans", getSansFont(theme.fontSans).stack);
  root.style.setProperty("--app-font-mono", getMonoFont(theme.fontMono).stack);

  // Chart + code tokens
  theme.chartColors.forEach((color, i) => {
    if (i < CHART_VAR_NAMES.length) root.style.setProperty(CHART_VAR_NAMES[i], color);
  });
  root.style.setProperty("--code-background", theme.codeColors.background);
  root.style.setProperty("--code-foreground", theme.codeColors.foreground);

  // Document-level state attributes
  root.dataset.shadowtalkTemplate = theme.id;
  root.dataset.shadowtalkMotion = theme.motion;
  root.dataset.shadowtalkDensity = theme.density;
  root.dataset.shadowtalkMode = theme.mode;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
      localStorage.setItem(THEME_JSON_STORAGE_KEY, JSON.stringify(theme));
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }

  if (!silent) {
    window.dispatchEvent(
      new CustomEvent("shadowtalk-theme-applied", { detail: { themeId: theme.id, mode: theme.mode } }),
    );
  }
  return theme;
}

/** Legacy entry point kept for the auto-improve suggestion panel. */
export function applyThemeTemplate(template: ThemeTemplate): void {
  applyTheme(template);
}

export function getActiveThemeId(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function loadStoredThemeTemplate(): ResolvedTheme | null {
  try {
    const raw = localStorage.getItem(THEME_JSON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeTheme(parsed);
  } catch {
    return null;
  }
}

/**
 * Restore the persisted active theme on boot. Prefers the stored JSON
 * snapshot (works offline and for custom themes); falls back to the builtin
 * registry by id; silently no-ops when nothing valid is stored.
 */
export function restoreStoredTheme(): ResolvedTheme | null {
  const stored = loadStoredThemeTemplate();
  if (stored) {
    applyTheme(stored, { silent: true });
    return stored;
  }
  const id = getActiveThemeId();
  if (id) {
    const builtin = getThemeById(id);
    if (builtin) {
      applyTheme(builtin, { silent: true });
      return builtin;
    }
  }
  return null;
}

/** Remove every inline theme property and return to the app default look. */
export function clearAppliedTheme(): void {
  const root = document.documentElement;
  for (const cssVar of Object.values(TOKEN_MAP)) {
    root.style.removeProperty(cssVar);
  }
  for (const cssVar of [...CHART_VAR_NAMES, "--radius", "--app-font-sans", "--app-font-mono", "--code-background", "--code-foreground"]) {
    root.style.removeProperty(cssVar);
  }
  delete root.dataset.shadowtalkTemplate;
  delete root.dataset.shadowtalkMotion;
  delete root.dataset.shadowtalkDensity;
  delete root.dataset.shadowtalkMode;
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_JSON_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
