/**
 * Private-by-default hybrid routing.
 *
 * Verifies streamCloudChat's on-device-first behavior:
 *  - ordinary chat runs on the local engine when prefer-local is set and the
 *    engine is loaded (nothing escalates);
 *  - requests that outgrow the on-device model (explicit cloud model, web
 *    search/fetch, structured output, vision input, oversized payloads)
 *    escalate to the BYOK key when present, else return the clear
 *    "add your API key" escalation error — never a silent dead-end;
 *  - prefer-local with a not-yet-loaded engine falls through to the standard
 *    mode logic unchanged.
 *
 * Also covers the ModelRegistry device-tier picker.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

const authMock = vi.hoisted(() => ({ uid: "uid-alice" as string | null }));
vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: authMock.uid } }),
  functionsBaseUrl: "https://test.functions.example.com",
}));

const engineMock = vi.hoisted(() => ({
  isLoaded: vi.fn(() => true),
  generate: vi.fn(async () => ({
    content: "local reply from the on-device model",
    source: "local",
    modelUsed: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  })),
}));
vi.mock("@/offline/LocalInferenceEngine", () => ({
  localInferenceEngine: engineMock,
}));

const byokMock = vi.hoisted(() => ({
  config: null as null | { provider: string; apiKey: string; model: string; mode: "always" },
  streamByokChat: vi.fn(async () => ({
    content: "cloud reply via the user's key",
    source: "byok",
    provider: "openrouter",
  })),
}));
vi.mock("@/lib/byok", () => ({
  getByokConfig: () => byokMock.config,
  saveByokConfig: () => {},
  streamByokChat: byokMock.streamByokChat,
}));

import { streamCloudChat, shouldEscalateToCloud, type CloudChatMessage } from "@/lib/cloudChat";
import { setPreferLocal } from "@/lib/aiAccessMode";
import { pickLocalModelForDevice, DEFAULT_LOCAL_MODEL, LOW_TIER_LOCAL_MODEL, HIGH_TIER_LOCAL_MODEL } from "@/ai/ModelRegistry";

const chat = (content: string): CloudChatMessage => ({ role: "user", content });

describe("shouldEscalateToCloud — heavy-task detection", () => {
  it("keeps ordinary small chat on-device", () => {
    expect(shouldEscalateToCloud([chat("Hi, how are you?")])).toBe(false);
  });

  it("escalates on explicit model selection, web search, structured output, and vision", () => {
    expect(shouldEscalateToCloud([chat("hi")], { model: "openai/gpt-4o" })).toBe(true);
    expect(shouldEscalateToCloud([chat("hi")], { webSearch: true })).toBe(true);
    expect(shouldEscalateToCloud([chat("hi")], { webFetch: true })).toBe(true);
    expect(shouldEscalateToCloud([chat("hi")], { structuredOutput: true })).toBe(true);
    expect(shouldEscalateToCloud([{ role: "user", content: "what is this?", image: "data:image/png;base64,x" }])).toBe(true);
  });

  it("escalates when the payload exceeds the local context window", () => {
    const big = "x".repeat(8001);
    expect(shouldEscalateToCloud([chat(big)])).toBe(true);
    expect(shouldEscalateToCloud([chat("x".repeat(7999))])).toBe(false);
  });
});

describe("streamCloudChat — private-by-default routing", () => {
  beforeEach(() => {
    lsMock.clear();
    authMock.uid = "uid-alice";
    engineMock.isLoaded.mockReturnValue(true);
    engineMock.generate.mockClear();
    engineMock.generate.mockImplementation(async () => ({
      content: "local reply from the on-device model",
      source: "local",
      modelUsed: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    }));
    byokMock.config = null;
    byokMock.streamByokChat.mockClear();
  });
  afterEach(() => { lsMock.clear(); });

  it("routes ordinary chat to the on-device engine when provisioned", async () => {
    setPreferLocal("uid-alice", true);
    const result = await streamCloudChat([chat("Hello!")]);
    expect(engineMock.generate).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("local");
    expect(result.content).toBe("local reply from the on-device model");
  });

  it("escalates heavy tasks to the BYOK key when the user has one", async () => {
    setPreferLocal("uid-alice", true);
    // Escalation consults the cached access mode before reaching for the key.
    lsMock.setItem("shadowtalk.ai-access-mode.v1.uid-alice", "byok");
    byokMock.config = { provider: "openrouter", apiKey: "sk-or-test", model: "openai/gpt-4o-mini", mode: "always" };
    const result = await streamCloudChat([chat("hi")], { model: "openai/gpt-4o" });
    expect(engineMock.generate).not.toHaveBeenCalled();
    expect(byokMock.streamByokChat).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("byok");
  });

  it("returns the honest escalation error for keyless local-first users", async () => {
    setPreferLocal("uid-alice", true);
    const result = await streamCloudChat([{ role: "user", content: "summarize", image: "data:image/png;base64,x" }]);
    expect(engineMock.generate).not.toHaveBeenCalled();
    expect(result.source).toBe("local");
    expect(result.content).toBe("");
    expect(result.error).toContain("frontier model");
    expect(result.error).toContain("API key");
  });

  it("never calls the shared function for keyless local-first escalation", async () => {
    setPreferLocal("uid-alice", true);
    const result = await streamCloudChat([chat("hi")], { webSearch: true });
    expect(result.error).toContain("frontier model");
  });

  it("falls through to the standard mode logic when the engine is not loaded", async () => {
    setPreferLocal("uid-alice", true);
    engineMock.isLoaded.mockReturnValue(false);
    const result = await streamCloudChat([chat("Hello")]);
    expect(engineMock.generate).not.toHaveBeenCalled();
    // No key + no cached mode → the standard BYOK guidance error.
    expect(result.error).toContain("API key");
  });

  it("uses the standard mode logic when prefer-local is off", async () => {
    setPreferLocal("uid-alice", false);
    const result = await streamCloudChat([chat("Hello")]);
    expect(engineMock.generate).not.toHaveBeenCalled();
    expect(result.error).toContain("API key");
  });
});

describe("pickLocalModelForDevice — device-tier ladder", () => {
  it("picks the 3B Pro model for high-memory desktops", () => {
    expect(pickLocalModelForDevice(8, false).id).toBe(HIGH_TIER_LOCAL_MODEL.id);
    expect(pickLocalModelForDevice(16, false).id).toBe(HIGH_TIER_LOCAL_MODEL.id);
  });

  it("picks the 1B Lite model for mid-range desktops (and unknown memory)", () => {
    expect(pickLocalModelForDevice(4, false).id).toBe(DEFAULT_LOCAL_MODEL.id);
    expect(pickLocalModelForDevice(undefined, false).id).toBe(DEFAULT_LOCAL_MODEL.id);
  });

  it("picks the 0.5B Nano model for low-memory devices", () => {
    expect(pickLocalModelForDevice(1, false).id).toBe(LOW_TIER_LOCAL_MODEL.id);
    expect(pickLocalModelForDevice(2, false).id).toBe(DEFAULT_LOCAL_MODEL.id);
  });

  it("caps phones below the 3B model (thermal + shared memory)", () => {
    expect(pickLocalModelForDevice(8, true).id).toBe(DEFAULT_LOCAL_MODEL.id);
    expect(pickLocalModelForDevice(16, true).id).toBe(DEFAULT_LOCAL_MODEL.id);
    expect(pickLocalModelForDevice(2, true).id).toBe(LOW_TIER_LOCAL_MODEL.id);
  });
});
