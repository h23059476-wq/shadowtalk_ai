/**
 * ShadowTalk slash commands — canonical registry.
 *
 * When a user types '/' in the chat input, the SlashCommandMenu shows all
 * commands below. Selecting one inserts it into the input (user then types
 * the rest of their prompt and hits send).
 *
 * Commands map to tools in useToolOrchestrator (which do the actual work)
 * or to navigation/utility actions handled in ChatbotPage.
 */

export interface SlashCommand {
  /** The slash command users type, e.g. "/image". */
  command: string;
  /** Short label shown in the menu. */
  label: string;
  /** One-line description of what it does. */
  description: string;
  /** Example usage shown as a hint. */
  example?: string;
  /** Lucide icon name (rendered by SlashCommandMenu). */
  icon: string;
  /** Category for grouping in the menu. */
  category: "ai" | "tools" | "nav" | "utility";
  /** Whether this command requires a BYOK key (shown in the menu). */
  requiresByok?: boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // ── AI Generation ──
  {
    command: "/image",
    label: "Generate Image",
    description: "Generate an image from a text prompt (BYOK key required).",
    example: "/image a cyberpunk cat in neon city",
    icon: "ImageIcon",
    category: "ai",
    requiresByok: true,
  },
  {
    command: "/doc",
    label: "Generate Document",
    description: "Create a formal document (PDF/Word/Markdown) from a prompt.",
    example: "/doc business plan for a coffee shop",
    icon: "FileText",
    category: "ai",
  },
  {
    command: "/draft",
    label: "Draft Document",
    description: "Alias for /doc — draft a document from a prompt.",
    example: "/draft a memo about Q4 targets",
    icon: "FileText",
    category: "ai",
  },
  {
    command: "/write",
    label: "Write Document",
    description: "Alias for /doc — write a document from a prompt.",
    example: "/write a technical spec for a REST API",
    icon: "FileText",
    category: "ai",
  },
  {
    command: "/slides",
    label: "Generate Slides",
    description: "Create a presentation deck from a prompt.",
    example: "/slides pitch deck for a SaaS startup",
    icon: "Presentation",
    category: "ai",
  },
  {
    command: "/research",
    label: "Deep Research",
    description: "Run a multi-step research query with web search + synthesis.",
    example: "/research latest AI agent frameworks 2026",
    icon: "Search",
    category: "ai",
  },
  {
    command: "/search",
    label: "Web Search",
    description: "Search the web and return cited results.",
    example: "/search OpenRouter pricing changes",
    icon: "Search",
    category: "ai",
  },
  {
    command: "/strategy",
    label: "Strategy Agent",
    description: "Run the business strategy agent (SWOT, GTM, financials).",
    example: "/strategy for a B2B SaaS targeting dental clinics",
    icon: "TrendingUp",
    category: "ai",
  },
  {
    command: "/calc",
    label: "Calculator",
    description: "Evaluate a math expression.",
    example: "/calc 15 * 23 + 100 / 4",
    icon: "Calculator",
    category: "tools",
  },

  // ── Workspace & Navigation ──
  {
    command: "/ide",
    label: "Open Code IDE",
    description: "Open the in-browser code editor with live preview.",
    icon: "Code",
    category: "nav",
  },
  {
    command: "/settings",
    label: "Open Settings",
    description: "Jump to Settings (BYOK key, preferences, etc.).",
    icon: "Settings",
    category: "nav",
  },
  {
    command: "/memory",
    label: "Memory Panel",
    description: "View and manage your AI memory + business context.",
    icon: "Brain",
    category: "nav",
  },
  {
    command: "/knowledge",
    label: "Knowledge Vault",
    description: "Open the knowledge vault (saved research + notes).",
    icon: "BookOpen",
    category: "nav",
  },
  {
    command: "/security",
    label: "Security Center",
    description: "Open the security center (vault, audit, privacy score).",
    icon: "Shield",
    category: "nav",
  },
  {
    command: "/pricing",
    label: "View Pricing",
    description: "Open the pricing page.",
    icon: "CreditCard",
    category: "nav",
  },
  {
    command: "/benchmarks",
    label: "View Benchmarks",
    description: "Open the public model benchmarks page.",
    icon: "BarChart3",
    category: "nav",
  },

  // ── Utility ──
  {
    command: "/clear",
    label: "Clear Chat",
    description: "Clear the current conversation (keeps history in sidebar).",
    icon: "Trash2",
    category: "utility",
  },
  {
    command: "/new",
    label: "New Chat",
    description: "Start a new conversation.",
    icon: "Plus",
    category: "utility",
  },
  {
    command: "/help",
    label: "Help",
    description: "Show all available commands and features.",
    icon: "HelpCircle",
    category: "utility",
  },
  {
    command: "/share",
    label: "Share Conversation",
    description: "Generate a shareable link for this conversation.",
    icon: "Share2",
    category: "utility",
  },
  {
    command: "/export",
    label: "Export Workspace",
    description: "Export your chats + templates + RAG vectors as a .shadow file.",
    icon: "Download",
    category: "utility",
  },
];

/** Filter commands by a query string (e.g. "/im" → matches /image). */
export function filterSlashCommands(query: string): SlashCommand[] {
  if (!query.startsWith("/")) return [];
  const q = query.toLowerCase().trim();
  if (q === "/") return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.command.toLowerCase().startsWith(q));
}

export const SLASH_COMMAND_CATEGORIES = [
  { id: "ai", label: "AI Generation" },
  { id: "tools", label: "Tools" },
  { id: "nav", label: "Navigation" },
  { id: "utility", label: "Utility" },
] as const;
