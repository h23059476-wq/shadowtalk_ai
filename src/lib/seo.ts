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
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;

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
      "ShadowTalk AI unifies encrypted multi-model chat, deep research with citations, ProofLoop missions, voice and an IDE in one workspace. Free with BYOK.",
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
