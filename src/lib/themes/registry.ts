/**
 * ShadowTalk AI — Appearance Studio curated theme registry.
 *
 * 100 hand-tuned themes across 6 collections, all built by a single
 * deterministic builder (`buildTheme`) that derives the complete semantic
 * token set from a compact seed and enforces WCAG AA contrast on every
 * text-carrying pair. One engine, one registry — no per-theme CSS.
 */
import type {
  ChartColors,
  ResolvedTheme,
  ThemeCodeColors,
  ThemeColorTokens,
  ThemeDensity,
  ThemeMode,
  ThemeMotionLevel,
} from "./types";
import { CUSTOM_COLLECTION_ID } from "./collections";
import { DEFAULT_MONO_FONT, DEFAULT_SANS_FONT } from "./fonts";
import {
  clampHsl,
  contrastRatio,
  ensureContrast,
  hslToHex,
  hslToTriplet,
  readableForeground,
  WCAG_AA_NORMAL,
  type HSL,
} from "./contrast";

/** Seeds may specify colors as compact tuples [h, s, l]. */
type HslInput = HSL | [number, number, number];

function toHsl(v: HslInput): HSL {
  return Array.isArray(v) ? { h: v[0], s: v[1], l: v[2] } : v;
}

interface ThemeSeed {
  id: string;
  name: string;
  /** Short description shown on cards. */
  d: string;
  c: string;
  m: ThemeMode;
  bg: HslInput;
  fg: HslInput;
  pr: HslInput;
  se: HslInput;
  ac: HslInput;
  r?: number;
  mo?: ThemeMotionLevel;
  de?: ThemeDensity;
  fs?: string;
  fm?: string;
  su?: HslInput;
  wa?: HslInput;
  dx?: HslInput;
  tags?: string[];
}

const READABLE_TARGET = WCAG_AA_NORMAL; // 4.5

/**
 * Mid-lightness vivid colors can fall into a dead zone where neither dark
 * nor light text reaches AA. Nudge the base lightness (preserving hue and
 * saturation) until at least one text candidate clears the threshold.
 */
function ensureTextable(base: HSL, darkCand: HSL, lightCand: HSL, min: number): HSL {
  const bestOf = (candidate: HSL) =>
    Math.max(contrastRatio(darkCand, candidate), contrastRatio(lightCand, candidate));
  if (bestOf(base) >= min) return base;
  for (const desaturate of [false, true]) {
    const seedColor = desaturate ? { ...base, s: base.s * 0.5 } : base;
    for (let delta = 2; delta <= 22; delta += 2) {
      const darker = clampHsl({ ...seedColor, l: seedColor.l - delta });
      if (bestOf(darker) >= min) return darker;
      const lighter = clampHsl({ ...seedColor, l: seedColor.l + delta });
      if (bestOf(lighter) >= min) return lighter;
    }
  }
  return base;
}

/**
 * Derive the complete token set from a seed, auto-correcting any pair that
 * misses WCAG AA so shipped themes are always readable.
 */
export function buildTheme(seed: ThemeSeed): ResolvedTheme {
  const dark = seed.m === "dark";
  const bg = clampHsl(toHsl(seed.bg));
  const fg = ensureContrast(clampHsl(toHsl(seed.fg)), bg, READABLE_TARGET);

  const cardL = dark ? bg.l + 3.5 : bg.l + 2.5;
  const card = clampHsl({ h: bg.h, s: dark ? bg.s * 0.7 : bg.s * 0.85, l: cardL });
  const popover = clampHsl({ ...card, l: dark ? card.l + 1.5 : card.l + 1 });
  const cardForeground = ensureContrast({ ...fg, s: fg.s * 0.9 }, card, READABLE_TARGET);
  const popoverForeground = ensureContrast({ ...fg, s: fg.s * 0.9 }, popover, READABLE_TARGET);

  const darkCandidate = (): HSL => ({ h: bg.h, s: Math.min(bg.s, 14), l: dark ? 8 : 12 });
  const lightCandidate = (base: HSL): HSL => ({ h: base.h, s: Math.min(base.s, 18), l: dark ? 97 : 99 });

  const primary = ensureTextable(clampHsl(toHsl(seed.pr)), darkCandidate(), lightCandidate(clampHsl(toHsl(seed.pr))), READABLE_TARGET);
  const secondary = ensureTextable(clampHsl(toHsl(seed.se)), darkCandidate(), lightCandidate(clampHsl(toHsl(seed.se))), READABLE_TARGET);
  const accent = ensureTextable(clampHsl(toHsl(seed.ac)), darkCandidate(), lightCandidate(clampHsl(toHsl(seed.ac))), READABLE_TARGET);

  const primaryForeground = readableForeground(primary, darkCandidate(), lightCandidate(primary), READABLE_TARGET);
  const secondaryForeground = readableForeground(secondary, darkCandidate(), lightCandidate(secondary), READABLE_TARGET);
  const accentForeground = readableForeground(accent, darkCandidate(), lightCandidate(accent), READABLE_TARGET);

  const muted = clampHsl({ h: bg.h, s: dark ? bg.s * 0.5 : bg.s * 0.6, l: dark ? bg.l + 6.5 : bg.l - 5.5 });
  const mutedSeed = { h: fg.h, s: fg.s * 0.5, l: dark ? Math.max(52, fg.l - 30) : Math.min(45, fg.l + 26) };
  const mutedForeground = ensureContrast(mutedSeed, bg, READABLE_TARGET);

  const border = clampHsl({ h: bg.h, s: dark ? bg.s * 0.6 : bg.s * 0.5, l: dark ? bg.l + 10.5 : bg.l - 13 });
  const input = clampHsl({ ...border, l: dark ? border.l + 1 : border.l - 1.5 });

  const success = ensureContrast(clampHsl(toHsl(seed.su ?? { h: 142, s: 60, l: dark ? 48 : 34 })), bg, WCAG_AA_NORMAL);
  const warning = ensureContrast(clampHsl(toHsl(seed.wa ?? { h: 38, s: 88, l: dark ? 56 : 40 })), bg, WCAG_AA_NORMAL);
  const destructiveRaw = clampHsl(toHsl(seed.dx ?? { h: 0, s: 70, l: dark ? 54 : 46 }));
  const destructive = ensureTextable(destructiveRaw, darkCandidate(), lightCandidate(destructiveRaw), READABLE_TARGET);
  const destructiveForeground = readableForeground(destructive, darkCandidate(), lightCandidate(destructive), READABLE_TARGET);

  const sidebarBackground = clampHsl({ h: bg.h, s: dark ? bg.s * 0.75 : bg.s * 0.7, l: dark ? bg.l + 2 : bg.l - 1.5 });
  const sidebarForeground = ensureContrast({ ...fg, s: fg.s * 0.9 }, sidebarBackground, READABLE_TARGET);
  const sidebarPrimary = ensureContrast(primary, sidebarBackground, 3);
  const sidebarAccent = clampHsl({ h: bg.h, s: bg.s * 0.5, l: dark ? bg.l + 8 : bg.l - 8 });
  const sidebarAccentForeground = ensureContrast({ ...fg, s: fg.s * 0.9 }, sidebarAccent, READABLE_TARGET);
  const sidebarBorder = border;
  const sidebarRing = primary;

  const primaryGlow = clampHsl({ ...primary, l: Math.min(primary.l + (dark ? 12 : 8), 90) });
  const ring = primary;

  const chartSeed: HSL[] = [
    primary,
    secondary,
    accent,
    { h: primary.h + 180, s: Math.min(primary.s, 65), l: dark ? 55 : 45 },
    { h: primary.h + 35, s: Math.min(secondary.s, 70), l: dark ? 62 : 48 },
  ];
  const chartColors = chartSeed.map(
    (c) => hslToTriplet(ensureContrast(clampHsl(c), bg, 3)),
  ) as ChartColors;

  const codeBackground = clampHsl({ h: bg.h, s: bg.s * 0.8, l: dark ? bg.l + 2.5 : bg.l - 3.5 });
  const codeForeground = ensureContrast({ ...fg, s: fg.s * 0.9 }, codeBackground, READABLE_TARGET);

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

  return {
    id: seed.id,
    name: seed.name,
    category: seed.c,
    description: seed.d,
    version: 1,
    motion: seed.mo ?? "normal",
    density: seed.de ?? "comfortable",
    radiusRem: seed.r ?? 0.75,
    tokens,
    preview: [
      hslToHex(primary),
      hslToHex(secondary),
      hslToHex(accent),
      hslToHex(bg),
    ],
    mode: seed.m,
    collection: seed.c,
    fontSans: seed.fs ?? DEFAULT_SANS_FONT,
    fontMono: seed.fm ?? DEFAULT_MONO_FONT,
    tags: seed.tags ?? [seed.m === "dark" ? "dark" : "light"],
    chartColors,
    codeColors: {
      background: hslToTriplet(codeBackground),
      foreground: hslToTriplet(codeForeground),
    },
    source: "builtin",
  };
}

