import type { LucideIcon } from "lucide-react";
import {
  Home,
  MessageSquare,
  Brain,
  Palette,
  BookOpen,
  User,
  Settings,
  CircleCheck,
  CircleDollarSign,
} from "lucide-react";

export interface ChatSidebarNavItem {
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  to: string;
  end?: boolean;
  section: "workspace" | "explore";
  badge?: string;
}

export const CHAT_SIDEBAR_NAV: ChatSidebarNavItem[] = [
  // Workspace section
  { label: "Chatbot", icon: MessageSquare, to: "/chatbot", end: true, section: "workspace" },
  { label: "ProofLoop", shortLabel: "ProofLoop", icon: CircleCheck, to: "/proofloop", section: "workspace", badge: "VERIFIED" },
  { label: "Home", icon: Home, to: "/home", end: true, section: "workspace" },

  // Explore section — only real pages
  { label: "Shadow Twin", icon: Brain, to: "/shadow-twin", section: "explore" },
  { label: "Appearance", icon: Palette, to: "/themes", section: "explore", badge: "NEW" },
  { label: "Settings", icon: Settings, to: "/settings", section: "explore" },
  { label: "Pricing", icon: CircleDollarSign, to: "/pricing", section: "explore" },
  { label: "Docs", icon: BookOpen, to: "/docs", section: "explore" },
  { label: "Founder", icon: User, to: "/founder", section: "explore" },
];

export const CHAT_SIDEBAR_WIDTH_EXPANDED = 256;
export const CHAT_SIDEBAR_WIDTH_COLLAPSED = 76;
