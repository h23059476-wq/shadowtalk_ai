/**
 * Provider Capability Intelligence Engine
 *
 * Centralized, typed capability system representing the actual capabilities
 * of each provider/model. Model-specific where providers expose differences.
 *
 * Evidence strategy:
 * 1. Manually maintained, versioned capability definitions (this file)
 * 2. Provider API responses (via /models endpoint — already used in useApiKeyValidation)
 * 3. Safe, explicit connection tests (via the test button in Settings)
 *
 * Capabilities are NEVER fabricated by an AI model.
 * Unknown capabilities are explicitly marked as "unknown".
 */

import type { ByokProvider } from "@/lib/byok";
import { inferModelCapabilities, normalizeModelId } from "./capabilityInference";

// ─── Capability Status ──────────────────────────────────────

export type CapabilityStatus = "supported" | "unsupported" | "unknown" | "unverified";

export type EvidenceSource =
  | "official_documentation"  // Provider's official API docs
  | "api_metadata"            // /models endpoint response
  | "connection_test"         // Verified via a test request
  | "manual_maintenance"      // Manually maintained in this file
  | "inferred_from_adapter"   // Inferred from ShadowTalk's adapter implementation
  | "not_tested";             // No evidence available

export interface CapabilityDetail {
  status: CapabilityStatus;
  evidence: EvidenceSource;
  lastVerified?: string;      // ISO timestamp
  notes?: string;             // Human-readable explanation
  limitation?: string;        // Known limitation even when supported
}

// ─── Capability Categories ──────────────────────────────────

export interface ModelCapabilities {
  // Text and reasoning
  textInput: CapabilityDetail;
  textOutput: CapabilityDetail;
  streaming: CapabilityDetail;
  systemInstruction: CapabilityDetail;
  structuredJsonOutput: CapabilityDetail;
  toolFunctionCalling: CapabilityDetail;
  contextWindow: number | null;     // In tokens, null = unknown
  maxOutputTokens: number | null;   // In tokens, null = unknown

  // Multimodal
  imageInput: CapabilityDetail;
  multipleImageInput: CapabilityDetail;
  documentInput: CapabilityDetail;
  audioInput: CapabilityDetail;
  audioOutput: CapabilityDetail;
  realTimeVoice: CapabilityDetail;
  videoInput: CapabilityDetail;

  // Development and agent
  codeGeneration: CapabilityDetail;
  toolExecution: CapabilityDetail;
  agentWorkflow: CapabilityDetail;
  longContextSuitability: CapabilityDetail;

  // Operational
  imageGeneration: CapabilityDetail;  // Can generate images (not just analyze)
  webSearch: CapabilityDetail;
  documentGeneration: CapabilityDetail;
}

export interface ProviderModelEntry {
  modelId: string;
  displayName: string;
  capabilities: ModelCapabilities;
}

export interface ProviderCapabilityProfile {
  provider: ByokProvider;
  providerLabel: string;
  models: ProviderModelEntry[];
  /** Provider-level capabilities that apply to all models */
  providerLevelCapabilities: {
    webSearch: CapabilityDetail;
    imageGeneration: CapabilityDetail;
  };
}

// ─── Helper builders ────────────────────────────────────────

function supported(evidence: EvidenceSource, notes?: string, limitation?: string): CapabilityDetail {
  return { status: "supported", evidence, notes, limitation };
}

function unsupported(evidence: EvidenceSource, notes?: string): CapabilityDetail {
  return { status: "unsupported", evidence, notes };
}

function unknown(notes?: string): CapabilityDetail {
  return { status: "unknown", evidence: "not_tested", notes };
}

function unverified(notes?: string): CapabilityDetail {
  return { status: "unverified", evidence: "not_tested", notes };
}

// ─── Provider Capability Registry ───────────────────────────
//
// This registry contains manually maintained, versioned capability definitions
// based on official provider documentation and ShadowTalk's adapter implementation.
//
// IMPORTANT: Capabilities are model-specific where the provider exposes differences.
// When a capability cannot be verified for a specific model, it is marked "unknown".
// When ShadowTalk's adapter does not implement a capability (even if the provider
// supports it), it is marked "unsupported" with evidence "inferred_from_adapter".
//
// Last updated: 2026-11-03
// Registry version: 1.0.0

const TEXT_CAPS = {
  textInput: supported("official_documentation"),
  textOutput: supported("official_documentation"),
  streaming: supported("inferred_from_adapter", "ShadowTalk's SSE adapter supports streaming for all OpenAI-compatible providers"),
  systemInstruction: supported("inferred_from_adapter", "System prompt is sent as the first message"),
  structuredJsonOutput: supported("inferred_from_adapter", "response_format: json_object is sent when structuredOutput is requested"),
  toolFunctionCalling: unknown("Tool calling support varies by model — not verified for this specific model"),
  contextWindow: null as number | null,
  maxOutputTokens: null as number | null,
};

