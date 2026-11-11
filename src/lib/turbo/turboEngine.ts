import { streamCloudChat } from "@/lib/cloudChat";
import { getCachedAiAccessMode } from "@/lib/aiAccessMode";
import { getByokConfig } from "@/lib/byok";
import { trackAiMetrics, estimateTokens } from "@/lib/telemetry/agenticMetrics";

export interface TurboEngineOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  onDelta?: (accumulated: string) => void;
  taskComplexity?: "low" | "medium" | "high";
}

export interface TurboEngineResult {
  content: string;
  source: "cloud" | "byok";
  modelUsed?: string;
  ttftMs?: number;
  totalMs?: number;
}

export async function turboComplete(
  systemPrompt: string,
  userContent: string,
  opts: TurboEngineOptions = {},
): Promise<TurboEngineResult> {
  const startedAt = performance.now();
  const accessMode = getCachedAiAccessMode();
  const byok = accessMode === "byok" ? getByokConfig() : null;

  if (!accessMode) {
    throw new Error("Add your API key in Settings → Personalization → BYOK to start using AI. ShadowTalk is BYOK-only.");
  }
  if (accessMode === "byok" && !byok?.apiKey) {
    throw new Error("No API key set. Add your key in Settings → Personalization → BYOK to use this feature.");
  }

  const result = await streamCloudChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    {
      model: opts.model || byok?.model,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      signal: opts.signal,
      onDelta: opts.onDelta,
    },
  );

  if (result.error) throw new Error(result.error);

  const totalMs = performance.now() - startedAt;
  trackAiMetrics("llm_completion", {
    source: accessMode === "byok" ? `byok-${byok?.provider}` : "shared-openrouter",
    model: result.modelUsed || opts.model || byok?.model,
    totalMs,
    inputTokens: estimateTokens(systemPrompt + userContent),
    outputTokens: estimateTokens(result.content),
  });

  return {
    content: result.content,
    source: accessMode === "byok" ? "byok" : "cloud",
    modelUsed: result.modelUsed || opts.model || byok?.model,
    totalMs,
  };
}

export function isTurboAvailable(): boolean {
  const mode = getCachedAiAccessMode();
  return mode === "shared" || (mode === "byok" && Boolean(getByokConfig()?.apiKey));
}
