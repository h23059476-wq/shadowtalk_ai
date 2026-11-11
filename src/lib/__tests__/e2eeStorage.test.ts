/**
 * Batch 3 — E2EE storage isolation + safe legacy recovery.
 *
 * Exercises the real e2eeStorage module (no React, no hook) against independent
 * localStorage/sessionStorage mocks so UID scoping, legacy preservation, and
 * the passphrase-verified recovery flow can be asserted precisely.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Independent storage mocks so localStorage ≠ sessionStorage.
const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};
const lsMock = makeStorage();
const ssMock = makeStorage();

vi.stubGlobal("localStorage", lsMock);
vi.stubGlobal("sessionStorage", ssMock);

import {
  e2eeSaltKey, e2eeFingerprintKey, e2eeSessionKeyKey, e2eeActiveKey,
  readSalt, writeSalt, readFingerprint, writeFingerprint,
  readSessionKey, writeSessionKey, readSessionActive, clearSessionKey,
  readLegacySalt, readLegacyFingerprint,
  verifyLegacyE2eeOwnership, commitLegacyE2eeRecovery,
} from "@/lib/e2eeStorage";

describe("e2eeStorage UID-scoped keys", () => {
  beforeEach(() => { lsMock.clear(); ssMock.clear(); });
  afterEach(() => { lsMock.clear(); ssMock.clear(); });

  it("embeds the uid in every storage key", () => {
    expect(e2eeSaltKey("alice")).toBe("shadowtalk_e2e_salt_alice");
    expect(e2eeFingerprintKey("alice")).toBe("shadowtalk_e2e_fingerprint_alice");
    expect(e2eeSessionKeyKey("alice")).toBe("shadowtalk_e2e_key_alice");
    expect(e2eeActiveKey("alice")).toBe("shadowtalk_e2e_active_alice");
  });

  it("uses a guest suffix when uid is null", () => {
    expect(e2eeSaltKey(null)).toBe("shadowtalk_e2e_salt_guest");
    expect(e2eeFingerprintKey(null)).toBe("shadowtalk_e2e_fingerprint_guest");
  });

  it("reads and writes salt in the UID namespace only", () => {
    writeSalt("alice", "alice-salt");
    expect(readSalt("alice")).toBe("alice-salt");
    expect(readSalt("bob")).toBeNull();
    // Legacy device-global key untouched.
    expect(lsMock.getItem("shadowtalk_e2e_salt")).toBeNull();
  });

  it("isolates fingerprints across accounts", () => {
    writeFingerprint("alice", "fp-alice");
    expect(readFingerprint("alice")).toBe("fp-alice");
    expect(readFingerprint("bob")).toBeNull();
  });

  it("stores session keys in sessionStorage and clears them independently", () => {
    writeSessionKey("alice", "raw-key-base64");
    expect(readSessionKey("alice")).toBe("raw-key-base64");
    expect(readSessionActive("alice")).toBe(true);
    clearSessionKey("alice");
    expect(readSessionKey("alice")).toBeNull();
    expect(readSessionActive("alice")).toBe(false);
    // Salt/fingerprint (localStorage) untouched by clearSessionKey.
    writeSalt("alice", "alice-salt");
    clearSessionKey("alice");
    expect(readSalt("alice")).toBe("alice-salt");
  });
});

describe("e2eeStorage legacy readers never delete", () => {
  beforeEach(() => { lsMock.clear(); });
  afterEach(() => { lsMock.clear(); });

  it("reads legacy salt/fingerprint when present", () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint", "legacy-fp");
    expect(readLegacySalt()).toBe("legacy-salt");
    expect(readLegacyFingerprint()).toBe("legacy-fp");
  });

  it("returns null when legacy material is absent", () => {
    expect(readLegacySalt()).toBeNull();
    expect(readLegacyFingerprint()).toBeNull();
  });
});

describe("verifyLegacyE2eeOwnership", () => {
  beforeEach(() => { lsMock.clear(); });
  afterEach(() => { lsMock.clear(); });

  // A deterministic hash mock: returns "fp:<passphrase>:<salt>" so we can
  // simulate correct vs wrong passphrases.
  const hashMock = async (pw: string, salt: string) => `fp:${pw}:${salt}`;

  it("refuses recovery when there is no legacy salt", async () => {
    const r = await verifyLegacyE2eeOwnership("pw", hashMock);
    expect(r.recoverable).toBe(false);
    expect((r as { recoverable: false; reason: string }).reason).toBe("no_legacy_salt");
  });

  it("refuses recovery when there is a salt but no fingerprint", async () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    const r = await verifyLegacyE2eeOwnership("pw", hashMock);
    expect(r.recoverable).toBe(false);
    expect((r as { recoverable: false; reason: string }).reason).toBe("no_legacy_fingerprint");
    expect(readLegacySalt()).toBe("legacy-salt");
  });

  it("refuses recovery when the passphrase does not match the fingerprint", async () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint", "fp:correct-pass:legacy-salt");
    const r = await verifyLegacyE2eeOwnership("wrong-pass", hashMock);
    expect(r.recoverable).toBe(false);
    expect((r as { recoverable: false; reason: string }).reason).toBe("wrong_passphrase");
    expect(readLegacySalt()).toBe("legacy-salt");
    expect(readLegacyFingerprint()).toBe("fp:correct-pass:legacy-salt");
  });

  it("returns the verified material when the passphrase matches", async () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint", "fp:correct-pass:legacy-salt");
    const r = await verifyLegacyE2eeOwnership("correct-pass", hashMock);
    expect(r.recoverable).toBe(true);
    if (r.recoverable) {
      expect(r.salt).toBe("legacy-salt");
      expect(r.fingerprint).toBe("fp:correct-pass:legacy-salt");
    }
    // Verify does NOT commit — UID namespace still empty.
    expect(readSalt("alice")).toBeNull();
    expect(readFingerprint("alice")).toBeNull();
  });
});

describe("commitLegacyE2eeRecovery", () => {
  beforeEach(() => { lsMock.clear(); });
  afterEach(() => { lsMock.clear(); });

  it("copies verified material into the UID namespace for a fresh account", () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint", "legacy-fp");
    const ok = commitLegacyE2eeRecovery("alice", "legacy-salt", "legacy-fp");
    expect(ok).toBe(true);
    expect(readSalt("alice")).toBe("legacy-salt");
    expect(readFingerprint("alice")).toBe("legacy-fp");
    expect(readLegacySalt()).toBe("legacy-salt");
    expect(readLegacyFingerprint()).toBe("legacy-fp");
  });

  it("is idempotent — re-committing the same material is a no-op success", () => {
    commitLegacyE2eeRecovery("alice", "legacy-salt", "legacy-fp");
    const ok = commitLegacyE2eeRecovery("alice", "legacy-salt", "legacy-fp");
    expect(ok).toBe(true);
    expect(readSalt("alice")).toBe("legacy-salt");
    expect(readFingerprint("alice")).toBe("legacy-fp");
  });

  it("refuses to overwrite an existing account's different material", () => {
    writeSalt("alice", "alice-own-salt");
    writeFingerprint("alice", "alice-own-fp");
    const ok = commitLegacyE2eeRecovery("alice", "legacy-salt", "legacy-fp");
    expect(ok).toBe(false);
    expect(readSalt("alice")).toBe("alice-own-salt");
    expect(readFingerprint("alice")).toBe("alice-own-fp");
  });

  it("resumes an interrupted migration (salt written, fingerprint missing)", () => {
    writeSalt("alice", "legacy-salt");
    const ok = commitLegacyE2eeRecovery("alice", "legacy-salt", "legacy-fp");
    expect(ok).toBe(true);
    expect(readFingerprint("alice")).toBe("legacy-fp");
  });

  it("never deletes the legacy keys after a successful commit", () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint", "legacy-fp");
    commitLegacyE2eeRecovery("alice", "legacy-salt", "legacy-fp");
    expect(readLegacySalt()).toBe("legacy-salt");
    expect(readLegacyFingerprint()).toBe("legacy-fp");
  });

  it("a second account cannot claim the same legacy vault without the passphrase", async () => {
    lsMock.setItem("shadowtalk_e2e_salt", "legacy-salt");
    lsMock.setItem("shadowtalk_e2e_fingerprint", "fp:right:legacy-salt");
    const r1 = await verifyLegacyE2eeOwnership("right", async (p, s) => `fp:${p}:${s}`);
    expect(r1.recoverable).toBe(true);
    if (r1.recoverable) commitLegacyE2eeRecovery("alice", r1.salt, r1.fingerprint);

    const r2 = await verifyLegacyE2eeOwnership("wrong", async (p, s) => `fp:${p}:${s}`);
    expect(r2.recoverable).toBe(false);
    expect(readSalt("bob")).toBeNull();
    expect(readSalt("alice")).toBe("legacy-salt");
    expect(readLegacySalt()).toBe("legacy-salt");
  });
});
