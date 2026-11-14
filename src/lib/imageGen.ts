/**
 * Unified image-generation entry point.
 *
 * Resolution order:
 * 1. BYOK first — the user's own OpenAI / OpenRouter / Google Gemini key makes
 *    browser→provider calls (cloudImage.ts). The user's key is always
 *    preferred: no shared quota, no platform cost.
 * 2. Shared fallback — signed-in shared-mode users without an image-capable
 *    key go through the platform-funded `generateImage` Function
 *    (sharedImage.ts), which enforces its own 100/day quota server-side.
 *
 * The fallback is explicit and gated — there is no silent platform-funded
 * path. Provider rejections on the BYOK path (auth, quota, content policy)
 * always surface: retrying them on the shared pool would mask the user's own
 * setup problem.
 */
import {
  generateCloudImage,
  isCloudImageConfigured,
  type GenerateImageOptions,
} from "@/lib/cloudImage";
import { generateSharedImage, isSharedImageEligible } from "@/lib/sharedImage";

export type GeneratedImageSource = "byok" | "shared";

export interface GeneratedImage {
  imageUrl: string;
  source: GeneratedImageSource;
}

/** Shown when neither the BYOK nor the shared path is available. */
export const IMAGE_SETUP_ERROR =
  "Image generation needs a quick setup. Sign in, then either add an OpenAI, OpenRouter or Google Gemini key in Settings → Personalization → BYOK (all three support images — Gemini keys are free to create in Google AI Studio), or switch to shared AI mode in AI setup to use ShadowTalk's shared image service.";

/**
 * Whether image generation can run right now through ANY path
 * (BYOK image-capable key, or shared-mode fallback). Use this to gate UI
 * proactively — e.g. the Image mode selector and /image slash command —
 * instead of letting the user discover the failure after submitting.
 */
export function isImageGenerationReady(): boolean {
  return isCloudImageConfigured() || isSharedImageEligible();
}

/**
 * Errors that justify trying the shared fallback: the user's provider can't
 * do images at all, the key vanished from this device, or the provider is
 * unreachable. Auth/quota/safety rejections are NOT fallback-worthy —
 * they mean the user's own setup must be fixed first.
 */
const FALLBACK_WORTHY_PATTERNS: RegExp[] = [
  /does not support image generation/i,
  /can't generate images yet/i,
  /not available on this device/i,
  /Could not reach /i,
];

function isFallbackWorthyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return FALLBACK_WORTHY_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Generate an image, BYOK first with an explicit shared fallback.
 * Callers get the image plus its source so the UI can be transparent about
 * which path served the request.
 */
export async function generateImageWithFallback(
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<GeneratedImage> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Describe the image you want to generate.");

  if (isCloudImageConfigured()) {
    try {
      const imageUrl = await generateCloudImage(trimmed, options);
      return { imageUrl, source: "byok" };
    } catch (error) {
      if (!isFallbackWorthyError(error) || !isSharedImageEligible()) throw error;
      const imageUrl = await generateSharedImage(trimmed, {
        referenceImage: options.referenceImage,
        signal: options.signal,
      });
      return { imageUrl: await finalizeSharedImage(imageUrl, options), source: "shared" };
    }
  }

  if (isSharedImageEligible()) {
    const imageUrl = await generateSharedImage(trimmed, {
      referenceImage: options.referenceImage,
      signal: options.signal,
    });
    return { imageUrl: await finalizeSharedImage(imageUrl, options), source: "shared" };
  }

  throw new Error(IMAGE_SETUP_ERROR);
}

/** Shared images get the same watermark treatment as BYOK images. */
async function finalizeSharedImage(imageUrl: string, options: GenerateImageOptions): Promise<string> {
  if (options.watermark === false) return imageUrl;
  const { applyImageWatermark } = await import("@/lib/imageWatermark");
  return applyImageWatermark(imageUrl);
}
