import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Eraser,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeMiniPreview } from "./ThemeMiniPreview";
import { normalizeTheme } from "@/lib/themes/normalize";
import {
  contrastBetween,
  hexToHsl,
  hslToTriplet,
  tripletToHex,
  WCAG_AA_NORMAL,
} from "@/lib/themes/contrast";
import { validateThemeContrast } from "@/lib/themes/registry";
import { downloadThemeJson, parseImportedThemeJson } from "@/lib/themes/customThemes";
import { MONO_FONTS, SANS_FONTS } from "@/lib/themes/fonts";
import type { ResolvedTheme, ThemeDensity, ThemeMode, ThemeMotionLevel } from "@/lib/themes/types";
import { cn } from "@/lib/utils";

const RADIUS_PRESETS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Sharp" },
  { value: 0.375, label: "Subtle" },
  { value: 0.625, label: "Medium" },
  { value: 0.875, label: "Rounded" },
  { value: 1.25, label: "Extra rounded" },
];

const TOKEN_GROUPS: Array<{ title: string; testId: string; keys: Array<{ key: string; label: string; autoFrom?: string }> }> = [
  {
    title: "Surfaces",
    testId: "group-surfaces",
    keys: [
      { key: "background", label: "Main background" },
      { key: "foreground", label: "Main text" },
      { key: "card", label: "Card surface" },
      { key: "cardForeground", label: "Card text", autoFrom: "card" },
      { key: "popover", label: "Popover surface" },
      { key: "popoverForeground", label: "Popover text", autoFrom: "popover" },
      { key: "muted", label: "Muted surface" },
      { key: "mutedForeground", label: "Muted text", autoFrom: "background" },
      { key: "border", label: "Borders" },
      { key: "input", label: "Inputs" },
      { key: "ring", label: "Focus ring" },
    ],
  },
  {
    title: "Brand & accents",
    testId: "group-brand",
    keys: [
      { key: "primary", label: "Primary accent" },
      { key: "primaryForeground", label: "Primary text", autoFrom: "primary" },
      { key: "primaryGlow", label: "Primary glow" },
      { key: "secondary", label: "Secondary accent" },
      { key: "secondaryForeground", label: "Secondary text", autoFrom: "secondary" },
      { key: "accent", label: "Tertiary accent" },
      { key: "accentForeground", label: "Accent text", autoFrom: "accent" },
    ],
  },
  {
    title: "Sidebar",
    testId: "group-sidebar",
    keys: [
      { key: "sidebarBackground", label: "Sidebar background" },
      { key: "sidebarForeground", label: "Sidebar text", autoFrom: "sidebarBackground" },
      { key: "sidebarPrimary", label: "Sidebar accent" },
      { key: "sidebarAccent", label: "Sidebar hover" },
      { key: "sidebarAccentForeground", label: "Sidebar hover text", autoFrom: "sidebarAccent" },
      { key: "sidebarBorder", label: "Sidebar border" },
      { key: "sidebarRing", label: "Sidebar focus ring" },
    ],
  },
  {
    title: "Status colors",
    testId: "group-status",
    keys: [
      { key: "success", label: "Success" },
      { key: "warning", label: "Warning" },
      { key: "destructive", label: "Error" },
      { key: "destructiveForeground", label: "Error text", autoFrom: "destructive" },
    ],
  },
];

const CHART_LABELS = ["Chart 1", "Chart 2", "Chart 3", "Chart 4", "Chart 5"];

interface ThemeDesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Theme to start editing; null = start from a sensible default. */
  initialTheme: ResolvedTheme | null;
  /** True when the draft is an already-saved custom theme (enables Delete). */
  existingCustom: boolean;
  onSaveDraft: (theme: ResolvedTheme) => { ok: boolean; error?: string };
  onApplyTemporary: (theme: ResolvedTheme) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (theme: ResolvedTheme) => void;
  onRestoreDefault: () => void;
}

function defaultDraft(): ResolvedTheme {
  return (
    normalizeTheme({
      id: "",
      name: "My theme",
      description: "A personal ShadowTalk appearance.",
      mode: "dark",
      tokens: {},
      source: "custom",
    })!
  );
}

