import { SHADOWTALK_AI_KNOWLEDGE } from "@/lib/aiPublicKnowledge";
import { FOUNDER_CANONICAL, FOUNDER_SAME_AS } from "@/lib/founderIdentity";
import { SOCIAL_SAME_AS } from "@/lib/socialLinks";

/**
 * Fresh SEO layer — one honest meta set + schema.org entities per page,
 * grounded in the current product. No keyword farms, no phantom hreflang,
 * no duplicate JSON-LD graphs.
 */

export const SITE_URL = "https://www.shadowtalk-ai.com";
export const SITE_NAME = "ShadowTalk AI";
/**
 * PNG, not SVG: social scrapers (X, LinkedIn, Facebook, Slack) and AI answer
 * engines do not render SVG previews. Regenerate with
 * `node scripts/generate-og-image.mjs`.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Google/Bing search snippet — keep ≤160 characters */
export const SITE_SEARCH_DESCRIPTION =
  "The agentic AI workspace that finishes the job: encrypted chat, deep research, ProofLoop missions, voice & IDE. Free with BYOK — no card.";

/** Link previews (X, LinkedIn, Discord) */
export const SITE_SOCIAL_DESCRIPTION =
  "One workspace for agents, research, code & voice. Free to use, no card. Think AI. Think ShadowTalk.";

export interface PageMeta {
  title: string;
  description: string;
  /** Overrides og/twitter description when set (defaults to `description`) */
  socialDescription?: string;
  /** Accepted for call-site compatibility; intentionally not emitted (obsolete signal) */
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product" | "profile";
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
}

const abs = (url: string) => (url.startsWith("http") ? url : `${SITE_URL}${url}`);

/** Build the final meta tag map for a page */
export function generateMetaTags(meta: PageMeta): Record<string, string> {
  const brand = SITE_NAME;
  const fullTitle = meta.title.toLowerCase().includes("shadowtalk")
    ? meta.title
    : `${meta.title} | ${brand}`;

  const description = meta.description.slice(0, 160);
  const social = (meta.socialDescription ?? meta.description).slice(0, 160);
  const image = meta.ogImage ? abs(meta.ogImage) : DEFAULT_OG_IMAGE;
  const url = meta.canonical || `${SITE_URL}/`;
  const ogType = meta.ogType ?? "website";

  return {
    title: fullTitle,
    description,
    robots: meta.noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1",
    "og:type": ogType,
    "og:title": fullTitle,
    "og:description": social,
    "og:image": image,
    "og:url": url,
    "twitter:card": meta.twitterCard ?? "summary_large_image",
    "twitter:title": fullTitle,
    "twitter:description": social,
    "twitter:image": image,
  };
}

