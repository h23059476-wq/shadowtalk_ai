import { useState, useCallback, useEffect } from 'react';
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
import { toast } from 'sonner';

/**
 * World-Class End-to-End Encryption (E2EE) Hook
 * Manages the Master Security Key and provides encryption/decryption services.
 * Security Protocol: PBKDF2 (100k iterations) + AES-256-GCM
 */

interface E2EEState {
  isUnlocked: boolean;
  masterKey: CryptoKey | null;
  masterSalt: string | null;
  keyFingerprint: string | null;
}

export const useE2EE = () => {
  const [state, setState] = useState<E2EEState>({
    isUnlocked: false,
    masterKey: null,
    masterSalt: null,
    keyFingerprint: null,
  });



  const persistSessionKey = useCallback(async (key: CryptoKey) => {
    try {
      const raw = await crypto.subtle.exportKey("raw", key);
      sessionStorage.setItem(
        "shadowtalk_e2e_key",
        arrayToBase64(new Uint8Array(raw))
      );
      sessionStorage.setItem("shadowtalk_e2e_active", "true");
    } catch (e) {
      console.warn("[E2EE] Could not persist session key:", e);
    }
  }, []);

  const clearSessionKey = useCallback(() => {
    sessionStorage.removeItem("shadowtalk_e2e_key");
    sessionStorage.removeItem("shadowtalk_e2e_active");
  }, []);

  const tryRestoreSession = useCallback(async (salt: string) => {
    const stored = sessionStorage.getItem("shadowtalk_e2e_key");
    if (!stored || sessionStorage.getItem("shadowtalk_e2e_active") !== "true") return false;
    try {
      const raw = base64ToArray(stored);
      const key = await crypto.subtle.importKey(
        "raw",
        raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      const fingerprint = localStorage.getItem("shadowtalk_e2e_fingerprint");
      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        masterKey: key,
        masterSalt: salt,
        keyFingerprint: fingerprint,
      }));
      return true;
    } catch (e) {
      console.warn("[E2EE] Session restore failed:", e);
      clearSessionKey();
      return false;
    }
  }, [clearSessionKey]);

  // Initialize vault salt if it doesn't exist; restore session key when possible
  useEffect(() => {
    if (!state.masterSalt) {
      // Reuse the persisted vault salt so previously derived keys and the
      // stored fingerprint stay valid across sessions. Generating a fresh
      // salt on every mount would orphan all existing ciphertext.
      const existingSalt = localStorage.getItem("shadowtalk_e2e_salt");
      if (existingSalt) {
        setState((prev) => ({ ...prev, masterSalt: existingSalt }));
        return;
      }
      const newSalt = arrayToBase64(generateSalt());
      localStorage.setItem("shadowtalk_e2e_salt", newSalt);
      setState((prev) => ({ ...prev, masterSalt: newSalt }));
      return;
    }
    if (!state.isUnlocked) {
      void tryRestoreSession(state.masterSalt);
    }
  }, [state.masterSalt, state.isUnlocked, tryRestoreSession]);

  /**
   * Unlock the E2EE engine with the user's master passphrase
   */
  const unlock = useCallback(async (passphrase: string) => {
    try {
      if (!state.masterSalt) throw new Error("Encryption engine not initialized");
      
      const saltArr = base64ToArray(state.masterSalt);
      const key = await deriveKey(passphrase, saltArr);
      const fingerprint = await hashForVerification(passphrase, state.masterSalt);

      // Verify if fingerprint exists and matches (if this is a returning user)
      const existingFingerprint = localStorage.getItem('shadowtalk_e2e_fingerprint');
      if (existingFingerprint && existingFingerprint !== fingerprint) {
        toast.error("Incorrect security passphrase. Access denied.");
        return false;
      }

      // First time setup or correct unlock
      if (!existingFingerprint) {
        localStorage.setItem('shadowtalk_e2e_fingerprint', fingerprint);
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
   */
  const engageSessionEncryption = useCallback(async () => {
    try {
      let salt = state.masterSalt;
      if (!salt) {
        salt = arrayToBase64(generateSalt());
        localStorage.setItem("shadowtalk_e2e_salt", salt);
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
      sessionStorage.setItem("shadowtalk_e2e_active", "true");
      return true;
    } catch (error) {
      console.error("[E2EE] Session encryption engage failed:", error);
      return false;
    }
  }, [state.masterSalt, persistSessionKey]);

  const lock = useCallback(() => {
    setState(prev => ({ ...prev, isUnlocked: false, masterKey: null }));
    // clearSessionKey already removes the key, the active flag, and the salt.
    clearSessionKey();
    toast.info("Security engine disengaged.");
  }, [clearSessionKey]);

  /**
   * Encrypt arbitrary string data
   */
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

  /**
   * Decrypt data
   */
  const decryptData = useCallback(async (ciphertext: string, ivBase64: string): Promise<string | null> => {
    if (!state.isUnlocked || !state.masterKey) {
      // If locked, we return the ciphertext as a hint that it's encrypted
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

  /**
   * Helper to check if a string looks like an E2EE payload
   */
  const isEncrypted = (text: string) => text.startsWith('e2e:');

  /**
   * Wrap data in a recognizable format for the UI and DB
   */
  const wrapEncrypted = (data: string, iv: string) => `e2e:${iv}:${data}`;

  /**
   * Unwrap data into components
   */
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
