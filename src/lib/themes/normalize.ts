/**
 * ShadowTalk AI — theme normalization.
 *
 * Takes stored / legacy / partially-specified theme data (the original
 * 21-token ThemeTemplate shape included) and produces a complete
 * `ResolvedTheme` by deriving any missing tokens from the core palette.
 * Pure and defensive: never throws, always returns a usable theme.
 */
import type {
  ChartColors,
  ResolvedTheme,
  ThemeCodeColors,
  ThemeColorTokens,
  ThemeMode,
} from "./types";
import { CUSTOM_COLLECTION_ID, isCollectionId } from "./collections";
import { DEFAULT_MONO_FONT, DEFAULT_SANS_FONT, getMonoFont, getSansFont } from "./fonts";
import {
  clampHsl,
  contrastRatio,
  ensureContrast,
  hslToHex,
  hslToTriplet,
  parseHslTriplet,
  readableForeground,
  withL,
  WCAG_AA_NORMAL,
  type HSL,
} from "./contrast";
import type { ThemeTemplate } from "./types";

const TOKEN_KEYS = [
  "background", "foreground", "card", "cardForeground", "primary", "primaryForeground",
  "primaryGlow", "secondary", "secondaryForeground", "muted", "mutedForeground",
  "accent", "accentForeground", "border", "ring", "success", "warning",
  "sidebarBackground", "sidebarForeground", "sidebarPrimary", "sidebarBorder",
  "popover", "popoverForeground", "destructive", "destructiveForeground",
  "input", "sidebarAccent", "sidebarAccentForeground", "sidebarRing",
] as const;

type TokenKey = (typeof TOKEN_KEYS)[number];

function safeTriplet(value: unknown): HSL | null {
  if (typeof value !== "string") return null;
  const hsl = parseHslTriplet(value);
  return hsl ? clampHsl(hsl) : null;
}

function inferMode(bg: HSL, explicit: unknown): ThemeMode {
  if (explicit === "light" || explicit === "dark") return explicit;
  return bg.l < 50 ? "dark" : "light";
}

/**
 * Normalize any theme-like object into a complete ResolvedTheme.
 * Accepts legacy 21-token themes, designer drafts, and imported JSON
 * (after zod validation). Missing metadata gets sensible defaults.
 */
