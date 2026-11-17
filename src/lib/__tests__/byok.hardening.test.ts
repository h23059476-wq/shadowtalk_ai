/**
 * Regression: BYOK stream hardening (see src/lib/sseHardening.ts).
 *
 * The shared gateway client got watchdogs first; the BYOK paths used to call
 * fetch with the caller's bare signal and read the stream in a plain loop:
 *   - a hung provider socket spun the composer forever with no error;
 *   - a stream killed mid-generation looked like a complete answer;
 *   - one dropped Wi-Fi moment on the first request dead-ended chat.
 * These tests pin the fixes for both provider shapes (OpenAI-compatible and
 * Anthropic Messages).
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

const OPENAI_CFG: ByokConfig = {
  provider: "openai",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
  mode: "always",
};

const ANTHROPIC_CFG: ByokConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-test",
  model: "claude-haiku-4-5-20251001",
  mode: "always",
};

const MSG: CloudChatMessage[] = [{ role: "user", content: "hi" }];

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

/** A stream that emits one event and then hangs — the wedged socket case. */
function stalledResponse(firstChunk: string) {
  return {
    ok: true,
    status: 200,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(firstChunk));
        // never closed — reader.read() pends forever without the watchdog
      },
    }),
    json: async () => ({}),
  } as unknown as Response;
}

describe("byok stream hardening — OpenAI-compatible", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("surfaces a stalled stream via the silence watchdog (partial content kept)", async () => {
    fetchMock.mockResolvedValueOnce(
      stalledResponse('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'),
    );
    const result = await streamByokChat(OPENAI_CFG, MSG, { timeoutMs: 40 });
    expect(result.content).toBe("partial");
    expect(result.error).toContain("stopped responding");
  }, 5_000);

  it("reports the stall when the first request never responds", async () => {
    // A hung fetch (dead socket, no bytes) used to pend forever. The mock
    // honours the abort signal the way a real fetch does.
    fetchMock.mockImplementation(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError")),
          );
        }),
    );
    const result = await streamByokChat(OPENAI_CFG, MSG, { timeoutMs: 40 });
    expect(result.content).toBe("");
    expect(result.error).toContain("did not respond within");
  }, 5_000);

  it("flags a stream closed without [DONE] as a truncated reply", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse('data: {"choices":[{"delta":{"content":"half an"}}]}\n\n'),
    );
    const result = await streamByokChat(OPENAI_CFG, MSG, { timeoutMs: 1_000 });
    expect(result.content).toBe("half an");
    expect(result.error).toContain("incomplete");
  });

  it("flags finish_reason=length as a trimmed reply", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        'data: {"choices":[{"delta":{"content":"abc"}}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n' +
        "data: [DONE]\n\n",
      ),
    );
    const result = await streamByokChat(OPENAI_CFG, MSG, { timeoutMs: 1_000 });
    expect(result.content).toBe("abc");
    expect(result.error).toContain("output length");
  });

  it("retries one network failure on the first request and succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(
      sseResponse('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n'),
    );
    const result = await streamByokChat(OPENAI_CFG, MSG, { timeoutMs: 1_000 });
    expect(result.error).toBeUndefined();
    expect(result.content).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 5_000);

  it("keeps a clean [DONE]-terminated stream error-free", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n',
      ),
    );
    const result = await streamByokChat(OPENAI_CFG, MSG, { timeoutMs: 1_000 });
    expect(result.error).toBeUndefined();
    expect(result.content).toBe("hello");
  });
});

describe("byok stream hardening — Anthropic", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("keeps a complete message_stop stream error-free", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hello"}}\n\n' +
        'data: {"type":"message_stop"}\n\n',
      ),
    );
    const result = await streamByokChat(ANTHROPIC_CFG, MSG, { timeoutMs: 1_000 });
    expect(result.error).toBeUndefined();
    expect(result.content).toBe("hello");
  });

  it("flags a stream closed without message_stop as a truncated reply", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"part"}}\n\n'),
    );
    const result = await streamByokChat(ANTHROPIC_CFG, MSG, { timeoutMs: 1_000 });
    expect(result.content).toBe("part");
    expect(result.error).toContain("incomplete");
  });

  it("surfaces a stalled stream via the silence watchdog", async () => {
    fetchMock.mockResolvedValueOnce(
      stalledResponse('data: {"type":"message_start"}\n\n'),
    );
    const result = await streamByokChat(ANTHROPIC_CFG, MSG, { timeoutMs: 40 });
    expect(result.error).toContain("stopped responding");
  }, 5_000);

  it("flags max_tokens stop_reason as a trimmed reply", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"abc"}}\n\n' +
        'data: {"type":"message_delta","delta":{"stop_reason":"max_tokens"}}\n\n' +
        'data: {"type":"message_stop"}\n\n',
      ),
    );
    const result = await streamByokChat(ANTHROPIC_CFG, MSG, { timeoutMs: 1_000 });
    expect(result.content).toBe("abc");
    expect(result.error).toContain("output length");
  });
});