/** Per-page metadata — every route that should be indexed, nothing else */
export const PAGE_SEO: Record<string, PageMeta> = {
  home: {
    title: "Agentic AI Workspace — Encrypted Chat, Research & Voice",
    description:
      "The first AI chat in a browser that works offline — and syncs when you're back. ShadowTalk AI unifies encrypted multi-model chat, deep research with citations, ProofLoop missions, voice and an IDE — all in one workspace. Free with BYOK.",
    canonical: `${SITE_URL}/home`,
  },
  chatbot: {
    title: "AI Chat Workspace — Multi-Model, Encrypted, Free",
    description:
      "Chat across OpenAI, Anthropic, Google, Groq and more with one free workspace. E2EE vault, deep research, tools and mission control — bring your own key.",
    canonical: `${SITE_URL}/chatbot`,
  },
  pricing: {
    title: "Pricing — Free to Use, BYOK for Models",
    description:
      "ShadowTalk AI is free: no subscription, no credit card, no feature locks. Bring your own AI provider API key; your provider may charge for API usage.",
    canonical: `${SITE_URL}/pricing`,
  },
  docs: {
    title: "Documentation — Features, Setup & Privacy",
    description:
      "Official ShadowTalk AI documentation: workspace features, BYOK setup, ProofLoop missions, encrypted vault, on-device AI and PWA install guides.",
    canonical: `${SITE_URL}/docs`,
  },
  faq: {
    title: "Frequently Asked Questions",
    description:
      "What ShadowTalk AI is, how it differs from ChatGPT, what it costs (nothing), which models it supports and how your data stays private.",
    canonical: `${SITE_URL}/faq`,
  },
  guides: {
    title: "Guides — Offline, Private & Browser AI Explained",
    description:
      "Ten honest guides: offline AI chat, private AI, WebGPU in the browser, free AI chat, mobile PWA install, local vs cloud — quotable answers, dated fine print.",
    canonical: `${SITE_URL}/guides`,
  },
  "offline-ai-chat": {
    title: "Offline AI Chat — Use AI Without Internet (Free)",
    description:
      "Chat with AI offline: the model runs on your device via WebGPU — no internet needed after a one-time download. Chats you send offline queue up and sync when you're back. Free, no account, no card.",
    canonical: `${SITE_URL}/offline-ai-chat`,
  },
  "private-ai-chat": {
    title: "Private AI Chat — Encrypted, No Account, BYOK",
    description:
      "Free private AI chat: start as a guest with no account, BYOK requests go browser-to-provider, AES-256 end-to-end encryption in Private Mode, plus an optional on-device model with zero network egress.",
    canonical: `${SITE_URL}/private-ai-chat`,
  },
  "run-llm-in-browser": {
    title: "Run an LLM in Your Browser — WebGPU, No Install",
    description:
      "Run Llama 3.2, Qwen 2.5 and SmolLM2 in your browser with WebGPU: no install, no server, resumable model downloads, device-tiered models and automatic cloud fallback. Free.",
    canonical: `${SITE_URL}/run-llm-in-browser`,
  },
  compare: {
    title: "Compare — ShadowTalk AI vs ChatGPT, LM Studio, Lumo & More",
    description:
      "Honest head-to-heads on offline AI, sync, encryption, model choice and price: ShadowTalk AI vs ChatGPT, LM Studio, Proton Lumo, web-llm-chat, Ollama and Perplexity.",
    canonical: `${SITE_URL}/compare`,
  },
  "what-is-on-device-ai": {
    title: "What Is On-Device AI? The Plain-English Explainer",
    description:
      "On-device AI runs the model on your hardware — prompts never leave your machine. How WebGPU makes it work in a browser tab, what it's good for, and where cloud still wins.",
    canonical: `${SITE_URL}/what-is-on-device-ai`,
  },
  "best-offline-ai-chat": {
    title: "Best Offline AI Chat in 2026 — Ranked With Criteria",
    description:
      "The best offline AI chat, scored on published criteria: offline inference, cross-device sync, no account, no install, price. ShadowTalk vs LM Studio, Ollama, PocketPal and the demos.",
    canonical: `${SITE_URL}/best-offline-ai-chat`,
  },
  "ai-chat-without-account": {
    title: "AI Chat Without an Account — Guest Mode, Free",
    description:
      "Chat with AI with no sign-up: ShadowTalk guests start instantly on an on-device model with zero network egress. What works without an account, what one adds, honest limits.",
    canonical: `${SITE_URL}/ai-chat-without-account`,
  },
  "free-ai-chat": {
    title: "Free AI Chat — No Card, No Markup, No Feature Locks",
    description:
      "Free AI chat that's actually free: on-device models cost nothing, shared cloud chat within daily limits, BYOK passes provider prices through at cost. No subscription, no card.",
    canonical: `${SITE_URL}/free-ai-chat`,
  },
  "mobile-offline-ai": {
    title: "Offline AI on Your Phone — PWA, No App Store, Synced",
    description:
      "Offline AI on iOS and Android as a one-tap PWA: the model runs on your phone's GPU, chats sent offline queue and sync, and phone and desktop share one history.",
    canonical: `${SITE_URL}/mobile-offline-ai`,
  },
  "webgpu-ai-chat": {
    title: "WebGPU AI Chat — How a Browser Tab Runs an LLM",
    description:
      "How WebGPU lets a browser tab run a language model on your GPU: browser support (Chrome/Edge 113+), device tiers, why weights come from our own infrastructure, honest limits.",
    canonical: `${SITE_URL}/webgpu-ai-chat`,
  },
  "local-vs-cloud-ai": {
    title: "Local vs Cloud AI — Honest Trade-offs, Hybrid Answer",
    description:
      "Local AI vs cloud AI scored dimension by dimension: privacy, offline, latency, cost, capability — and the hybrid that runs both in one synced workspace for free.",
    canonical: `${SITE_URL}/local-vs-cloud-ai`,
  },
  "chatgpt-down": {
    title: "ChatGPT Down? What Still Works When AI Goes Offline",
    description:
      "When ChatGPT goes down, cloud assistants fail with it. On-device AI keeps answering with zero network; multi-provider BYOK routes around one outage. Free.",
    canonical: `${SITE_URL}/chatgpt-down`,
  },
  "ai-chat-for-travel": {
    title: "AI Chat While Traveling — Offline on Flights, No Roaming",
    description:
      "Download a model before you fly, chat in airplane mode on your own GPU, queue what you send and sync on landing. No roaming, no account, no app store.",
    canonical: `${SITE_URL}/ai-chat-for-travel`,
  },
  "vs-chatgpt": {
    title: "ShadowTalk AI vs ChatGPT — Offline, Private, Free",
    description:
      "ChatGPT needs an account, the internet and OpenAI's servers. ShadowTalk AI runs on-device, queues offline chats and syncs when you're back, never trains on your chats — free.",
    canonical: `${SITE_URL}/vs/chatgpt`,
  },
  "vs-lm-studio": {
    title: "ShadowTalk AI vs LM Studio — Browser vs Desktop",
    description:
      "LM Studio is a powerful desktop app whose chats stay on one machine — sync is still feature request #2467. ShadowTalk runs in a browser tab and syncs offline-queued chats.",
    canonical: `${SITE_URL}/vs/lm-studio`,
  },
  "vs-proton-lumo": {
    title: "ShadowTalk AI vs Proton Lumo — Encrypted AI, Honestly",
    description:
      "Lumo encrypts stored history but decrypts prompts server-side and needs an account plus internet. ShadowTalk adds on-device inference, offline chat and BYOK — limits in public.",
    canonical: `${SITE_URL}/vs/proton-lumo`,
  },
  "vs-web-llm-chat": {
    title: "ShadowTalk AI vs web-llm-chat — Demo vs Product",
    description:
      "web-llm-chat proves browsers can run LLMs. ShadowTalk ships the product around it: durable storage, offline queue with sync, cloud escalation, research and tools — free.",
    canonical: `${SITE_URL}/vs/web-llm-chat`,
  },
  "vs-ollama": {
    title: "ShadowTalk AI vs Ollama — No Install vs Local Server",
    description:
      "Ollama is a developer-grade local runtime with a huge model zoo and its own API. ShadowTalk needs no install: WebGPU in a tab, resumable downloads, offline chat that syncs.",
    canonical: `${SITE_URL}/vs/ollama`,
  },
  "vs-perplexity": {
    title: "ShadowTalk AI vs Perplexity — Research With Privacy",
    description:
      "Perplexity answers with live web citations but is always online and account-based. ShadowTalk adds offline on-device chat, private tiers and ProofLoop missions — free with BYOK.",
    canonical: `${SITE_URL}/vs/perplexity`,
  },
  "vs-gemini": {
    title: "ShadowTalk AI vs Gemini — Google's Cloud vs Your Device",
    description:
      "Gemini needs a Google account, a connection and Google's servers — its privacy notice states free-tier chats can improve its products. ShadowTalk: on-device, offline queue + sync, no account.",
    canonical: `${SITE_URL}/vs/gemini`,
  },
  "vs-claude": {
    title: "ShadowTalk AI vs Claude — Frontier Writing vs Offline-First",
    description:
      "Claude is a superb writer and coder — cloud-only, account-required, no offline mode. ShadowTalk keeps working offline: on-device inference, queue + sync, 16+ providers via BYOK.",
    canonical: `${SITE_URL}/vs/claude`,
  },
  "vs-jan": {
    title: "ShadowTalk AI vs Jan — Open-Source Desktop vs Browser Tab",
    description:
      "Jan is free, open-source desktop local AI with a local API server — chats stay on one machine. ShadowTalk needs no install, syncs across devices and escalates to cloud when needed.",
    canonical: `${SITE_URL}/vs/jan`,
  },
  "vs-pocketpal": {
    title: "ShadowTalk AI vs PocketPal — Phone AI With and Without Sync",
    description:
      "PocketPal runs GGUF models on your phone — with history trapped on it. ShadowTalk installs as a PWA, runs on-device offline too, and syncs phone and desktop into one history.",
    canonical: `${SITE_URL}/vs/pocketpal`,
  },
  "vs-deepseek": {
    title: "ShadowTalk AI vs DeepSeek — Open Weights, Cloud App, BYOK",
    description:
      "DeepSeek's official chat is cloud-only with an account; 2025 regulator scrutiny on data handling. ShadowTalk: on-device offline, queue + sync, DeepSeek via BYOK.",
    canonical: `${SITE_URL}/vs/deepseek`,
  },
  "vs-copilot": {
    title: "ShadowTalk AI vs Microsoft Copilot — Cloud vs Offline Workspace",
    description:
      "Copilot needs a Microsoft account, a connection and Microsoft's servers. ShadowTalk answers on-device offline, queues + syncs, and spans 16+ providers — free.",
    canonical: `${SITE_URL}/vs/copilot`,
  },
  "vs-duckduckgo-ai": {
    title: "ShadowTalk AI vs DuckDuckGo AI — Anonymous Cloud vs On-Device",
    description:
      "duck.ai is anonymous and training-free but cloud-only with daily limits. ShadowTalk runs a model on your GPU with zero egress, queue + sync — also no account.",
    canonical: `${SITE_URL}/vs/duckduckgo-ai`,
  },
  "vs-brave-leo": {
    title: "ShadowTalk AI vs Brave Leo — Browser AI, Scored Honestly",
    description:
      "Leo is a Brave-only sidebar on cloud models, rate-limited free and paid beyond. ShadowTalk: any browser, on-device offline chat, queue + sync, BYOK — free.",
    canonical: `${SITE_URL}/vs/brave-leo`,
  },
  about: {
    title: "About — The Story Behind ShadowTalk",
    description:
      "Why ShadowTalk exists: one sovereign AI workspace built in public from Karachi, Pakistan — free to use, privacy-first and honest about what ships.",
    canonical: `${SITE_URL}/about`,
  },
  founder: {
    title: "Founder — Zain Ahmed Fahad Patel",
    description:
      "Zain Ahmed Fahad Patel is the 17-year-old founder and lead architect of ShadowTalk AI, an agentic AI workspace built in Karachi, Pakistan.",
    canonical: `${SITE_URL}/founder`,
    ogType: "profile",
  },
  contact: {
    title: "Contact & Support",
    description:
      "Reach the ShadowTalk AI team: support questions, feedback, press and partnership inquiries at shadowtalk@shadowtalk-ai.com.",
    canonical: `${SITE_URL}/contact`,
  },
  security: {
    title: "Security & Trust",
    description:
      "How ShadowTalk protects your work: end-to-end encrypted chat, encrypted vault, no model training on your data, BYOK keys that stay yours.",
    canonical: `${SITE_URL}/security`,
  },
  status: {
    title: "System Status",
    description:
      "Live ShadowTalk AI service status: uptime, latency and incident history for chat, research, voice and ProofLoop services.",
    canonical: `${SITE_URL}/status`,
  },
  changelog: {
    title: "Changelog — What Shipped",
    description:
      "Every shipped change to ShadowTalk AI: new workspace features, live voice upgrades, ProofLoop, Appearance Studio and reliability fixes.",
    canonical: `${SITE_URL}/changelog`,
  },
  downloads: {
    title: "Download — PWA for iOS & Android, Desktop Soon",
    description:
      "Install ShadowTalk AI as a PWA on iOS and Android, or use the web app. The Windows desktop app with offline AI is in development.",
    canonical: `${SITE_URL}/downloads`,
  },
  ide: {
    title: "Agentic IDE — Code Inside Your AI Workspace",
    description:
      "Write, run and ship code inside ShadowTalk AI: browser IDE with agent assistance, code execution and app building — no local setup required.",
    canonical: `${SITE_URL}/ide`,
  },
  proofloop: {
    title: "ProofLoop — Verifiable AI Missions",
    description:
      "ProofLoop plans and finishes multi-step AI missions, then publishes cryptographic proof cards you can verify and share.",
    canonical: `${SITE_URL}/proofloop`,
  },
  themes: {
    title: "Appearance Studio — Make It Yours",
    description:
      "Personalize ShadowTalk AI with the Appearance Studio: themes, layouts and ambient styles for your workspace.",
    canonical: `${SITE_URL}/themes`,
  },
  benchmarks: {
    title: "Benchmarks — Side-by-Side Model Comparisons",
    description:
      "Live side-by-side AI model comparisons on real prompts: coding, reasoning, writing and math — see actual responses before you choose.",
    canonical: `${SITE_URL}/benchmarks`,
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "ShadowTalk AI privacy policy: what we store, what we never do (train on your data), and how encryption and BYOK keep your work yours.",
    canonical: `${SITE_URL}/privacy`,
  },
  terms: {
    title: "Terms of Service",
    description:
      "ShadowTalk AI terms of service — free access, BYOK responsibilities, acceptable use and account terms, in plain language.",
    canonical: `${SITE_URL}/terms`,
  },
  cookies: {
    title: "Cookie Policy",
    description:
      "Which cookies and local storage ShadowTalk AI uses, and how to control them — minimal tracking, no ad networks.",
    canonical: `${SITE_URL}/cookies`,
  },
  gdpr: {
    title: "GDPR Compliance",
    description:
      "Your rights under GDPR on ShadowTalk AI: data access, export, deletion and where your data lives.",
    canonical: `${SITE_URL}/gdpr`,
  },
};