export function normalizeTheme(raw: unknown): ResolvedTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const rawTokens = (data.tokens && typeof data.tokens === "object" ? data.tokens : {}) as Record<string, unknown>;

  const bg = safeTriplet(rawTokens.background) ?? { h: 240, s: 12, l: 5 };
  const mode = inferMode(bg, data.mode);
  const dark = mode === "dark";
  const fgSeed = safeTriplet(rawTokens.foreground) ?? { h: bg.h, s: 20, l: dark ? 93 : 14 };
  const fg = ensureContrast(fgSeed, bg, WCAG_AA_NORMAL);
  const primary = safeTriplet(rawTokens.primary) ?? { h: 205, s: 75, l: dark ? 52 : 42 };
  const secondary = safeTriplet(rawTokens.secondary) ?? { h: (primary.h + 60) % 360, s: Math.min(primary.s, 60), l: dark ? Math.max(primary.l - 6, 40) : Math.min(primary.l + 6, 55) };
  const accent = safeTriplet(rawTokens.accent) ?? { h: (primary.h + 120) % 360, s: Math.min(primary.s, 70), l: dark ? 58 : 45 };

  const card = safeTriplet(rawTokens.card) ?? { h: bg.h, s: dark ? bg.s * 0.7 : bg.s * 0.85, l: dark ? bg.l + 3.5 : bg.l + 2.5 };
  const popover = safeTriplet(rawTokens.popover) ?? withL(card, dark ? card.l + 1.5 : card.l + 1);
  const border = safeTriplet(rawTokens.border) ?? { h: bg.h, s: dark ? bg.s * 0.6 : bg.s * 0.5, l: dark ? bg.l + 10.5 : bg.l - 13 };
  const muted = safeTriplet(rawTokens.muted) ?? { h: bg.h, s: dark ? bg.s * 0.5 : bg.s * 0.6, l: dark ? bg.l + 6.5 : bg.l - 5.5 };
  const input = safeTriplet(rawTokens.input) ?? withL(border, dark ? border.l + 1 : border.l - 1.5);

  const darkCandidate: HSL = { h: bg.h, s: Math.min(bg.s, 14), l: dark ? 8 : 12 };
  const lightCandidate: HSL = { h: 0, s: 0, l: dark ? 97 : 99 };

  const primaryForeground = safeTriplet(rawTokens.primaryForeground)
    ?? readableForeground(primary, darkCandidate, lightCandidate, WCAG_AA_NORMAL);
  const secondaryForeground = safeTriplet(rawTokens.secondaryForeground)
    ?? readableForeground(secondary, darkCandidate, lightCandidate, WCAG_AA_NORMAL);
  const accentForeground = safeTriplet(rawTokens.accentForeground)
    ?? readableForeground(accent, darkCandidate, lightCandidate, WCAG_AA_NORMAL);

  const destructive = safeTriplet(rawTokens.destructive) ?? { h: 0, s: 70, l: dark ? 54 : 46 };
  const destructiveForeground = safeTriplet(rawTokens.destructiveForeground)
    ?? readableForeground(destructive, darkCandidate, lightCandidate, WCAG_AA_NORMAL);
  const success = ensureContrast(safeTriplet(rawTokens.success) ?? { h: 142, s: 60, l: dark ? 48 : 34 }, bg, WCAG_AA_NORMAL);
  const warning = ensureContrast(safeTriplet(rawTokens.warning) ?? { h: 38, s: 88, l: dark ? 56 : 40 }, bg, WCAG_AA_NORMAL);

  const sidebarBackground = safeTriplet(rawTokens.sidebarBackground)
    ?? { h: bg.h, s: dark ? bg.s * 0.75 : bg.s * 0.7, l: dark ? bg.l + 2 : bg.l - 1.5 };
  const sidebarForeground = ensureContrast(
    safeTriplet(rawTokens.sidebarForeground) ?? { ...fg, s: fg.s * 0.9 },
    sidebarBackground,
    WCAG_AA_NORMAL,
  );
  const sidebarPrimary = safeTriplet(rawTokens.sidebarPrimary) ?? primary;
  const sidebarBorder = safeTriplet(rawTokens.sidebarBorder) ?? border;
  const sidebarAccent = safeTriplet(rawTokens.sidebarAccent)
    ?? { h: bg.h, s: bg.s * 0.5, l: dark ? bg.l + 8 : bg.l - 8 };
  const sidebarAccentForeground = ensureContrast(
    safeTriplet(rawTokens.sidebarAccentForeground) ?? { ...fg, s: fg.s * 0.9 },
    sidebarAccent,
    WCAG_AA_NORMAL,
  );
  const sidebarRing = safeTriplet(rawTokens.sidebarRing) ?? primary;
  const ring = safeTriplet(rawTokens.ring) ?? primary;
  const primaryGlow = safeTriplet(rawTokens.primaryGlow)
    ?? { ...primary, l: Math.min(primary.l + (dark ? 12 : 8), 90) };
  const mutedForeground = ensureContrast(
    safeTriplet(rawTokens.mutedForeground) ?? { h: fg.h, s: fg.s * 0.5, l: dark ? Math.max(52, fg.l - 30) : Math.min(45, fg.l + 26) },
    bg,
    WCAG_AA_NORMAL,
  );
  const cardForeground = ensureContrast(safeTriplet(rawTokens.cardForeground) ?? { ...fg, s: fg.s * 0.9 }, card, WCAG_AA_NORMAL);
  const popoverForeground = ensureContrast(safeTriplet(rawTokens.popoverForeground) ?? { ...fg, s: fg.s * 0.9 }, popover, WCAG_AA_NORMAL);

  const tokens: ThemeColorTokens = {
    background: hslToTriplet(bg),
    foreground: hslToTriplet(fg),
    card: hslToTriplet(card),
    cardForeground: hslToTriplet(cardForeground),
    popover: hslToTriplet(popover),
    popoverForeground: hslToTriplet(popoverForeground),
    primary: hslToTriplet(primary),
    primaryForeground: hslToTriplet(primaryForeground),
    primaryGlow: hslToTriplet(primaryGlow),
    secondary: hslToTriplet(secondary),
    secondaryForeground: hslToTriplet(secondaryForeground),
    muted: hslToTriplet(muted),
    mutedForeground: hslToTriplet(mutedForeground),
    accent: hslToTriplet(accent),
    accentForeground: hslToTriplet(accentForeground),
    destructive: hslToTriplet(destructive),
    destructiveForeground: hslToTriplet(destructiveForeground),
    success: hslToTriplet(success),
    warning: hslToTriplet(warning),
    border: hslToTriplet(border),
    input: hslToTriplet(input),
    ring: hslToTriplet(ring),
    sidebarBackground: hslToTriplet(sidebarBackground),
    sidebarForeground: hslToTriplet(sidebarForeground),
    sidebarPrimary: hslToTriplet(sidebarPrimary),
    sidebarBorder: hslToTriplet(sidebarBorder),
    sidebarAccent: hslToTriplet(sidebarAccent),
    sidebarAccentForeground: hslToTriplet(sidebarAccentForeground),
    sidebarRing: hslToTriplet(sidebarRing),
  };

  const rawChart = Array.isArray(data.chartColors) ? data.chartColors : [];
  const chartSeeds: HSL[] = [
    safeTriplet(rawChart[0]) ?? primary,
    safeTriplet(rawChart[1]) ?? secondary,
    safeTriplet(rawChart[2]) ?? accent,
    safeTriplet(rawChart[3]) ?? { h: primary.h + 180, s: Math.min(primary.s, 65), l: dark ? 55 : 45 },
    safeTriplet(rawChart[4]) ?? { h: primary.h + 35, s: Math.min(secondary.s, 70), l: dark ? 62 : 48 },
  ];
  const chartColors = chartSeeds.map((c) => hslToTriplet(ensureContrast(c, bg, 3))) as ChartColors;

  const codeBackground = safeTriplet((data.codeColors as Record<string, unknown> | undefined)?.background)
    ?? { h: bg.h, s: bg.s * 0.8, l: dark ? bg.l + 2.5 : bg.l - 3.5 };
  const codeForeground = ensureContrast(
    safeTriplet((data.codeColors as Record<string, unknown> | undefined)?.foreground) ?? { ...fg, s: fg.s * 0.9 },
    codeBackground,
    WCAG_AA_NORMAL,
  );
  const codeColors: ThemeCodeColors = {
    background: hslToTriplet(codeBackground),
    foreground: hslToTriplet(codeForeground),
  };

  const rawPreview = Array.isArray(data.preview) ? (data.preview as unknown[]) : [];
  const preview = [
    hslToHex(primary), hslToHex(secondary), hslToHex(accent), hslToHex(bg),
  ] as ResolvedTheme["preview"];
  for (let i = 0; i < 4; i++) {
    const hex = typeof rawPreview[i] === "string" && /^#[0-9a-fA-F]{6}$/.test(rawPreview[i] as string)
      ? (rawPreview[i] as string) : preview[i];
    preview[i] = hex;
  }

  const category = typeof data.category === "string" ? data.category : "";
  const collection = isCollectionId(category) || category === CUSTOM_COLLECTION_ID
    ? category
    : typeof data.collection === "string" && (isCollectionId(data.collection) || data.collection === CUSTOM_COLLECTION_ID)
      ? data.collection
      : CUSTOM_COLLECTION_ID;

  const sourceRaw = data.source;
  const source = sourceRaw === "builtin" || sourceRaw === "imported" ? sourceRaw : "custom";

  return {
    id: typeof data.id === "string" && data.id ? data.id : `custom-theme-${Date.now()}`,
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 60) : "Untitled theme",
    category: collection,
    description: typeof data.description === "string" ? data.description.slice(0, 240) : "Custom appearance theme.",
    version: 1,
    motion: data.motion === "calm" || data.motion === "energetic" ? data.motion : "normal",
    density: data.density === "compact" || data.density === "spacious" ? data.density : "comfortable",
    radiusRem: typeof data.radiusRem === "number" && Number.isFinite(data.radiusRem)
      ? Math.min(Math.max(data.radiusRem, 0), 2)
      : 0.75,
    tokens,
    preview,
    mode,
    collection,
    fontSans: getSansFont(typeof data.fontSans === "string" ? data.fontSans : undefined).id,
    fontMono: getMonoFont(typeof data.fontMono === "string" ? data.fontMono : undefined).id,
    tags: Array.isArray(data.tags)
      ? (data.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 8)
      : [mode],
    chartColors,
    codeColors,
    source,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

/** Whether an object looks like a theme the app can normalize and use. */
export function looksLikeTheme(raw: unknown): raw is ThemeTemplate | ResolvedTheme {
  if (!raw || typeof raw !== "object") return false;
  const tokens = (raw as Record<string, unknown>).tokens;
  if (!tokens || typeof tokens !== "object") return false;
  return typeof (tokens as Record<string, unknown>).background === "string"
    && typeof (tokens as Record<string, unknown>).primary === "string";
}

export { TOKEN_KEYS };
export type { TokenKey };

// Re-exported for callers that only need light helpers.
export { contrastRatio };