/** Contrast audit for any resolved theme — used by tests and the designer UI. */
export interface ThemeContrastIssue {
  pair: string;
  ratio: number;
  required: number;
}

export function validateThemeContrast(theme: {
  mode: ThemeMode;
  tokens: ThemeColorTokens;
  chartColors: ChartColors;
  codeColors: ThemeCodeColors;
}): ThemeContrastIssue[] {
  const issues: ThemeContrastIssue[] = [];
  const pairs: Array<[string, string, string, number]> = [
    ["foreground/background", theme.tokens.foreground, theme.tokens.background, READABLE_TARGET],
    ["cardForeground/card", theme.tokens.cardForeground, theme.tokens.card, READABLE_TARGET],
    ["popoverForeground/popover", theme.tokens.popoverForeground, theme.tokens.popover, READABLE_TARGET],
    ["mutedForeground/background", theme.tokens.mutedForeground, theme.tokens.background, READABLE_TARGET],
    ["primaryForeground/primary", theme.tokens.primaryForeground, theme.tokens.primary, READABLE_TARGET],
    ["secondaryForeground/secondary", theme.tokens.secondaryForeground, theme.tokens.secondary, READABLE_TARGET],
    ["accentForeground/accent", theme.tokens.accentForeground, theme.tokens.accent, READABLE_TARGET],
    ["destructiveForeground/destructive", theme.tokens.destructiveForeground, theme.tokens.destructive, READABLE_TARGET],
    ["sidebarForeground/sidebarBackground", theme.tokens.sidebarForeground, theme.tokens.sidebarBackground, READABLE_TARGET],
    ["success/background", theme.tokens.success, theme.tokens.background, 3],
    ["warning/background", theme.tokens.warning, theme.tokens.background, 3],
    ["codeForeground/codeBackground", theme.codeColors.foreground, theme.codeColors.background, READABLE_TARGET],
  ];
  for (const [pair, fg, bg, required] of pairs) {
    const ratio = contrastRatioTriplet(fg, bg);
    if (ratio < required) issues.push({ pair, ratio: Math.round(ratio * 100) / 100, required });
  }
  theme.chartColors.forEach((c, i) => {
    const ratio = contrastRatioTriplet(c, theme.tokens.background);
    if (ratio < 3) issues.push({ pair: `chart-${i + 1}/background`, ratio: Math.round(ratio * 100) / 100, required: 3 });
  });
  return issues;
}

function contrastRatioTriplet(a: string, b: string): number {
  // Local parse to keep this module free of circular helper imports at runtime.
  const parse = (t: string): HSL | null => {
    const m = /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(t);
    return m ? { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) } : null;
  };
  const ha = parse(a);
  const hb = parse(b);
  if (!ha || !hb) return 1;
  return contrastRatio(ha, hb);
}

// ---------------------------------------------------------------------------
// Collection 1 — Dark and Futuristic (25)
// ---------------------------------------------------------------------------

