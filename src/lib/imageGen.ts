/**
 * Unified image-generation entry point.
 *
 * Resolution order (zero-cost first):
 * 1. BYOK — the user's own OpenAI / OpenRouter / Google Gemini key makes
 *    browser→provider calls (cloudImage.ts). The user's key is always
 *    preferred: no shared quota, no platform cost.
 * 2. Tier 3 ZeroGPU Spaces — when online, free raster generation on Hugging
 *     Face's ZeroGPU pool (zeroGpuSpaceProvider.ts, via @gradio/client).
 *    Rides the user's personal HF quota when Tier 2 connected an account,
 *    else the anonymous quota. The result Blob is persisted in the
 *    encrypted IndexedDB asset store so nothing depends on temporary
 *    Space URLs.
 * 3. Shared fallback — signed-in shared-mode users go through the
 *    platform-funded `generateImage` Function (sharedImage.ts), which
 *    enforces its own 100/day quota server-side.
 *
 * The fallback is explicit and gated — there is no silent platform-funded
 * path. Provider rejections on the BYOK path (auth, quota, content policy)
 * always surface: retrying them on the free tiers would mask the user's own
 * setup problem. ZeroGPU quota/availability failures degrade to the shared
 * pool when it exists, otherwise a clear notice explains the options
 * (connect an account, add a BYOK key, or switch the request to the offline
 * chart/diagram renderer).
 */
import {
  generateCloudImage,
  isCloudImageConfigured,
  type GenerateImageOptions,
} from "@/lib/cloudImage";
import { generateSharedImage, isSharedImageEligible } from "@/lib/sharedImage";
import {
  ZERO_GPU_QUOTA_HINT,
  classifyZeroGpuError,
  generateImageViaZeroGpu,
  isZeroGpuSpaceAvailable,
  type ZeroGpuStatusUpdate,
} from "@/lib/providers/zeroGpuSpaceProvider";
import { loadImageAssetObjectUrl, saveImageAsset } from "@/lib/imageAssetStore";

export type GeneratedImageSource = "byok" | "shared" | "zerogpu";

export interface GeneratedImage {
  imageUrl: string;
  source: GeneratedImageSource;
  /**
   * Encrypted IndexedDB asset id — present when the image was persisted
   * locally (Tier 3). Rehydrate with loadImageAssetBlob(id) across sessions.
   */
  imageAssetId?: string;
}

/** Status updates forwarded to the chat card during a ZeroGPU run. */
export type ImageGenStatusUpdate = ZeroGpuStatusUpdate & { provider: "zerogpu" };

/** Shown when neither BYOK, ZeroGPU nor the shared path is available (online but unconfigured). */
export const IMAGE_SETUP_ERROR =
  "Image generation needs a quick setup. Sign in, then either add an OpenAI, OpenRouter or Google Gemini key in Settings → Personalization → BYOK (all three support images — Gemini keys are free to create in Google AI Studio), connect your Hugging Face account for a personal ZeroGPU quota, or switch to shared AI mode in AI setup to use ShadowTalk's shared image service.";

/** Shown when the device is offline — the offline escape hatch is the local visual renderer. */
export const IMAGE_OFFLINE_NOTICE =
  "Image generation needs an internet connection right now. Charts, diagrams and structured infographics still work fully offline — switch this request to chart or diagram mode (ShadowTalk's visual renderer runs locally in your browser), or try again once you're back online.";

/** Per-kind ZeroGPU failure copy — quota gets the countdown/retry hint. */
function zeroGpuFailureMessage(error: unknown): Error {
  const { kind, retryAfterSeconds } = classifyZeroGpuError(error);
  if (kind === "aborted") {
    return new Error("Image generation was canceled.");
  }
  if (kind === "offline") {
    return new Error(IMAGE_OFFLINE_NOTICE);
  }
  if (kind === "quota") {
    const countdown = retryAfterSeconds
      ? ` Your quota resets in about ${retryAfterSeconds >= 3600 ? `${Math.round(retryAfterSeconds / 3600)}h` : `${Math.ceil(retryAfterSeconds / 60)} min`} — the retry is free.`
      : " The quota resets daily — the retry is free.";
    return new Error(
      `Hugging Face ZeroGPU's free image quota is exhausted.${countdown} ${ZERO_GPU_QUOTA_HINT} Alternatively, add an OpenAI, OpenRouter or Gemini key in Settings → BYOK, or switch this request to offline chart/diagram mode.`,
    );
  }
  return new Error(
    `Free ZeroGPU image generation is unavailable right now (${kind === "unknown" ? "unexpected Space error" : kind.replace("_", " ")}). You can retry in a moment, add an OpenAI, OpenRouter or Gemini key in Settings → BYOK, connect a Hugging Face account for priority queueing, or switch to offline chart/diagram mode.`,
  );
}

