/**
 * Strategy report persistence — stored in Firebase (Firestore), the main backend.
 */
import { backendLoose } from "@/integrations/local/loose";
import type { BusinessIdea, StrategyPlanStep, StrategyResult } from "./types";

export interface StrategyReportRow {
  id: string;
  user_id: string;
  title: string;
  business_idea: BusinessIdea | Record<string, unknown>;
  result: StrategyResult | Record<string, unknown> | null;
  plan_steps: StrategyPlanStep[] | unknown;
  used_fallback: boolean;
  created_at: string;
}

const TABLE = "strategy_reports";

export async function listStrategyReports(userId: string): Promise<StrategyReportRow[]> {
  try {
    const { data } = await backendLoose
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as StrategyReportRow[]) ?? [];
  } catch {
    return [];
  }
}

export async function saveStrategyReport(input: {
  user_id: string;
  title: string;
  business_idea: BusinessIdea;
  result: StrategyResult | null;
  plan_steps: StrategyPlanStep[];
  used_fallback?: boolean;
}): Promise<string | null> {
  try {
    const { data } = await backendLoose
      .from(TABLE)
      .insert({
        ...input,
        used_fallback: Boolean(input.used_fallback),
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

export async function deleteStrategyReport(id: string): Promise<void> {
  try {
    await backendLoose.from(TABLE).delete().eq("id", id);
  } catch {
    /* ignore */
  }
}
