import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Code,
  MessageSquare,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";

export type LandingNavLink = {
  label: string;
  href: string;
  scroll?: boolean;
};

/** Primary marketing nav — kept minimal for a clean header */
export const LANDING_PRIMARY_LINKS: LandingNavLink[] = [
  { label: "Features", href: "#features", scroll: true },
  { label: "Pricing", href: "#pricing", scroll: true },
  { label: "FAQ", href: "#faq", scroll: true },
  { label: "Docs", href: "/docs" },
];

export type LandingProductLink = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const LANDING_PRODUCT_LINKS: LandingProductLink[] = [
  {
    label: "AI Chat",
    description: "Multi-model workspace",
    href: "/chatbot",
    icon: MessageSquare,
  },
  {
    label: "Agentic Workspace",
    description: "Autonomous workflows",
    href: "/agentic-ai-workspace",
    icon: Target,
  },
  {
    label: "Knowledge Graph",
    description: "Visual knowledge connections",
    href: "/knowledge-graph",
    icon: Sparkles,
  },
  {
    label: "Pricing",
    description: "Plans & billing",
    href: "/pricing",
    icon: Shield,
  },
];

export const LANDING_MORE_LINKS: LandingNavLink[] = [
  { label: "About", href: "/about" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];
