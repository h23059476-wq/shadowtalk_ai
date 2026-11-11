export interface LocalModelDefinition {
  id: string;
  displayName: string;
  version: string;
  quantization: string;
  approxStorageRequirementMB: number;
  approxVRAMRequirementMB: number;
  contextLength: number;
  supportedCapabilities: string[];
  requiresWebGPU: boolean;
  isLowResourceCompatible: boolean;
  isAvailableOffline: boolean;
}

// We start with a lightweight Llama-3 model as the default for browser inference
export const DEFAULT_LOCAL_MODEL: LocalModelDefinition = {
  id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  displayName: "ShadowTalk Local - Lite",
  version: "1.0",
  quantization: "q4f16_1",
  approxStorageRequirementMB: 800,
  approxVRAMRequirementMB: 900,
  contextLength: 4096,
  supportedCapabilities: ["chat", "summarization", "basic_reasoning"],
  requiresWebGPU: true,
  isLowResourceCompatible: true,
  isAvailableOffline: true
};

export const MODEL_REGISTRY: Record<string, LocalModelDefinition> = {
  [DEFAULT_LOCAL_MODEL.id]: DEFAULT_LOCAL_MODEL
};

export function getLocalModelDefinition(id: string): LocalModelDefinition | undefined {
  return MODEL_REGISTRY[id];
}
