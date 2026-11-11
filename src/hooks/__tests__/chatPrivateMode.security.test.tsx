/**
 * Regression: private-mode storage follows a strict encrypt-or-null contract.
 * While private mode is engaged, a failed/locked encryption must return null
 * (callers skip the DB write) — never a silent plaintext fallback. The
 * enable path must also encrypt in the same tick via forceActive.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const dbUpdates: Array<{ table: string; row: Record<string, unknown> }> = [];

vi.mock("@/integrations/local/client", () => ({
  backend: {
    from: (table: string) => ({
      update: (row: Record<string, unknown>) => {
        dbUpdates.push({ table, row });
        return { eq: async () => ({}) };
      },
    }),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const privateModeState = { active: false, anonymous: false };
vi.mock("@/lib/chatPrivateSession", () => ({
  isChatPrivateModeActive: () => privateModeState.active,
  isChatAnonymousUiActive: () => privateModeState.anonymous,
  setChatPrivateModeActive: (v: boolean) => { privateModeState.active = v; },
  setChatAnonymousUiActive: (v: boolean) => { privateModeState.anonymous = v; },
}));

import { useChatPrivateMode } from "@/hooks/useChatPrivateMode";

type E2EEApi = Parameters<typeof useChatPrivateMode>[0];

function makeE2EE(unlocked: boolean): E2EEApi {
  return {
    isUnlocked: unlocked,
    isEncrypted: (t: string) => t.startsWith("e2e:"),
    unwrapEncrypted: (t: string) => {
      const parts = t.split(":");
      return parts.length >= 3 ? { iv: parts[1], data: parts[2] } : null;
    },
    decryptData: async () => "plain",
    encryptData: async (plain: string) =>
      unlocked ? { data: `enc(${plain})`, iv: "iv123" } : null,
    wrapEncrypted: (data: string, iv: string) => `e2e:${iv}:${data}`,
    engageSessionEncryption: async () => unlocked,
    lock: vi.fn(),
  } as unknown as E2EEApi;
}

describe("chat private mode — strict encrypt-or-null", () => {
  beforeEach(() => {
    dbUpdates.length = 0;
    privateModeState.active = false;
    privateModeState.anonymous = false;
  });

  it("returns plaintext untouched when private mode is off", async () => {
    const { result } = renderHook(() => useChatPrivateMode(makeE2EE(false)));
    await act(async () => {
      expect(await result.current.wrapForStorage("hello")).toBe("hello");
    });
  });

  it("returns ciphertext when active and unlocked", async () => {
    privateModeState.active = true;
    const { result } = renderHook(() => useChatPrivateMode(makeE2EE(true)));
    let wrapped: string | null = null;
    await act(async () => {
      wrapped = await result.current.wrapForStorage("hello");
    });
    expect(wrapped).toBe("e2e:iv123:enc(hello)");
  });

  it("returns null (never plaintext) when active but the vault locks mid-session", async () => {
    // Mount with an unlocked engine, engage private mode, then the vault
    // locks (e.g. lock() was called). The mount-time stale-flag cleanup no
    // longer applies — this is the runtime state where the strict
    // encrypt-or-null contract matters.
    privateModeState.active = false;
    const e2ee = makeE2EE(false);
    // Engine engages successfully at enable-time, then locks.
    (e2ee as unknown as { engageSessionEncryption: () => Promise<boolean> }).engageSessionEncryption =
      async () => true;
    const { result } = renderHook(() => useChatPrivateMode(e2ee));

    await act(async () => {
      const ok = await result.current.enablePrivateMode({
        conversationId: "conv-1",
        messages: [],
        isGuest: true,
      });
      expect(ok).toBe(true);
    });
    expect(result.current.active).toBe(true);

    let wrapped: string | null | undefined;
    await act(async () => {
      wrapped = await result.current.wrapForStorage("secret");
    });
    expect(wrapped).toBeNull();
  });

  it("returns null when encryption fails while active", async () => {
    privateModeState.active = true;
    const e2ee = makeE2EE(true);
    (e2ee.encryptData as ReturnType<typeof vi.fn>) = vi.fn(async () => null);
    const { result } = renderHook(() => useChatPrivateMode(e2ee));
    let wrapped: string | null | undefined;
    await act(async () => {
      wrapped = await result.current.wrapForStorage("secret");
    });
    expect(wrapped).toBeNull();
  });

  it("enable path encrypts existing rows despite the stale active closure", async () => {
    const e2ee = makeE2EE(true);
    const { result } = renderHook(() => useChatPrivateMode(e2ee));

    let ok = false;
    await act(async () => {
      ok = await result.current.enablePrivateMode({
        conversationId: "conv-1",
        messages: [{ id: "m1", content: "top secret" }],
        isGuest: false,
      });
    });

    expect(ok).toBe(true);
    const messageUpdates = dbUpdates.filter((u) => u.table === "messages");
    expect(messageUpdates).toHaveLength(1);
    expect(messageUpdates[0].row.content).toBe("e2e:iv123:enc(top secret)");

    const conversationUpdates = dbUpdates.filter((u) => u.table === "conversations");
    expect(conversationUpdates.length).toBeGreaterThan(0);
    expect(String(conversationUpdates[0].row.title)).toMatch(/^e2e:/);
  });

  it("enable path aborts without DB writes when the engine cannot engage", async () => {
    const e2ee = makeE2EE(false);
    const { result } = renderHook(() => useChatPrivateMode(e2ee));

    let ok = true;
    await act(async () => {
      ok = await result.current.enablePrivateMode({
        conversationId: "conv-1",
        messages: [{ id: "m1", content: "top secret" }],
        isGuest: false,
      });
    });

    expect(ok).toBe(false);
    expect(dbUpdates).toHaveLength(0);
  });

  it("encryptLocalMessages throws instead of leaking plaintext on failure", async () => {
    // Engage with an engine that then cannot encrypt (mid-session lock).
    privateModeState.active = false;
    const e2ee = makeE2EE(false);
    (e2ee as unknown as { engageSessionEncryption: () => Promise<boolean> }).engageSessionEncryption =
      async () => true;
    const { result } = renderHook(() => useChatPrivateMode(e2ee));

    await act(async () => {
      await result.current.enablePrivateMode({
        conversationId: "conv-1",
        messages: [],
        isGuest: true,
      });
    });
    expect(result.current.active).toBe(true);

    await act(async () => {
      await expect(
        result.current.encryptLocalMessages([{ id: "m1", content: "secret" }]),
      ).rejects.toThrow(/not saved/i);
    });
  });
});