const SEEDS_DARK_FUTURISTIC: ThemeSeed[] = [
  {
    id: "obsidian-indigo", name: "Obsidian Indigo", c: "dark-futuristic", m: "dark",
    d: "Volcanic-glass blacks under a beam of electric indigo — the signature ShadowTalk night palette.",
    bg: [250, 28, 5], fg: [235, 45, 93], pr: [234, 89, 64], se: [205, 80, 58], ac: [268, 80, 66],
    r: 0.6, mo: "energetic", tags: ["indigo", "signature", "glow"],
  },
  {
    id: "midnight-emerald", name: "Midnight Emerald", c: "dark-futuristic", m: "dark",
    d: "Deep emerald night with jewel-toned greens — calm focus for long sessions.",
    bg: [160, 30, 5], fg: [150, 40, 93], pr: [158, 71, 45], se: [175, 60, 50], ac: [110, 55, 55],
    r: 0.6, mo: "calm", tags: ["emerald", "jewel", "calm"],
  },
  {
    id: "deep-sapphire", name: "Deep Sapphire", c: "dark-futuristic", m: "dark",
    d: "Submarine blue-black surfaces lit by radiant sapphire and teal instruments.",
    bg: [222, 45, 6], fg: [215, 50, 94], pr: [217, 91, 60], se: [190, 75, 52], ac: [265, 70, 62],
    r: 0.5, mo: "energetic", tags: ["sapphire", "ocean", "luminous"],
  },
  {
    id: "cosmic-violet", name: "Cosmic Violet", c: "dark-futuristic", m: "dark",
    d: "Nebula purples with a bright violet core and cyan starlight accents.",
    bg: [265, 35, 6], fg: [260, 50, 94], pr: [262, 83, 66], se: [300, 65, 60], ac: [190, 70, 55],
    r: 0.75, mo: "energetic", tags: ["violet", "cosmic", "nebula"],
  },
  {
    id: "neon-quantum", name: "Neon Quantum", c: "dark-futuristic", m: "dark",
    d: "Lab-black interface with laser cyan and magenta circuitry highlights.",
    bg: [230, 25, 5], fg: [210, 35, 94], pr: [185, 95, 55], se: [315, 85, 60], ac: [265, 80, 62],
    r: 0.5, mo: "energetic", tags: ["neon", "cyber", "laser"],
  },
  {
    id: "plasma-pulse", name: "Plasma Pulse", c: "dark-futuristic", m: "dark",
    d: "Charged magenta plasma over a wine-dark void — high energy for heavy workloads.",
    bg: [350, 30, 6], fg: [345, 40, 94], pr: [330, 90, 60], se: [270, 70, 58], ac: [20, 90, 58],
    r: 0.5, mo: "energetic", tags: ["plasma", "magenta", "energy"],
  },
  {
    id: "cyber-teal", name: "Cyber Teal", c: "dark-futuristic", m: "dark",
    d: "Ink-black screens with terminal teal — a hacker's steady-hand palette.",
    bg: [200, 35, 5], fg: [195, 35, 93], pr: [172, 80, 45], se: [210, 70, 52], ac: [310, 70, 60],
    r: 0.5, mo: "normal", tags: ["teal", "terminal", "hacker"],
  },
  {
    id: "solar-flare", name: "Solar Flare", c: "dark-futuristic", m: "dark",
    d: "Charred amber darkness radiating molten gold and ember accents.",
    bg: [28, 30, 5], fg: [32, 45, 93], pr: [35, 95, 58], se: [15, 85, 55], ac: [200, 70, 55],
    r: 0.5, mo: "energetic", tags: ["solar", "amber", "molten"],
  },
  {
    id: "ultraviolet-haze", name: "Ultraviolet Haze", c: "dark-futuristic", m: "dark",
    d: "Soft ultraviolet fog with violet instruments and pink warning strobes.",
    bg: [280, 30, 6], fg: [280, 35, 94], pr: [285, 75, 62], se: [230, 70, 58], ac: [330, 75, 62],
    r: 0.75, mo: "normal", tags: ["ultraviolet", "haze", "violet"],
  },
  {
    id: "quantum-rose", name: "Quantum Rose", c: "dark-futuristic", m: "dark",
    d: "Velvet rose darkness with neon rose primaries and mint counterpoints.",
    bg: [340, 28, 6], fg: [340, 40, 94], pr: [345, 85, 62], se: [265, 60, 58], ac: [160, 65, 50],
    r: 0.75, mo: "normal", tags: ["rose", "velvet", "neon"],
  },
  {
    id: "ion-storm", name: "Ion Storm", c: "dark-futuristic", m: "dark",
    d: "Storm-front slate crackling with electric blue and voltage green.",
    bg: [215, 22, 5], fg: [210, 30, 94], pr: [210, 95, 58], se: [260, 70, 58], ac: [150, 70, 48],
    r: 0.5, mo: "energetic", tags: ["storm", "electric", "blue"],
  },
  {
    id: "nebula-drift", name: "Nebula Drift", c: "dark-futuristic", m: "dark",
    d: "Slow-drifting nebula clouds in violet with coral star clusters.",
    bg: [255, 32, 7], fg: [255, 40, 94], pr: [300, 80, 65], se: [220, 70, 55], ac: [180, 65, 50],
    r: 0.75, mo: "calm", tags: ["nebula", "space", "dream"],
  },
  {
    id: "carbon-fiber", name: "Carbon Fiber", c: "dark-futuristic", m: "dark",
    d: "Matte carbon weave with steel-blue instrumentation — engineering-room quiet.",
    bg: [220, 8, 6], fg: [210, 15, 92], pr: [205, 80, 55], se: [270, 45, 55], ac: [150, 55, 45],
    r: 0.375, de: "compact", mo: "calm", tags: ["carbon", "steel", "matte"],
  },
  {
    id: "holographic-mint", name: "Holographic Mint", c: "dark-futuristic", m: "dark",
    d: "Glassy dark surfaces refracting holographic mint and lavender light.",
    bg: [170, 25, 5], fg: [165, 35, 93], pr: [160, 85, 55], se: [200, 70, 52], ac: [280, 65, 60],
    r: 0.625, mo: "normal", tags: ["holographic", "mint", "glass"],
  },
  {
    id: "aurora-borealis", name: "Aurora Borealis", c: "dark-futuristic", m: "dark",
    d: "Polar night sky with aurora green ribbons and violet shimmer.",
    bg: [195, 30, 6], fg: [190, 35, 93], pr: [150, 85, 55], se: [280, 65, 60], ac: [35, 90, 58],
    r: 0.75, mo: "normal", tags: ["aurora", "polar", "shimmer"],
  },
  {
    id: "hyperspace-blue", name: "Hyperspace Blue", c: "dark-futuristic", m: "dark",
    d: "Jump-to-lightspeed navy with streaking azure and violet propulsion.",
    bg: [228, 40, 6], fg: [225, 45, 94], pr: [225, 90, 62], se: [275, 65, 60], ac: [180, 75, 52],
    r: 0.625, mo: "energetic", tags: ["hyperspace", "navy", "speed"],
  },
  {
    id: "crimson-protocol", name: "Crimson Protocol", c: "dark-futuristic", m: "dark",
    d: "Red-alert operations deck — disciplined crimson with cool steel backups.",
    bg: [355, 30, 5], fg: [350, 40, 93], pr: [350, 85, 55], se: [215, 55, 52], ac: [40, 85, 55],
    r: 0.5, de: "compact", mo: "energetic", tags: ["crimson", "alert", "ops"],
  },
  {
    id: "tungsten-dawn", name: "Tungsten Dawn", c: "dark-futuristic", m: "dark",
    d: "Warm tungsten glow on machined dark bronze — sunrise inside the machine.",
    bg: [25, 25, 6], fg: [30, 40, 92], pr: [28, 92, 56], se: [195, 60, 52], ac: [330, 70, 60],
    r: 0.625, mo: "normal", tags: ["tungsten", "bronze", "dawn"],
  },
  {
    id: "vector-violet", name: "Vector Violet", c: "dark-futuristic", m: "dark",
    d: "Blueprint indigo traced with sharp violet vectors and ice-blue nodes.",
    bg: [245, 30, 6], fg: [240, 40, 94], pr: [240, 85, 65], se: [195, 70, 52], ac: [310, 75, 62],
    r: 0.5, mo: "energetic", tags: ["vector", "indigo", "blueprint"],
  },
  {
    id: "chrome-mint", name: "Chrome Mint", c: "dark-futuristic", m: "dark",
    d: "Brushed chrome neutrals with a crisp mint signal line — precision tools.",
    bg: [200, 12, 6], fg: [200, 20, 92], pr: [165, 75, 52], se: [230, 50, 55], ac: [300, 60, 60],
    r: 0.375, de: "compact", mo: "calm", tags: ["chrome", "mint", "precision"],
  },
  {
    id: "dark-matter", name: "Dark Matter", c: "dark-futuristic", m: "dark",
    d: "The void between stars — near-black neutral with an ice-cyan gravity well.",
    bg: [240, 6, 4], fg: [210, 20, 90], pr: [190, 70, 60], se: [260, 40, 55], ac: [140, 55, 48],
    r: 0.375, de: "compact", mo: "calm", tags: ["void", "minimal", "cyan"],
  },
  {
    id: "flux-coral", name: "Flux Coral", c: "dark-futuristic", m: "dark",
    d: "Deep ember flux with coral discharges and cyan coolant lines.",
    bg: [15, 30, 6], fg: [18, 40, 93], pr: [10, 90, 60], se: [200, 65, 52], ac: [290, 70, 60],
    r: 0.75, mo: "energetic", tags: ["coral", "ember", "reactor"],
  },
  {
    id: "static-noise", name: "Static Noise", c: "dark-futuristic", m: "dark",
    d: "CRT static gray with phosphor green scanlines — retro-future terminal.",
    bg: [220, 10, 5], fg: [220, 18, 92], pr: [140, 80, 50], se: [215, 50, 52], ac: [330, 75, 60],
    r: 0.375, de: "compact", mo: "calm", tags: ["crt", "phosphor", "retro"],
  },
  {
    id: "event-horizon", name: "Event Horizon", c: "dark-futuristic", m: "dark",
    d: "The edge of a black hole — crushed violet-black with accretion-disk color.",
    bg: [260, 20, 4], fg: [255, 30, 93], pr: [270, 80, 60], se: [215, 60, 50], ac: [330, 80, 60],
    r: 0.625, mo: "energetic", tags: ["event-horizon", "black-hole", "dramatic"],
  },
  {
    id: "starlight-chrome", name: "Starlight Chrome", c: "dark-futuristic", m: "dark",
    d: "Moonlit chrome panels with silver-blue highlights and mono telemetry.",
    bg: [215, 18, 6], fg: [213, 25, 93], pr: [210, 60, 65], se: [265, 55, 58], ac: [160, 60, 48],
    r: 0.625, mo: "normal", fm: "jetbrains-mono", tags: ["starlight", "chrome", "telemetry"],
  },
];

