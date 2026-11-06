import { useState, useCallback, useEffect, useRef } from 'react';
import {
  deriveKey,
  encrypt,
  decrypt,
  generateSalt,
  generateIV,
  arrayToBase64,
  base64ToArray,
  hashForVerification
} from '@/lib/e2e-encryption';
import {
  readSalt,
  writeSalt,
  readFingerprint,
  writeFingerprint,
  clearSessionKey,
  readLegacySalt,
  readLegacyFingerprint,
  verifyLegacyE2eeOwnership,
  commitLegacyE2eeRecovery,
  type LegacyRecoveryResult,
} from '@/lib/e2eeStorage';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

/**
 * World-Class End-to-End Encryption (E2EE) Hook
 * Manages the Master Security Key and provides encryption/decryption services.
 * Security Protocol: PBKDF2 (100k iterations) + AES-256-GCM
 *
 * Batch 3: all vault material is UID-namespaced via @/lib/e2eeStorage. The hook
 * never silently reads or writes the legacy device-global keys, so a different
 * account signing in on the same browser can never auto-claim another
 * account's vault. Vault state resets whenever the authenticated UID changes
 * (sign-out, account switch) so no master key or fingerprint leaks across
 * accounts.
 *
 * Final completion phase changes:
 *
 * 1. REMOVED the dead session-key persistence path. The previous code tried
 *    crypto.subtle.exportKey("raw", ...) on a non-extractable key, which
 *    always throws, and then tried to restore from the never-written storage.
 *    Both halves were misleading no-ops. We intentionally do NOT make the key
 *    extractable to persist it — a raw AES key in sessionStorage would weaken
 *    the encryption posture. Session encryption is therefore strictly
 *    per-engagement: after a reload the vault is locked and private mode must
 *    be re-enabled.
 *
 * 2. ADDED passphrase-verified legacy vault recovery. When the signed-in user
 *    has no vault of their own yet but device-global legacy material exists
 *    (pre-UID-namespacing builds), the hook does NOT auto-create a fresh salt
 *    (that would silently orphan the legacy ciphertext forever). Instead it
 *    exposes `legacyVaultAvailable` so the UI can offer recovery: the user
 *    proves ownership with the legacy passphrase (verified against the legacy
 *    fingerprint), explicitly consents, and only then is the material copied
 *    into the UID namespace and the legacy key re-derived. Declining keeps
 *    the old auto-create behavior (fresh vault). Legacy keys are never
 *    deleted and an existing UID vault is never overwritten.
 */

interface E2EEState {
  isUnlocked: boolean;
  masterKey: CryptoKey | null;
  masterSalt: string | null;
  keyFingerprint: string | null;
  /** True when legacy device-global material exists and this account has no
   *  vault yet — the UI may offer passphrase-verified recovery. */
  legacyVaultAvailable: boolean;
}

