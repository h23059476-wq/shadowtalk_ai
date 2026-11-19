/**
 * QuotaLedger — device-local per-provider cooldowns for the free-AI router.
 *
 * Covers: success counting, 429 cooldown blocking + expiry, auth-failure
 * cooldown (longer), daily counter rollover (cooldowns survive the rollover
 * since they are epoch-based), corrupted-storage tolerance, and the
 * read-only snapshot/entry helpers.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

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
vi.stubGlobal("localStorage", lsMock);

import {
  RATE_LIMIT_COOLDOWN_MS,
  AUTH_FAILURE_COOLDOWN_MS,
  recordProviderSuccess,
  recordProviderRateLimited,
  recordProviderAuthFailure,
  isProviderBlocked,
  getLedgerEntry,
  quotaSnapshot,
  resetLedgerForNewDay,
  __resetQuotaLedgerForTests,
} from "@/lib/quotaLedger";

const BASE = new Date("2026-01-15T10:00:00.000Z");
const at = (msFromBase: number) => new Date(BASE.getTime() + msFromBase);

describe("quotaLedger", () => {
  beforeEach(() => {
    __resetQuotaLedgerForTests();
  });

  it("counts successful requests per provider", () => {
    recordProviderSuccess("gemini", BASE);
    recordProviderSuccess("gemini", at(1000));
    recordProviderSuccess("groq", at(2000));
    expect(getLedgerEntry("gemini", at(2000))?.requests).toBe(2);
    expect(getLedgerEntry("groq", at(2000))?.requests).toBe(1);
    expect(getLedgerEntry("mistral", at(2000))).toBeNull();
  });

  it("blocks a provider inside the 429 cooldown and releases after it", () => {
    recordProviderRateLimited("groq", BASE);
    expect(isProviderBlocked("groq", at(1))).toBe(true);
    expect(isProviderBlocked("groq", at(RATE_LIMIT_COOLDOWN_MS - 1))).toBe(true);
    expect(isProviderBlocked("groq", at(RATE_LIMIT_COOLDOWN_MS))).toBe(false);
    // Other providers are unaffected.
    expect(isProviderBlocked("gemini", at(1))).toBe(false);
  });

  it("blocks a rejected key for the longer auth cooldown", () => {
    recordProviderAuthFailure("openrouter", BASE);
    expect(isProviderBlocked("openrouter", at(RATE_LIMIT_COOLDOWN_MS * 2))).toBe(true);
    expect(isProviderBlocked("openrouter", at(AUTH_FAILURE_COOLDOWN_MS))).toBe(false);
  });

  it("a success clears stale cooldown markers", () => {
    recordProviderRateLimited("gemini", BASE);
    expect(isProviderBlocked("gemini", at(1000))).toBe(true);
    recordProviderSuccess("gemini", at(2000));
    expect(isProviderBlocked("gemini", at(3000))).toBe(false);
  });

  it("rolls the request counters over on a new day but keeps epoch cooldowns", () => {
    // 429 at 23:59:50 — the cooldown window crosses midnight into the new day.
    const lateNight = new Date("2026-01-15T23:59:50.000Z");
    recordProviderSuccess("gemini", lateNight);
    recordProviderRateLimited("groq", lateNight);
    const justAfterMidnight = new Date("2026-01-16T00:00:10.000Z");
    // Counter reset — yesterday's entry is wiped, so it reads as "unused today".
    expect(getLedgerEntry("gemini", justAfterMidnight)).toBeNull();
    // …while yesterday's 429 still blocks for the remainder of its window.
    expect(isProviderBlocked("groq", justAfterMidnight)).toBe(true);
    expect(isProviderBlocked("groq", new Date(lateNight.getTime() + RATE_LIMIT_COOLDOWN_MS))).toBe(false);
  });

  it("resetLedgerForNewDay is a no-op on the same day", () => {
    recordProviderSuccess("gemini", BASE);
    resetLedgerForNewDay(at(1000));
    expect(getLedgerEntry("gemini", at(1000))?.requests).toBe(1);
  });

  it("tolerates corrupted storage without throwing", () => {
    lsMock.setItem("shadowtalk.quota-ledger.v1", "{not-json");
    expect(isProviderBlocked("gemini", BASE)).toBe(false);
    expect(() => recordProviderSuccess("gemini", BASE)).not.toThrow();
    expect(getLedgerEntry("gemini", BASE)?.requests).toBe(1);
    lsMock.setItem("shadowtalk.quota-ledger.v1", JSON.stringify({ day: "x", providers: "nope" }));
    expect(isProviderBlocked("groq", BASE)).toBe(false);
  });

  it("quotaSnapshot returns a deep copy", () => {
    recordProviderSuccess("gemini", BASE);
    const snap = quotaSnapshot(BASE);
    snap.providers.gemini.requests = 99;
    expect(getLedgerEntry("gemini", BASE)?.requests).toBe(1);
    expect(snap.day).toBe("2026-01-15");
  });
});
