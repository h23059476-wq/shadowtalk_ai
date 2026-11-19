/**
 * Private-by-default hybrid routing.
 *
 * Verifies streamCloudChat's on-device-first behavior:
 *  - ordinary chat runs on the local engine when prefer-local is set and the
 *    engine is loaded (nothing escalates), with payloads context-fitted for
 *    the engine's small window;
 *  - greetings / small talk NEVER escalate — a plain "hi" always gets an
 *    on-device reply, even when the app-generated system prompt alone blows
 *    the local context budget (regression for the "Message failed" bug);
 *  - hard frontier tasks (explicit cloud model, web search/fetch, structured
 *    output, vision input) escalate to the BYOK key when present, else
 *    return the clear "add your API key" escalation error;
 *  - size-only overflows degrade to a context-fitted local run instead of
 *    dead-ending keyless users;
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
  // Engine lifecycle — streamCloudChat waits on an in-flight init before it
  // falls through to cloud, so the mock has to answer lifecycle questions.
  getState: vi.fn(() => "idle" as const),
  prewarm: vi.fn(async () => true),
  waitForLocalEngineReady: vi.fn(async () => false),
  generate: vi.fn(async () => ({
    content: "local reply from the on-device model",
    source: "local",
    modelUsed: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  })),
}));
vi.mock("@/offline/LocalInferenceEngine", () => ({
  localInferenceEngine: engineMock,
  waitForLocalEngineReady: engineMock.waitForLocalEngineReady,
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

// The keyless dead-end now routes through the FreeAIRouter, whose on-device
// fallback consults modelManager for cached weights. Pin it to "not ready"
// so these tests never depend on real Cache API state in the test DOM.
vi.mock("@/services/modelManager", () => ({
  isInstantModelReady: vi.fn(async () => false),
}));

import {
  streamCloudChat,
  shouldEscalateToCloud,
  isTrivialChitChat,
  hasFrontierTrigger,
  fitMessagesToLocal,
  LOCAL_INPUT_CHAR_BUDGET,
  type CloudChatMessage,
} from "@/lib/cloudChat";
import { setPreferLocal } from "@/lib/aiAccessMode";
import {
  pickLocalModelForDevice,
  STARTER_LOCAL_MODEL,
  LOCAL_MODEL_TIERS,
  DEFAULT_LOCAL_MODEL,
  DEFAULT_LOCAL_MODEL_F32,
  LOW_TIER_LOCAL_MODEL,
  SMOLLM2_1_7B_LOCAL_MODEL,
  QWEN25_3B_LOCAL_MODEL,
  HIGH_TIER_LOCAL_MODEL,
  CODER_3B_LOCAL_MODEL,
  CODER_1_5B_LOCAL_MODEL,
} from "@/ai/ModelRegistry";

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

  it("never escalates greetings — even when the system prompt alone blows the budget", () => {
    // Regression: the app-generated persona prompt (~8k chars) used to push
    // a plain "hi" over the local context limit → "Message failed" for
    // keyless free users. Greetings must always stay on-device.
    const hugeSystem: CloudChatMessage = { role: "system", content: "You are ShadowTalk. ".repeat(400) };
    expect(shouldEscalateToCloud([hugeSystem, chat("hi")])).toBe(false);
    expect(shouldEscalateToCloud([hugeSystem, chat("hello there!")])).toBe(false);
    expect(shouldEscalateToCloud([hugeSystem, chat("thanks a lot!!")])).toBe(false);
  });
});

describe("isTrivialChitChat — greeting detection", () => {
  it("matches greetings, thanks, acknowledgments, farewells", () => {
    for (const t of ["hi", "Hi!!", "hey", "hello", "yo", "gm", "good morning", "How are you?", "how's it going", "what's up", "thanks", "Thank you so much!", "ok", "okay", "cool", "nice", "great", "lol", "bye", "see ya", "good night"]) {
      expect(isTrivialChitChat([chat(t)])).toBe(true);
    }
  });

  it("does not match real requests or word-prefix traps", () => {
    for (const t of ["hire me", "hi can you help me", "generate an image of a cat", "summarize this document", "what is ShadowTalk?", "hi there, I need a business plan", ""]) {
      expect(isTrivialChitChat([chat(t)])).toBe(false);
    }
  });

  it("only inspects the newest user turn", () => {
    const msgs: CloudChatMessage[] = [
      chat("summarize the quarterly report"),
      { role: "assistant", content: "Sure — here is the summary..." },
      chat("thanks"),
    ];
    expect(isTrivialChitChat(msgs)).toBe(true);
  });

  it("an image turn is never trivial chit-chat", () => {
    expect(isTrivialChitChat([{ role: "user", content: "hi", image: "data:image/png;base64,x" }])).toBe(false);
    expect(hasFrontierTrigger([{ role: "user", content: "hi", image: "data:image/png;base64,x" }])).toBe(true);
  });
});

describe("fitMessagesToLocal — context fitting for the on-device engine", () => {
  it("keeps the newest user message verbatim and drops oldest history first", () => {
    const msgs: CloudChatMessage[] = [
      { role: "system", content: "short system prompt" },
      chat("old message 1 ".repeat(400)),
      chat("old message 2 ".repeat(400)),
      { role: "assistant", content: "recent assistant reply" },
      chat("the newest user message that must survive"),
    ];
    const fitted = fitMessagesToLocal(msgs, 8000);
    const last = fitted[fitted.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toBe("the newest user message that must survive");
    // oldest dropped, newest kept, order preserved
    const texts = fitted.map((m) => String(m.content));
    expect(texts.some((t) => t.includes("old message 1"))).toBe(false);
    expect(texts.some((t) => t.includes("recent assistant reply"))).toBe(true);
  });

  it("truncates the system prompt at a line boundary with an ellipsis marker", () => {
    const bigSystem: CloudChatMessage = {
      role: "system",
      content: Array.from({ length: 300 }, (_, i) => `persona line ${i} with some padding text`).join("\n"),
    };
    const fitted = fitMessagesToLocal([bigSystem, chat("hi")]);
    const sys = fitted[0];
    // System cap (1000) + ellipsis marker — the cap shrank from 2000 so the
    // fitted prompt leaves output room inside the 2048-token engine window.
    expect(String(sys.content).length).toBeLessThanOrEqual(1100);
    expect(String(sys.content).endsWith("[...]")).toBe(true);
    expect(String(sys.content).startsWith("persona line 0")).toBe(true);
  });

  it("default budget leaves room for the reply inside the engine window", () => {
    // The old default (8000 chars ≈ the whole 2048-token window) starved the
    // output: replies were cut mid-sentence. The default must now derive
    // from window − output reserve, so the fitted payload stays under it.
    const msgs: CloudChatMessage[] = [
      { role: "system", content: Array.from({ length: 200 }, (_, i) => `persona line ${i} with padding`).join("\n") },
      chat("old big turn ".repeat(300)),
      chat("old big turn 2 ".repeat(300)),
      chat("newest survives verbatim"),
    ];
    const fitted = fitMessagesToLocal(msgs); // default budget
    const total = fitted.reduce((n, m) => n + String(m.content).length, 0);
    expect(total).toBeLessThanOrEqual(LOCAL_INPUT_CHAR_BUDGET);
    const last = fitted[fitted.length - 1];
    expect(last.content).toBe("newest survives verbatim");
  });

  it("strips image parts (local models cannot do vision) and fits within budget", () => {
    const msgs: CloudChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: [{ type: "text", text: "what is in this picture?" }, { type: "image_url", image_url: { url: "data:image/png;base64,x" } }], image: "data:image/png;base64,x" },
      { role: "assistant", content: "a cat" },
      chat("ok thanks"),
    ];
    const fitted = fitMessagesToLocal(msgs, 8000);
    for (const m of fitted) {
      expect(m.image).toBeUndefined();
      if (Array.isArray(m.content)) {
        expect(m.content.some((p) => p.type === "image_url")).toBe(false);
      }
    }
    const total = fitted.reduce((n, m) => n + String(m.content).length, 0);
    expect(total).toBeLessThanOrEqual(8000);
  });

  it("never returns an empty conversation — newest message is kept even when it alone overflows", () => {
    const msgs: CloudChatMessage[] = [
      { role: "system", content: "sys" },
      chat("y".repeat(9000)),
    ];
    const fitted = fitMessagesToLocal(msgs, 8000);
    const convo = fitted.filter((m) => m.role !== "system");
    expect(convo.length).toBe(1);
    expect(String(convo[0].content).length).toBeGreaterThan(0);
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

  it("degrades size-only escalation to a context-fitted local run instead of failing", async () => {
    // Regression for the "Message failed" bug: a huge persona system prompt
    // + a plain "hi" used to escalate and hard-fail for keyless users.
    setPreferLocal("uid-alice", true);
    const hugeSystem: CloudChatMessage = { role: "system", content: "You are ShadowTalk. ".repeat(400) };
    const result = await streamCloudChat([hugeSystem, chat("hi")]);
    expect(engineMock.generate).toHaveBeenCalledTimes(1);
    expect(result.error).toBeUndefined();
    expect(result.source).toBe("local");
    expect(result.content).toBe("local reply from the on-device model");
    // the engine received a fitted payload, not the oversized original
    const arg = (engineMock.generate.mock.calls as unknown as [CloudChatMessage[]][])[0][0];
    const total = arg.reduce((n, m) => n + String(m.content).length, 0);
    expect(total).toBeLessThanOrEqual(8000);
    expect(String(arg[arg.length - 1].content)).toBe("hi");
  });

  it("never calls the shared function for keyless local-first escalation", async () => {
    setPreferLocal("uid-alice", true);
    const result = await streamCloudChat([chat("hi")], { webSearch: true });
    expect(result.error).toContain("frontier model");
  });

  it("falls through to the free-AI router when the engine is not loaded", async () => {
    setPreferLocal("uid-alice", true);
    engineMock.isLoaded.mockReturnValue(false);
    const result = await streamCloudChat([chat("Hello")]);
    expect(engineMock.generate).not.toHaveBeenCalled();
    // No key + no cached mode + no vault → the zero-setup guidance result
    // (the chat UI renders the recovery card for needsSetup).
    expect(result.needsSetup).toBe(true);
    expect(result.error).toContain("on-device");
  });

  it("serves keyless visitors from the loaded on-device engine when prefer-local is off", async () => {
    setPreferLocal("uid-alice", false);
    const result = await streamCloudChat([chat("Hello")]);
    // The free-AI router's final route IS the on-device engine: a keyless
    // visitor with the engine loaded still gets a private reply instead of
    // the old "add your API key" dead end.
    expect(engineMock.generate).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("local");
    expect(result.content).toBe("local reply from the on-device model");
  });
});

describe("pickLocalModelForDevice — instant-default policy (tiered model manager)", () => {
  it("returns the universal 1B instant default for normal devices", () => {
    for (const memory of [undefined, 4, 8, 16]) {
      expect(pickLocalModelForDevice(memory, false).id).toBe(STARTER_LOCAL_MODEL.id);
    }
    expect(pickLocalModelForDevice(8, true).id).toBe(STARTER_LOCAL_MODEL.id);
  });

  it("drops to the 0.5B ultra-light safety net on ≤2GB devices", () => {
    expect(pickLocalModelForDevice(2, true).id).toBe(LOW_TIER_LOCAL_MODEL.id);
    expect(pickLocalModelForDevice(1, false).id).toBe(LOW_TIER_LOCAL_MODEL.id);
  });

  it("starter is the instant default (Llama-3.2-1B); tiers ordered smallest → largest", () => {
    expect(STARTER_LOCAL_MODEL.id).toBe(DEFAULT_LOCAL_MODEL.id);
    expect(STARTER_LOCAL_MODEL.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(LOCAL_MODEL_TIERS.map((m) => m.id)).toEqual([
      LOW_TIER_LOCAL_MODEL.id,
      DEFAULT_LOCAL_MODEL.id,
      CODER_1_5B_LOCAL_MODEL.id,
      SMOLLM2_1_7B_LOCAL_MODEL.id,
      HIGH_TIER_LOCAL_MODEL.id,
      QWEN25_3B_LOCAL_MODEL.id,
      CODER_3B_LOCAL_MODEL.id,
    ]);
    const sizes = LOCAL_MODEL_TIERS.map((m) => m.approxStorageRequirementMB);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
  });

  it("instant default matches the ~880MB–1.1GB budget (f16 vs f32 twin)", () => {
    expect(STARTER_LOCAL_MODEL.approxStorageRequirementMB).toBeGreaterThanOrEqual(800);
    expect(STARTER_LOCAL_MODEL.approxStorageRequirementMB).toBeLessThanOrEqual(900);
    expect(DEFAULT_LOCAL_MODEL_F32.approxStorageRequirementMB).toBeLessThanOrEqual(1200);
    expect(HIGH_TIER_LOCAL_MODEL.approxStorageRequirementMB).toBeGreaterThan(
      STARTER_LOCAL_MODEL.approxStorageRequirementMB,
    );
  });
});
