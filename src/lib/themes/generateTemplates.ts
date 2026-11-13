import type { ThemeDensity, ThemeMotionLevel, ThemeTemplate } from "./types";

const CATEGORIES: { slug: string; label: string; baseHue: number; motion: ThemeMotionLevel }[] = [
  { slug: "neural", label: "Neural Core", baseHue: 195, motion: "energetic" },
  { slug: "sovereign", label: "Sovereign Dark", baseHue: 220, motion: "calm" },
  { slug: "aurora", label: "Aurora Flow", baseHue: 165, motion: "normal" },
  { slug: "ember", label: "Ember Forge", baseHue: 25, motion: "energetic" },
  { slug: "ocean", label: "Ocean Depth", baseHue: 205, motion: "calm" },
  { slug: "forest", label: "Forest Calm", baseHue: 145, motion: "calm" },
  { slug: "mono", label: "Mono Terminal", baseHue: 0, motion: "calm" },
  { slug: "neon", label: "Neon Pulse", baseHue: 285, motion: "energetic" },
  { slug: "pastel", label: "Pastel Dream", baseHue: 320, motion: "normal" },
  { slug: "elite", label: "Elite Pro", baseHue: 45, motion: "normal" },
];

const DENSITIES: ThemeDensity[] = ["compact", "comfortable", "spacious"];

function hsl(h: number, s: number, l: number): string {
  return `${((h % 360) + 360) % 360} ${s}% ${l}%`;
}

function buildTokens(
  primaryHue: number,
  variant: number,
): ThemeTemplate["tokens"] {
  const sat = 72 + (variant % 3) * 8;
  const bgL = 3 + (variant % 2);
  const primary = hsl(primaryHue, sat, 52 + (variant % 4) * 3);
  const secondary = hsl(primaryHue + 75, sat - 10, 58);
  const accent = hsl(primaryHue + 120, sat, 55);
  return {
    background: hsl(primaryHue, 12, bgL),
    foreground: "0 0% 96%",
    card: hsl(primaryHue, 10, bgL + 2),
    cardForeground: "0 0% 96%",
    primary,
    primaryForeground: hsl(primaryHue, 12, bgL),
    primaryGlow: hsl(primaryHue, sat, 62),
    secondary,
    secondaryForeground: hsl(primaryHue, 12, bgL),
    muted: hsl(primaryHue, 8, 10 + (variant % 3)),
    mutedForeground: hsl(primaryHue, 6, 58),
    accent,
    accentForeground: hsl(primaryHue, 12, bgL),
    border: hsl(primaryHue, 8, 14 + (variant % 2)),
    input: hsl(primaryHue, 8, 15 + (variant % 2)),
    ring: primary,
    popover: hsl(primaryHue, 10, bgL + 3),
    popoverForeground: "0 0% 96%",
    destructive: "0 70% 54%",
    destructiveForeground: "0 0% 98%",
    success: "150 80% 45%",
    warning: "40 95% 55%",
    sidebarBackground: hsl(primaryHue, 10, bgL + 2),
    sidebarForeground: "0 0% 96%",
    sidebarPrimary: primary,
    sidebarBorder: hsl(primaryHue, 8, 14),
    sidebarAccent: hsl(primaryHue, 8, 16 + (variant % 3)),
    sidebarAccentForeground: "0 0% 96%",
    sidebarRing: primary,
  };
}

/** 10 categories × 10 variants = 100 unique ShadowTalk UI themes */
export function generateThemeTemplates(): ThemeTemplate[] {
  const templates: ThemeTemplate[] = [];

  for (const cat of CATEGORIES) {
    for (let v = 0; v < 10; v++) {
      const hue = cat.baseHue + v * 7 + (cat.slug === "mono" ? 0 : 0);
      const monoHue = cat.slug === "mono" ? 0 : hue;
      const tokens = buildTokens(monoHue, v);
      const id = `${cat.slug}-${String(v + 1).padStart(2, "0")}`;
      const density = DENSITIES[v % 3];
      const radiusRem = 0.5 + (v % 5) * 0.125;

      templates.push({
        id,
        name: `${cat.label} ${v + 1}`,
        category: cat.label,
        description: `${cat.label} palette variant ${v + 1} — tuned for ${density} density and ${cat.motion} motion.`,
        version: 1,
        motion: cat.motion,
        density,
        radiusRem,
        tokens,
        preview: [
          `hsl(${monoHue} 80% 55%)`,
          `hsl(${monoHue + 75} 70% 58%)`,
          `hsl(${monoHue + 120} 75% 55%)`,
          `hsl(${monoHue} 12% 8%)`,
        ],
      });
    }
  }

  return templates;
}

export const THEME_TEMPLATES = generateThemeTemplates();

export function getThemeTemplateById(id: string): ThemeTemplate | undefined {
  return THEME_TEMPLATES.find((t) => t.id === id);
}
