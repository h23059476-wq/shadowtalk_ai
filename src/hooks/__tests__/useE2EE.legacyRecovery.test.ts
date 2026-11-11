/**
 * Final completion phase — legacy E2EE vault recovery + dead session-key
 * persistence removal.
 *
 * 1. When a signed-in user has NO vault of their own but device-global legacy
 *    material exists (salt + fingerprint), the hook must NOT auto-create a
 *    fresh UID salt (that would permanently orphan the legacy ciphertext).
 *    It must surface `legacyVaultAvailable` instead and let the UI run the
 *    passphrase-verified, consent-gated recovery.
 * 2. `recoverLegacyVault` verifies ownership against the legacy fingerprint,
 *    commits the verified material into the UID namespace (never overwriting
 *    existing material, never deleting legacy keys) and unlocks the vault
 *    with the re-derived legacy key.
 * 3. useChatPrivateMode clears a stale private-mode flag on mount — the key
 *    is never persisted, so a flag that survived a reload previously claimed
 *    encryption was active while every new message failed to save.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
    _dump: () => store,
  };
};
const lsMock = makeStorage();
const ssMock = makeStorage();

vi.stubGlobal("localStorage", lsMock);
vi.stubGlobal("sessionStorage", ssMock);

const cryptoMock = vi.hoisted(() => ({
  deriveKey: vi.fn(async () => ({}) as CryptoKey),
  hashForVerification: vi.fn(async () => "fingerprint"),
}));

vi.mock("@/lib/e2e-encryption", () => {
  const arrayToBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...Array.from(arr)));
  return {
    generateSalt: () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
    generateIV: () => new Uint8Array(12),
    arrayToBase64,
    base64ToArray: (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    deriveKey: cryptoMock.deriveKey,
    encrypt: vi.fn(async () => "cipher"),
    decrypt: vi.fn(async () => "plain"),
    hashForVerification: cryptoMock.hashForVerification,
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const authMock = vi.hoisted(() => ({ uid: "alice" as string | null }));
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: authMock.uid ? { id: authMock.uid } : null }),
}));

import { useE2EE } from "@/hooks/useE2EE";

const LEGACY_SALT = "bGVnYWN5LXNhbHQtYnl0ZXM="; // valid base64 — recovery re-derives a key from it
const LEGACY_FINGERPRINT = "fingerprint"; // matches the mocked hashForVerification

function seedLegacyVault(opts?: { fingerprint?: string }) {
  lsMock.setItem("shadowtalk_e2e_salt", LEGACY_SALT);
  lsMock.setItem("shadowtalk_e2e_fingerprint", opts?.fingerprint ?? LEGACY_FINGERPRINT);
}

describe("useE2EE legacy vault recovery", () => {
  beforeEach(() => {
    lsMock.clear(); ssMock.clear(); authMock.uid = "alice";
    cryptoMock.deriveKey.mockClear();
    cryptoMock.hashForVerification.mockClear();
    cryptoMock.hashForVerification.mockImplementation(async () => "fingerprint");
  });
  afterEach(() => { lsMock.clear(); ssMock.clear(); });

  it("defers salt creation and exposes legacyVaultAvailable when legacy material exists", async () => {
    seedLegacyVault();
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.legacyVaultAvailable).toBe(true));

    // No UID salt was written and the legacy material is untouched.
    expect(lsMock.getItem("shadowtalk_e2e_salt_alice")).toBeNull();
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBe(LEGACY_SALT);
    expect(lsMock.getItem("shadowtalk_e2e_fingerprint")).toBe(LEGACY_FINGERPRINT);
    expect(result.current.masterSalt).toBeNull();
    expect(result.current.isUnlocked).toBe(false);
  });

  it("keeps the old auto-create behavior when only a legacy salt exists (no fingerprint)", async () => {
    lsMock.setItem("shadowtalk_e2e_salt", LEGACY_SALT);
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.masterSalt).not.toBeNull());
    expect(result.current.legacyVaultAvailable).toBe(false);
    // A fresh UID salt was created; legacy salt untouched.
    expect(lsMock.getItem("shadowtalk_e2e_salt_alice")).toBeTruthy();
    expect(lsMock.getItem("shadowtalk_e2e_salt_alice")).not.toBe(LEGACY_SALT);
  });

  it("recovers the legacy vault after passphrase verification and unlocks it", async () => {
    seedLegacyVault();
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.legacyVaultAvailable).toBe(true));

    let recovered = false;
    await act(async () => {
      recovered = await result.current.recoverLegacyVault("correct-passphrase");
    });
    expect(recovered).toBe(true);

    // Verified material was copied into the UID namespace…
    expect(lsMock.getItem("shadowtalk_e2e_salt_alice")).toBe(LEGACY_SALT);
    expect(lsMock.getItem("shadowtalk_e2e_fingerprint_alice")).toBe(LEGACY_FINGERPRINT);
    // …legacy keys were never deleted…
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBe(LEGACY_SALT);
    expect(lsMock.getItem("shadowtalk_e2e_fingerprint")).toBe(LEGACY_FINGERPRINT);
    // …and the vault is unlocked with the re-derived legacy key.
    expect(result.current.isUnlocked).toBe(true);
    expect(result.current.masterSalt).toBe(LEGACY_SALT);
    expect(result.current.masterKey).not.toBeNull();
    expect(result.current.legacyVaultAvailable).toBe(false);
  });

  it("refuses recovery on a wrong passphrase and leaves all material untouched", async () => {
    seedLegacyVault({ fingerprint: "some-other-fingerprint" });
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.legacyVaultAvailable).toBe(true));

    let recovered = true;
    await act(async () => {
      recovered = await result.current.recoverLegacyVault("wrong-passphrase");
    });
    expect(recovered).toBe(false);
    expect(lsMock.getItem("shadowtalk_e2e_salt_alice")).toBeNull();
    expect(lsMock.getItem("shadowtalk_e2e_fingerprint_alice")).toBeNull();
    expect(result.current.isUnlocked).toBe(false);
  });

  it("refuses recovery for guests (no uid) without touching legacy material", async () => {
    seedLegacyVault();
    authMock.uid = null;
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.masterSalt).not.toBeNull());

    let recovered = true;
    await act(async () => {
      recovered = await result.current.recoverLegacyVault("correct-passphrase");
    });
    expect(recovered).toBe(false);
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBe(LEGACY_SALT);
  });
});

// ---------------------------------------------------------------------------
// useChatPrivateMode — stale private-mode flag cleanup on mount.
// ---------------------------------------------------------------------------

const privateModeState = vi.hoisted(() => ({ active: false }));
vi.mock("@/lib/chatPrivateSession", () => ({
  isChatPrivateModeActive: () => privateModeState.active,
  isChatAnonymousUiActive: () => privateModeState.active,
  setChatPrivateModeActive: (v: boolean) => { privateModeState.active = v; },
  setChatAnonymousUiActive: (v: boolean) => { privateModeState.active = v; },
}));

const toastMock = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock.toast }),
}));

vi.mock("@/integrations/local/client", () => ({
  backend: {
    from: () => ({
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}));

import { useChatPrivateMode } from "@/hooks/useChatPrivateMode";

function makeE2EEApi(isUnlocked: boolean) {
  return {
    isUnlocked,
    isEncrypted: (t: string) => t.startsWith("e2e:"),
    unwrapEncrypted: () => null,
    decryptData: vi.fn(async () => null),
    encryptData: vi.fn(async () => ({ data: "cipher", iv: "iv" })),
    wrapEncrypted: (d: string, iv: string) => `e2e:${iv}:${d}`,
    engageSessionEncryption: vi.fn(async () => true),
    lock: vi.fn(),
  } as any;
}

describe("useChatPrivateMode stale-flag cleanup", () => {
  beforeEach(() => {
    privateModeState.active = false;
    toastMock.toast.mockClear();
  });

  it("clears a stale private-mode flag on mount and explains why", () => {
    // Simulates a reload: the sessionStorage flag survived but the key did not.
    privateModeState.active = true;
    const e2ee = makeE2EEApi(false);
    const { result } = renderHook(() => useChatPrivateMode(e2ee));

    expect(result.current.active).toBe(false);
    expect(result.current.anonymousUi).toBe(false);
    expect(privateModeState.active).toBe(false);
    expect(toastMock.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Private mode ended" }),
    );
  });

  it("does nothing when the flag is not set", () => {
    privateModeState.active = false;
    const e2ee = makeE2EEApi(false);
    const { result } = renderHook(() => useChatPrivateMode(e2ee));
    expect(result.current.active).toBe(false);
    expect(toastMock.toast).not.toHaveBeenCalled();
  });

  it("skips re-engaging the engine when the vault is already unlocked (recovery path)", async () => {
    privateModeState.active = false;
    const e2ee = makeE2EEApi(true);
    const { result } = renderHook(() => useChatPrivateMode(e2ee));

    let ok = false;
    await act(async () => {
      ok = await result.current.enablePrivateMode({
        conversationId: "conv-1",
        messages: [],
        isGuest: false,
      });
    });
    expect(ok).toBe(true);
    expect(e2ee.engageSessionEncryption).not.toHaveBeenCalled();
  });
});
