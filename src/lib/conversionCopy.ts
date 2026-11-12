import { FREE_TIER_DAILY } from "@/lib/productClaims";
import {
  getEndowmentMessage,
  getRiskReversalBullets,
  type AnchorPlanId,
} from "@/lib/conversionPsychology";
import { getHonestLimitHeadline, getHonestLimitSubline } from "@/lib/ethicalGrowth";

// Free-access transition: ShadowTalk AI is free to use. The previous
// implementation imported `PLAN_DETAILS` from `@/lib/stripe` (dormant
// Stripe config) and surfaced "Premium ($15/mo)" upgrade copy. That copy
// contradicted the canonical free-access claim. We now reference only
// the canonical free-access wording and let BYOK / shared mode do the
// explaining. See docs/audit/CLAIMS_REALITY_REPORT.md P1-1 and P2-2.

export type UpgradeNudgeLevel = "soft" | "strong" | "blocking";

/** Strong, truthful upgrade lines for in-chat nudges */
export function getUpgradeNudgeHeadline(used: number, limit: number, level: UpgradeNudgeLevel): string {
  const honest = getHonestLimitHeadline(used, limit);
  if (level === "soft") {
    return honest || "Free shared AI — daily message cap";
  }
  if (level === "strong") {
    return honest || "You're close to today's free message limit";
  }
  return honest || "You've used today's free message allowance";
}

export function getUpgradeNudgeSubline(
  used: number,
  limit: number,
  level: UpgradeNudgeLevel,
  conversationCount = 0,
  _plan?: AnchorPlanId,
): string {
  const honest = getHonestLimitSubline(used, limit);
  const endowment = getEndowmentMessage(conversationCount);

  if (level === "blocking") {
    return `${honest} Add your own AI provider API key in Settings → Personalization → BYOK for unlimited messages, or continue tomorrow on the free shared tier.`;
  }
  if (level === "strong") {
    return `${endowment} Adding a BYOK key keeps momentum without daily caps.`;
  }
  return `${honest} When ShadowTalk is your daily driver, BYOK removes the shared-tier cap and lets you choose any provider.`;
}

export const FREE_TIER_MARKETING = {
  title: "Free to use — everything included",
  hook: "No subscription, no credit card. Bring your own AI provider API key and choose your preferred models.",
  cta: "How free access works →",
} as const;

export const PRICING_PAGE_HOOK =
  "Free to use — no subscriptions, no checkout. Bring your own AI provider API key; your provider bills you directly for API usage.";

export const COMMUNITY_MARKETING = {
  title: "Building in public",
  headline: "Ship with us — not around us",
  subtitle:
    "Follow the real changelog, uptime, and security docs. Early builders shape agents, tools, and pricing — no inflated user counts or stock testimonials.",
} as const;

export const PROACTIVE_MARKETING = {
  enableTitle: "Want occasional workspace tips?",
  enableBody:
    "We can surface labeled suggestions (new tools, shortcuts, limits) — max a few per visit, easy dismiss, off anytime. No hidden sales scripts.",
} as const;

export const CHAT_LIMIT_TOAST = {
  title: "Daily free limit reached",
  description:
    "Free shared AI is capped at 100 requests/day. Add your own AI provider API key (BYOK) in Settings → Personalization → BYOK for unlimited messages. Limits reset at midnight UTC.",
} as const;

export const PROOF_BAR_LABEL = "Verify before you buy:";
