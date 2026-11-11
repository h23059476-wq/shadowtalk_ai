/**
 * How-to guides for Phase 3 content marketing — long-tail SEO.
 * Static HTML synced to public/how-to-*.html
 */

export interface HowToGuide {
  slug: string;
  filename: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  steps: string[];
  ctaLabel: string;
  utmCampaign: string;
}

export const HOW_TO_GUIDES: HowToGuide[] = [
  {
    slug: "free-ai-chatbot-no-login",
    filename: "how-to-free-ai-chatbot-no-login.html",
    title: "How to Use a Free AI Chatbot Without Login — ShadowTalk AI",
    metaDescription:
      "Step-by-step guide: try a free AI chatbot with no login required. Use ShadowTalk AI for private, instant chat, research, and document work.",
    keywords: ["free AI chatbot", "no login free AI", "AI chatbot no signup", "private AI chat"],
    steps: [
      "Open https://www.shadowtalk-ai.com/chatbot",
      "Start typing — no signup wall for the free tier",
      "Pick a chat mode or run a built-in tool",
      "Export, save, or continue in the desktop app",
    ],
    ctaLabel: "Try ShadowTalk free — no card, no login",
    utmCampaign: "phase3",
  },
  {
    slug: "ai-strategy-planner-free",
    filename: "how-to-ai-strategy-planner-free.html",
    title: "How to Use a Free AI Strategy Planner — ShadowTalk AI",
    metaDescription:
      "Free AI strategy planner guide: CEO playbooks, marketing plans, and GTM frameworks with ShadowTalk Strategy Agent and Mission Control.",
    keywords: [
      "AI strategy planner free",
      "free business strategy AI",
      "CEO playbook generator",
      "marketing plan AI",
    ],
    steps: [
      "Go to shadowtalk-ai.com/strategy or /ai-strategy-consultant",
      "Describe your business goal or paste context",
      "Run Strategy Agent or Mission Control for multi-step output",
      "Export the plan or continue editing in chat",
    ],
    ctaLabel: "Try free AI strategy planner",
    utmCampaign: "strategy_howto",
  },
  {
    slug: "private-ai-chat",
    filename: "how-to-private-ai-chat.html",
    title: "How to Use Private AI Chat with Encryption — ShadowTalk",
    metaDescription:
      "Use private AI chat: anonymous session, optional E2EE, Stealth Vault, and BYOK. ShadowTalk privacy-first workspace guide.",
    keywords: ["private AI chat", "encrypted AI chat", "anonymous AI", "BYOK AI"],
    steps: [
      "Open /chatbot — anonymous session works without signup",
      "Enable encrypted chat for sensitive threads",
      "Use Stealth Vault in /security for stored secrets",
      "Optional: BYOK or on-device models in Settings",
    ],
    ctaLabel: "Start private AI chat",
    utmCampaign: "privacy_howto",
  },
  {
    slug: "shadowtalk-vs-chatgpt-strategy",
    filename: "how-to-shadowtalk-vs-chatgpt-strategy.html",
    title: "ShadowTalk vs ChatGPT for Business Strategy — How To Choose",
    metaDescription:
      "Comparison how-to: when to use ShadowTalk vs ChatGPT for business strategy, marketing plans, and founder workflows. Try ShadowTalk free.",
    keywords: [
      "ShadowTalk vs ChatGPT strategy",
      "best AI for business strategy",
      "ChatGPT alternative strategy",
    ],
    steps: [
      "ChatGPT: strong for single-turn brainstorming and polish",
      "ShadowTalk: missions, /strategy, exports, and tool chains in one workspace",
      "Try both on the same prompt — compare finish rate, not reply length",
      "Use ShadowTalk for strategy — it is free to use; your provider may charge for API usage",
    ],
    ctaLabel: "Try ShadowTalk for strategy — free",
    utmCampaign: "comparison_howto",
  },
];

export function getHowToBySlug(slug: string): HowToGuide | undefined {
  return HOW_TO_GUIDES.find((g) => g.slug === slug);
}
