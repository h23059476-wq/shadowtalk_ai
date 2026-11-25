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
  KeyRound,
  LogIn,
  Palette,
  BookOpen,
  Newspaper,
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
  Smartphone,
} from "lucide-react";

export type PageGroup =
  | "Product"
  | "Guides"
  | "Compare"
  | "Support"
  | "Company"
  | "Workspace"
  | "Admin & Developer"
  | "Legal";

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
 * Every navigable page that currently exists in ShadowTalk AI, organized to
 * mirror the global footer's sections (Product / Guides / Compare / Support /
 * Company / Legal) one-to-one, plus the in-app Workspace and Admin surfaces.
 * Each href maps 1:1 to a rendered (non-redirect) route in App.tsx — this list
 * is regression-tested against the router in src/lib/siteLinkAudit.test.ts
 * (route coverage + Footer parity). Dynamic routes (/t/:username, /s/:slug,
 * /proof/:proofId, /mission/:id) and the /auth/action email-link handler are
 * intentionally not listed here.
 */
export const pages: PageEntry[] = [
  // === Product (mirrors footer "Product") ===
  {
    name: "Features",
    href: "/home#features",
    icon: Sparkles,
    desc: "Feature tour on the landing page — offline chat, BYOK, agents, prompts",
    group: "Product",
    keywords: ["features", "capabilities", "tour", "overview", "what can it do"],
  },
  {
    name: "Home / Landing Page",
    href: "/home",
    icon: LayoutGrid,
    desc: "AI platform overview, intelligent agents & interactive demo",
    group: "Product",
    keywords: ["landing", "main", "start", "showcase", "intro"],
  },
  {
    name: "AI Chatbot Assistant",
    href: "/chatbot",
    icon: MessageSquare,
    desc: "Multi-model real-time conversational AI with memory context",
    group: "Product",
    badge: "Live",
    keywords: ["chat", "assistant", "stream", "turbo", "agent", "conversation"],
  },
  {
    name: "Prompt Library",
    href: "/prompt-library",
    icon: Sparkles,
    desc: "108 curated prompt packs — 11,000+ verified prompts across 12 categories",
    group: "Product",
    badge: "New",
    keywords: ["prompts", "packs", "library", "templates", "verified", "copy"],
  },
  {
    name: "Agentic IDE",
    href: "/ide",
    icon: Terminal,
    desc: "In-browser agentic IDE for React and vanilla JS projects",
    group: "Product",
    keywords: ["ide", "code", "editor", "react", "projects", "development"],
  },
  {
    name: "ProofLoop Missions",
    href: "/proofloop",
    icon: ClipboardList,
    desc: "AI execution verification: missions, proof cards & audit trails",
    group: "Product",
    keywords: ["proofloop", "missions", "verification", "proof", "audit", "execution"],
  },
  {
    name: "Public Shadow Twin Chat",
    href: "/t/demo",
    icon: Share2,
    desc: "Shareable public interactive twin chat interface for visitors",
    group: "Product",
    badge: "Shareable",
    keywords: ["twin", "public", "share", "interactive", "demo"],
  },
  {
    name: "Downloads",
    href: "/downloads",
    icon: Download,
    desc: "Install ShadowTalk on desktop, mobile & web",
    group: "Product",
    keywords: ["download", "install", "desktop", "mobile", "app", "pwa", "web"],
  },
  {
    name: "Plans & Pricing",
    href: "/pricing",
    icon: CreditCard,
    desc: "Free, Pro and Enterprise plan comparisons",
    group: "Product",
    keywords: ["pricing", "plans", "tiers", "pro", "enterprise", "cost"],
  },
  {
    name: "Product Changelog",
    href: "/changelog",
    icon: History,
    desc: "Release history, system updates & feature rollouts",
    group: "Product",
    keywords: ["changelog", "updates", "releases", "history", "news"],
  },

  // === Guides (mirrors footer "Guides") ===
  {
    name: "Blog",
    href: "/blog",
    icon: Newspaper,
    desc: "BYOK, offline AI & agentic workflows — new posts from the team",
    group: "Guides",
    keywords: ["blog", "articles", "posts", "news", "content"],
  },
  {
    name: "All guides",
    href: "/guides",
    icon: BookOpen,
    desc: "The full guide fleet — offline, private, WebGPU, free, mobile, local vs cloud",
    group: "Guides",
    keywords: ["guides", "learn", "tutorials", "help", "explainers"],
  },
  {
    name: "Offline AI Chat guide",
    href: "/offline-ai-chat",
    icon: WifiOff,
    desc: "Chat with AI with no internet — on-device models, offline queueing, sync on reconnect",
    group: "Guides",
    keywords: ["offline", "ai", "chat", "no internet", "airplane", "tunnel", "remote", "sync", "guide"],
  },
  {
    name: "Private AI Chat guide",
    href: "/private-ai-chat",
    icon: ShieldCheck,
    desc: "Encrypted, no-account AI chat — guest mode, BYOK direct, Private Mode",
    group: "Guides",
    keywords: ["private", "ai", "chat", "encrypted", "e2ee", "privacy", "byok", "no account", "guide"],
  },
  {
    name: "Run an LLM in your browser",
    href: "/run-llm-in-browser",
    icon: Globe,
    desc: "WebGPU browser LLM guide — models, sizes, speed, switching",
    group: "Guides",
    keywords: ["llm", "browser", "webgpu", "local", "model", "llama", "qwen", "smollm", "guide"],
  },
  {
    name: "What is on-device AI",
    href: "/what-is-on-device-ai",
    icon: Brain,
    desc: "Plain-English explainer — WebGPU in a browser tab, privacy math, limits",
    group: "Guides",
    keywords: ["on-device", "edge ai", "local ai", "webgpu", "definition", "explainer", "guide"],
  },
  {
    name: "Best offline AI chat",
    href: "/best-offline-ai-chat",
    icon: WifiOff,
    desc: "Offline AI apps ranked with published criteria — sync, accounts, install, price",
    group: "Guides",
    keywords: ["best", "offline", "ranking", "comparison", "lm studio", "ollama", "pocketpal", "guide"],
  },
  {
    name: "AI chat without an account",
    href: "/ai-chat-without-account",
    icon: User,
    desc: "Guest mode — start instantly, on-device, zero network egress",
    group: "Guides",
    keywords: ["no account", "no sign up", "guest", "anonymous", "free", "guide"],
  },
  {
    name: "Free AI chat",
    href: "/free-ai-chat",
    icon: CreditCard,
    desc: "Free AI chat that's actually free — no card, no markup, no feature locks",
    group: "Guides",
    keywords: ["free", "ai", "chat", "no card", "pricing", "byok", "guide"],
  },
  {
    name: "Offline AI on your phone",
    href: "/mobile-offline-ai",
    icon: Smartphone,
    desc: "Offline AI on iOS & Android as a PWA — no app store, synced history",
    group: "Guides",
    keywords: ["mobile", "phone", "android", "ios", "pwa", "offline", "install", "guide"],
  },
  {
    name: "WebGPU AI chat",
    href: "/webgpu-ai-chat",
    icon: Activity,
    desc: "How a browser tab runs a language model on your GPU",
    group: "Guides",
    keywords: ["webgpu", "gpu", "browser", "inference", "wasm", "chrome", "edge", "guide"],
  },
  {
    name: "Local vs cloud AI",
    href: "/local-vs-cloud-ai",
    icon: LayoutGrid,
    desc: "The honest trade-offs — and the hybrid that runs both in one workspace",
    group: "Guides",
    keywords: ["local", "cloud", "on-device", "hybrid", "comparison", "trade-offs", "guide"],
  },
  {
    name: "AI chat for travel",
    href: "/ai-chat-for-travel",
    icon: Globe,
    desc: "Offline on flights, abroad and dead zones — sync on landing",
    group: "Guides",
    keywords: ["travel", "airplane", "flight", "roaming", "offline", "abroad", "hotel", "guide"],
  },
  {
    name: "AI chat for students",
    href: "/ai-chat-for-students",
    icon: BookOpen,
    desc: "Free study AI with no account that survives school wifi — offline-first",
    group: "Guides",
    keywords: ["students", "school", "study", "homework", "chromebook", "wifi", "free", "guide"],
  },
  {
    name: "Who can read your AI chats",
    href: "/who-can-read-your-ai-chats",
    icon: Shield,
    desc: "The honest tier-by-tier answer — cloud reach paths vs on-device and E2EE",
    group: "Guides",
    keywords: ["privacy", "who can read", "employees", "training", "e2ee", "chats", "guide"],
  },
  {
    name: "Is ChatGPT Plus worth it",
    href: "/is-chatgpt-plus-worth-it",
    icon: CreditCard,
    desc: "The honest math — when $20/month earns it, and the free BYOK stack",
    group: "Guides",
    keywords: ["chatgpt plus", "worth it", "subscription", "pricing", "free", "alternative", "guide"],
  },
  {
    name: "BYOK AI chat — use your own key",
    href: "/byok-ai-chat",
    icon: KeyRound,
    desc: "Your API key, provider prices, no markup — plus the keyless offline model",
    group: "Guides",
    keywords: ["byok", "bring your own key", "api key", "openai", "anthropic", "openrouter", "no subscription", "guide"],
  },
  {
    name: "ChatGPT down? Outage playbook",
    href: "/chatgpt-down",
    icon: WifiOff,
    desc: "On-device AI + multi-provider BYOK — make outages irrelevant",
    group: "Guides",
    keywords: ["chatgpt", "down", "outage", "status", "not working", "alternative", "guide"],
  },

  // === Compare (mirrors footer "Compare") ===
  {
    name: "Compare — all head-to-heads",
    href: "/compare",
    icon: Scale,
    desc: "Honest scored comparisons vs ChatGPT, LM Studio, Lumo, Ollama & more",
    group: "Compare",
    keywords: ["compare", "vs", "versus", "alternatives", "comparison", "market", "competitors"],
  },
  {
    name: "ShadowTalk vs ChatGPT",
    href: "/vs/chatgpt",
    icon: MessageSquare,
    desc: "Offline, private and free vs the cloud giant — scored on six dimensions",
    group: "Compare",
    keywords: ["chatgpt", "openai", "compare", "offline", "alternative", "vs"],
  },
  {
    name: "ShadowTalk vs Gemini",
    href: "/vs/gemini",
    icon: Sparkles,
    desc: "Google's cloud assistant vs on-device chat that syncs when you're back",
    group: "Compare",
    keywords: ["gemini", "google", "compare", "offline", "alternative", "vs"],
  },
  {
    name: "ShadowTalk vs Claude",
    href: "/vs/claude",
    icon: Brain,
    desc: "Frontier writing, cloud-only vs offline-first workspace with BYOK",
    group: "Compare",
    keywords: ["claude", "anthropic", "compare", "writing", "coding", "vs"],
  },
  {
    name: "ShadowTalk vs LM Studio",
    href: "/vs/lm-studio",
    icon: Terminal,
    desc: "Browser tab vs desktop app — sync vs feature request #2467",
    group: "Compare",
    keywords: ["lm studio", "local", "desktop", "sync", "compare", "vs", "2467"],
  },
  {
    name: "ShadowTalk vs Proton Lumo",
    href: "/vs/proton-lumo",
    icon: Shield,
    desc: "Encrypted AI head-to-head — on-device vs server-side decryption",
    group: "Compare",
    keywords: ["proton", "lumo", "encrypted", "privacy", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs web-llm-chat",
    href: "/vs/web-llm-chat",
    icon: Globe,
    desc: "The browser-LLM demo vs the product around it",
    group: "Compare",
    keywords: ["webllm", "web-llm", "secret llama", "demo", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Ollama",
    href: "/vs/ollama",
    icon: LayoutGrid,
    desc: "No-install browser AI vs the local runtime and API",
    group: "Compare",
    keywords: ["ollama", "local", "runtime", "api", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Jan",
    href: "/vs/jan",
    icon: Terminal,
    desc: "Open-source desktop local AI vs the zero-install browser tab",
    group: "Compare",
    keywords: ["jan", "open source", "desktop", "local", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Perplexity",
    href: "/vs/perplexity",
    icon: SearchIcon,
    desc: "Answer engine vs cited research that works offline",
    group: "Compare",
    keywords: ["perplexity", "search", "research", "citations", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs PocketPal",
    href: "/vs/pocketpal",
    icon: Smartphone,
    desc: "On-device phone AI — native app without sync vs synced PWA",
    group: "Compare",
    keywords: ["pocketpal", "mobile", "gguf", "android", "ios", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs DeepSeek",
    href: "/vs/deepseek",
    icon: Brain,
    desc: "Open-weight value, cloud-only app — run DeepSeek via BYOK instead",
    group: "Compare",
    keywords: ["deepseek", "r1", "open weights", "byok", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Microsoft Copilot",
    href: "/vs/copilot",
    icon: Sparkles,
    desc: "Windows cloud assistant vs on-device offline workspace",
    group: "Compare",
    keywords: ["copilot", "microsoft", "windows", "edge", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs DuckDuckGo AI",
    href: "/vs/duckduckgo-ai",
    icon: Shield,
    desc: "Anonymous cloud chat vs zero-egress on-device chat",
    group: "Compare",
    keywords: ["duckduckgo", "duck ai", "anonymous", "privacy", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Brave Leo",
    href: "/vs/brave-leo",
    icon: ShieldCheck,
    desc: "Brave-only sidebar vs any-browser on-device workspace",
    group: "Compare",
    keywords: ["brave", "leo", "browser ai", "sidebar", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Grok",
    href: "/vs/grok",
    icon: Sparkles,
    desc: "xAI's live X firehose vs an AI that works offline and syncs",
    group: "Compare",
    keywords: ["grok", "xai", "x", "twitter", "compare", "vs"],
  },
  {
    name: "ShadowTalk vs Poe",
    href: "/vs/poe",
    icon: LayoutGrid,
    desc: "Points-metered aggregator vs BYOK at cost, offline on-device",
    group: "Compare",
    keywords: ["poe", "quora", "aggregator", "points", "multi-model", "compare", "vs"],
  },

  // === Support (mirrors footer "Support") ===
  {
    name: "Documentation",
    href: "/docs",
    icon: BookOpen,
    desc: "Technical guides, architecture & feature reference",
    group: "Support",
    badge: "Docs",
    keywords: ["docs", "documentation", "guides", "architecture", "reference", "api"],
  },
  {
    name: "Frequently Asked Questions (FAQ)",
    href: "/faq",
    icon: HelpCircle,
    desc: "Verified answers regarding models, privacy, missions & founder",
    group: "Support",
    keywords: ["faq", "questions", "answers", "missions", "billing", "founder"],
  },
  {
    name: "Contact Us & Support",
    href: "/contact",
    icon: Mail,
    desc: "Executive assistance, Karachi HQ, enterprise inquiry & direct email",
    group: "Support",
    keywords: ["contact", "support", "email", "inquiry", "sales", "karachi"],
  },
  {
    name: "System Status & Latency",
    href: "/status",
    icon: Activity,
    desc: "Real-time service health, model ping latencies & incident track record",
    group: "Support",
    badge: "99.98%",
    keywords: ["status", "uptime", "latency", "health", "ping", "incidents", "services"],
  },
  {
    name: "Trust & Security Center",
    href: "/security",
    icon: ShieldCheck,
    desc: "Live security posture checks: encryption, WebAuthn, storage & HTTPS audit",
    group: "Support",
    badge: "Trust",
    keywords: ["trust", "security", "encryption", "webauthn", "https", "proofs", "posture"],
  },

  // === Company (mirrors footer "Company") ===
  {
    name: "About ShadowTalk AI",
    href: "/about",
    icon: Globe,
    desc: "Company mission, zero-data-retention architecture & company story",
    group: "Company",
    keywords: ["about", "mission", "company", "privacy", "team"],
  },
  {
    name: "Founder: Zain Ahmed",
    href: "/founder",
    icon: User,
    desc: "Zain Ahmed Fahad Patel — 17-year-old founder story, Karachi roots, GIAIC, vision & contacts",
    group: "Company",
    badge: "Founder",
    keywords: ["founder", "zain", "ahmed", "patel", "story", "karachi", "giaic", "zia khan", "creator", "architect"],
  },
  {
    name: "Multi-Model Benchmarks",
    href: "/benchmarks",
    icon: BarChart3,
    desc: "Side-by-side multi-model benchmark comparisons",
    group: "Company",
    keywords: ["benchmarks", "models", "comparison", "performance", "leaderboard"],
  },

  // === Workspace (in-app surfaces) ===
  {
    name: "Shadow Twin Persona Settings",
    href: "/shadow-twin",
    icon: UserCircle,
    desc: "Configure personalized AI twin persona, knowledge & voice tone",
    group: "Workspace",
    keywords: ["twin", "persona", "clone", "voice", "knowledge"],
  },
  {
    name: "User Profile",
    href: "/profile",
    icon: User,
    desc: "Personal preferences, AI persona defaults, account metadata & stats",
    group: "Workspace",
    keywords: ["profile", "user", "avatar", "account", "preferences"],
  },
  {
    name: "System Settings",
    href: "/settings",
    icon: Settings,
    desc: "Theme styling, stealth mode, local storage & notifications",
    group: "Workspace",
    keywords: ["settings", "preferences", "dark", "stealth", "storage"],
  },
  {
    name: "Appearance Studio",
    href: "/themes",
    icon: Palette,
    desc: "100+ curated themes, favorites and a visual custom theme designer",
    group: "Workspace",
    keywords: ["themes", "appearance", "colors", "designer", "dark", "light", "styling"],
  },
  {
    name: "Sign In & Security",
    href: "/auth",
    icon: LogIn,
    desc: "Secure sign-in, persistent sessions & OAuth authentication",
    group: "Workspace",
    keywords: ["login", "signin", "auth", "register", "password", "oauth"],
  },

  // === Admin & Developer ===
  {
    name: "Admin Console",
    href: "/admin",
    icon: Building2,
    desc: "Team member roster, role-based access control & workspace policies",
    group: "Admin & Developer",
    badge: "Admin",
    keywords: ["admin", "team", "rbac", "roles", "members", "org"],
  },
  {
    name: "Intelligence Center",
    href: "/admin/intelligence",
    icon: Brain,
    desc: "Founder & admin intelligence hub: analytics, command center & system views",
    group: "Admin & Developer",
    badge: "Admin",
    keywords: ["intelligence", "command center", "analytics", "telemetry", "insights"],
  },
  {
    name: "Visualization Demo",
    href: "/dev/viz-demo",
    icon: LineChart,
    desc: "Developer demo of chart & data-visualization components",
    group: "Admin & Developer",
    badge: "Dev",
    keywords: ["viz", "charts", "demo", "developer", "visualization", "dev"],
  },

  // === Legal (mirrors footer "Legal") ===
  {
    name: "Privacy Policy",
    href: "/privacy",
    icon: Shield,
    desc: "Data processing, zero model training & security commitments",
    group: "Legal",
    keywords: ["privacy", "policy", "data", "encryption", "telemetry", "security"],
  },
  {
    name: "Terms of Service",
    href: "/terms",
    icon: Scale,
    desc: "Platform governance, user output ownership & refund policy",
    group: "Legal",
    keywords: ["terms", "service", "legal", "ownership", "refund", "license"],
  },
  {
    name: "Cookie Policy & Preferences",
    href: "/cookies",
    icon: Cookie,
    desc: "Local storage breakdown & interactive cookie preference manager",
    group: "Legal",
    keywords: ["cookies", "storage", "preferences", "consent", "tracking", "tokens"],
  },
  {
    name: "GDPR Compliance & Data Rights",
    href: "/gdpr",
    icon: ShieldCheck,
    desc: "Data subject rights, instant JSON data export & cache wipe tool",
    group: "Legal",
    badge: "GDPR",
    keywords: ["gdpr", "rights", "export", "delete", "erasure", "dpo", "compliance"],
  },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_ORDER: PageGroup[] = [
  "Product",
  "Guides",
  "Compare",
  "Support",
  "Company",
  "Workspace",
  "Admin & Developer",
  "Legal",
];

/**
 * Deterministic ranking for the page menu (replaces cmdk's fuzzy default,
 * which tie-breaks arbitrary subsequence matches by render order — e.g.
 * "system settings" used to surface "System Status" above "System Settings").
 * Page-name matches always outrank description/keyword matches.
 */
function paletteFilter(value: string, search: string, keywords?: string[]): number {
  const s = search.trim().toLowerCase();
  if (!s) return 1;
  const name = value.toLowerCase();
  const kw = (keywords || []).join(" ").toLowerCase();
  if (name === s) return 1;
  if (name.startsWith(s)) return 0.95;
  if (name.includes(s)) return 0.9;
  const nameWords = name.split(/\s+/);
  const searchWords = s.split(/\s+/);
  if (searchWords.every((w) => nameWords.some((nw) => nw.startsWith(w)))) return 0.85;
  if (kw.includes(s)) return 0.7;
  if (searchWords.every((w) => kw.includes(w))) return 0.6;
  return 0;
}

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
    <CommandDialog open={open} onOpenChange={onOpenChange} commandProps={{ filter: paletteFilter }}>
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
                value={page.name}
                keywords={[page.href, page.desc, page.group, ...(page.keywords || [])]}
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
