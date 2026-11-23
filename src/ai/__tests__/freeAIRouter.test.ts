/**
 * FreeAIRouter — the zero-setup unified client router.
 *
 * Covers:
 *  - error classification (rate limit / auth / network / other / none);
 *  - route planning (cooldown filtering, same-provider same-key dedupe);
 *  - streamFreeChat failover: a 429 on one vault key falls through to the
 *    next provider within the same call, and the QuotaLedger remembers the
 *    cooldown so the NEXT message skips the blocked provider entirely;
 *  - the signed-in BYOK key always wins over vault keys;
 *  - partial answers (error WITH content) are surfaced as-is, never retried;
 *  - the on-device engine serves ordinary chat when the cloud tier is
 *    exhausted, but NEVER runs frontier tasks and NEVER starts a cold
 *    model download from inside a request;
 *  - the honest needsSetup result when every route is exhausted;
 *  - caller aborts propagate untouched.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: "uid-router-test" } }),
  functionsBaseUrl: "https://test.functions.example.com",
}));

const byokMock = vi.hoisted(() => ({
  config: null as null | { provider: string; apiKey: string; model: string; mode: "fallback" | "always" },
  streamByokChat: vi.fn(),
}));
vi.mock("@/lib/byok", () => ({
  getByokConfig: () => byokMock.config,
  saveByokConfig: vi.fn(),
  clearByokConfig: vi.fn(),
  streamByokChat: byokMock.streamByokChat,
  BYOK_PROVIDERS: {},
}));

const engineMock = vi.hoisted(() => ({
  isLoaded: vi.fn(() => false),
  initialize: vi.fn(async () => true),
  generate: vi.fn(async () => ({
    content: "on-device reply",
    source: "local",
    modelUsed: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  })),
  getState: vi.fn(() => "idle" as const),
}));
vi.mock("@/offline/LocalInferenceEngine", () => ({
  localInferenceEngine: engineMock,
  waitForLocalEngineReady: vi.fn(async () => false),
}));

const modelManagerMock = vi.hoisted(() => ({
  isInstantModelReady: vi.fn(async () => false),
  findCachedLocalModelId: vi.fn(async () => null as string | null),
}));
vi.mock("@/services/modelManager", () => ({
  isInstantModelReady: modelManagerMock.isInstantModelReady,
  findCachedLocalModelId: modelManagerMock.findCachedLocalModelId,
}));

import { saveVaultKey, __resetKeyVaultForTests, orderedVaultEntries, type VaultEntry } from "@/lib/keyVault";
import { __resetQuotaLedgerForTests, isProviderBlocked } from "@/lib/quotaLedger";
import type { ByokConfig } from "@/lib/byok";
import {
  classifyProviderError,
  planFreeRoutes,
  streamFreeChat,
  ZERO_SETUP_GUIDANCE,
} from "@/ai/FreeAIRouter";

const chat = (content = "hello there") => [{ role: "user" as const, content }];

function byokResult(provider: string, overrides: Record<string, unknown> = {}) {
  return { content: `cloud reply via ${provider}`, source: "byok", provider, ...overrides };
}

describe("classifyProviderError", () => {
  it("detects rate limiting", () => {
    expect(classifyProviderError("Groq rate limit or quota reached on your key.")).toBe("rate_limited");
    expect(classifyProviderError("Provider error (429): too many requests")).toBe("rate_limited");
    expect(classifyProviderError("daily quota exceeded")).toBe("rate_limited");
  });
  it("detects auth failures", () => {
    expect(classifyProviderError("Your Anthropic key was rejected.")).toBe("auth");
    expect(classifyProviderError("Provider error (401)")).toBe("auth");
    expect(classifyProviderError("Incorrect API key provided")).toBe("auth");
  });
  it("detects network failures", () => {
    expect(classifyProviderError("Could not reach Groq.")).toBe("network");
    expect(classifyProviderError("Failed to fetch")).toBe("network");
  });
  it("returns null without an error and 'other' for unknown failures", () => {
    expect(classifyProviderError(undefined)).toBeNull();
    expect(classifyProviderError("")).toBeNull();
    expect(classifyProviderError("Something exploded")).toBe("other");
  });
});

describe("planFreeRoutes", () => {
  const byok: ByokConfig = { provider: "groq", apiKey: "gsk_byok", model: "", mode: "always" };

  it("filters cooldown-blocked providers", () => {
    const vault: VaultEntry[] = [
      { provider: "gemini", apiKey: "AIza_1", addedAt: "t1" },
      { provider: "groq", apiKey: "gsk_1", addedAt: "t2" },
    ];
    const plan = planFreeRoutes(null, vault, new Set(["groq"]));
    expect(plan.vault.map((v) => v.provider)).toEqual(["gemini"]);
  });

  it("dedupes a vault entry identical to the BYOK route but keeps a second key", () => {
    const vault: VaultEntry[] = [
      { provider: "groq", apiKey: "gsk_byok", addedAt: "t1" }, // same provider + key as BYOK
      { provider: "groq", apiKey: "gsk_second", addedAt: "t2" }, // second key = real failover
    ];
    const plan = planFreeRoutes(byok, vault);
    expect(plan.vault.map((v) => v.apiKey)).toEqual(["gsk_second"]);
    // Without a BYOK config both keys are kept.
    expect(planFreeRoutes(null, vault).vault).toHaveLength(2);
  });
});

describe("streamFreeChat", () => {
  beforeEach(() => {
    __resetKeyVaultForTests();
    __resetQuotaLedgerForTests();
    byokMock.config = null;
    byokMock.streamByokChat.mockReset();
    engineMock.isLoaded.mockReturnValue(false);
    engineMock.initialize.mockClear();
    engineMock.generate.mockClear();
    modelManagerMock.isInstantModelReady.mockResolvedValue(false);
    modelManagerMock.findCachedLocalModelId.mockResolvedValue(null);
  });

  it("returns the honest needsSetup result when no route exists", async () => {
    const result = await streamFreeChat(chat());
    expect(result.content).toBe("");
    expect(result.needsSetup).toBe(true);
    expect(result.source).toBe("free");
    expect(result.error).toContain("on-device");
    expect(result.error).toContain("free");
    expect(byokMock.streamByokChat).not.toHaveBeenCalled();
  });

  it("routes through a vault key and labels the reply as a free-tier reply", async () => {
    saveVaultKey("gemini", "AIza_router_test_1");
    byokMock.streamByokChat.mockResolvedValue(byokResult("gemini"));
    const result = await streamFreeChat(chat());
    expect(result.content).toBe("cloud reply via gemini");
    expect(result.source).toBe("free");
    expect(result.provider).toBe("gemini");
    expect(byokMock.streamByokChat).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "gemini", apiKey: "AIza_router_test_1" }),
      chat(),
      {},
    );
  });

  it("fails over to the next vault provider on a 429 and records the cooldown", async () => {
    saveVaultKey("gemini", "AIza_limited_1");
    saveVaultKey("groq", "gsk_backup_1");
    byokMock.streamByokChat.mockImplementation(async (cfg: { provider: string }) => {
      if (cfg.provider === "gemini") return byokResult("gemini", { content: "", error: "Gemini rate limit reached (429)." });
      return byokResult("groq");
    });
    const result = await streamFreeChat(chat());
    expect(result.provider).toBe("groq");
    expect(result.source).toBe("free");
    expect(byokMock.streamByokChat).toHaveBeenCalledTimes(2);
    expect(isProviderBlocked("gemini")).toBe(true);
    expect(isProviderBlocked("groq")).toBe(false);
  });

  it("skips a provider that is already inside its cooldown on the next message", async () => {
    saveVaultKey("gemini", "AIza_limited_2");
    // Simulate the previous message that hit the 429.
    byokMock.streamByokChat.mockResolvedValueOnce(byokResult("gemini", { content: "", error: "429 rate limit" }));
    await streamFreeChat(chat());
    byokMock.streamByokChat.mockClear();
    const result = await streamFreeChat(chat());
    // Gemini is blocked → no provider call at all → needsSetup (no local model).
    expect(byokMock.streamByokChat).not.toHaveBeenCalled();
    expect(result.needsSetup).toBe(true);
  });

  it("fails over on an auth failure and cools the rejected key down for longer", async () => {
    saveVaultKey("openrouter", "sk-or-rejected_1");
    saveVaultKey("cerebras", "csk_backup_1");
    byokMock.streamByokChat.mockImplementation(async (cfg: { provider: string }) => {
      if (cfg.provider === "openrouter") return byokResult("openrouter", { content: "", error: "Your OpenRouter key was rejected (401)." });
      return byokResult("cerebras");
    });
    const result = await streamFreeChat(chat());
    expect(result.provider).toBe("cerebras");
    expect(isProviderBlocked("openrouter")).toBe(true);
    // Auth cooldown (10 min) outlasts the rate-limit cooldown (1 min).
    expect(isProviderBlocked("openrouter", new Date(Date.now() + 2 * 60_000))).toBe(true);
  });

  it("stops on an unknown provider error instead of masking it", async () => {
    saveVaultKey("mistral", "mistral_key_12345");
    byokMock.streamByokChat.mockResolvedValue(byokResult("mistral", { content: "", error: "Mistral exploded mysteriously" }));
    const result = await streamFreeChat(chat());
    expect(result.error).toBe("Mistral exploded mysteriously");
    expect(result.needsSetup).toBeUndefined();
    expect(byokMock.streamByokChat).toHaveBeenCalledTimes(1);
  });

  it("surfaces a partial answer (error WITH content) without failover", async () => {
    saveVaultKey("groq", "gsk_partial_1");
    saveVaultKey("gemini", "AIza_backup_1");
    byokMock.streamByokChat.mockResolvedValue(byokResult("groq", { content: "partial reply", error: "The reply was cut off mid-stream." }));
    const result = await streamFreeChat(chat());
    expect(result.content).toBe("partial reply");
    expect(result.error).toBe("The reply was cut off mid-stream.");
    expect(byokMock.streamByokChat).toHaveBeenCalledTimes(1);
  });

  it("prefers the signed-in BYOK key over vault keys", async () => {
    byokMock.config = { provider: "openai", apiKey: "sk_account_key", model: "gpt-4o-mini", mode: "always" };
    saveVaultKey("gemini", "AIza_vault_key_1");
    byokMock.streamByokChat.mockResolvedValue(byokResult("openai"));
    const result = await streamFreeChat(chat());
    expect(result.provider).toBe("openai");
    expect(result.source).toBe("byok");
    const firstCallCfg = byokMock.streamByokChat.mock.calls[0][0] as { apiKey: string };
    expect(firstCallCfg.apiKey).toBe("sk_account_key");
  });

  it("fails over from the BYOK key to vault keys when the account key is rate-limited", async () => {
    byokMock.config = { provider: "openai", apiKey: "sk_account_limited", model: "", mode: "always" };
    saveVaultKey("groq", "gsk_vault_backup_1");
    byokMock.streamByokChat.mockImplementation(async (cfg: { provider: string; apiKey: string }) => {
      if (cfg.apiKey === "sk_account_limited") return byokResult("openai", { content: "", error: "OpenAI rate limit (429)." });
      return byokResult("groq");
    });
    const result = await streamFreeChat(chat());
    expect(result.provider).toBe("groq");
    expect(result.source).toBe("free");
    expect(isProviderBlocked("openai")).toBe(true);
  });

  it("uses the loaded on-device engine after cloud routes are exhausted", async () => {
    engineMock.isLoaded.mockReturnValue(true);
    const result = await streamFreeChat(chat("hi"));
    expect(result.content).toBe("on-device reply");
    expect(result.source).toBe("local");
    expect(byokMock.streamByokChat).not.toHaveBeenCalled();
  });

  it("brings the engine up on demand when weights are already cached", async () => {
    modelManagerMock.findCachedLocalModelId.mockResolvedValue("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
    const result = await streamFreeChat(chat("hi"));
    expect(engineMock.initialize).toHaveBeenCalledTimes(1);
    // The warm-up loads the model that is ACTUALLY cached, not the tier pick.
    expect(engineMock.initialize).toHaveBeenCalledWith(undefined, "Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
    expect(result.source).toBe("local");
  });

  it("falls back to the CACHED on-device engine when OFFLINE (regression)", async () => {
    // The old `navigator.onLine !== false` gate dead-ended every keyless
    // offline visitor with setup guidance while the weights sat on disk —
    // the exact scenario offline mode exists for. A warm-up needs no
    // network (cache hits), so it must run offline too.
    const prevNavigator = globalThis.navigator;
    vi.stubGlobal("navigator", { userAgent: prevNavigator?.userAgent ?? "test-agent", onLine: false });
    try {
      saveVaultKey("groq", "gsk_offline_1");
      // The cloud route fails the way it does offline — fast and opaque.
      byokMock.streamByokChat.mockRejectedValue(new TypeError("Failed to fetch"));
      modelManagerMock.findCachedLocalModelId.mockResolvedValue("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
      engineMock.initialize.mockResolvedValue(true);
      const result = await streamFreeChat(chat("hi"));
      expect(engineMock.initialize).toHaveBeenCalledTimes(1);
      expect(engineMock.generate).toHaveBeenCalledTimes(1);
      expect(result.content).toBe("on-device reply");
      expect(result.source).toBe("local");
      expect(result.needsSetup).toBeUndefined();
    } finally {
      vi.stubGlobal("navigator", prevNavigator);
    }
  });

  it("still refuses to warm the engine OFFLINE when nothing is cached", async () => {
    // Cache-gated, not network-gated — and with no cache there is nothing to
    // warm: no cold download may ever start from inside a request.
    const prevNavigator = globalThis.navigator;
    vi.stubGlobal("navigator", { userAgent: prevNavigator?.userAgent ?? "test-agent", onLine: false });
    try {
      modelManagerMock.findCachedLocalModelId.mockResolvedValue(null);
      const result = await streamFreeChat(chat("hi"));
      expect(engineMock.initialize).not.toHaveBeenCalled();
      expect(result.needsSetup).toBe(true);
    } finally {
      vi.stubGlobal("navigator", prevNavigator);
    }
  });

  it("never starts a cold model download from inside a request", async () => {
    modelManagerMock.findCachedLocalModelId.mockResolvedValue(null);
    const result = await streamFreeChat(chat("hi"));
    expect(engineMock.initialize).not.toHaveBeenCalled();
    expect(result.needsSetup).toBe(true);
  });

  it("never routes frontier tasks (vision / web / structured) to the on-device engine", async () => {
    engineMock.isLoaded.mockReturnValue(true);
    const result = await streamFreeChat([{ role: "user" as const, content: "what is this?", image: "data:image/png;base64,x" }]);
    expect(result.needsSetup).toBe(true);
    expect(engineMock.generate).not.toHaveBeenCalled();
    const structured = await streamFreeChat(chat("hi"), { structuredOutput: true });
    expect(structured.needsSetup).toBe(true);
    const web = await streamFreeChat(chat("hi"), { webSearch: true });
    expect(web.needsSetup).toBe(true);
    expect(engineMock.generate).not.toHaveBeenCalled();
  });

  it("appends the last provider error to the needsSetup guidance for transparency", async () => {
    saveVaultKey("gemini", "AIza_dead_1");
    // A rate-limited key exhausts the route list (failover class), so the
    // guidance result carries the underlying 429 for transparency. Unknown
    // ("other") errors intentionally surface raw instead — see the
    // "stops on an unknown provider error" test.
    byokMock.streamByokChat.mockResolvedValue(byokResult("gemini", { content: "", error: "Gemini rate limit (429)" }));
    const result = await streamFreeChat(chat());
    expect(result.needsSetup).toBe(true);
    expect(result.error).toContain(ZERO_SETUP_GUIDANCE.slice(0, 40));
    expect(result.error).toContain("Gemini rate limit (429)");
  });

  it("propagates caller aborts untouched", async () => {
    saveVaultKey("groq", "gsk_abort_1");
    const abort = new DOMException("The user aborted.", "AbortError");
    byokMock.streamByokChat.mockRejectedValue(abort);
    await expect(streamFreeChat(chat(), { signal: new AbortController().signal })).rejects.toBe(abort);
  });

  it("orders vault failover gemini → groq → openrouter regardless of insertion order", async () => {
    saveVaultKey("openrouter", "sk-or-order_3");
    saveVaultKey("groq", "gsk-order_2");
    saveVaultKey("gemini", "AIza-order_1");
    expect(orderedVaultEntries().map((e) => e.provider)).toEqual(["gemini", "groq", "openrouter"]);
    // All three fail → needsSetup after exactly three attempts.
    byokMock.streamByokChat.mockResolvedValue({ content: "", error: "429 rate limit" });
    const result = await streamFreeChat(chat());
    expect(byokMock.streamByokChat).toHaveBeenCalledTimes(3);
    expect(result.needsSetup).toBe(true);
  });
});
