import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteCustomTheme,
  duplicateCustomTheme,
  exportThemeJson,
  importThemeJson,
  listCustomThemes,
  parseImportedThemeJson,
  renameCustomTheme,
  saveCustomTheme,
} from "../customThemes";
import { normalizeTheme } from "../normalize";
import { CUSTOM_THEMES_STORAGE_KEY, MAX_CUSTOM_THEMES, type ResolvedTheme } from "../types";
import { getThemeById } from "../registry";

function makeTheme(name: string, overrides: Record<string, unknown> = {}): ResolvedTheme {
  const base = normalizeTheme({
    id: `custom-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    description: `${name} description`,
    mode: "dark",
    tokens: { background: "250 30% 6%", foreground: "235 40% 93%", primary: "234 89% 64%" },
    source: "custom",
  })!;
  return { ...base, ...overrides } as ResolvedTheme;
}

beforeEach(() => {
  localStorage.clear();
});

describe("custom theme store", () => {
  it("saves, lists, and round-trips custom themes", () => {
    const theme = makeTheme("Nebula Custom");
    const result = saveCustomTheme(theme);
    expect(result.ok).toBe(true);
    expect(listCustomThemes().length).toBe(1);
    expect(listCustomThemes()[0].name).toBe("Nebula Custom");
    expect(listCustomThemes()[0].collection).toBe("custom");
  });

  it("mints an id when saving with an empty id", () => {
    const theme = makeTheme("No Id", { id: "" });
    const result = saveCustomTheme(theme);
    expect(result.ok).toBe(true);
    const stored = listCustomThemes()[0];
    expect(stored.id).not.toBe("");
    expect(stored.id.startsWith("custom-")).toBe(true);
  });

  it("updates in place when saving an existing id", () => {
    const theme = makeTheme("Editable");
    saveCustomTheme(theme);
    saveCustomTheme({ ...theme, name: "Edited" });
    const themes = listCustomThemes();
    expect(themes.length).toBe(1);
    expect(themes[0].name).toBe("Edited");
  });

  it("enforces the custom theme cap without losing existing data", () => {
    for (let i = 0; i < MAX_CUSTOM_THEMES; i++) {
      saveCustomTheme(makeTheme(`Theme ${i}`, { id: `custom-t${i}` }));
    }
    const overflow = saveCustomTheme(makeTheme("Overflow"));
    expect(overflow.ok).toBe(false);
    expect(overflow.error).toContain("limit");
    expect(listCustomThemes().length).toBe(MAX_CUSTOM_THEMES);
  });

  it("renames with validation and keeps other fields", () => {
    const theme = makeTheme("Rename Me");
    saveCustomTheme(theme);
    expect(renameCustomTheme(theme.id, "Renamed!").ok).toBe(true);
    expect(listCustomThemes()[0].name).toBe("Renamed!");
    expect(renameCustomTheme(theme.id, "   ").ok).toBe(false);
    expect(renameCustomTheme("missing-id", "X").ok).toBe(false);
    expect(listCustomThemes()[0].description).toBe(theme.description);
  });

  it("duplicates as an independent copy", () => {
    const theme = makeTheme("Original");
    saveCustomTheme(theme);
    const result = duplicateCustomTheme(theme.id);
    expect(result.ok).toBe(true);
    const themes = listCustomThemes();
    expect(themes.length).toBe(2);
    expect(themes[1].name).toBe("Original (copy)");
    expect(themes[1].id).not.toBe(theme.id);
    expect(themes[1].tokens.background).toBe(theme.tokens.background);
  });

  it("deletes and keeps the rest", () => {
    saveCustomTheme(makeTheme("A"));
    saveCustomTheme(makeTheme("B", { id: "custom-b" }));
    const after = deleteCustomTheme("custom-a-does-not-exist");
    expect(after.length).toBe(2);
    const themes = deleteCustomTheme(listCustomThemes()[0].id);
    expect(themes.length).toBe(1);
    expect(themes[0].name).toBe("B");
  });

  it("survives corrupted storage", () => {
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, "{not json");
    expect(listCustomThemes()).toEqual([]);
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(listCustomThemes()).toEqual([]);
  });
});

describe("theme JSON import/export", () => {
  it("exports a theme as structured JSON", () => {
    const theme = getThemeById("obsidian-indigo")!;
    const json = exportThemeJson(theme);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe("shadowtalk-theme");
    expect(parsed.tokens.background).toBe(theme.tokens.background);
    expect(parsed.chartColors.length).toBe(5);
  });

  it("imports a builtin export back as a custom theme (hex or triplet colors)", () => {
    const theme = getThemeById("midnight-emerald")!;
    const json = exportThemeJson(theme);
    const result = importThemeJson(json);
    expect(result.ok).toBe(true);
    expect(result.theme?.source).toBe("imported");
    expect(result.theme?.id.startsWith("custom-")).toBe(true);
    expect(listCustomThemes().length).toBe(1);
  });

  it("rejects invalid JSON with a readable error", () => {
    expect(parseImportedThemeJson("{ nope").ok).toBe(false);
    expect(parseImportedThemeJson("").ok).toBe(false);
    expect(parseImportedThemeJson("x".repeat(300 * 1024)).ok).toBe(false);
  });

  it("rejects schema-invalid payloads and never evaluates them", () => {
    const evil = JSON.stringify({
      name: "<img src=x onerror=alert(1)>",
      tokens: { background: "url(javascript:alert(1))" },
      __proto__: { hacked: true },
    });
    const result = parseImportedThemeJson(evil);
    expect(result.ok).toBe(false);
  });

  it("rejects payloads with invalid color values", () => {
    const result = parseImportedThemeJson(
      JSON.stringify({ name: "Bad", tokens: { background: "rgb(255,0,0)" } }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Invalid theme file");
  });

  it("normalizes hex colors to triplets on import", () => {
    const result = parseImportedThemeJson(
      JSON.stringify({
        name: "Hex Theme",
        tokens: { background: "#0b0d12", foreground: "#e5e7eb", primary: "#6366f1" },
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.theme!.tokens.background).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
  });

  it("fills missing tokens from a partial palette", () => {
    const result = parseImportedThemeJson(
      JSON.stringify({ name: "Minimal", tokens: { background: "250 30% 6%" } }),
    );
    expect(result.ok).toBe(true);
    const theme = result.theme!;
    expect(theme.tokens.foreground.length).toBeGreaterThan(0);
    expect(theme.tokens.card.length).toBeGreaterThan(0);
    expect(theme.chartColors.length).toBe(5);
  });

  it("strips unknown keys so arbitrary data cannot enter the store", () => {
    const result = parseImportedThemeJson(
      JSON.stringify({
        name: "Clean",
        tokens: { background: "0 0% 3%" },
        sneaker: "code",
        tokens2: { evil: true },
      }),
    );
    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(listCustomThemes().length ? listCustomThemes() : [result.theme]);
    expect(serialized).not.toContain("sneaker");
    expect(serialized).not.toContain("evil");
  });
});
