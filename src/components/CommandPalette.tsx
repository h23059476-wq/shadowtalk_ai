import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  LayoutGrid,
  MessageSquare,
  Sparkles,
  BarChart3,
  Brain,
  FlaskConical,
  Ghost,
  Network,
  UserCircle,
  Share2,
  Search as SearchIcon,
  Award,
  ShieldCheck,
  Shield,
  ClipboardList,
  Monitor,
  Terminal,
  Building2,
  FileText,
  LineChart,
  User,
  Settings,
  CreditCard,
  LogIn,
  Eye,
  PenTool,
  BookOpen,
  Globe,
  History,
  ArrowRight,
  HelpCircle,
  Activity,
  Briefcase,
  Mail,
  Scale,
  Cookie,
} from "lucide-react";

export type PageGroup =
  | "Core Products"
  | "Security & Trust"
  | "Enterprise & Admin"
  | "Knowledge & Research"
  | "Account & Customization"
  | "Resources & Company";

export interface PageEntry {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  group: PageGroup;
  badge?: string;
  keywords?: string[];
}

/**
 * All verified, active pages currently deployed and available in ShadowTalk AI.
 * Every entry maps to a live route in App.tsx.
 */
export const pages: PageEntry[] = [
  // === Core Products ===
  {
    name: "Home / Landing Page",
    href: "/home",
    icon: LayoutGrid,
    desc: "AI platform overview, intelligent agents & interactive demo",
    group: "Core Products",
    keywords: ["landing", "main", "start", "showcase", "intro"],
  },
  {
    name: "AI Chatbot Assistant",
    href: "/chatbot",
    icon: MessageSquare,
    desc: "Multi-model real-time conversational AI with memory context",
    group: "Core Products",
    badge: "Live",
    keywords: ["chat", "assistant", "stream", "turbo", "agent", "conversation"],
  },
  {
    name: "Shadow Workspace",
    href: "/workspace",
    icon: Sparkles,
    desc: "Business memory, brand voice rules, facts & prompt injection",
    group: "Core Products",
    badge: "Active",
    keywords: ["memory", "business", "brand", "rules", "facts", "injection"],
  },
  {
    name: "Platform Analytics",
    href: "/analytics",
    icon: BarChart3,
    desc: "Message velocity, token telemetry, latency & privacy metrics",
    group: "Core Products",
    badge: "Charts",
    keywords: ["metrics", "stats", "telemetry", "tokens", "usage", "speed"],
  },
  {
    name: "Shadow Memory Ledger",
    href: "/shadow-memory",
    icon: Brain,
    desc: "Zero-cloud on-device IndexedDB activity journal & audit trail",
    group: "Core Products",
    badge: "Zero-Cloud",
    keywords: ["ledger", "journal", "indexeddb", "activity", "audit", "local"],
  },
  {
    name: "Model Studio & Playground",
    href: "/studio",
    icon: FlaskConical,
    desc: "Interactive multi-model comparison, temperature tuning & prompts",
    group: "Core Products",
    keywords: ["playground", "models", "tuning", "prompt", "parameters"],
  },
  {
    name: "Private AI Hub",
    href: "/private-ai",
    icon: Ghost,
    desc: "Zero-cloud anonymous local AI execution sandbox",
    group: "Core Products",
    badge: "Private",
    keywords: ["anonymous", "sandbox", "offline", "local", "untracked"],
  },

  // === Security & Trust ===
  {
    name: "Privacy Score & Audit",
    href: "/privacy-score",
    icon: Award,
    desc: "Live cryptographic privacy posture, tracker audit & security gauge",
    group: "Security & Trust",
    badge: "Score",
    keywords: ["privacy", "gauge", "score", "audit", "trackers", "security"],
  },
  {
    name: "Trust & Proofs Center",
    href: "/trust",
    icon: ShieldCheck,
    desc: "Cryptographic zero-data proof checks & security certifications",
    group: "Security & Trust",
    keywords: ["trust", "proofs", "crypto", "encryption", "compliance"],
  },
  {
    name: "Cyber Command Center",
    href: "/cyber",
    icon: Shield,
    desc: "AI-powered threat intelligence, incident war room & security copilot",
    group: "Security & Trust",
    badge: "Defense",
    keywords: ["cyber", "threats", "osint", "security", "pentest", "warroom"],
  },
  {
    name: "Security Audit Board",
    href: "/security-audit",
    icon: ClipboardList,
    desc: "Open security audit matrix, encryption verification & compliance",
    group: "Security & Trust",
    keywords: ["audit", "compliance", "matrix", "certifications", "encryption"],
  },
  {
    name: "Active Device Sessions",
    href: "/sessions",
    icon: Monitor,
    desc: "Multi-device session manager & remote device access revocation",
    group: "Security & Trust",
    keywords: ["sessions", "devices", "tokens", "security", "revocation"],
  },

  // === Enterprise & Admin ===
  {
    name: "Developer Portal",
    href: "/developers",
    icon: Terminal,
    desc: "API credentials, webhook configuration & developer integration kits",
    group: "Enterprise & Admin",
    badge: "REST API",
    keywords: ["api", "keys", "webhooks", "developer", "tokens", "sdk"],
  },
  {
    name: "Enterprise Integrations Hub",
    href: "/integrations",
    icon: Network,
    desc: "Connect Slack, Notion, GitHub, and custom automated webhooks",
    group: "Enterprise & Admin",
    keywords: ["slack", "notion", "github", "connectors", "integrations"],
  },
  {
    name: "Organization Administration",
    href: "/admin",
    icon: Building2,
    desc: "Team member roster, role-based access control & workspace policies",
    group: "Enterprise & Admin",
    keywords: ["admin", "team", "rbac", "roles", "members", "org"],
  },
  {
    name: "Security Audit Logs",
    href: "/audit-logs",
    icon: FileText,
    desc: "Enterprise immutable security audit trail & compliance log stream",
    group: "Enterprise & Admin",
    keywords: ["logs", "events", "compliance", "soc2", "audit"],
  },
  {
    name: "Data Insights Queue",
    href: "/data-insights",
    icon: LineChart,
    desc: "Anonymized analytics telemetry & enterprise licensing reports",
    group: "Enterprise & Admin",
    keywords: ["data", "insights", "licensing", "reports", "telemetry"],
  },

  // === Knowledge & Research ===
  {
    name: "Knowledge Graph & KB",
    href: "/knowledge-graph",
    icon: Network,
    desc: "Local RAG knowledge base & interactive visual entity relationship graph",
    group: "Knowledge & Research",
    badge: "Visual",
    keywords: ["knowledge", "graph", "rag", "entities", "search", "documents"],
  },
  {
    name: "Deep Research Engine",
    href: "/deep-research",
    icon: SearchIcon,
    desc: "Multi-step web research with citations & synthesis summary",
    group: "Knowledge & Research",
    keywords: ["research", "citations", "web", "sources", "investigation"],
  },
  {
    name: "Shadow Twin Persona Settings",
    href: "/shadow-twin",
    icon: UserCircle,
    desc: "Configure personalized AI twin persona, knowledge & voice tone",
    group: "Knowledge & Research",
    keywords: ["twin", "persona", "clone", "voice", "knowledge"],
  },
  {
    name: "Public Shadow Twin Chat",
    href: "/t/demo",
    icon: Share2,
    desc: "Shareable public interactive twin chat interface for visitors",
    group: "Knowledge & Research",
    badge: "Shareable",
    keywords: ["twin", "public", "share", "interactive", "demo"],
  },

  // === Account & Customization ===
  {
    name: "User Profile",
    href: "/profile",
    icon: User,
    desc: "Personal preferences, AI persona defaults, account metadata & stats",
    group: "Account & Customization",
    keywords: ["profile", "user", "avatar", "account", "preferences"],
  },
  {
    name: "System Settings",
    href: "/settings",
    icon: Settings,
    desc: "Theme styling, stealth mode, local storage & notifications",
    group: "Account & Customization",
    keywords: ["settings", "preferences", "dark", "stealth", "storage"],
  },
  {
    name: "Billing & Subscriptions",
    href: "/billing",
    icon: CreditCard,
    desc: "Manage subscription plans, invoices & sovereign credit allocations",
    group: "Account & Customization",
    keywords: ["billing", "subscription", "plan", "invoices", "payment", "credits"],
  },
  {
    name: "Sign In & Security",
    href: "/auth",
    icon: LogIn,
    desc: "Secure sign-in, persistent sessions & OAuth authentication",
    group: "Account & Customization",
    keywords: ["login", "signin", "auth", "register", "password", "oauth"],
  },
  {
    name: "Auth Design Gallery",
    href: "/auth/designs",
    icon: Eye,
    desc: "Interactive showcase gallery of modern authentication card layouts",
    group: "Account & Customization",
    keywords: ["auth", "designs", "gallery", "cards", "themes"],
  },
  {
    name: "UI Templates & Themes",
    href: "/templates",
    icon: PenTool,
    desc: "100+ prompt presets and responsive design theme customizations",
    group: "Account & Customization",
    keywords: ["templates", "presets", "themes", "styling", "prompts"],
  },

  // === Resources & Company ===
  {
    name: "Documentation",
    href: "/docs",
    icon: BookOpen,
    desc: "Complete technical architecture, Turbo routing & REST API guides",
    group: "Resources & Company",
    badge: "API Docs",
    keywords: ["docs", "documentation", "guides", "api", "architecture", "reference"],
  },
  {
    name: "Plans & Pricing",
    href: "/pricing",
    icon: Shield,
    desc: "Transparent Free, Pro ($29/mo), and Enterprise tier comparisons",
    group: "Resources & Company",
    keywords: ["pricing", "plans", "tiers", "pro", "enterprise", "cost"],
  },
  {
    name: "About ShadowTalk AI",
    href: "/about",
    icon: Globe,
    desc: "Company mission, zero-data-retention architecture & company story",
    group: "Resources & Company",
    keywords: ["about", "mission", "company", "privacy", "team"],
  },
  {
    name: "Founder: Zain Ahmed",
    href: "/founder",
    icon: User,
    desc: "Zain Ahmed Fahad Patel — 17-year-old founder story, Karachi roots, GIAIC, vision & contacts",
    group: "Resources & Company",
    badge: "Founder",
    keywords: ["founder", "zain", "ahmed", "patel", "story", "karachi", "giaic", "zia khan", "creator", "architect"],
  },
  {
    name: "Co-Founder: Fatima",
    href: "/fatima",
    icon: User,
    desc: "Fatima — Co-founder & second developer, systems architecture, memory ledger & contacts",
    group: "Resources & Company",
    badge: "Co-Founder",
    keywords: ["cofounder", "co-founder", "fatima", "sadaf", "tayyaba", "second developer", "systems", "architect", "karachi"],
  },
  {
    name: "Product Changelog",
    href: "/changelog",
    icon: History,
    desc: "Release history, system updates & feature rollouts",
    group: "Resources & Company",
    keywords: ["changelog", "updates", "releases", "history", "news"],
  },
  {
    name: "Help Center",
    href: "/help",
    icon: HelpCircle,
    desc: "Knowledge guides, troubleshooting, setup & model tutorials",
    group: "Resources & Company",
    badge: "Support",
    keywords: ["help", "support", "guides", "troubleshooting", "tutorials", "faq"],
  },
  {
    name: "Frequently Asked Questions (FAQ)",
    href: "/faq",
    icon: HelpCircle,
    desc: "Verified answers regarding models, privacy, missions & founder",
    group: "Resources & Company",
    keywords: ["faq", "questions", "answers", "missions", "billing", "founder"],
  },
  {
    name: "Contact Us & Support",
    href: "/contact",
    icon: Mail,
    desc: "Executive assistance, Karachi HQ, enterprise inquiry & direct email",
    group: "Resources & Company",
    keywords: ["contact", "support", "email", "inquiry", "sales", "karachi"],
  },
  {
    name: "System Status & Latency",
    href: "/status",
    icon: Activity,
    desc: "Real-time service health, model ping latencies & incident track record",
    group: "Resources & Company",
    badge: "99.98%",
    keywords: ["status", "uptime", "latency", "health", "ping", "incidents", "services"],
  },
  {
    name: "Engineering & AI Blog",
    href: "/blog",
    icon: BookOpen,
    desc: "Technical articles, agent architecture deep dives & industry analysis",
    group: "Resources & Company",
    keywords: ["blog", "articles", "news", "engineering", "deepseek", "groq", "agents"],
  },
  {
    name: "Enterprise Case Studies",
    href: "/case-studies",
    icon: Briefcase,
    desc: "Proven enterprise agent workflows, ROI metrics & benchmark outcomes",
    group: "Resources & Company",
    badge: "Case Studies",
    keywords: ["case", "studies", "roi", "enterprise", "fintech", "legal", "outcomes"],
  },
  {
    name: "Privacy Policy",
    href: "/privacy",
    icon: ShieldCheck,
    desc: "Data processing, zero model training & security commitments",
    group: "Resources & Company",
    keywords: ["privacy", "policy", "data", "encryption", "telemetry", "security"],
  },
  {
    name: "Terms of Service",
    href: "/terms",
    icon: Scale,
    desc: "Platform governance, 100% user output ownership & 14-day refund SLA",
    group: "Resources & Company",
    keywords: ["terms", "service", "legal", "ownership", "refund", "sla", "license"],
  },
  {
    name: "Cookie Policy & Preferences",
    href: "/cookies",
    icon: Cookie,
    desc: "Local storage breakdown & interactive cookie preference manager",
    group: "Resources & Company",
    keywords: ["cookies", "storage", "preferences", "consent", "tracking", "tokens"],
  },
  {
    name: "GDPR Compliance & Data Rights",
    href: "/gdpr",
    icon: ShieldCheck,
    desc: "Data subject rights, instant JSON data export & cache wipe tool",
    group: "Resources & Company",
    badge: "GDPR",
    keywords: ["gdpr", "rights", "export", "delete", "erasure", "dpo", "compliance"],
  },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_ORDER: PageGroup[] = [
  "Core Products",
  "Security & Trust",
  "Enterprise & Admin",
  "Knowledge & Research",
  "Account & Customization",
  "Resources & Company",
];

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const onChatPage = location.pathname === "/chatbot";

  // Global keyboard shortcut: Ctrl+K / Cmd+K (chat page uses its own specialized tool palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (onChatPage) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, onChatPage]);

  const handleSelect = useCallback(
    (href: string) => {
      navigate(href);
      onOpenChange(false);
    },
    [navigate, onOpenChange],
  );

  const grouped = GROUP_ORDER.map((groupName) => ({
    group: groupName,
    items: pages.filter((p) => p.group === groupName),
  })).filter((g) => g.items.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <CommandInput
          placeholder={`Search all ${pages.length} pages in ShadowTalk... (Ctrl+K)`}
          className="text-sm font-medium"
        />
      </div>

      <CommandList className="max-h-[65vh] p-2 overflow-y-auto">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <SearchIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No matching pages found</p>
            <p className="text-xs">Try searching by page name, category, or path (e.g. "workspace", "analytics", "security")</p>
          </div>
        </CommandEmpty>

        {grouped.map(({ group, items }) => (
          <CommandGroup
            key={group}
            heading={
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 py-1.5">
                <span>{group}</span>
                <span className="text-[10px] lowercase font-normal bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                  {items.length} {items.length === 1 ? "page" : "pages"}
                </span>
              </div>
            }
          >
            {items.map((page) => (
              <CommandItem
                key={page.href}
                value={`${page.name} ${page.href} ${page.desc} ${page.group} ${(page.keywords || []).join(" ")}`}
                onSelect={() => handleSelect(page.href)}
                className="flex items-center justify-between gap-3 px-3 py-2.5 my-0.5 rounded-xl cursor-pointer hover:bg-muted/70 aria-selected:bg-muted transition-all duration-150 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                    <page.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {page.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {page.desc}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {page.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-primary/15 text-primary border border-primary/25">
                      {page.badge}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-muted-foreground/60 hidden sm:inline bg-muted/40 px-1.5 py-0.5 rounded">
                    {page.href}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
