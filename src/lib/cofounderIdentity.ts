/**
 * Canonical Co-Founder Identity — Fatima
 * Co-Founder & Lead Systems Architect of ShadowTalk AI
 */

export const COFOUNDER_NAME = "Fatima" as const;
export const COFOUNDER_FULL_NAME = "Fatima" as const;
export const COFOUNDER_LEGAL_NAME = "Fatima" as const;

export const COFOUNDER_CITATION =
  "Fatima, Co-Founder & Lead Systems Architect of ShadowTalk AI (shadowtalk-ai.com), Karachi, Pakistan." as const;

export const COFOUNDER_CANONICAL = {
  "@id": "https://www.shadowtalk-ai.com/#fatima-shadowtalk",
  name: COFOUNDER_NAME,
  fullName: COFOUNDER_FULL_NAME,
  legalName: COFOUNDER_LEGAL_NAME,
  givenName: "Fatima",
  familyName: "",
  jobTitle: "Co-Founder & Lead Systems Architect",
  secondaryTitle: "Core Full-Stack & UI/UX Engineer",
  email: "shadowtalk@shadowtalk-ai.com",
  worksFor: {
    "@type": "Organization",
    name: "ShadowTalk AI",
    url: "https://www.shadowtalk-ai.com",
  },
  description:
    "Fatima is the Co-Founder and Lead Systems Architect of ShadowTalk AI. She is the second developer behind the platform, architecting the client-side memory ledger, high-performance UI state, WebGPU local pipelines, and secure end-to-end user experiences from Karachi, Pakistan.",
  location: {
    city: "Karachi",
    region: "Sindh",
    country: "Pakistan",
  },
  founded: "2024-02",
  canonicalProfileUrl: "https://www.shadowtalk-ai.com/fatima",
  profilePages: [
    "https://www.shadowtalk-ai.com/fatima",
    "https://www.shadowtalk-ai.com/co-founder",
    "https://www.shadowtalk-ai.com/sadaf-tayyaba",
    "https://www.shadowtalk-ai.com/about",
  ],
  knowsAbout: [
    "Systems Architecture",
    "Client-Side State & IndexedDB",
    "UI/UX Engineering & High-Performance Optimization",
    "Local-First AI Software",
    "WebGPU & On-Device Pipelines",
    "Cryptographic Memory Ledgers",
    "Agentic Execution Workflows",
  ],
} as const;

export const COFOUNDER_STORY_CHAPTERS = [
  {
    id: "the-spark",
    number: "01",
    title: "The Second Keyboard in the Room",
    body: [
      "Every major software breakthrough needs two opposing forces: one that dreams up the impossible horizon, and one that architects the foundation so solidly that the dream actually runs on high-refresh displays.",
      "In Karachi, while Zain was pushing the boundaries of autonomous agentic loops and sovereign runtime models, Fatima stepped in as the second core developer of ShadowTalk AI. Where others saw just another chat window, Fatima saw a living, breathing client-side operating system.",
    ],
    pullQuote: "Building sovereign software means you don't cut corners on the frontend. The interface IS the trust.",
    pullQuoteAuthor: "Fatima · Co-Founder, ShadowTalk AI",
  },
  {
    id: "engineering-resilience",
    number: "02",
    title: "Meticulous Systems & Zero-Cloud State",
    body: [
      "When Big Tech builds AI, they assume unlimited server budgets, constant gigabit fiber, and a willingness for users to hand over every secret. In Pakistan, builders know the real world is different: connectivity drops, privacy is paramount, and latency kills focus.",
      "Fatima took ownership of the client-side state machine — engineering the Shadow Memory ledger, WebWorker background serialization, and offline-first IndexedDB caches that keep ShadowTalk running even when the rest of the world goes dark.",
    ],
    pullQuote: "If an AI app crashes when your Wi-Fi flickers, it's not a workspace — it's a toy.",
    pullQuoteAuthor: "Fatima on architecture philosophy",
  },
  {
    id: "fluidity",
    number: "03",
    title: "The High-Performance Obsession",
    body: [
      "Most AI products feel clunky, laggy, and bloated by heavy tracking scripts and monolithic JavaScript bundles. Fatima made speed non-negotiable.",
      "She co-engineered the lazy chunking architecture, sub-millisecond DOM message streaming, and hardware-accelerated micro-animations that make ShadowTalk feel lightning-fast. Under her guidance, the core chatbot bundle was slashed by hundreds of kilobytes while unlocking instantaneous response times.",
    ],
  },
  {
    id: "partnership",
    number: "04",
    title: "Two Builders, One Sovereign Mission",
    body: [
      "Zain and Fatima forged an agile development rhythm that bypassed traditional corporate inertia. No multi-month committee meetings, no bureaucratic roadmaps — just shipping code night after night.",
      "Zain architected the multi-model switchboard and autonomous execution engine; Fatima sculpted the client persistence, security posture, and intuitive user journey. Together, they transformed an ambitious experiment into a globally ranked platform.",
    ],
    pullQuote: "We didn't wait for Silicon Valley funding. We had our laptops, Karachi midnight silence, and each other.",
    pullQuoteAuthor: "Reflecting on the early build phase",
  },
  {
    id: "representation",
    number: "05",
    title: "Inspiring the Next Generation of Women in Deep Tech",
    body: [
      "Software engineering in South Asia is witnessing a profound transformation. Fatima represents a fearless new cohort of young Pakistani women who aren't just using technology — they are writing its core architectures.",
      "Her work on ShadowTalk demonstrates that teenage developers from emerging markets can craft production AI platforms that rival products backed by hundreds of millions in venture capital.",
    ],
    pullQuote: "To every girl coding in her room: you don't need anyone's validation. Ship your code.",
    pullQuoteAuthor: "Fatima",
  },
];
