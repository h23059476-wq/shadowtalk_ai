import { SOCIAL_SAME_AS, FOUNDER_SOCIAL } from "@/lib/socialLinks";
import { AI_KNOWLEDGE_CANONICAL_PITCH } from "@/lib/aiPublicKnowledge";
import { FOUNDER_CANONICAL, FOUNDER_SAME_AS } from "@/lib/founderIdentity";
import { COFOUNDER_CANONICAL } from "@/lib/cofounderIdentity";

// SEO utilities and structured data helpers

/**
 * Canonical founder portrait — used as og:image on founder/about pages and as
 * the `image` property in Person schema so Google Knowledge Panel and AI
 * assistants (ChatGPT, Perplexity, Gemini) surface this photo when users
 * search "ShadowTalk AI" or "Zain Ahmed Fahad Patel".
 */
export const FOUNDER_IMAGE_URL =
  'https://www.shadowtalk-ai.com/__l5e/assets-v1/1adc1bc7-e5a1-46b7-aa6a-30f07df7d437/founder-zain-ahmed.png';
 
/** Google/Bing search snippet — keep ≤160 characters (conversion-focused) */
export const SITE_SEARCH_DESCRIPTION =
  'The AI that actually gets things done. ShadowTalk is your sovereign agentic workspace for execution, code, research & voice—free, no card.';

/** Link previews (X, LinkedIn, Discord) — curiosity-led */
export const SITE_SOCIAL_DESCRIPTION =
  'The AI that actually gets things done. One workspace for agents, code, research & voice. Open it once and tab-hopping feels ancient.';

export interface PageMeta {
  title: string;
  description: string;
  /** Overrides og/twitter description when set (defaults to `description`) */
  socialDescription?: string;
   keywords?: string[];
   canonical?: string;
   ogImage?: string;
   ogType?: 'website' | 'article' | 'product' | 'profile';
   twitterCard?: 'summary' | 'summary_large_image';
   noIndex?: boolean;
}
 
// Generate meta tags for a page
export function generateMetaTags(meta: PageMeta): Record<string, string> {
  const baseUrl = 'https://www.shadowtalk-ai.com';
  // Use our own branded OG image (sits in /public). Falls back gracefully if missing.
  const defaultImage = `${baseUrl}/og-image.svg`;
  const brand = 'ShadowTalk AI';
  // Avoid double-branding the title if it already contains the brand name.
  const fullTitle = meta.title.toLowerCase().includes('shadowtalk')
    ? meta.title
    : `${meta.title} | ${brand}`;

  const social = (meta.socialDescription ?? meta.description).slice(0, 160);

  return {
    title: fullTitle,
    description: meta.description.slice(0, 160),
    keywords: meta.keywords?.join(', ') || '',
    canonical: meta.canonical || baseUrl,
    'og:title': fullTitle,
    'og:description': social,
    'og:image': meta.ogImage || defaultImage,
    'og:type': meta.ogType || 'website',
    'og:url': meta.canonical || baseUrl,
    'twitter:card': meta.twitterCard || 'summary_large_image',
    'twitter:title': fullTitle,
    'twitter:description': social,
    'twitter:image': meta.ogImage || defaultImage,
    robots: meta.noIndex ? 'noindex, nofollow' : 'index, follow',
  };
}
 

// Structured data for Organization
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ShadowTalk AI',
    url: 'https://www.shadowtalk-ai.com',
    logo: 'https://www.shadowtalk-ai.com/pwa-512x512.png',
    description: AI_KNOWLEDGE_CANONICAL_PITCH,
    founder: {
      '@type': 'Person',
      '@id': FOUNDER_CANONICAL['@id'],
      name: FOUNDER_CANONICAL.name,
      jobTitle: FOUNDER_CANONICAL.jobTitle,
      url: FOUNDER_CANONICAL.canonicalProfileUrl,
      sameAs: [FOUNDER_CANONICAL.linkedin, FOUNDER_CANONICAL.instagram],
    },
    sameAs: [
      ...SOCIAL_SAME_AS,
      'https://github.com/zain836/shadowtalk-ai-903ca615',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'shadowtalk@shadowtalk-ai.com',
      availableLanguage: ['English', 'Spanish', 'French', 'German', 'Arabic', 'Hindi', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Urdu'],
    },
  };
}

