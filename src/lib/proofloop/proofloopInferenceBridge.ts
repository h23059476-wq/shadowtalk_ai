/**
 * ShadowTalk ProofLoop — Inference Engine Bridge
 *
 * Integrates directly with ShadowTalk's three existing AI execution paths:
 * 1. Shared Cloud: Firebase Functions -> OpenRouter (with daily quota enforcement)
 * 2. BYOK: Direct browser-to-provider streaming (OpenAI, Anthropic, Gemini, Groq, etc.)
 * 3. Local Sovereign AI: WebLLM running in dedicated Web Worker
 *
 * STRICT PRODUCT CONSTRAINTS:
 * - Never silently change providers or models.
 * - Never fall back from BYOK to platform-funded inference.
 * - Never silently switch from local inference to cloud inference.
 * - Disclose when a capability is unsupported in the selected mode.
 */

import { fbAuth } from "@/integrations/firebase/app";
import { getCachedAiAccessMode } from "@/lib/aiAccessMode";
import { getByokConfig, streamByokChat, BYOK_PROVIDERS } from "@/lib/byok";
import { streamCloudChat, type CloudChatMessage, type CloudChatOptions, type CloudChatResult } from "@/lib/cloudChat";
import { AIProviderRouter } from "@/ai/AIProviderRouter";
import { localInferenceEngine } from "@/offline/LocalInferenceEngine";

export type InferencePathType = "byok" | "shared" | "local";

export interface ActiveInferenceMetadata {
  path: InferencePathType;
  providerLabel: string;
  model: string;
  isAvailable: boolean;
  unavailabilityReason?: string;
}

/**
 * Inspects and returns the currently active inference path and its readiness.
 */
export async function getActiveInferencePath(): Promise<ActiveInferenceMetadata> {
  // 1. Check if user configured local preference or is offline
  if (!navigator.onLine) {
    const isLoaded = localInferenceEngine.isLoaded();
    return {
      path: "local",
      providerLabel: "Local Sovereign AI (WebLLM)",
      model: "Local WebGPU Model",
      isAvailable: isLoaded,
      unavailabilityReason: isLoaded ? undefined : "Device is offline and local WebLLM model is not loaded in memory.",
    };
  }

  // 2. Online: check account AI access mode
  const mode = getCachedAiAccessMode();

  if (mode === "byok") {
    const byok = getByokConfig();
    if (!byok?.apiKey) {
      return {
        path: "byok",
        providerLabel: byok?.provider ? BYOK_PROVIDERS[byok.provider]?.label || byok.provider : "BYOK Provider",
        model: byok?.model || "Unset",
        isAvailable: false,
        unavailabilityReason: "BYOK mode selected but no provider API key is stored. Configure key in Settings → Personalization → BYOK.",
      };
    }
    const info = BYOK_PROVIDERS[byok.provider];
    return {
      path: "byok",
      providerLabel: info?.label || byok.provider,
      model: byok.model,
      isAvailable: true,
    };
  }

  // 3. Shared cloud mode
  const user = fbAuth().currentUser;
  return {
    path: "shared",
    providerLabel: "ShadowTalk Shared Cloud (OpenRouter)",
    model: "openrouter/free",
    isAvailable: Boolean(user),
    unavailabilityReason: user ? undefined : "Sign in to use ShadowTalk Shared Cloud inference.",
  };
}

/**
 * Executes a mission prompt using strictly the user's active inference path.
 * Guarantees zero silent fallbacks or cross-provider leaks.
 */
export async function executeMissionPrompt(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    forceFailureMode?: boolean; // For testing deliberately induced failures
    onDelta?: (delta: string) => void;
  } = {},
): Promise<{ content: string; pathUsed: InferencePathType; providerUsed: string; modelUsed: string }> {
  // If deliberately testing a verification failure, simulate or instruct the prompt accordingly
  if (options.forceFailureMode) {
    return {
      content: `# Fictional Product Ideas Report\n\n## 1. NeuroSync Headband\nA non-invasive EEG headband that translates focused cognitive intent into terminal commands.\n\n## 2. EchoVault Storage\nA distributed p2p cryptographic ledger for personal documents.\n\n*(Note: Intentionally generated only 2 ideas to test failure detection)*`,
      pathUsed: "byok",
      providerUsed: "Mock/Induced Failure Mode",
      modelUsed: "deterministic-test-runner",
    };
  }

  const meta = await getActiveInferencePath();
  if (!meta.isAvailable) {
    throw new Error(`[ProofLoop Inference Guard] ${meta.unavailabilityReason || "Selected AI inference path is unavailable."}`);
  }

  const messages: CloudChatMessage[] = [
    {
      role: "system",
      content: options.systemPrompt || "You are ShadowTalk AI. Execute the user's mission accurately and provide structured outputs.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const chatOpts: CloudChatOptions = {
    temperature: options.temperature ?? 0.4,
    onDelta: options.onDelta,
  };

  let result: CloudChatResult;

  if (meta.path === "byok") {
    const byok = getByokConfig()!;
    result = await streamByokChat(byok, messages, chatOpts);
  } else if (meta.path === "local") {
    result = await localInferenceEngine.generate(messages, chatOpts);
  } else {
    result = await streamCloudChat(messages, chatOpts);
  }

  if (result.error && !result.content) {
    throw new Error(`[ProofLoop] Inference failed on ${meta.providerLabel}: ${result.error}`);
  }

  return {
    content: result.content,
    pathUsed: meta.path,
    providerUsed: meta.providerLabel,
    modelUsed: meta.model,
  };
}
