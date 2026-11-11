import { FREE_TIER_DAILY } from "@/lib/productClaims";
import { PLAN_DETAILS } from "@/lib/stripe";
import { getRiskReversalBullets } from "@/lib/conversionPsychology";

/** Public proof pages — always link to real product surfaces */
export const PROOF_LINKS = [
  { href: "/changelog", label: "Changelog" },
  { href: "/status", label: "Status" },
  { href: "/docs", label: "Docs" },
  { href: "/trust", label: "Security & trust" },
  { href: "/transparency", label: "Data handling" },
  { href: "/competitive", label: "Feature comparison" },
] as const;

export const PRICING_TRANSPARENCY = {
  cancel: "There is nothing to cancel — ShadowTalk AI is free to use with no subscriptions.",
  refund: "No payments are collected, so there is nothing to refund. Provider API charges are billed by your provider.",
  data:
    "Cloud chat uses our servers; the encrypted vault, and optional on-device models keep sensitive work under your control.",
  privacyLinks: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/transparency", label: "Transparency" },
    { href: "/gdpr", label: "GDPR" },
  ],
  trustBullets: getRiskReversalBullets(),
} as const;

export function getFreeTierSummary(): string {
  return `Free: every feature included — no subscription, no credit card. Bring your own AI provider API key.`;
}

export function getPaidTierOneLiner(plan: "pro" | "premium" | "elite" = "premium"): string {
  // Free access transition: there are no paid tiers anymore.
  void plan;
  return "There are no paid tiers — ShadowTalk AI is free to use. Your AI provider may charge separately for API usage.";
}

/** Honest usage copy — no fake scarcity */
export function getHonestLimitHeadline(used: number, limit: number): string {
  if (limit === Infinity) return "";
  const remaining = Math.max(0, limit - used);
  if (remaining === 0) return "You've used today's free message allowance";
  if (remaining <= 5) return `${remaining} free messages left today`;
  return `${used} of ${limit} free messages used today`;
}

export function getHonestLimitSubline(used: number, limit: number): string {
  if (limit === Infinity) return "";
  const remaining = Math.max(0, limit - used);
  if (remaining === 0) {
    return "Limits reset at midnight UTC. Upgrade for unlimited messages, or continue tomorrow on Free.";
  }
  return `Free tier includes ${limit} messages per day. See pricing for unlimited access — no hidden fees.`;
}

export const REFERRAL_ETHICS = {
  title: "Share on your terms",
  bullets: [
    "Copy your personal link — we never message your contacts for you.",
    "Rewards apply when someone signs up through your link and subscribes.",
    "Commission rates are shown below; payouts follow our referral terms.",
  ],
  noSpam: "ShadowTalk does not import address books or send unsolicited invites.",
} as const;

export const PROACTIVE_ETHICS = {
  storageKey: "shadowtalk-proactive-opt-in",
  label: "Optional suggestion",
  enableTitle: "Optional workspace suggestions",
  enableBody:
    "ShadowTalk can show occasional, labeled tips based on what you're doing — never hidden tracking pitches. You can turn this off anytime.",
  dismiss: "Not now",
  disable: "Turn off suggestions",
  maxPerSession: 4,
} as const;

export const COMMUNITY_ETHICS = {
  title: "Building in public",
  subtitle:
    "Real changelog entries, public status, and founder-led feedback — no fabricated testimonials or fake user counts.",
  ctaFeedback: { href: "/contact", label: "Send feedback" },
  ctaChangelog: { href: "/changelog", label: "See the roadmap in changelog" },
} as const;

export const COMPARISON_DISCLAIMER =
  "Comparisons reflect ShadowTalk features and public competitor positioning as of our last docs update — verify current pricing on each provider's site.";

/** Neutral labels for proactive UI — no manipulative copy */
export function getProactiveTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    greeting: "Welcome",
    returning: "Welcome back",
    nudge: "Tip",
    contextual: "Tip",
    milestone: "Milestone",
  };
  return labels[type] ?? PROACTIVE_ETHICS.label;
}