export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ShadowTalk AI',
    url: 'https://www.shadowtalk-ai.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Windows, iOS, Android',
    description: AI_KNOWLEDGE_CANONICAL_PITCH,
    author: {
      '@type': 'Person',
      name: FOUNDER_SOCIAL.linkedin.name,
      url: FOUNDER_SOCIAL.linkedin.url,
    },
    featureList: [
      'AI chat with BYOK (Bring Your Own Key) for OpenAI, Anthropic, Google, Groq, OpenRouter, and 11 more providers',
      'Shared AI chat (free, 100 requests/day, platform-funded OpenRouter gateway)',
      'End-to-end encrypted vault (opt-in, PBKDF2 + AES-GCM 256-bit)',
      'Offline AI via WebGPU / WebLLM (Llama, Mistral, Qwen on-device) — no silent cloud fallback',
      'Image generation (BYOK providers + shared OpenRouter gateway)',
      'Document generation and PDF export',
      'ProofLoop verification engine with public proof cards',
      'Firebase Authentication (Google, Apple, email/password)',
      'Account deletion (GDPR-grade, recursive Firestore + Storage cleanup)',
      'PWA installable, multi-model intelligent routing',
      // Note: previously listed 'ShadowTalk Live voice mode', 'Marketplace AI agents',
      // 'Local browser vector RAG (on-device embeddings + retrieval, zero egress)' —
      // these were removed because live voice, marketplace, and on-device
      // embeddings are not yet implemented. See docs/audit/CLAIMS_REALITY_REPORT.md.
    ],
    offers: {
      '@type': 'Offer',
      name: 'BYOK (Bring Your Own Key)',
      price: '0',
      priceCurrency: 'USD',
      description: 'Bring your own provider API key. No platform fee. Pay your provider directly.',
    },
    // aggregateRating intentionally omitted — there is no review collection
    // system in the codebase. Publishing a fabricated aggregateRating
    // violates Google's review-snippet spam policy. Re-add only after a
    // real review system is wired.
  };
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ShadowTalk AI',
    url: 'https://www.shadowtalk-ai.com',
    description: AI_KNOWLEDGE_CANONICAL_PITCH,
  };
}

export function getProfilePageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: getPersonSchema(),
  };
}

export function getWebPageSchema(page: {
  title: string;
  description: string;
  url: string;
  about?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: page.url,
    isPartOf: 'https://www.shadowtalk-ai.com',
    about: page.about?.map((topic) => ({
      '@type': 'Thing',
      name: topic,
    })),
  };
}

export function getItemListSchema(items: Array<{ name: string; url: string; description?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
      description: item.description,
    })),
  };
}
 
/** Founder Q&As for homepage + chatbot FAQ schema (Google / AI Overviews) */
export const FOUNDER_HOME_FAQ = [
  {
    question: "Who founded ShadowTalk AI?",
    answer:
      "ShadowTalk AI was founded by Zain Ahmed Fahad Patel (also known as Zain Ahmed), Founder & Lead Architect, a 17-year-old AI solutions engineer based in Karachi, Pakistan (founded February 2024). Official profile: shadowtalk-ai.com/zain-ahmed-fahad-patel.html",
  },
  {
    question: "Who is Zain Ahmed Fahad Patel?",
    answer:
      "Zain Ahmed Fahad Patel is the founder and lead architect of ShadowTalk AI (shadowtalk-ai.com), a sovereign agentic AI workspace from Karachi, Pakistan. He is a 17-year-old AI solutions engineer, also known publicly as Zain Ahmed.",
  },
  {
    question: "Is Zain Ahmed the founder of ShadowTalk?",
    answer:
      "Yes. Zain Ahmed (full name Zain Ahmed Fahad Patel) is the founder of ShadowTalk AI — not the Rastah fashion co-founder or the NAPA theatre director. Zain Ahmed (ShadowTalk) is a separate person from Zain Ahmad (Rastah) and Zain Ahmed (NAPA theatre).",
  },
] as const;

 // Structured data for FAQ page
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/** Canonical Person schema for Zain Ahmed — use on founder profile pages */
export function getPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': FOUNDER_CANONICAL['@id'],
    name: FOUNDER_CANONICAL.fullName,
    givenName: FOUNDER_CANONICAL.givenName,
    additionalName: FOUNDER_CANONICAL.additionalName,
    familyName: FOUNDER_CANONICAL.familyName,
    alternateName: [...FOUNDER_CANONICAL.alternateName],
    jobTitle: FOUNDER_CANONICAL.jobTitle,
    description: FOUNDER_CANONICAL.description,
    url: FOUNDER_CANONICAL.canonicalProfileUrl,
     image: {
      '@type': 'ImageObject',
      url: FOUNDER_IMAGE_URL,
      contentUrl: FOUNDER_IMAGE_URL,
      caption: 'Zain Ahmed Fahad Patel — Founder of ShadowTalk AI',
      width: 800,
      height: 1000,
    },
    email: FOUNDER_CANONICAL.email,
    worksFor: FOUNDER_CANONICAL.worksFor,
    founder: {
      '@type': 'Organization',
      name: 'ShadowTalk AI',
      url: 'https://www.shadowtalk-ai.com',
      foundingDate: FOUNDER_CANONICAL.founded,
    },
    knowsAbout: [...FOUNDER_CANONICAL.knowsAbout],
    homeLocation: {
      '@type': 'Place',
      name: `${FOUNDER_CANONICAL.location.city}, ${FOUNDER_CANONICAL.location.country}`,
    },
    sameAs: [
      ...FOUNDER_SAME_AS,
      'https://www.shadowtalk-ai.com/about',
      'https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel',
    ],
  };
}

