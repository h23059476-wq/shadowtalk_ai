/**
 * E2EE storage helpers — UID-namespaced with safe legacy recovery.
 *
 * DESIGN (Batch 3):
 *
 * 1. NEW storage is scoped to the authenticated UID:
 *      shadowtalk_e2e_salt_<uid>          (localStorage — persistent salt)
 *      shadowtalk_e2e_fingerprint_<uid>   (localStorage — persistent fingerprint)
 *      shadowtalk_e2e_key_<uid>           (sessionStorage — ephemeral session key)
 *      shadowtalk_e2e_active_<uid>        (sessionStorage — ephemeral active flag)
 *    Guests (no authenticated UID) use a `_guest` suffix so their ephemeral
 *    vault never collides with any authenticated account.
 *
 * 2. LEGACY device-global keys (shadowtalk_e2e_salt / _fingerprint without a
 *    UID suffix) are NEVER read by the live E2EE hook and NEVER deleted. They
 *    are only consulted by `verifyLegacyE2eeOwnership()` during the explicit,
 *    consent-gated recovery flow. This prevents the "first account to sign in
 *    claims the device-wide vault" vulnerability.
 *
 * 3. Safe legacy recovery flow (passphrase-verified):
 *      a. verifyLegacyE2eeOwnership(passphrase) reads the legacy salt +
 *         fingerprint and re-derives the fingerprint from the supplied
 *         passphrase. If the legacy material is missing OR the passphrase does
 *         not match the stored fingerprint, recovery is refused — the legacy
 *         material stays untouched.
 *      b. Only after the caller has obtained explicit user consent may it call
 *         commitLegacyE2eeRecovery(uid, salt, fingerprint), which copies the
 *         verified salt + fingerprint into the UID namespace.
 *      c. commitLegacyE2eeRecovery is idempotent and never overwrites an
 *         existing account's material; it never deletes the legacy keys.
 *
 * 4. Never weaken encryption or bypass passphrase verification. The recovery
 *    flow only copies material that the user has proven they can unlock (via
 *    the matching passphrase); it does not grant access to ciphertext the
 *    user could not already decrypt.
 */

// Legacy device-global keys (preserved untouched; only read by recovery flow).
const LEGACY_SALT_KEY = "shadowtalk_e2e_salt";
const LEGACY_FINGERPRINT_KEY = "shadowtalk_e2e_fingerprint";

const GUEST_SUFFIX = "guest";

/** Build the UID-scoped salt key. Guests use a fixed `_guest` suffix. */
export function e2eeSaltKey(uid: string | null): string {
  return `shadowtalk_e2e_salt_${uid ?? GUEST_SUFFIX}`;
}

/** Build the UID-scoped fingerprint key. */
export function e2eeFingerprintKey(uid: string | null): string {
  return `shadowtalk_e2e_fingerprint_${uid ?? GUEST_SUFFIX}`;
}

/** Build the UID-scoped ephemeral session-key key (sessionStorage). */
export function e2eeSessionKeyKey(uid: string | null): string {
  return `shadowtalk_e2e_key_${uid ?? GUEST_SUFFIX}`;
}

