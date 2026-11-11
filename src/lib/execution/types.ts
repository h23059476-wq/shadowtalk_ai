import type { StrategyResult } from "@/lib/strategy/types";

export type DeliverableType = "general" | "strategy_report" | "research_brief" | "content_pack";

export interface ExecutionDeliverable {
  deliverableType: DeliverableType;
  strategy?: StrategyResult | null;
  usedFallback?: boolean;
  stepOutputs: any[];
  markdown: string;
}