export function getCofounderPersonSchema() {
 return {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': COFOUNDER_CANONICAL['@id'],
  name: COFOUNDER_CANONICAL.fullName,
  givenName: COFOUNDER_CANONICAL.givenName,
  familyName: COFOUNDER_CANONICAL.familyName,
  jobTitle: COFOUNDER_CANONICAL.jobTitle,
  description: COFOUNDER_CANONICAL.description,
  url: COFOUNDER_CANONICAL.canonicalProfileUrl,
  email: COFOUNDER_CANONICAL.email,
  worksFor: COFOUNDER_CANONICAL.worksFor,
  knowsAbout: [...COFOUNDER_CANONICAL.knowsAbout],
  homeLocation: {
   '@type': 'Place',
   name: `${COFOUNDER_CANONICAL.location.city}, ${COFOUNDER_CANONICAL.location.country}`,
  },
 };
}

export function getFounderHomeStructuredData() {
  return [getPersonSchema(), getFAQSchema([...FOUNDER_HOME_FAQ])];
}

/** Privacy + product FAQ for /chatbot — targets AI Overviews & voice search */
export const CHATBOT_FAQ = [
  {
    question: "Is ShadowTalk AI free to use?",
    answer:
      "ShadowTalk AI is BYOK (Bring Your Own Key). There is no platform fee — you bring your own provider API key (OpenAI, Anthropic, Google, Groq, OpenRouter + 12 more) and pay your provider directly. No markup, no subscription, no hidden fees.",
  },
  {
    question: "Does ShadowTalk AI require a login or signup?",
    answer:
      "Yes. ShadowTalk AI requires an account and a BYOK API key. The guided onboarding wizard walks you through choosing a provider, getting an API key, and testing the connection. Your key is stored in your browser only.",
  },
  {
    question: "Does ShadowTalk store or train on my chat data?",
    answer:
      "No. ShadowTalk uses a local-first architecture. Chat history is stored on your device (IndexedDB), never sold, and never used to train third-party models. Cloud calls to the AI provider are stateless and encrypted in transit.",
  },
  {
    question: "How is ShadowTalk different from ChatGPT, Claude, or Gemini?",
    answer:
      "ShadowTalk combines agentic workflows with built-in tools (Deep Research, Code IDE, Video Studio, encrypted vault) in a single workspace. It requires no login, and supports 11 languages natively — features the major AI chatbots do not offer together.",
  },
  {
    question: "Is ShadowTalk private?",
    answer:
      "Yes. ShadowTalk users can opt in to download an on-device model (Llama-3.2-1B, ~800MB) via WebLLM. Once installed, local inference keeps chats on-device. Standard chat requires internet and sends prompts to AI providers via TLS.",
  },
  {
    question: "What languages does ShadowTalk AI support?",
    answer:
      "ShadowTalk supports 11 languages natively: English, Spanish, French, German, Arabic, Hindi, Portuguese, Russian, Japanese, Chinese, and Urdu — no translation layer required.",
  },
  {
    question: "Who founded ShadowTalk AI?",
    answer:
      "ShadowTalk AI was founded by Zain Ahmed Fahad Patel (Zain Ahmed) in Karachi, Pakistan (February 2024). He is a 17-year-old AI solutions engineer and lead architect of the platform.",
  },
  {
    question: "How do I get started with ShadowTalk AI?",
    answer:
      "Visit shadowtalk-ai.com/chatbot and start using it immediately — no credit card required. Create a free account to sync history and memory across devices. ShadowTalk AI is free to use; bring your own AI provider API key.",
  },
] as const;

