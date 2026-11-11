import { useAuth } from "@/components/AuthProvider";
import { hasSpecialAccessEmail } from "@/lib/resolveUserPlan";
import { FREE_TIER_DAILY } from "@/lib/productClaims";

/**
 * FREE ACCESS TRANSITION: ShadowTalk AI is free to use — no subscriptions, no
 * paid feature tiers. Every feature is unlocked for every user. The FEATURES
 * map and plan hierarchy are kept so optional monetization can be reintroduced
 * later without re-plumbing the app, but they no longer gate anything.
 */
export const FREE_ACCESS_FOR_EVERYONE = true;

export type PlanTier = 'free' | 'pro' | 'premium' | 'lifetime' | 'elite' | 'enterprise';

export interface FeatureConfig {
  name: string;
  requiredPlan: PlanTier;
  freeLimit?: number;
  description?: string;
}

// ALL features are available on FREE plan (with daily limits).
// Paid plans remove limits + give better models/priority.
export const FEATURES: Record<string, FeatureConfig> = {
  // Core features - FREE for everyone
  basicChat: { name: "AI Chat", requiredPlan: "free" },
  dailyMessages: { name: "Daily Messages", requiredPlan: "free", freeLimit: FREE_TIER_DAILY.messages },
  advancedCodeGeneration: { name: "Code Generation", requiredPlan: "free" },
  chatExport: { name: "Save & Export", requiredPlan: "free" },
  translation100: { name: "Language Translation", requiredPlan: "free" },
  imageGeneration: { name: "Image Generation", requiredPlan: "free", freeLimit: FREE_TIER_DAILY.imageGenerations },
  textToSpeech: { name: "Text-to-Speech", requiredPlan: "free" },
  codeCanvas: { name: "Code Canvas", requiredPlan: "free" },
  documentGeneration: { name: "Document Generation", requiredPlan: "free", freeLimit: FREE_TIER_DAILY.documentGenerations },
  urmFull: { name: "Universal Regulation Mapping", requiredPlan: "free" },

  // Premium features - also FREE but with limits
  pceEngine: { name: "Proactive Context Engine", requiredPlan: "free" },
  mweExecutor: { name: "Multi-Step Workflow Executor", requiredPlan: "free" },
  collaborativeRooms: { name: "Collaborative Rooms", requiredPlan: "free" },
  lifeEventSuggestions: { name: "Life Event Suggestions", requiredPlan: "free" },
  guidedWalkthroughs: { name: "Guided Walkthroughs", requiredPlan: "free" },
  scriptAutomation: { name: "Script Automation", requiredPlan: "free" },

  // Advanced features - FREE with limits
  offlineMode: { name: "Offline Mode", requiredPlan: "free" },
  stealthMode: { name: "Stealth Mode & Encrypted Vault", requiredPlan: "free" },
  aiAgents: { name: "AI Agents", requiredPlan: "free" },
  analyticsDashboard: { name: "Analytics Dashboard", requiredPlan: "free" },
  betaAccess: { name: "Beta Access", requiredPlan: "free" },
  missions: { name: "S.E.E. Missions", requiredPlan: "free", freeLimit: 3 },

  // Paid-only differentiators (limits/priority, not feature locks)
  unlimitedMessages: { name: "Unlimited Messages", requiredPlan: "pro" },
  noAds: { name: "No Advertisements", requiredPlan: "pro" },
  prioritySupport: { name: "Priority Support", requiredPlan: "pro" },
  videoStudio: { name: "Shadow Video Studio", requiredPlan: "pro", description: "Browser viral short generator — Pro & Elite" },
  customFineTuning: { name: "Custom Model Fine-Tuning", requiredPlan: "elite" },
  modelFineTuning: { name: "Model Fine-Tuning", requiredPlan: "elite" },
  whiteLabel: { name: "White-Label Solutions", requiredPlan: "elite" },
  whiteLabelBranding: { name: "White-Label Branding", requiredPlan: "elite" },
  phoneSupport: { name: "24/7 Phone Support", requiredPlan: "elite" },

  // Enterprise-only
  apiAccess: { name: "API Access", requiredPlan: "enterprise" },
  customKnowledgeBase: { name: "Custom Knowledge Base", requiredPlan: "enterprise" },
  teamManagement: { name: "Team Management & SSO", requiredPlan: "enterprise" },
  dedicatedSupport: { name: "Dedicated Account Manager", requiredPlan: "enterprise" },
  slaGuarantee: { name: "SLA Guarantees", requiredPlan: "enterprise" },
  complianceModules: { name: "Custom Compliance Modules", requiredPlan: "enterprise" },
};

const planHierarchy: Record<PlanTier, number> = { /* kept for future optional monetization */
  free: 0,
  pro: 1,
  premium: 2,
  lifetime: 3,
  elite: 3,
  enterprise: 4,
};

export const useFeatureGating = () => {
  const { userPlan, user } = useAuth();

  // Everything is free — all capability flags are always true.
  const hasSpecialAccess =
    FREE_ACCESS_FOR_EVERYONE ||
    hasSpecialAccessEmail(user?.email) ||
    userPlan === "enterprise";

  const getEffectivePlanLevel = (): number => {
    if (hasSpecialAccess) return planHierarchy.enterprise;
    return planHierarchy[userPlan] ?? planHierarchy.free;
  };

  const canAccess = (featureKey: string): boolean => {
    if (hasSpecialAccess) return true;
    const feature = FEATURES[featureKey];
    if (!feature) return true;
    return getEffectivePlanLevel() >= planHierarchy[feature.requiredPlan];
  };

  const checkAccess = (featureKey: string): boolean => {
    // No paywalls: access always granted, no upgrade toasts.
    return canAccess(featureKey);
  };

  const getUpgradeMessage = (_featureKey: string): string => {
    // Free access: there is nothing to upgrade to.
    return "";
  };

  const getDailyMessageLimit = (): number => {
    // Free access: no daily message cap from the product itself. Providers may
    // still enforce their own API limits.
    return Infinity;
  };

  const effectiveLevel = getEffectivePlanLevel();

  return {
    // Display stays honest: users are on the free plan. Capabilities are
    // surfaced through the flags below, which are always true.
    userPlan: userPlan as PlanTier,
    canAccess,
    checkAccess,
    getUpgradeMessage,
    getDailyMessageLimit,
    isProOrHigher: true,
    isPremiumOrHigher: true,
    isElite: true,
    isEnterprise: hasSpecialAccess,
    hasSpecialAccess,
  };
};
