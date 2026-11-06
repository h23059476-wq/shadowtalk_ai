/**
 * Sign-out local-data cleanup — the SMALLEST safe cleanup.
 *
 * Design (Batch 3):
 *
 * Sign-out clears EPHEMERAL authentication/session state only. It must NEVER:
 *   - delete BYOK configurations        (shadowtalk.byok.v2.<uid>)  — user data
 *   - delete persistent memory          (IndexedDB memory DBs)     — user data
 *   - delete user documents or files                                — user data
 *   - delete legacy E2EE material       (salt/fingerprint)         — recovery material
 *   - clear unrelated app preferences    (theme, language, etc.)   — UX state
 *   - destroy encryption recovery material
 *
 * What it DOES clear:
 *   - E2EE ephemeral session keys (sessionStorage) for the signing-out user
 *     AND the legacy device-global session keys, so a newly signed-in user
 *     never inherits a stale session key from a previous account in the same
 *     tab. These are sessionStorage values (die on tab close anyway) and are
 *     NOT the persistent salt/fingerprint, so clearing them does not weaken
 *     encryption or destroy recovery material.
 *
 * The persistent E2EE salt + fingerprint (localStorage) are intentionally
 * PRESERVED — they are the recovery material. They are UID-scoped via
 * e2eeStorage, so a different user signing in reads a different namespace.
 *
 * BYOK and memory isolation rely on UID-namespacing that already exists in the
 * codebase (see storage inventory in the Batch 3 report); sign-out does not
 * need to touch them.
 */
import { clearSessionKey } from "@/lib/e2eeStorage";

// Legacy device-global ephemeral session keys (sessionStorage). Cleared on
// sign-out as defense-in-depth so a pre-namespace session key can never be
// auto-restored for a different account. These are NOT the persistent
// salt/fingerprint and are NOT user data.
const LEGACY_SESSION_KEY = "shadowtalk_e2e_key";
const LEGACY_SESSION_ACTIVE = "shadowtalk_e2e_active";

/**
 * Clear ephemeral, user-scoped local state for the signing-out user.
 *
 * `uid` is the Firebase UID of the user who is signing out (captured BEFORE
 * backend.auth.signOut() runs, since currentUser becomes null afterwards).
 * Pass `null` for a guest sign-out (clears the guest namespace).
 *
 * This function is safe to call even when storage is unavailable. It never
 * throws.
 */
export function clearUserLocalData(uid: string | null): void {
  // 1. E2EE ephemeral session keys for this user (sessionStorage).
  try {
    clearSessionKey(uid);
  } catch {
    // sessionStorage may be unavailable (private mode, SSR) — ignore.
  }

  // 2. Legacy device-global ephemeral session keys (defense-in-depth).
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_ACTIVE);
    }
  } catch {
    // ignore
  }

  // INTENTIONALLY NOT CLEARED (preserved as user data / recovery material):
  //  - shadowtalk.byok.v2.<uid>          (BYOK config — UID-scoped, preserved)
  //  - shadowtalk_ai_v2.<uid>.*          (AIKey onboarding — UID-scoped, preserved)
  //  - shadowtalk_e2e_salt_<uid>         (persistent E2EE salt — recovery material)
  //  - shadowtalk_e2e_fingerprint_<uid>  (persistent E2EE fingerprint — recovery material)
  //  - IndexedDB memory DBs              (user data — see Batch 3 report)
  //  - shadowtalk_session_token          (device session id — preserved per PRESERVE list)
  //  - UI preferences (theme, language, layout, etc.)
}
