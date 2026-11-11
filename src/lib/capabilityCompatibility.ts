/**
 * Capability Compatibility Engine
 *
 * Evaluates whether a provider/model can support a required task.
 * Checks BOTH:
 * 1. Model/provider capabilities (from the registry)
 * 2. ShadowTalk's own integration capabilities (what the adapter actually implements)
 *
 * A provider capability alone does not prove that ShadowTalk's feature works.
 */

import type { ByokProvider } from "@/lib/byok";
import { getModelCapabilities, type CapabilityDetail, type ModelCapabilities, type CapabilityStatus } from "./capabilityRegistry";

export type FeatureRequirement =
  | "text_chat"
  | "image_analysis"
  | "image_generation"
  | "image_editing"
  | "document_analysis"
  | "document_generation"
  | "video_analysis"
  | "voice_input"
  | "voice_output"
  | "real_time_voice"
  | "web_search"
  | "tool_calling"
  | "agent_workflow"
  | "structured_output"
  | "code_generation"
  | "long_context";

export interface CompatibilityResult {
  compatible: boolean;
  /** What is blocking compatibility, if anything */
  blocker: string | null;
  /** The capability detail that failed (if any) */
  failedCapability: keyof ModelCapabilities | null;
  /** Human-readable explanation */
  explanation: string;
  /** Whether the limitation is from the model or from ShadowTalk's integration */
  limitationSource: "model" | "shadowtalk_integration" | "both" | "none";
}

/**
 * ShadowTalk's own integration capabilities.
 * These describe what ShadowTalk's adapters ACTUALLY implement,
 * independent of what the provider/model supports.
 *
 * A provider may support a capability (e.g., audio output) but
 * ShadowTalk's adapter may not implement it.
 */
const SHADOWTALK_INTEGRATION_CAPS: Record<FeatureRequirement, {
  supported: boolean;
  explanation: string;
}> = {
  text_chat: { supported: true, explanation: "ShadowTalk's chat adapter supports text conversations" },
  image_analysis: { supported: true, explanation: "ShadowTalk's chat adapter can send images to vision models" },
  image_generation: {
    supported: true,
    explanation: "ShadowTalk's cloudImage.ts supports image generation via OpenAI and OpenRouter",
  },
  image_editing: {
    supported: true,
    explanation: "ShadowTalk's cloudImage.ts supports image editing via OpenAI's image edits endpoint",
  },
  document_analysis: {
    supported: true,
    explanation: "ShadowTalk's documentIntelligence.ts extracts text from documents and sends it to the model",
  },
  document_generation: {
    supported: true,
    explanation: "ShadowTalk's unifiedDocumentPipeline.ts generates documents via turboComplete",
  },
  video_analysis: {
    supported: true,
    explanation: "ShadowTalk's videoIntelligence.ts extracts frames and sends them as images",
  },
  voice_input: {
    supported: false,
    explanation: "ShadowTalk's voice mode uses the Web Speech API for input, not the model's audio input",
  },
  voice_output: {
    supported: true,
    explanation: "ShadowTalk uses ElevenLabs TTS for voice output (separate from the AI model)",
  },
  real_time_voice: {
    supported: false,
    explanation: "ShadowTalk's LiveVoiceMode does not use the model's realtime API — it uses a turn-based flow with TTS",
  },
  web_search: {
    supported: true,
    explanation: "ShadowTalk's adapter supports web search via OpenRouter's web_search tool",
  },
  tool_calling: {
    supported: true,
    explanation: "ShadowTalk's executeShadowTool.ts implements tool execution",
  },
  agent_workflow: {
    supported: true,
    explanation: "ShadowTalk's useAgentTasks and useStrategyRunner implement agent workflows",
  },
  structured_output: {
    supported: true,
    explanation: "ShadowTalk's adapter sends response_format: json_object when structuredOutput is requested",
  },
  code_generation: {
    supported: true,
    explanation: "ShadowTalk's chat and IDE support code generation",
  },
  long_context: {
    supported: true,
    explanation: "ShadowTalk trims conversation history to the last 14 messages for speed — long context depends on the model's window",
  },
};

/**
 * Map a feature requirement to the model capabilities it needs.
 */
function getRequiredCapabilities(feature: FeatureRequirement): Array<{
  key: keyof ModelCapabilities;
  label: string;
}> {
  switch (feature) {
    case "text_chat":
      return [{ key: "textInput", label: "text input" }, { key: "textOutput", label: "text output" }];
    case "image_analysis":
      return [{ key: "imageInput", label: "image input (vision)" }];
    case "image_generation":
      return [{ key: "imageGeneration", label: "image generation" }];
    case "image_editing":
      return [{ key: "imageGeneration", label: "image generation (editing uses the same endpoint)" }];
    case "document_analysis":
      return [{ key: "documentInput", label: "document input" }];
    case "document_generation":
      return [{ key: "documentGeneration", label: "document generation" }];
    case "video_analysis":
      return [{ key: "videoInput", label: "video input" }];
    case "voice_input":
      return [{ key: "audioInput", label: "audio input" }];
    case "voice_output":
      return [{ key: "audioOutput", label: "audio output" }];
    case "real_time_voice":
      return [{ key: "realTimeVoice", label: "real-time voice" }];
    case "web_search":
      return [{ key: "webSearch", label: "web search" }];
    case "tool_calling":
      return [{ key: "toolFunctionCalling", label: "tool/function calling" }];
    case "agent_workflow":
      return [{ key: "agentWorkflow", label: "agent workflow" }];
    case "structured_output":
      return [{ key: "structuredJsonOutput", label: "structured JSON output" }];
    case "code_generation":
      return [{ key: "codeGeneration", label: "code generation" }];
    case "long_context":
      return [{ key: "longContextSuitability", label: "long context suitability" }];
    default:
      return [];
  }
}

