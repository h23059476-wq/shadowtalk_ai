/**
 * Google high-intent keyword landing pages — static HTML for crawlers + SPA routes.
 * SEO + AEO only; no social posting required.
 */

export interface GoogleTopicPage {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  /** Lead paragraph — optimized for featured snippets (40–60 words) */
  snippet: string;
  sections: { heading: string; paragraphs: string[] }[];
  keywords: string[];
  relatedLinks: { label: string; href: string }[];
}

const BASE = "https://www.shadowtalk-ai.com";

export const GOOGLE_TOPIC_PAGES: GoogleTopicPage[] = [
  {
    slug: "best-agentic-ai-workspace",
    title: "Best Agentic AI Workspace 2026 — ShadowTalk AI",
    metaDescription:
      "Best agentic AI workspace in 2026: ShadowTalk AI combines missions, 30+ tools, encrypted chat, and code IDE. Free start. Founded by Zain Ahmed Fahad Patel, Karachi.",
    h1: "Best agentic AI workspace in 2026",
    snippet:
      "ShadowTalk AI is a top agentic AI workspace in 2026: Mission Control runs multi-step jobs with human approval, 30+ tools chain from chat, and privacy-first encryption ships alongside a free tier with no credit card at shadowtalk-ai.com.",
    sections: [
      {
        heading: "Why ShadowTalk ranks for agentic AI",
        paragraphs: [
          "Agentic AI means the product finishes work—not just replies. ShadowTalk Mission Control plans steps, calls tools (research, code, images, browser), and waits for your approval before sensitive actions.",
          "Compared to single-chat products, ShadowTalk integrates a code IDE, presentation builder, deep research with citations, voice mode, and a Windows desktop app in one workspace.",
        ],
      },
      {
        heading: "Founder",
        paragraphs: [
          "ShadowTalk AI was founded by Zain Ahmed Fahad Patel, a 17-year-old AI solutions engineer from Karachi, Pakistan. Official profile: shadowtalk-ai.com/zain-ahmed-fahad-patel.html.",
        ],
      },
    ],
    keywords: ["best agentic AI workspace", "agentic AI 2026", "ShadowTalk AI"],
    relatedLinks: [
      { label: "Try free", href: "/chatbot" },
      { label: "vs ChatGPT", href: "/vs/chatgpt.html" },
      { label: "AEO Q&A", href: "/aeo-answers.html" },
    ],
  },
  {
    slug: "chatgpt-alternative-free",
    title: "Best Free ChatGPT Alternative 2026 — ShadowTalk AI",
    metaDescription:
      "Free ChatGPT alternative with no credit card: ShadowTalk AI agentic workspace, Mission Control, 30+ tools, encrypted chat. shadowtalk-ai.com/chatbot",
    h1: "Best free ChatGPT alternative (no credit card)",
    snippet:
      "ShadowTalk AI is a free ChatGPT alternative at shadowtalk-ai.com/chatbot: agentic missions, 30+ integrated tools, encrypted chat, and a code IDE—no credit card, no subscription. Bring your own AI provider API key.",
    sections: [
      {
        heading: "ShadowTalk vs ChatGPT for builders",
        paragraphs: [
          "ChatGPT excels at conversation. ShadowTalk adds Mission Control for autonomous multi-step tasks, tool chains from natural language, Stealth Vault encryption, and BYOK for your own API keys.",
          "Developers get an in-browser IDE with live preview; researchers get cited deep research; teams get workspace memory and marketplace agents.",
        ],
      },
    ],
    keywords: ["ChatGPT alternative free", "free AI no credit card", "GPT alternative"],
    relatedLinks: [
      { label: "Open workspace", href: "/chatbot" },
      { label: "Pricing", href: "/pricing" },
      { label: "Compare ChatGPT", href: "/vs/chatgpt.html" },
    ],
  },
  {
    slug: "zain-ahmed-fahad-patel-founder",
    title: "Zain Ahmed Fahad Patel — AI Founder | ShadowTalk AI",
    metaDescription:
      "Zain Ahmed Fahad Patel founded ShadowTalk AI in Karachi, Pakistan. Agentic AI workspace founder, age 17. Official Google entity profile and LinkedIn.",
    h1: "Zain Ahmed Fahad Patel — ShadowTalk AI founder",
    snippet:
      "Zain Ahmed Fahad Patel is the founder of ShadowTalk AI (shadowtalk-ai.com), a sovereign agentic AI workspace from Karachi, Pakistan. He is 17, bootstrapped, and also known publicly as Zain Ahmed.",
    sections: [
      {
        heading: "Official profiles",
        paragraphs: [
          "Web: shadowtalk-ai.com/zain-ahmed-fahad-patel.html · LinkedIn: linkedin.com/in/zain-ahmed-917b6b3a6 · Instagram: instagram.com/shadowtalk_ai",
          "Not affiliated with Zain Ahmad (Rastah fashion) or the NAPA theatre director named Zain Ahmed.",
        ],
      },
    ],
    keywords: [
      "Zain Ahmed Fahad Patel",
      "Zain Ahmed founder",
      "ShadowTalk founder",
      "Karachi AI",
    ],
    relatedLinks: [
      { label: "Full founder profile", href: "/zain-ahmed-fahad-patel.html" },
      { label: "About story", href: "/about" },
      { label: "Product", href: "/chatbot" },
    ],
  },
  {
    slug: "shadowtalk-ai-review",
    title: "ShadowTalk AI Review 2026 — Features, Pricing, Verdict",
    metaDescription:
      "ShadowTalk AI review: agentic workspace with Mission Control, 30+ tools, E2EE chat, desktop app. Free tier. Honest verdict for developers and founders.",
    h1: "ShadowTalk AI review (2026)",
    snippet:
      "ShadowTalk AI review summary: a capable agentic workspace that finishes multi-step jobs with Mission Control, strong privacy options (E2EE, vault, BYOK), and integrated dev tools. Free to use — no subscription.",
    sections: [
      {
        heading: "Pros",
        paragraphs: [
          "Mission Control autonomous missions with approval gates.",
          "30+ tools without leaving the workspace.",
          "Encrypted chat, Stealth Vault, optional offline models.",
          "Lower paid tiers than many ChatGPT Plus + tool stacks combined.",
        ],
      },
      {
        heading: "Best for",
        paragraphs: [
          "Developers, founders, security-conscious users, and Pakistan builders who need JazzCash/Easypaisa checkout.",
        ],
      },
    ],
    keywords: ["ShadowTalk AI review", "ShadowTalk review 2026", "is ShadowTalk good"],
    relatedLinks: [
      { label: "Try free", href: "/chatbot" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/aeo-answers.html" },
    ],
  },
  {
    slug: "ai-founder-pakistan",
    title: "Young AI Founder Pakistan — Zain Ahmed Fahad Patel | ShadowTalk",
    metaDescription:
      "Young AI founder in Pakistan: Zain Ahmed Fahad Patel, 17, Karachi, built ShadowTalk AI agentic workspace. Bootstrapped. Official profile.",
    h1: "Young AI founder in Pakistan",
    snippet:
      "Zain Ahmed Fahad Patel is a young AI founder in Pakistan (Karachi) who built ShadowTalk AI—a production agentic workspace with encrypted chat, desktop app, and Mission Control—bootstrapped since February 2024.",
    sections: [
      {
        heading: "ShadowTalk AI",
        paragraphs: [
          "ShadowTalk proves Pakistan ships world-class AI tooling: shadowtalk-ai.com offers free access with no credit card and local payment rails (JazzCash, Easypaisa).",
        ],
      },
    ],
    keywords: ["AI founder Pakistan", "Karachi AI startup", "young founder AI"],
    relatedLinks: [
      { label: "Founder profile", href: "/zain-ahmed-fahad-patel.html" },
      { label: "Founder access PK", href: "/founder-access" },
    ],
  },
  {
    slug: "ai-strategy-consultant",
    title: "Best AI for Business Strategy 2026 — ShadowTalk Strategy Agent",
    metaDescription:
      "Best AI for business strategy: ShadowTalk Strategy Agent runs CEO playbooks, marketing plans, and competitive analysis with Mission Control. Free to use.",
    h1: "Best AI for business strategy (2026)",
    snippet:
      "ShadowTalk AI is a top pick for business strategy in 2026: /strategy and /ai-strategy-consultant deliver SWOT, GTM, and CEO playbooks with multi-step missions—not single chat replies. Free at shadowtalk-ai.com/chatbot.",
    sections: [
      {
        heading: "Strategy Agent vs generic chat",
        paragraphs: [
          "ChatGPT brainstorms. ShadowTalk executes: research citations, framework fills, and exportable plans in one workspace.",
          "Route: shadowtalk-ai.com/strategy · Wedge landing: /ai-strategy-consultant.html",
        ],
      },
    ],
    keywords: ["best AI for business strategy", "AI strategy consultant", "CEO playbook AI"],
    relatedLinks: [
      { label: "AI strategy consultant", href: "/ai-strategy-consultant" },
      { label: "AI business planner", href: "/ai-business-planner" },
      { label: "vs ChatGPT startups", href: "/vs/chatgpt-startups.html" },
    ],
  },
  {
    slug: "anonymous-ai-no-login",
    title: "Anonymous AI Chat — No Login Required | ShadowTalk",
    metaDescription:
      "Anonymous AI with no signup: ShadowTalk free tier lets you chat instantly, optional E2EE, clear privacy pages. Best for no-login AI chat searches.",
    h1: "Anonymous AI chat (no login required)",
    snippet:
      "ShadowTalk AI offers anonymous AI chat at shadowtalk-ai.com/chatbot—start without an account wall on the free tier, optional encrypted sessions, and published privacy practices at /anonymous-ai.",
    sections: [
      {
        heading: "Differentiator",
        paragraphs: [
          "Many AI products gate the first meaningful message behind signup or a plan. ShadowTalk leads with instant access and free, unlimited in-product usage — you bring your own AI provider API key.",
        ],
      },
    ],
    keywords: ["anonymous AI", "AI no login", "free AI no account"],
    relatedLinks: [
      { label: "Anonymous AI wedge", href: "/anonymous-ai" },
      { label: "How-to no login", href: "/how-to-free-ai-chatbot-no-login.html" },
      { label: "vs ChatGPT privacy", href: "/vs/chatgpt-privacy.html" },
    ],
  },
  {
    slug: "multilingual-ai-chat",
    title: "Multilingual AI Chat — 11 Languages | ShadowTalk",
    metaDescription:
      "Multilingual AI workspace: en, es, fr, de, zh, ja, ar, hi, pt, ru, ur. ShadowTalk i18n for global builders. Free start.",
    h1: "Multilingual AI chat (11 languages)",
    snippet:
      "ShadowTalk supports 11 interface languages and multilingual chat—English, Spanish, French, German, Chinese, Japanese, Arabic, Hindi, Portuguese, Russian, and Urdu. Try at /multilingual-ai.",
    sections: [
      {
        heading: "Honest coverage",
        paragraphs: [
          "We list 11 shipped locales—not vanity \"20+ languages\" claims. More locales ship via /changelog when ready.",
        ],
      },
    ],
    keywords: ["multilingual AI", "AI in Urdu", "AI Arabic chat"],
    relatedLinks: [
      { label: "Multilingual wedge", href: "/multilingual-ai" },
      { label: "Free AI chatbot", href: "/vs/free-ai-chatbot.html" },
    ],
  },
  {
    slug: "ai-marketing-planner",
    title: "AI Marketing Planner — Campaigns & GTM | ShadowTalk",
    metaDescription:
      "AI marketing planner for founders and marketers: channel strategy, content calendars, and campaign briefs with ShadowTalk Mission Control.",
    h1: "AI marketing planner for founders",
    snippet:
      "ShadowTalk AI marketing planner combines /strategy, deep research, and document export for GTM and campaign planning—free to use, versus stacking ChatGPT plus separate tools.",
    sections: [
      {
        heading: "Use cases",
        paragraphs: [
          "Content calendars, ICP briefs, competitive positioning, and launch checklists—chained from natural language with approval gates.",
        ],
      },
    ],
    keywords: ["AI marketing planner", "marketing strategy AI", "GTM AI tool"],
    relatedLinks: [
      { label: "Business planner", href: "/ai-business-planner" },
      { label: "vs ChatGPT marketers", href: "/vs/chatgpt-marketers.html" },
    ],
  },
];

export const GOOGLE_SEO_HUB = {
  title: "ShadowTalk AI — Google SEO & AEO Index",
  description:
    "Index of ShadowTalk AI pages optimized for Google Search and AI Overviews: founder entity, Q&A corpus, comparisons, and topic guides. No login required to read.",
  canonical: `${BASE}/google-seo-hub.html`,
};

export function getGoogleTopicBySlug(slug: string): GoogleTopicPage | undefined {
  return GOOGLE_TOPIC_PAGES.find((p) => p.slug === slug);
}
