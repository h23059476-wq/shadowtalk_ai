/**
 * Regression: Anthropic key validation must use the /v1/models endpoint with
 * x-api-key + anthropic-version headers. Bearer-auth GETs against the
 * messages URL made every valid Anthropic key look rejected.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { useApiKeyValidation } from "@/hooks/useApiKeyValidation";

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe("useApiKeyValidation — provider auth headers", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("validates Anthropic keys with x-api-key and anthropic-version", async () => {
    fetchMock.mockResolvedValueOnce(okJson({ data: [{ id: "claude-haiku-4-5" }] }));
    const { result } = renderHook(() => useApiKeyValidation());

    act(() => {
      result.current.validate("anthropic", "sk-ant-test-key-123456");
    });

    await waitFor(() => expect(result.current.status).toBe("valid"), { timeout: 3000 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/models");
    expect(init.headers["x-api-key"]).toBe("sk-ant-test-key-123456");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    expect(init.headers.Authorization).toBeUndefined();
    expect(result.current.models).toContain("claude-haiku-4-5");
  });

  it("still uses Bearer auth for OpenAI-compatible providers", async () => {
    fetchMock.mockResolvedValueOnce(okJson({ data: [{ id: "gpt-4o-mini" }] }));
    const { result } = renderHook(() => useApiKeyValidation());

    act(() => {
      result.current.validate("openai", "sk-openai-test-key-12345");
    });

    await waitFor(() => expect(result.current.status).toBe("valid"), { timeout: 3000 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/models");
    expect(init.headers.Authorization).toBe("Bearer sk-openai-test-key-12345");
    expect(init.headers["x-api-key"]).toBeUndefined();
  });

  it("marks Anthropic 401 responses as invalid (proving auth headers matter)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { result } = renderHook(() => useApiKeyValidation());

    act(() => {
      result.current.validate("anthropic", "sk-ant-wrong-key-987654");
    });

    await waitFor(() => expect(result.current.status).toBe("invalid"), { timeout: 3000 });
    expect(result.current.detail).toBe("Key rejected by provider");
  });

  it("ignores keys that are too short", () => {
    const { result } = renderHook(() => useApiKeyValidation());
    act(() => {
      result.current.validate("anthropic", "short");
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });
});
