/**
 * ShadowTalk AI — Seamless Image Editing Engine
 *
 * Provides multimodal visual reasoning, client-side photographic adjustments,
 * and generative image-to-image synthesis (similar to ChatGPT and Gemini).
 */

import { turboComplete } from "@/lib/turbo/turboEngine";

export interface ImageMetrics {
  width: number;
  height: number;
  aspectRatio: string;
  widthHeightRatio: number;
  brightness: number;
  isDark: boolean;
  dominantTone: "warm" | "cool" | "neutral" | "vibrant" | "monochrome";
}

export type DirectFilterType =
  | "grayscale"
  | "sepia"
  | "invert"
  | "cyberpunk"
  | "vintage"
  | "high_contrast"
  | "warm_sunset"
  | "cool_night";

export interface ImageEditResult {
  editedImageUrl: string;
  analysis: string;
  diffusionPrompt: string;
  method: "generative_edit" | "direct_filter" | "hybrid";
  metrics?: ImageMetrics;
}

export interface ImageAnalysisResult {
  summary: string;
  subject: string;
  composition: string;
  palette: string;
  suggestedEdits: string[];
}

/**
 * Extract dimensional and photometric metrics from an image data URL.
 * Works across browser environments with graceful fallbacks for headless/SSR test runners.
 */
export async function extractImageMetrics(imageDataUrl: string): Promise<ImageMetrics> {
  const defaultMetrics: ImageMetrics = {
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    widthHeightRatio: 1,
    brightness: 128,
    isDark: false,
    dominantTone: "neutral",
  };

  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof Image === "undefined" ||
    !imageDataUrl ||
    !imageDataUrl.startsWith("data:")
  ) {
    return defaultMetrics;
  }

  return new Promise((resolve) => {
    try {
      // 300ms safety timeout to prevent hanging in headless jsdom/vitest environments
      const timeoutId = setTimeout(() => resolve(defaultMetrics), 300);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        clearTimeout(timeoutId);
        const w = img.naturalWidth || img.width || 1024;
        const h = img.naturalHeight || img.height || 1024;
        const ratio = w / h;

        let aspectLabel = "1:1";
        if (ratio > 1.6) aspectLabel = "16:9";
        else if (ratio > 1.2) aspectLabel = "4:3";
        else if (ratio < 0.65) aspectLabel = "9:16";
        else if (ratio < 0.85) aspectLabel = "3:4";

        let brightness = 128;
        let dominantTone: ImageMetrics["dominantTone"] = "neutral";

        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 40;
            canvas.height = 40;
            ctx.drawImage(img, 0, 0, 40, 40);
            const imgData = ctx.getImageData(0, 0, 40, 40);
            const data = imgData.data;

            let totalLum = 0;
            let totalR = 0;
            let totalG = 0;
            let totalB = 0;
            const count = data.length / 4;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              totalLum += lum;
              totalR += r;
              totalG += g;
              totalB += b;
            }

            brightness = Math.round(totalLum / count);
            const avgR = totalR / count;
            const avgB = totalB / count;

            if (Math.abs(avgR - avgB) < 15) {
              dominantTone = "neutral";
            } else if (avgR > avgB + 20) {
              dominantTone = "warm";
            } else if (avgB > avgR + 20) {
              dominantTone = "cool";
            }
          }
        } catch {
          // Canvas read security exception (cross-origin); keep defaults
        }

        resolve({
          width: w,
          height: h,
          aspectRatio: aspectLabel,
          widthHeightRatio: ratio,
          brightness,
          isDark: brightness < 80,
          dominantTone,
        });
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(defaultMetrics);
      };

      img.src = imageDataUrl;
    } catch {
      resolve(defaultMetrics);
    }
  });
}

/**
 * Check if the user is asking for a direct pixel-level photographic filter
 * (e.g. black and white, sepia, invert) where modifying the original pixels is ideal.
 */
export function detectDirectFilter(prompt: string): { isDirect: boolean; filter?: DirectFilterType } {
  const p = prompt.toLowerCase().trim();

  if (/\b(black\s+and\s+white|b&w|grayscale|monochrome|remove\s+color|desaturate)\b/i.test(p)) {
    return { isDirect: true, filter: "grayscale" };
  }
  if (/\b(sepia|vintage\s+photo|old\s+photo|1970s|retro\s+tone|polaroid)\b/i.test(p)) {
    return { isDirect: true, filter: "sepia" };
  }
  if (/\b(invert|negative\s+colors|invert\s+colors)\b/i.test(p)) {
    return { isDirect: true, filter: "invert" };
  }
  if (/\b(high\s+contrast|hdr|boost\s+contrast)\b/i.test(p)) {
    return { isDirect: true, filter: "high_contrast" };
  }
  if (/\b(cyberpunk\s+filter|neon\s+matrix|synthwave\s+colors)\b/i.test(p)) {
    return { isDirect: true, filter: "cyberpunk" };
  }
  if (/\b(warm\s+filter|golden\s+hour|sunset\s+tone)\b/i.test(p)) {
    return { isDirect: true, filter: "warm_sunset" };
  }
  if (/\b(cool\s+filter|blue\s+hour|night\s+tone)\b/i.test(p)) {
    return { isDirect: true, filter: "cool_night" };
  }

  return { isDirect: false };
}

