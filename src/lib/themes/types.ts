/**
 * ShadowTalk AI — Appearance Studio theme types.
 *
 * The original `ThemeTemplate` shape (v1, 21 tokens) is preserved so stored
 * themes and the auto-improve suggestion panel keep working. Appearance
 * Studio extends it with a full semantic token set, a light/dark mode, font
 * picks, chart and code colors — all normalized through `normalizeTheme`.
 */

export type ThemeMotionLevel = "calm" | "normal" | "energetic";
export type ThemeDensity = "compact" | "comfortable" | "spacious";
export type ThemeMode = "dark" | "light";
export type ThemeSource = "builtin" | "custom" | "imported";

/** HSL triplet as used by the CSS variables, e.g. "220 14% 8%". */
export type HslTriplet = string;

export interface ThemeColorTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  primaryGlow: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  border: string;
  input: string;
  ring: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarBorder: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarRing: string;
}

export interface ThemeTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  version: 1;
  motion: ThemeMotionLevel;
  density: ThemeDensity;
  radiusRem: number;
  tokens: ThemeColorTokens;
  /** Hex swatches for gallery preview */
  preview: [string, string, string, string];
}

/** Five chart colors as HSL triplets (mapped to --chart-1 … --chart-5). */
export type ChartColors = [HslTriplet, HslTriplet, HslTriplet, HslTriplet, HslTriplet];

export interface ThemeCodeColors {
  background: HslTriplet;
  foreground: HslTriplet;
}

/**
 * Canonical, fully-resolved theme used across Appearance Studio.
 * Every field is guaranteed present (legacy/imported data is normalized).
 */
export interface ResolvedTheme extends ThemeTemplate {
  mode: ThemeMode;
  /** Collection id, or "custom" for user-created themes. */
  collection: string;
  fontSans: string;
  fontMono: string;
  tags: string[];
  chartColors: ChartColors;
  codeColors: ThemeCodeColors;
  source: ThemeSource;
  updatedAt?: number;
}

export const THEME_STORAGE_KEY = "shadowtalk_active_theme_id";
export const THEME_JSON_STORAGE_KEY = "shadowtalk_active_theme_json";

export const CUSTOM_THEMES_STORAGE_KEY = "shadowtalk_custom_themes_v1";
export const THEME_FAVORITES_STORAGE_KEY = "shadowtalk_theme_favorites_v1";
export const THEME_RECENTS_STORAGE_KEY = "shadowtalk_theme_recents_v1";
export const THEME_APPEARANCE_SETTINGS_KEY = "appearance_studio";

/** Firestore `user_settings.setting_key` used for cross-device sync. */
export const APPEARANCE_SETTING_KEY = "appearance_studio";

export const MAX_CUSTOM_THEMES = 50;
export const MAX_RECENT_THEMES = 8;
