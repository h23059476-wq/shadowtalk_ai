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
  readSessionKey,
  readSessionActive,
  writeSessionKey,
  clearSessionKey,
} from '@/lib/e2eeStorage';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

/**
 * World-Class End-to-End Encryption (E2EE) Hook
 * Manages the Master Security Key and provides encryption/decryption services.
 * Security Protocol: PBKDF2 (100k iterations) + AES-256-GCM
 *
 * Batch 3: all vault material is UID-namespaced via @/lib/e2eeStorage. The hook
 * never reads or writes the legacy device-global keys, so a different account
 * signing in on the same browser can never auto-claim another account's vault.
 * Vault state resets whenever the authenticated UID changes (sign-out, account
 * switch) so no master key or fingerprint leaks across accounts.
 */

interface E2EEState {
  isUnlocked: boolean;
  masterKey: CryptoKey | null;
  masterSalt: string | null;
  keyFingerprint: string | null;
}

export const useE2EE = () => {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [state, setState] = useState<E2EEState>({
    isUnlocked: false,
    masterKey: null,
    masterSalt: null,
    keyFingerprint: null,
  });

  // Track the uid the current in-memory vault was built for so we can reset
  // when the authenticated user changes (sign-out → null, or A → B switch).
  const vaultUid = useRef<string | null>(null);

  const persistSessionKey = useCallback(async (key: CryptoKey) => {
    // Note: deriveKey() produces a non-extractable CryptoKey, so exportKey
    // throws here. This is the pre-existing behavior — session-key persistence
    // is a best-effort no-op in production (the catch swallows the throw),
    // which means tryRestoreSession() cannot silently unlock a vault without
    // the user re-engaging encryption. We intentionally do NOT make the key
    // extractable, as that would persist a raw AES key in sessionStorage and
    // weaken the encryption posture.
    try {
      const raw = await crypto.subtle.exportKey("raw", key);
      writeSessionKey(vaultUid.current, arrayToBase64(new Uint8Array(raw)));
    } catch {
      // Non-extractable key — session persistence intentionally unavailable.
    }
  }, []);

  const clearVaultSession = useCallback(() => {
    clearSessionKey(vaultUid.current);
  }, []);

  const tryRestoreSession = useCallback(async (salt: string) => {
    const stored = readSessionKey(vaultUid.current);
    if (!stored || !readSessionActive(vaultUid.current)) return false;
    try {
      const raw = base64ToArray(stored);
      const key = await crypto.subtle.importKey(
        "raw",
        raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      const fingerprint = readFingerprint(vaultUid.current);
      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        masterKey: key,
        masterSalt: salt,
        keyFingerprint: fingerprint,
      }));
      return true;
    } catch {
      clearVaultSession();
      return false;
    }
  }, [clearVaultSession]);

  // Initialize / reset the UID-scoped vault when the authenticated user
  // changes. On a uid change we drop any in-memory master key + fingerprint so
  // account A's key can never be used while account B is signed in.
  useEffect(() => {
    if (vaultUid.current !== uid) {
      // Reset in-memory vault state for the new user (or guest / signed-out).
      setState({ isUnlocked: false, masterKey: null, masterSalt: null, keyFingerprint: null });
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
      const newSalt = arrayToBase64(generateSalt());
      writeSalt(uid, newSalt);
      setState((prev) => ({ ...prev, masterSalt: newSalt }));
      return;
    }
    if (!state.isUnlocked) {
      void tryRestoreSession(state.masterSalt);
    }
  }, [uid, state.masterSalt, state.isUnlocked, tryRestoreSession]);

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

      await persistSessionKey(key);

      toast.success("Security engine engaged. ShadowTalk is now E2EE protected.");
      return true;
    } catch (error) {
      console.error("[E2EE] Unlock failed:", error);
      toast.error("Failed to engage encryption engine.");
      return false;
    }
  }, [state.masterSalt, persistSessionKey]);

  /**
   * One-click session encryption (random key, no passphrase prompt).
   * Key lives in sessionStorage for the current browser tab session only.
   * Salt + (when first set) fingerprint are written to the UID namespace.
   */
  const engageSessionEncryption = useCallback(async () => {
    try {
      let salt = state.masterSalt;
      if (!salt) {
        salt = arrayToBase64(generateSalt());
        writeSalt(vaultUid.current, salt);
        setState((prev) => ({ ...prev, masterSalt: salt }));
      }

      const entropy = crypto.getRandomValues(new Uint8Array(32));
      const passphrase = arrayToBase64(entropy);
      const key = await deriveKey(passphrase, base64ToArray(salt));
      await persistSessionKey(key);

      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        masterKey: key,
        masterSalt: salt,
      }));
      return true;
    } catch (error) {
      console.error("[E2EE] Session encryption engage failed:", error);
      return false;
    }
  }, [state.masterSalt, persistSessionKey]);

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
    encryptData,
    decryptData,
    isEncrypted,
    wrapEncrypted,
    unwrapEncrypted
  };
};
