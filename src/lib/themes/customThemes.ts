/**
 * ShadowTalk AI — custom theme store.
 *
 * User-created themes live in localStorage (instant, offline-first) and are
 * mirrored to Firestore through the appearance prefs sync. Import/export is
 * JSON-only: zod-validated, size-capped, allow-listed — imported CSS/JS/HTML
 * is impossible by construction because nothing here is ever evaluated.
 */
import { z } from "zod";
import type { ResolvedTheme } from "./types";
import { CUSTOM_THEMES_STORAGE_KEY, MAX_CUSTOM_THEMES } from "./types";
import { normalizeTheme } from "./normalize";
import { hexToHsl, hslToTriplet } from "./contrast";
import { CUSTOM_COLLECTION_ID } from "./collections";

// ---------------------------------------------------------------------------
// Validation schemas — import accepts HSL triplets or hex; output is triplets.
// ---------------------------------------------------------------------------

const colorField = z
  .string()
  .max(32)
  .refine(
    (value) =>
      /^\s*\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%\s*(\/\s*[\d.]+\s*)?$/.test(value) ||
      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim()),
    { message: "Color must be an HSL triplet or hex value" },
  );

/** Convert an accepted color value (triplet or hex) to a canonical triplet. */
function toTriplet(value: string): string {
  const hex = hexToHsl(value.trim());
  if (hex) return hslToTriplet(hex);
  return value.trim();
}

const tokensSchema = z
  .record(z.string(), colorField)
  .refine((tokens) => Object.keys(tokens).length > 0, { message: "tokens must not be empty" });

export const themeImportSchema = z.object({
  id: z.string().max(64).optional(),
  name: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
  mode: z.enum(["dark", "light"]).optional(),
  collection: z.string().max(40).optional(),
  motion: z.enum(["calm", "normal", "energetic"]).optional(),
  density: z.enum(["compact", "comfortable", "spacious"]).optional(),
  radiusRem: z.number().min(0).max(2).optional(),
  fontSans: z.string().max(40).optional(),
  fontMono: z.string().max(40).optional(),
  tags: z.array(z.string().max(24)).max(8).optional(),
  tokens: tokensSchema.optional(),
  chartColors: z.array(colorField).max(5).optional(),
  codeColors: z.object({ background: colorField, foreground: colorField }).optional(),
  preview: z.array(z.string().max(9)).max(4).optional(),
}).strip();

export type ThemeImportInput = z.infer<typeof themeImportSchema>;

const MAX_IMPORT_JSON_BYTES = 256 * 1024;

export interface ImportResult {
  ok: boolean;
  theme?: ResolvedTheme;
  error?: string;
}

function slugify(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return slug || "theme";
}

function newCustomId(name: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `custom-${slugify(name)}-${rand}`;
}

// ---------------------------------------------------------------------------
// Local storage CRUD
// ---------------------------------------------------------------------------

export function listCustomThemes(): ResolvedTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const themes: ResolvedTheme[] = [];
    for (const item of parsed.slice(0, MAX_CUSTOM_THEMES)) {
      const theme = normalizeTheme(item);
      if (theme) themes.push({ ...theme, collection: CUSTOM_COLLECTION_ID, source: theme.source === "imported" ? "imported" : "custom" });
    }
    return themes;
  } catch {
    return [];
  }
}

function persistList(themes: ResolvedTheme[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes.slice(0, MAX_CUSTOM_THEMES)));
  } catch {
    /* storage full/unavailable — caller surfaces via return value */
  }
}

export function getCustomTheme(id: string): ResolvedTheme | undefined {
  return listCustomThemes().find((t) => t.id === id);
}

export function saveCustomTheme(theme: ResolvedTheme): { ok: boolean; error?: string; themes: ResolvedTheme[] } {
  const themes = listCustomThemes();
  const existingIndex = themes.findIndex((t) => t.id === theme.id);
  const next: ResolvedTheme = {
    ...theme,
    collection: CUSTOM_COLLECTION_ID,
    source: theme.source === "imported" ? "imported" : "custom",
    updatedAt: Date.now(),
  };
  if (existingIndex >= 0) {
    themes[existingIndex] = next;
  } else {
    if (themes.length >= MAX_CUSTOM_THEMES) {
      return { ok: false, error: `Custom theme limit reached (${MAX_CUSTOM_THEMES}). Delete one first.`, themes };
    }
    themes.push(next);
  }
  persistList(themes);
  return { ok: true, themes };
}