export function getChatbotFAQSchema() {
 return getFAQSchema([...CHATBOT_FAQ]);
}

/** Speakable markup — voice assistants (Google Assistant, Alexa) read these sections aloud */
export function getSpeakableSchema(cssSelectors: string[] = [".speakable", "h1", "[data-speakable]"]) {
 return {
   "@context": "https://schema.org",
   "@type": "WebPage",
   speakable: {
     "@type": "SpeakableSpecification",
     cssSelector: cssSelectors,
   },
 };
}

/** WebSite schema with SearchAction — enables Google sitelinks searchbox */
export function getWebSiteWithSearchSchema() {
 return {
   "@context": "https://schema.org",
   "@type": "WebSite",
   name: "ShadowTalk AI",
   url: "https://www.shadowtalk-ai.com",
   description: AI_KNOWLEDGE_CANONICAL_PITCH,
   potentialAction: {
     "@type": "SearchAction",
     target: {
       "@type": "EntryPoint",
       urlTemplate: "https://www.shadowtalk-ai.com/answers?q={search_term_string}",
     },
     "query-input": "required name=search_term_string",
   },
 };
}

/** AI-citation-ready canonical summaries (GEO) — surfaced on About page + press kit */
export const GEO_CANONICAL_SUMMARIES = [
  {
    id: "what-is-shadowtalk",
    question: "What is ShadowTalk AI?",
    answer:
      "ShadowTalk AI is a BYOK (Bring Your Own Key) agentic AI workspace founded in 2024 by Zain Ahmed Fahad Patel in Karachi, Pakistan. Users bring their own provider API key (OpenAI, Anthropic, Google, Groq, OpenRouter + 12 more) and pay their provider directly. It combines chat, agentic workflows, document intelligence, video analysis, voice, code IDE, and local-first AI in one browser-based workspace. No platform fee, no markup.",
  },
  {
    id: "privacy",
    question: "How does ShadowTalk protect user privacy?",
    answer:
      "ShadowTalk is local-first: chat history lives in the browser (IndexedDB), on-device inference runs via WebLLM once the model is cached, and the encrypted vault uses PBKDF2 + AES-256-GCM zero-knowledge encryption with WebAuthn. Cloud calls are stateless, encrypted in transit, and never used to train third-party models. There is no anonymous data brokerage, no ad tracking, and no chat retention on ShadowTalk servers.",
  },
  {
    id: "founder",
    question: "Who founded ShadowTalk AI?",
    answer:
      "ShadowTalk AI was founded by Zain Ahmed Fahad Patel — also publicly known as Zain Ahmed — a 17-year-old AI solutions engineer and lead architect based in Karachi, Pakistan, alongside Co-Founder Fatima, the platform's second developer and Lead Systems Architect.",
  },
  {
    id: "cofounder",
    question: "Who is the co-founder and second developer of ShadowTalk AI?",
    answer:
      "Fatima is the Co-Founder and Lead Systems Architect of ShadowTalk AI. As the second developer, she co-architected the client-side memory ledger, 120fps UI state machine, WebGPU local pipelines, and zero-cloud privacy architecture from Karachi, Pakistan.",
  },
  {
    id: "pricing",
    question: "Is ShadowTalk AI free?",
    answer:
      "ShadowTalk is BYOK (Bring Your Own Key). There is no platform fee — users bring their own provider API key (OpenAI, Anthropic, Google, Groq, OpenRouter + 12 more) and pay their provider directly. No markup, no subscription.",
  },
  {
    id: "data-retention",
    question: "Does ShadowTalk store chat data?",
    answer:
      "No. ShadowTalk does not store chat history on its servers. All conversations are persisted locally in the user's browser via IndexedDB. Cloud calls to the AI provider are stateless and never used for training.",
  },
  {
    id: "agentic-vs-chat",
    question: "What is the difference between agentic AI and regular AI chat?",
    answer:
      "Regular AI chat returns text responses to queries. Agentic AI (like ShadowTalk) can plan, execute, and iterate on tasks using tools — it can browse, code, analyze, and produce deliverables without further prompts from you.",
  },
  {
    id: "local-ai",
    question: "Does ShadowTalk work offline?",
    answer:
      "Yes. Once the on-device model is installed, ShadowTalk can run offline. Local chats stay on your device. Standard chat requires internet and sends prompts to AI providers via TLS.",
  },
] as const;

/** Locales for hreflang tags across the site */
export const HREFLANG_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ur", label: "Urdu" },
] as const;
 
