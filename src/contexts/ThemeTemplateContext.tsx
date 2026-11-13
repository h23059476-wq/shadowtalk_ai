import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { THEME_REGISTRY, getThemeById } from "@/lib/themes/registry";
import {
  applyTheme,
  clearAppliedTheme,
  getActiveThemeId,
  restoreStoredTheme,
} from "@/lib/themes/applyTheme";
import { downloadThemeTemplate } from "@/lib/themes/downloadTheme";
import {
  deleteCustomTheme,
  duplicateCustomTheme,
  importThemeJson,
  listCustomThemes,
  renameCustomTheme,
  saveCustomTheme,
  type ImportResult,
} from "@/lib/themes/customThemes";
import {
  fetchRemoteAppearance,
  getFavoriteIds,
  getRecentIds,
  mergeSnapshots,
  pushRecentId,
  pushRemoteAppearance,
  removeFavoriteId,
  removeRecentId,
  toggleFavoriteId,
  type AppearanceSnapshot,
} from "@/lib/themes/appearancePrefs";
import type { ResolvedTheme, ThemeTemplate } from "@/lib/themes/types";
import { useAuth } from "@/components/AuthProvider";
import { publishAutoImproveEvent } from "@/lib/autoImprove/eventBus";

export type AppearanceSyncState = "local" | "syncing" | "synced" | "offline";

type ThemeTemplateContextValue = {
  // ---- Legacy API (auto-improve suggestion panel) ----
  templates: ThemeTemplate[];
  activeTemplateId: string | null;
  activeTemplate: ThemeTemplate | null;
  applyTemplate: (template: ThemeTemplate) => void;
  downloadTemplate: (template: ThemeTemplate) => void;
  resetTheme: () => void;
  // ---- Appearance Studio API ----
  builtinThemes: ResolvedTheme[];
  customThemes: ResolvedTheme[];
  allThemes: ResolvedTheme[];
  activeTheme: ResolvedTheme | null;
  /** True when the current look is a temporary (non-persisted) preview. */
  isTemporaryPreview: boolean;
  favorites: string[];
  recents: string[];
  syncState: AppearanceSyncState;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  applyThemeById: (id: string) => ResolvedTheme | null;
  /** Apply without persisting (live preview inside the designer). */
  previewTheme: (theme: ResolvedTheme) => void;
  /** Commit the previewed theme as the persisted active theme. */
  commitPreview: () => void;
  discardPreview: () => void;
  saveTheme: (theme: ResolvedTheme) => { ok: boolean; error?: string };
  renameTheme: (id: string, name: string) => { ok: boolean; error?: string };
  duplicateTheme: (id: string) => { ok: boolean; error?: string; theme?: ResolvedTheme };
  deleteTheme: (id: string) => void;
  importFromJson: (raw: string) => ImportResult;
  exportTheme: (theme: ResolvedTheme) => void;
  restoreDefaultAppearance: () => void;
};

const ThemeTemplateContext = createContext<ThemeTemplateContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 1200;

