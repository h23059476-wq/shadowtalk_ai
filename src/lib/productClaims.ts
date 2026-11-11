/**
 * Single source of truth for product limits and honest marketing copy.
 * Import from here in UI, monetization, Stripe plan text, and enforcement hooks.
 */

export const FREE_TIER_DAILY = {
  messages: 50,
  fileUploads: 20,
  codeGenerations: 20,
  imageGenerations: 20,
  documentGenerations: 20,
  webSearches: 20,
  deepResearch: 5,
  voiceSessions: 3,
} as const;

export type DailyLimitAction = keyof typeof FREE_TIER_DAILY;

export const DAILY_LIMITS = {
  free: { ...FREE_TIER_DAILY },
  pro: {
    messages: Infinity,
    fileUploads: 50,
    codeGenerations: Infinity,
    imageGenerations: 20,
    documentGenerations: 100,
    webSearches: 50,
    deepResearch: 20,
    voiceSessions: Infinity,
  },
  premium: {
    messages: Infinity,
    fileUploads: Infinity,
    codeGenerations: Infinity,
    imageGenerations: 50,
    documentGenerations: Infinity,
    webSearches: Infinity,
    deepResearch: 50,
    voiceSessions: Infinity,
  },
  elite: {
    messages: Infinity,
    fileUploads: Infinity,
    codeGenerations: Infinity,
    imageGenerations: Infinity,
    documentGenerations: Infinity,
    webSearches: Infinity,
    deepResearch: Infinity,
    voiceSessions: Infinity,
  },
  lifetime: {
    messages: Infinity,
    fileUploads: Infinity,
    codeGenerations: Infinity,
    imageGenerations: Infinity,
    documentGenerations: Infinity,
    webSearches: Infinity,
    deepResearch: Infinity,
    voiceSessions: Infinity,
  },
} as const;

/** Guest (unsigned) caps — stricter than signed-in free tier */
export const GUEST_LIMITS = {
  chats: 10,
  images: 3,
  deepResearch: 2,
} as const;

/** @deprecated Use `buildCommunityHighlights` from `@/hooks/usePlatformMetrics` for live counts. */
export const COMMUNITY_HIGHLIGHTS = [] as const;

export const PRIVACY_COPY = {
  /** Cloud chat default */
  cloudDefault:
    "Cloud chat uses secure servers. Sensitive work can use the encrypted vault, or optional on-device Llama.",
  /** When offline / local mode is active */
  localMode:
    "In on-device mode, inference runs in your browser. Prompts for that session are not sent to our servers.",
  /** Vault / E2EE */
  vault:
    "The encrypted vault encrypts data client-side. Only you hold the keys.",
  /** Short tagline for cards */
  privacyNative:
    "Privacy-native: encrypted vault, and optional on-device AI — you choose cloud vs local.",
} as const;

export function formatFreeLimitLine(
  key: DailyLimitAction,
  plan: keyof typeof DAILY_LIMITS = "free"
): string {
  const limit = DAILY_LIMITS[plan][key];
  const labels: Record<DailyLimitAction, string> = {
    messages: "messages",
    fileUploads: "file uploads",
    codeGenerations: "code generations",
    imageGenerations: "image generations",
    documentGenerations: "document generations",
    webSearches: "web searches",
    deepResearch: "deep research queries",
    voiceSessions: "voice sessions",
  };
  if (limit === Infinity) return `Unlimited ${labels[key]}`;
  return `${limit} ${labels[key]}/day`;
}

export const FREE_TIER_MARKETING = {
  messages: formatFreeLimitLine("messages"),
  images: formatFreeLimitLine("imageGenerations"),
  deepResearch: formatFreeLimitLine("deepResearch"),
  voice: formatFreeLimitLine("voiceSessions"),
} as const;

export const isWithinLimit = (
  plan: keyof typeof DAILY_LIMITS,
  action: DailyLimitAction,
  currentCount: number
): boolean => {
  const limit = DAILY_LIMITS[plan][action];
  return limit === Infinity || currentCount < limit;
};
