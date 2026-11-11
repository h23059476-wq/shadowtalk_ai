import { useMemo } from "react";

export type NudgeIntensity = "none" | "soft" | "strong" | "blocking";

export interface SubscriptionNudgeState {
  intensity: NudgeIntensity;
  shouldShowBanner: boolean;
  shouldBlockSend: boolean;
  limit: number;
  used: number;
  remaining: number;
  recommendedPlan: string;
  headline: string;
  subline: string;
}

/**
 * FREE ACCESS TRANSITION: ShadowTalk AI is free to use — there are no plans to
 * upgrade to, so upgrade nudges never fire. The hook shape is preserved so any
 * remaining call sites keep working (they only ever see the "none" state), and
 * optional monetization can re-enable nudges later without re-plumbing.
 */
export function useSubscriptionNudge(
  dailyMessagesUsed: number,
  _conversationCount = 0,
): SubscriptionNudgeState {
  return useMemo<SubscriptionNudgeState>(
    () => ({
      intensity: "none",
      shouldShowBanner: false,
      shouldBlockSend: false,
      limit: Infinity,
      used: dailyMessagesUsed,
      remaining: Infinity,
      recommendedPlan: "",
      headline: "",
      subline: "",
    }),
    [dailyMessagesUsed],
  );
}