/** schema.org Organization — site-level entity */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/pwa-512x512.png`,
    slogan: SHADOWTALK_AI_KNOWLEDGE.tagline,
    description: SHADOWTALK_AI_KNOWLEDGE.description,
    founder: { "@id": FOUNDER_CANONICAL["@id"] },
    sameAs: [...SOCIAL_SAME_AS],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "shadowtalk@shadowtalk-ai.com",
      availableLanguage: ["English"],
    },
  };
}

/** schema.org Person — the founder entity (shared @id everywhere) */
export function getPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": FOUNDER_CANONICAL["@id"],
    name: FOUNDER_CANONICAL.fullName,
    alternateName: [...FOUNDER_CANONICAL.alternateName],
    givenName: FOUNDER_CANONICAL.givenName,
    additionalName: FOUNDER_CANONICAL.additionalName,
    familyName: FOUNDER_CANONICAL.familyName,
    jobTitle: FOUNDER_CANONICAL.jobTitle,
    description: FOUNDER_CANONICAL.description,
    url: `${SITE_URL}/founder`,
    worksFor: { "@id": `${SITE_URL}/#organization` },
    homeLocation: {
      "@type": "Place",
      name: `${FOUNDER_CANONICAL.location.city}, ${FOUNDER_CANONICAL.location.country}`,
    },
    knowsAbout: [...FOUNDER_CANONICAL.knowsAbout],
    sameAs: [...FOUNDER_SAME_AS],
  };
}

