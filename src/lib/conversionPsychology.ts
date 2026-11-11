import { PLAN_DETAILS } from "@/lib/stripe";

/**
 * DORMANT since the free-access transition: ShadowTalk AI has no paid plans,
 * so these conversion helpers no longer drive any UI. Kept for optional
 * monetization in the future.
 */
export const RECOMMENDED_MONTHLY_PLAN = "premium" as const;
export const BEST_MONTHLY_PLAN = RECOMMENDED_MONTHLY_PLAN;

/** When to show in-chat upgrade nudges (ratio of free daily message limit). */
export const NUDGE_THRESHOLDS = {
  soft: 0.4,
  strong: 0.72,
  block: 1,
} as const;

export type MonthlyPlanId = "pro" | "premium" | "elite";

export const MONTHLY_PLANS: MonthlyPlanId[] = ["pro", "premium", "elite"];

export const COMPETITOR_ANCHORS = {
  chatgptPlus: 20,
  chatgptPro: 200,
} as const;

export function dailyPrice(monthlyUsd: number): string {
  const perDay = monthlyUsd / 30;
  return perDay < 1 ? `$${perDay.toFixed(2)}` : `$${perDay.toFixed(0)}`;
}

export function getPlanPsychology(planId: MonthlyPlanId) {
  const details = PLAN_DETAILS[planId];
  return {
    id: planId,
    name: details.name,
    price: details.price,
    daily: dailyPrice(details.price),
    comparison: details.comparison,
    topFeatures: details.features.slice(1, 5),
  };
}

/** @deprecated Prefer getHonestLimitSubline from @/lib/ethicalGrowth */
export function getLossAversionMessage(used: number, limit: number, unit = "messages"): string {
  const remaining = Math.max(0, limit - used);
  if (remaining === 0) {
    return `You've used today's ${limit} free ${unit}. Limits reset at midnight — upgrade for unlimited or continue tomorrow.`;
  }
  if (remaining <= 5) {
    return `${remaining} free ${unit} left today on the Free plan. See /pricing for unlimited access.`;
  }
  const pct = Math.round((used / limit) * 100);
  return `${pct}% of today's free ${unit} used (${used}/${limit}).`;
}

export function getEndowmentMessage(conversationCount: number): string {
  if (conversationCount <= 0) {
    return "Your workspace is ready — unlock unlimited messages before your next deep session.";
  }
  if (conversationCount === 1) {
    return "You've started building context in ShadowTalk. Don't lose momentum to daily caps.";
  }
  return `You've got ${conversationCount} conversations here. Premium keeps history, speed, and tools unlocked.`;
}

export function getSocialProofLine(creatorCount?: number | null): string {
  if (creatorCount && creatorCount >= 100) {
    return `Join ${creatorCount >= 1000 ? `${Math.floor(creatorCount / 100) / 10}K+` : `${creatorCount}+`} builders on ShadowTalk`;
  }
  return "Built for founders who ship with AI daily";
}

export function getRiskReversalBullets(): string[] {
  return [
    "Cancel anytime — no lock-in",
    "30-day money-back guarantee",
    "Instant activation after payment",
    "Keep your chats & settings",
  ];
}

export function getValueAnchorLine(planId: MonthlyPlanId): string {
  if (planId === "pro") {
    return `Less than ${dailyPrice(PLAN_DETAILS.pro.price)}/day · 4× cheaper than ChatGPT Plus`;
  }
  if (planId === "premium") {
    return `Same price tier as ChatGPT Plus — more agentic tools included`;
  }
  return `90% less than ChatGPT Pro ($${COMPETITOR_ANCHORS.chatgptPro}/mo)`;
}
