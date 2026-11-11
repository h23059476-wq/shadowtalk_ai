// fbAuth + functionsBaseUrl removed — image gen is BYOK-only
import { applyImageWatermark } from "@/lib/imageWatermark";
// getCachedAiAccessMode removed — image gen is BYOK-only
import { getByokConfig } from "@/lib/byok";

export interface GenerateImageOptions {
  model?: string;
  referenceImage?: string;
  signal?: AbortSignal;
  watermark?: boolean;
  onFrame?: (dataUrl: string, isFinal: boolean) => void;
}

const OPENROUTER_IMAGE_MODEL = "google/gemini-2.5-flash-image";

export function isCloudImageConfigured(): boolean {
  // BYOK-only: image generation is available when the user has a BYOK key
  // configured for a provider that supports image generation (OpenAI or OpenRouter).
  const config = getByokConfig();
  return Boolean(config?.apiKey) && (config.provider === "openai" || config.provider === "openrouter");
}

function decodeImageResult(body: any): string {
  const image = body?.choices?.[0]?.message?.images?.[0]?.image_url?.url
    ? { value: body.choices[0].message.images[0].image_url.url }
    : body?.data?.[0]?.url
      ? { value: body.data[0].url }
      : body?.data?.[0]?.b64_json
        ? { value: body.data[0].b64_json, mimeType: body.data[0].media_type || body.data[0].mime_type }
        : null;
  if (!image?.value || typeof image.value !== "string") {
    throw new Error("The selected AI provider returned no image.");
  }
  if (image.value.startsWith("data:") || /^https?:\/\//i.test(image.value)) return image.value;
  const mimeType = typeof image.mimeType === "string" && image.mimeType.startsWith("image/")
    ? image.mimeType
    : "image/png";
  return `data:${mimeType};base64,${image.value}`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Could not read the attached image.");
  return response.blob();
}

async function generateWithByok(
  prompt: string,
  options: GenerateImageOptions,
): Promise<string> {
  const config = getByokConfig();
  if (!config?.apiKey) {
    throw new Error("Your API key is not available on this device. Re-enter it in AI settings.");
  }

  if (config.provider === "openai") {
    if (options.referenceImage) {
      const imageBlob = await dataUrlToBlob(options.referenceImage);
      const form = new FormData();
      form.append("model", options.model || "gpt-image-1");
      form.append("prompt", prompt);
      form.append("image", imageBlob, "reference-image.png");
      form.append("n", "1");
      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: form,
        signal: options.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || `OpenAI image editing failed (${response.status}).`);
      }
      return decodeImageResult(await response.json());
    }
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
      }),
      signal: options.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message || `OpenAI image generation failed (${response.status}).`);
    }
    return decodeImageResult(await response.json());
  }

  if (config.provider === "openrouter") {
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "ShadowTalk AI",
      },
      body: JSON.stringify({
        model: options.model || OPENROUTER_IMAGE_MODEL,
        prompt,
        ...(options.referenceImage ? { input_references: [options.referenceImage] } : {}),
      }),
      signal: options.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message || `OpenRouter image generation failed (${response.status}).`);
    }
    return decodeImageResult(await response.json());
  }

  throw new Error(
    `${config.provider} does not support image generation through ShadowTalk. Use an OpenAI or OpenRouter key for image generation.`,
  );
}

export async function generateCloudImage(
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<string> {
  // BYOK-only — image generation uses the user's own OpenAI or OpenRouter key.
  // No shared-key path, no free fallback. Users must have a BYOK key configured.
  const config = getByokConfig();
  if (!config?.apiKey) {
    throw new Error(
      "Image generation requires a BYOK API key. Add your OpenAI or OpenRouter key in Settings → Personalization → BYOK. OpenAI (gpt-image-1) and OpenRouter (gemini-2.5-flash-image) both support image generation."
    );
  }
  if (!prompt.trim()) throw new Error("Describe the image you want to generate.");

  const image = await generateWithByok(prompt, options);
  const finalImage =
    options.watermark === false ? image : await applyImageWatermark(image);
  options.onFrame?.(finalImage, true);
  return finalImage;
}
