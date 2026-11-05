/**
 * Regression: the E2EE vault salt must be REUSED from localStorage instead of
 * regenerated on every mount — a fresh salt per session orphaned all
 * previously derived keys and invalidated the stored fingerprint.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

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

import { useE2EE } from "@/hooks/useE2EE";

const SALT_KEY = "shadowtalk_e2e_salt";

describe("useE2EE vault salt persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("reuses the persisted salt instead of regenerating it", async () => {
    localStorage.setItem(SALT_KEY, "existing-salt-value");

    const { result } = renderHook(() => useE2EE());

    await waitFor(() => expect(result.current.masterSalt).not.toBeNull());
    expect(result.current.masterSalt).toBe("existing-salt-value");
    expect(localStorage.getItem(SALT_KEY)).toBe("existing-salt-value");
  });

  it("persists a newly generated salt on first run", async () => {
    const { result } = renderHook(() => useE2EE());

    await waitFor(() => expect(result.current.masterSalt).not.toBeNull());
    const stored = localStorage.getItem(SALT_KEY);
    expect(stored).toBeTruthy();
    expect(result.current.masterSalt).toBe(stored);
    // 16 random bytes → 24 base64 chars (with padding)
    expect(atob(stored as string).length).toBe(16);
  });

  it("keeps the same salt across remounts", async () => {
    const first = renderHook(() => useE2EE());
    await waitFor(() => expect(first.result.current.masterSalt).not.toBeNull());
    const original = first.result.current.masterSalt;
    first.unmount();

    const second = renderHook(() => useE2EE());
    await waitFor(() => expect(second.result.current.masterSalt).not.toBeNull());
    expect(second.result.current.masterSalt).toBe(original);
  });
});