// ---------------------------------------------------------------------------
// Collection 2 — Minimal and Professional (20)
// ---------------------------------------------------------------------------

const SEEDS_MINIMAL_PROFESSIONAL: ThemeSeed[] = [
  {
    id: "graphite", name: "Graphite", c: "minimal-professional", m: "dark",
    d: "Pencil-lead neutrals with a calm blue accent — the dependable professional default.",
    bg: [220, 6, 8], fg: [220, 15, 92], pr: [210, 60, 55], se: [215, 25, 45], ac: [150, 45, 48],
    r: 0.5, de: "compact", mo: "calm", fs: "system", tags: ["graphite", "neutral", "focus"],
  },
  {
    id: "porcelain", name: "Porcelain", c: "minimal-professional", m: "light",
    d: "Fine porcelain white with ink-blue writing — clean desk, clear mind.",
    bg: [220, 15, 97], fg: [220, 30, 12], pr: [215, 70, 45], se: [210, 30, 55], ac: [160, 45, 42],
    r: 0.5, mo: "calm", fs: "system", tags: ["porcelain", "clean", "ink"],
  },
  {
    id: "slate-executive", name: "Slate Executive", c: "minimal-professional", m: "dark",
    d: "Boardroom slate with a steel-blue tie — understated authority.",
    bg: [215, 12, 9], fg: [213, 20, 92], pr: [213, 50, 50], se: [220, 30, 50], ac: [185, 55, 45],
    r: 0.375, de: "compact", mo: "calm", fs: "system", tags: ["slate", "executive", "steel"],
  },
  {
    id: "pearl-office", name: "Pearl Office", c: "minimal-professional", m: "light",
    d: "Pearl-gray daylight workspace with ocean-blue accents.",
    bg: [220, 10, 96], fg: [220, 25, 14], pr: [200, 45, 40], se: [215, 30, 50], ac: [150, 40, 42],
    r: 0.375, fs: "system", tags: ["pearl", "office", "daylight"],
  },
  {
    id: "obsidian-slate", name: "Obsidian Slate", c: "minimal-professional", m: "dark",
    d: "Near-black slate with a quiet azure line — late-night accounting energy.",
    bg: [210, 8, 5], fg: [210, 18, 92], pr: [200, 40, 55], se: [260, 35, 55], ac: [170, 45, 45],
    r: 0.375, de: "compact", mo: "calm", fs: "system", fm: "ibm-plex-mono", tags: ["obsidian", "slate", "ledger"],
  },
  {
    id: "stone-paper", name: "Stone Paper", c: "minimal-professional", m: "light",
    d: "Warm stone-gray paper with terra accents — tactile, grounded, distraction-free.",
    bg: [40, 8, 95], fg: [35, 25, 14], pr: [30, 40, 38], se: [210, 25, 48], ac: [150, 40, 40],
    r: 0.5, fs: "manrope", tags: ["stone", "paper", "tactile"],
  },
  {
    id: "mercury", name: "Mercury", c: "minimal-professional", m: "dark",
    d: "Liquid-metal gray with a silver-blue meniscus — fast, fluid, frictionless.",
    bg: [220, 5, 10], fg: [220, 12, 93], pr: [220, 25, 60], se: [210, 18, 45], ac: [160, 40, 50],
    r: 0.25, de: "compact", mo: "calm", fs: "system", tags: ["mercury", "metal", "fluid"],
  },
  {
    id: "leaden-mist", name: "Leaden Mist", c: "minimal-professional", m: "light",
    d: "Soft leaden morning mist with a steady blue-gray anchor.",
    bg: [215, 8, 93], fg: [215, 28, 16], pr: [215, 35, 42], se: [210, 25, 50], ac: [190, 45, 40],
    r: 0.375, fs: "system", tags: ["leaden", "mist", "soft"],
  },
  {
    id: "jetline", name: "Jetline", c: "minimal-professional", m: "dark",
    d: "Business-jet cabin dark with runway-blue guidance lights.",
    bg: [220, 10, 6], fg: [218, 20, 93], pr: [200, 65, 50], se: [230, 30, 48], ac: [155, 55, 48],
    r: 0.375, de: "compact", mo: "calm", fs: "ibm-plex-sans", tags: ["jetline", "aviation", "guided"],
  },
  {
    id: "ivory-workspace", name: "Ivory Workspace", c: "minimal-professional", m: "light",
    d: "Ivory library walls with navy book-bindings — quiet scholarship.",
    bg: [45, 20, 96], fg: [40, 30, 14], pr: [210, 45, 42], se: [35, 45, 45], ac: [160, 45, 40],
    r: 0.5, fs: "manrope", tags: ["ivory", "library", "scholar"],
  },
  {
    id: "monochrome-pro", name: "Monochrome Pro", c: "minimal-professional", m: "dark",
    d: "Pure grayscale discipline — zero hue, all structure, all signal.",
    bg: [0, 0, 7], fg: [0, 0, 93], pr: [0, 0, 88], se: [0, 0, 65], ac: [0, 0, 45],
    r: 0.25, de: "compact", mo: "calm", fs: "system", tags: ["grayscale", "mono", "structure"],
  },
  {
    id: "bleached-linen", name: "Bleached Linen", c: "minimal-professional", m: "light",
    d: "Sun-bleached linen with walnut-brown writing and slate trim.",
    bg: [40, 15, 96], fg: [35, 28, 15], pr: [25, 45, 42], se: [210, 25, 48], ac: [150, 40, 40],
    r: 0.5, fs: "manrope", tags: ["linen", "walnut", "natural"],
  },
  {
    id: "cobalt-focus", name: "Cobalt Focus", c: "minimal-professional", m: "dark",
    d: "Graphite workspace with a single cobalt focus beam.",
    bg: [220, 14, 8], fg: [220, 25, 93], pr: [221, 80, 55], se: [265, 45, 55], ac: [175, 55, 48],
    r: 0.5, fs: "system", tags: ["cobalt", "focus", "beam"],
  },
  {
    id: "glacier-desk", name: "Glacier Desk", c: "minimal-professional", m: "light",
    d: "Glacier-cool whites with deep-water blues — crisp arctic office air.",
    bg: [200, 20, 96], fg: [205, 30, 15], pr: [200, 65, 42], se: [215, 30, 50], ac: [160, 45, 40],
    r: 0.5, fs: "manrope", tags: ["glacier", "crisp", "arctic"],
  },
  {
    id: "steel-blueprint", name: "Steel Blueprint", c: "minimal-professional", m: "dark",
    d: "Drafting-table steel with technical blue linework and mono annotations.",
    bg: [210, 18, 9], fg: [210, 25, 92], pr: [205, 55, 52], se: [225, 35, 50], ac: [175, 50, 45],
    r: 0.375, de: "compact", fs: "ibm-plex-sans", fm: "ibm-plex-mono", tags: ["blueprint", "drafting", "technical"],
  },
  {
    id: "lumen-office", name: "Lumen Office", c: "minimal-professional", m: "light",
    d: "Bright lumen whites balanced by a confident cerulean signature.",
    bg: [210, 12, 97], fg: [212, 28, 15], pr: [205, 60, 40], se: [220, 30, 52], ac: [155, 45, 42],
    r: 0.375, fs: "system", tags: ["lumen", "bright", "cerulean"],
  },
  {
    id: "titan-gray", name: "Titan Gray", c: "minimal-professional", m: "dark",
    d: "Aircraft-grade titanium grays with restrained instrument blue.",
    bg: [215, 8, 11], fg: [214, 16, 93], pr: [210, 30, 55], se: [250, 30, 52], ac: [160, 40, 48],
    r: 0.5, fs: "system", tags: ["titanium", "industrial", "steady"],
  },
  {
    id: "crisp-cotton", name: "Crisp Cotton", c: "minimal-professional", m: "light",
    d: "Fresh-pressed cotton white with soft indigo stitches.",
    bg: [210, 8, 97], fg: [215, 30, 13], pr: [220, 50, 45], se: [205, 30, 50], ac: [150, 45, 42],
    r: 0.625, fs: "manrope", tags: ["cotton", "fresh", "soft"],
  },
  {
    id: "basalt-column", name: "Basalt Column", c: "minimal-professional", m: "dark",
    d: "Columnar basalt strata with glacial-teal seams — geological stability.",
    bg: [210, 10, 7], fg: [210, 20, 91], pr: [195, 45, 48], se: [220, 30, 48], ac: [155, 50, 45],
    r: 0.375, de: "compact", mo: "calm", fs: "system", tags: ["basalt", "geological", "stable"],
  },
  {
    id: "paper-blueprint", name: "Paper Blueprint", c: "minimal-professional", m: "light",
    d: "Blueprint-grid paper with drafting cobalt — plans before products.",
    bg: [215, 25, 96], fg: [217, 35, 15], pr: [217, 75, 45], se: [210, 30, 48], ac: [170, 50, 42],
    r: 0.375, fs: "ibm-plex-sans", tags: ["blueprint", "planning", "cobalt"],
  },
];

