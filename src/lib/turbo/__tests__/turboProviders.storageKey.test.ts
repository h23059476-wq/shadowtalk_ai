/**
 * Regression: resolveTurboKey must read the v2 per-user BYOK namespace
 * (`shadowtalk.byok.v2.<uid>`) — the legacy un-namespaced
 * `shadowtalk.byok.v1` localStorage key is no longer consulted.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCachedAiAccessMode } from "@/lib/aiAccessMode";

vi.mock("@/lib/aiAccessMode", () => ({
  getCachedAiAccessMode: vi.fn(() => "byok"),
}));

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: "user-123" } }),
  functionsBaseUrl: "https://functions.test",
}));

import { resolveTurboKey } from "@/lib/turbo/turboProviders";

const mockedMode = vi.mocked(getCachedAiAccessMode);

describe("resolveTurboKey storage namespace", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedMode.mockReturnValue("byok");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("resolves the key from the v2 UID-namespaced storage", () => {
    localStorage.setItem(
      "shadowtalk.byok.v2.user-123",
      JSON.stringify({ provider: "groq", apiKey: "  gsk_test_key  ", model: "llama-3.3-70b-versatile", mode: "always" }),
    );
    expect(resolveTurboKey()).toBe("gsk_test_key");
  });

  it("ignores the legacy un-namespaced v1 key", () => {
    localStorage.setItem(
      "shadowtalk.byok.v1",
      JSON.stringify({ apiKey: "legacy-key" }),
    );
    expect(resolveTurboKey()).toBeNull();
  });

  it("does not leak other users' keys", () => {
    localStorage.setItem(
      "shadowtalk.byok.v2.someone-else",
      JSON.stringify({ provider: "groq", apiKey: "not-mine", mode: "always" }),
    );
    expect(resolveTurboKey()).toBeNull();
  });

  it("returns null when the stored config has no usable key", () => {
    localStorage.setItem(
      "shadowtalk.byok.v2.user-123",
      JSON.stringify({ provider: "groq", apiKey: "   ", mode: "fallback" }),
    );
    expect(resolveTurboKey()).toBeNull();
  });

  it("returns null when access mode is not BYOK even with a key present", () => {
    mockedMode.mockReturnValue("shared");
    localStorage.setItem(
      "shadowtalk.byok.v2.user-123",
      JSON.stringify({ provider: "groq", apiKey: "gsk_test_key", mode: "always" }),
    );
    expect(resolveTurboKey()).toBeNull();
  });
});