const MULTIMODAL_UNSUPPORTED = {
  imageInput: unsupported("inferred_from_adapter", "ShadowTalk's adapter does not send image content for this provider"),
  multipleImageInput: unsupported("inferred_from_adapter"),
  documentInput: unsupported("inferred_from_adapter"),
  audioInput: unsupported("inferred_from_adapter"),
  audioOutput: unsupported("inferred_from_adapter"),
  realTimeVoice: unsupported("inferred_from_adapter"),
  videoInput: unsupported("inferred_from_adapter"),
};

const AGENT_BASIC = {
  codeGeneration: supported("official_documentation", "Most text models can generate code"),
  toolExecution: unverified("Tool execution depends on the specific model and tool protocol"),
  agentWorkflow: unverified("Agent workflow compatibility depends on the model's instruction-following capability"),
  longContextSuitability: unknown("Context window size determines long-context suitability"),
};

export const PROVIDER_CAPABILITY_REGISTRY: Record<ByokProvider, ProviderCapabilityProfile> = {
  openai: {
    provider: "openai",
    providerLabel: "OpenAI",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation", "OpenAI does not offer a native web search API"),
      imageGeneration: supported("inferred_from_adapter", "ShadowTalk's cloudImage.ts supports OpenAI gpt-image-1"),
    },
    models: [
      {
        modelId: "gpt-4o-mini",
        displayName: "GPT-4o mini",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: 16384,
          toolFunctionCalling: supported("official_documentation"),
          imageInput: supported("official_documentation", "GPT-4o models support vision"),
          multipleImageInput: supported("official_documentation"),
          documentInput: supported("official_documentation", "Documents are extracted to text and sent as text"),
          audioInput: supported("official_documentation", "GPT-4o supports audio input via the Audio API"),
          audioOutput: supported("official_documentation", "GPT-4o supports audio output"),
          realTimeVoice: supported("official_documentation", "Realtime API available"),
          videoInput: unverified("Video is sent as extracted frames — not native video input"),
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window supports long documents"),
          imageGeneration: unsupported("official_documentation", "GPT-4o mini does not generate images — use gpt-image-1"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
      {
        modelId: "gpt-4o",
        displayName: "GPT-4o",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: 16384,
          toolFunctionCalling: supported("official_documentation"),
          imageInput: supported("official_documentation"),
          multipleImageInput: supported("official_documentation"),
          documentInput: supported("official_documentation"),
          audioInput: supported("official_documentation"),
          audioOutput: supported("official_documentation"),
          realTimeVoice: supported("official_documentation"),
          videoInput: unverified("Video is sent as extracted frames"),
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window"),
          imageGeneration: unsupported("official_documentation", "Use gpt-image-1 for image generation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  openrouter: {
    provider: "openrouter",
    providerLabel: "OpenRouter",
    providerLevelCapabilities: {
      webSearch: supported("inferred_from_adapter", "ShadowTalk's adapter sends web_search tool for OpenRouter"),
      imageGeneration: supported("inferred_from_adapter", "ShadowTalk's cloudImage.ts supports OpenRouter image generation"),
    },
    models: [
      {
        modelId: "openai/gpt-4o-mini",
        displayName: "GPT-4o mini (via OpenRouter)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: 16384,
          toolFunctionCalling: supported("official_documentation"),
          imageInput: supported("official_documentation"),
          multipleImageInput: supported("official_documentation"),
          documentInput: supported("official_documentation"),
          audioInput: unknown("Audio support depends on OpenRouter's routing"),
          audioOutput: unknown("Audio output depends on OpenRouter's routing"),
          realTimeVoice: unsupported("inferred_from_adapter", "Realtime API not available through OpenRouter"),
          videoInput: unverified("Video is sent as extracted frames"),
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window"),
          imageGeneration: unsupported("official_documentation", "Use gemini-2.5-flash-image for image generation via OpenRouter"),
          webSearch: supported("inferred_from_adapter", "OpenRouter web_search plugin supported"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  anthropic: {
    provider: "anthropic",
    providerLabel: "Anthropic (Claude)",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation", "Anthropic does not offer native web search"),
      imageGeneration: unsupported("official_documentation", "Anthropic does not offer image generation"),
    },
    models: [
      {
        modelId: "claude-haiku-4-5-20251001",
        displayName: "Claude Haiku 4.5",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 200000,
          maxOutputTokens: 8192,
          toolFunctionCalling: supported("official_documentation", "Claude supports tool use"),
          imageInput: supported("official_documentation", "Claude supports image input via the Messages API"),
          multipleImageInput: supported("official_documentation"),
          documentInput: supported("official_documentation", "Documents are extracted to text"),
          audioInput: unsupported("official_documentation", "Claude does not support audio input"),
          audioOutput: unsupported("official_documentation"),
          realTimeVoice: unsupported("official_documentation"),
          videoInput: unverified("Video is sent as extracted frames"),
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "200K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  gemini: {
    provider: "gemini",
    providerLabel: "Google Gemini",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation", "Gemini OpenAI-compat endpoint does not include grounding"),
      imageGeneration: unsupported("inferred_from_adapter", "ShadowTalk's cloudImage.ts does not support Gemini image generation"),
    },
    models: [
      {
        modelId: "gemini-2.0-flash",
        displayName: "Gemini 2.0 Flash",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 1048576,
          maxOutputTokens: 8192,
          toolFunctionCalling: supported("official_documentation"),
          imageInput: supported("official_documentation", "Gemini supports vision"),
          multipleImageInput: supported("official_documentation"),
          documentInput: supported("official_documentation"),
          audioInput: supported("official_documentation", "Gemini supports audio input"),
          audioOutput: unsupported("official_documentation", "Gemini OpenAI-compat endpoint does not return audio"),
          realTimeVoice: unsupported("inferred_from_adapter", "Realtime voice not implemented in ShadowTalk's Gemini adapter"),
          videoInput: unverified("Video is sent as extracted frames — Gemini supports native video but the adapter doesn't use it"),
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "1M context window"),
          imageGeneration: unsupported("inferred_from_adapter"),
          webSearch: unsupported("official_documentation", "Grounding not available via OpenAI-compat endpoint"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  groq: {
    provider: "groq",
    providerLabel: "Groq",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "llama-3.3-70b-versatile",
        displayName: "Llama 3.3 70B (Groq)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: 32768,
          toolFunctionCalling: supported("official_documentation", "Llama 3.3 supports tool calling"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  mistral: {
    provider: "mistral",
    providerLabel: "Mistral AI",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "mistral-small-latest",
        displayName: "Mistral Small",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 32000,
          maxOutputTokens: null,
          toolFunctionCalling: supported("official_documentation", "Mistral supports function calling"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: unverified("32K context — suitable for medium documents"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  deepseek: {
    provider: "deepseek",
    providerLabel: "DeepSeek",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "deepseek-chat",
        displayName: "DeepSeek Chat",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 64000,
          maxOutputTokens: 8192,
          toolFunctionCalling: unverified("DeepSeek's tool calling support is not verified"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "64K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  together: {
    provider: "together",
    providerLabel: "Together AI",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("inferred_from_adapter", "ShadowTalk does not support Together AI image generation"),
    },
    models: [
      {
        modelId: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        displayName: "Llama 3.3 70B (Together)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: null,
          toolFunctionCalling: unknown("Tool calling depends on the hosted model"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  fireworks: {
    provider: "fireworks",
    providerLabel: "Fireworks AI",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "accounts/fireworks/models/llama-v3p3-70b-instruct",
        displayName: "Llama 3.3 70B (Fireworks)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: null,
          toolFunctionCalling: unknown("Tool calling depends on the hosted model"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  perplexity: {
    provider: "perplexity",
    providerLabel: "Perplexity",
    providerLevelCapabilities: {
      webSearch: supported("official_documentation", "Perplexity Sonar models include web search"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "llama-3.1-sonar-small-128k-online",
        displayName: "Sonar Small 128K (Online)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 127072,
          maxOutputTokens: null,
          toolFunctionCalling: unsupported("official_documentation", "Perplexity Sonar models do not support function calling"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "127K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: supported("official_documentation", "Online models include web search"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  cohere: {
    provider: "cohere",
    providerLabel: "Cohere",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "command-r-plus",
        displayName: "Command R+",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: null,
          toolFunctionCalling: supported("official_documentation", "Command R+ supports tool use"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  xai: {
    provider: "xai",
    providerLabel: "xAI (Grok)",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "grok-2-latest",
        displayName: "Grok 2",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 131072,
          maxOutputTokens: null,
          toolFunctionCalling: unknown("Tool calling support not verified for Grok"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "131K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  cerebras: {
    provider: "cerebras",
    providerLabel: "Cerebras",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "llama-3.3-70b",
        displayName: "Llama 3.3 70B (Cerebras)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 128000,
          maxOutputTokens: null,
          toolFunctionCalling: unknown("Tool calling depends on the hosted model"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "128K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  hyperbolic: {
    provider: "hyperbolic",
    providerLabel: "Hyperbolic",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        displayName: "Llama 3.1 70B (Hyperbolic)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 131072,
          maxOutputTokens: null,
          toolFunctionCalling: unknown("Tool calling depends on the hosted model"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "131K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  novita: {
    provider: "novita",
    providerLabel: "Novita AI",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "deepseek/deepseek-v3-turbo",
        displayName: "DeepSeek V3 Turbo (Novita)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 64000,
          maxOutputTokens: null,
          toolFunctionCalling: unknown("Tool calling not verified for this hosted model"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "64K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },

  deepinfra: {
    provider: "deepinfra",
    providerLabel: "DeepInfra",
    providerLevelCapabilities: {
      webSearch: unsupported("official_documentation"),
      imageGeneration: unsupported("official_documentation"),
    },
    models: [
      {
        modelId: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        displayName: "Llama 3.1 70B Turbo (DeepInfra)",
        capabilities: {
          ...TEXT_CAPS,
          contextWindow: 131072,
          maxOutputTokens: null,
          toolFunctionCalling: unknown("Tool calling depends on the hosted model"),
          ...MULTIMODAL_UNSUPPORTED,
          ...AGENT_BASIC,
          longContextSuitability: supported("official_documentation", "131K context window"),
          imageGeneration: unsupported("official_documentation"),
          webSearch: unsupported("official_documentation"),
          documentGeneration: supported("official_documentation"),
        },
      },
    ],
  },
};

// ─── Registry access functions ──────────────────────────────

/**
 * Get the capability profile for a provider.
 */
export function getProviderProfile(provider: ByokProvider): ProviderCapabilityProfile | null {
  return PROVIDER_CAPABILITY_REGISTRY[provider] || null;
}

/**
 * Find a model entry within a provider's profile.
 * Falls back to the first model if the exact modelId is not found.
 */
export function findModelEntry(
  provider: ByokProvider,
  modelId: string,
): ProviderModelEntry | null {
  const profile = getProviderProfile(provider);
  if (!profile) return null;

  // Exact match
  const exact = profile.models.find((m) => m.modelId === modelId);
  if (exact) return exact;

  // Prefix match (handles model variants like "gpt-4o-mini-2024-07-18")
  const prefix = profile.models.find((m) => modelId.startsWith(m.modelId));
  if (prefix) return prefix;

  // If no match, return null — the caller should treat capabilities as unknown
  return null;
}

/**
 * Get capabilities for a specific provider/model combination.
 * If the model is not in the registry, returns a default profile with all "unknown" capabilities.
 */
export function getModelCapabilities(
  provider: ByokProvider,
  modelId: string,
): ModelCapabilities {
  const entry = findModelEntry(provider, normalizeModelId(modelId));
  if (entry) return entry.capabilities;

  // Unknown model — infer a profile from its model family instead of a fixed list.
  if (modelId && modelId.trim()) return inferModelCapabilities(provider, modelId);

  return {
    textInput: supported("inferred_from_adapter", "All OpenAI-compatible providers support text input"),
    textOutput: supported("inferred_from_adapter"),
    streaming: supported("inferred_from_adapter"),
    systemInstruction: supported("inferred_from_adapter"),
    structuredJsonOutput: unverified("JSON output may not be supported by this model"),
    toolFunctionCalling: unknown("Tool calling not verified for this model"),
    contextWindow: null,
    maxOutputTokens: null,
    imageInput: unknown("Image input not verified for this model"),
    multipleImageInput: unknown("Multiple image input not verified"),
    documentInput: supported("inferred_from_adapter", "Documents are extracted to text — all providers support text"),
    audioInput: unknown("Audio input not verified"),
    audioOutput: unknown("Audio output not verified"),
    realTimeVoice: unknown("Real-time voice not verified"),
    videoInput: unknown("Video input not verified"),
    codeGeneration: supported("official_documentation", "Most text models can generate code"),
    toolExecution: unknown("Tool execution not verified"),
    agentWorkflow: unknown("Agent workflow not verified"),
    longContextSuitability: unknown("Context window unknown"),
    imageGeneration: unsupported("inferred_from_adapter", "Image generation requires a supported provider (OpenAI or OpenRouter)"),
    webSearch: unsupported("inferred_from_adapter", "Web search requires OpenRouter or Perplexity"),
    documentGeneration: supported("official_documentation"),
  };
}

/**
 * Get the registry version.
 */
export function getRegistryVersion(): string {
  return "1.0.0";
}

/**
 * Get the last updated date.
 */
export function getRegistryLastUpdated(): string {
  return "2026-11-03";
}