/**
 * Whether image generation can run right now through ANY path (BYOK
 * image-capable key, free ZeroGPU when online, or shared-mode fallback). Use
 * this to gate UI proactively — e.g. the Image mode selector and /image slash
 * command — instead of letting the user discover the failure after
 * submitting.
 */
export function isImageGenerationReady(): boolean {
  return isCloudImageConfigured() || isSharedImageEligible() || isZeroGpuSpaceAvailable();
}

/**
 * Errors that justify trying the next free tier: the user's provider can't
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
 * Watermark a ZeroGPU Blob without depending on temporary Space URLs: the
 * canvas works on a same-origin blob: URL, and the marked pixels come back
 * as a fresh Blob ready for the encrypted store. Falls back to the original
 * blob when the watermark pipeline is unavailable (headless / no canvas).
 */
async function watermarkBlob(blob: Blob, options: GenerateImageOptions): Promise<Blob> {
  if (options.watermark === false) return blob;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const { applyImageWatermark } = await import("@/lib/imageWatermark");
    const marked = await applyImageWatermark(objectUrl);
    if (marked === objectUrl) return blob; // watermark skipped — keep the original bytes
    const markedBlob = await (await fetch(marked)).blob();
    return markedBlob.type && /^image\//i.test(markedBlob.type) ? markedBlob : blob;
  } catch {
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Tier 3 path: generate on a ZeroGPU Space, watermark, persist the encrypted
 * asset, and hand back an object URL + asset id for the message card.
 */
async function generateZeroGpuImage(prompt: string, options: GenerateImageOptions): Promise<GeneratedImage> {
  const result = await generateImageViaZeroGpu(prompt, {
    signal: options.signal,
    ...(options.onStatus
      ? { onStatus: (update: ZeroGpuStatusUpdate) => options.onStatus!({ provider: "zerogpu", ...update }) }
      : {}),
  });
  const finalBlob = await watermarkBlob(result.blob, options);
  const asset = await saveImageAsset(finalBlob, {
    mimeType: finalBlob.type || result.mimeType,
    source: "zerogpu",
    prompt,
    originId: result.spaceId,
  });
  const imageUrl = await loadImageAssetObjectUrl(asset.id);
  return { imageUrl, source: "zerogpu", imageAssetId: asset.id };
}

/**
 * Generate an image, BYOK first with the free ZeroGPU tier and the explicit
 * shared fallback. Callers get the image plus its source so the UI can be
 * transparent about which path served the request.
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
      if (!isFallbackWorthyError(error)) throw error;
      // Fall through to the free ZeroGPU tier, then the shared pool.
    }
  }

  // Tier 3 — free cloud raster generation whenever the browser is online.
  // Reference-image edits need BYOK models; ZeroGPU Spaces are prompt-only.
  if (isZeroGpuSpaceAvailable() && !options.referenceImage) {
    try {
      return await generateZeroGpuImage(trimmed, options);
    } catch (error) {
      const { kind } = classifyZeroGpuError(error);
      if (kind === "aborted") throw error;
      if (kind === "offline") throw zeroGpuFailureMessage(error);
      if (!isSharedImageEligible()) throw zeroGpuFailureMessage(error);
      // quota / space_unavailable / timeout → degrade to the shared pool
      options.onStatus?.({
        provider: "zerogpu",
        phase: "connecting",
        message: "ZeroGPU unavailable — switching to ShadowTalk's shared image service…",
        queuePosition: null,
        etaSeconds: null,
        progress: null,
      });
    }
  }

  if (isSharedImageEligible()) {
    const imageUrl = await generateSharedImage(trimmed, {
      referenceImage: options.referenceImage,
      signal: options.signal,
    });
    return { imageUrl: await finalizeSharedImage(imageUrl, options), source: "shared" };
  }

  throw new Error(isZeroGpuSpaceAvailable() ? IMAGE_SETUP_ERROR : IMAGE_OFFLINE_NOTICE);
}

/** Shared images get the same watermark treatment as BYOK images. */
async function finalizeSharedImage(imageUrl: string, options: GenerateImageOptions): Promise<string> {
  if (options.watermark === false) return imageUrl;
  const { applyImageWatermark } = await import("@/lib/imageWatermark");
  return applyImageWatermark(imageUrl);
}
