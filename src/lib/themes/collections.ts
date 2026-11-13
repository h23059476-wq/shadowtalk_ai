/**
 * ShadowTalk AI — Appearance Studio theme collections.
 */

export type ThemeCollectionId =
  | "dark-futuristic"
  | "minimal-professional"
  | "nature-atmospheric"
  | "light-elegant"
  | "warm-creative"
  | "high-contrast";

export interface ThemeCollection {
  id: ThemeCollectionId;
  label: string;
  shortLabel: string;
  description: string;
  /** Expected number of curated themes — asserted by tests. */
  expectedCount: number;
}

export const THEME_COLLECTIONS: ThemeCollection[] = [
  {
    id: "dark-futuristic",
    label: "Dark and Futuristic",
    shortLabel: "Futuristic",
    description: "Deep-space surfaces with luminous, high-energy accents for late-night building.",
    expectedCount: 25,
  },
  {
    id: "minimal-professional",
    label: "Minimal and Professional",
    shortLabel: "Minimal",
    description: "Quiet neutrals and restrained accents tuned for focused, all-day work.",
    expectedCount: 20,
  },
  {
    id: "nature-atmospheric",
    label: "Nature and Atmospheric",
    shortLabel: "Nature",
    description: "Forests, oceans, storms and meadows — organic palettes with soft depth.",
    expectedCount: 20,
  },
  {
    id: "light-elegant",
    label: "Light and Elegant",
    shortLabel: "Elegant",
    description: "Refined daylight surfaces with graceful, understated color.",
    expectedCount: 15,
  },
  {
    id: "warm-creative",
    label: "Warm and Creative",
    shortLabel: "Creative",
    description: "Expressive warmth for studios, workshops and bold ideas.",
    expectedCount: 10,
  },
  {
    id: "high-contrast",
    label: "High Contrast and Accessibility",
    shortLabel: "Accessible",
    description: "Maximum-legibility palettes engineered for WCAG AA/AAA comfort.",
    expectedCount: 10,
  },
];

export const CUSTOM_COLLECTION_ID = "custom";

export function getCollection(id: string): ThemeCollection | undefined {
  return THEME_COLLECTIONS.find((c) => c.id === id);
}

export function isCollectionId(id: string): id is ThemeCollectionId {
  return THEME_COLLECTIONS.some((c) => c.id === id);
}