/**
 * Check if a capability detail passes a requirement.
 * "supported" passes. "unsupported" fails. "unknown" and "unverified" are
 * treated as a soft pass with a warning (the feature may work but is not confirmed).
 */
function checkCapabilityDetail(detail: CapabilityDetail): {
  passes: boolean;
  isWarning: boolean;
} {
  if (detail.status === "supported") return { passes: true, isWarning: false };
  if (detail.status === "unsupported") return { passes: false, isWarning: false };
  // unknown and unverified — soft pass with warning
  return { passes: true, isWarning: true };
}

/**
 * Evaluate whether a provider/model can support a feature requirement.
 *
 * Checks both:
 * 1. The model's capabilities (from the registry)
 * 2. ShadowTalk's integration capabilities (what the adapter actually implements)
 */
export function checkCompatibility(
  provider: ByokProvider,
  modelId: string,
  feature: FeatureRequirement,
): CompatibilityResult {
  const integrationCap = SHADOWTALK_INTEGRATION_CAPS[feature];

  // Step 1: Check ShadowTalk's integration capability
  if (!integrationCap.supported) {
    return {
      compatible: false,
      blocker: `ShadowTalk's integration does not support ${feature.replace(/_/g, " ")}.`,
      failedCapability: null,
      explanation: integrationCap.explanation,
      limitationSource: "shadowtalk_integration",
    };
  }

  // Step 2: Check model capabilities
  const caps = getModelCapabilities(provider, modelId);
  const required = getRequiredCapabilities(feature);

  const warnings: string[] = [];
  for (const req of required) {
    const detail = caps[req.key] as CapabilityDetail;
    const check = checkCapabilityDetail(detail);

    if (!check.passes) {
      // Hard failure — model does not support this capability
      return {
        compatible: false,
        blocker: `The selected model does not support ${req.label}.`,
        failedCapability: req.key,
        explanation: detail.notes || `This model's ${req.label} capability is marked as ${detail.status}.`,
        limitationSource: "model",
      };
    }

    if (check.isWarning) {
      warnings.push(`${req.label}: ${detail.status} — ${detail.notes || "not verified"}`);
    }
  }

  // Step 3: All checks passed (possibly with warnings)
  if (warnings.length > 0) {
    return {
      compatible: true,
      blocker: null,
      failedCapability: null,
      explanation: `Compatible with warnings: ${warnings.join("; ")}`,
      limitationSource: "none",
    };
  }

  return {
    compatible: true,
    blocker: null,
    failedCapability: null,
    explanation: "Fully compatible.",
    limitationSource: "none",
  };
}

/**
 * Check multiple feature requirements at once.
 * Returns the first incompatibility, or null if all are compatible.
 */
export function checkCompatibilityBatch(
  provider: ByokProvider,
  modelId: string,
  ...features: FeatureRequirement[]
): CompatibilityResult | null {
  for (const feature of features) {
    const result = checkCompatibility(provider, modelId, feature);
    if (!result.compatible) return result;
  }
  return null;
}

/**
 * Get a human-readable capability summary for a model.
 */
export function getCapabilitySummary(
  provider: ByokProvider,
  modelId: string,
): {
  supported: string[];
  unsupported: string[];
  unknown: string[];
} {
  const caps = getModelCapabilities(provider, modelId);
  const supported: string[] = [];
  const unsupported: string[] = [];
  const unknown: string[] = [];

  const entries: Array<{ key: keyof ModelCapabilities; label: string }> = [
    { key: "textInput", label: "Text input" },
    { key: "textOutput", label: "Text output" },
    { key: "streaming", label: "Streaming" },
    { key: "systemInstruction", label: "System instructions" },
    { key: "structuredJsonOutput", label: "Structured JSON output" },
    { key: "toolFunctionCalling", label: "Tool/function calling" },
    { key: "imageInput", label: "Image analysis (vision)" },
    { key: "multipleImageInput", label: "Multiple image input" },
    { key: "documentInput", label: "Document input" },
    { key: "audioInput", label: "Audio input" },
    { key: "audioOutput", label: "Audio output" },
    { key: "realTimeVoice", label: "Real-time voice" },
    { key: "videoInput", label: "Video input" },
    { key: "codeGeneration", label: "Code generation" },
    { key: "imageGeneration", label: "Image generation" },
    { key: "webSearch", label: "Web search" },
    { key: "documentGeneration", label: "Document generation" },
    { key: "longContextSuitability", label: "Long context" },
  ];

  for (const entry of entries) {
    const detail = caps[entry.key] as CapabilityDetail;
    if (detail.status === "supported") supported.push(entry.label);
    else if (detail.status === "unsupported") unsupported.push(entry.label);
    else unknown.push(entry.label);
  }

  return { supported, unsupported, unknown };
}