export function ThemeTemplateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTheme, setActiveTheme] = useState<ResolvedTheme | null>(null);
  const [isTemporaryPreview, setIsTemporaryPreview] = useState(false);
  const [customThemes, setCustomThemes] = useState<ResolvedTheme[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [syncState, setSyncState] = useState<AppearanceSyncState>("local");
  const pushTimer = useRef<number | null>(null);
  const pendingSnapshot = useRef<AppearanceSnapshot | null>(null);
  const activeId = activeTheme?.id ?? null;

  // Boot: restore persisted theme + local prefs
  useEffect(() => {
    const restored = restoreStoredTheme();
    setActiveTheme(restored);
    setIsTemporaryPreview(false);
    setCustomThemes(listCustomThemes());
    setFavorites(getFavoriteIds());
    setRecents(getRecentIds());
  }, []);

  // Cross-device sync: pull remote snapshot when a user signs in
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setSyncState("syncing");
    void (async () => {
      const remote = await fetchRemoteAppearance(user.id);
      if (cancelled) return;
      const merged = mergeSnapshots(
        {
          activeThemeId: getActiveThemeId(),
          customThemes: listCustomThemes(),
          favorites: getFavoriteIds(),
          recents: getRecentIds(),
        },
        remote,
      );
      setCustomThemes(merged.customThemes);
      setFavorites(merged.favorites);
      setRecents(merged.recents);
      pendingSnapshot.current = merged;
      if (!getActiveThemeId() && merged.activeThemeId) {
        const resolved =
          getThemeById(merged.activeThemeId) ??
          merged.customThemes.find((t) => t.id === merged.activeThemeId) ??
          null;
        if (resolved) {
          const applied = applyTheme(resolved);
          setActiveTheme(applied);
          setIsTemporaryPreview(false);
        }
      }
      setSyncState(remote ? "synced" : "local");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Debounced push of every appearance change to user_settings
  const schedulePush = useCallback(
    (snapshot: Omit<AppearanceSnapshot, "updatedAt">) => {
      pendingSnapshot.current = { ...snapshot, updatedAt: Date.now() };
      if (!user?.id) return;
      if (pushTimer.current !== null) window.clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => {
        const payload = pendingSnapshot.current;
        if (!payload) return;
        setSyncState("syncing");
        void pushRemoteAppearance(user.id, payload).then((ok) => {
          setSyncState(ok ? "synced" : "offline");
        });
      }, PUSH_DEBOUNCE_MS);
    },
    [user?.id],
  );

  const applyResolvedTheme = useCallback(
    (themeInput: ResolvedTheme | ThemeTemplate, opts: { persist?: boolean } = {}) => {
      const persist = opts.persist !== false;
      const applied = applyTheme(themeInput, { persist });
      setActiveTheme(applied);
      setIsTemporaryPreview(!persist);
      if (persist) {
        const nextRecents = pushRecentId(applied.id);
        setRecents(nextRecents);
        void publishAutoImproveEvent("theme_apply", { templateId: applied.id, category: applied.collection });
        schedulePush({
          activeThemeId: applied.id,
          customThemes,
          favorites,
          recents: nextRecents,
        });
      }
      return applied;
    },
    [customThemes, favorites, schedulePush],
  );

  const applyThemeById = useCallback(
    (id: string): ResolvedTheme | null => {
      const resolved =
        getThemeById(id) ??
        customThemes.find((t) => t.id === id) ??
        null;
      if (!resolved) return null;
      return applyResolvedTheme(resolved);
    },
    [customThemes, applyResolvedTheme],
  );

  // ---- Legacy-compatible API ----
  const applyTemplate = useCallback(
    (template: ThemeTemplate) => {
      applyResolvedTheme(template);
    },
    [applyResolvedTheme],
  );

  const downloadTemplate = useCallback((template: ThemeTemplate) => {
    downloadThemeTemplate(template);
    void publishAutoImproveEvent("template_browse", { action: "download", templateId: template.id });
  }, []);

  const resetTheme = useCallback(() => {
    clearAppliedTheme();
    setActiveTheme(null);
    setIsTemporaryPreview(false);
    schedulePush({ activeThemeId: null, customThemes, favorites, recents });
    window.location.reload();
  }, [customThemes, favorites, recents, schedulePush]);

  // ---- Studio CRUD ----
  const previewTheme = useCallback(
    (theme: ResolvedTheme) => {
      applyResolvedTheme(theme, { persist: false });
    },
    [applyResolvedTheme],
  );

  const commitPreview = useCallback(() => {
    if (!activeTheme) return;
    applyResolvedTheme(activeTheme, { persist: true });
  }, [activeTheme, applyResolvedTheme]);

  const discardPreview = useCallback(() => {
    clearAppliedTheme();
    setActiveTheme(null);
    setIsTemporaryPreview(false);
    const restored = restoreStoredTheme();
    setActiveTheme(restored);
  }, []);

  const saveTheme = useCallback(
    (theme: ResolvedTheme) => {
      const result = saveCustomTheme(theme);
      if (result.ok) setCustomThemes(result.themes);
      schedulePush({ activeThemeId: activeId, customThemes: result.themes, favorites, recents });
      return { ok: result.ok, error: result.error };
    },
    [activeId, favorites, recents, schedulePush],
  );

  const renameTheme = useCallback(
    (id: string, name: string) => {
      const result = renameCustomTheme(id, name);
      if (result.ok) setCustomThemes(result.themes);
      schedulePush({ activeThemeId: activeId, customThemes: result.themes, favorites, recents });
      return { ok: result.ok, error: result.error };
    },
    [activeId, favorites, recents, schedulePush],
  );

  const duplicateTheme = useCallback(
    (id: string) => {
      const result = duplicateCustomTheme(id);
      if (result.ok && result.themes) setCustomThemes(result.themes);
      schedulePush({ activeThemeId: activeId, customThemes: result.themes ?? customThemes, favorites, recents });
      return { ok: result.ok, error: result.error, theme: result.theme };
    },
    [activeId, customThemes, favorites, recents, schedulePush],
  );

  const deleteTheme = useCallback(
    (id: string) => {
      const themes = deleteCustomTheme(id);
      setCustomThemes(themes);
      setFavorites(removeFavoriteId(id));
      setRecents(removeRecentId(id));
      if (activeId === id) {
        clearAppliedTheme();
        const restored = restoreStoredTheme();
        setActiveTheme(restored);
      }
      schedulePush({ activeThemeId: activeId === id ? null : activeId, customThemes: themes, favorites: removeFavoriteId(id), recents: removeRecentId(id) });
    },
    [activeId, schedulePush],
  );

  const importFromJson = useCallback(
    (raw: string) => {
      const result = importThemeJson(raw);
      if (result.ok && result.themes) setCustomThemes(result.themes);
      schedulePush({ activeThemeId: activeId, customThemes: result.themes ?? customThemes, favorites, recents });
      return result;
    },
    [activeId, customThemes, favorites, recents, schedulePush],
  );

  const exportTheme = useCallback((theme: ResolvedTheme) => {
    void import("@/lib/themes/customThemes").then(({ downloadThemeJson }) => downloadThemeJson(theme));
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      const next = toggleFavoriteId(id);
      setFavorites(next);
      schedulePush({ activeThemeId: activeId, customThemes, favorites: next, recents });
    },
    [activeId, customThemes, recents, schedulePush],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const restoreDefaultAppearance = useCallback(() => {
    clearAppliedTheme();
    setActiveTheme(null);
    setIsTemporaryPreview(false);
    schedulePush({ activeThemeId: null, customThemes, favorites, recents });
  }, [customThemes, favorites, recents, schedulePush]);

  const builtinThemes = THEME_REGISTRY;
  const allThemes = useMemo(() => [...builtinThemes, ...customThemes], [builtinThemes, customThemes]);

  const value = useMemo<ThemeTemplateContextValue>(
    () => ({
      templates: builtinThemes,
      activeTemplateId: activeId,
      activeTemplate: activeId ? getThemeById(activeId) ?? customThemes.find((t) => t.id === activeId) ?? null : null,
      applyTemplate,
      downloadTemplate,
      resetTheme,
      builtinThemes,
      customThemes,
      allThemes,
      activeTheme,
      isTemporaryPreview,
      favorites,
      recents,
      syncState,
      isFavorite,
      toggleFavorite,
      applyThemeById,
      previewTheme,
      commitPreview,
      discardPreview,
      saveTheme,
      renameTheme,
      duplicateTheme,
      deleteTheme,
      importFromJson,
      exportTheme,
      restoreDefaultAppearance,
    }),
    [
      builtinThemes, activeId, customThemes, applyTemplate, downloadTemplate, resetTheme,
      allThemes, activeTheme, isTemporaryPreview, favorites, recents, syncState,
      isFavorite, toggleFavorite, applyThemeById, previewTheme, commitPreview,
      discardPreview, saveTheme, renameTheme, duplicateTheme, deleteTheme,
      importFromJson, exportTheme, restoreDefaultAppearance,
    ],
  );

  return <ThemeTemplateContext.Provider value={value}>{children}</ThemeTemplateContext.Provider>;
}

export function useThemeTemplates() {
  const ctx = useContext(ThemeTemplateContext);
  if (!ctx) throw new Error("useThemeTemplates must be used within ThemeTemplateProvider");
  return ctx;
}

/** Alias with a clearer name for new Appearance Studio consumers. */
export const useAppearance = useThemeTemplates;
