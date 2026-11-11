/**
 * Regression: BYOK streaming reliability.
 * 1. Anthropic Messages payloads must merge consecutive same-role messages
 *    (the API requires strict user/assistant alternation and 400s otherwise).
 * 2. Mid-stream error events (Anthropic `type:"error"`, OpenAI-compatible
 *    `data:{"error":...}`) must surface instead of silently ending the stream.
 * 3. Final SSE lines without a trailing newline must be flushed; truncated
 *    final JSON must be reported as a cut-off response, not success.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: "user-1" } }),
  functionsBaseUrl: "https://functions.test",
}));

import { streamByokChat, type ByokConfig } from "@/lib/byok";
import type { CloudChatMessage } from "@/lib/cloudChat";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const ANTHROPIC_CFG: ByokConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-test",
  model: "claude-haiku-4-5-20251001",
  mode: "always",
};

const OPENAI_CFG: ByokConfig = {
  provider: "openai",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
  mode: "always",
};

function sseResponse(chunks: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(chunks));
        controller.close();
      },
    }),
    json: async () => ({}),
  } as unknown as Response;
}

function anthropicBody(): { messages: Array<{ role: string; content: unknown }> } {
  const init = fetchMock.mock.calls[0][1] as { body: string };
  return JSON.parse(init.body);
}

describe("byok anthropic role alternation", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(sseResponse("data: {\"type\":\"message_stop\"}\n\n"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("merges consecutive user messages into one alternating payload", async () => {
    const messages: CloudChatMessage[] = [
      { role: "system", content: "be nice" },
      { role: "user", content: "first" },
      { role: "user", content: "second" },
      { role: "assistant", content: "answer" },
      { role: "user", content: "follow-up" },
    ];

    await streamByokChat(ANTHROPIC_CFG, messages, {});

    const body = anthropicBody();
    expect(body.messages).toHaveLength(3);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[1].role).toBe("assistant");
    expect(body.messages[2].role).toBe("user");

    const firstContent = body.messages[0].content as Array<{ type: string; text?: string }>;
    expect(firstContent).toHaveLength(2);
    expect(firstContent[0]).toEqual({ type: "text", text: "first" });
    expect(firstContent[1]).toEqual({ type: "text", text: "second" });
  });

  it("never emits two adjacent messages with the same role", async () => {
    const messages: CloudChatMessage[] = [
      { role: "user", content: "a" },
      { role: "user", content: "b" },
      { role: "user", content: "c" },
    ];
    await streamByokChat(ANTHROPIC_CFG, messages, {});
    const body = anthropicBody();
    expect(body.messages).toHaveLength(1);
  });

  it("filters system messages and drops empty runs", async () => {
    const messages: CloudChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: "hello" },
    ];
    await streamByokChat(ANTHROPIC_CFG, messages, {});
    const body = anthropicBody();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
  });
});

describe("byok SSE error handling", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("surfaces Anthropic mid-stream error events", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        "data: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"Hi\"}}\n\n" +
        "data: {\"type\":\"error\",\"error\":{\"message\":\"overloaded_error\"}}\n\n",
      ),
    );
    const result = await streamByokChat(ANTHROPIC_CFG, [{ role: "user", content: "hi" }], {});
    expect(result.content).toBe("Hi");
    expect(result.error).toBe("overloaded_error");
  });

  it("surfaces OpenAI-compatible mid-stream error events", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        "data: {\"choices\":[{\"delta\":{\"content\":\"Hel\"}}]}\n\n" +
        "data: {\"error\":{\"message\":\"boom\"}}\n\n",
      ),
    );
    const result = await streamByokChat(OPENAI_CFG, [{ role: "user", content: "hi" }], {});
    expect(result.content).toBe("Hel");
    expect(result.error).toBe("boom");
  });

  it("flushes a final data line without a trailing newline", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        "data: {\"choices\":[{\"delta\":{\"content\":\"abc\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"def\"}}]}",
      ),
    );
    const result = await streamByokChat(OPENAI_CFG, [{ role: "user", content: "hi" }], {});
    expect(result.error).toBeUndefined();
    expect(result.content).toBe("abcdef");
  });

  it("reports a truncated final JSON event instead of silent success", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse("data: {\"choices\":[{\"delta\":{\"content\":\"abc\"}}]}\n\ndata: {\"choices\":[{\"del"),
    );
    const result = await streamByokChat(OPENAI_CFG, [{ role: "user", content: "hi" }], {});
    expect(result.error).toBe("The AI response was cut off. Please regenerate.");
    expect(result.content).toBe("abc");
  });

  it("streams happy-path deltas unchanged", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        "data: {\"choices\":[{\"delta\":{\"content\":\"one\"}}]}\n\n" +
        "data: [DONE]\n\n",
      ),
    );
    const deltas: string[] = [];
    const result = await streamByokChat(OPENAI_CFG, [{ role: "user", content: "hi" }], {
      onDelta: (acc) => deltas.push(acc),
    });
    expect(result.content).toBe("one");
    expect(deltas).toEqual(["one"]);
  });
});
