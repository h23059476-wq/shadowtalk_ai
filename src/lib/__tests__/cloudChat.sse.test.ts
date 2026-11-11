/**
 * Regression: cloud chat SSE reliability.
 * 1. Mid-stream `data: {"error": ...}` events must surface (previously they
 *    were swallowed — a failed stream returned an empty answer, no error).
 * 2. The final buffered line must be flushed even without a trailing newline.
 * 3. A truncated final JSON event must be reported as a cut-off response.
 * 4. HTTP error mapping covers 401/402/429/5xx with actionable messages.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import { streamCloudChat, type CloudChatMessage } from "@/lib/cloudChat";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

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

describe("cloudChat SSE handling", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("accumulates happy-path deltas", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        "data: {\"choices\":[{\"delta\":{\"content\":\"Hello \"}}]}\n\n" +
        "data: {\"choices\":[{\"delta\":{\"content\":\"world\"}}]}\n\n" +
        "data: [DONE]\n\n",
      ),
    );
    const deltas: string[] = [];
    const result = await streamCloudChat(MSG, { onDelta: (acc) => deltas.push(acc) });
    expect(result.error).toBeUndefined();
    expect(result.content).toBe("Hello world");
    expect(deltas[deltas.length - 1]).toBe("Hello world");
  });

  it("surfaces mid-stream error events with partial content", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n" +
        "data: {\"error\":{\"message\":\"quota exceeded\"}}\n\n",
      ),
    );
    const result = await streamCloudChat(MSG, {});
    expect(result.content).toBe("partial");
    expect(result.error).toBe("quota exceeded");
  });

  it("handles string-shaped error events", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse("data: {\"error\":\"upstream unavailable\"}\n\n"),
    );
    const result = await streamCloudChat(MSG, {});
    expect(result.error).toBe("upstream unavailable");
  });

  it("flushes the final data line without a trailing newline", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse("data: {\"choices\":[{\"delta\":{\"content\":\"tail\"}}]}"),
    );
    const result = await streamCloudChat(MSG, {});
    expect(result.error).toBeUndefined();
    expect(result.content).toBe("tail");
  });

  it("reports a truncated final JSON event instead of silent success", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse("data: {\"choices\":[{\"delta\":{\"content\":\"abc\"}}]}\n\ndata: {\"choices\":[{\"del"),
    );
    const result = await streamCloudChat(MSG, {});
    expect(result.error).toBe("The AI response was cut off. Please regenerate.");
    expect(result.content).toBe("abc");
  });

  it("maps HTTP errors to actionable messages", async () => {
    const cases: Array<[number, string]> = [
      [429, "Rate limit reached — please try again in a moment."],
      [402, "AI credits exhausted — check your plan or billing."],
      [401, "AI gateway authentication failed — please sign in again."],
      [503, "AI service is temporarily unavailable — please try again."],
    ];
    for (const [status, expected] of cases) {
      // 5xx statuses trigger one automatic retry — use a stable impl, not
      // a single-shot one, so the retry sees the same failing status.
      fetchMock.mockImplementation(async () => sseResponse("", status));
      const result = await streamCloudChat(MSG, {});
      expect(result.error).toBe(expected);
    }
  });

  it("sends the request to the chat function with a bearer token", async () => {
    fetchMock.mockResolvedValueOnce(sseResponse("data: [DONE]\n\n"));
    await streamCloudChat(MSG, {});
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://functions.test/chat");
    expect(init.headers.Authorization).toBe("Bearer id-token");
    expect(JSON.parse(init.body).stream).toBe(true);
  });
});
