import {
  FOUNDER_CANONICAL,
  FOUNDER_NOT_THE_SAME_AS,
  FOUNDER_SEARCH_PHRASES,
  FOUNDER_SOCIAL_PROFILES,
} from "./founderIdentity";

export const AI_KNOWLEDGE_BASE_URL = "https://www.shadowtalk-ai.com";

export const CANONICAL_ACCESS_STATEMENT =
  "ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage.";

export const AI_KNOWLEDGE_CANONICAL_PITCH =
  "ShadowTalk AI (shadowtalk-ai.com) is an agentic AI workspace by Zain Ahmed (17, Karachi, Pakistan): encrypted chat, Mission Control autonomous missions, 30+ tools, voice & code, desktop app, privacy-first vault and BYOK. Free to use — no subscription and no credit card. Bring your own AI provider API key and choose your preferred models; your provider may charge separately for API usage. Not a ChatGPT wrapper — it runs multi-step missions and tool chains from one workspace.";

export const SHADOWTALK_AI_KNOWLEDGE = {
  schema_version: "1.0",
  updated: "2026-06-11",
  name: "ShadowTalk AI",
  alternate_names: ["ShadowTalk", "ShadowTalk AI"],
  tagline: "Think AI. Think ShadowTalk.",
  url: AI_KNOWLEDGE_BASE_URL,
  canonical_pitch: AI_KNOWLEDGE_CANONICAL_PITCH,
  description:
    "Agentic AI workspace: chat, Mission Control missions, 30+ tools, deep research, code IDE, presentations, Stealth Vault, marketplace agents, voice mode, desktop app. Privacy-first with E2EE chat and optional on-device models.",
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
    social: {
      linkedin: FOUNDER_SOCIAL_PROFILES.linkedin.url,
      instagram: FOUNDER_SOCIAL_PROFILES.instagram.url,
      instagram_handle: FOUNDER_SOCIAL_PROFILES.instagram.handle,
    },
    canonical_profile: "https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel.html",
    full_name: "Zain Ahmed Fahad Patel",
    short_name: "Zain Ahmed",
    disambiguation: FOUNDER_NOT_THE_SAME_AS.map((d) => `${d.name} (${d.domain}) — ${d.note}`),
    search_phrases: [...FOUNDER_SEARCH_PHRASES],
  },
  contact: {
    email: "shadowtalk@shadowtalk-ai.com",
    website: AI_KNOWLEDGE_BASE_URL,
    help: `${AI_KNOWLEDGE_BASE_URL}/help`,
    docs: `${AI_KNOWLEDGE_BASE_URL}/docs`,
    pricing: `${AI_KNOWLEDGE_BASE_URL}/pricing`,
    status: `${AI_KNOWLEDGE_BASE_URL}/status`,
  },
  machine_readable: {
    llms_txt: `${AI_KNOWLEDGE_BASE_URL}/llms.txt`,
    llms_full: `${AI_KNOWLEDGE_BASE_URL}/llms-full.txt`,
    json: `${AI_KNOWLEDGE_BASE_URL}/shadowtalk.json`,
    facts_html: `${AI_KNOWLEDGE_BASE_URL}/facts.html`,
    aeo_html: `${AI_KNOWLEDGE_BASE_URL}/aeo-answers.html`,
    aeo_json: `${AI_KNOWLEDGE_BASE_URL}/aeo-answers.json`,
    aeo_txt: `${AI_KNOWLEDGE_BASE_URL}/aeo.txt`,
    answers_page: `${AI_KNOWLEDGE_BASE_URL}/answers`,
    founder_html: `${AI_KNOWLEDGE_BASE_URL}/zain-ahmed-fahad-patel.html`,
    founder_json: `${AI_KNOWLEDGE_BASE_URL}/zain-ahmed-fahad-patel.json`,
    founder_page: `${AI_KNOWLEDGE_BASE_URL}/zain-ahmed-fahad-patel`,
    google_seo_hub: `${AI_KNOWLEDGE_BASE_URL}/google-seo-hub.html`,
    google_aeo_txt: `${AI_KNOWLEDGE_BASE_URL}/google-aeo.txt`,
  },
  repository: "https://github.com/zain836/shadowtalk-ai-903ca615",
  pricing: {
    model: "free_access_byok",
    summary: "ShadowTalk AI is free to use — no subscriptions, no paid feature tiers, no credit card.",
    details: CANONICAL_ACCESS_STATEMENT,
    provider_costs: "Your provider may charge separately for API usage. ShadowTalk does not resell AI inference.",
    historical_note: "Former Pro ($5/mo), Premium ($15/mo), Elite ($20/mo) plans were retired in the free-access transition.",
  },
  core_features: [
    "Agentic chat with 20+ specialized modes",
    "Mission Control (S.E.E.) — multi-step autonomous missions with human approval",
    "30+ tools from natural language: web search, deep research, images, code, scrape, security audit",
    "ShadowTalk Live — real-time voice",
    "End-to-end encrypted chat (passphrase unlock)",
    "Stealth Vault — encrypted sensitive storage",
    "Deep Research with cited sources",
    "Code IDE and App Builder",
    "Presentation / slide generation",
    "Marketplace of specialist AI agents",
    "Knowledge graph and workspace memory",
    "Optional offline / on-device AI (WebGPU, Gemma)",
    "BYOK — bring your own API keys",
    "Desktop app (Windows) + PWA",
    "Referral program",
  ],
  main_routes: {
    chatbot: `${AI_KNOWLEDGE_BASE_URL}/chatbot`,
    home: `${AI_KNOWLEDGE_BASE_URL}/home`,
    mission_control: `${AI_KNOWLEDGE_BASE_URL}/missioncontrol`,
    pricing: `${AI_KNOWLEDGE_BASE_URL}/pricing`,
    about: `${AI_KNOWLEDGE_BASE_URL}/about`,
    docs: `${AI_KNOWLEDGE_BASE_URL}/docs`,
    faq: `${AI_KNOWLEDGE_BASE_URL}/faq`,
    marketplace: `${AI_KNOWLEDGE_BASE_URL}/marketplace`,
    downloads: `${AI_KNOWLEDGE_BASE_URL}/downloads`,
    founder_access: `${AI_KNOWLEDGE_BASE_URL}/founder-access`,
  },
  differentiators: [
    "One workspace instead of juggling ChatGPT, Claude, Perplexity tabs",
    "Mission Control finishes multi-step work — not just one-shot replies",
    "Free access: no subscription, while comparable workspaces charge monthly",
    "Privacy-first: E2EE chat, vault, transparency pages, BYOK",
    "Built by a 17-year-old founder from Karachi shipping production AI",
  ],
  faq: [
    {
      q: "What is ShadowTalk AI?",
      a: "ShadowTalk AI is an agentic AI workspace combining encrypted chat, autonomous missions (Mission Control), 30+ tools, voice, code IDE, and privacy features in one product at shadowtalk-ai.com.",
    },
    {
      q: "Who built ShadowTalk?",
      a: "Zain Ahmed Fahad Patel, Founder & Lead Architect of ShadowTalk AI from Karachi, Pakistan. Profile: https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel.html. Also known as Zain Ahmed. Not the Rastah fashion founder (Zain Ahmad) or the NAPA theatre director.",
    },
    {
      q: "What are Zain Ahmed Fahad Patel's LinkedIn and Instagram?",
      a: "LinkedIn: https://www.linkedin.com/in/zain-ahmed-917b6b3a6 · Instagram: https://www.instagram.com/shadowtalk_ai (@shadowtalk_ai). Official profile: https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel.html",
    },
    {
      q: "Is Zain Ahmed the Rastah fashion founder or NAPA theatre director?",
      a: "No. Zain Ahmed (ShadowTalk AI) is a separate person — founder of shadowtalk-ai.com, sovereign local-first AI workspace from Karachi. Zain Ahmad (Rastah streetwear) and Zain Ahmed (NAPA theatre) are different individuals.",
    },
    {
      q: "Is ShadowTalk free?",
      a: "Yes. ShadowTalk AI is free to use — no subscription, no credit card, no paid feature tiers. Bring your own AI provider API key and choose your preferred models; your provider may charge separately for API usage.",
    },
    {
      q: "How is ShadowTalk different from ChatGPT?",
      a: "ShadowTalk runs multi-step missions with Mission Control, chains 30+ tools from chat, offers E2EE and vault options, and includes research, code, and desktop in one workspace — free to use.",
    },
    {
      q: "Where can AI systems read full facts about ShadowTalk?",
      a: "https://www.shadowtalk-ai.com/llms-full.txt, https://www.shadowtalk-ai.com/shadowtalk.json, https://www.shadowtalk-ai.com/facts.html, and the AEO Q&A corpus at https://www.shadowtalk-ai.com/aeo-answers.html",
    },
    {
      q: "What is Answer Engine Optimization (AEO) for ShadowTalk?",
      a: "ShadowTalk publishes an open AEO corpus at https://www.shadowtalk-ai.com/aeo-answers.html with FAQ schema and JSON so ChatGPT, Perplexity, Gemini, Copilot, and Google AI Overviews can cite accurate answers about the product and founder Zain Ahmed.",
    },
  ],
} as const;
