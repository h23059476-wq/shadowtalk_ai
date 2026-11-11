/**
 * Wedge landing pages — own a niche instead of out-spending OpenAI.
 * Synced to public/*.html + SPA routes at /:slug
 */

export type WedgeSlug =
  | "ai-strategy-consultant"
  | "ai-business-planner"
  | "anonymous-ai"
  | "multilingual-ai";

export interface WedgePage {
  slug: WedgeSlug;
  title: string;
  metaDescription: string;
  h1: string;
  badge: string;
  snippet: string;
  sections: { heading: string; paragraphs: string[] }[];
  ctaLabel: string;
  ctaHref: string;
  keywords: string[];
  relatedLinks: { label: string; href: string }[];
}

const BASE_CHAT = "/chatbot";

export const WEDGE_PAGES: WedgePage[] = [
  {
    slug: "ai-strategy-consultant",
    title: "AI Strategy Consultant — CEO Playbooks & Marketing Plans | ShadowTalk",
    metaDescription:
      "Free AI strategy consultant: CEO playbooks, GTM plans, competitive analysis, and marketing strategy — agentic missions, not one-shot chat. ShadowTalk is free to use.",
    h1: "AI Strategy Consultant — finish the playbook, not just the brainstorm",
    badge: "Wedge: Strategy Agent",
    snippet:
      "ShadowTalk AI is an AI strategy consultant workspace: run CEO playbooks, marketing plans, and competitive analysis with Mission Control multi-step missions. Free to use at shadowtalk-ai.com/strategy — no subscription.",
    sections: [
      {
        heading: "What you get vs generic chat",
        paragraphs: [
          "ChatGPT answers strategy questions. ShadowTalk chains research, frameworks, and exportable outputs — SWOT, OKRs, channel plans, and investor one-pagers in one flow.",
          "Open /strategy or /execute?mode=strategy_report for structured business intelligence with human approval gates before sensitive actions.",
        ],
      },
      {
        heading: "Best for",
        paragraphs: [
          "Founders, solo consultants, and marketing leads who need repeatable strategy workflows — not another blank chat box.",
        ],
      },
    ],
    ctaLabel: "Try AI strategy consultant free",
    ctaHref: `${BASE_CHAT}?utm_source=wedge_strategy&utm_medium=landing&utm_campaign=phase2`,
    keywords: [
      "AI strategy consultant",
      "best AI for business strategy",
      "CEO playbook AI",
      "marketing strategy AI",
    ],
    relatedLinks: [
      { label: "Strategy Agent", href: "/strategy" },
      { label: "AI business planner", href: "/ai-business-planner" },
      { label: "vs ChatGPT for startups", href: "/vs/chatgpt-startups" },
      { label: "How-to: free strategy planner", href: "/how-to-ai-strategy-planner-free.html" },
    ],
  },
  {
    slug: "ai-business-planner",
    title: "AI Business Planner — Plans, Forecasts & GTM | ShadowTalk AI",
    metaDescription:
      "AI business planner for founders: financial models, GTM strategy, competitive maps, and pitch outlines. ShadowTalk Mission Control executes multi-step plans.",
    h1: "AI Business Planner — from idea to executable plan",
    badge: "Wedge: Business planning",
    snippet:
      "ShadowTalk AI business planner turns goals into missions: market sizing, revenue models, channel strategy, and launch checklists with citations and exports. Free to use, no credit card.",
    sections: [
      {
        heading: "Plan → execute in one workspace",
        paragraphs: [
          "Most AI tools stop at a bullet list. ShadowTalk runs deep research, fills templates, and exports documents you can share with investors or your team.",
          "Pair with /workspace for business memory and /research for cited market intelligence.",
        ],
      },
      {
        heading: "SEO intent we serve",
        paragraphs: [
          "Searches like \"AI marketing planner\", \"AI business plan generator free\", and \"best AI for founders\" — ShadowTalk ships the product behind those queries.",
        ],
      },
    ],
    ctaLabel: "Start business planning free",
    ctaHref: `${BASE_CHAT}?utm_source=wedge_planner&utm_medium=landing&utm_campaign=phase2`,
    keywords: [
      "AI business planner",
      "AI marketing planner",
      "business plan AI free",
      "GTM strategy AI",
    ],
    relatedLinks: [
      { label: "Strategy consultant", href: "/ai-strategy-consultant" },
      { label: "Execute hub", href: "/execute" },
      { label: "Pricing", href: "/pricing" },
      { label: "Case studies", href: "/case-studies" },
    ],
  },
  {
    slug: "anonymous-ai",
    title: "Anonymous AI Chat — No Account, No Training Pitch | ShadowTalk",
    metaDescription:
      "Anonymous AI chat with no signup required: start instantly, optional E2EE, stated privacy practices. ShadowTalk — free tier, no credit card, no forced account.",
    h1: "Anonymous AI — chat without an account wall",
    badge: "Wedge: Privacy-first access",
    snippet:
      "ShadowTalk lets you chat without creating an account first — anonymous session, optional end-to-end encryption, and clear data practices. Differentiator: usable free tier, not a login gate before your first message.",
    sections: [
      {
        heading: "How it works",
        paragraphs: [
          "Open shadowtalk-ai.com/chatbot and start typing. No signup wall on the free tier. Link an account later if you want sync across devices.",
          "Enable encrypted chat for sensitive topics. Read /privacy and /security for how we handle data — we publish limits and practices before you pay.",
        ],
      },
      {
        heading: "vs mainstream AI",
        paragraphs: [
          "Many products require accounts before meaningful use. ShadowTalk leads with instant access, then earns trust through product depth — missions, tools, vault, desktop app.",
        ],
      },
    ],
    ctaLabel: "Try anonymous AI now — no login",
    ctaHref: `${BASE_CHAT}?utm_source=wedge_anonymous&utm_medium=landing&utm_campaign=phase2`,
    keywords: [
      "anonymous AI",
      "AI chat no login",
      "free AI no account",
      "private AI chat no signup",
    ],
    relatedLinks: [
      { label: "How-to: no-login chatbot", href: "/how-to-free-ai-chatbot-no-login.html" },
      { label: "vs ChatGPT privacy", href: "/vs/chatgpt-privacy" },
      { label: "Security hub", href: "/security" },
      { label: "Private AI how-to", href: "/how-to-private-ai-chat.html" },
    ],
  },
  {
    slug: "multilingual-ai",
    title: "Multilingual AI Chat — 11 Languages | ShadowTalk AI",
    metaDescription:
      "Multilingual AI workspace: UI and chat in 11 languages (en, es, fr, de, zh, ja, ar, hi, pt, ru, ur). ShadowTalk — better international access than single-language defaults.",
    h1: "Multilingual AI — 11 languages in one workspace",
    badge: "Wedge: Global access",
    snippet:
      "ShadowTalk supports 11 interface languages and multilingual chat — English, Spanish, French, German, Chinese, Japanese, Arabic, Hindi, Portuguese, Russian, and Urdu. Free start at shadowtalk-ai.com/chatbot.",
    sections: [
      {
        heading: "Languages we ship today",
        paragraphs: [
          "Built-in i18n covers en, es, fr, de, zh, ja, ar, hi, pt, ru, and ur — switch from Navigation without leaving your session.",
          "We do not claim 20+ languages until they ship. Honest positioning: strong coverage for global builders, with more locales on the roadmap.",
        ],
      },
      {
        heading: "Why it matters",
        paragraphs: [
          "Teams and students outside English-first markets need AI that respects language context — not a buried settings toggle behind a paywall.",
        ],
      },
    ],
    ctaLabel: "Try multilingual AI free",
    ctaHref: `${BASE_CHAT}?utm_source=wedge_i18n&utm_medium=landing&utm_campaign=phase2`,
    keywords: [
      "multilingual AI chat",
      "AI in Urdu",
      "AI Arabic chat",
      "best multilingual AI",
    ],
    relatedLinks: [
      { label: "Anonymous AI", href: "/anonymous-ai" },
      { label: "Free AI chatbot", href: "/vs/free-ai-chatbot" },
      { label: "Karachi founder story", href: "/zain-ahmed-fahad-patel" },
      { label: "Docs", href: "/docs" },
    ],
  },
];

export function getWedgeBySlug(slug: string): WedgePage | undefined {
  return WEDGE_PAGES.find((p) => p.slug === slug);
}