// ---------------------------------------------------------------------------
// Collection 3 — Nature and Atmospheric (20)
// ---------------------------------------------------------------------------

const SEEDS_NATURE_ATMOSPHERIC: ThemeSeed[] = [
  {
    id: "deep-forest", name: "Deep Forest", c: "nature-atmospheric", m: "dark",
    d: "Old-growth darkness with moss-green trails and amber firefly accents.",
    bg: [150, 25, 6], fg: [145, 30, 92], pr: [145, 55, 42], se: [95, 45, 45], ac: [40, 70, 52],
    r: 0.75, mo: "calm", fs: "manrope", tags: ["forest", "moss", "fireflies"],
  },
  {
    id: "moss-canyon", name: "Moss Canyon", c: "nature-atmospheric", m: "dark",
    d: "Lichen-covered canyon stone with sage light and clay warmth.",
    bg: [120, 18, 7], fg: [115, 25, 91], pr: [95, 45, 45], se: [30, 50, 48], ac: [160, 50, 50],
    r: 0.75, mo: "calm", fs: "manrope", tags: ["canyon", "lichen", "clay"],
  },
  {
    id: "alpine-meadow", name: "Alpine Meadow", c: "nature-atmospheric", m: "light",
    d: "High-altitude morning meadow — pine air, glacier water, warm sun.",
    bg: [140, 25, 96], fg: [145, 35, 14], pr: [150, 55, 35], se: [190, 40, 45], ac: [35, 65, 42],
    r: 0.75, fs: "manrope", tags: ["alpine", "meadow", "morning"],
  },
  {
    id: "misty-harbor", name: "Misty Harbor", c: "nature-atmospheric", m: "light",
    d: "Fog-soft harbor morning with deep-water blue and driftwood accents.",
    bg: [200, 20, 95], fg: [205, 30, 15], pr: [205, 60, 42], se: [150, 35, 40], ac: [30, 55, 45],
    r: 0.75, fs: "manrope", tags: ["harbor", "fog", "driftwood"],
  },
  {
    id: "redwood-dusk", name: "Redwood Dusk", c: "nature-atmospheric", m: "dark",
    d: "Redwood bark at dusk — rusted sienna with cool stream silver.",
    bg: [15, 25, 6], fg: [20, 35, 92], pr: [18, 65, 45], se: [200, 45, 50], ac: [95, 50, 48],
    r: 0.75, mo: "calm", tags: ["redwood", "rust", "dusk"],
  },
  {
    id: "tundra-frost", name: "Tundra Frost", c: "nature-atmospheric", m: "light",
    d: "Frost-white tundra plain under a glacial blue sky.",
    bg: [190, 18, 96], fg: [200, 32, 14], pr: [195, 55, 42], se: [150, 35, 40], ac: [260, 40, 50],
    r: 0.5, fs: "system", tags: ["tundra", "frost", "glacial"],
  },
  {
    id: "rainforest-canopy", name: "Rainforest Canopy", c: "nature-atmospheric", m: "dark",
    d: "Under-canopy humidity with saturated leaf greens and orchid accents.",
    bg: [155, 30, 5], fg: [150, 35, 92], pr: [150, 60, 38], se: [105, 45, 42], ac: [280, 45, 55],
    r: 0.75, mo: "calm", tags: ["rainforest", "canopy", "orchid"],
  },
  {
    id: "desert-sand", name: "Desert Sand", c: "nature-atmospheric", m: "light",
    d: "Sun-warmed dune sand with terracotta and sagebrush accents.",
    bg: [35, 35, 94], fg: [32, 35, 15], pr: [22, 55, 42], se: [200, 35, 45], ac: [90, 45, 40],
    r: 0.625, fs: "manrope", tags: ["desert", "dune", "terracotta"],
  },
  {
    id: "ocean-trench", name: "Ocean Trench", c: "nature-atmospheric", m: "dark",
    d: "Abyssal blue with pressure-deep gradients and bioluminescent accents.",
    bg: [210, 40, 5], fg: [207, 40, 92], pr: [205, 75, 48], se: [180, 55, 45], ac: [280, 50, 58],
    r: 0.75, mo: "calm", tags: ["ocean", "abyss", "bioluminescent"],
  },
  {
    id: "coral-reef", name: "Coral Reef", c: "nature-atmospheric", m: "light",
    d: "Shallow reef water over white sand with coral and kelp colors.",
    bg: [180, 25, 95], fg: [185, 35, 14], pr: [175, 60, 38], se: [345, 55, 55], ac: [95, 45, 38],
    r: 0.625, fs: "manrope", tags: ["reef", "coral", "shallow"],
  },
  {
    id: "lavender-fields", name: "Lavender Fields", c: "nature-atmospheric", m: "light",
    d: "Provence lavender rows under a hazy violet horizon.",
    bg: [280, 20, 96], fg: [280, 30, 15], pr: [275, 45, 48], se: [200, 40, 45], ac: [330, 50, 52],
    r: 0.75, fs: "manrope", tags: ["lavender", "provence", "hazy"],
  },
  {
    id: "pine-needle", name: "Pine Needle", c: "nature-atmospheric", m: "dark",
    d: "Needle-strewn forest floor — resinous greens with ember-campfire accents.",
    bg: [145, 22, 7], fg: [143, 28, 91], pr: [148, 50, 40], se: [70, 40, 42], ac: [25, 60, 50],
    r: 0.5, de: "compact", mo: "calm", tags: ["pine", "resin", "campfire"],
  },
  {
    id: "autumn-forest", name: "Autumn Forest", c: "nature-atmospheric", m: "dark",
    d: "October woods — amber leaves, rusted light, maple accents.",
    bg: [40, 25, 6], fg: [38, 35, 92], pr: [35, 75, 50], se: [15, 60, 48], ac: [150, 45, 45],
    r: 0.75, mo: "calm", tags: ["autumn", "amber", "maple"],
  },
  {
    id: "morning-meadow", name: "Morning Meadow", c: "nature-atmospheric", m: "light",
    d: "Dew-lit grassland with fresh chlorophyll and sky-blue accents.",
    bg: [100, 25, 95], fg: [105, 35, 14], pr: [100, 50, 38], se: [195, 45, 45], ac: [25, 60, 45],
    r: 0.625, fs: "manrope", tags: ["meadow", "dew", "chlorophyll"],
  },
  {
    id: "arctic-tundra", name: "Arctic Tundra", c: "nature-atmospheric", m: "dark",
    d: "Polar night with ice-blue aurora and distant starlight.",
    bg: [200, 22, 6], fg: [198, 30, 93], pr: [197, 65, 55], se: [150, 40, 42], ac: [265, 45, 55],
    r: 0.5, mo: "calm", tags: ["arctic", "ice", "aurora"],
  },
  {
    id: "sage-valley", name: "Sage Valley", c: "nature-atmospheric", m: "light",
    d: "Soft sage hillsides with warm path-clay accents.",
    bg: [120, 15, 94], fg: [120, 28, 15], pr: [110, 35, 38], se: [190, 35, 45], ac: [25, 50, 42],
    r: 0.75, fs: "manrope", tags: ["sage", "valley", "soft"],
  },
  {
    id: "stormy-atlantic", name: "Stormy Atlantic", c: "nature-atmospheric", m: "dark",
    d: "North-Atlantic squall — slate swell with storm-glass blue lightning.",
    bg: [215, 28, 7], fg: [213, 32, 92], pr: [210, 60, 50], se: [250, 40, 52], ac: [95, 45, 45],
    r: 0.5, mo: "normal", tags: ["storm", "atlantic", "squall"],
  },
  {
    id: "cherry-blossom", name: "Cherry Blossom", c: "nature-atmospheric", m: "light",
    d: "Sakura season — petal pink light with plum ink and leaf-green accents.",
    bg: [345, 30, 96], fg: [340, 35, 15], pr: [340, 60, 52], se: [265, 40, 50], ac: [150, 40, 38],
    r: 0.75, fs: "manrope", tags: ["sakura", "blossom", "spring"],
  },
  {
    id: "bamboo-grove", name: "Bamboo Grove", c: "nature-atmospheric", m: "dark",
    d: "Filtered green light through bamboo — celadon calm with warm shafts.",
    bg: [90, 20, 6], fg: [88, 28, 91], pr: [85, 55, 45], se: [150, 40, 42], ac: [25, 60, 50],
    r: 0.625, mo: "calm", tags: ["bamboo", "celadon", "zen"],
  },
  {
    id: "waterfall-mist", name: "Waterfall Mist", c: "nature-atmospheric", m: "dark",
    d: "Spray-cooled air below a falls — aqua currents over stone slate.",
    bg: [185, 25, 6], fg: [183, 32, 92], pr: [182, 60, 48], se: [215, 50, 50], ac: [320, 50, 58],
    r: 0.625, mo: "calm", tags: ["waterfall", "aqua", "spray"],
  },
];

