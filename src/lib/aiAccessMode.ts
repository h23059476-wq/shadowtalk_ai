import { fbAuth } from "@/integrations/firebase/app";
import { backend } from "@/integrations/local/client";

export type AiAccessMode = "byok" | "shared";

const SETTING_KEY = "ai_access_mode";
const CACHE_PREFIX = "shadowtalk.ai-access-mode.v1";

function cacheKey(uid: string): string {
  return `${CACHE_PREFIX}.${uid}`;
}

function readMode(value: unknown): AiAccessMode | null {
  if (typeof value === "string") {
    return value === "byok" || value === "shared" ? value : null;
  }
  if (value && typeof value === "object" && "mode" in value) {
    const mode = (value as { mode?: unknown }).mode;
    return mode === "byok" || mode === "shared" ? mode : null;
  }
  return null;
}

export function getCachedAiAccessMode(uid = fbAuth().currentUser?.uid): AiAccessMode | null {
  if (!uid || typeof localStorage === "undefined") return null;
  try {
    return readMode(localStorage.getItem(cacheKey(uid)));
  } catch {
    return null;
  }
}

export async function loadAiAccessMode(uid: string): Promise<AiAccessMode | null> {
  // Check localStorage cache first — this survives Firestore read failures
  // (permission errors on legacy docs, network issues, etc.) and lets the
  // user proceed with their cached mode.
  const cached = getCachedAiAccessMode(uid);
  if (cached) {
    // Still try to refresh from Firestore in the background, but don't block.
    void refreshFromFirestore(uid).catch(() => {});
    return cached;
  }

  // No cache — must read from Firestore. If this fails, return null (user
  // will be prompted to choose their mode again).
  try {
    const { data, error } = await backend
      .from("user_settings")
      .select("setting_value")
      .eq("user_id", uid)
      .eq("setting_key", SETTING_KEY)
      .maybeSingle();

    if (error) throw error;

    const mode = readMode(data?.setting_value);
    if (mode) {
      try {
        localStorage.setItem(cacheKey(uid), mode);
      } catch {
        // Firestore remains the source of truth when browser storage is unavailable.
      }
    }
    return mode;
  } catch (err) {
    console.warn("[aiAccessMode] load failed, no cache available:", err);
    return null;
  }
}

/** Background refresh from Firestore — non-throwing. */
async function refreshFromFirestore(uid: string): Promise<void> {
  const { data, error } = await backend
    .from("user_settings")
    .select("setting_value")
    .eq("user_id", uid)
    .eq("setting_key", SETTING_KEY)
    .maybeSingle();
  if (error) return;
  const mode = readMode(data?.setting_value);
  if (mode) {
    try {
      localStorage.setItem(cacheKey(uid), mode);
    } catch {
      // ignore
    }
  }
}

export async function saveAiAccessMode(uid: string, mode: AiAccessMode): Promise<void> {
  const payload = {
    user_id: uid,
    setting_key: SETTING_KEY,
    setting_value: { mode },
    updated_at: new Date().toISOString(),
  };

  // Always cache to localStorage first — this guarantees the user can proceed
  // with BYOK/shared mode even if Firestore is unreachable or permissions block
  // the write (e.g. legacy user_settings doc without user_id failing the
  // update rule). The Firestore write below is best-effort.
  try {
    localStorage.setItem(cacheKey(uid), mode);
  } catch {
    // localStorage may be unavailable (private browsing) — non-fatal.
  }

  // Try the upsert. If it fails (permission error, network, legacy doc),
  // try a fresh insert as a fallback. If that also fails, the localStorage
  // cache above is enough for the current session — don't throw.
  try {
    const { error } = await backend.from("user_settings").upsert(payload, {
      onConflict: "user_id,setting_key",
    });
    if (error) throw error;
    return;
  } catch (upsertErr) {
    console.warn("[aiAccessMode] upsert failed, trying fresh insert:", upsertErr);
  }

  // Fallback: insert a new doc (the upsert's SELECT may have found a legacy
  // doc it couldn't update). This creates a duplicate, but loadAiAccessMode
  // uses .maybeSingle() which returns the first match — and the new doc has
  // the correct user_id, so future reads will work.
  try {
    const { error: insertError } = await backend
      .from("user_settings")
      .insert(payload);
    if (insertError) {
      console.warn("[aiAccessMode] fresh insert also failed:", insertError);
      // Don't throw — localStorage cache is sufficient for the current session.
      // The mode will sync to Firestore on the next successful save.
    }
  } catch (insertErr) {
    console.warn("[aiAccessMode] fresh insert exception:", insertErr);
    // Don't throw — localStorage cache is sufficient.
  }
}

// ---------------------------------------------------------------------------
// Batch 4 — prefer-local wiring.
//
// A UID-scoped boolean flag that, when true, tells AIProviderRouter to try the
// LocalAIProvider first (when it is available — i.e. the user has run
// OfflineSetup to download + load the model). Falls back to cloud when the
// local provider is unavailable or the model is not loaded.
//
// Default: false (BYOK-only architecture is preserved). The user must opt in
// explicitly via Settings → Chat & AI.
// ---------------------------------------------------------------------------

const PREFER_LOCAL_CACHE_PREFIX = "shadowtalk_prefer_local_v1";

function preferLocalCacheKey(uid: string): string {
  return `${PREFER_LOCAL_CACHE_PREFIX}.${uid}`;
}

export function getPreferLocal(uid = fbAuth().currentUser?.uid): boolean {
  if (!uid || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(preferLocalCacheKey(uid)) === "1";
  } catch {
    return false;
  }
}

export function setPreferLocal(uid: string, value: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(preferLocalCacheKey(uid), value ? "1" : "0");
  } catch {
    // ignore — non-fatal
  }
}
