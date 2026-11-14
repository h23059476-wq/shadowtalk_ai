/**
 * Shared (platform-funded) image generation fallback.
 *
 * Calls the `generateImage` Firebase Function (functions/src/index.ts), which
 * runs on the platform's OpenRouter key pool with a per-user daily quota
 * (100 requests/day, shared with chat — enforced server-side, including the
 * `user_settings.ai_access_mode === "shared"` eligibility check).
 *
 * This module is the ONLY sanctioned client bridge to that Function. BYOK
 * image generation stays browser→provider in cloudImage.ts, and the routing
 * decision between the two lives in imageGen.ts — never call this module
 * directly from components.
 */
import { fbAuth, functionsBaseUrl } from "@/integrations/firebase/app";
import { getCachedAiAccessMode } from "@/lib/aiAccessMode";
import { decodeImageResult } from "@/lib/cloudImage";

/** Server-side cap, mirrored here so users get a clear error before the call. */
const MAX_SHARED_PROMPT_LENGTH = 4000;

/**
 * Whether the shared image fallback can be attempted right now: the Functions
 * base URL is configured, the user is signed in, and their cached access mode
 * is "shared". The Function re-validates everything server-side — this check
 * only avoids doomed requests.
 */
export function isSharedImageEligible(): boolean {
  if (!functionsBaseUrl) return false;
  if (!fbAuth().currentUser) return false;
  return getCachedAiAccessMode() === "shared";
}

/**
 * Generate an image through the shared server-side pool.
 * Returns an image URL or data URL (same contract as the BYOK path).
 */
export async function generateSharedImage(
  prompt: string,
  options: { referenceImage?: string; signal?: AbortSignal } = {},
): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Describe the image you want to generate.");
  if (trimmed.length > MAX_SHARED_PROMPT_LENGTH) {
    throw new Error(
      `The image prompt is too long for shared AI (${trimmed.length} characters). Shorten it to under ${MAX_SHARED_PROMPT_LENGTH.toLocaleString()} characters, or use your own API key (Settings → Personalization → BYOK) for long prompts.`,
    );
  }

  const idToken = await fbAuth().currentUser?.getIdToken().catch(() => null);
  if (!idToken) throw new Error("Sign in to use shared image generation.");

  let response: Response;
  try {
    response = await fetch(`${functionsBaseUrl}/generateImage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        prompt: trimmed,
        ...(options.referenceImage ? { referenceImage: options.referenceImage } : {}),
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(
      "Could not reach the shared image service (network failure). Check your connection and try again.",
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const serverMessage = typeof body?.error === "string" ? body.error : "";
    throw new Error(mapSharedImageError(response.status, serverMessage));
  }

  // The Function deliberately returns the OpenAI-ish shape
  // { data: [{ b64_json }] } where b64_json is a full image data URL —
  // decodeImageResult handles both shapes, so parsing stays consistent
  // between the BYOK and shared paths.
  return decodeImageResult(await response.json());
}

function mapSharedImageError(status: number, serverMessage: string): string {
  switch (status) {
    case 401:
      return "Your session expired. Sign in again to use shared image generation.";
    case 403:
      return (
        serverMessage ||
        "Shared image generation is only available in shared AI mode. Switch modes in AI setup, or add an OpenAI, OpenRouter or Google Gemini key in Settings → Personalization → BYOK."
      );
    case 429:
      return "Daily shared AI limit reached (100 requests). Your limit resets at 00:00 UTC — or add your own key in Settings → Personalization → BYOK for unlimited images.";
    case 503:
      return (
        serverMessage ||
        "Shared image generation is temporarily unavailable. Try again shortly, or add your own OpenAI, OpenRouter or Google Gemini key in Settings → Personalization → BYOK."
      );
    default:
      return (
        serverMessage ||
        `Shared image generation failed (${status}). Try again, or add your own OpenAI, OpenRouter or Google Gemini key in Settings → Personalization → BYOK.`
      );
  }
}