// ---------------------------------------------------------------------------
// Collection 4 — Light and Elegant (15)
// ---------------------------------------------------------------------------

const SEEDS_LIGHT_ELEGANT: ThemeSeed[] = [
  {
    id: "arctic-light", name: "Arctic Light", c: "light-elegant", m: "light",
    d: "Snowfield daylight with ice-blue clarity — the bright mirror of the deep north.",
    bg: [210, 25, 97], fg: [212, 40, 13], pr: [205, 75, 45], se: [190, 50, 48], ac: [250, 50, 55],
    r: 0.75, fs: "manrope", tags: ["arctic", "daylight", "ice"],
  },
  {
    id: "swan-plume", name: "Swan Plume", c: "light-elegant", m: "light",
    d: "Feather-soft grays with a poised slate-blue signature.",
    bg: [220, 12, 97], fg: [220, 35, 14], pr: [218, 40, 45], se: [210, 30, 50], ac: [160, 40, 42],
    r: 0.75, fs: "manrope", tags: ["swan", "plume", "graceful"],
  },
  {
    id: "champagne-veil", name: "Champagne Veil", c: "light-elegant", m: "light",
    d: "Champagne warmth with antique gold and a whisper of teal.",
    bg: [42, 40, 96], fg: [40, 40, 15], pr: [38, 60, 42], se: [25, 55, 48], ac: [200, 40, 42],
    r: 0.75, fs: "manrope", tags: ["champagne", "gold", "celebrate"],
  },
  {
    id: "rose-quartz", name: "Rose Quartz", c: "light-elegant", m: "light",
    d: "Polished rose-quartz light with blush tones and amethyst accents.",
    bg: [350, 30, 97], fg: [345, 40, 15], pr: [345, 55, 48], se: [265, 40, 50], ac: [150, 40, 40],
    r: 0.75, fs: "manrope", tags: ["rose", "quartz", "blush"],
  },
  {
    id: "marble-gallery", name: "Marble Gallery", c: "light-elegant", m: "light",
    d: "Gallery marble with ink-black typography — museum restraint.",
    bg: [210, 10, 97], fg: [213, 45, 13], pr: [215, 45, 35], se: [205, 30, 48], ac: [280, 40, 48],
    r: 0.5, fs: "ibm-plex-sans", tags: ["marble", "gallery", "museum"],
  },
  {
    id: "linen-summer", name: "Linen Summer", c: "light-elegant", m: "light",
    d: "Washed summer linen with sun-faded terracotta and sea glass.",
    bg: [35, 30, 96], fg: [33, 38, 15], pr: [28, 50, 45], se: [195, 40, 45], ac: [100, 40, 38],
    r: 0.75, fs: "manrope", tags: ["linen", "summer", "coastal"],
  },
  {
    id: "moonlit-pearl", name: "Moonlit Pearl", c: "light-elegant", m: "light",
    d: "Pearlescent night-light with periwinkle shimmer and lilac accents.",
    bg: [230, 18, 96], fg: [232, 35, 15], pr: [235, 55, 55], se: [285, 40, 52], ac: [180, 45, 42],
    r: 0.75, fs: "manrope", tags: ["moonlit", "pearl", "shimmer"],
  },
  {
    id: "alabaster-studio", name: "Alabaster Studio", c: "light-elegant", m: "light",
    d: "Alabaster studio walls with studio-blue equipment tones.",
    bg: [200, 12, 97], fg: [203, 38, 14], pr: [205, 55, 42], se: [220, 30, 48], ac: [155, 45, 40],
    r: 0.5, fs: "ibm-plex-sans", tags: ["alabaster", "studio", "work"],
  },
  {
    id: "morning-fog", name: "Morning Fog", c: "light-elegant", m: "light",
    d: "Valley fog at first light — misted blues with pine undertones.",
    bg: [190, 15, 96], fg: [195, 35, 15], pr: [195, 45, 45], se: [150, 35, 42], ac: [265, 40, 50],
    r: 0.75, fs: "manrope", tags: ["fog", "morning", "mist"],
  },
  {
    id: "silk-royale", name: "Silk Royale", c: "light-elegant", m: "light",
    d: "Ivory silk with royal purple embroidery and silver thread.",
    bg: [260, 15, 96], fg: [260, 35, 14], pr: [258, 50, 50], se: [210, 35, 45], ac: [330, 50, 50],
    r: 0.75, fs: "manrope", tags: ["silk", "royal", "embroidery"],
  },
  {
    id: "porcelain-dove", name: "Porcelain Dove", c: "light-elegant", m: "light",
    d: "Dove-white porcelain with the gentlest blue-gray glaze.",
    bg: [210, 8, 98], fg: [212, 32, 14], pr: [213, 35, 45], se: [205, 28, 50], ac: [150, 42, 42],
    r: 0.625, fs: "system", tags: ["dove", "porcelain", "gentle"],
  },
  {
    id: "sage-atelier", name: "Sage Atelier", c: "light-elegant", m: "light",
    d: "Painter's atelier in sage and olive with terracotta brushstrokes.",
    bg: [110, 15, 95], fg: [115, 32, 14], pr: [120, 35, 35], se: [190, 35, 45], ac: [25, 50, 42],
    r: 0.75, fs: "manrope", tags: ["sage", "atelier", "painter"],
  },
  {
    id: "peach-blossom", name: "Peach Blossom", c: "light-elegant", m: "light",
    d: "Orchard peach light with warm coral and eucalyptus accents.",
    bg: [25, 45, 96], fg: [22, 45, 15], pr: [20, 70, 52], se: [345, 50, 52], ac: [190, 40, 40],
    r: 0.75, fs: "manrope", tags: ["peach", "orchard", "warm"],
  },
  {
    id: "cloud-ballet", name: "Cloud Ballet", c: "light-elegant", m: "light",
    d: "Cumulus light with sky-blue leaps and lavender pirouettes.",
    bg: [205, 18, 97], fg: [207, 35, 14], pr: [208, 65, 48], se: [255, 40, 52], ac: [150, 40, 40],
    r: 0.75, fs: "manrope", tags: ["cloud", "sky", "ballet"],
  },
  {
    id: "opal-iridescence", name: "Opal Iridescence", c: "light-elegant", m: "light",
    d: "Opal surface play — violet fire with aqua and rose flashes.",
    bg: [240, 12, 97], fg: [240, 35, 14], pr: [245, 55, 55], se: [190, 45, 45], ac: [315, 50, 52],
    r: 0.75, fs: "manrope", tags: ["opal", "iridescent", "play"],
  },
];

