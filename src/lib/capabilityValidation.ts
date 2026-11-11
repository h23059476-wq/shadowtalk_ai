/**
 * Capability Validation — checks whether the user's configured BYOK provider
 * supports a requested capability before making the request.
 *
 * This is a best-effort validation based on known provider capabilities.
 * It prevents obvious failures (e.g., trying image generation with Groq)
 * but cannot guarantee a specific model supports a capability (that would
 * require an API call to check).
 *
 * When a capability is unsupported, the caller should show a clear error
 * explaining what's needed and which providers support it.
 */

import type { ByokProvider } from "@/lib/byok";

export type Capability =
  | "text_chat"
  | "image_input"          // vision: can analyze uploaded images
  | "image_generation"     // can generate images from text
  | "document_processing"  // can process extracted document text
  | "video_analysis"       // can analyze video frames (same as image_input)
  | "audio_input"          // can process audio (transcription or understanding)
  | "document_generation"  // can generate formal documents
  | "web_search";          // can search the web

export interface CapabilityCheckResult {
  /** Whether the capability is supported */
  supported: boolean;
  /** Human-readable explanation */
  message: string;
  /** Providers that support this capability (for the error message) */
  suggestedProviders?: string[];
}

/**
 * Known provider capabilities.
 *
 * Based on actual API documentation and the existing adapter implementations:
 * - All providers support text_chat and document_processing (text is sent as plain text)
 * - All providers support document_generation (it's just text generation with a system prompt)
 * - image_input: providers that support vision/multimodal input
 * - image_generation: only OpenAI (gpt-image-1) and OpenRouter (gemini-2.5-flash-image)
 * - video_analysis: same as image_input (frames are extracted and sent as images)
 * - audio_input: OpenAI (Whisper), OpenRouter (models that accept audio)
 * - web_search: only OpenRouter (web_search tool) and Perplexity (online models)
 */
const PROVIDER_CAPABILITIES: Record<ByokProvider, Set<Capability>> = {
  openai: new Set([
    "text_chat", "image_input", "image_generation",
    "document_processing", "video_analysis", "audio_input",
    "document_generation",
  ]),
  openrouter: new Set([
    "text_chat", "image_input", "image_generation",
    "document_processing", "video_analysis", "audio_input",
    "document_generation", "web_search",
  ]),
  gemini: new Set([
    "text_chat", "image_input",
    "document_processing", "video_analysis", "audio_input",
    "document_generation",
  ]),
  anthropic: new Set([
    "text_chat", "image_input",
    "document_processing", "video_analysis",
    "document_generation",
  ]),
  groq: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  mistral: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  deepseek: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  together: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  fireworks: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  perplexity: new Set([
    "text_chat", "document_processing", "document_generation", "web_search",
  ]),
  cohere: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  xai: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  cerebras: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  hyperbolic: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  novita: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
  deepinfra: new Set([
    "text_chat", "document_processing", "document_generation",
  ]),
};

/** Human-readable names for capabilities */
const CAPABILITY_LABELS: Record<Capability, string> = {
  text_chat: "text chat",
  image_input: "image analysis",
  image_generation: "image generation",
  document_processing: "document analysis",
  video_analysis: "video analysis",
  audio_input: "audio analysis",
  document_generation: "document generation",
  web_search: "web search",
};

/** Providers that support each capability (for suggestion messages) */
const CAPABILITY_PROVIDERS: Record<Capability, string[]> = {
  text_chat: ["all providers"],
  image_input: ["OpenAI", "OpenRouter", "Google Gemini", "Anthropic"],
  image_generation: ["OpenAI", "OpenRouter"],
  document_processing: ["all providers"],
  video_analysis: ["OpenAI", "OpenRouter", "Google Gemini", "Anthropic"],
  audio_input: ["OpenAI", "OpenRouter", "Google Gemini"],
  document_generation: ["all providers"],
  web_search: ["OpenRouter", "Perplexity"],
};

/**
 * Check if a provider supports a capability.
 * Returns a result with supported=true/false and a human-readable message.
 */
export function checkCapability(
  provider: ByokProvider,
  capability: Capability,
): CapabilityCheckResult {
  const caps = PROVIDER_CAPABILITIES[provider];
  if (!caps) {
    return {
      supported: false,
      message: `Unknown provider "${provider}". Cannot validate capabilities.`,
    };
  }

  if (caps.has(capability)) {
    return {
      supported: true,
      message: `${provider} supports ${CAPABILITY_LABELS[capability]}.`,
    };
  }

  const suggested = CAPABILITY_PROVIDERS[capability] || [];
  return {
    supported: false,
    message: `${provider} does not support ${CAPABILITY_LABELS[capability]}. Supported providers: ${suggested.join(", ")}. Switch your provider in Settings → Personalization → BYOK.`,
    suggestedProviders: suggested,
  };
}

/**
 * Check multiple capabilities at once.
 * Returns the first unsupported capability, or null if all are supported.
 */
export function checkCapabilities(
  provider: ByokProvider,
  ...capabilities: Capability[]
): CapabilityCheckResult | null {
  for (const cap of capabilities) {
    const result = checkCapability(provider, cap);
    if (!result.supported) return result;
  }
  return null;
}

/**
 * Get all capabilities supported by a provider.
 */
export function getProviderCapabilities(provider: ByokProvider): Capability[] {
  const caps = PROVIDER_CAPABILITIES[provider];
  return caps ? Array.from(caps) : [];
}
