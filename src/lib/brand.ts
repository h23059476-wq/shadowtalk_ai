/**
 * ShadowTalk brand system — one voice everywhere (marketing, chat, SEO, product).
 * Keep claims honest; lead with what we actually ship.
 */

export const BRAND = {
  name: "ShadowTalk",
  fullName: "ShadowTalk AI",
  domain: "shadowtalk-ai.com",
  founder: "Zain",
  /** Memorable mnemonic — same words as tagline; use everywhere */
  mnemonic: "Think AI. Think ShadowTalk.",
  /** Primary brand line — landing hero, manifesto, chat empty state, SEO */
  tagline: "Think AI. Think ShadowTalk.",
  shortPitch:
    "Stop juggling AI tabs. ShadowTalk finishes the job—agentic chat, missions, 30+ tools, voice & code, desktop app.",
  manifesto:
    "AI should execute — not just chat. ShadowTalk turns goals into missions, chains tools, and keeps you in control at every step.",
  /** Landing hero — tagline as headline for maximum recall */
  heroHeadline: ["Think AI.", "Think ShadowTalk."],
  heroSubtitle:
    "Stop juggling AI tabs. One workspace for agentic chat, missions, 30+ tools, voice & code, and a desktop app—free start, no card.",
  heroBadge: "Free start · No card · Your old stack will feel slow",
} as const;

/** Section headlines & subcopy for the home page */
export const LANDING_COPY = {
  manifesto: {
    kicker: "One line. One workspace.",
    title: ["You will forget", "most AI names."],
    body: "Not this one. Think AI. Think ShadowTalk. — finish research, code, vault, voice, and autonomous missions in one flow. No five-tab copy-paste grind.",
    traction: "Join builders who made the name stick and the work leave the chat window.",
  },
  comparison: {
    badge: "Feature-for-feature, honest",
    title: ["They reply.", "We run the playbook."],
    subtitle:
      "Side-by-side on agents, tools, privacy, and price — sourced from our docs, not hype. Confirm competitor pricing on their sites before you switch.",
  },
  features: {
    badge: "What you actually get",
    title: ["One workspace.", "Thirty-plus tools."],
    subtitle:
      "Mission Control, marketplace agents, IDE, research, presentations, Stealth Vault, BYOK, and optional on-device models — listed in /docs, shipped in product.",
  },
  pricing: {
    badge: "Free access",
    title: ["Free to use.", "You bring the key."],
    subtitle:
      "ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models — your provider may charge separately for API usage.",
  },
  testimonials: {
    badge: "How early users work",
    title: ["No fake quotes.", "Real workflows."],
    subtitle:
      "Founder-led product: try the free tier, read the changelog, send feedback — we publish what ships instead of invented testimonials.",
  },
  community: {
    badge: "Live product, live metrics",
    title: ["Build in public", "with us."],
    subtitle:
      "Community numbers come from real workspace activity when available — plus public status, roadmap in changelog, and direct founder feedback.",
  },
  faq: {
    badge: "Straight answers",
    title: ["Know the product", "before you pay."],
    subtitle:
      "Limits, billing, privacy, and integrations — answered here and in /docs so you can choose ShadowTalk with confidence.",
  },
  founder: {
    line: "Built by Zain Ahmed Fahad Patel — founder obsessed with agentic AI that actually ships.",
  },
} as const;

/** Real traction — sync with productClaims COMMUNITY_METRICS */
export const BRAND_TRACTION = {
  usersLabel: "1.5K+ creators",
  dailyLabel: "104+ daily active",
} as const;

export const BRAND_PILLARS = [
  {
    title: "Agents that finish",
    description: "Multi-step missions with Mission Control — not one-shot replies.",
    emoji: "🎯",
  },
  {
    title: "30+ tools, one sentence",
    description: "Research, code, vault, voice, docs — triggered from natural language.",
    emoji: "⚡",
  },
  {
    title: "You approve the edge",
    description: "Human-in-the-loop when stakes are high. Auto-run when you trust the flow.",
    emoji: "🛡️",
  },
  {
    title: "Privacy on your terms",
    description: "Cloud power by default. Vault, BYOK, and on-device Gemma when it matters.",
    emoji: "🔒",
  },
  {
    title: "Every surface",
    description: "Web, PWA, and desktop software — same brain, deeper device access on install.",
    emoji: "🖥️",
  },
] as const;

/** Rotating hero / chat hooks — memorable, specific */
export const BRAND_HOOKS = [
  "Think AI. Think ShadowTalk.",
  "Stop juggling tabs — finish the job here.",
  "Chat suggests. ShadowTalk ships.",
  "One workspace. Thirty tools. Zero tab marathon.",
  "Mission Control finishes the work you started in chat.",
  "Try it free — remember the name when generic AI fades.",
  "Premium power without the $200 ChatGPT Pro tax.",
  "Proof in /changelog — not marketing wallpaper.",
] as const;

export const CHAT_WELCOME_LINES = [
  "Think AI. Think ShadowTalk. What are we building today?",
  "Your agentic workspace is live. Give me a goal — I'll plan the steps.",
  "Mission-ready. Drop a task, research question, or 'run this for me'.",
  "Encrypted vault unlocked. Let's turn intent into output.",
] as const;

export const CHAT_EMPTY_HEADLINE = "What should ShadowTalk execute for you?";

export function pickBrandHook(seed?: number): string {
  const i = seed ?? Math.floor(Math.random() * BRAND_HOOKS.length);
  return BRAND_HOOKS[i % BRAND_HOOKS.length];
}

export function pickChatWelcome(seed?: number): string {
  const i = seed ?? Math.floor(Math.random() * CHAT_WELCOME_LINES.length);
  return CHAT_WELCOME_LINES[i % CHAT_WELCOME_LINES.length];
}
