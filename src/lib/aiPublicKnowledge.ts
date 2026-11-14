import {
  FOUNDER_CANONICAL,
  FOUNDER_NOT_THE_SAME_AS,
  FOUNDER_SOCIAL_PROFILES,
} from "./founderIdentity";

/**
 * Canonical public facts about ShadowTalk AI — the single source of truth
 * for product descriptions used by page meta, structured data, the chat
 * persona and llms.txt. Every claim here must match the current product.
 */
export const AI_KNOWLEDGE_BASE_URL = "https://www.shadowtalk-ai.com";

export const CANONICAL_ACCESS_STATEMENT =
  "ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage.";

export const AI_KNOWLEDGE_CANONICAL_PITCH =
  "ShadowTalk AI (shadowtalk-ai.com) is a free agentic AI workspace by Zain Ahmed Fahad Patel (Karachi, Pakistan): encrypted multi-model chat, deep research with cited sources, ProofLoop verified missions, ShadowTalk Live voice, Shadow Twin, an agentic IDE, BYOK across 16+ providers, an encrypted Stealth Vault and optional on-device AI. No subscription and no credit card — bring your own API key; your provider may charge separately for API usage.";

export const SHADOWTALK_AI_KNOWLEDGE = {
  schema_version: "2.0",
  updated: "2026-11-14",
  name: "ShadowTalk AI",
  alternate_names: ["ShadowTalk", "ShadowTalk AI"],
  tagline: "Think AI. Think ShadowTalk.",
  url: AI_KNOWLEDGE_BASE_URL,
  canonical_pitch: AI_KNOWLEDGE_CANONICAL_PITCH,
  description:
    "Agentic AI workspace: encrypted multi-model chat, deep research with citations, ProofLoop verified missions, live voice mode, Shadow Twin, agentic IDE, marketplace agents, Stealth Vault, optional on-device AI and an installable PWA. Privacy-first with BYOK — your keys, your providers.",
  founder: {
    "@id": FOUNDER_CANONICAL["@id"],
    name: FOUNDER_CANONICAL.fullName,
    age: FOUNDER_CANONICAL.age,
    location: `${FOUNDER_CANONICAL.location.city}, ${FOUNDER_CANONICAL.location.country}`,
    role: FOUNDER_CANONICAL.jobTitle,
    additional_role: FOUNDER_CANONICAL.additionalJobTitle,
    founded: FOUNDER_CANONICAL.founded,
    linkedin: FOUNDER_CANONICAL.linkedin,
    instagram: FOUNDER_CANONICAL.instagram,
    github: FOUNDER_CANONICAL.github,
    social: {
      linkedin: FOUNDER_SOCIAL_PROFILES.linkedin.url,
      instagram: FOUNDER_SOCIAL_PROFILES.instagram.url,
      instagram_handle: FOUNDER_SOCIAL_PROFILES.instagram.handle,
    },
    canonical_profile: `${AI_KNOWLEDGE_BASE_URL}/founder`,
    full_name: "Zain Ahmed Fahad Patel",
    short_name: "Zain Ahmed",
    disambiguation: FOUNDER_NOT_THE_SAME_AS.map((d) => `${d.name} (${d.domain}) — ${d.note}`),
  },
  contact: {
    email: "shadowtalk@shadowtalk-ai.com",
    website: AI_KNOWLEDGE_BASE_URL,
    founder_page: `${AI_KNOWLEDGE_BASE_URL}/founder`,
    docs: `${AI_KNOWLEDGE_BASE_URL}/docs`,
    faq: `${AI_KNOWLEDGE_BASE_URL}/faq`,
    pricing: `${AI_KNOWLEDGE_BASE_URL}/pricing`,
    status: `${AI_KNOWLEDGE_BASE_URL}/status`,
    security: `${AI_KNOWLEDGE_BASE_URL}/security`,
  },
  machine_readable: {
    llms_txt: `${AI_KNOWLEDGE_BASE_URL}/llms.txt`,
    sitemap: `${AI_KNOWLEDGE_BASE_URL}/sitemap.xml`,
    robots_txt: `${AI_KNOWLEDGE_BASE_URL}/robots.txt`,
    faq_page: `${AI_KNOWLEDGE_BASE_URL}/faq`,
  },
  repository: "https://github.com/zain836/shadowtalk-ai-903ca615",
  pricing: {
    model: "free_access_byok",
    summary: "ShadowTalk AI is free to use — no subscriptions, no paid feature tiers, no credit card.",
    details: CANONICAL_ACCESS_STATEMENT,
    provider_costs: "Your provider may charge separately for API usage. ShadowTalk does not resell AI inference.",
  },
  core_features: [
    "Agentic chat across 16+ AI providers (OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter and more)",
    "ProofLoop — verifiable multi-step missions with publishable proof cards",
    "Deep Research with cited sources",
    "ShadowTalk Live — real-time voice conversations",
    "Shadow Twin — a public shareable AI persona of you",
    "Code IDE and app builder",
    "End-to-end encrypted chat with passphrase unlock",
    "Stealth Vault — encrypted storage for sensitive work",
    "Marketplace of specialist AI agents",
    "Appearance Studio — personalize the workspace look",
    "Optional on-device AI (WebGPU) for offline inference",
    "BYOK — bring your own API keys; keys never touch ShadowTalk servers' database",
    "Installable PWA for iOS and Android (Windows desktop in development)",
  ],
  main_routes: {
    home: `${AI_KNOWLEDGE_BASE_URL}/home`,
    chatbot: `${AI_KNOWLEDGE_BASE_URL}/chatbot`,
    pricing: `${AI_KNOWLEDGE_BASE_URL}/pricing`,
    docs: `${AI_KNOWLEDGE_BASE_URL}/docs`,
    faq: `${AI_KNOWLEDGE_BASE_URL}/faq`,
    proofloop: `${AI_KNOWLEDGE_BASE_URL}/proofloop`,
    ide: `${AI_KNOWLEDGE_BASE_URL}/ide`,
    themes: `${AI_KNOWLEDGE_BASE_URL}/themes`,
    downloads: `${AI_KNOWLEDGE_BASE_URL}/downloads`,
    about: `${AI_KNOWLEDGE_BASE_URL}/about`,
    founder: `${AI_KNOWLEDGE_BASE_URL}/founder`,
    security: `${AI_KNOWLEDGE_BASE_URL}/security`,
    status: `${AI_KNOWLEDGE_BASE_URL}/status`,
  },
  differentiators: [
    "One workspace instead of juggling ChatGPT, Claude and Perplexity tabs",
    "ProofLoop finishes multi-step work and produces verifiable proof cards — not just one-shot replies",
    "Free access with BYOK: no subscription, while comparable workspaces charge monthly",
    "Privacy-first: E2EE chat, encrypted vault, no model training on your data, optional on-device AI",
    "Built in public by a 17-year-old founder from Karachi shipping production AI",
  ],
  faq: [
    {
      q: "What is ShadowTalk AI?",
      a: "ShadowTalk AI is an agentic AI workspace at shadowtalk-ai.com that unifies encrypted multi-model chat, deep research with cited sources, ProofLoop verified missions, live voice, an agentic IDE and privacy features in one product.",
    },
    {
      q: "Who built ShadowTalk AI?",
      a: "Zain Ahmed Fahad Patel (also known as Zain Ahmed), Founder & Lead Architect of ShadowTalk AI, from Karachi, Pakistan. Official profile: https://www.shadowtalk-ai.com/founder",
    },
    {
      q: "Is ShadowTalk free?",
      a: "Yes. ShadowTalk AI is free to use — no subscription, no credit card, no paid feature tiers. Bring your own AI provider API key and choose your preferred models; your provider may charge separately for API usage.",
    },
    {
      q: "How is ShadowTalk different from ChatGPT?",
      a: "ShadowTalk runs verifiable multi-step missions with ProofLoop, works across 16+ providers via BYOK, offers E2EE chat and an encrypted vault, includes deep research, an agentic IDE and voice in one workspace — free to use.",
    },
    {
      q: "Does ShadowTalk train AI models on my data?",
      a: "No. Your proprietary conversations are never used to train foundation models. Sensitive work can run in the end-to-end encrypted Stealth Vault, and on-device mode runs inference in your browser.",
    },
    {
      q: "Can ShadowTalk run on-device without internet?",
      a: "Yes. On devices with WebGPU (Chrome/Edge 113+) you can opt in to compact quantized models that execute chat inference directly in your browser with zero network egress.",
    },
  ],
} as const;
