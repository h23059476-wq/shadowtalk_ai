// Stripe Configuration for ShadowTalk AI
// DORMANT since the free-access transition: ShadowTalk AI no longer sells
// subscriptions, so nothing in the app initiates Stripe checkout. Config is
// preserved so optional monetization can be re-enabled later.
import { FREE_TIER_MARKETING } from "@/lib/productClaims";


export const STRIPE_CONFIG = {
  prices: {
    pro: "price_1ScezZInnwEWcho15wMKeOMU", // $5/month
    premium: "price_1SeVSbInnwEWcho1EILyNsK4", // $15/month
    elite: "price_1SeTpoInnwEWcho1ETYh5Udy", // $20/month
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
// ChatGPT: Free=crippled, Go=$10, Plus=$20, Pro=$200
// ShadowTalk: Free=EVERYTHING with limits, Pro=$5, Premium=$15, Elite=$20
export const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "✅ ALL features unlocked (no paywalls!)",
      FREE_TIER_MARKETING.messages,
      `🖼️ ${FREE_TIER_MARKETING.images}`,
      `🎙️ ${FREE_TIER_MARKETING.voice}`,
      `🔬 ${FREE_TIER_MARKETING.deepResearch}`,
      "📄 Canvas & document editing",
      "🔍 Web search & browsing",
      "📁 File uploads & analysis",
      "🧠 AI Memory across sessions",
      "💻 Code generation & execution",
      "🌐 10+ language translation",
      "3 S.E.E. missions/month",
      "Basic models (Gemini Flash)",
    ],
    comparison: "ChatGPT Free blocks features. We unlock ALL!",
  },
  pro: {
    name: "Pro",
    price: 5,
    features: [
      "Everything in Free, PLUS:",
      "♾️ Unlimited messages",
      "🖼️ 20 image generations/day",
      "🎙️ Unlimited voice sessions",
      "🔬 20 Deep Research queries/day",
      "⚡ Pro models (GPT-5, Gemini Pro)",
      "🚀 Priority queue (2x faster)",
      "📤 Chat export & full history",
      "100+ language translation",
      "No advertisements",
      "15 S.E.E. missions/month",
      "Priority support (< 4h)",
    ],
    comparison: "Half the price of ChatGPT Plus ($20)!",
  },
  premium: {
    name: "Premium",
    price: 15,
    features: [
      "Everything in Pro, PLUS:",
      "🖼️ 50 image generations/day",
      "🔬 50 Deep Research queries/day",
      "🧠 Extended context (500 msg history)",
      "📄 Proactive Context Engine (PCE)",
      "⚙️ Multi-Step Workflow Executor",
      "📝 Document generation (contracts, NDAs)",
      "👥 Real-time collaboration rooms",
      "30 S.E.E. missions/month",
      "Priority support (< 2h)",
    ],
    comparison: "Premium features at ChatGPT Plus price!",
  },
  elite: {
    name: "Elite",
    price: 20,
    features: [
      "Everything in Premium, PLUS:",
      "♾️ Unlimited image generations",
      "♾️ Unlimited Deep Research",
      "✈️ Full offline mode (works anywhere!)",
      "🔒 Stealth Vault (E2E encrypted)",
      "🤖 AI agents & workflow automation",
      "🎨 Custom model fine-tuning",
      "🏷️ White-label solutions",
      "50 S.E.E. missions/month",
      "24/7 phone support",
      "⚡ Fastest models + highest priority",
    ],
    comparison: "75% cheaper than ChatGPT Pro ($200)!",
  },
} as const;
