import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bell,
  Radio,
  Server,
  Activity,
  Globe,
  Route,
  Clock,
  BarChart3,
  CreditCard,
  MessageSquareHeart,
  Crown,
  MessageSquare,
  Key,
  Shield,
  User,
  History,
  Megaphone,
  Send,
  Download,
  FileQuestion,
  Sparkles,
  Brain,
} from "lucide-react";

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "pendingFeedback" | "pendingGrowthActions";
  description?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Stats and quick actions" },
      { id: "alerts", label: "System alerts", icon: Bell, description: "Platform alerts log" },
      { id: "intelligence", label: "Intelligence Center", icon: Brain, description: "Founder product analytics" },
    ],
  },
  {
    title: "Growth & scale",
    items: [
      {
        id: "growth-command",
        label: "Growth Command",
        icon: Sparkles,
  Brain,
        description: "ShadowScale autonomous growth engine",
        badgeKey: "pendingGrowthActions",
      },
    ],
  },
  {
    title: "Product & updates",
    items: [
      { id: "changelog", label: "Releases", icon: History, description: "Publish changelog & notify users" },
      { id: "announcements", label: "Announcements", icon: Megaphone, description: "In-app banners" },
      { id: "broadcast", label: "Broadcast", icon: Send, description: "Email + push to all users" },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { id: "realtime", label: "Live users", icon: Radio },
      { id: "health", label: "Web health", icon: Server },
      { id: "live-feedback", label: "Live feedback", icon: Activity },
      { id: "geo-tracking", label: "User map", icon: Globe },
      { id: "journeys", label: "Journeys", icon: Route },
      { id: "timezone", label: "Timezones", icon: Clock },
      { id: "firebase-analytics", label: "Firebase Analytics", icon: Activity, description: "Real-time usage limits & logs" },
      { id: "business", label: "Business insights", icon: BarChart3 },
      { id: "gsc", label: "Search Console", icon: Globe, description: "Read-only GSC summary" },
    ],
  },
  {
    title: "Users & content",
    items: [
      { id: "payments", label: "Payments", icon: CreditCard },
      { id: "feedback", label: "Feedback", icon: MessageSquareHeart, badgeKey: "pendingFeedback" },
      { id: "subscribers", label: "Subscribers", icon: Crown },
      { id: "conversations", label: "Conversations", icon: MessageSquare },
      { id: "faq", label: "FAQ CMS", icon: FileQuestion },
    ],
  },
  {
    title: "Configuration",
    items: [
      { id: "gemini-keys", label: "API keys", icon: Key },
      { id: "roles", label: "Roles", icon: Shield },
      { id: "profiles", label: "Profiles", icon: User },
      { id: "export", label: "Export data", icon: Download },
    ],
  },
];

export const adminQuickActions = [
  { section: "growth-command", label: "Growth Command", icon: Sparkles },
  { section: "changelog", label: "Ship release", icon: History },
  { section: "broadcast", label: "Broadcast message", icon: Send },
  { section: "announcements", label: "New announcement", icon: Megaphone },
  { section: "feedback", label: "Review feedback", icon: MessageSquareHeart },
] as const;

export function findAdminNavItem(id: string): AdminNavItem | undefined {
  return adminNavGroups.flatMap((g) => g.items).find((i) => i.id === id);
}