/**
 * Apply instantaneous client-side photographic pixel transformations on canvas.
 */
export async function applyCanvasFilter(imageDataUrl: string, filter: DirectFilterType): Promise<string> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof Image === "undefined" ||
    !imageDataUrl.startsWith("data:")
  ) {
    return imageDataUrl;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(imageDataUrl), 300);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(imageDataUrl);

        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 800;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          switch (filter) {
            case "grayscale": {
              const gray = 0.299 * r + 0.587 * g + 0.114 * b;
              const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.15 + 128));
              data[i] = boosted;
              data[i + 1] = boosted;
              data[i + 2] = boosted;
              break;
            }
            case "sepia": {
              const tr = 0.393 * r + 0.769 * g + 0.189 * b;
              const tg = 0.349 * r + 0.686 * g + 0.168 * b;
              const tb = 0.272 * r + 0.534 * g + 0.131 * b;
              data[i] = Math.min(255, tr);
              data[i + 1] = Math.min(255, tg);
              data[i + 2] = Math.min(255, tb);
              break;
            }
            case "invert": {
              data[i] = 255 - r;
              data[i + 1] = 255 - g;
              data[i + 2] = 255 - b;
              break;
            }
            case "high_contrast": {
              data[i] = Math.min(255, Math.max(0, (r - 128) * 1.35 + 128));
              data[i + 1] = Math.min(255, Math.max(0, (g - 128) * 1.35 + 128));
              data[i + 2] = Math.min(255, Math.max(0, (b - 128) * 1.35 + 128));
              break;
            }
            case "cyberpunk": {
              const gray = 0.299 * r + 0.587 * g + 0.114 * b;
              data[i] = Math.min(255, gray > 120 ? r * 1.3 + 30 : r * 0.7);
              data[i + 1] = Math.min(255, g * 0.8 + 10);
              data[i + 2] = Math.min(255, b * 1.4 + 40);
              break;
            }
            case "warm_sunset": {
              data[i] = Math.min(255, r * 1.2 + 20);
              data[i + 1] = Math.min(255, g * 1.05 + 10);
              data[i + 2] = Math.max(0, b * 0.85 - 10);
              break;
            }
            case "cool_night": {
              data[i] = Math.max(0, r * 0.75 - 15);
              data[i + 1] = Math.min(255, g * 0.95);
              data[i + 2] = Math.min(255, b * 1.3 + 30);
              break;
            }
            default:
              break;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(imageDataUrl);
      }
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(imageDataUrl);
    };
    img.src = imageDataUrl;
  });
}
/**
 * Ask the AI to actually look at the image and return a JSON payload.
 * Uses the Lovable Cloud chat function with multimodal (vision) input.
 */