// ---------------------------------------------------------------------------
// Collection 5 — Warm and Creative (10)
// ---------------------------------------------------------------------------

const SEEDS_WARM_CREATIVE: ThemeSeed[] = [
  {
    id: "ember-canvas", name: "Ember Canvas", c: "warm-creative", m: "dark",
    d: "A studio canvas lit by ember orange — warm darks for creative fire.",
    bg: [20, 30, 6], fg: [22, 40, 93], pr: [22, 90, 55], se: [345, 65, 55], ac: [185, 65, 48],
    r: 0.75, mo: "normal", fs: "manrope", tags: ["ember", "canvas", "studio"],
  },
  {
    id: "terracotta-studio", name: "Terracotta Studio", c: "warm-creative", m: "light",
    d: "Sun-baked terracotta workspace with clay-red tools and sage shelving.",
    bg: [20, 45, 95], fg: [20, 45, 14], pr: [18, 65, 45], se: [195, 40, 45], ac: [90, 45, 40],
    r: 0.75, fs: "manrope", tags: ["terracotta", "clay", "workshop"],
  },
  {
    id: "sunset-boulevard", name: "Sunset Boulevard", c: "warm-creative", m: "dark",
    d: "Golden-hour neon — coral signs over a violet dusk boulevard.",
    bg: [285, 25, 6], fg: [283, 35, 93], pr: [340, 80, 62], se: [25, 85, 55], ac: [190, 60, 50],
    r: 0.75, mo: "energetic", tags: ["sunset", "coral", "dusk"],
  },
  {
    id: "mango-tango", name: "Mango Tango", c: "warm-creative", m: "light",
    d: "Ripe mango energy with tropical blue counterbeats.",
    bg: [45, 50, 95], fg: [40, 45, 14], pr: [38, 85, 48], se: [200, 45, 45], ac: [340, 60, 50],
    r: 0.75, fs: "manrope", tags: ["mango", "tropical", "juicy"],
  },
  {
    id: "neon-retro", name: "Neon Retro", c: "warm-creative", m: "dark",
    d: "80s arcade neon — hot pink marquee with cyan game-grid glow.",
    bg: [300, 25, 5], fg: [298, 35, 93], pr: [315, 90, 60], se: [185, 80, 52], ac: [250, 75, 60],
    r: 0.5, mo: "energetic", tags: ["retro", "arcade", "neon"],
  },
  {
    id: "watercolor-dream", name: "Watercolor Dream", c: "warm-creative", m: "light",
    d: "Wet-on-wet washes of violet and rose on bright paper.",
    bg: [250, 30, 96], fg: [250, 40, 15], pr: [255, 60, 55], se: [185, 45, 42], ac: [330, 55, 52],
    r: 0.75, fs: "manrope", tags: ["watercolor", "wash", "artistic"],
  },
  {
    id: "crimson-atelier", name: "Crimson Atelier", c: "warm-creative", m: "dark",
    d: "A fashion atelier in crimson and charcoal with gold pins.",
    bg: [350, 30, 6], fg: [348, 38, 93], pr: [350, 80, 55], se: [210, 45, 50], ac: [40, 80, 52],
    r: 0.625, mo: "normal", tags: ["crimson", "atelier", "fashion"],
  },
  {
    id: "saffron-market", name: "Saffron Market", c: "warm-creative", m: "light",
    d: "Spice-market brightness — saffron stalls with chili-red awnings.",
    bg: [40, 45, 95], fg: [38, 45, 14], pr: [42, 80, 45], se: [15, 60, 48], ac: [190, 45, 40],
    r: 0.625, fs: "manrope", tags: ["saffron", "market", "spice"],
  },
  {
    id: "graffiti-pop", name: "Graffiti Pop", c: "warm-creative", m: "dark",
    d: "Urban wall dark with lime spray-tags and magenta stencils.",
    bg: [260, 22, 5], fg: [258, 32, 93], pr: [85, 80, 55], se: [315, 85, 60], ac: [195, 75, 50],
    r: 0.375, mo: "energetic", tags: ["graffiti", "urban", "pop"],
  },
  {
    id: "boho-terracotta", name: "Boho Terracotta", c: "warm-creative", m: "light",
    d: "Bohemian textiles — clay, rattan, and dusty rose weaving.",
    bg: [25, 40, 94], fg: [24, 42, 15], pr: [22, 55, 42], se: [340, 45, 50], ac: [175, 40, 38],
    r: 0.75, fs: "manrope", tags: ["boho", "textile", "clay"],
  },
];

