import { beforeEach, describe, expect, it } from "vitest";
import {
  getFavoriteIds,
  getRecentIds,
  mergeSnapshots,
  pushRecentId,
  removeFavoriteId,
  removeRecentId,
  toggleFavoriteId,
  type AppearanceSnapshot,
} from "../appearancePrefs";
import { MAX_RECENT_THEMES, THEME_FAVORITES_STORAGE_KEY, THEME_RECENTS_STORAGE_KEY } from "../types";
import { normalizeTheme } from "../normalize";

beforeEach(() => {
  localStorage.clear();
});

describe("favorites", () => {
  it("toggles favorites and persists them", () => {
    expect(toggleFavoriteId("obsidian-indigo")).toContain("obsidian-indigo");
    expect(getFavoriteIds()).toContain("obsidian-indigo");
    expect(localStorage.getItem(THEME_FAVORITES_STORAGE_KEY)).toContain("obsidian-indigo");
    expect(toggleFavoriteId("obsidian-indigo")).not.toContain("obsidian-indigo");
    expect(getFavoriteIds()).not.toContain("obsidian-indigo");
  });

  it("prepends newly favorited themes", () => {
    toggleFavoriteId("a");
    toggleFavoriteId("b");
    expect(getFavoriteIds()[0]).toBe("b");
    removeFavoriteId("b");
    expect(getFavoriteIds()).toEqual(["a"]);
  });

  it("tolerates corrupted storage", () => {
    localStorage.setItem(THEME_FAVORITES_STORAGE_KEY, "not-json{");
    expect(getFavoriteIds()).toEqual([]);
  });
});

describe("recents", () => {
  it("records most-recent-first without duplicates", () => {
    pushRecentId("t1");
    pushRecentId("t2");
    pushRecentId("t1");
    expect(getRecentIds()).toEqual(["t1", "t2"]);
  });

  it("caps the recents list", () => {
    for (let i = 0; i < MAX_RECENT_THEMES + 4; i++) pushRecentId(`t${i}`);
    expect(getRecentIds().length).toBe(MAX_RECENT_THEMES);
    expect(getRecentIds()[0]).toBe(`t${MAX_RECENT_THEMES + 3}`);
  });

  it("removes entries (used after deleting a custom theme)", () => {
    pushRecentId("t1");
    pushRecentId("t2");
    expect(removeRecentId("t1")).toEqual(["t2"]);
  });
});

describe("snapshot merge (cross-device sync)", () => {
  const theme = normalizeTheme({
    id: "custom-a",
    name: "A",
    tokens: { background: "0 0% 3%" },
    updatedAt: 100,
  })!;
  const newer = { ...theme, name: "A2", updatedAt: 200 };
  const older = { ...theme, name: "A0", updatedAt: 50 };

  const local = {
    activeThemeId: "graphite",
    customThemes: [theme],
    favorites: ["f1"],
    recents: ["r1", "r2"],
  };

  const remote: AppearanceSnapshot = {
    activeThemeId: "deep-sapphire",
    customThemes: [newer],
    favorites: ["f2"],
    recents: ["r2", "r3"],
    updatedAt: 200,
  };

  it("merges custom themes keeping the newest updatedAt per id", () => {
    const merged = mergeSnapshots(local, remote);
    expect(merged.customThemes.length).toBe(1);
    expect(merged.customThemes[0].name).toBe("A2");
  });

  it("keeps the local version when it is newer — nothing silently overwritten", () => {
    const merged = mergeSnapshots(
      { ...local, customThemes: [newer] },
      { ...remote, customThemes: [older] },
    );
    expect(merged.customThemes[0].name).toBe("A2");
  });

  it("unions favorites and recents without duplicates, capping recents", () => {
    const merged = mergeSnapshots(local, remote);
    expect(merged.favorites).toEqual(["f1", "f2"]);
    expect(merged.recents).toEqual(["r1", "r2", "r3"]);
  });

  it("adopts the remote active theme only when the local device has none", () => {
    expect(mergeSnapshots(local, remote).activeThemeId).toBe("graphite");
    expect(mergeSnapshots({ ...local, activeThemeId: null }, remote).activeThemeId).toBe("deep-sapphire");
  });

  it("returns local state untouched when remote is null (offline)", () => {
    const merged = mergeSnapshots(local, null);
    expect(merged.customThemes).toBe(local.customThemes);
    expect(merged.favorites).toEqual(local.favorites);
  });
});
