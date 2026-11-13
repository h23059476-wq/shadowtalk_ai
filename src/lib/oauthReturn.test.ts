import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  clearPendingOAuthFlag,
  consumeOAuthReturnDestination,
  hasPendingOAuthFlag,
  setOAuthReturnDestination,
  setPendingOAuthFlag,
} from "./oauthReturn";

const PENDING_KEY = "shadowtalk_auth_redirect_pending";
const RETURN_KEY = "shadowtalk_oauth_return_destination";

describe("oauthReturn handoff state", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("stores the pending flag as a fresh timestamp", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    setPendingOAuthFlag();
    expect(Number(window.sessionStorage.getItem(PENDING_KEY))).toBe(Date.parse("2026-01-01T00:00:00Z"));
    expect(hasPendingOAuthFlag()).toBe(true);
  });

  it("expires the pending flag after 5 minutes", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    setPendingOAuthFlag();
    vi.setSystemTime(new Date("2026-01-01T00:05:01Z"));
    expect(hasPendingOAuthFlag()).toBe(false);
  });

  it("treats the legacy bare-'1' flag (written by old builds) as stale", () => {
    window.sessionStorage.setItem(PENDING_KEY, "1");
    expect(hasPendingOAuthFlag()).toBe(false);
  });

  it("treats non-numeric garbage as stale instead of crashing", () => {
    window.sessionStorage.setItem(PENDING_KEY, "not-a-number");
    expect(hasPendingOAuthFlag()).toBe(false);
  });

  it("clearPendingOAuthFlag removes the flag", () => {
    setPendingOAuthFlag();
    clearPendingOAuthFlag();
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(hasPendingOAuthFlag()).toBe(false);
  });

  it("set/consume the return destination — consume clears it", () => {
    setOAuthReturnDestination("https://example.org/chatbot?q=hello");
    expect(consumeOAuthReturnDestination()).toBe("https://example.org/chatbot?q=hello");
    expect(consumeOAuthReturnDestination()).toBeNull();
  });

  it("ignores empty destinations", () => {
    setOAuthReturnDestination("");
    expect(consumeOAuthReturnDestination()).toBeNull();
  });

  it("survives sessionStorage failures without throwing", () => {
    const spy = vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => setPendingOAuthFlag()).not.toThrow();
    expect(() => setOAuthReturnDestination("https://example.org/chatbot")).not.toThrow();
    spy.mockRestore();

    const getSpy = vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(hasPendingOAuthFlag()).toBe(false);
    expect(consumeOAuthReturnDestination()).toBeNull();
    getSpy.mockRestore();
  });
});
