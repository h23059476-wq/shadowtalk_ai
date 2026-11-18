/**
 * Firestore persistence contract — the backbone of "offline never fails".
 *
 * firebase v12's getFirestore() defaults to a MEMORY-ONLY local cache
 * (LruGcMemoryOfflineComponentProvider): writes queued while offline lived in
 * RAM only, so a page reload silently discarded them, and reads answered
 * empty offline after a reload. fbDb() must therefore build the ONE Firestore
 * instance via initializeFirestore with persistentLocalCache +
 * persistentMultipleTabManager (IndexedDB-backed mutation queue), and both
 * Firebase entry points (integrations/firebase/app.ts and lib/firebase.ts)
 * must share that same instance.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { initSpy, getSpy, plcSpy, pmtmSpy, appObj, dbObj } = vi.hoisted(() => ({
  initSpy: vi.fn(),
  getSpy: vi.fn(),
  plcSpy: vi.fn(),
  pmtmSpy: vi.fn(),
  appObj: { __kind: "firebase-app" },
  dbObj: { __kind: "persistent-db" },
}));

vi.mock("firebase/app", () => ({
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => appObj),
  initializeApp: vi.fn(() => appObj),
}));

vi.mock("firebase/firestore", () => ({
  initializeFirestore: initSpy,
  getFirestore: getSpy,
  persistentLocalCache: plcSpy,
  persistentMultipleTabManager: pmtmSpy,
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ __kind: "auth" })),
  setPersistence: vi.fn(),
  browserLocalPersistence: { __kind: "browserLocal" },
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(() => ({ __kind: "storage" })),
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics: vi.fn(() => ({ __kind: "analytics" })),
  logEvent: vi.fn(),
  isSupported: vi.fn(async () => false),
}));

describe("Firestore persistent cache (offline durability)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    initSpy.mockReturnValue(dbObj);
    plcSpy.mockImplementation((opts: unknown) => ({ __kind: "persistentLocalCache", opts }));
    pmtmSpy.mockReturnValue({ __kind: "persistentMultipleTabManager" });
  });

  it("creates the single Firestore instance with a persistent multi-tab local cache", async () => {
    const { fbDb } = await import("@/integrations/firebase/app");
    fbDb();
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledWith(appObj, {
      localCache: expect.objectContaining({ __kind: "persistentLocalCache" }),
    });
    expect(plcSpy).toHaveBeenCalledWith({
      tabManager: expect.objectContaining({ __kind: "persistentMultipleTabManager" }),
    });
    expect(pmtmSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("memoizes the instance (both entry points share one cache)", async () => {
    const { fbDb } = await import("@/integrations/firebase/app");
    const first = fbDb();
    const second = fbDb();
    expect(second).toBe(first);
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to getFirestore (never throws) when an instance already exists", async () => {
    initSpy.mockReset();
    initSpy.mockImplementation(() => {
      throw new Error("A Firestore instance already exists");
    });
    getSpy.mockReturnValue({ __kind: "memory-db" });
    const { fbDb } = await import("@/integrations/firebase/app");
    expect(() => fbDb()).not.toThrow();
    expect(fbDb()).toEqual({ __kind: "memory-db" });
  });

  it("lib/firebase.ts db export is the SAME persistent instance as fbDb()", async () => {
    const { fbDb } = await import("@/integrations/firebase/app");
    const expected = fbDb();
    const lib = await import("@/lib/firebase");
    expect(lib.db).toBe(expected);
    // The memory-only default must never be created anywhere.
    expect(getSpy).not.toHaveBeenCalled();
  });
});
