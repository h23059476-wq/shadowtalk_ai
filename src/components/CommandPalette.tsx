import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  UserCircle,
  Share2,
  Search as SearchIcon,
  ShieldCheck,
  Shield,
  ClipboardList,
  Terminal,
  Building2,
  LineChart,
  User,
  Settings,
  CreditCard,
  LogIn,
  Palette,
  BookOpen,
  Globe,
  History,
  ArrowRight,
  HelpCircle,
  Activity,
  Mail,
  Scale,
  Cookie,
  Download,
  WifiOff,
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
 * Every navigable page that currently exists in ShadowTalk AI.
 * Each href maps 1:1 to a rendered (non-redirect) route in App.tsx — this list
 * is regression-tested against the router in src/lib/siteLinkAudit.test.ts.
 * Dynamic routes (/t/:username, /s/:slug, /proof/:proofId, /mission/:id) and
 * the /auth/action email-link handler are intentionally not listed here.
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
    name: "Prompt Library",
    href: "/prompt-library",
    icon: Sparkles,
    desc: "108 curated prompt packs — 11,000+ verified prompts across 12 categories",
    group: "Core Products",
    badge: "New",
    keywords: ["prompts", "packs", "library", "templates", "verified", "copy"],
  },
  {
    name: "Agentic IDE",
    href: "/ide",
    icon: Terminal,
    desc: "In-browser agentic IDE for React and vanilla JS projects",
    group: "Core Products",
    keywords: ["ide", "code", "editor", "react", "projects", "development"],
  },
  {
    name: "ProofLoop Missions",
    href: "/proofloop",
    icon: ClipboardList,
    desc: "AI execution verification: missions, proof cards & audit trails",
    group: "Core Products",
    keywords: ["proofloop", "missions", "verification", "proof", "audit", "execution"],
  },
  {
    name: "Downloads",
    href: "/downloads",
    icon: Download,
    desc: "Install ShadowTalk on desktop, mobile & web",
    group: "Core Products",
    keywords: ["download", "install", "desktop", "mobile", "app", "pwa", "web"],
  },
  {
    name: "Public Shadow Twin Chat",
    href: "/t/demo",
    icon: Share2,
    desc: "Shareable public interactive twin chat interface for visitors",
    group: "Core Products",
    badge: "Shareable",
    keywords: ["twin", "public", "share", "interactive", "demo"],
  },

  // === Security & Trust ===
  {
    name: "Trust & Security Center",
    href: "/security",
    icon: ShieldCheck,
    desc: "Live security posture checks: encryption, WebAuthn, storage & HTTPS audit",
    group: "Security & Trust",
    badge: "Trust",
    keywords: ["trust", "security", "encryption", "webauthn", "https", "proofs", "posture"],
  },
  {
    name: "System Status & Latency",
    href: "/status",
    icon: Activity,
    desc: "Real-time service health, model ping latencies & incident track record",
    group: "Security & Trust",
    badge: "99.98%",
    keywords: ["status", "uptime", "latency", "health", "ping", "incidents", "services"],
  },
  {
    name: "Privacy Policy",
    href: "/privacy",
    icon: Shield,
    desc: "Data processing, zero model training & security commitments",
    group: "Security & Trust",
    keywords: ["privacy", "policy", "data", "encryption", "telemetry", "security"],
  },
  {
    name: "GDPR Compliance & Data Rights",
    href: "/gdpr",
    icon: ShieldCheck,
    desc: "Data subject rights, instant JSON data export & cache wipe tool",
    group: "Security & Trust",
    badge: "GDPR",
    keywords: ["gdpr", "rights", "export", "delete", "erasure", "dpo", "compliance"],
  },
  {
    name: "Terms of Service",
    href: "/terms",
    icon: Scale,
    desc: "Platform governance, user output ownership & refund policy",
    group: "Security & Trust",
    keywords: ["terms", "service", "legal", "ownership", "refund", "license"],
  },
  {
    name: "Cookie Policy & Preferences",
    href: "/cookies",
    icon: Cookie,
    desc: "Local storage breakdown & interactive cookie preference manager",
    group: "Security & Trust",
    keywords: ["cookies", "storage", "preferences", "consent", "tracking", "tokens"],
  },

  // === Enterprise & Admin ===
  {
    name: "Admin Console",
    href: "/admin",
    icon: Building2,
    desc: "Team member roster, role-based access control & workspace policies",
    group: "Enterprise & Admin",
    badge: "Admin",
    keywords: ["admin", "team", "rbac", "roles", "members", "org"],
  },
  {
    name: "Intelligence Center",
    href: "/admin/intelligence",
    icon: Brain,
    desc: "Founder & admin intelligence hub: analytics, command center & system views",
    group: "Enterprise & Admin",
    badge: "Admin",
    keywords: ["intelligence", "command center", "analytics", "telemetry", "insights"],
  },

  // === Knowledge & Research ===
  {
    name: "Shadow Twin Persona Settings",
    href: "/shadow-twin",
    icon: UserCircle,
    desc: "Configure personalized AI twin persona, knowledge & voice tone",
    group: "Knowledge & Research",
    keywords: ["twin", "persona", "clone", "voice", "knowledge"],
  },
  {
    name: "Multi-Model Benchmarks",
    href: "/benchmarks",
    icon: BarChart3,
    desc: "Side-by-side multi-model benchmark comparisons",
    group: "Knowledge & Research",
    keywords: ["benchmarks", "models", "comparison", "performance", "leaderboard"],
  },
  {
    name: "Documentation",
    href: "/docs",
    icon: BookOpen,
    desc: "Technical guides, architecture & feature reference",
    group: "Knowledge & Research",
    badge: "Docs",
    keywords: ["docs", "documentation", "guides", "architecture", "reference", "api"],
  },
  {
    name: "Visualization Demo",
    href: "/dev/viz-demo",
    icon: LineChart,
    desc: "Developer demo of chart & data-visualization components",
    group: "Knowledge & Research",
    badge: "Dev",
    keywords: ["viz", "charts", "demo", "developer", "visualization", "dev"],
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
    name: "Appearance Studio",
    href: "/themes",
    icon: Palette,
    desc: "100+ curated themes, favorites and a visual custom theme designer",
    group: "Account & Customization",
    keywords: ["themes", "appearance", "colors", "designer", "dark", "light", "styling"],
  },
  {
    name: "Sign In & Security",
    href: "/auth",
    icon: LogIn,
    desc: "Secure sign-in, persistent sessions & OAuth authentication",
    group: "Account & Customization",
    keywords: ["login", "signin", "auth", "register", "password", "oauth"],
  },

  // === Resources & Company ===
  {
    name: "About ShadowTalk AI",
    href: "/about",
    icon: Globe,
    desc: "Company mission, zero-data-retention architecture & company story",
    group: "Resources & Company",
    keywords: ["about", "mission", "company", "privacy", "team"],
  },
  {
    name: "Plans & Pricing",
    href: "/pricing",
    icon: CreditCard,
    desc: "Free, Pro and Enterprise plan comparisons",
    group: "Resources & Company",
    keywords: ["pricing", "plans", "tiers", "pro", "enterprise", "cost"],
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
    name: "Product Changelog",
    href: "/changelog",
    icon: History,
    desc: "Release history, system updates & feature rollouts",
    group: "Resources & Company",
    keywords: ["changelog", "updates", "releases", "history", "news"],
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
    name: "Offline AI Chat guide",
    href: "/offline-ai-chat",
    icon: WifiOff,
    desc: "Chat with AI with no internet — on-device models, offline queueing, sync on reconnect",
    group: "Resources & Company",
    keywords: ["offline", "ai", "chat", "no internet", "airplane", "tunnel", "remote", "sync", "guide"],
  },
  {
    name: "Private AI Chat guide",
    href: "/private-ai-chat",
    icon: ShieldCheck,
    desc: "Encrypted, no-account AI chat — guest mode, BYOK direct, Private Mode",
    group: "Resources & Company",
    keywords: ["private", "ai", "chat", "encrypted", "e2ee", "privacy", "byok", "no account", "guide"],
  },
  {
    name: "Run an LLM in your browser",
    href: "/run-llm-in-browser",
    icon: Globe,
    desc: "WebGPU browser LLM guide — models, sizes, speed, switching",
    group: "Resources & Company",
    keywords: ["llm", "browser", "webgpu", "local", "model", "llama", "qwen", "smollm", "guide"],
  },
  {
    name: "Compare — all head-to-heads",
    href: "/compare",
    icon: Scale,
    desc: "Honest scored comparisons vs ChatGPT, LM Studio, Lumo, Ollama & more",
    group: "Resources & Company",
    keywords: ["compare", "vs", "versus", "alternatives", "comparison", "market", "competitors"],
  },
  {
    name: "ShadowTalk vs ChatGPT",
    href: "/vs/chatgpt",
    icon: MessageSquare,
    desc: "Offline, private and free vs the cloud giant — scored on six dimensions",
    group: "Resources & Company",
    keywords: ["chatgpt", "openai", "compare", "offline", "alternative", "vs"],
  },
  {
    name: "ShadowTalk vs LM Studio",
    href: "/vs/lm-studio",
    icon: Terminal,
    desc: "Browser tab vs desktop app — sync vs feature request #2467",
    group: "Resources & Company",
    keywords: ["lm studio", "local", "desktop", "sync", "compare", "vs", "2467"],
  },
  {
    name: "ShadowTalk vs Proton Lumo",
    href: "/vs/proton-lumo",
    icon: Shield,
    desc: "Encrypted AI head-to-head — on-device vs server-side decryption",
    group: "Resources & Company",
    keywords: ["proton", "lumo", "encrypted", "privacy", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs web-llm-chat",
    href: "/vs/web-llm-chat",
    icon: Globe,
    desc: "The browser-LLM demo vs the product around it",
    group: "Resources & Company",
    keywords: ["webllm", "web-llm", "secret llama", "demo", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Ollama",
    href: "/vs/ollama",
    icon: LayoutGrid,
    desc: "No-install browser AI vs the local runtime and API",
    group: "Resources & Company",
    keywords: ["ollama", "local", "runtime", "api", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Perplexity",
    href: "/vs/perplexity",
    icon: SearchIcon,
    desc: "Answer engine vs cited research that works offline",
    group: "Resources & Company",
    keywords: ["perplexity", "search", "research", "citations", "compare", "vs"],
  },
  {
    name: "Contact Us & Support",
    href: "/contact",
    icon: Mail,
    desc: "Executive assistance, Karachi HQ, enterprise inquiry & direct email",
    group: "Resources & Company",
    keywords: ["contact", "support", "email", "inquiry", "sales", "karachi"],
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

  // Global keyboard shortcut: Ctrl+K / Cmd+K — opens on every page of the site
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

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
            <p className="text-xs">Try searching by page name, category, or path (e.g. "prompt", "security", "settings")</p>
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
