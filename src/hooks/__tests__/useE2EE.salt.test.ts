/**
 * Regression: the E2EE vault salt must be REUSED from the UID-scoped
 * localStorage namespace instead of regenerated on every mount. A fresh salt
 * per session would orphan all previously derived keys and invalidate the
 * stored fingerprint for this account.
 *
 * Batch 3: salt/fingerprint/session-key are now UID-scoped via
 * @/lib/e2eeStorage. The live hook never reads the legacy device-global keys.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

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

vi.mock("@/lib/e2e-encryption", () => {
  const arrayToBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...Array.from(arr)));
  return {
    generateSalt: () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
    generateIV: () => new Uint8Array(12),
    arrayToBase64,
    base64ToArray: (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    deriveKey: vi.fn(async () => ({}) as CryptoKey),
    encrypt: vi.fn(async () => "cipher"),
    decrypt: vi.fn(async () => "plain"),
    hashForVerification: vi.fn(async () => "fingerprint"),
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

const saltKey = (uid: string) => `shadowtalk_e2e_salt_${uid}`;

describe("useE2EE UID-scoped vault salt persistence", () => {
  beforeEach(() => {
    lsMock.clear(); ssMock.clear(); authMock.uid = "alice";
  });
  afterEach(() => { lsMock.clear(); ssMock.clear(); });

  it("reuses the UID-scoped persisted salt instead of regenerating it", async () => {
    lsMock.setItem(saltKey("alice"), "alice-salt");
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.masterSalt).toBe("alice-salt"));
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBeNull();
  });

  it("persists a newly generated salt into the UID namespace on first run", async () => {
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.masterSalt).not.toBeNull());
    const stored = lsMock.getItem(saltKey("alice"));
    expect(stored).toBeTruthy();
    expect(result.current.masterSalt).toBe(stored);
    expect(atob(stored as string).length).toBe(16);
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBeNull();
  });

  it("keeps the same salt across remounts for the same user", async () => {
    const first = renderHook(() => useE2EE());
    await waitFor(() => expect(first.result.current.masterSalt).not.toBeNull());
    const original = first.result.current.masterSalt;
    first.unmount();

    const second = renderHook(() => useE2EE());
    await waitFor(() => expect(second.result.current.masterSalt).toBe(original));
  });

  it("isolates salts across different accounts (no cross-account claim)", async () => {
    lsMock.setItem(saltKey("alice"), "alice-salt");
    const alice = renderHook(() => useE2EE());
    await waitFor(() => expect(alice.result.current.masterSalt).toBe("alice-salt"));
    alice.unmount();

    authMock.uid = "bob";
    const bob = renderHook(() => useE2EE());
    await waitFor(() => expect(bob.result.current.masterSalt).not.toBeNull());
    expect(bob.result.current.masterSalt).not.toBe("alice-salt");
    expect(lsMock.getItem(saltKey("bob"))).toBe(bob.result.current.masterSalt);
    expect(lsMock.getItem(saltKey("alice"))).toBe("alice-salt");
  });

  it("does not auto-claim a legacy device-global salt for a new account", async () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-device-salt");
    const { result } = renderHook(() => useE2EE());
    await waitFor(() => expect(result.current.masterSalt).not.toBeNull());
    expect(result.current.masterSalt).not.toBe("legacy-device-salt");
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBe("legacy-device-salt");
  });
});
