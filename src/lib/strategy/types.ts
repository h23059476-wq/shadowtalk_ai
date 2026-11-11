/**
 * Strategy Agent shared types.
 */

export interface BusinessIdea {
  name: string;
  description?: string;
  industry: string;
  location: string;
  targetMarket?: string;
  initialInvestment?: string;
}

export interface SWOTData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface Competitor {
  name: string;
  marketShare: number;
  pricing: string;
  strengths?: string;
  weaknesses?: string;
}

export interface CostItem {
  item: string;
  cost: number;
  notes?: string;
}

export interface FinancialProjection {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface StrategySource {
  title: string;
  url: string;
}

export interface StrategyResearch {
  competitors: Competitor[];
  marketTrends: string[];
  regulations: string[];
  costs: CostItem[];
  opportunities: string[];
  threats: string[];
  sources: StrategySource[];
}

export interface StrategyResult {
  executiveSummary: string;
  swot: SWOTData;
  research: StrategyResearch;
  financialProjections: FinancialProjection[];
  recommendations: string[];
  riskAssessment: string;
  implementationPlan: string[];
}

export type StrategyStepStatus = "pending" | "running" | "completed" | "failed";

export interface StrategyPlanStep {
  id: string;
  action: string;
  tool_name: string;
  status: StrategyStepStatus;
  result?: string | null;
  proof?: { sources?: StrategySource[] } | null;
}

export type StrategyPhase =
  | "idle"
  | "planning"
  | "executing"
  | "synthesizing"
  | "complete"
  | "failed"
  | "error";
