/**
 * Batch 3 — sign-out local-data cleanup.
 *
 * Verifies clearUserLocalData() clears ONLY ephemeral E2EE session keys and
 * PRESERVES all user data (BYOK, memory fallback keys, persistent E2EE
 * salt/fingerprint, AIKey onboarding, AI access mode, session token).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
    _has: (k: string) => k in store,
  };
};
const lsMock = makeStorage();
const ssMock = makeStorage();

vi.stubGlobal("localStorage", lsMock);
vi.stubGlobal("sessionStorage", ssMock);

import { clearUserLocalData } from "@/lib/signOutCleanup";

describe("clearUserLocalData — ephemeral only", () => {
  beforeEach(() => { lsMock.clear(); ssMock.clear(); });
  afterEach(() => { lsMock.clear(); ssMock.clear(); });

  it("clears the UID-scoped E2EE session key + active flag", () => {
    ssMock.setItem("shadowtalk_e2e_key_alice", "raw-key");
    ssMock.setItem("shadowtalk_e2e_active_alice", "true");
    clearUserLocalData("alice");
    expect(ssMock.getItem("shadowtalk_e2e_key_alice")).toBeNull();
    expect(ssMock.getItem("shadowtalk_e2e_active_alice")).toBeNull();
  });

  it("clears the legacy device-global E2EE session keys (defense-in-depth)", () => {
    ssMock.setItem("shadowtalk_e2e_key", "legacy-raw-key");
    ssMock.setItem("shadowtalk_e2e_active", "true");
    clearUserLocalData("alice");
    expect(ssMock.getItem("shadowtalk_e2e_key")).toBeNull();
    expect(ssMock.getItem("shadowtalk_e2e_active")).toBeNull();
  });

  it("PRESERVES the persistent UID-scoped E2EE salt + fingerprint (recovery material)", () => {
    lsMock.setItem("shadowtalk_e2e_salt_alice", "alice-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint_alice", "alice-fp");
    clearUserLocalData("alice");
    expect(lsMock.getItem("shadowtalk_e2e_salt_alice")).toBe("alice-salt");
    expect(lsMock.getItem("shadowtalk_e2e_fingerprint_alice")).toBe("alice-fp");
  });

  it("PRESERVES the legacy device-global salt + fingerprint", () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint", "legacy-fp");
    clearUserLocalData("alice");
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBe("legacy-salt");
    expect(lsMock.getItem("shadowtalk_e2e_fingerprint")).toBe("legacy-fp");
  });

  it("PRESERVES BYOK config (shadowtalk.byok.v2.<uid>)", () => {
    lsMock.setItem("shadowtalk.byok.v2.alice", JSON.stringify({
      provider: "openai", apiKey: "sk-test", model: "gpt-4o-mini", mode: "always",
    }));
    clearUserLocalData("alice");
    expect(lsMock.getItem("shadowtalk.byok.v2.alice")).toBeTruthy();
    const cfg = JSON.parse(lsMock.getItem("shadowtalk.byok.v2.alice")!);
    expect(cfg.apiKey).toBe("sk-test");
    expect(cfg.provider).toBe("openai");
    expect(cfg.model).toBe("gpt-4o-mini");
  });

  it("PRESERVES AIKey onboarding (shadowtalk_ai_v2.<uid>.*)", () => {
    lsMock.setItem("shadowtalk_ai_v2.alice.cohort", "TECH");
    lsMock.setItem("shadowtalk_ai_v2.alice.api_key", "sk-test");
    lsMock.setItem("shadowtalk_ai_v2.alice.onboarded", "1");
    lsMock.setItem("shadowtalk_ai_v2.alice.daily_usage", '{"count":0,"date":"x"}');
    clearUserLocalData("alice");
    expect(lsMock.getItem("shadowtalk_ai_v2.alice.cohort")).toBe("TECH");
    expect(lsMock.getItem("shadowtalk_ai_v2.alice.api_key")).toBe("sk-test");
    expect(lsMock.getItem("shadowtalk_ai_v2.alice.onboarded")).toBe("1");
    expect(lsMock.getItem("shadowtalk_ai_v2.alice.daily_usage")).toBeTruthy();
  });

  it("PRESERVES AI access mode (shadowtalk.ai-access-mode.v1.<uid>)", () => {
    lsMock.setItem("shadowtalk.ai-access-mode.v1.alice", "byok");
    clearUserLocalData("alice");
    expect(lsMock.getItem("shadowtalk.ai-access-mode.v1.alice")).toBe("byok");
  });

  it("PRESERVES memory fallback keys (global, legacy)", () => {
    lsMock.setItem("shadowtalk_adaptive_memory_v2", "[]");
    lsMock.setItem("shadowtalk_memory_fallback", "[]");
    lsMock.setItem("shadowtalk_user_memories", "[]");
    clearUserLocalData("alice");
    expect(lsMock.getItem("shadowtalk_adaptive_memory_v2")).toBe("[]");
    expect(lsMock.getItem("shadowtalk_memory_fallback")).toBe("[]");
    expect(lsMock.getItem("shadowtalk_user_memories")).toBe("[]");
  });

  it("PRESERVES UI preferences and session token", () => {
    lsMock.setItem("shadowtalk_active_theme_id", "dark");
    lsMock.setItem("shadowtalk-language", "en");
    lsMock.setItem("shadowtalk_session_token", "device-token-123");
    clearUserLocalData("alice");
    expect(lsMock.getItem("shadowtalk_active_theme_id")).toBe("dark");
    expect(lsMock.getItem("shadowtalk-language")).toBe("en");
    expect(lsMock.getItem("shadowtalk_session_token")).toBe("device-token-123");
  });

  it("does NOT touch other accounts' namespaces", () => {
    ssMock.setItem("shadowtalk_e2e_key_bob", "bob-raw-key");
    ssMock.setItem("shadowtalk_e2e_active_bob", "true");
    lsMock.setItem("shadowtalk_e2e_salt_bob", "bob-salt");
    lsMock.setItem("shadowtalk.byok.v2.bob", JSON.stringify({ provider: "groq", apiKey: "gsk-bob", model: "x", mode: "fallback" }));
    clearUserLocalData("alice");
    expect(ssMock.getItem("shadowtalk_e2e_key_bob")).toBe("bob-raw-key");
    expect(lsMock.getItem("shadowtalk_e2e_salt_bob")).toBe("bob-salt");
    expect(lsMock.getItem("shadowtalk.byok.v2.bob")).toBeTruthy();
  });

  it("never throws when storage is unavailable (SSR / private mode)", () => {
    const origSs = (globalThis as any).sessionStorage;
    vi.stubGlobal("sessionStorage", {
      getItem: () => { throw new Error("unavailable"); },
      removeItem: () => { throw new Error("unavailable"); },
      setItem: () => { throw new Error("unavailable"); },
    });
    expect(() => clearUserLocalData("alice")).not.toThrow();
    vi.stubGlobal("sessionStorage", origSs);
  });
});
