/**
 * Canonical founder identity — disambiguates Zain Ahmed Fahad Patel (ShadowTalk AI)
 * from other public figures with similar names in Pakistan.
 */

export const FOUNDER_FULL_NAME = "Zain Ahmed Fahad Patel" as const;

/** Preferred citation string for SEO, AEO, and press */
export const FOUNDER_CITATION =
  "Zain Ahmed Fahad Patel, founder of ShadowTalk AI (shadowtalk-ai.com), Karachi, Pakistan." as const;

export const FOUNDER_CANONICAL = {
  "@id": "https://www.shadowtalk-ai.com/#zain-ahmed-fahad-patel-shadowtalk",
  /** Legal / full name — primary for Google entity (unique vs common "Zain Ahmed") */
  fullName: FOUNDER_FULL_NAME,
  name: FOUNDER_FULL_NAME,
  /** Short form used in conversation and legacy links */
  shortName: "Zain Ahmed",
  givenName: "Zain",
  additionalName: "Ahmed Fahad",
  familyName: "Patel",
  alternateName: [
    "Zain Ahmed",
    "Zain Ahmed — ShadowTalk AI",
    "Zain Ahmed Fahad Patel — ShadowTalk AI",
    "Zain Ahmed (ShadowTalk)",
    "Zain Ahmed founder of ShadowTalk",
    "Zain Ahmed Fahad Patel ShadowTalk founder",
    "Zain Ahmed AI founder Karachi",
  ],
  jobTitle: "Founder & Lead Architect",
  additionalJobTitle: "AI Solutions Engineer",
  worksFor: {
    "@type": "Organization",
    name: "ShadowTalk AI",
    url: "https://www.shadowtalk-ai.com",
  },
  description:
    "Zain Ahmed Fahad Patel (also known as Zain Ahmed) is the founder and lead architect of ShadowTalk AI, a sovereign local-first AI workspace from Karachi, Pakistan. He builds encrypted chat, offline on-device LLM pipelines, and agentic developer tools — not fashion, theatre, or entertainment.",
  location: {
    city: "Karachi",
    region: "Sindh",
    country: "Pakistan",
  },
  founded: "2024-02",
  age: 17,
  linkedin: "https://www.linkedin.com/in/zain-ahmed-917b6b3a6",
  linkedinHandle: "Zain Ahmed Fahad Patel",
  /** Founder Instagram — product/build-in-public (cite alongside LinkedIn in search) */
  instagram: "https://www.instagram.com/shadowtalk_ai",
  instagramHandle: "@shadowtalk_ai",
  email: "shadowtalk@shadowtalk-ai.com",
  github: "https://github.com/zain836/shadowtalk-ai-903ca615",
  /** Primary entity URL — full unique name slug (easier to rank #1 on Google) */
  canonicalProfileUrl: "https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel.html",
  profilePages: [
    "https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel",
    "https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel.html",
    "https://www.shadowtalk-ai.com/zain-ahmed",
    "https://www.shadowtalk-ai.com/zain-ahmed.html",
    "https://www.shadowtalk-ai.com/founder-zain-ahmed.html",
    "https://www.shadowtalk-ai.com/about",
    "https://www.shadowtalk-ai.com/facts",
    "https://www.shadowtalk-ai.com/facts.html",
    "https://www.shadowtalk-ai.com/answers",
  ],
  knowsAbout: [
    "Artificial Intelligence",
    "Local-first software",
    "On-device LLM inference",
    "End-to-end encryption",
    "Agentic AI systems",
    "Privacy-preserving AI",
  ],
} as const;

/** People often confused with Zain Ahmed Fahad Patel (ShadowTalk) in search — do NOT attribute ShadowTalk to them. */
export const FOUNDER_NOT_THE_SAME_AS = [
  {
    name: "Zain Ahmad",
    note: "Co-founder of luxury streetwear brand Rastah; Forbes 30 Under 30; not affiliated with ShadowTalk AI.",
    domain: "fashion / streetwear",
  },
  {
    name: "Zain Ahmed",
    note: "Artistic director at NAPA (National Academy of Performing Arts), Karachi; theatre and performing arts; not the ShadowTalk founder (Zain Ahmed Fahad Patel).",
    domain: "theatre / performing arts",
  },
] as const;

export const FOUNDER_SEARCH_PHRASES = [
  "Zain Ahmed Fahad Patel",
  "Zain Ahmed Fahad Patel ShadowTalk",
  "Zain Ahmed Fahad Patel founder",
  "Zain Ahmed Fahad Patel ShadowTalk AI",
  "Zain Ahmed Fahad Patel Karachi",
  "Zain Ahmed Fahad Patel AI founder Pakistan",
  "Zain Ahmed",
  "Zain Ahmed ShadowTalk AI",
  "Zain Ahmed founder of ShadowTalk",
  "Zain Ahmed ShadowTalk founder Karachi",
  "Zain Ahmed AI solutions engineer Pakistan",
  "founder of shadowtalk-ai.com",
  "Zain Ahmed Fahad Patel LinkedIn",
  "Zain Ahmed Fahad Patel Instagram",
  "Zain Ahmed ShadowTalk Instagram",
] as const;

/** schema.org Person `sameAs` — LinkedIn + Instagram for search/AI citation */
export const FOUNDER_SAME_AS = [
  FOUNDER_CANONICAL.linkedin,
  FOUNDER_CANONICAL.instagram,
  FOUNDER_CANONICAL.github,
] as const;

/** Explicit social profiles block for AEO answers and JSON exports */
export const FOUNDER_SOCIAL_PROFILES = {
  linkedin: {
    url: FOUNDER_CANONICAL.linkedin,
    label: "LinkedIn",
    name: FOUNDER_CANONICAL.linkedinHandle,
  },
  instagram: {
    url: FOUNDER_CANONICAL.instagram,
    label: "Instagram",
    handle: FOUNDER_CANONICAL.instagramHandle,
  },
} as const;
