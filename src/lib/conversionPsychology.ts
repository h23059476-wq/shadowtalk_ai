import { FREE_TIER_DAILY } from "@/lib/productClaims";

// Free-access transition: Stripe `PLAN_DETAILS` import removed.
// The paid-tier psychology lines (Pro $5, Premium $15, Elite $20) were
// contradicting the canonical free-access claim. The remaining
// `MonthlyPlanId` type is kept for backward compatibility with callers
// that import it, but all `getValueAnchorLine(planId)` branches now
// return honest free-access wording. See docs/audit/CLAIMS_REALITY_REPORT.md P1-1.

/** Best default — now unused under free access; kept for type compatibility. */
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
  // Always show 2 decimals when <$1 so BYOK renders "$0.50/day", not "$0/day".
  if (perDay < 1) {
    return `$${perDay.toFixed(2)}`;
  }
  return `$${perDay.toFixed(0)}`;
}

// `getPlanPsychology` removed — it depended on PLAN_DETAILS, which is no
// longer imported. If you need plan display info, use the free-access
// canonical strings in src/lib/productClaims.ts instead.

/** @deprecated Prefer getHonestLimitSubline from @/lib/ethicalGrowth */
export function getLossAversionMessage(used: number, limit: number, unit = "messages"): string {
  const remaining = Math.max(0, limit - used);
  if (remaining === 0) {
    return `You've used today's ${limit} free ${unit}. Limits reset at midnight — add a BYOK API key for unlimited, or continue tomorrow.`;
  }
  if (remaining <= 5) {
    return `${remaining} free ${unit} left today on the shared tier. Add a BYOK API key for unlimited.`;
  }
  const pct = Math.round((used / limit) * 100);
  return `${pct}% of today's free ${unit} used (${used}/${limit}).`;
}

export function getEndowmentMessage(conversationCount: number): string {
  if (conversationCount <= 0) {
    return "Your workspace is ready — add a BYOK API key to remove daily caps before your next deep session.";
  }
  if (conversationCount === 1) {
    return "You've started building context in ShadowTalk. Don't lose momentum to daily caps.";
  }
  return `You've got ${conversationCount} conversations here. A BYOK key keeps history, speed, and tools unlocked.`;
}

export function getSocialProofLine(creatorCount?: number | null): string {
  if (creatorCount && creatorCount >= 100) {
    return `Join ${creatorCount >= 1000 ? `${Math.floor(creatorCount / 100) / 10}K+` : `${creatorCount}+`} builders on ShadowTalk`;
  }
  return "Built for founders who ship with AI daily";
}

export function getRiskReversalBullets(): string[] {
  return [
    "Free to use — no subscription, no card",
    "Nothing to cancel and nothing to refund",
    "Instant start — no payment step at all",
    "Keep your chats & settings",
  ];
}

export type AnchorPlanId = MonthlyPlanId | "byok" | "enterprise";

export function getValueAnchorLine(planId: AnchorPlanId): string {
  // Free-access transition: paid plan tiers no longer exist. All branches
  // return honest free-access wording.
  if (planId === "byok") {
    return "Zero platform fees — pay your AI provider directly";
  }
  if (planId === "enterprise") {
    return "Custom pricing — contact sales";
  }
  // pro / premium / elite — return canonical free-access wording
  return "Free to use — add a BYOK API key to remove the daily shared-tier cap";
}
