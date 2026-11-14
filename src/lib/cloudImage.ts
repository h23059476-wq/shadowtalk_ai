// Image generation is BYOK-only: the user's own OpenAI, OpenRouter or Google
// Gemini key is used for direct browser→provider calls. No shared-key path,
// no free fallback — see the error messages below for the user guidance.
import { applyImageWatermark } from "@/lib/imageWatermark";
import { getByokConfig, type ByokProvider } from "@/lib/byok";

export interface GenerateImageOptions {
  model?: string;
  referenceImage?: string;
  signal?: AbortSignal;
  watermark?: boolean;
  onFrame?: (dataUrl: string, isFinal: boolean) => void;
}

const OPENROUTER_IMAGE_MODEL = "google/gemini-2.5-flash-image";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const OPENAI_IMAGE_MODEL = "gpt-image-1";
// OpenAI documents a 32,000-character prompt limit for gpt-image-1; enforce it
// across all providers so oversized prompts fail with a clear message instead
// of an opaque provider 400.
const MAX_PROMPT_LENGTH = 32_000;

/** Providers whose keys can generate images through ShadowTalk. */
export const IMAGE_CAPABLE_PROVIDERS: readonly ByokProvider[] = ["openai", "openrouter", "gemini"];

export function isImageCapableProvider(provider: ByokProvider): boolean {
  return IMAGE_CAPABLE_PROVIDERS.includes(provider);
}

export function isCloudImageConfigured(): boolean {
  // BYOK-only: image generation is available when the user has a BYOK key
  // configured for an image-capable provider (OpenAI, OpenRouter or Gemini).
  const config = getByokConfig();
  return Boolean(config?.apiKey) && isImageCapableProvider(config!.provider);
}

const DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;

/** Split a data URL into its media type and base64 payload. */
export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = DATA_URL_PATTERN.exec(dataUrl.trim());
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), data: match[2] };
}

/** Patterns that look like provider API keys — redacted from provider error text. */
const KEY_LIKE_PATTERN = /\b(sk-(?:ant-)?[A-Za-z0-9_-]{8,}|sk-or-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9_-]{8,}|xai-[A-Za-z0-9_-]{8,}|csk-[A-Za-z0-9_-]{8,}|pplx-[A-Za-z0-9_-]{8,}|fw_[A-Za-z0-9_-]{8,})\b/g;

function sanitizeProviderMessage(message: string): string {
  return message.replace(KEY_LIKE_PATTERN, "[redacted]");
}

/**
 * Map a failed provider response to an actionable error. Messages never
 * include the API key and always point at what the user should do next.
 */
export function mapImageProviderError(
  providerLabel: string,
  status: number,
  body: unknown,
): Error {
  const apiMessage =
    (body as { error?: { message?: string } | string } | null)?.error instanceof Object
      ? ((body as { error: { message?: string } }).error.message ?? "")
      : typeof (body as { error?: unknown } | null)?.error === "string"
        ? (body as { error: string }).error
        : "";
  const errorCode =
    (body as { error?: { code?: string; type?: string; status?: string } } | null)?.error?.code ??
    (body as { error?: { type?: string } } | null)?.error?.type ??
    "";

  if (status === 401 || status === 403) {
    return new Error(
      `Your ${providerLabel} API key was rejected (${status}). Check that the key is correct and still active in Settings → Personalization → BYOK.`,
    );
  }
  if (status === 429) {
    return new Error(
      `${providerLabel} rate limit or quota reached. Wait a moment and try again, or check your plan's image quota on your ${providerLabel} dashboard.`,
    );
  }
  const looksLikeContentBlock =
    /content_policy|safety|blocked|prohibited|violat/i.test(apiMessage) ||
    /content_policy_violation|safety/i.test(String(errorCode));
  if (status === 400 && looksLikeContentBlock) {
    return new Error(
      `${providerLabel} refused this prompt under its content policy. Rephrase the request and try again.`,
    );
  }
  if (status >= 500) {
    return new Error(
      `${providerLabel} had a temporary problem (${status}). Try again in a moment.`,
    );
  }
  return new Error(
    `${providerLabel} image generation failed (${status}).${apiMessage ? ` ${sanitizeProviderMessage(apiMessage)}` : ""}`,
  );
}

/** Decode the OpenAI / OpenRouter image response into an image URL or data URL. */
export function decodeImageResult(body: unknown): string {
  const b = body as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    data?: Array<{ url?: string; b64_json?: string; media_type?: string; mime_type?: string }>;
  } | null;
  const image = b?.choices?.[0]?.message?.images?.[0]?.image_url?.url
    ? { value: b.choices[0].message.images[0].image_url.url }
    : b?.data?.[0]?.url
      ? { value: b.data[0].url }
      : b?.data?.[0]?.b64_json
        ? { value: b.data[0].b64_json, mimeType: b.data[0].media_type || b.data[0].mime_type }
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

