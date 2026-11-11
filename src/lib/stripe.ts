// Stripe Configuration for ShadowTalk AI
// DORMANT since the free-access transition: ShadowTalk AI no longer sells
// subscriptions, so nothing in the app initiates Stripe checkout. Config is
// preserved so optional monetization can be re-enabled later.
import { FREE_TIER_MARKETING } from "@/lib/productClaims";


export const STRIPE_CONFIG = {
  prices: {
    pro: "price_1ScezZInnwEWcho15wMKeOMU", // dormant plan price ID — no active monetization (free access)
  },
  products: {
    pro: "prod_TZocSSpPddFCH1",
    premium: "prod_TbiuwlUUg3F17C",
    elite: "prod_TbhEVUPSLMSF53",
  },
} as const;

export type PlanName = keyof typeof STRIPE_CONFIG.prices;

export const getPlanPriceId = (plan: PlanName): string => {
  return STRIPE_CONFIG.prices[plan];
};

export const getPlanProductId = (plan: PlanName): string => {
  return STRIPE_CONFIG.products[plan];
};

// Get plan name from product ID
export const getPlanFromProductId = (productId: string): PlanName | 'free' => {
  const entry = Object.entries(STRIPE_CONFIG.products).find(
    ([, id]) => id === productId
  );
  return entry ? (entry[0] as PlanName) : 'free';
};

// Plan display information
// Strategy: FREE plan includes ALL features with daily limits
// Paid plans = remove limits + better models + priority
// BYOK = $0 platform fee, user pays their own AI provider directly
// Enterprise = custom contract for teams and organizations
// ChatGPT: Free=crippled, Go=$10, Plus=$20, Pro=$200
// ShadowTalk: Free=EVERYTHING with limits, BYOK=$0 platform fee, Pro=$5, Premium=$15, Elite=$20, Enterprise=Custom
export const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "ALL features unlocked (no paywalls!)",
      FREE_TIER_MARKETING.messages,
      FREE_TIER_MARKETING.images,
      FREE_TIER_MARKETING.voice,
      FREE_TIER_MARKETING.deepResearch,
      "Agentic IDE (Shadow Cowork)",
      "Shadow Browser & Web Scraping",
      "Visual Reasoning & Image Decoder",
      "Canvas & document editing",
      "AI Memory across sessions",
      "Code generation & execution",
      "Basic cloud models (Gemini Flash)",
    ],
    comparison: "ChatGPT Free blocks features. We unlock ALL!",
  },
  byok: {
    name: "BYOK",
    price: 0,
    features: [
      "Bring your own OpenRouter/OpenAI/Gemini key",
      "Unlimited messages",
      "Unlimited image generation",
      "Unlimited deep research",
      "Direct provider connection (no middleman)",
      "Custom model selection",
      "Keys stored locally in browser only",
      "No platform fees — pay your provider directly",
    ],
    comparison: "Zero platform fees — you pay your AI provider directly",
  },
  pro: {
    name: "Pro",
    price: 5,
    features: [
      "Everything in Free, PLUS:",
      "Unlimited messages",
      "20 cloud image generations/day",
      "Unlimited voice sessions",
      "20 Deep Research queries/day",
      "Pro models (GPT-5, Gemini Pro)",
      "Priority queue (2x faster)",
      "Chat export & full history",
      "Security & Code Quality Auditor",
      "No advertisements",
      "Priority support (< 4h)",
    ],
    comparison: "Half the price of ChatGPT Plus ($20)!",
  },
  premium: {
    name: "Premium",
    price: 15,
    features: [
      "Everything in Pro, PLUS:",
      "50 cloud image generations/day",
      "50 Deep Research queries/day",
      "Extended context (500 msg history)",
      "Proactive Context Engine (PCE)",
      "Real-time collaboration rooms",
      "Shadow Twin (Digital Clone & Public Link)",
      "Multi-Agent Orchestration SDK",
      "Priority support (< 2h)",
    ],
    comparison: "Premium features at ChatGPT Plus price!",
  },
  elite: {
    name: "Elite",
    price: 20,
    features: [
      "Everything in Premium, PLUS:",
      "Unlimited cloud image generations",
      "Unlimited Deep Research",
      "Zero-download Offline Models (Llama-3 pre-installed)",
      "Unlimited Agentic Workflows",
      "Custom model fine-tuning",
      "White-label solutions",
      "24/7 phone support",
      "Fastest models + highest priority",
    ],
    comparison: "90% cheaper than ChatGPT Pro ($200)!",
  },
  enterprise: {
    name: "Enterprise",
    price: 0,
    features: [
      "Everything in Elite, PLUS:",
      "SSO & SAML authentication",
      "Dedicated infrastructure",
      "SLA guarantee (99.9%)",
      "Custom model fine-tuning",
      "Team workspaces & collaboration",
      "Priority technical support",
      "API access & webhooks",
      "Compliance (GDPR, SOC 2)",
      "Custom integrations",
    ],
    comparison: "Custom pricing — contact sales",
  },
} as const;
