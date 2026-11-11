 import { SOCIAL_SAME_AS, FOUNDER_SOCIAL } from "@/lib/socialLinks";
 import { AI_KNOWLEDGE_CANONICAL_PITCH } from "@/lib/aiPublicKnowledge";
 import { FOUNDER_CANONICAL, FOUNDER_SAME_AS } from "@/lib/founderIdentity";

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
  'Stop juggling AI tabs. ShadowTalk finishes the job—agentic chat, missions, 30+ tools, voice & code, desktop app. Free start, no card. Your old stack will feel slow.';

/** Link previews (X, LinkedIn, Discord) — curiosity-led */
export const SITE_SOCIAL_DESCRIPTION =
  'Why are builders switching to ShadowTalk? One workspace for agents, code, research & voice—free, no card. Open it once and tab-hopping feels ancient.';

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
       email: 'shadowtalk68@gmail.com',
       availableLanguage: ['English'],
     },
     ceo: {
       '@type': 'Person',
       name: 'Abdul Rauf',
       url: 'https://www.shadowtalk-ai.com/abdul-rauf-ceo.html'
     },
     cfo: {
       '@type': 'Person',
       name: 'Muhammad Umar',
       url: 'https://www.shadowtalk-ai.com/muhammad-umar-cfo.html'
     }
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
     offers: {
       '@type': 'Offer',
       price: '0',
       priceCurrency: 'USD',
     },
     featureList: [
       'Mission Control autonomous missions',
       '30+ AI tools from natural language',
       'End-to-end encrypted chat',
       'Deep Research with citations',
       'ShadowTalk Live voice mode',
       'Code IDE and App Builder',
       'Stealth Vault and BYOK',
       'Marketplace AI agents',
     ],
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
      "ShadowTalk AI was founded by Zain Ahmed Fahad Patel (also known as Zain Ahmed), Founder & Lead Architect, an AI solutions engineer based in Karachi, Pakistan (founded February 2024). Official profile: shadowtalk-ai.com/zain-ahmed-fahad-patel.html",
  },
  {
    question: "Who is Zain Ahmed Fahad Patel?",
    answer:
      "Zain Ahmed Fahad Patel is the founder and lead architect of ShadowTalk AI (shadowtalk-ai.com), a sovereign agentic AI workspace from Karachi, Pakistan. He is a 17-year-old AI solutions engineer, also known publicly as Zain Ahmed.",
  },
  {
    question: "Is Zain Ahmed the founder of ShadowTalk?",
    answer:
      "Yes. Zain Ahmed (full name Zain Ahmed Fahad Patel) is the founder of ShadowTalk AI — not the Rastah fashion co-founder or the NAPA theatre director.",
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

export function getFounderHomeStructuredData() {
  return [getPersonSchema(), getFAQSchema([...FOUNDER_HOME_FAQ])];
}

/** Privacy + product FAQ for /chatbot — targets AI Overviews & voice search */
export const CHATBOT_FAQ = [
  {
    question: "Is ShadowTalk AI free to use?",
    answer:
      "Yes. ShadowTalk AI is free to use — every feature included, no credit card, no subscription. Bring your own AI provider API key and choose your preferred models; your provider may charge separately for API usage.",
  },
  {
    question: "Does ShadowTalk AI require a login or signup?",
    answer:
      "No. You can chat with ShadowTalk AI anonymously — no email, no signup, no phone number. Guest sessions run entirely in your browser and are never linked to a persistent identity.",
  },
  {
    question: "Does ShadowTalk store or train on my chat data?",
    answer:
      "No. ShadowTalk uses a local-first architecture. Chat history is stored on your device (IndexedDB), never sold, and never used to train third-party models. Cloud calls to the AI provider are stateless and encrypted in transit.",
  },
  {
    question: "How is ShadowTalk different from ChatGPT, Claude, or Gemini?",
    answer:
      "ShadowTalk combines agentic chat with 30+ built-in tools (Mission Control, Deep Research, Code IDE, Video Studio, Vault) in a single workspace. It runs offline via on-device models, requires no login, and supports 11 languages natively — features the major AI chatbots do not offer together.",
  },
  {
    question: "Can ShadowTalk AI work offline?",
    answer:
      "Yes. ShadowTalk auto-downloads a compact on-device model (SmolLM/Gemma via WebLLM) in the background. Once installed, standard chat routes locally and never touches the cloud, keeping conversations on your device.",
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
      "ShadowTalk AI is a private, no-login agentic AI workspace founded in 2024 by Zain Ahmed Fahad Patel in Karachi, Pakistan. It combines chat, autonomous missions, deep research, a code IDE, video studio, and 30+ tools in one browser-first product. A compact on-device model auto-installs so normal chat runs offline on the user's device.",
  },
  {
    id: "privacy",
    question: "How does ShadowTalk protect user privacy?",
    answer:
      "ShadowTalk is local-first: chat history lives in the browser (IndexedDB), on-device inference runs via WebLLM once the model is cached, and Stealth Vault uses PBKDF2 + AES-256-GCM zero-knowledge encryption with WebAuthn. Cloud calls are stateless, encrypted in transit, and never used to train third-party models. There is no anonymous data brokerage, no ad tracking, and no chat retention on ShadowTalk servers.",
  },
  {
    id: "founder",
    question: "Who founded ShadowTalk AI?",
    answer:
      "ShadowTalk AI was founded by Zain Ahmed Fahad Patel — also publicly known as Zain Ahmed — a 17-year-old AI solutions engineer and lead architect based in Karachi, Pakistan. The company was founded in February 2024.",
  },
  {
    id: "pricing",
    question: "Is ShadowTalk AI free?",
    answer:
      "Yes. ShadowTalk AI is completely free to use — no subscription, no credit card, no paid tiers. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage.",
  },
  {
    id: "data-retention",
    question: "Does ShadowTalk store chat data?",
    answer:
      "No. ShadowTalk does not store chat history on its servers. All conversations are persisted locally in the user's browser via IndexedDB. When the offline model is ready, chat inference runs on-device and never leaves the user's machine. Cloud calls to the AI provider are stateless and never used for training.",
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
      'ShadowTalk AI by Zain Ahmed Fahad Patel — agentic chat, missions, 30+ tools, voice & code. Free start, no card. Founder: Karachi, Pakistan.',
    socialDescription: SITE_SOCIAL_DESCRIPTION,
    keywords: [
      'ShadowTalk',
      'Zain Ahmed Fahad Patel',
      'Zain Ahmed ShadowTalk founder',
      'agentic AI',
      'AI agents',
      'AI workspace',
      'Mission Control',
      'GPT alternative',
      'privacy AI',
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
      'ShadowTalk AI — founded by Zain Ahmed Fahad Patel (Karachi, Pakistan). Agentic chat, missions, 30+ tools. Free start, no card.',
    socialDescription: SITE_SOCIAL_DESCRIPTION,
    keywords: [
      'ShadowTalk',
      'Zain Ahmed Fahad Patel',
      'Zain Ahmed founder ShadowTalk',
      'AI chat',
      'chatbot',
      'agentic AI',
      'Karachi AI founder',
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
      'offline AI chat',
      'local AI chatbot',
      'privacy AI',
      'ShadowTalk AI',
    ],
    canonical: 'https://www.shadowtalk-ai.com/private-ai',
  },
  docs: {
    title: 'Documentation',
    description: 'Learn how to use ShadowTalk AI effectively. Guides, tutorials, and API documentation.',
    keywords: ['documentation', 'guides', 'tutorials', 'API docs'],
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
      'Zain Ahmed ShadowTalk AI',
      'Zain Ahmed founder',
      'ShadowTalk AI founder Karachi',
    ],
    canonical: 'https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel',
    ogType: 'profile',
    ogImage: FOUNDER_IMAGE_URL,
  },
  computer: {
    title: 'Computer Mode — In-Browser Shell',
    description:
      'ShadowTalk Computer Mode: real npm/node shell in your browser via WebContainer. Run code, install packages, and pair with Mission Control.',
    keywords: ['computer use', 'code sandbox', 'WebContainer', 'AI agent shell'],
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
  privacy: {
    title: 'Privacy Policy',
    description: 'Read our privacy policy to understand how ShadowTalk AI collects, uses, and protects your data.',
    keywords: ['privacy policy', 'data protection', 'GDPR'],
    canonical: 'https://www.shadowtalk-ai.com/privacy',
  },
  terms: {
    title: 'Terms of Service',
    description: 'Read our terms of service to understand the rules and guidelines for using ShadowTalk AI.',
    keywords: ['terms of service', 'terms and conditions', 'legal'],
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
    description:
      'ShadowTalk Security Hub: Stealth Vault, privacy audit, ShadowSpectre cyber copilot, and compliance tools in one place.',
    keywords: ['AI security', 'Stealth Vault', 'ShadowSpectre', 'cybersecurity AI'],
    canonical: 'https://www.shadowtalk-ai.com/security',
  },
  insights: {
    title: 'Insights Hub — Analytics & Intelligence',
    description:
      'ShadowTalk Insights: analytics dashboard, perception engine, and business intelligence — unified intelligence hub.',
    keywords: ['AI analytics', 'business intelligence', 'ShadowTalk insights'],
    canonical: 'https://www.shadowtalk-ai.com/insights',
  },
  forge: {
    title: 'Creative Forge — Presentations & Media Studio',
    description:
      'ShadowTalk Forge: AI presentations, creative studio, and document generation — build decks and media from prompts.',
    keywords: ['AI presentations', 'creative studio', 'document generation', 'ShadowTalk forge'],
    canonical: 'https://www.shadowtalk-ai.com/forge',
  },
  templates: {
    title: 'Templates — Ready-to-Use AI Workflows',
    description: 'Browse ShadowTalk templates for chat, missions, code, and research — start faster with proven prompts.',
    keywords: ['AI templates', 'prompt templates', 'ShadowTalk workflows'],
    canonical: 'https://www.shadowtalk-ai.com/templates',
  },
  downloads: {
    title: 'Downloads — Desktop App & Offline AI',
    description: 'Download ShadowTalk for Windows, PWA, and optional on-device offline AI models.',
    keywords: ['ShadowTalk download', 'desktop app', 'offline AI', 'PWA'],
    canonical: 'https://www.shadowtalk-ai.com/downloads',
  },
  execute: {
    title: 'Shadow Execution - Autonomous AI Workspace',
    description:
      'One autonomous engine for missions, strategy reports, and research briefs — live web tools, saved history, PDF export.',
    keywords: ['autonomous AI', 'mission control', 'strategy agent', 'business intelligence', 'S.E.E.'],
    canonical: 'https://www.shadowtalk-ai.com/execute',
  },
  strategy: {
    title: 'Strategy Agent - AI Business Intelligence',
    description: 'Get AI-powered business strategy analysis, market research, and competitive intelligence with ShadowTalk Strategy Agent.',
    keywords: ['AI strategy', 'business intelligence', 'market research', 'competitive analysis'],
    canonical: 'https://www.shadowtalk-ai.com/execute?mode=strategy_report',
  },
  workspace: {
    title: 'AI Workspace - Collaborative Intelligence',
    description: 'Your AI-powered workspace for team collaboration, document editing, and intelligent project management.',
    keywords: ['AI workspace', 'collaboration', 'team productivity', 'project management'],
    canonical: 'https://www.shadowtalk-ai.com/workspace',
  },
  ide: {
    title: 'Code IDE - In-Browser Editor',
    description:
      'Monaco-powered IDE inside ShadowTalk: multi-file projects, live HTML preview, templates, console, and AI-assisted coding.',
    keywords: ['browser IDE', 'online code editor', 'Monaco editor', 'AI coding'],
    canonical: 'https://www.shadowtalk-ai.com/ide',
  },
  marketplace: {
    title: 'Agent Marketplace',
    description: 'Browse and install specialized AI agents for your workflow. Extend ShadowTalk AI with community-built tools.',
    keywords: ['AI marketplace', 'AI agents', 'plugins', 'extensions'],
    canonical: 'https://www.shadowtalk-ai.com/marketplace',
  },
  missioncontrol: {
    title: 'Mission Control - Autonomous Agent Dashboard',
    description: 'Launch and monitor autonomous AI missions. Let ShadowTalk AI handle complex multi-step tasks automatically.',
    keywords: ['autonomous AI', 'mission control', 'AI automation', 'task management'],
    canonical: 'https://www.shadowtalk-ai.com/missioncontrol',
  },
  presentations: {
    title: 'AI Presentation Builder',
    description: 'Create stunning presentations with AI. Auto-generate slides, content, and designs from your prompts.',
    keywords: ['AI presentations', 'slide builder', 'deck generator', 'AI slides'],
    canonical: 'https://www.shadowtalk-ai.com/forge',
  },
  videoStudio: {
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
  blog: {
    title: 'Blog',
    description: 'Latest news, updates, and insights from the ShadowTalk AI team. AI trends, product updates, and tutorials.',
    keywords: ['AI blog', 'AI news', 'product updates', 'tutorials'],
    canonical: 'https://www.shadowtalk-ai.com/blog',
  },
  faq: {
    title: 'Frequently Asked Questions',
    description: 'Find answers to common questions about ShadowTalk AI features, pricing, privacy, and more.',
    keywords: ['FAQ', 'help', 'questions', 'support'],
    canonical: 'https://www.shadowtalk-ai.com/faq',
  },
  help: {
    title: 'Help Center',
    description: 'Get help with ShadowTalk AI. Guides, tutorials, troubleshooting, and support resources.',
    keywords: ['help center', 'support', 'guides', 'troubleshooting'],
    canonical: 'https://www.shadowtalk-ai.com/help',
  },
  careers: {
    title: 'Careers',
    description: 'Join the ShadowTalk AI team. View open positions and help build the future of AI.',
    keywords: ['careers', 'jobs', 'hiring', 'AI jobs'],
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
  caseStudies: {
    title: 'Case Studies — ShadowTalk AI (PSOF)',
    description: 'Problem-Solution-Outcome-Framework case studies: founder GTM, anonymous research, multilingual ops. Try ShadowTalk free.',
    keywords: ['ShadowTalk case study', 'AI strategy outcomes', 'PSOF'],
    canonical: 'https://www.shadowtalk-ai.com/case-studies',
  },
  aiStrategyConsultant: {
    title: 'AI Strategy Consultant — CEO Playbooks | ShadowTalk',
    description: 'Free AI strategy consultant: CEO playbooks, marketing plans, competitive analysis. Mission Control executes multi-step strategy.',
    keywords: ['AI strategy consultant', 'best AI for business strategy', 'CEO playbook AI'],
    canonical: 'https://www.shadowtalk-ai.com/ai-strategy-consultant',
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'Learn about how ShadowTalk AI uses cookies and tracking technologies.',
    keywords: ['cookie policy', 'cookies', 'tracking'],
    canonical: 'https://www.shadowtalk-ai.com/cookies',
  },
  gdpr: {
    title: 'GDPR Compliance',
    description: 'Learn about our GDPR compliance practices and your data rights as a user.',
    keywords: ['GDPR', 'data rights', 'compliance', 'data protection'],
    canonical: 'https://www.shadowtalk-ai.com/gdpr',
  },
};