const PROVIDER_HOST_LABELS: Record<string, string> = {
  "api.openai.com": "OpenAI",
  "openrouter.ai": "OpenRouter",
  "generativelanguage.googleapis.com": "Google Gemini",
};

/**
 * fetch wrapper that turns low-level network failures (DNS, CORS, offline,
 * provider unreachable) into an actionable message instead of a raw
 * "TypeError: Failed to fetch" surfacing in chat.
 */
async function providerFetch(url: string, init: RequestInit): Promise<Response> {
  const providerLabel = PROVIDER_HOST_LABELS[new URL(url).hostname] ?? "the AI provider";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(
      `Could not reach ${providerLabel} (network or DNS failure). Check your connection — if a corporate proxy or ad-blocker blocks ${new URL(url).hostname}, allowlist it and try again.`,
    );
  }
  return response;
}

/** Extract the generated image from a Gemini generateContent response. */
export function decodeGeminiImageResult(body: unknown): string {
  const b = body as {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }> };
    }>;
  } | null;
  const parts = b?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    const mimeType = inline?.mimeType ?? (inline as { mime_type?: string } | undefined)?.mime_type;
    if (inline?.data && typeof inline.data === "string") {
      const mime =
        typeof mimeType === "string" && mimeType.startsWith("image/") ? mimeType : "image/png";
      return `data:${mime};base64,${inline.data}`;
    }
  }
  const block = b?.promptFeedback?.blockReason;
  const finish = b?.candidates?.[0]?.finishReason;
  if (block) {
    throw new Error(
      `Google Gemini blocked this prompt (${block}). Rephrase the request and try again.`,
    );
  }
  if (finish && finish !== "STOP") {
    throw new Error(`Google Gemini stopped without an image (${finish}). Try rephrasing the prompt.`);
  }
  throw new Error("Google Gemini returned no image.");
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
      form.append("model", options.model || OPENAI_IMAGE_MODEL);
      form.append("prompt", prompt);
      form.append("image", imageBlob, "reference-image.png");
      form.append("n", "1");
      const response = await providerFetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: form,
        signal: options.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw mapImageProviderError("OpenAI", response.status, body);
      }
      return decodeImageResult(await response.json());
    }
    const response = await providerFetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || OPENAI_IMAGE_MODEL,
        prompt,
        n: 1,
        size: "1024x1024",
      }),
      signal: options.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw mapImageProviderError("OpenAI", response.status, body);
    }
    return decodeImageResult(await response.json());
  }

  if (config.provider === "openrouter") {
    const response = await providerFetch("https://openrouter.ai/api/v1/images", {
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
      throw mapImageProviderError("OpenRouter", response.status, body);
    }
    return decodeImageResult(await response.json());
  }

  if (config.provider === "gemini") {
    // Native Gemini image generation (gemini-2.5-flash-image) — ignores the
    // chat model stored in the BYOK config; image output needs the dedicated
    // image model. Uses the same stable generateContent contract as chat.
    const model = options.model || GEMINI_IMAGE_MODEL;
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (options.referenceImage) {
      const parsed = parseDataUrl(options.referenceImage);
      if (!parsed) throw new Error("The attached image could not be read. Re-upload it and try again.");
      parts.push({ inline_data: { mime_type: parsed.mimeType, data: parsed.data } });
    }
    const response = await providerFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: options.signal,
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw mapImageProviderError("Google Gemini", response.status, body);
    }
    return decodeGeminiImageResult(await response.json());
  }

  throw new Error(
    `${config.provider} does not support image generation through ShadowTalk. Use an OpenAI, OpenRouter or Google Gemini key for image generation.`,
  );
}

export async function generateCloudImage(
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<string> {
  const config = getByokConfig();
  if (!config?.apiKey) {
    throw new Error(
      "Image generation requires your own API key. Add an OpenAI, OpenRouter or Google Gemini key in Settings → Personalization → BYOK — all three support image generation.",
    );
  }
  if (!isImageCapableProvider(config.provider)) {
    throw new Error(
      `${config.provider} keys can't generate images yet. Image generation works with an OpenAI, OpenRouter or Google Gemini key — add one in Settings → Personalization → BYOK.`,
    );
  }
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) throw new Error("Describe the image you want to generate.");
  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(
      `The image prompt is too long (${trimmedPrompt.length} characters). Shorten it to under ${MAX_PROMPT_LENGTH.toLocaleString()} characters and try again.`,
    );
  }

  const image = await generateWithByok(trimmedPrompt, options);
  const finalImage =
    options.watermark === false ? image : await applyImageWatermark(image);
  options.onFrame?.(finalImage, true);
  return finalImage;
}
