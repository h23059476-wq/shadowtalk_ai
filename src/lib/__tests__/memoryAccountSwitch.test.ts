/**
 * Batch 3 — Memory account-switch isolation.
 *
 * The legacy global memory databases (shadowtalk_memory_db, shadowtalk-memory)
 * have NO user_id field, so per-UID migration cannot establish ownership
 * safely. Per the spec's option (b), these DBs are LEFT UNTOUCHED on sign-out
 * (no destructive cleanup) and the limitation is documented.
 *
 * This test verifies:
 *  - The global memory localStorage fallback keys survive sign-out.
 *  - clearUserLocalData does NOT delete any IndexedDB database (source contract).
 *  - The global memory DBs remain accessible to the same user after sign-out +
 *    sign-in (the data persists because it is never wiped).
 *  - Guest memory fallback keys are separate from authenticated namespaces.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};
const lsMock = makeStorage();
const ssMock = makeStorage();
vi.stubGlobal("localStorage", lsMock);
vi.stubGlobal("sessionStorage", ssMock);

import { clearUserLocalData } from "@/lib/signOutCleanup";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

describe("Memory preservation on sign-out", () => {
  beforeEach(() => { lsMock.clear(); ssMock.clear(); });
  afterEach(() => { lsMock.clear(); ssMock.clear(); });

  it("preserves the adaptive-memory localStorage fallback across sign-out", () => {
    const facts = JSON.stringify([{ id: "f1", content: "Alice likes tea", kind: "preference" }]);
    lsMock.setItem("shadowtalk_adaptive_memory_v2", facts);
    clearUserLocalData("uid-alice");
    expect(lsMock.getItem("shadowtalk_adaptive_memory_v2")).toBe(facts);
  });

  it("preserves the shadow-memory localStorage fallback across sign-out", () => {
    const acts = JSON.stringify([{ id: "a1", category: "chat", action: "sent", timestamp: "t" }]);
    lsMock.setItem("shadowtalk_memory_fallback", acts);
    clearUserLocalData("uid-alice");
    expect(lsMock.getItem("shadowtalk_memory_fallback")).toBe(acts);
  });

  it("preserves the guest user_memories key across sign-out", () => {
    const mems = JSON.stringify([{ content: "guest pref" }]);
    lsMock.setItem("shadowtalk_user_memories", mems);
    clearUserLocalData("uid-alice");
    expect(lsMock.getItem("shadowtalk_user_memories")).toBe(mems);
  });

  it("preserves UID-scoped business memories across sign-out", () => {
    const bm = JSON.stringify([{ title: "ctx", content: "secret" }]);
    lsMock.setItem("shadowtalk_business_memories.uid-alice", bm);
    clearUserLocalData("uid-alice");
    expect(lsMock.getItem("shadowtalk_business_memories.uid-alice")).toBe(bm);
  });

  it("same user's memory is still readable after sign-out + sign-in (data persists)", () => {
    const facts = JSON.stringify([{ id: "f1", content: "Alice likes tea" }]);
    lsMock.setItem("shadowtalk_adaptive_memory_v2", facts);
    clearUserLocalData("uid-alice");     // sign out
    clearUserLocalData("uid-alice");     // sign back in (idempotent, still preserves)
    expect(lsMock.getItem("shadowtalk_adaptive_memory_v2")).toBe(facts);
  });

  it("guest memory fallback is separate from authenticated namespaces", () => {
    lsMock.setItem("shadowtalk_user_memories", "guest-data");
    lsMock.setItem("shadowtalk_business_memories.uid-alice", "alice-data");
    clearUserLocalData("uid-alice");
    expect(lsMock.getItem("shadowtalk_user_memories")).toBe("guest-data");
    expect(lsMock.getItem("shadowtalk_business_memories.uid-alice")).toBe("alice-data");
  });
});

describe("Memory — source contract: sign-out never deletes IndexedDB", () => {
  it("clearUserLocalData does not delete any IndexedDB database", () => {
    const src = read("src/lib/signOutCleanup.ts");
    expect(src).not.toMatch(/indexedDB\.deleteDatabase/);
    expect(src).not.toMatch(/\.deleteDatabase\(/);
    expect(src).not.toMatch(/IDBFactory/i);
    expect(src).toContain("memory DBs");
    expect(src).toContain("IndexedDB");
  });

  it("signOutCleanup preserves the legacy global memory DB names", () => {
    const src = read("src/lib/signOutCleanup.ts");
    expect(src).not.toContain("deleteDatabase");
  });
});
