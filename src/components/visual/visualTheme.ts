/**
 * visualTheme.ts — the LOCKED ShadowTalk visual design system.
 *
 * Every visual the AI produces (charts, diagrams, infographics) is rendered
 * through these tokens. The model NEVER chooses colors, fonts, sizes,
 * margins or grid styles — the engines read them from here, so output stays
 * consistent, colorblind-safe and on-brand across chat, exports and the
 * desktop build.
 *
 * Zero network: every value below is static — no font CDNs, no image URLs.
 */

/** Colorblind-safe, modern palette. Order matters: series cycle through it. */
export const VISUAL_PALETTE = [
  "#6366F1", // Electric Indigo
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#F59E0B", // Amber
  "#F43F5E", // Rose
  "#8B5CF6", // Violet
  "#14B8A6", // Teal
  "#FB923C", // Soft Orange
  "#EC4899", // Pink
  "#A3E635", // Lime
] as const;

/** Named accents usable in infographic JSON payloads (validated keys). */
export type VisualAccent = "indigo" | "emerald" | "cyan" | "amber" | "rose";

export const ACCENT_TOKENS: Record<VisualAccent, { hex: string; glow: string; soft: string }> = {
  indigo: { hex: "#6366F1", glow: "rgba(99,102,241,0.28)", soft: "rgba(99,102,241,0.10)" },
  emerald: { hex: "#10B981", glow: "rgba(16,185,129,0.28)", soft: "rgba(16,185,129,0.10)" },
  cyan: { hex: "#06B6D4", glow: "rgba(6,182,212,0.28)", soft: "rgba(6,182,212,0.10)" },
  amber: { hex: "#F59E0B", glow: "rgba(245,158,11,0.28)", soft: "rgba(245,158,11,0.10)" },
  rose: { hex: "#F43F5E", glow: "rgba(244,63,94,0.28)", soft: "rgba(244,63,94,0.10)" },
};

/** Obsidian studio surfaces. */
export const VISUAL_SURFACE = {
  /** Deep obsidian card background. */
  background: "#0B0D12",
  /** Subtle glass border. */
  border: "rgba(255,255,255,0.08)",
  /** 16px studio radius. */
  radius: 16,
  /** Primary typography color. */
  text: "#F8FAFC",
  /** Secondary typography color. */
  textMuted: "rgba(248,250,252,0.55)",
  /** Faint typography (axis hints, captions). */
  textFaint: "rgba(248,250,252,0.38)",
  /** Panel inside the card (tables, legends, bento tiles). */
  panel: "rgba(255,255,255,0.03)",
  /** Hairline dividers inside the card. */
  divider: "rgba(255,255,255,0.06)",
  /** Glassmorphic tooltip background. */
  tooltipBackground: "rgba(19,22,32,0.86)",
  /** Font stack — system only, so exports never fetch a webfont. */
  fontFamily:
    '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

/* ------------------------------------------------------------------ */
/* ECharts (Mode A — chart)                                            */
/* ------------------------------------------------------------------ */

/** ECharts theme fragment — spread into every chart option. */
export function buildEChartsTheme() {
  return {
    color: [...VISUAL_PALETTE],
    backgroundColor: "transparent",
    textStyle: { fontFamily: VISUAL_SURFACE.fontFamily, color: VISUAL_SURFACE.text },
    animationDuration: 550,
    animationEasing: "cubicOut",
    legend: {
      textStyle: { color: VISUAL_SURFACE.textMuted, fontSize: 11, fontFamily: VISUAL_SURFACE.fontFamily },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      icon: "roundRect",
    },
    tooltip: {
      backgroundColor: VISUAL_SURFACE.tooltipBackground,
      borderColor: VISUAL_SURFACE.border,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: VISUAL_SURFACE.text, fontSize: 12, fontFamily: VISUAL_SURFACE.fontFamily },
      // Glassmorphism — blur behind the glass panel.
      extraCssText:
        "backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,0.45);",
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.10)" } },
      axisTick: { show: false },
      axisLabel: { color: VISUAL_SURFACE.textMuted, fontSize: 11, fontFamily: VISUAL_SURFACE.fontFamily },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: VISUAL_SURFACE.textMuted, fontSize: 11, fontFamily: VISUAL_SURFACE.fontFamily },
      // Subtle dashed horizontal splitLines.
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)", type: "dashed" } },
    },
    grid: { left: 12, right: 18, top: 28, bottom: 8, containLabel: true },
  };
}