// ---------------------------------------------------------------------------
// Collection 6 — High Contrast and Accessibility (10)
// ---------------------------------------------------------------------------

const SEEDS_HIGH_CONTRAST: ThemeSeed[] = [
  {
    id: "stark-contrast", name: "Stark Contrast", c: "high-contrast", m: "light",
    d: "Pure white on pure black with a vivid blue guide — AAA legibility baseline.",
    bg: [0, 0, 100], fg: [0, 0, 0], pr: [215, 90, 40], se: [280, 60, 40], ac: [0, 0, 25],
    r: 0.375, fs: "system", mo: "calm", tags: ["aaa", "vision", "baseline"],
  },
  {
    id: "midnight-accessible", name: "Midnight Accessible", c: "high-contrast", m: "dark",
    d: "True-black canvas with bright-blue affordances for low-vision comfort.",
    bg: [0, 0, 3], fg: [0, 0, 97], pr: [200, 90, 62], se: [140, 60, 55], ac: [320, 70, 65],
    r: 0.375, fs: "system", mo: "calm", tags: ["aaa", "true-black", "comfort"],
  },
  {
    id: "amber-night", name: "Amber Night", c: "high-contrast", m: "dark",
    d: "Night-shift amber on soot black — eye-friendly for evening reading.",
    bg: [30, 10, 4], fg: [40, 20, 95], pr: [40, 90, 60], se: [200, 60, 58], ac: [140, 60, 52],
    r: 0.375, fs: "system", mo: "calm", tags: ["amber", "night-shift", "reading"],
  },
  {
    id: "clarity-blue", name: "Clarity Blue", c: "high-contrast", m: "light",
    d: "Optical-white surface with maximum-contrast cobalt text pairing.",
    bg: [210, 15, 99], fg: [212, 50, 10], pr: [215, 85, 38], se: [190, 60, 35], ac: [280, 55, 40],
    r: 0.375, fs: "system", mo: "calm", tags: ["clarity", "cobalt", "reading"],
  },
  {
    id: "focus-green", name: "Focus Green", c: "high-contrast", m: "light",
    d: "Mint-white surface with deep green text — calm, legible, ADHD-friendly.",
    bg: [130, 20, 98], fg: [140, 55, 10], pr: [140, 75, 30], se: [200, 55, 35], ac: [25, 70, 35],
    r: 0.375, fs: "system", mo: "calm", tags: ["focus", "green", "calm"],
  },
  {
    id: "deep-sight", name: "Deep Sight", c: "high-contrast", m: "dark",
    d: "Abyss navy with high-luminance sky-blue text — engineered for glare-free depth.",
    bg: [220, 15, 4], fg: [210, 25, 96], pr: [210, 85, 65], se: [150, 60, 55], ac: [330, 70, 65],
    r: 0.375, fs: "system", mo: "calm", tags: ["deep", "glare-free", "depth"],
  },
  {
    id: "solar-clarity", name: "Solar Clarity", c: "high-contrast", m: "light",
    d: "Warm paper white with burnt-sienna text — dyslexia-friendly warmth.",
    bg: [45, 20, 98], fg: [35, 55, 10], pr: [25, 80, 38], se: [210, 55, 35], ac: [130, 60, 32],
    r: 0.375, fs: "system", mo: "calm", tags: ["solar", "dyslexia-friendly", "warm"],
  },
  {
    id: "high-plain", name: "High Plain", c: "high-contrast", m: "dark",
    d: "High-plain dark with glacial-white text and cyan wayfinding.",
    bg: [200, 10, 4], fg: [200, 15, 96], pr: [195, 90, 62], se: [260, 55, 60], ac: [150, 60, 55],
    r: 0.375, fs: "system", mo: "calm", tags: ["high-plain", "wayfinding", "cyan"],
  },
  {
    id: "true-grit", name: "True Grit", c: "high-contrast", m: "light",
    d: "Newsprint grayscale with ink-black type — zero chromatic noise.",
    bg: [0, 0, 97], fg: [0, 0, 5], pr: [0, 0, 15], se: [0, 0, 40], ac: [215, 80, 35],
    r: 0.25, fs: "system", mo: "calm", tags: ["newsprint", "grayscale", "ink"],
  },
  {
    id: "aurora-access", name: "Aurora Access", c: "high-contrast", m: "dark",
    d: "Dark evergreen with luminous aurora-green text — colorblind-safe pairings.",
    bg: [160, 12, 4], fg: [158, 20, 96], pr: [155, 85, 62], se: [200, 65, 58], ac: [40, 85, 62],
    r: 0.375, fs: "system", mo: "calm", tags: ["aurora", "colorblind-safe", "green"],
  },
];

// ---------------------------------------------------------------------------
// Registry assembly
// ---------------------------------------------------------------------------

export const THEME_SEEDS: ThemeSeed[] = [
  ...SEEDS_DARK_FUTURISTIC,
  ...SEEDS_MINIMAL_PROFESSIONAL,
  ...SEEDS_NATURE_ATMOSPHERIC,
  ...SEEDS_LIGHT_ELEGANT,
  ...SEEDS_WARM_CREATIVE,
  ...SEEDS_HIGH_CONTRAST,
];

export const THEME_REGISTRY: ResolvedTheme[] = THEME_SEEDS.map(buildTheme);

export function getThemeById(id: string): ResolvedTheme | undefined {
  return THEME_REGISTRY.find((t) => t.id === id);
}

export function getThemesByCollection(collectionId: string): ResolvedTheme[] {
  return THEME_REGISTRY.filter((t) => t.collection === collectionId);
}

/** Original design concepts that must exist in the registry (checked by tests). */
export const REQUIRED_THEME_CONCEPTS = [
  "obsidian-indigo",
  "midnight-emerald",
  "deep-sapphire",
  "graphite",
  "cosmic-violet",
  "arctic-light",
] as const;
