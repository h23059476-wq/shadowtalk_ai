/**
 * Visualization theme (Batch 2) — colors and formatters shared by every
 * renderer. Values are taken from ShadowTalk's existing dark theme tokens
 * (src/index.css): primary 195°, secondary 270°, accent 315°, border 240 6%.
 * No separate design system is introduced — these are the same hues the
 * chat UI already uses, expressed as literal color strings because SVG and
 * Recharts need concrete values.
 */

export const VIZ_SERIES_COLORS = [
  "hsl(195 85% 48%)", // primary — cyan
  "hsl(270 60% 62%)", // secondary — violet
  "hsl(315 70% 55%)", // accent — magenta
  "hsl(160 60% 46%)", // emerald
  "hsl(38 92% 55%)", // amber
  "hsl(2 75% 62%)", // red
] as const;

export const VIZ_GRID_COLOR = "hsl(240 6% 14%)"; // --border
export const VIZ_MUTED = "hsl(240 5% 58%)"; // --muted-foreground
export const VIZ_POSITIVE = "hsl(160 60% 46%)";
export const VIZ_NEGATIVE = "hsl(2 75% 62%)";
export const VIZ_CANDLE_UP = "hsl(160 60% 46%)";
export const VIZ_CANDLE_DOWN = "hsl(2 75% 62%)";

/** Compact numeric formatting shared across renderers. */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  if (abs !== 0 && abs < 0.01) return n.toPrecision(2);
  if (abs < 1000) {
    // Keep real precision for small values (stablecoin prices are 1.0001!).
    const s = n.toFixed(abs < 1 ? 6 : 4);
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
  return Number(n.toFixed(2)).toString();
}

export function formatWithField(n: number, field?: { type?: string; unit?: string }): string {
  const isCurrency = field?.type === "currency";
  const prefix = isCurrency ? "$" : "";
  let suffix = "";
  if (field?.unit === "%") suffix = "%";
  else if (field?.unit && !(isCurrency && /usd/i.test(field.unit))) suffix = ` ${field.unit}`;
  return `${prefix}${formatCompact(n)}${suffix}`;
}

export function formatTickDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatFullTimestamp(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative freshness label, e.g. "as of 2 min ago" — never silent. */
export function freshnessLabel(asOf: string, now: number = Date.now()): string {
  const t = Date.parse(asOf);
  if (!Number.isFinite(t)) return asOf;
  const diffMs = now - t;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Provenance badge metadata (approved D3 policy). */
export function provenanceBadge(provenance: "source-verified" | "ai-extracted" | "unverified"): {
  label: string;
  className: string;
} {
  switch (provenance) {
    case "source-verified":
      return { label: "source-verified", className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300" };
    case "ai-extracted":
      return { label: "ai-extracted", className: "border-amber-400/30 bg-amber-400/10 text-amber-300" };
    case "unverified":
      return { label: "unverified", className: "border-red-400/30 bg-red-400/10 text-red-300" };
  }
}