/** Vertical linear gradient used for area fills and bar bodies. */
export function verticalGradient(hex: string, fromAlpha = 0.36, toAlpha = 0.02) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(hex, fromAlpha) },
      { offset: 1, color: withAlpha(hex, toAlpha) },
    ],
  };
}

/** Convert #RRGGBB to rgba(...) with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ------------------------------------------------------------------ */
/* Mermaid (Mode B — diagram)                                          */
/* ------------------------------------------------------------------ */

/**
 * Mermaid `themeVariables` overrides matching ShadowTalk's dark UI.
 * Applied on top of `theme: "base"` (the only theme that allows full
 * variable overrides).
 */
export const MERMAID_THEME_VARIABLES = {
  fontFamily: VISUAL_SURFACE.fontFamily,
  fontSize: "14px",
  // Canvas
  background: VISUAL_SURFACE.background,
  primaryColor: "#131620", // dark slate node fill
  primaryTextColor: "#F8FAFC",
  primaryBorderColor: "#2A2F42", // crisp slate borders
  secondaryColor: "#131620",
  secondaryTextColor: "#F8FAFC",
  secondaryBorderColor: "#2A2F42",
  tertiaryColor: "#10131B",
  tertiaryTextColor: "#F8FAFC",
  tertiaryBorderColor: "#2A2F42",
  // Lines & arrows — #6366F1 accent highlights
  lineColor: "#6366F1",
  arrowheadColor: "#6366F1",
  // Notes / clusters
  noteBkgColor: "#131620",
  noteTextColor: VISUAL_SURFACE.textMuted,
  noteBorderColor: "#2A2F42",
  clusterBkg: "rgba(255,255,255,0.02)",
  clusterBorder: "rgba(255,255,255,0.08)",
  // Sequence diagram
  actorBkg: "#131620",
  actorBorder: "#2A2F42",
  actorTextColor: "#F8FAFC",
  actorLineColor: "rgba(255,255,255,0.12)",
  signalColor: VISUAL_SURFACE.textMuted,
  signalTextColor: "#F8FAFC",
  activationBkgColor: "rgba(99,102,241,0.18)",
  activationBorderColor: "#6366F1",
  // Gantt
  sectionBkgColor: "rgba(255,255,255,0.03)",
  altSectionBkgColor: VISUAL_SURFACE.background,
  sectionBkgColor2: "rgba(255,255,255,0.05)",
  taskBkgColor: "#131620",
  taskBorderColor: "#6366F1",
  taskTextColor: "#F8FAFC",
  taskTextDarkColor: "#F8FAFC",
  taskTextOutsideColor: VISUAL_SURFACE.textMuted,
  todayLineColor: "#F43F5E",
  // ER diagram
  attributeBackgroundColorOdd: "#10131B",
  attributeBackgroundColorEven: "#131620",
  // Edge labels
  edgeLabelBackground: "#131620",
  // Misc
  textColor: "#F8FAFC",
  mainBkg: "#131620",
  nodeBorder: "#2A2F42",
};

/** Mermaid initialize() config — locked, offline, sanitized. */
export const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: "base" as const,
  securityLevel: "strict" as const, // strips HTML/labels that could inject
  fontFamily: VISUAL_SURFACE.fontFamily,
  flowchart: { curve: "basis" as const, padding: 14, nodeSpacing: 46, rankSpacing: 52 },
  sequence: { mirrorActors: false, boxMargin: 10 },
  gantt: { fontSize: 12, barHeight: 22, barGap: 6, topPadding: 40, leftPadding: 90, gridLineStartPadding: 28 },
  mindmap: { padding: 12 },
};

/* ------------------------------------------------------------------ */
/* Bento (Mode C — infographic)                                        */
/* ------------------------------------------------------------------ */

export const BENTO_TOKENS = {
  cardBackground: VISUAL_SURFACE.panel,
  cardBorder: VISUAL_SURFACE.border,
  cardRadius: 14,
  gap: 12,
  glowBlur: 64,
  maxCards: 12,
} as const;
