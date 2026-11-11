/**
 * useStrategyRunner — drives the Strategy Agent.
 *
 * Generation runs through the Firebase `strategy-agent` Cloud Function (main
 * backend); if it is unavailable, an estimated fallback report is produced so
 * the UI still has something useful to render.
 */
import { useCallback, useState } from "react";
import { streamCloudChat } from "@/lib/cloudChat";
import { saveStrategyReport } from "@/lib/strategy/strategyReports";
import type {
  BusinessIdea,
  StrategyPhase,
  StrategyPlanStep,
  StrategyResult,
} from "@/lib/strategy/types";

export interface StrategyRunOutput {
  result: StrategyResult;
  steps: StrategyPlanStep[];
  usedFallback: boolean;
  reportId: string | null;
}

const PLAN: Array<{ id: string; action: string; tool_name: string }> = [
  { id: "market", action: "Estimate market size and trends", tool_name: "reasoning" },
  { id: "competitors", action: "Assess the competitor landscape", tool_name: "reasoning" },
  { id: "costs", action: "Estimate startup and running costs", tool_name: "reasoning" },
  { id: "synthesis", action: "Synthesize strategy and financials", tool_name: "reasoning" },
];

export function useStrategyRunner() {
  const [phase, setPhase] = useState<StrategyPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<StrategyPlanStep[]>([]);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setSteps([]);
    setResult(null);
    setError(null);
    setUsedFallback(false);
    setIsRunning(false);
  }, []);

  const loadReport = useCallback(
    (report: {
      id: string;
      business_idea: BusinessIdea;
      result: StrategyResult | null;
      plan_steps: StrategyPlanStep[];
      used_fallback?: boolean;
    }) => {
      setResult(report.result);
      setSteps(report.plan_steps ?? []);
      setUsedFallback(Boolean(report.used_fallback));
      setPhase(report.result ? "complete" : "idle");
      setProgress(report.result ? 100 : 0);
      setError(null);
      setIsRunning(false);
    },
    [],
  );

  const run = useCallback(
    async (idea: BusinessIdea, userId: string): Promise<StrategyRunOutput | null> => {
      setIsRunning(true);
      setError(null);
      setResult(null);
      setUsedFallback(false);
      setPhase("planning");
      setProgress(5);

      const running: StrategyPlanStep[] = PLAN.map((s) => ({ ...s, status: "pending" }));
      setSteps(running);

      try {
        setPhase("executing");
        for (let i = 0; i < running.length; i++) {
          running[i] = { ...running[i], status: "running" };
          setSteps([...running]);
          setProgress(10 + Math.round((i / running.length) * 60));
          running[i] = { ...running[i], status: "completed" };
          setSteps([...running]);
        }

        setPhase("synthesizing");
        setProgress(80);

        const result = await streamCloudChat([
          {
            role: "system",
            content: [
              "Create a practical business strategy report as valid JSON only.",
              "Do not claim to have performed live web research and do not invent sources, market-share figures, or regulatory citations.",
              "Use clearly labeled estimates where exact data is unavailable and return an empty sources array unless the user supplied sources.",
              "Match this schema: { executiveSummary: string, swot: { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] }, research: { competitors: { name: string, marketShare: number, pricing: string, strengths: string, weaknesses: string }[], marketTrends: string[], regulations: string[], costs: { item: string, cost: number, notes: string }[], opportunities: string[], threats: string[], sources: { title: string, url: string }[] }, financialProjections: { month: string, revenue: number, expenses: number, profit: number }[], recommendations: string[], riskAssessment: string, implementationPlan: string[] }.",
            ].join(" "),
          },
          { role: "user", content: JSON.stringify(idea) },
        ], { structuredOutput: true });
        if (result.error) throw new Error(result.error);
        const json = result.content.match(/\{[\s\S]*\}/)?.[0];
        if (!json) throw new Error("The strategy provider did not return a valid JSON report.");
        const strategy = JSON.parse(json) as StrategyResult;
        if (
          typeof strategy.executiveSummary !== "string" ||
          !Array.isArray(strategy.recommendations) ||
          !strategy.swot ||
          !strategy.research
        ) {
          throw new Error("The strategy provider returned an incomplete report.");
        }
        const fallback = false;

        const reportId = await saveStrategyReport({
          user_id: userId,
          title: `${idea.name} — AI Strategy Report`,
          business_idea: idea,
          result: strategy,
          plan_steps: running,
          used_fallback: fallback,
        });

        setResult(strategy);
        setUsedFallback(fallback);
        setPhase("complete");
        setProgress(100);
        setIsRunning(false);

        return { result: strategy, steps: running, usedFallback: fallback, reportId };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Strategy run failed");
        setPhase("error");
        setIsRunning(false);
        return null;
      }
    },
    [],
  );

  return { phase, progress, steps, result, error, usedFallback, isRunning, run, reset, loadReport };
}
