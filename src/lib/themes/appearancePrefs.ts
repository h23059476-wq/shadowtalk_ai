/**
 * ShadowTalk AI — appearance preferences (favorites, recents) + sync.
 *
 * Local storage is the source of truth for the running session (instant,
 * offline-safe). For signed-in users the same payload is mirrored to
 * Firestore `user_settings/{uid}` (setting_key: "appearance_studio"), the
 * app's existing owner-only key-value store, giving cross-device persistence
 * without any new collections or rule changes.
 */
import type { ResolvedTheme } from "./types";
import {
  APPEARANCE_SETTING_KEY,
  MAX_RECENT_THEMES,
  THEME_FAVORITES_STORAGE_KEY,
  THEME_RECENTS_STORAGE_KEY,
} from "./types";

// ---------------------------------------------------------------------------
// Local storage — favorites
// ---------------------------------------------------------------------------

export function getFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(THEME_FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
  } catch {
    return [];
  }
}

function persistFavorites(ids: string[]): void {
  try {
    localStorage.setItem(THEME_FAVORITES_STORAGE_KEY, JSON.stringify(ids.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function toggleFavoriteId(id: string): string[] {
  const ids = getFavoriteIds();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
  persistFavorites(next);
  return next;
}

export function removeFavoriteId(id: string): string[] {
  const next = getFavoriteIds().filter((x) => x !== id);
  persistFavorites(next);
  return next;
}

export function isFavoriteId(id: string): boolean {
  return getFavoriteIds().includes(id);
}

// ---------------------------------------------------------------------------
// Local storage — recently used
// ---------------------------------------------------------------------------

export function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(THEME_RECENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_RECENT_THEMES) : [];
  } catch {
    return [];
  }
}

function persistRecents(ids: string[]): void {
  try {
    localStorage.setItem(THEME_RECENTS_STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT_THEMES)));
  } catch {
    /* ignore */
  }
}

/** Record a theme application; most-recent-first, deduplicated, capped. */
export function pushRecentId(id: string): string[] {
  const next = [id, ...getRecentIds().filter((x) => x !== id)].slice(0, MAX_RECENT_THEMES);
  persistRecents(next);
  return next;
}

export function removeRecentId(id: string): string[] {
  const next = getRecentIds().filter((x) => x !== id);
  persistRecents(next);
  return next;
}

// ---------------------------------------------------------------------------
// Cross-device sync via the app's `backend` client (Firestore user_settings)
// ---------------------------------------------------------------------------

export interface AppearanceSnapshot {
  activeThemeId: string | null;
  customThemes: ResolvedTheme[];
  favorites: string[];
  recents: string[];
  updatedAt: number;
}

function settingKeyFilter(query: any, userId: string) {
  return query.eq("user_id", userId).eq("setting_key", APPEARANCE_SETTING_KEY);
}

/** Fetch the remote appearance snapshot; null when absent/unavailable. */
export async function fetchRemoteAppearance(userId: string): Promise<AppearanceSnapshot | null> {
  if (!userId) return null;
  try {
    const { backend } = await import("@/integrations/local/client");
    const res = await settingKeyFilter(
      backend.from("user_settings").select("setting_value"),
      userId,
    ).maybeSingle();
    if (res?.error) return null;
    const value = res?.data?.setting_value as AppearanceSnapshot | string | undefined;
    if (!value) return null;
    const snapshot: AppearanceSnapshot =
      typeof value === "string" ? JSON.parse(value) : value;
    if (!snapshot || typeof snapshot !== "object") return null;
    return {
      activeThemeId: typeof snapshot.activeThemeId === "string" ? snapshot.activeThemeId : null,
      customThemes: Array.isArray(snapshot.customThemes) ? snapshot.customThemes : [],
      favorites: Array.isArray(snapshot.favorites) ? snapshot.favorites : [],
      recents: Array.isArray(snapshot.recents) ? snapshot.recents : [],
      updatedAt: typeof snapshot.updatedAt === "number" ? snapshot.updatedAt : 0,
    };
  } catch {
    return null; // offline / firestore unavailable — stay local-only
  }
}

/** Persist the snapshot remotely. Returns false on failure (never throws). */
export async function pushRemoteAppearance(userId: string, snapshot: AppearanceSnapshot): Promise<boolean> {
  if (!userId) return false;
  try {
    const { backend } = await import("@/integrations/local/client");
    const res = await backend.from("user_settings").upsert(
      {
        user_id: userId,
        setting_key: APPEARANCE_SETTING_KEY,
        setting_value: { ...snapshot, updatedAt: Date.now() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,setting_key" },
    );
    return !res?.error;
  } catch {
    return false;
  }
}

/**
 * Merge a remote snapshot into local state.
 * Policy:
 *  - custom themes: union by id; on conflict the newer updatedAt wins
 *    (nothing is silently overwritten or lost);
 *  - favorites: union (local order first);
 *  - recents: local list first, remote extras appended, capped;
 *  - activeThemeId: remote adopted only when the local device has none yet,
 *    so the current session's choice is never clobbered by a stale sync.
 */
export function mergeSnapshots(
  local: { activeThemeId: string | null; customThemes: ResolvedTheme[]; favorites: string[]; recents: string[] },
  remote: AppearanceSnapshot | null,
): AppearanceSnapshot {
  if (!remote) {
    return {
      activeThemeId: local.activeThemeId,
      customThemes: local.customThemes,
      favorites: local.favorites,
      recents: local.recents,
      updatedAt: Date.now(),
    };
  }

  const byId = new Map(local.customThemes.map((t) => [t.id, t]));
  for (const theme of remote.customThemes) {
    const existing = byId.get(theme.id);
    if (!existing || (theme.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      byId.set(theme.id, theme);
    }
  }

  const favorites = [...new Set([...local.favorites, ...remote.favorites])];
  const recents = [...new Set([...local.recents, ...remote.recents])].slice(0, MAX_RECENT_THEMES);
  const activeThemeId = local.activeThemeId ?? remote.activeThemeId;

  return {
    activeThemeId,
    customThemes: [...byId.values()],
    favorites,
    recents,
    updatedAt: Date.now(),
  };
}