/** HSL triplet text input with live validation. */
function TripletInput({
  value,
  onCommit,
  testId,
}: {
  value: string;
  onCommit: (triplet: string) => void;
  testId: string;
}) {
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (/^\s*\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%\s*$/.test(text)) {
      setInvalid(false);
      onCommit(text.trim());
    } else {
      setInvalid(true);
    }
  };
  return (
    <input
      type="text"
      value={text}
      aria-label="HSL value"
      data-testid={testId}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className={cn(
        "h-8 w-28 rounded-md border bg-transparent px-2 font-mono text-[11px]",
        invalid ? "border-destructive" : "border-input",
      )}
    />
  );
}

/**
 * Visual theme editor — no code required. Left: controls; right: live
 * preview + WCAG contrast report. All changes stay local until applied
 * or saved.
 */
export function ThemeDesigner({
  open,
  onOpenChange,
  initialTheme,
  existingCustom,
  onSaveDraft,
  onApplyTemporary,
  onDelete,
  onDuplicate,
  onRestoreDefault,
}: ThemeDesignerProps) {
  const initialRef = useRef<ResolvedTheme>(initialTheme ?? defaultDraft());
  const [draft, setDraft] = useState<ResolvedTheme>(initialTheme ?? defaultDraft());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-seed the draft whenever a new theme is opened in the designer
  useEffect(() => {
    if (open) {
      const seed = initialTheme ?? defaultDraft();
      initialRef.current = seed;
      setDraft(seed);
      setSaveError(null);
      setImportError(null);
    }
  }, [open, initialTheme]);

  const setToken = useCallback((key: string, triplet: string) => {
    setDraft((current) => ({
      ...current,
      tokens: { ...current.tokens, [key]: triplet },
    }));
  }, []);

  const setChartColor = useCallback((index: number, triplet: string) => {
    setDraft((current) => {
      const next = [...current.chartColors] as ResolvedTheme["chartColors"];
      next[index] = triplet;
      return { ...current, chartColors: next };
    });
  }, []);

  const setCodeColor = useCallback((key: "background" | "foreground", triplet: string) => {
    setDraft((current) => ({
      ...current,
      codeColors: { ...current.codeColors, [key]: triplet },
    }));
  }, []);

  const resetToken = (key: string) => {
    const original = (initialRef.current.tokens as unknown as Record<string, string>)[key];
    if (original) setToken(key, original);
  };

  const autoDeriveForeground = (baseKey: string, fgKey: string) => {
    const tokens = draft.tokens as unknown as Record<string, string>;
    const base = tokens[baseKey];
    const fg = tokens[fgKey];
    if (!base || !fg) return;
    // Pick whichever polarity reads best, matching the engine's derivation.
    const ratio = contrastBetween(fg, base);
    const flipped = contrastBetween(tokens.background, base);
    setToken(fgKey, ratio >= flipped ? fg : tokens.background);
  };

  const resetAll = () => setDraft(initialRef.current);

  const handleModeChange = (mode: ThemeMode) => {
    setDraft((current) => {
      const tokens = { ...current.tokens } as unknown as Record<string, string>;
      const lightSurfaces: Record<string, [string, string]> = {
        // key: [darkCandidate, lightCandidate] lightness templates
        background: ["4", "97"],
        card: ["8", "99"],
        popover: ["9", "99"],
        muted: ["10", "92"],
        input: ["14", "90"],
        border: ["14", "86"],
        sidebarBackground: ["6", "95"],
        sidebarAccent: ["12", "90"],
        sidebarBorder: ["14", "86"],
      };
      for (const [key, [darkL, lightL]] of Object.entries(lightSurfaces)) {
        const current_ = hexToHsl(tripletToHex(tokens[key]));
        if (current_) {
          tokens[key] = hslToTriplet({ h: current_.h, s: current_.s, l: mode === "dark" ? Number(darkL) : Number(lightL) });
        }
      }
      // Flip text polarity
      const fgHsl = hexToHsl(tripletToHex(tokens.foreground));
      if (fgHsl) {
        tokens.foreground = hslToTriplet({ h: fgHsl.h, s: fgHsl.s, l: mode === "dark" ? 93 : 14 });
      }
      return { ...current, mode, tokens: tokens as unknown as ResolvedTheme["tokens"] };
    });
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    const text = await file.text();
    const result = parseImportedThemeJson(text);
    if (result.ok && result.theme) {
      const seeded = { ...result.theme, id: existingCustom ? draft.id : result.theme.id, source: "custom" as const };
      initialRef.current = seeded;
      setDraft(seeded);
    } else {
      setImportError(result.error ?? "Import failed.");
    }
  };

  const handleExport = () => downloadThemeJson({ ...draft, name: draft.name || "theme" });

  const handleSave = () => {
    const result = onSaveDraft(draft);
    if (result.ok) {
      setSaveError(null);
      onOpenChange(false);
    } else {
      setSaveError(result.error ?? "Could not save the theme.");
    }
  };

  const contrastIssues = useMemo(() => validateThemeContrast(draft), [draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid h-[92vh] max-w-6xl grid-rows-[auto_1fr] overflow-hidden p-0"
        data-testid="theme-designer"
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">Custom Theme Designer</DialogTitle>
          <DialogDescription>
            Design your personal ShadowTalk appearance — every change previews instantly. No code needed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[1.1fr_1fr]">
          {/* ---------------- Controls ---------------- */}
          <div className="min-h-0 overflow-y-auto px-6 py-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Input
                value={draft.name}
                onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value.slice(0, 60) }))}
                aria-label="Theme name"
                data-testid="designer-name"
                className="h-9 w-52"
                placeholder="Theme name"
              />
              <div className="flex overflow-hidden rounded-lg border" role="group" aria-label="Light or dark mode">
                {(["dark", "light"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode)}
                    data-testid={`designer-mode-${mode}`}
                    aria-pressed={draft.mode === mode}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      draft.mode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Appearance presets */}
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="designer-appearance">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Sans font
                <select
                  value={draft.fontSans}
                  onChange={(e) => setDraft((c) => ({ ...c, fontSans: e.target.value }))}
                  data-testid="designer-font-sans"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {SANS_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Mono font
                <select
                  value={draft.fontMono}
                  onChange={(e) => setDraft((c) => ({ ...c, fontMono: e.target.value }))}
                  data-testid="designer-font-mono"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {MONO_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Border radius
                <select
                  value={String(draft.radiusRem)}
                  onChange={(e) => setDraft((c) => ({ ...c, radiusRem: Number(e.target.value) }))}
                  data-testid="designer-radius"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {RADIUS_PRESETS.map((p) => (
                    <option key={p.value} value={String(p.value)}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Component density
                <select
                  value={draft.density}
                  onChange={(e) => setDraft((c) => ({ ...c, density: e.target.value as ThemeDensity }))}
                  data-testid="designer-density"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Motion
                <select
                  value={draft.motion}
                  onChange={(e) => setDraft((c) => ({ ...c, motion: e.target.value as ThemeMotionLevel }))}
                  data-testid="designer-motion"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  <option value="calm">Calm</option>
                  <option value="normal">Normal</option>
                  <option value="energetic">Energetic</option>
                </select>
              </label>
            </div>

            {/* Token groups */}
            {TOKEN_GROUPS.map((group) => (
              <section key={group.title} className="mb-6" data-testid={group.testId}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                <div className="space-y-1.5">
                  {group.keys.map((row) => {
                    const value = (draft.tokens as unknown as Record<string, string>)[row.key] ?? "";
                    const hex = tripletToHex(value);
                    const original = (initialRef.current.tokens as unknown as Record<string, string>)[row.key] ?? "";
                    const changed = value !== original;
                    return (
                      <div key={row.key} className="flex items-center gap-2">
                        <span className="w-36 shrink-0 text-xs text-foreground">{row.label}</span>
                        <input
                          type="color"
                          value={hex}
                          onChange={(e) => {
                            const hsl = hexToHsl(e.target.value);
                            if (hsl) setToken(row.key, hslToTriplet(hsl));
                          }}
                          aria-label={`${row.label} color picker`}
                          data-testid={`color-${row.key}`}
                          className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                        />
                        <TripletInput
                          value={value}
                          onCommit={(t) => setToken(row.key, t)}
                          testId={`triplet-${row.key}`}
                        />
                        {row.autoFrom && (
                          <button
                            type="button"
                            onClick={() => autoDeriveForeground(row.autoFrom!, row.key)}
                            title={`Auto-derive ${row.label} from ${row.autoFrom}`}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            aria-label={`Auto-derive ${row.label}`}
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => resetToken(row.key)}
                          disabled={!changed}
                          title={`Reset ${row.label}`}
                          aria-label={`Reset ${row.label}`}
                          data-testid={`reset-${row.key}`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Charts */}
            <section className="mb-6" data-testid="group-charts">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Charts</h3>
              <div className="space-y-1.5">
                {draft.chartColors.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-xs text-foreground">{CHART_LABELS[i]}</span>
                    <input
                      type="color"
                      value={tripletToHex(color)}
                      onChange={(e) => {
                        const hsl = hexToHsl(e.target.value);
                        if (hsl) setChartColor(i, hslToTriplet(hsl));
                      }}
                      aria-label={`${CHART_LABELS[i]} color picker`}
                      data-testid={`color-chart-${i + 1}`}
                      className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                    />
                    <TripletInput value={color} onCommit={(t) => setChartColor(i, t)} testId={`triplet-chart-${i + 1}`} />
                  </div>
                ))}
              </div>
            </section>

            {/* Code editor */}
            <section className="mb-6" data-testid="group-code">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code blocks</h3>
              <div className="space-y-1.5">
                {(["background", "foreground"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-xs text-foreground">
                      {key === "background" ? "Code background" : "Code text"}
                    </span>
                    <input
                      type="color"
                      value={tripletToHex(draft.codeColors[key])}
                      onChange={(e) => {
                        const hsl = hexToHsl(e.target.value);
                        if (hsl) setCodeColor(key, hslToTriplet(hsl));
                      }}
                      aria-label={`Code ${key} color picker`}
                      data-testid={`color-code-${key}`}
                      className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                    />
                    <TripletInput
                      value={draft.codeColors[key]}
                      onCommit={(t) => setCodeColor(key, t)}
                      testId={`triplet-code-${key}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ---------------- Live preview + contrast ---------------- */}
          <div className="min-h-0 overflow-y-auto border-t px-6 py-4 lg:border-l lg:border-t-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live preview
            </h3>
            <div data-testid="designer-live-preview">
              <ThemeMiniPreview theme={draft} size="full" />
            </div>

            <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              WCAG contrast check
            </h3>
            {contrastIssues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-foreground" data-testid="contrast-pass">
                <CheckCircle2 className="h-4 w-4 text-success" />
                All text pairs meet WCAG AA (4.5:1).
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs" data-testid="contrast-fail">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {contrastIssues.length} pair{contrastIssues.length > 1 ? "s" : ""} below WCAG AA ({WCAG_AA_NORMAL}:1):
                </div>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {contrastIssues.map((issue) => (
                    <li key={issue.pair}>
                      {issue.pair} — {issue.ratio}:1 (needs {issue.required}:1)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importError && (
              <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {importError}
              </p>
            )}
            {saveError && (
              <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {saveError}
              </p>
            )}
          </div>
        </div>

        {/* ---------------- Footer actions ---------------- */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-3"
          data-testid="designer-footer"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} data-testid="designer-save">
              <Save className="mr-1.5 h-4 w-4" />
              {existingCustom ? "Save changes" : "Save as personal theme"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onApplyTemporary(draft)} data-testid="designer-apply-temporary">
              <Wand2 className="mr-1.5 h-4 w-4" /> Apply temporarily
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} data-testid="designer-export">
              <Download className="mr-1.5 h-4 w-4" /> Export JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="designer-import">
              <Upload className="mr-1.5 h-4 w-4" /> Import JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onDuplicate && (
              <Button size="sm" variant="outline" onClick={() => onDuplicate(draft)} data-testid="designer-duplicate">
                <Copy className="mr-1.5 h-4 w-4" /> Duplicate
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={resetAll} data-testid="designer-reset">
              <Eraser className="mr-1.5 h-4 w-4" /> Reset theme
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onRestoreDefault();
                onOpenChange(false);
              }}
              data-testid="designer-restore-default"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Restore default appearance
            </Button>
            {existingCustom && onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onDelete(draft.id);
                  onOpenChange(false);
                }}
                data-testid="designer-delete"
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close designer">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
