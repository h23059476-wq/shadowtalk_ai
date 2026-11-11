/**
 * Shared presentation (slide deck) types and theme palettes.
 */

export interface PresentationSlide {
  title: string;
  subtitle?: string;
  layout: string;
  html: string;
  speakerNotes?: string;
  content?: Record<string, unknown>;
}

export interface PresentationData {
  title: string;
  subtitle?: string;
  slides: PresentationSlide[];
  theme?: string;
  metadata?: Record<string, unknown>;
}

export interface ThemeColors {
  name: string;
  bg: string;
  accent: string;
  accentEnd?: string;
  text: string;
  secondaryBg: string;
}

export const THEMES = {
  corporate: {
    name: 'Corporate',
    bg: '#0b1220',
    accent: '#2563eb',
    accentEnd: '#38bdf8',
    text: '#f8fafc',
    secondaryBg: '#111c30',
  },
  midnight: {
    name: 'Midnight',
    bg: '#09090b',
    accent: '#7c3aed',
    accentEnd: '#c084fc',
    text: '#fafafa',
    secondaryBg: '#18181b',
  },
  emerald: {
    name: 'Emerald',
    bg: '#052e26',
    accent: '#10b981',
    accentEnd: '#6ee7b7',
    text: '#ecfdf5',
    secondaryBg: '#064e3b',
  },
  sunset: {
    name: 'Sunset',
    bg: '#1c1113',
    accent: '#f97316',
    accentEnd: '#fbbf24',
    text: '#fff7ed',
    secondaryBg: '#2b1a1d',
  },
  minimal: {
    name: 'Minimal',
    bg: '#ffffff',
    accent: '#111827',
    accentEnd: '#4b5563',
    text: '#111827',
    secondaryBg: '#f3f4f6',
  },
} satisfies Record<string, ThemeColors>;

export type ThemeKey = keyof typeof THEMES;
