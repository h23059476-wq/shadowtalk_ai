/**
 * Final completion phase — ShadowMemory activity journal account scoping.
 *
 * The legacy `shadowtalk-memory` IndexedDB store had NO user scoping: on a
 * shared browser, account B (or a guest) could read account A's full activity
 * journal, and one account's "clear all" wiped everyone's records.
 *
 * New records are stamped with the authenticated uid; reads, stats, exports
 * and clears are scope-filtered. Records without a user_id (legacy or guest
 * entries) stay preserved on the device and are visible ONLY in the
 * signed-out view — never silently claimed by a signed-in account.
 *
 * The tests exercise the localStorage-fallback path (openDB is forced to
 * throw); the scope filter is shared by the IndexedDB and fallback paths.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
    _dump: () => store,
  };
};
const lsMock = makeStorage();
vi.stubGlobal("localStorage", lsMock);

// Force the localStorage-fallback path (scope logic is identical).
vi.mock("idb", () => ({
  openDB: vi.fn(async () => { throw new Error("no idb in test"); }),
}));

const authMock = vi.hoisted(() => ({ uid: "alice" as string | null }));
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: authMock.uid ? { id: authMock.uid } : null }),
}));

import { useShadowMemory, type ShadowActivity } from "@/hooks/useShadowMemory";

const FALLBACK_KEY = "shadowtalk_memory_fallback";
const seedFallback = (items: ShadowActivity[]) =>
  lsMock.setItem(FALLBACK_KEY, JSON.stringify(items));

const readFallback = (): ShadowActivity[] => {
  const raw = lsMock.getItem(FALLBACK_KEY);
  return raw ? (JSON.parse(raw) as ShadowActivity[]) : [];
};

const entry = (id: string, userId: string | null): ShadowActivity => ({
  id,
  category: "chat",
  action: `action-${id}`,
  timestamp: new Date(2026, 0, 1).toISOString(),
  user_id: userId,
});

describe("useShadowMemory account scoping", () => {
  beforeEach(() => { lsMock.clear(); authMock.uid = "alice"; });
  afterEach(() => { lsMock.clear(); });

  it("stamps new records with the authenticated uid", async () => {
    // Pre-seed one record so the baseline-seeding branch is skipped.
    seedFallback([entry("seed-1", "alice")]);
    const { result } = renderHook(() => useShadowMemory());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(async () => { await result.current.log("chat", "Sent a message"); });

    const items = readFallback();
    expect(items).toHaveLength(2);
    const logged = items.find((i) => i.action === "Sent a message");
    expect(logged?.user_id).toBe("alice");
  });

  it("hides other accounts' records from a signed-in user", async () => {
    seedFallback([entry("a-1", "alice"), entry("b-1", "bob"), entry("legacy-1", null)]);
    const { result } = renderHook(() => useShadowMemory());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const rows = await result.current.getActivities();
    expect(rows.map((r) => r.id)).toEqual(["a-1"]);
  });

  it("shows guest/legacy records only in the signed-out view", async () => {
    seedFallback([entry("a-1", "alice"), entry("legacy-1", null)]);
    authMock.uid = null;
    const { result, rerender } = renderHook(() => useShadowMemory());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const rows = await result.current.getActivities();
    expect(rows.map((r) => r.id)).toEqual(["legacy-1"]);

    // Signed back in — the legacy record is hidden again (never auto-claimed).
    authMock.uid = "alice";
    rerender();
    await waitFor(() => expect(result.current.getActivities).toBeDefined());
    const scoped = await result.current.getActivities();
    expect(scoped.map((r) => r.id)).toEqual(["a-1"]);
  });

  it("scopes getStats to the current account", async () => {
    seedFallback([entry("a-1", "alice"), entry("a-2", "alice"), entry("b-1", "bob")]);
    const { result } = renderHook(() => useShadowMemory());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const stats = await result.current.getStats();
    expect(stats.total).toBe(2);
    expect(stats.categories.chat).toBe(2);
  });

  it("clearAll removes only the current account's records (data preserved for others)", async () => {
    seedFallback([entry("a-1", "alice"), entry("b-1", "bob"), entry("legacy-1", null)]);
    const { result } = renderHook(() => useShadowMemory());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => { await result.current.clearAll(); });

    const remaining = readFallback().map((r) => r.id).sort();
    // Bob's records and the guest/legacy record survive Alice's clear.
    expect(remaining).toEqual(["b-1", "legacy-1"]);
  });

  it("exports only the current account's journal", async () => {
    seedFallback([entry("a-1", "alice"), entry("b-1", "bob")]);
    const { result } = renderHook(() => useShadowMemory());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const json = await result.current.exportJSON();
    expect(json).toContain("a-1");
    expect(json).not.toContain("b-1");
  });
});
