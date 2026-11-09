import type { ToolType } from "@/hooks/useToolOrchestrator";
import type { Citation } from "@/lib/visualization/types";

export type ShadowToolOutcomeKind = "inline" | "ui" | "chat_flags" | "none";

export interface ShadowToolInlineResult {
  kind: "inline";
  tool: ToolType;
  content: string;
  imageUrl?: string;
  /** Provider-reported citations captured during tool research (Batch 1). */
  citations?: Citation[];
}

export interface ShadowToolUIResult {
  kind: "ui";
  tool: ToolType;
  message?: string;
  path?: string;
  state?: Record<string, unknown>;
}

export interface ShadowToolChatFlagsResult {
  kind: "chat_flags";
  tool: ToolType;
  flags: Record<string, unknown>;
  preamble?: string;
}

export type ShadowToolResult = ShadowToolInlineResult | ShadowToolUIResult | ShadowToolChatFlagsResult;

export interface ExecuteShadowToolContext {
  accessToken?: string;
  personality: string;
  mode: string;
  attachment?: { type: string; data: string; mimeType: string };
}
