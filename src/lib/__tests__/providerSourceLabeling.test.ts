/**
 * Batch 4 — provider-source labeling.
 *
 * Verifies that every AI-response producer sets `source` on the CloudChatResult
 * so the chat UI can render an accurate provider-source label. The label
 * surfaces provenance: BYOK (user's own key) vs Shared (Firebase Function) vs
 * Local (on-device web-llm) vs OmniRoute. No silent provider fallback — the
 * label always reflects which path actually produced the response.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

describe("provider-source labeling — source contract", () => {
  it("CloudChatResult declares source, modelUsed, and provider", () => {
    const src = read("src/lib/cloudChat.ts");
    expect(src).toMatch(/source\?\:\s*string/);
    expect(src).toMatch(/modelUsed\?\:\s*string/);
    expect(src).toMatch(/provider\?\:\s*string/);
  });

  it("streamBuiltInChat sets source='shared' on every return path", () => {
    const src = read("src/lib/cloudChat.ts");
    const matches = src.match(/source:\s*"shared"/g) || [];
    // Error path, empty-body path, streamError path, success path.
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("streamBuiltInChat captures X-Provider and X-Model response headers", () => {
    const src = read("src/lib/cloudChat.ts");
    expect(src).toMatch(/resp\.headers\?\.get\?\.\(\s*["']X-Provider["']\s*\)/);
    expect(src).toMatch(/resp\.headers\?\.get\?\.\(\s*["']X-Model["']\s*\)/);
  });

  it("LocalInferenceEngine.generate sets source='local' + modelUsed", () => {
    const src = read("src/offline/LocalInferenceEngine.ts");
    expect(src).toMatch(/source:\s*"local"/);
    expect(src).toMatch(/modelUsed:\s*DEFAULT_LOCAL_MODEL\.id/);
  });

  it("MessageBubble renders a provider-source label for AI messages", () => {
    const src = read("src/components/chat/MessageBubble.tsx");
    expect(src).toContain("formatSourceLabel");
    expect(src).toMatch(/message\.source/);
    expect(src).toContain('"byok"');
    expect(src).toContain('"shared"');
    expect(src).toContain('"local"');
    expect(src).toContain('"omniroute"');
  });

  it("ChatbotPage destructures source/modelUsed/provider from streamCloudChat result", () => {
    const src = read("src/pages/ChatbotPage.tsx");
    expect(src).toMatch(/source:\s*resultSource/);
    expect(src).toMatch(/modelUsed:\s*resultModel/);
    expect(src).toMatch(/provider:\s*resultProvider/);
    expect(src).toMatch(/source\?\:\s*string/);
    expect(src).toMatch(/modelUsed\?\:\s*string/);
    expect(src).toMatch(/provider\?\:\s*string/);
  });

  it("MessageBubble memo comparator includes source/provider/modelUsed", () => {
    const src = read("src/components/chat/MessageBubble.tsx");
    expect(src).toMatch(/prev\.message\.source\s*===\s*next\.message\.source/);
    expect(src).toMatch(/prev\.message\.provider\s*===\s*next\.message\.provider/);
    expect(src).toMatch(/prev\.message\.modelUsed\s*===\s*next\.message\.modelUsed/);
  });
});

// ---------------------------------------------------------------------------
// Runtime: streamBuiltInChat header capture. The firebase app + aiAccessMode
// mocks are declared at the top level so the mocked modules apply when
// cloudChat is imported.
// ---------------------------------------------------------------------------

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { getIdToken: async () => "id-token" } }),
  functionsBaseUrl: "https://functions.test",
}));

vi.mock("@/lib/aiAccessMode", () => ({
  getCachedAiAccessMode: () => "shared",
}));

vi.mock("@/lib/byok", () => ({
  getByokConfig: () => null,
  streamByokChat: vi.fn(),
}));

describe("streamBuiltInChat header capture (runtime)", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("captures X-Provider and X-Model headers from the chat function response", async () => {
    const { streamCloudChat } = await import("@/lib/cloudChat");

    // Minimal SSE stream that yields one delta then ends — as a REAL Response
    // so `resp.headers.get(...)` works.
    const sseStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n'));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n"));
        controller.close();
      },
    });
    const fetchMock = vi.fn(async () => new Response(sseStream, {
      status: 200,
      headers: {
        "X-Provider": "openrouter",
        "X-Model": "gpt-4o-mini",
        "Content-Type": "text/event-stream",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await streamCloudChat([{ role: "user", content: "hi" }], {});
    expect(result.source).toBe("shared");
    expect(result.modelUsed).toBe("gpt-4o-mini");
    expect(result.provider).toBe("openrouter");
    expect(result.content).toBe("hello");
  });

  it("tolerates responses without headers (defensive optional chaining)", async () => {
    const { streamCloudChat } = await import("@/lib/cloudChat");

    const sseStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"x"}}]}\n'));
        controller.close();
      },
    });
    // Simulate the legacy test double shape: body + ok but NO headers object.
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: sseStream,
      json: async () => ({}),
    } as unknown as Response));
    vi.stubGlobal("fetch", fetchMock);

    const result = await streamCloudChat([{ role: "user", content: "hi" }], {});
    expect(result.source).toBe("shared");
    expect(result.content).toBe("x");
    expect(result.modelUsed).toBeUndefined();
    expect(result.provider).toBeUndefined();
  });
});
