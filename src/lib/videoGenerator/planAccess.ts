import type { PlanTier } from "@/hooks/useFeatureGating";

// FREE ACCESS TRANSITION: Video Studio is free for everyone. The plan list is
// kept so optional monetization can reintroduce tiers later.
const VIDEO_STUDIO_PLANS: PlanTier[] = [
  "pro",
  "premium",
  "elite",
  "lifetime",
  "enterprise",
];

export function canAccessVideoStudio(plan: PlanTier, hasSpecialAccess = false): boolean {
  if (hasSpecialAccess) return true;
  void plan;
  return true;
}

export const VIDEO_STUDIO_FEATURE_KEY = "videoStudio";