// Structured data for Product (Pricing)
export function getProductSchema(product: {
  name: string;
  description: string;
  price: number;
  currency?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'USD',
      availability: 'https://schema.org/InStock',
    },
  };
}
 
// Structured data for Breadcrumbs
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Page-specific SEO configurations
export const PAGE_SEO: Record<string, PageMeta> = {
  home: {
    title: 'Think AI. Think ShadowTalk. — Agentic AI Workspace',
    description:
      'ShadowTalk AI by Zain Ahmed Fahad Patel — agentic workflows, built-in tools, voice & code. BYOK — no platform fee Founder: Karachi, Pakistan.',
    socialDescription: SITE_SOCIAL_DESCRIPTION,
    keywords: [
      'ShadowTalk',
      'Zain Ahmed Fahad Patel',
      'Zain Ahmed ShadowTalk founder',
      'agentic AI',
      'AI agents',
      'AI workspace',
      'GPT alternative',
      'privacy AI',
      'ChatGPT alternative',
    ],
    canonical: 'https://www.shadowtalk-ai.com/home',
  },
  pricing: {
    title: 'Free Access — ShadowTalk AI',
    description: 'ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage.',
    keywords: ['free AI workspace', 'BYOK AI', 'free ChatGPT alternative', 'no subscription AI'],
    canonical: 'https://www.shadowtalk-ai.com/pricing',
  },
  chatbot: {
    title: 'ShadowTalk AI — Try Chat Free',
    description:
      'ShadowTalk AI — founded by Zain Ahmed Fahad Patel (Karachi, Pakistan). Agentic workflows, built-in tools. BYOK — no platform fee',
    socialDescription: SITE_SOCIAL_DESCRIPTION,
    keywords: [
      'ShadowTalk',
      'Zain Ahmed Fahad Patel',
      'Zain Ahmed founder ShadowTalk',
      'agentic AI',
      'Karachi AI founder',
      'anonymous AI chat',
      'AI chatbot no login',
    ],
    canonical: 'https://www.shadowtalk-ai.com/chatbot',
  },
  privateAi: {
    title: 'Private AI Chat — No Login, No Tracking | ShadowTalk AI',
    description:
      'Free private AI chat that runs on your device. No signup, no phone number, no chat storage. A local-first ChatGPT alternative from ShadowTalk AI.',
    socialDescription: SITE_SOCIAL_DESCRIPTION,
    keywords: [
      'private AI chat',
      'no login AI chatbot',
      'anonymous AI chat',
      'ChatGPT alternative no signup',
      'local AI chatbot',
      'privacy AI',
      'ShadowTalk AI',
    ],
    canonical: 'https://www.shadowtalk-ai.com/private-ai',
  },
  agenticAIWorkspace: {
    title: 'Agentic AI Workspace — What It Is & How It Works',
    description:
      'Learn what an agentic AI workspace is: AI that plans, executes, and iterates on tasks using tools. Compare with traditional chatbots like ChatGPT, Claude, and Gemini.',
    keywords: [
      'agentic AI workspace',
      'what is agentic AI',
      'AI tools comparison',
      'ChatGPT vs Claude',
      'autonomous AI agents',
    ],
    canonical: 'https://www.shadowtalk-ai.com/agentic-ai-workspace',
  },
  docs: {
    title: 'Documentation',
    description: 'Learn how to use ShadowTalk AI effectively. Guides, tutorials, and API documentation.',
    keywords: ['documentation', 'guides', 'tutorials', 'API docs', 'ShadowTalk AI docs'],
    canonical: 'https://www.shadowtalk-ai.com/docs',
  },
  about: {
    title: 'Zain Ahmed Fahad Patel — Founder of ShadowTalk AI',
    description:
      'Meet Zain Ahmed Fahad Patel (Zain Ahmed), founder and lead architect of ShadowTalk AI. 17-year-old AI solutions engineer from Karachi, Pakistan building sovereign agentic AI.',
    keywords: [
      'Zain Ahmed Fahad Patel',
      'Zain Ahmed ShadowTalk',
      'Zain Ahmed founder',
      'ShadowTalk AI founder',
      'Karachi AI founder',
    ],
    canonical: 'https://www.shadowtalk-ai.com/about',
    ogType: 'profile',
    ogImage: FOUNDER_IMAGE_URL,
  },
  zainAhmed: {
    title: 'Zain Ahmed Fahad Patel — Founder of ShadowTalk AI',
    description:
      'Official profile: Zain Ahmed Fahad Patel, founder of ShadowTalk AI (shadowtalk-ai.com). AI solutions engineer, age 17, Karachi Pakistan. Also known as Zain Ahmed.',
    keywords: [
      'Zain Ahmed Fahad Patel',
      'Zain Ahmed Fahad Patel ShadowTalk',
      'Zain Ahmed Fahad Patel founder',
      `Zain Ahmed Fahad Patel ShadowTalk AI`,
      'Zain Ahmed founder',
      'ShadowTalk AI founder Karachi',
    ],
    canonical: 'https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel',
    ogType: 'profile',
    ogImage: FOUNDER_IMAGE_URL,
  },
  founder: {
    title: 'Zain Ahmed Fahad Patel — Founder & Lead Architect | ShadowTalk AI',
    description:
      'Official founder page of Zain Ahmed Fahad Patel (Zain Ahmed), founder & lead architect of ShadowTalk AI. 17-year-old AI solutions engineer from Karachi, Pakistan.',
    socialDescription:
      'Meet Zain Ahmed Fahad Patel, the 17-year-old founder of ShadowTalk AI from Karachi, Pakistan. Story, vision, GIAIC background, and direct contacts.',
    keywords: [
      'Zain Ahmed Fahad Patel',
      'Zain Ahmed ShadowTalk',
      'Zain Ahmed founder',
      'ShadowTalk AI founder',
      'Zain Ahmed AI builder Karachi',
      'Zain Ahmed Fahad Patel Pakistan',
      'Zain Ahmed GIAIC',
      'Zain Ahmed Sir Zia Khan',
      'ShadowTalk creator',
      'Zain Ahmed Fahad Patel LinkedIn',
      'Zain Ahmed Fahad Patel Instagram',
    ],
    canonical: 'https://www.shadowtalk-ai.com/founder',
    ogType: 'profile',
    ogImage: FOUNDER_IMAGE_URL,
  },
  fatima: {
    title: 'Fatima — Co-Founder & Systems Architect | ShadowTalk AI',
    description:
      'Official profile: Fatima, Co-Founder and Lead Systems Architect of ShadowTalk AI. Second developer building sovereign, local-first AI from Karachi, Pakistan.',
    socialDescription:
      'Meet Fatima, co-founder and second developer of ShadowTalk AI. Architecting 120fps UI, client-side memory, and sovereign pipelines in Karachi, Pakistan.',
    keywords: [
      'Fatima',
      'Fatima ShadowTalk',
      'Fatima co-founder',
      `Fatima developer ShadowTalk AI`,
      'ShadowTalk AI co-founder',
      'ShadowTalk second developer',
      'Karachi AI software architect',
      'shadowtalk@shadowtalk-ai.com',
    ],
    canonical: 'https://www.shadowtalk-ai.com/fatima',
    ogType: 'profile',
  },
  computer: {
    title: 'Computer Mode — In-Browser Shell',
    description:
      'ShadowTalk Computer Mode: real npm/node shell in your browser via WebContainer. Run code, install packages, and pair with agentic workflows.',
    keywords: ['computer use', 'code sandbox', 'WebContainer', 'AI agent shell', 'browser terminal'],
    canonical: 'https://www.shadowtalk-ai.com/computer',
  },
  facts: {
    title: 'AI Facts — Canonical Product Information',
    description:
      'Canonical facts about ShadowTalk AI for search engines and AI assistants: features, pricing, founder Zain Ahmed, and machine-readable sources.',
    keywords: ['ShadowTalk facts', 'AI product info', 'llms.txt', 'agentic AI workspace'],
    canonical: 'https://www.shadowtalk-ai.com/facts',
  },
  answers: {
    title: 'ShadowTalk Answers — SEO & AEO Knowledge Base',
    description:
      'Canonical Q&A for ShadowTalk AI: product, founder Zain Ahmed Fahad Patel, pricing, privacy, comparisons, and Answer Engine Optimization for Google AI Overviews.',
    keywords: ['AEO', 'Google AI Overviews', 'ShadowTalk FAQ', 'SEO', 'Zain Ahmed Fahad Patel'],
    canonical: 'https://www.shadowtalk-ai.com/answers',
    ogType: 'article',
  },
  googleSeo: {
    title: 'Google SEO & AEO Index — ShadowTalk AI',
    description:
      'ShadowTalk AI pages optimized for Google Search and AI Overviews: founder Zain Ahmed Fahad Patel, topic guides, FAQ schema, and comparison pages.',
    keywords: ['Google SEO', 'AEO', 'ShadowTalk', 'Zain Ahmed Fahad Patel', 'agentic AI'],
    canonical: 'https://www.shadowtalk-ai.com/google-seo',
  },
  contact: {
    title: 'Contact Us',
    description: 'Get in touch with the ShadowTalk AI team. We are here to help with questions, feedback, and support.',
    keywords: ['contact', 'support', 'help', 'feedback'],
    canonical: 'https://www.shadowtalk-ai.com/contact',
  },
  help: {
    title: 'Help Center & Documentation — ShadowTalk AI',
    description: 'Find guides, troubleshooting steps, and documentation for ShadowTalk AI features, tools, and subscriptions.',
    keywords: ['help center', 'documentation', 'support', 'guides', 'troubleshooting'],
    canonical: 'https://www.shadowtalk-ai.com/help',
  },
  faq: {
    title: 'Frequently Asked Questions (FAQ) — ShadowTalk AI',
    description: 'Answers to frequently asked questions about ShadowTalk AI: autonomous missions, multi-model execution, pricing, and security.',
    keywords: ['FAQ', 'frequently asked questions', 'ShadowTalk questions', 'pricing FAQ', 'AI assistant FAQ'],
    canonical: 'https://www.shadowtalk-ai.com/faq',
  },
  blog: {
    title: 'ShadowTalk AI Engineering & Product Blog',
    description: 'Insights, product deep-dives, benchmarks, and architecture guides from the ShadowTalk AI engineering team.',
    keywords: ['AI blog', 'agentic AI', 'machine learning', 'tech blog', 'product updates'],
    canonical: 'https://www.shadowtalk-ai.com/blog',
  },
  caseStudies: {
    title: 'Case Studies & Success Stories — ShadowTalk AI',
    description: 'Discover how developers, startups, and enterprises accelerate operations with ShadowTalk agentic workflows.',
    keywords: ['case studies', 'AI success stories', 'ROI', 'agentic workflow proof'],
    canonical: 'https://www.shadowtalk-ai.com/case-studies',
  },
  status: {
    title: 'System Status & Operational Health — ShadowTalk AI',
    description: 'Live real-time operational status, latency metrics, and incident history for all ShadowTalk AI services. OmniRoute, Firebase Auth, OpenRouter, Gemini, Firestore.',
    keywords: ['system status', 'uptime', 'operational health', 'API status', 'latency', 'OmniRoute'],
    canonical: 'https://www.shadowtalk-ai.com/status',
  },
  changelog: {
    title: 'Product Changelog & Release Notes — ShadowTalk AI',
    description: 'Track every ShadowTalk AI update: OmniRoute gateway integration, PWA offline support, i18n locales, BYOK system, and security hardening. Versioned release notes with feature/improvement/bugfix tags.',
    keywords: ['changelog', 'release notes', 'product updates', 'version history', 'what\'s new'],
    canonical: 'https://www.shadowtalk-ai.com/changelog',
  },
  gdpr: {
    title: 'GDPR Compliance & Data Rights — ShadowTalk AI',
    description: 'Learn how ShadowTalk AI complies with GDPR requirements and exercise your data protection rights.',
    keywords: ['GDPR', 'data protection', 'data rights', 'compliance', 'privacy regulations'],
    canonical: 'https://www.shadowtalk-ai.com/gdpr',
  },
  cookies: {
    title: 'Cookie & Storage Policy — ShadowTalk AI',
    description: 'Understand how ShadowTalk AI uses cookies, local storage, and IndexedDB to deliver the agentic workspace.',
    keywords: ['cookie policy', 'local storage', 'IndexedDB', 'cookies', 'tracking policy'],
    canonical: 'https://www.shadowtalk-ai.com/cookies',
  },
  privacy: {
    title: 'Privacy Policy — ShadowTalk AI',
    description: 'Read our privacy policy to understand how ShadowTalk AI processes, secures, and handles your data with zero model training.',
    keywords: ['privacy policy', 'data protection', 'GDPR', 'zero model training', 'client-side encryption', 'data security'],
    canonical: 'https://www.shadowtalk-ai.com/privacy',
  },
  terms: {
    title: 'Terms of Service — ShadowTalk AI',
    description: 'Read our terms of service governing usage of the ShadowTalk AI agentic workspace, output ownership, and refund policy.',
    keywords: ['terms of service', 'terms and conditions', 'legal', 'user ownership', 'acceptable use', 'refund policy'],
    canonical: 'https://www.shadowtalk-ai.com/terms',
  },
  research: {
    title: 'Shadow Research — Deep Research & Knowledge Hub',
    description:
      'Multi-source deep research, knowledge graph, and AI browser in one ShadowTalk workspace — citations, live web, and insert-to-chat.',
    keywords: ['deep research AI', 'knowledge graph', 'AI browser', 'ShadowTalk research'],
    canonical: 'https://www.shadowtalk-ai.com/research',
  },
  security: {
    title: 'Security Hub — Vault, Audit & Cyber Command',
    description: 'ShadowTalk Security Hub: encrypted vault, privacy audit, ShadowSpectre cyber copilot, and compliance tools in one place.',
    keywords: ['AI security', 'encrypted vault', 'ShadowSpectre', 'cybersecurity AI'],
    canonical: 'https://www.shadowtalk-ai.com/security',
  },
  downloads: {
    title: 'Shadow Video Studio — Viral Short Generator',
    description: 'Pro & Elite: generate 60s vertical promo videos in your browser. No API keys — bundled voiceover and on-device MP4 export.',
    keywords: ['video generator', 'viral short', 'TikTok video', 'ShadowTalk promo', 'no API key'],
    canonical: 'https://www.shadowtalk-ai.com/video-studio',
  },
  developers: {
    title: 'Developer Tools & API',
    description: 'Build with ShadowTalk AI. API documentation, SDKs, webhooks, and developer resources.',
    keywords: ['developer tools', 'API', 'SDK', 'developer resources'],
    canonical: 'https://www.shadowtalk-ai.com/developers',
  },
  api: {
    title: 'API Management',
    description: 'Manage your ShadowTalk AI API keys, monitor usage, and access integration documentation.',
    keywords: ['API keys', 'API management', 'integration', 'developer'],
    canonical: 'https://www.shadowtalk-ai.com/api',
  },
  careers: {
    title: 'Careers',
    description: 'Join the ShadowTalk AI team. View open positions and help build the future of AI.',
    keywords: ['careers', 'jobs', 'hiring', 'AI jobs', 'Karachi AI jobs'],
    canonical: 'https://www.shadowtalk-ai.com/careers',
  },
  billing: {
    title: 'Billing — Everything Is Free',
    description: 'ShadowTalk AI is free to use. No subscriptions, no invoices, no payment methods. Provider API usage is billed by your provider, not by ShadowTalk.',
    keywords: ['billing', 'free', 'BYOK', 'no subscription'],
    canonical: 'https://www.shadowtalk-ai.com/billing',
  },
  enterprise: {
    title: 'Enterprise Settings',
    description: 'Configure enterprise SSO, security policies, and workspace management for your organization.',
    keywords: ['enterprise', 'SSO', 'security', 'workspace management'],
    canonical: 'https://www.shadowtalk-ai.com/enterprise',
  },
  privacyScore: {
    title: 'Privacy Score',
    description: 'Check your privacy score and get recommendations to improve your digital security posture.',
    keywords: ['privacy score', 'security', 'data protection', 'privacy audit'],
    canonical: 'https://www.shadowtalk-ai.com/privacy-score',
  },
  founderAccess: {
    title: 'Free Access — Former Checkout Page',
    description: 'ShadowTalk AI is free to use. There is nothing to buy: no plans, no payment methods, no regional checkout. Bring your own AI provider API key.',
    keywords: ['free access', 'BYOK', 'no checkout'],
    canonical: 'https://www.shadowtalk-ai.com/founder-access',
  },
  referral: {
    title: 'Referral Program — Share ShadowTalk Free',
    description: 'Share ShadowTalk AI with friends — it is free to use, no subscription required. Launch a tracked share link from your dashboard.',
    keywords: ['ShadowTalk referral', 'affiliate program', '20% commission', '40% commission', 'earn recurring commission'],
    canonical: 'https://www.shadowtalk-ai.com/referral',
  },
  partnerships: {
    title: 'Partnerships & Integrations — ShadowTalk AI',
    description: 'Integrate ShadowTalk with Notion, Slack, Discord, and complementary tools. Co-marketing and integration partnerships.',
    keywords: ['ShadowTalk integrations', 'AI partnerships', 'enterprise AI', 'Slack AI'],
    canonical: 'https://www.shadowtalk-ai.com/partnerships',
  },
  aiStrategyConsultant: {
    title: 'AI Strategy Consultant — CEO Playbooks | ShadowTalk',
    description: 'Free AI strategy consultant: CEO playbooks, marketing plans, competitive analysis. Agentic workflows execute multi-step strategy.',
    keywords: ['AI strategy consultant', 'best AI for business strategy', 'CEO playbook AI', 'AI business workflows'],
    canonical: 'https://www.shadowtalk-ai.com/ai-strategy-consultant',
  },
};