import { Instagram, Linkedin, Youtube, type LucideIcon } from "lucide-react";
import { FOUNDER_CANONICAL, FOUNDER_SOCIAL_PROFILES } from "./founderIdentity";

/** Founder social profiles — single source of truth for site-wide links */
export const FOUNDER_SOCIAL = {
  instagram: {
    url: FOUNDER_SOCIAL_PROFILES.instagram.url,
    handle: FOUNDER_SOCIAL_PROFILES.instagram.handle,
    label: FOUNDER_SOCIAL_PROFILES.instagram.label,
  },
  linkedin: {
    url: FOUNDER_SOCIAL_PROFILES.linkedin.url,
    label: FOUNDER_SOCIAL_PROFILES.linkedin.label,
    name: FOUNDER_SOCIAL_PROFILES.linkedin.name,
  },
  youtube: {
    url: FOUNDER_SOCIAL_PROFILES.youtube.url,
    label: FOUNDER_SOCIAL_PROFILES.youtube.label,
  },
} as const;

export type SocialLinkItem = {
  icon: LucideIcon;
  href: string;
  label: string;
};

/** Instagram + LinkedIn + YouTube — profiles for footer, contact, about, SEO */
export const SOCIAL_LINKS: readonly SocialLinkItem[] = [
  {
    icon: Linkedin,
    href: FOUNDER_SOCIAL.linkedin.url,
    label: FOUNDER_SOCIAL.linkedin.label,
  },
  {
    icon: Instagram,
    href: FOUNDER_SOCIAL.instagram.url,
    label: FOUNDER_SOCIAL.instagram.label,
  },
  {
    icon: Youtube,
    href: FOUNDER_SOCIAL.youtube.url,
    label: FOUNDER_SOCIAL.youtube.label,
  },
];

/** schema.org Organization `sameAs` */
export const SOCIAL_SAME_AS = [
  ...SOCIAL_LINKS.map((s) => s.href),
  FOUNDER_CANONICAL.github,
];
