import { PLAN_DETAILS } from "@/lib/stripe";
import { FREE_TIER_DAILY } from "@/lib/productClaims";
import {
  getEndowmentMessage,
  getValueAnchorLine,
  RECOMMENDED_MONTHLY_PLAN,
  type MonthlyPlanId,
} from "@/lib/conversionPsychology";
import { getHonestLimitHeadline, getHonestLimitSubline } from "@/lib/ethicalGrowth";

export type UpgradeNudgeLevel = "soft" | "strong" | "blocking";

const premium = PLAN_DETAILS[RECOMMENDED_MONTHLY_PLAN];

/** Strong, truthful upgrade lines for in-chat nudges */
export function getUpgradeNudgeHeadline(used: number, limit: number, level: UpgradeNudgeLevel): string {
  const honest = getHonestLimitHeadline(used, limit);
  if (level === "soft") {
    return honest || "Free tier — full agent stack, daily message cap";
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
  plan: MonthlyPlanId = RECOMMENDED_MONTHLY_PLAN,
): string {
  const honest = getHonestLimitSubline(used, limit);
  const anchor = getValueAnchorLine(plan);
  const endowment = getEndowmentMessage(conversationCount);

  if (level === "blocking") {
    return `${honest} ${premium.name} ($${premium.price}/mo) — unlimited messages, Mission Control, ${anchor}.`;
  }
  if (level === "strong") {
    return `${endowment} ${premium.name} keeps momentum without daily caps — ${anchor}.`;
  }
  return `${honest} When ShadowTalk is your daily driver, ${premium.name} removes caps and unlocks Mission Control.`;
}

export const FREE_TIER_MARKETING = {
  title: "Free to use — everything included",
  hook: "No subscription, no credit card. Bring your own AI provider API key and choose your preferred models.",
  cta: "How free access works →",
} as const;

export const PRICING_PAGE_HOOK =
  "ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage.";

export const COMMUNITY_MARKETING = {
  title: "Building in public",
  headline: "Ship with us — not around us",
  subtitle:
    "Follow the real changelog, uptime, and security docs. Early builders shape Mission Control, agents, and pricing — no inflated user counts or stock testimonials.",
} as const;

export const PROACTIVE_MARKETING = {
  enableTitle: "Want occasional workspace tips?",
  enableBody:
    "We can surface labeled suggestions (new tools, shortcuts, limits) — max a few per visit, easy dismiss, off anytime. No hidden sales scripts.",
} as const;

export const CHAT_LIMIT_TOAST = {
  title: "All features are free",
  description:
    "ShadowTalk AI is free to use — no daily caps from us. Your AI provider may enforce its own API usage limits.",
} as const;

export const PROOF_BAR_LABEL = "Verify before you buy:";