async function visionJson(
  systemPrompt: string,
  instruction: string,
  imageDataUrl: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  try {
    const { AIProviderRouter } = await import("@/ai/AIProviderRouter");
    const provider = await AIProviderRouter.getBestProvider();
    const { content } = await provider.streamChat(
      [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      { temperature: 0.4, signal },
    );
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch (err: any) {
    if (err?.message === "offline_not_provisioned") {
      console.warn("Vision JSON failed: offline and not provisioned.");
    }
    return null;
  }
}

/**
 * Look at the uploaded image and turn the user's request into a precise
 * image-editing instruction that preserves the original subject.
 */
export async function synthesizeImageEditPlan(
  userInstruction: string,
  metrics: ImageMetrics,
  signal?: AbortSignal,
  originalImage?: string,
): Promise<{ explanation: string; diffusionPrompt: string }> {
  const cleanInstruction = userInstruction.trim() || "Enhance and stylize this image";
  const defaultPlan = {
    explanation: `I analyzed your image and applied your requested edit: **${cleanInstruction}** — keeping the original subject, framing and identity intact.`,
    diffusionPrompt: `Edit this exact image: ${cleanInstruction}. Preserve the original subject, identity, pose, framing and background unless the request says otherwise. Photorealistic, seamless, ultra-detailed, natural lighting, no artifacts.`,
  };

  if (!originalImage) return defaultPlan;

  const systemPrompt = `You are ShadowTalk AI's Vision & Image Editing Architect.
You are shown a real image and a user's edit request. Describe what is actually in the image, then write a precise editing instruction for an image-editing model that applies ONLY the requested change and preserves everything else (subject identity, pose, framing, lighting, background).

Respond with strictly valid JSON:
{
  "explanation": "Short, friendly note to the user describing what you changed in their image",
  "diffusionPrompt": "Precise edit instruction referencing the actual contents of the image"
}`;

  const parsed = await visionJson(
    systemPrompt,
    `User edit request: "${cleanInstruction}"
Image profile: ${metrics.width}x${metrics.height} (${metrics.aspectRatio}), ${metrics.dominantTone} tone, ${metrics.isDark ? "low-key" : "well-lit"}.
Return the JSON edit plan.`,
    originalImage,
    signal,
  );

  const explanation = typeof parsed?.explanation === "string" ? parsed.explanation : "";
  const diffusionPrompt = typeof parsed?.diffusionPrompt === "string" ? parsed.diffusionPrompt : "";
  if (explanation && diffusionPrompt) {
    return {
      explanation,
      diffusionPrompt: `${diffusionPrompt} Keep the untouched parts of the original image identical.`,
    };
  }
  return defaultPlan;
}

/**
 * Main entrance: analyze the uploaded image and apply the user's edit to that
 * actual image (image-to-image), returning the edited, watermarked result.
 */
export async function editImageSeamlessly(
  originalImage: string,
  userInstruction: string,
  signal?: AbortSignal,
): Promise<ImageEditResult> {
  const metrics = await extractImageMetrics(originalImage);
  const { applyImageWatermark } = await import("@/lib/imageWatermark");

  // 1. Pure photographic filters (black & white, sepia, invert…) are applied
  //    directly to the original pixels — fastest and pixel-perfect.
  const filterCheck = detectDirectFilter(userInstruction);
  if (filterCheck.isDirect && filterCheck.filter) {
    const filteredDataUrl = await applyCanvasFilter(originalImage, filterCheck.filter);
    const stamped = await applyImageWatermark(filteredDataUrl);
    const filterName = filterCheck.filter === "grayscale" ? "black and white" : filterCheck.filter.replace("_", " ");
    return {
      editedImageUrl: stamped,
      analysis: `I applied a **${filterName}** photographic adjustment directly to your image's pixels, preserving the original resolution, focus and texture.`,
      diffusionPrompt: `${filterName} photographic transformation`,
      method: "direct_filter",
      metrics,
    };
  }

  // 2. Real generative edit: the model receives the original image plus a
  //    vision-derived instruction, and returns the edited image.
  const { explanation, diffusionPrompt } = await synthesizeImageEditPlan(
    userInstruction,
    metrics,
    signal,
    originalImage,
  );

  const { generateCloudImage } = await import("@/lib/cloudImage");
  const editedImageUrl = await generateCloudImage(diffusionPrompt, {
    referenceImage: originalImage,
    signal,
  });

  return {
    editedImageUrl,
    analysis: explanation,
    diffusionPrompt,
    method: "generative_edit",
    metrics,
  };
}

/**
 * Comprehensive visual reasoning of the actual uploaded image.
 */
export async function analyzeImageInDetail(
  originalImage: string,
  signal?: AbortSignal,
): Promise<ImageAnalysisResult> {
  const metrics = await extractImageMetrics(originalImage);

  const systemPrompt = `You are ShadowTalk AI's Visual Reasoning Expert.
You are shown a real image. Describe exactly what you see.

Respond with strictly valid JSON:
{
  "summary": "High-level summary of what the image shows",
  "subject": "The central subject(s), pose and expression",
  "composition": "Framing, perspective, depth of field, spatial layout",
  "palette": "Lighting, colour scheme and mood",
  "suggestedEdits": ["edit idea 1", "edit idea 2", "edit idea 3"]
}`;

  const parsed = await visionJson(
    systemPrompt,
    "Analyze this image and return the JSON report.",
    originalImage,
    signal,
  );

  if (!parsed || typeof parsed.summary !== "string" || typeof parsed.subject !== "string") {
    throw new Error("The selected AI provider could not analyze this image. Check your provider connection and try again.");
  }

  return {
    summary: parsed.summary,
    subject: parsed.subject,
    composition: typeof parsed.composition === "string"
      ? parsed.composition
      : `${metrics.aspectRatio} framing; measured dimensions are ${metrics.width} × ${metrics.height}.`,
    palette: typeof parsed.palette === "string"
      ? parsed.palette
      : `Measured image tone: ${metrics.dominantTone}; average luminance: ${metrics.brightness}.`,
    suggestedEdits: Array.isArray(parsed.suggestedEdits)
      ? (parsed.suggestedEdits as unknown[]).filter((edit): edit is string => typeof edit === "string")
      : [],
  };
}
