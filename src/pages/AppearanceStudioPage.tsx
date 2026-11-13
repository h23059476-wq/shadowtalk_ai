import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Cloud,
  CloudOff,
  Filter,
  Import,
  Palette,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/PageTransition";
import { useAppearance } from "@/contexts/ThemeTemplateContext";
import {
  CUSTOM_COLLECTION_ID,
  THEME_COLLECTIONS,
  getCollectionLabel,
} from "@/lib/themes/collections";
import type { ResolvedTheme, ThemeMode } from "@/lib/themes/types";
import { normalizeTheme } from "@/lib/themes/normalize";
import { ThemePreviewCard } from "@/components/themes/ThemePreviewCard";
import { ThemePreviewDialog } from "@/components/themes/ThemePreviewDialog";
import { ThemeDesigner } from "@/components/themes/ThemeDesigner";
import { cn } from "@/lib/utils";

type DesignerState = { mode: "new" } | { mode: "edit"; theme: ResolvedTheme } | null;

const MODE_FILTERS: Array<{ value: "all" | ThemeMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Appearance Studio — theme discovery, favorites, custom themes and the
 * visual designer. Route: /themes
 */
export default function AppearanceStudioPage() {
  const appearance = useAppearance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<"all" | ThemeMode>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ResolvedTheme | null>(null);
  const [designer, setDesigner] = useState<DesignerState>(null);
  const [renameTarget, setRenameTarget] = useState<ResolvedTheme | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ResolvedTheme | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { allThemes, customThemes, activeTheme, favorites, recents, syncState, isTemporaryPreview } = appearance;

  // Deep links: /themes?design=new | /themes?design=<customId>
  useEffect(() => {
    const designParam = searchParams.get("design");
    if (!designParam) return;
    if (designParam === "new") {
      setDesigner({ mode: "new" });
    } else {
      const target = customThemes.find((t) => t.id === designParam);
      if (target) setDesigner({ mode: "edit", theme: target });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("design");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, customThemes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allThemes.filter((theme) => {
      if (collectionFilter !== "all" && theme.collection !== collectionFilter) return false;
      if (modeFilter !== "all" && theme.mode !== modeFilter) return false;
      if (favoritesOnly && !favorites.includes(theme.id)) return false;
      if (!q) return true;
      const haystack = [
        theme.name,
        theme.description,
        getCollectionLabel(theme.collection),
        theme.mode,
        ...theme.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allThemes, collectionFilter, modeFilter, favoritesOnly, favorites, query]);

  const filtersActive =
    query.trim().length > 0 || collectionFilter !== "all" || modeFilter !== "all" || favoritesOnly;

  const themesById = useMemo(() => new Map(allThemes.map((t) => [t.id, t])), [allThemes]);
  const resolveThemes = useCallback(
    (ids: string[]) => ids.map((id) => themesById.get(id)).filter((t): t is ResolvedTheme => Boolean(t)),
    [themesById],
  );

  const handleApply = useCallback(
    (theme: ResolvedTheme) => {
      const applied = appearance.applyThemeById(theme.id);
      if (applied) {
        toast.success(`${applied.name} applied`, { description: "Your new look is live across ShadowTalk." });
        setPreviewTheme(null);
      } else {
        toast.error("Could not apply this theme.");
      }
    },
    [appearance],
  );

  const handleDuplicate = useCallback(
    (theme: ResolvedTheme) => {
      if (theme.collection === CUSTOM_COLLECTION_ID) {
        const result = appearance.duplicateTheme(theme.id);
        if (result.ok && result.theme) {
          toast.success(`${result.theme.name} created`);
          setDesigner({ mode: "edit", theme: result.theme });
        } else {
          toast.error(result.error ?? "Could not duplicate the theme.");
        }
        return;
      }
      // Builtin themes become editable custom copies.
      const copy = normalizeTheme({
        ...theme,
        id: `custom-${theme.id}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${theme.name} (copy)`.slice(0, 60),
        collection: CUSTOM_COLLECTION_ID,
        source: "custom",
      });
      if (copy) {
        const saved = appearance.saveTheme(copy);
        if (saved.ok) {
          toast.success(`${copy.name} created`, { description: "Edit it in the designer." });
          setDesigner({ mode: "edit", theme: { ...copy } });
        } else {
          toast.error(saved.error ?? "Could not save the copy.");
        }
      }
    },
    [appearance],
  );

  const handleRename = useCallback(() => {
    if (!renameTarget) return;
    const result = appearance.renameTheme(renameTarget.id, renameValue);
    if (result.ok) {
      toast.success("Theme renamed");
      setRenameTarget(null);
    } else {
      toast.error(result.error ?? "Could not rename the theme.");
    }
  }, [appearance, renameTarget, renameValue]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    appearance.deleteTheme(deleteTarget.id);
    toast.success(`${deleteTarget.name} deleted`);
    setDeleteTarget(null);
  }, [appearance, deleteTarget]);

  const handleImport = useCallback(
    async (file: File) => {
      const text = await file.text();
      const result = appearance.importFromJson(text);
      if (result.ok && result.theme) {
        toast.success(`${result.theme.name} imported`, { description: "Find it under Custom themes." });
      } else {
        toast.error(result.error ?? "Import failed.");
      }
    },
    [appearance],
  );

  const syncBadge = {
    local: { icon: Cloud, text: "Saved on this device" },
    syncing: { icon: Cloud, text: "Syncing…" },
    synced: { icon: Cloud, text: "Synced across devices" },
    offline: { icon: CloudOff, text: "Offline — changes kept locally" },
  }[syncState];

  const SyncIcon = syncBadge.icon;

  const cardHandlers = {
    onApply: handleApply,
    onPreview: (theme: ResolvedTheme) => setPreviewTheme(theme),
    onToggleFavorite: (id: string) => appearance.toggleFavorite(id),
    onEdit: (theme: ResolvedTheme) => setDesigner({ mode: "edit", theme }),
    onDuplicate: handleDuplicate,
    onRename: (theme: ResolvedTheme) => {
      setRenameTarget(theme);
      setRenameValue(theme.name);
    },
    onDelete: (theme: ResolvedTheme) => setDeleteTarget(theme),
    onExport: (theme: ResolvedTheme) => appearance.exportTheme(theme),
  };

  const renderGrid = (themes: ResolvedTheme[], testIdPrefix: string) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" data-testid={testIdPrefix}>
      {themes.map((theme) => (
        <ThemePreviewCard
          key={theme.id}
          theme={theme}
          active={activeTheme?.id === theme.id}
          favorite={favorites.includes(theme.id)}
          {...cardHandlers}
        />
      ))}
    </div>
  );

  return (
    <PageTransition>
      <div
        className="mx-auto min-h-screen w-full max-w-7xl px-4 pt-24 pb-8 sm:px-6 md:pt-8 lg:px-8"
        data-testid="appearance-studio"
      >
        {/* ---------- Header ---------- */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="gradient-text text-3xl font-bold tracking-tight sm:text-4xl" data-appearance-title>
                Appearance Studio
              </h1>
              <span
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
                data-testid="sync-state"
              >
                <SyncIcon className="h-3 w-3" /> {syncBadge.text}
              </span>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Choose from {appearance.builtinThemes.length} professionally designed themes, organize your favorites,
              or craft a completely personal look — free for every ShadowTalk user.
            </p>
            {activeTheme && (
              <p className="mt-2 text-xs text-muted-foreground" data-testid="active-theme-label">
                Active theme: <span className="font-medium text-foreground">{activeTheme.name}</span>
                {isTemporaryPreview && (
                  <span className="ml-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-500">
                    Temporary preview — apply to keep
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setDesigner({ mode: "new" })} data-testid="create-theme">
              <Palette className="mr-2 h-4 w-4" /> Create Theme
            </Button>
            <Button variant="outline" onClick={() => importInputRef.current?.click()} data-testid="import-theme">
              <Import className="mr-2 h-4 w-4" /> Import
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              onClick={() => {
                appearance.restoreDefaultAppearance();
                toast.success("Restored the default ShadowTalk appearance");
              }}
              data-testid="restore-default"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Restore default
            </Button>
          </div>
        </header>

        {/* ---------- Toolbar ---------- */}
        <div
          className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
          data-testid="studio-toolbar"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search themes…"
                  aria-label="Search themes"
                  data-testid="theme-search"
                  className="pl-8"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex overflow-hidden rounded-lg border" role="group" aria-label="Light or dark filter">
                {MODE_FILTERS.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setModeFilter(mode.value)}
                    aria-pressed={modeFilter === mode.value}
                    data-testid={`mode-filter-${mode.value}`}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      modeFilter === mode.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <Button
                variant={favoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFavoritesOnly((v) => !v)}
                aria-pressed={favoritesOnly}
                data-testid="favorites-filter"
              >
                <Star className={cn("mr-1.5 h-3.5 w-3.5", favoritesOnly && "fill-current")} />
                Favorites
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Theme collections">
              <button
                type="button"
                onClick={() => setCollectionFilter("all")}
                aria-pressed={collectionFilter === "all"}
                data-testid="collection-filter-all"
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  collectionFilter === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                All themes
              </button>
              {THEME_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setCollectionFilter(collection.id)}
                  aria-pressed={collectionFilter === collection.id}
                  data-testid={`collection-filter-${collection.id}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    collectionFilter === collection.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {collection.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Results (search/filter mode) ---------- */}
        {filtersActive ? (
          <section className="mb-10">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">
                Results <span className="text-sm font-normal text-muted-foreground" data-testid="results-count">({filtered.length})</span>
              </h2>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center" data-testid="no-results">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No themes match your search and filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setQuery("");
                    setCollectionFilter("all");
                    setModeFilter("all");
                    setFavoritesOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              renderGrid(filtered, "results-grid")
            )}
          </section>
        ) : (
          <>
            {/* ---------- Recently used ---------- */}
            {recents.length > 0 && (
              <section className="mb-10" data-testid="section-recents">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Recently used</h2>
                  <span className="text-xs text-muted-foreground">({recents.length})</span>
                </div>
                {renderGrid(resolveThemes(recents), "recents-grid")}
              </section>
            )}

            {/* ---------- Favorites ---------- */}
            {favorites.length > 0 && (
              <section className="mb-10" data-testid="section-favorites">
                <div className="mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <h2 className="text-lg font-semibold">Your favorites</h2>
                  <span className="text-xs text-muted-foreground">({favorites.length})</span>
                </div>
                {renderGrid(resolveThemes(favorites), "favorites-grid")}
              </section>
            )}

            {/* ---------- Custom themes ---------- */}
            <section className="mb-10" data-testid="section-custom">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Custom themes</h2>
                  <span className="text-xs text-muted-foreground">({customThemes.length})</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDesigner({ mode: "new" })}>
                  <Palette className="mr-1.5 h-3.5 w-3.5" /> New theme
                </Button>
              </div>
              {customThemes.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setDesigner({ mode: "new" })}
                  data-testid="custom-empty-cta"
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Palette className="h-6 w-6" />
                  Design your first theme — no code required
                </button>
              ) : (
                renderGrid(customThemes, "custom-grid")
              )}
            </section>

            {/* ---------- Collections ---------- */}
            {THEME_COLLECTIONS.map((collection) => {
              const themes = appearance.builtinThemes.filter((t) => t.collection === collection.id);
              return (
                <section key={collection.id} className="mb-10" data-testid={`section-collection-${collection.id}`}>
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{collection.label}</h2>
                      <span className="text-xs text-muted-foreground">({themes.length} themes)</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{collection.description}</p>
                  </div>
                  {renderGrid(themes, `grid-collection-${collection.id}`)}
                </section>
              );
            })}
          </>
        )}

        {/* ---------- Dialogs ---------- */}
        <ThemePreviewDialog
          theme={previewTheme}
          open={previewTheme !== null}
          active={previewTheme !== null && activeTheme?.id === previewTheme.id}
          favorite={previewTheme !== null && favorites.includes(previewTheme.id)}
          onOpenChange={(open) => !open && setPreviewTheme(null)}
          onApply={handleApply}
          onToggleFavorite={appearance.toggleFavorite}
        />

        <ThemeDesigner
          open={designer !== null}
          onOpenChange={(open) => !open && setDesigner(null)}
          initialTheme={
            designer?.mode === "edit"
              ? designer.theme
              : designer?.mode === "new"
                ? activeTheme
                  ? { ...activeTheme, id: "", name: "My theme", source: "custom" as const, collection: CUSTOM_COLLECTION_ID }
                  : null
                : null
          }
          existingCustom={designer?.mode === "edit"}
          onSaveDraft={(theme) => appearance.saveTheme(theme)}
          onApplyTemporary={(theme) => {
            appearance.previewTheme(theme);
            toast.info("Temporary preview applied", { description: "Save the theme to keep it after refresh." });
          }}
          onDelete={(id) => {
            appearance.deleteTheme(id);
            toast.success("Theme deleted");
          }}
          onDuplicate={(theme) => {
            const result = appearance.saveTheme({
              ...theme,
              id: "",
              name: `${theme.name} (copy)`.slice(0, 60),
            });
            if (!result.ok) toast.error(result.error ?? "Could not duplicate.");
          }}
          onRestoreDefault={() => {
            appearance.restoreDefaultAppearance();
            toast.success("Restored the default ShadowTalk appearance");
          }}
        />

        {/* Rename dialog */}
        <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
          <DialogContent className="max-w-sm" data-testid="rename-dialog">
            <DialogHeader>
              <DialogTitle>Rename theme</DialogTitle>
              <DialogDescription>Give your theme a name you will recognize.</DialogDescription>
            </DialogHeader>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value.slice(0, 60))}
              aria-label="New theme name"
              data-testid="rename-input"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
              <Button onClick={handleRename} data-testid="rename-confirm">Rename</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent data-testid="delete-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes your custom theme from this device and any synced devices. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="delete-confirm"
              >
                Delete theme
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
}
