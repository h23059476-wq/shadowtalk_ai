/**
 * Regression: useGlobalChat's abort() must actually cancel the in-flight
 * stream. The abort controller is now assigned inside send() and merged with
 * any externally supplied signal; aborting resolves with "Chat stopped."
 * instead of a raw AbortError.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/integrations/local/client", () => ({ backend: {} }));
vi.mock("@/lib/turbo/chatCompletion", () => ({ streamChatCompletion: vi.fn() }));
vi.mock("@/lib/memory/adaptiveMemory", () => ({
  globalMemory: {},
  buildRecallPacket: vi.fn(async () => null),
}));

let onStreamStart: (() => void) | null = null;
const streamChat = vi.fn((_messages: unknown, opts: { signal: AbortSignal }) => {
  onStreamStart?.();
  return new Promise<{ content: string; error?: string }>((_resolve, reject) => {
    opts.signal.addEventListener("abort", () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      reject(err);
    });
  });
});

vi.mock("@/ai/AIProviderRouter", () => ({
  AIProviderRouter: {
    getBestProvider: vi.fn(async () => ({ streamChat })),
  },
}));

import { useGlobalChat } from "@/hooks/useGlobalChat";

const MESSAGES = [{ role: "user" as const, content: "hello" }];

describe("useGlobalChat abort wiring", () => {
  beforeEach(() => {
    streamChat.mockClear();
    onStreamStart = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("abort() cancels the in-flight send and resolves with Chat stopped.", async () => {
    const { result } = renderHook(() => useGlobalChat());

    let response!: { content: string; source: string; error?: string };
    let promise!: Promise<{ content: string; source: string; error?: string }>;
    const started = new Promise<void>((r) => { onStreamStart = r; });
    await act(async () => {
      promise = result.current.send(MESSAGES);
      // Resolves the moment the provider stream is invoked — all pre-stream
      // awaits ran and setIsLoading(true) was scheduled.
      await started;
    });
    expect(result.current.isLoading).toBe(true);
    expect(streamChat).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.abort();
    });
    response = await promise;

    expect(response.source).toBe("error");
    expect(response.error).toBe("Chat stopped.");
    expect(response.content).toBe("");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("propagates an external AbortSignal", async () => {
    const { result } = renderHook(() => useGlobalChat());
    const external = new AbortController();

    let response!: { content: string; source: string; error?: string };
    let promise!: Promise<{ content: string; source: string; error?: string }>;
    const started = new Promise<void>((r) => { onStreamStart = r; });
    await act(async () => {
      promise = result.current.send(MESSAGES, { signal: external.signal });
      await started;
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      external.abort();
    });
    response = await promise;

    expect(response.error).toBe("Chat stopped.");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("clears the abort ref after the request settles", async () => {
    streamChat.mockResolvedValueOnce({ content: "done" });
    const { result } = renderHook(() => useGlobalChat());

    await act(async () => {
      await result.current.send(MESSAGES);
    });
    expect(result.current.isLoading).toBe(false);
    // A follow-up abort must be a harmless no-op (no dangling controller).
    expect(() => result.current.abort()).not.toThrow();
  });

  it("passes the wired controller signal to the provider", async () => {
    streamChat.mockResolvedValueOnce({ content: "ok" });
    const { result } = renderHook(() => useGlobalChat());

    await act(async () => {
      await result.current.send(MESSAGES);
    });
    const opts = streamChat.mock.calls[0][1] as { signal: AbortSignal };
    expect(opts.signal).toBeInstanceOf(AbortSignal);
    expect(opts.signal.aborted).toBe(false);
  });
});
