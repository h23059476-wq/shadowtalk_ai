/**
 * Tier 2 — HF OAuth + Inference Router unit tests.
 *
 * hfOAuth: real Web Crypto PKCE (RFC 7636 shape), authorize URL contract,
 * callback state validation / expiry / error paths (token exchange mocked at
 * the fetch boundary).
 * hfRouterProvider: typed failure ladder (401/402/429/network), SSE stream
 * parsing incl. [DONE] + keepalive lines.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { webcrypto } from "node:crypto";

vi.stubGlobal("crypto", webcrypto);
// fake-indexeddb for the secureStore-backed hfCredentials
import "fake-indexeddb/auto";

import {
  generatePkce,
  startHfSignIn,
  handleHfCallback,
  disconnectHfAccount,
  HF_CALLBACK_PATH,
  HF_OAUTH_SCOPES,
} from "@/lib/auth/hfOAuth";
import { isHfAccountConnected, __resetHfCredentialsForTests } from "@/lib/auth/hfCredentials";
import {
  classifyHfRouterFailure,
  hfRouterUnavailableMessage,
  streamHfRouterChat,
  HfRouterError,
} from "@/lib/providers/hfRouterProvider";

const PENDING_KEY = "shadowtalk.hf-oauth.pending.v1";

function seedPending(state: string, startedAt = Date.now()): string {
  const verifier = "unit-test-verifier-0123456789abcdef0123456789abcdef";
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ codeVerifier: verifier, state, startedAt }));
  return verifier;
}

beforeEach(async () => {
  // The shared setup.ts stub replaces the global crypto WITHOUT .subtle —
  // PKCE needs real Web Crypto, so re-assert the stub before every test.
  vi.stubGlobal("crypto", webcrypto);
  sessionStorage.clear();
  await __resetHfCredentialsForTests();
  vi.stubEnv("VITE_HF_CLIENT_ID", "shadowtalk-test-client");
  vi.stubGlobal("location", new URL("https://app.shadowtalk.ai/settings"));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("generatePkce (RFC 7636)", () => {
  it("produces a base64url verifier (no +, / or padding) and a matching S256 challenge", async () => {
    const pkce = await generatePkce();
    expect(pkce.method).toBe("S256");
    expect(pkce.codeVerifier).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(pkce.codeVerifier).not.toMatch(/[+/=]/);
    // challenge = base64url(sha256(verifier)) — verify with node crypto
    const { createHash } = await import("node:crypto");
    const expected = createHash("sha256").update(pkce.codeVerifier).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(pkce.codeChallenge).toBe(expected);
  });

  it("is randomized — two calls never share a verifier", async () => {
    const a = await generatePkce();
    const b = await generatePkce();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe("startHfSignIn", () => {
  it("throws a clear error when no OAuth client is configured", async () => {
    vi.stubEnv("VITE_HF_CLIENT_ID", "");
    await expect(startHfSignIn()).rejects.toThrow(/not configured|VITE_HF_CLIENT_ID/i);
  });

  it("builds the full authorize URL and stashes the PKCE verifier for the callback", async () => {
    const url = await startHfSignIn();
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://huggingface.co/oauth/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("shadowtalk-test-client");
    expect(parsed.searchParams.get("redirect_uri")).toBe(`https://app.shadowtalk.ai${HF_CALLBACK_PATH}`);
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(HF_OAUTH_SCOPES);
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    const state = parsed.searchParams.get("state");
    const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "{}");
    expect(pending.state).toBe(state);
    expect(pending.codeVerifier.length).toBeGreaterThan(30);
  });
});

describe("handleHfCallback", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  it("surfaces HF's own error/description without any network call", async () => {
    const result = await handleHfCallback({ error: "access_denied", errorDescription: "user clicked cancel" });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      // non-strict tsconfig: !result.ok does not narrow unions here
      expect(result.reason).toContain("user clicked cancel");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a missing code", async () => {
    seedPending("st-1");
    const result = await handleHfCallback({ code: null, state: "st-1" });
    expect(result.ok).toBe(false);
  });

  it("rejects a state mismatch (tamper / CSRF) and clears the pending record", async () => {
    seedPending("expected-state");
    const result = await handleHfCallback({ code: "abc", state: "forged-state" });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      // non-strict tsconfig: !result.ok does not narrow unions here
      expect(result.reason).toMatch(/state mismatch/i);
    }
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("rejects attempts older than 10 minutes", async () => {
    seedPending("st-2", Date.now() - 11 * 60_000);
    const result = await handleHfCallback({ code: "abc", state: "st-2" });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      // non-strict tsconfig: !result.ok does not narrow unions here
      expect(result.reason).toMatch(/expired/i);
    }
  });

  it("exchanges the code, stores an hf_ token and reports the profile", async () => {
    const verifier = seedPending("st-3");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "hf_oauth_token_123456", scope: "openid profile inference-api" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ preferred_username: "shadowfan", name: "Shadow Fan" }), { status: 200 }));

    const result = await handleHfCallback({ code: "auth-code", state: "st-3" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.success.username).toBe("shadowfan");
    expect(await isHfAccountConnected()).toBe(true);
    const [tokenCall, profileCall] = fetchMock.mock.calls;
    const body = new URLSearchParams(tokenCall[1].body);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBe(verifier);
    expect(body.get("client_id")).toBe("shadowtalk-test-client");
    expect((profileCall[1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer hf_oauth_token_123456" });
  });

  it("surfaces a rejected token exchange (bad code) without storing anything", async () => {
    seedPending("st-4");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "invalid_grant", error_description: "bad verification code" }), { status: 400 }),
    );
    const result = await handleHfCallback({ code: "bad-code", state: "st-4" });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      // non-strict tsconfig: !result.ok does not narrow unions here
      expect(result.reason).toContain("bad verification code");
    }
    expect(await isHfAccountConnected()).toBe(false);
  });

  it("refuses a non-hf_ token shape", async () => {
    seedPending("st-5");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "not-hf" }), { status: 200 }));
    const result = await handleHfCallback({ code: "c", state: "st-5" });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      // non-strict tsconfig: !result.ok does not narrow unions here
      expect(result.reason).toMatch(/token shape/i);
    }
  });

  it("disconnect clears credentials and pending state", async () => {
    seedPending("st-6");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "hf_disconnect_me_123" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await handleHfCallback({ code: "c", state: "st-6" });
    expect(await isHfAccountConnected()).toBe(true);
    await disconnectHfAccount();
    expect(await isHfAccountConnected()).toBe(false);
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });
});

describe("hfRouterProvider failure ladder", () => {
  it("classifies statuses and renders banner copy for each kind", () => {
    expect(classifyHfRouterFailure(401, "")).toBe("unauthorized");
    expect(classifyHfRouterFailure(402, "")).toBe("payment");
    expect(classifyHfRouterFailure(429, "")).toBe("rate_limited");
    expect(classifyHfRouterFailure(500, "")).toBe("unknown");
    expect(classifyHfRouterFailure(null, "")).toBe("network");
    for (const kind of ["unauthorized", "payment", "rate_limited", "network", "unknown"] as const) {
      expect(hfRouterUnavailableMessage(kind).length).toBeGreaterThan(20);
    }
  });

  it("parses a streamed SSE answer, ignores keepalives and stops at [DONE]", async () => {
    await (await import("@/lib/auth/hfCredentials")).saveHfCredentials({ accessToken: "hf_router_test_123" });
    const sse = [
      ": keepalive comment",
      'data: {"model":"llama","choices":[{"delta":{"content":"Hel"}}]}',
      "",
      'data: {"model":"llama","choices":[{"delta":{"content":"lo"}}]}',
      "data: [DONE]",
      "",
    ].join("\n");
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(sse));
        c.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream, { status: 200 })));

    const deltas: string[] = [];
    const result = await streamHfRouterChat([{ role: "user", content: "hi" }], { onDelta: (c) => deltas.push(c) });
    expect(result.content).toBe("Hello");
    expect(result.source).toBe("hf-router");
    expect(result.modelUsed).toBe("llama");
    // onDelta follows the app's chat contract: ACCUMULATED text so far.
    expect(deltas).toEqual(["Hel", "Hello"]);
  });

  it("maps a 402 into the payment error without pretending it is retryable", async () => {
    await (await import("@/lib/auth/hfCredentials")).saveHfCredentials({ accessToken: "hf_router_test_123" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"quota exceeded"}', { status: 402 })));
    await expect(streamHfRouterChat([{ role: "user", content: "hi" }])).rejects.toMatchObject({ kind: "payment", status: 402 });
  });

  it("throws unauthorized when no HF account is connected", async () => {
    await __resetHfCredentialsForTests();
    await expect(streamHfRouterChat([{ role: "user", content: "hi" }])).rejects.toBeInstanceOf(HfRouterError);
    await expect(streamHfRouterChat([{ role: "user", content: "hi" }])).rejects.toMatchObject({ kind: "unauthorized" });
  });
});
