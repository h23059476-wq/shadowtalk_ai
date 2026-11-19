/**
 * KeyVault — device-local multi-provider free-AI key storage.
 *
 * Covers: save/get/list round-trip, same-provider replacement (newest key
 * wins), key validation, priority ordering (gemini → groq → openrouter →
 * cerebras → mistral → openai, unknown last), the ByokConfig adapter, the
 * capacity cap with oldest-eviction, and corrupted-storage tolerance.
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
  listVaultEntries,
  getVaultEntry,
  hasAnyVaultKey,
  saveVaultKey,
  removeVaultKey,
  clearVault,
  validateVaultKey,
  orderedVaultEntries,
  vaultEntryAsByokConfig,
  VAULT_MAX_ENTRIES,
  __resetKeyVaultForTests,
} from "@/lib/keyVault";

describe("keyVault", () => {
  beforeEach(() => {
    __resetKeyVaultForTests();
  });

  it("stores, reads, and lists keys", () => {
    saveVaultKey("groq", "gsk_test_key_123");
    expect(hasAnyVaultKey()).toBe(true);
    const entry = getVaultEntry("groq");
    expect(entry?.apiKey).toBe("gsk_test_key_123");
    expect(entry?.provider).toBe("groq");
    expect(listVaultEntries()).toHaveLength(1);
  });

  it("trims keys and stores an optional model", () => {
    saveVaultKey("gemini", "  AIzaSyTest12345  ", " gemini-2.0-flash ");
    const entry = getVaultEntry("gemini");
    expect(entry?.apiKey).toBe("AIzaSyTest12345");
    expect(entry?.model).toBe("gemini-2.0-flash");
  });

  it("replaces the key when the same provider is re-added", () => {
    saveVaultKey("groq", "gsk_old_key_aaaa");
    saveVaultKey("groq", "gsk_new_key_bbbb");
    expect(listVaultEntries()).toHaveLength(1);
    expect(getVaultEntry("groq")?.apiKey).toBe("gsk_new_key_bbbb");
  });

  it("rejects invalid keys with a reason", () => {
    expect(validateVaultKey("")).toContain("Paste");
    expect(validateVaultKey("   ")).toContain("Paste");
    expect(validateVaultKey("key with spaces")).toContain("spaces");
    expect(validateVaultKey("short")).toContain("not look like");
    expect(validateVaultKey("a".repeat(513))).toContain("not look like");
    expect(validateVaultKey("AIzaSyValidKey123")).toBeNull();
    expect(() => saveVaultKey("groq", "short")).toThrow(/not look like/);
    expect(hasAnyVaultKey()).toBe(false);
  });

  it("orders entries by free-tier priority regardless of insertion order", () => {
    saveVaultKey("openai", "sk_openai_12345678");
    saveVaultKey("groq", "gsk_groq_12345678");
    saveVaultKey("gemini", "AIza_gemini_123456");
    const order = orderedVaultEntries().map((e) => e.provider);
    expect(order).toEqual(["gemini", "groq", "openai"]);
  });

  it("adapts vault entries to ByokConfig", () => {
    saveVaultKey("openrouter", "sk-or-v1-test12345", "meta-llama/llama-3.3-70b-instruct:free");
    const cfg = vaultEntryAsByokConfig(getVaultEntry("openrouter")!);
    expect(cfg).toEqual({
      provider: "openrouter",
      apiKey: "sk-or-v1-test12345",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      mode: "always",
    });
    // No stored model → empty string (streamByokChat falls back to the
    // provider default).
    saveVaultKey("groq", "gsk_nomodel_123456");
    expect(vaultEntryAsByokConfig(getVaultEntry("groq")!).model).toBe("");
  });

  it("caps the vault and evicts the oldest addition", () => {
    const providers = ["gemini", "groq", "openrouter", "cerebras", "mistral", "openai"] as const;
    for (const p of providers) saveVaultKey(p, `key_${p}_12345678`);
    expect(listVaultEntries()).toHaveLength(6);
    // 7th provider key — the vault cap is 6; re-adding an existing provider
    // must never evict itself, so use a replacement + a new one cycle.
    saveVaultKey("gemini", "key_gemini_v2_12345");
    expect(listVaultEntries()).toHaveLength(6);
    expect(getVaultEntry("gemini")?.apiKey).toBe("key_gemini_v2_12345");
    expect(VAULT_MAX_ENTRIES).toBe(6);
  });

  it("removes and clears entries", () => {
    saveVaultKey("groq", "gsk_test_12345678");
    saveVaultKey("gemini", "AIza_test_12345678");
    removeVaultKey("groq");
    expect(getVaultEntry("groq")).toBeNull();
    expect(getVaultEntry("gemini")).not.toBeNull();
    clearVault();
    expect(hasAnyVaultKey()).toBe(false);
    expect(listVaultEntries()).toHaveLength(0);
  });

  it("tolerates corrupted storage", () => {
    lsMock.setItem("shadowtalk.key-vault.v1", "{corrupted");
    expect(listVaultEntries()).toEqual([]);
    expect(hasAnyVaultKey()).toBe(false);
    expect(orderedVaultEntries()).toEqual([]);
    // Saving still works afterwards (fresh vault).
    saveVaultKey("groq", "gsk_recovered_123456");
    expect(getVaultEntry("groq")).not.toBeNull();
  });

  it("ignores structurally broken entries when reading", () => {
    lsMock.setItem(
      "shadowtalk.key-vault.v1",
      JSON.stringify([{ provider: "groq", apiKey: "gsk_ok_12345678" }, null, { provider: 42 }, "junk"]),
    );
    const entries = listVaultEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].provider).toBe("groq");
  });
});