/** Build the UID-scoped ephemeral active-flag key (sessionStorage). */
export function e2eeActiveKey(uid: string | null): string {
  return `shadowtalk_e2e_active_${uid ?? GUEST_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// UID-scoped readers / writers (used by the live useE2EE hook).
// These NEVER touch the legacy keys.
// ---------------------------------------------------------------------------

export function readSalt(uid: string | null): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(e2eeSaltKey(uid));
}

export function writeSalt(uid: string | null, salt: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(e2eeSaltKey(uid), salt);
}

export function readFingerprint(uid: string | null): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(e2eeFingerprintKey(uid));
}

export function writeFingerprint(uid: string | null, fingerprint: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(e2eeFingerprintKey(uid), fingerprint);
}

export function readSessionKey(uid: string | null): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(e2eeSessionKeyKey(uid));
}

export function writeSessionKey(uid: string | null, rawBase64: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(e2eeSessionKeyKey(uid), rawBase64);
  sessionStorage.setItem(e2eeActiveKey(uid), "true");
}

export function readSessionActive(uid: string | null): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(e2eeActiveKey(uid)) === "true";
}

/** Clear only the ephemeral session key + active flag for a UID. */
export function clearSessionKey(uid: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(e2eeSessionKeyKey(uid));
  sessionStorage.removeItem(e2eeActiveKey(uid));
}

// ---------------------------------------------------------------------------
// Legacy material readers (recovery flow ONLY — never used by useE2EE).
// Legacy keys are never deleted.
// ---------------------------------------------------------------------------

/** Read the device-global legacy salt, if present. Returns null if absent. */
export function readLegacySalt(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LEGACY_SALT_KEY);
}

/** Read the device-global legacy fingerprint, if present. Returns null if absent. */
export function readLegacyFingerprint(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LEGACY_FINGERPRINT_KEY);
}

// ---------------------------------------------------------------------------
// Safe legacy recovery.
// ---------------------------------------------------------------------------

export type LegacyRecoveryReason =
  | "no_legacy_salt"
  | "no_legacy_fingerprint"
  | "wrong_passphrase";

export type LegacyRecoveryResult =
  | { recoverable: true; salt: string; fingerprint: string }
  | { recoverable: false; reason: LegacyRecoveryReason };

/**
 * Verify ownership of the legacy device-global vault by re-deriving the
 * fingerprint from the supplied passphrase and comparing it to the stored
 * legacy fingerprint. Returns the verified material WITHOUT committing — the
 * caller must obtain explicit user consent and then call
 * `commitLegacyE2eeRecovery()`.
 *
 * Recovery is refused when:
 *   - there is no legacy salt (`no_legacy_salt`), or
 *   - there is no legacy fingerprint (`no_legacy_fingerprint`) — without a
 *     fingerprint there is no way to prove the passphrase is correct, so we
 *     must not associate the legacy salt with any account, or
 *   - the derived fingerprint does not match the stored one (`wrong_passphrase`).
 *
 * In every refused case the legacy keys are left untouched.
 *
 * `hashForVerification` is injected so this module stays free of a hard
 * dependency on the crypto layer (and stays trivially unit-testable).
 */
export async function verifyLegacyE2eeOwnership(
  passphrase: string,
  hashForVerification: (password: string, salt: string) => Promise<string>,
): Promise<LegacyRecoveryResult> {
  const legacySalt = readLegacySalt();
  if (!legacySalt) return { recoverable: false, reason: "no_legacy_salt" };

  const legacyFingerprint = readLegacyFingerprint();
  if (!legacyFingerprint) {
    return { recoverable: false, reason: "no_legacy_fingerprint" };
  }

  const derived = await hashForVerification(passphrase, legacySalt);
  if (derived !== legacyFingerprint) {
    return { recoverable: false, reason: "wrong_passphrase" };
  }

  return { recoverable: true, salt: legacySalt, fingerprint: legacyFingerprint };
}

/**
 * Commit the verified legacy material into the authenticated user's UID
 * namespace. Safe-by-construction:
 *
 *  - Idempotent: if the UID namespace already holds matching material, this is
 *    a no-op that returns true.
 *  - Never overwrites: if the UID namespace already holds DIFFERENT material
 *    (e.g. another account already claimed this namespace), the commit is
 *    refused (returns false) to protect the existing account's vault.
 *  - Resumes interrupted migrations: if a previous commit wrote the salt but
 *    not the fingerprint (or vice-versa), this completes the missing field
 *    only when it matches the verified value.
 *  - Never deletes the legacy keys: the original material stays in place so
 *    the migration can be re-run or rolled back.
 *
 * Returns true when the UID namespace ends up holding the verified material,
 * false when the commit was refused to protect an existing account.
 */
export function commitLegacyE2eeRecovery(
  uid: string,
  salt: string,
  fingerprint: string,
): boolean {
  const existingSalt = readSalt(uid);
  const existingFingerprint = readFingerprint(uid);

  // Fully migrated already — idempotent success.
  if (existingSalt === salt && existingFingerprint === fingerprint) return true;

  // Refuse to overwrite an existing account's DIFFERENT material.
  if (existingSalt && existingSalt !== salt) return false;
  if (existingFingerprint && existingFingerprint !== fingerprint) return false;

  // Complete any missing field (resumes an interrupted migration).
  if (!existingSalt) writeSalt(uid, salt);
  if (!existingFingerprint) writeFingerprint(uid, fingerprint);

  // Legacy keys are intentionally left untouched for recoverability.
  return true;
}