export function renameCustomTheme(id: string, name: string): { ok: boolean; error?: string; themes: ResolvedTheme[] } {
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Theme name cannot be empty.", themes: listCustomThemes() };
  const themes = listCustomThemes();
  const target = themes.find((t) => t.id === id);
  if (!target) return { ok: false, error: "Theme not found.", themes };
  target.name = clean;
  target.updatedAt = Date.now();
  persistList(themes);
  return { ok: true, themes };
}

export function duplicateCustomTheme(id: string): { ok: boolean; error?: string; theme?: ResolvedTheme; themes: ResolvedTheme[] } {
  const themes = listCustomThemes();
  const target = themes.find((t) => t.id === id);
  if (!target) return { ok: false, error: "Theme not found.", themes };
  if (themes.length >= MAX_CUSTOM_THEMES) {
    return { ok: false, error: `Custom theme limit reached (${MAX_CUSTOM_THEMES}). Delete one first.`, themes };
  }
  const copy: ResolvedTheme = {
    ...structuredClone(target),
    id: newCustomId(`${target.name} copy`),
    name: `${target.name} (copy)`.slice(0, 60),
    source: "custom",
    updatedAt: Date.now(),
  };
  themes.push(copy);
  persistList(themes);
  return { ok: true, theme: copy, themes };
}

export function deleteCustomTheme(id: string): ResolvedTheme[] {
  const themes = listCustomThemes().filter((t) => t.id !== id);
  persistList(themes);
  return themes;
}

// ---------------------------------------------------------------------------
// Import / export — JSON only, never evaluated
// ---------------------------------------------------------------------------

/** Build the exportable JSON document for a theme. */
export function exportThemeJson(theme: ResolvedTheme): string {
  return JSON.stringify(
    {
      format: "shadowtalk-theme",
      version: 1,
      id: theme.id,
      name: theme.name,
      description: theme.description,
      mode: theme.mode,
      motion: theme.motion,
      density: theme.density,
      radiusRem: theme.radiusRem,
      fontSans: theme.fontSans,
      fontMono: theme.fontMono,
      tags: theme.tags,
      tokens: theme.tokens,
      chartColors: theme.chartColors,
      codeColors: theme.codeColors,
    },
    null,
    2,
  );
}

/**
 * Parse + validate + normalize imported JSON. Returns a ready-to-save theme
 * (not yet persisted) or a human-readable error. No evaluation of any kind.
 */
export function parseImportedThemeJson(raw: string): ImportResult {
  if (!raw || raw.length > MAX_IMPORT_JSON_BYTES) {
    return { ok: false, error: "File is empty or too large (256 KB limit)." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON — could not parse the file." };
  }

  const checked = themeImportSchema.safeParse(parsed);
  if (!checked.success) {
    const first = checked.error.issues[0];
    const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return { ok: false, error: `Invalid theme file — ${path}${first?.message ?? "schema validation failed"}.` };
  }

  const data = checked.data;
  const normalizedTokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.tokens ?? {})) {
    normalizedTokens[key] = toTriplet(value);
  }
  const chartColors = (data.chartColors ?? []).map(toTriplet);
  const codeColors = data.codeColors
    ? { background: toTriplet(data.codeColors.background), foreground: toTriplet(data.codeColors.foreground) }
    : undefined;

  const candidate = normalizeTheme({
    id: newCustomId(data.name),
    name: data.name,
    description: data.description ?? "Imported theme.",
    mode: data.mode,
    motion: data.motion,
    density: data.density,
    radiusRem: data.radiusRem,
    fontSans: data.fontSans,
    fontMono: data.fontMono,
    tags: data.tags,
    tokens: normalizedTokens,
    chartColors: chartColors.length ? chartColors : undefined,
    codeColors,
    source: "imported",
    collection: CUSTOM_COLLECTION_ID,
  });

  if (!candidate) return { ok: false, error: "Theme could not be normalized from the provided data." };
  return { ok: true, theme: { ...candidate, source: "imported", collection: CUSTOM_COLLECTION_ID } };
}

/** Validate + save an imported theme in one step. */
export function importThemeJson(raw: string): ImportResult & { themes?: ResolvedTheme[] } {
  const result = parseImportedThemeJson(raw);
  if (!result.ok || !result.theme) return result;
  const saved = saveCustomTheme(result.theme);
  if (!saved.ok) return { ok: false, error: saved.error, theme: result.theme };
  return { ok: true, theme: saved.themes.find((t) => t.id === result.theme!.id), themes: saved.themes };
}

/** Trigger a browser download of the theme JSON. */
export function downloadThemeJson(theme: ResolvedTheme): void {
  const blob = new Blob([exportThemeJson(theme)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(theme.name)}.shadowtalk-theme.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