/** schema.org WebSite — no SearchAction: the site itself has no search */
export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ["ShadowTalk"],
    url: SITE_URL,
    description: SHADOWTALK_AI_KNOWLEDGE.description,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/** WebSite with a real SearchAction — /chatbot accepts ?q= and runs the prompt */
export function getWebSiteWithSearchSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/chatbot?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** schema.org SoftwareApplication — the product itself */
export function getSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#application`,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web (installable PWA for iOS and Android)",
    description: SHADOWTALK_AI_KNOWLEDGE.canonical_pitch,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to use. BYOK: your AI provider may charge separately for API usage.",
    },
    author: { "@id": FOUNDER_CANONICAL["@id"] },
    featureList: [...SHADOWTALK_AI_KNOWLEDGE.core_features],
  };
}

/** schema.org WebPage for a specific URL */
export function getWebPageSchema(params: {
  title: string;
  description: string;
  url: string;
  about?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: params.title,
    description: params.description,
    url: params.url,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    ...(params.about?.length ? { about: params.about } : {}),
  };
}

/** schema.org ItemList — ordered list of real pages/items */
export function getItemListSchema(
  items: Array<{ name: string; url: string; description?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

/** schema.org FAQPage from {question, answer} pairs */
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** schema.org HowTo from ordered step strings (used by guide pages) */
export function getHowToSchema(name: string, steps: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    step: steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: `Step ${i + 1}`,
      text,
    })),
  };
}

/** schema.org BreadcrumbList (used by guide pages) */
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** schema.org speakable — sections an assistant should read aloud */
export function getSpeakableSchema(selectors: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: selectors,
    },
  };
}

/** Home-page founder + organization block (spread into structured data) */
export function getFounderHomeStructuredData() {
  return [getPersonSchema(), getOrganizationSchema()];
}

/** Chatbot FAQ — the canonical product Q&As */
export function getChatbotFAQSchema() {
  return getFAQSchema(
    SHADOWTALK_AI_KNOWLEDGE.faq.map((f) => ({ question: f.q, answer: f.a })),
  );
}