export const useE2EE = () => {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [state, setState] = useState<E2EEState>({
    isUnlocked: false,
    masterKey: null,
    masterSalt: null,
    keyFingerprint: null,
    legacyVaultAvailable: false,
  });

  // Track the uid the current in-memory vault was built for so we can reset
  // when the authenticated user changes (sign-out → null, or A → B switch).
  const vaultUid = useRef<string | null>(null);

  const clearVaultSession = useCallback(() => {
    clearSessionKey(vaultUid.current);
  }, []);

  // Initialize / reset the UID-scoped vault when the authenticated user
  // changes. On a uid change we drop any in-memory master key + fingerprint so
  // account A's key can never be used while account B is signed in.
  useEffect(() => {
    if (vaultUid.current !== uid) {
      // Reset in-memory vault state for the new user (or guest / signed-out).
      setState({ isUnlocked: false, masterKey: null, masterSalt: null, keyFingerprint: null, legacyVaultAvailable: false });
      vaultUid.current = uid;
    }

    if (!state.masterSalt) {
      // Reuse the UID-scoped persisted salt so previously derived keys and the
      // stored fingerprint stay valid across sessions. A fresh salt per mount
      // would orphan all existing ciphertext for this account.
      const existingSalt = readSalt(uid);
      if (existingSalt) {
        setState((prev) => ({ ...prev, masterSalt: existingSalt }));
        return;
      }

      // Legacy vault present and this account has no vault of its own yet?
      // Defer salt creation — auto-creating here would permanently orphan the
      // legacy ciphertext. The UI offers passphrase-verified recovery via
      // recoverLegacyVault(); declining engages a fresh vault (previous
      // behavior). Guests keep the old auto-create path (their vault identity
      // is ephemeral and legacy recovery is account-scoped).
      if (uid && readLegacySalt() && readLegacyFingerprint()) {
        setState((prev) => ({ ...prev, legacyVaultAvailable: true }));
        return;
      }

      const newSalt = arrayToBase64(generateSalt());
      writeSalt(uid, newSalt);
      setState((prev) => ({ ...prev, masterSalt: newSalt }));
      return;
    }
  }, [uid, state.masterSalt]);

  /**
   * Recover the legacy device-global vault after passphrase verification and
   * explicit user consent (the caller must render a consent UI before calling
   * this). On success the vault is UNLOCKED with the legacy key, so existing
   * legacy ciphertext becomes readable again.
   *
   * Refuses when:
   *  - the passphrase does not match the legacy fingerprint (wrong_passphrase),
   *  - the legacy material is incomplete (no salt / no fingerprint), or
   *  - this account already holds DIFFERENT vault material (never overwrite).
   */
  const recoverLegacyVault = useCallback(async (passphrase: string): Promise<boolean> => {
    const currentUid = vaultUid.current;
    if (!currentUid) {
      toast.error("Sign in to recover a legacy encrypted vault.");
      return false;
    }
    try {
      const result = await verifyLegacyE2eeOwnership(passphrase, hashForVerification);
      if (!result.recoverable) {
        // Explicit cast: TS narrowing on the negated literal discriminant is
        // unreliable across compiler versions here.
        const refusal = result as Extract<LegacyRecoveryResult, { recoverable: false }>;
        toast.error(
          refusal.reason === "wrong_passphrase"
            ? "Incorrect passphrase — legacy vault recovery denied."
            : "No recoverable legacy vault was found on this device.",
        );
        return false;
      }

      const committed = commitLegacyE2eeRecovery(currentUid, result.salt, result.fingerprint);
      if (!committed) {
        toast.error("This account already has its own vault — recovery was refused to protect it.");
        return false;
      }

      // Re-derive the working key from the verified legacy passphrase + salt
      // so ciphertext encrypted under the legacy vault decrypts again.
      const key = await deriveKey(passphrase, base64ToArray(result.salt));
      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        masterKey: key,
        masterSalt: result.salt,
        keyFingerprint: result.fingerprint,
        legacyVaultAvailable: false,
      }));
      return true;
    } catch (error) {
      console.error("[E2EE] Legacy recovery failed:", error);
      toast.error("Legacy vault recovery failed.");
      return false;
    }
  }, []);

  /**
   * Unlock the E2EE engine with the user's master passphrase.
   * Verifies the passphrase against the UID-scoped fingerprint.
   */
  const unlock = useCallback(async (passphrase: string) => {
    try {
      if (!state.masterSalt) throw new Error("Encryption engine not initialized");

      const saltArr = base64ToArray(state.masterSalt);
      const key = await deriveKey(passphrase, saltArr);
      const fingerprint = await hashForVerification(passphrase, state.masterSalt);

      const existingFingerprint = readFingerprint(vaultUid.current);
      if (existingFingerprint && existingFingerprint !== fingerprint) {
        toast.error("Incorrect security passphrase. Access denied.");
        return false;
      }

      if (!existingFingerprint) {
        writeFingerprint(vaultUid.current, fingerprint);
      }

      setState(prev => ({
        ...prev,
        isUnlocked: true,
        masterKey: key,
        keyFingerprint: fingerprint
      }));

      toast.success("Security engine engaged. ShadowTalk is now E2EE protected.");
      return true;
    } catch (error) {
      console.error("[E2EE] Unlock failed:", error);
      toast.error("Failed to engage encryption engine.");
      return false;
    }
  }, [state.masterSalt]);

  /**
   * One-click session encryption (random key, no passphrase prompt).
   * Salt + (when first set) fingerprint are written to the UID namespace.
   * The key itself lives ONLY in memory — never persisted (see file header).
   */
  const engageSessionEncryption = useCallback(async () => {
    try {
      let salt = state.masterSalt;
      if (!salt) {
        salt = arrayToBase64(generateSalt());
        writeSalt(vaultUid.current, salt);
        setState((prev) => ({ ...prev, masterSalt: salt, legacyVaultAvailable: false }));
      }

      const entropy = crypto.getRandomValues(new Uint8Array(32));
      const passphrase = arrayToBase64(entropy);
      const key = await deriveKey(passphrase, base64ToArray(salt));

      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        masterKey: key,
        masterSalt: salt,
        legacyVaultAvailable: false,
      }));
      return true;
    } catch (error) {
      console.error("[E2EE] Session encryption engage failed:", error);
      return false;
    }
  }, [state.masterSalt]);

  const lock = useCallback(() => {
    setState(prev => ({ ...prev, isUnlocked: false, masterKey: null }));
    clearVaultSession();
    toast.info("Security engine disengaged.");
  }, [clearVaultSession]);

  const encryptData = useCallback(async (plaintext: string): Promise<{ data: string, iv: string } | null> => {
    if (!state.isUnlocked || !state.masterKey) {
      console.warn("[E2EE] Attempted encryption while locked");
      return null;
    }

    try {
      const iv = generateIV();
      const encrypted = await encrypt(plaintext, state.masterKey, iv);
      return {
        data: encrypted,
        iv: arrayToBase64(iv)
      };
    } catch (error) {
      console.error("[E2EE] Encryption failed:", error);
      return null;
    }
  }, [state.isUnlocked, state.masterKey]);

  const decryptData = useCallback(async (ciphertext: string, ivBase64: string): Promise<string | null> => {
    if (!state.isUnlocked || !state.masterKey) {
      return `[ENCRYPTED:${ciphertext.slice(0, 8)}...]`;
    }

    try {
      const iv = base64ToArray(ivBase64);
      return await decrypt(ciphertext, state.masterKey, iv);
    } catch (error) {
      console.error("[E2EE] Decryption failed:", error);
      return "[DECRYPTION_ERROR]";
    }
  }, [state.isUnlocked, state.masterKey]);

  const isEncrypted = (text: string) => text.startsWith('e2e:');
  const wrapEncrypted = (data: string, iv: string) => `e2e:${iv}:${data}`;
  const unwrapEncrypted = (wrapped: string) => {
    if (!wrapped.startsWith('e2e:')) return null;
    const parts = wrapped.split(':');
    return { iv: parts[1], data: parts[2] };
  };

  return {
    ...state,
    unlock,
    lock,
    engageSessionEncryption,
    recoverLegacyVault,
    encryptData,
    decryptData,
    isEncrypted,
    wrapEncrypted,
    unwrapEncrypted
  };
};
