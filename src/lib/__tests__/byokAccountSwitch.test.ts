/**
 * Batch 3 — BYOK account-switch isolation.
 *
 * Verifies the BYOK-only requirements from the spec:
 *  - User A's keys survive sign-out (clearUserLocalData preserves BYOK).
 *  - User B cannot read User A's keys (UID-scoped lookup).
 *  - User A recovers their config after signing back in.
 *  - Provider/model selections remain intact.
 *  - Raw API keys never appear in logs/console output.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
    _dump: () => store,
  };
};
const lsMock = makeStorage();
const ssMock = makeStorage();
vi.stubGlobal("localStorage", lsMock);
vi.stubGlobal("sessionStorage", ssMock);

const authMock = vi.hoisted(() => ({ uid: "uid-alice" }));
vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: authMock.uid } }),
  functionsBaseUrl: "https://test.functions.example.com",
}));

import { getByokConfig, saveByokConfig, clearByokConfig } from "@/lib/byok";
import { clearUserLocalData } from "@/lib/signOutCleanup";

const aliceConfig = {
  provider: "openai" as const,
  apiKey: "sk-alice-secret-key-DO-NOT-LEAK",
  model: "gpt-4o-mini",
  mode: "always" as const,
};
const bobConfig = {
  provider: "groq" as const,
  apiKey: "gsk-bob-secret-key",
  model: "llama-3.3-70b-versatile",
  mode: "fallback" as const,
};

let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("BYOK account-switch isolation", () => {
  beforeEach(() => {
    lsMock.clear(); ssMock.clear();
    authMock.uid = "uid-alice";
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    lsMock.clear(); ssMock.clear();
  });

  it("User A's BYOK config survives sign-out (clearUserLocalData preserves it)", () => {
    authMock.uid = "uid-alice";
    saveByokConfig(aliceConfig);
    expect(lsMock.getItem("shadowtalk.byok.v2.uid-alice")).toBeTruthy();

    clearUserLocalData("uid-alice");

    const raw = lsMock.getItem("shadowtalk.byok.v2.uid-alice");
    expect(raw).toBeTruthy();
    expect(raw).toContain("sk-alice-secret-key-DO-NOT-LEAK");
  });

  it("User B cannot read User A's BYOK config", () => {
    authMock.uid = "uid-alice";
    saveByokConfig(aliceConfig);

    authMock.uid = "uid-bob";
    expect(getByokConfig()).toBeNull();

    saveByokConfig(bobConfig);
    expect(getByokConfig()?.apiKey).toBe("gsk-bob-secret-key");
    expect(getByokConfig()?.provider).toBe("groq");

    expect(lsMock.getItem("shadowtalk.byok.v2.uid-alice")).toContain("sk-alice-secret-key-DO-NOT-LEAK");
  });

  it("User A recovers their full BYOK config after signing back in", () => {
    authMock.uid = "uid-alice";
    saveByokConfig(aliceConfig);

    clearUserLocalData("uid-alice");
    authMock.uid = "uid-bob";
    saveByokConfig(bobConfig);

    authMock.uid = "uid-alice";
    const cfg = getByokConfig();
    expect(cfg).not.toBeNull();
    expect(cfg?.apiKey).toBe("sk-alice-secret-key-DO-NOT-LEAK");
    expect(cfg?.provider).toBe("openai");
    expect(cfg?.model).toBe("gpt-4o-mini");
    expect(cfg?.mode).toBe("always");
  });

  it("provider/model selections remain intact across sign-out + sign-in", () => {
    authMock.uid = "uid-alice";
    saveByokConfig({ provider: "anthropic", apiKey: "sk-ant-x", model: "claude-haiku-4-5-20251001", mode: "fallback" });
    clearUserLocalData("uid-alice");
    authMock.uid = "uid-bob";
    saveByokConfig({ provider: "mistral", apiKey: "mst-y", model: "mistral-small-latest", mode: "always" });
    authMock.uid = "uid-alice";
    const cfg = getByokConfig();
    expect(cfg?.provider).toBe("anthropic");
    expect(cfg?.model).toBe("claude-haiku-4-5-20251001");
    expect(cfg?.mode).toBe("fallback");
  });

  it("raw API keys never appear in console.warn/error output", () => {
    authMock.uid = "uid-alice";
    saveByokConfig(aliceConfig);
    clearUserLocalData("uid-alice");
    getByokConfig();
    authMock.uid = "uid-bob";
    getByokConfig();
    authMock.uid = "uid-alice";
    getByokConfig();

    const allWarn = consoleWarnSpy.mock.calls.map((c) => JSON.stringify(c)).join(" ");
    const allError = consoleErrorSpy.mock.calls.map((c) => JSON.stringify(c)).join(" ");
    expect(allWarn).not.toContain("sk-alice-secret-key-DO-NOT-LEAK");
    expect(allError).not.toContain("sk-alice-secret-key-DO-NOT-LEAK");
    expect(allWarn).not.toContain("gsk-bob-secret-key");
    expect(allError).not.toContain("gsk-bob-secret-key");
  });

  it("clearByokConfig only removes the CURRENT user's config, not other accounts'", () => {
    authMock.uid = "uid-alice";
    saveByokConfig(aliceConfig);
    authMock.uid = "uid-bob";
    saveByokConfig(bobConfig);

    clearByokConfig();
    expect(lsMock.getItem("shadowtalk.byok.v2.uid-bob")).toBeNull();
    expect(lsMock.getItem("shadowtalk.byok.v2.uid-alice")).toBeTruthy();
  });
});
