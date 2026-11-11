import { FREE_TIER_MARKETING } from "@/lib/productClaims";

export interface DocRouteLink {
  path: string;
  label: string;
  desc: string;
  group?: string;
}

export interface DocStep {
  step: number;
  title: string;
  description: string;
}

export type DocFeatureIconKey =
  | "brain"
  | "zap"
  | "users"
  | "code"
  | "compass"
  | "search"
  | "shield"
  | "file"
  | "lock"
  | "wifi-off"
  | "key"
  | "message";

export interface DocFeatureItem {
  icon: DocFeatureIconKey;
  title: string;
  description: string;
  badge?: string;
}

export interface DocFaqItem {
  q: string;
  a: string;
}

export interface DocTroubleshootItem {
  issue: string;
  solutions: string[];
}

export interface DocWorkspaceTopic {
  title: string;
  items: string[];
}

export interface DocOverviewSection {
  title: string;
  paragraphs: string[];
}

export interface DocToolItem {
  name: string;
  trigger: string;
  description: string;
  plan?: string;
}

export interface DocPricingTier {
  name: string;
  price: string;
  tagline: string;
  highlights: string[];
}

export interface DocGlossaryItem {
  term: string;
  definition: string;
}

export interface DocMissionStep {
  step: number;
  title: string;
  description: string;
}

export const DOC_TAGLINE =
  "ShadowTalk is an agentic AI workspace — chat, tools, missions, code, research, and privacy controls in one product.";

export const DOC_OVERVIEW: DocOverviewSection[] = [
  {
    title: "What is ShadowTalk?",
    paragraphs: [
      "ShadowTalk AI is an agentic workspace at shadowtalk-ai.com. It combines encrypted chat, 30+ built-in tools, multi-step missions, a code IDE, deep research, marketplace agents, and optional on-device inference — so you can finish a job without juggling ChatGPT, Claude, and Perplexity in separate tabs.",
      "The product is built by Zain Ahmed (Zain Ahmed Fahad Patel), founder and lead architect, from Karachi, Pakistan. ShadowTalk launched in February 2024 and ships as a web app (PWA), with desktop builds available from /downloads.",
    ],
  },
  {
    title: "Who is it for?",
    paragraphs: [
      "Developers who want chat + IDE + App Builder in one flow. Founders and operators who need strategy, research, and document generation. Security-conscious users who want BYOK, Stealth Vault, or local inference. Teams exploring collaborative AI rooms and Mission Control workflows.",
      "ShadowTalk AI is free to use — all core features included, no credit card, no subscription. Bring your own AI provider API key; your provider may charge separately for API usage.",
    ],
  },
  {
    title: "How entry routing works",
    paragraphs: [
      "First-time visitors land on the marketing home at / (hero, features, pricing, use cases). Returning visitors who have chatted before, and signed-in users, are redirected straight to /chatbot — the main workspace.",
      "/home is an alias for /. The workspace path /chatbot skips the global boot screen so you can start typing immediately while the session restores.",
    ],
  },
  {
    title: "Core philosophy",
    paragraphs: [
      "Finish the job, not just reply. ShadowTalk is designed for multi-step work: research → draft → code → present, with tools and missions wired into chat instead of bolted on as afterthoughts.",
      "Privacy by choice. Cloud chat uses secure platform routing by default. You can switch to BYOK (your API keys), Stealth Vault (client-side encryption), or on-device models when sensitive work demands it.",
      "No product-level limits. Every feature is included free — /pricing explains how free access works. The only usage constraints are the ones your AI provider or infrastructure applies, never a ShadowTalk plan tier.",
    ],
  },
];

export const DOC_PRODUCT_PILLARS: DocFeatureItem[] = [
  {
    icon: "message",
    title: "Unified workspace",
    description:
      "One composer, one history, one command palette (⌘K). Chat, tools, browser, voice, and file uploads share the same thread context.",
    badge: "Core",
  },
  {
    icon: "zap",
    title: "Agentic missions",
    description:
      "Mission Control and S.E.E. (Shadow Execution Engine) run multi-step plans with human approval gates before risky tool calls.",
    badge: "Pro+",
  },
  {
    icon: "shield",
    title: "Privacy stack",
    description:
      "BYOK, Stealth Vault, sovereign data controls, transparency pages, and optional WebGPU local models — pick cloud, hybrid, or on-device.",
    badge: "Elite",
  },
  {
    icon: "code",
    title: "Builder tools",
    description:
      "Monaco IDE, App Builder, Content Forge (docs + slides), Video Studio, and WebContainer preview — output lands in /ide or /forge.",
    badge: "Core",
  },
];

export const DOC_QUICK_START: DocStep[] = [
  {
    step: 1,
    title: "Open the workspace",
    description:
      "Go to shadowtalk-ai.com/chatbot (or shadowtalk-ai.com if you are new — explore home, then click Try Chat). Anonymous sessions start automatically; link email from Profile to save history across devices.",
  },
  {
    step: 2,
    title: "Use the composer",
    description:
      "Type in the pill at the bottom. Attach files (+), pick a provider (Sovereign or BYOK), use voice (mic), and Send (Enter). Shift+Enter adds a new line. Open ⌘K for the command palette.",
  },
  {
    step: 3,
    title: "Open tools & missions",
    description:
      "Tools menu (⊞) or ⌘K: image gen, deep research, ShadowBrowser, offline tools, Mission Control. Sidebar: Intelligence Hub, IDE, Marketplace, Mission Control, Settings.",
  },
  {
    step: 4,
    title: "Personalize ShadowTalk",
    description:
      "Settings → Personal ShadowTalk Model learns your style from chats. Vault and API access are included free — /pricing explains free access.",
  },
];

export const DOC_ROUTES: DocRouteLink[] = [
  { path: "/", label: "Marketing home", desc: "Hero, features, pricing, use-case wedges, trust signals", group: "Entry" },
  { path: "/chatbot", label: "AI workspace", desc: "Main product — streaming chat, tools, history, personalities", group: "Entry" },
  { path: "/auth", label: "Sign in", desc: "Email, OAuth, link anonymous session to a permanent account", group: "Entry" },
  { path: "/pricing", label: "Pricing", desc: "Free, Pro, Premium, Elite plans and feature comparison", group: "Account" },
  { path: "/founder-access", label: "Pakistan payments", desc: "JazzCash, Easypaisa, bank transfer, USDT for local upgrades", group: "Account" },
  { path: "/profile", label: "Profile", desc: "Avatar, billing, linked accounts, API keys shortcut", group: "Account" },
  { path: "/settings", label: "Settings", desc: "Chat defaults, offline AI, BYOK keys, personalization", group: "Account" },
  { path: "/missioncontrol", label: "Mission Control", desc: "Autonomous multi-step missions with approval gates", group: "Agentic" },
  { path: "/execute", label: "Shadow Execution", desc: "S.E.E. mission runner and workflow executor", group: "Agentic" },
  { path: "/strategy", label: "Strategy Agent", desc: "Business intelligence, market analysis, planning", group: "Agentic" },
  { path: "/research", label: "Research Hub", desc: "Deep research, knowledge graph, investigation tabs", group: "Research" },
  { path: "/marketplace", label: "Marketplace", desc: "Install specialist agents — legal, code, research, and more", group: "Agents" },
  { path: "/personal-llm", label: "Personal ShadowTalk Model", desc: "On-device learning from your chats; few-shot at inference", group: "Agents" },
  { path: "/ide", label: "IDE", desc: "Monaco editor, multi-file projects, live preview, App Builder", group: "Build" },
  { path: "/forge", label: "Content Forge", desc: "Documents, slides, creative studio output", group: "Build" },
  { path: "/computer", label: "Computer Mode", desc: "WebContainer sandbox for running generated apps in-browser", group: "Build" },
  { path: "/workspace", label: "Workspace Hub", desc: "Team context, automations, business memory", group: "Build" },
  { path: "/security", label: "Security Hub", desc: "Vault, audit, trust score, cyber command modules", group: "Privacy" },
  { path: "/sovereign-data", label: "Sovereign Data", desc: "Data residency and sovereignty controls", group: "Privacy" },
  { path: "/transparency", label: "Transparency", desc: "How we handle data, models, and training policy", group: "Privacy" },
  { path: "/rooms", label: "Collaborative rooms", desc: "Real-time multi-user AI rooms (Pro+)", group: "Collaboration" },
  { path: "/insights", label: "Insights Hub", desc: "Usage analytics, behavior, activity timelines", group: "Collaboration" },
  { path: "/downloads", label: "Downloads", desc: "Desktop app (Electron), PWA install guides", group: "Platform" },
  { path: "/docs", label: "Documentation", desc: "This page — product guides, API, FAQ", group: "Help" },
  { path: "/faq", label: "FAQ", desc: "Short answers to common questions", group: "Help" },
  { path: "/changelog", label: "Changelog", desc: "Release notes and shipped features", group: "Help" },
  { path: "/contact", label: "Contact", desc: "Support form and founder email", group: "Help" },
];

export const DOC_WORKSPACE_GUIDE: DocWorkspaceTopic[] = [
  {
    title: "Chat layout",
    items: [
      "Left rail — quick nav (Chat, Explore links, Shadow Mode toggle, profile avatar).",
      "Center — messages, trust strip on empty state, or active thread with tool cards.",
      "Bottom — composer pill: attach (+), text area, provider chip, mic, send button.",
      "History panel — past conversations; archive and export included for everyone.",
      "Intelligence Hub — memory panel, knowledge vault, proactive suggestions.",
    ],
  },
  {
    title: "Sign-in & sessions",
    items: [
      "First visit can use an automatic anonymous session (when enabled in your project).",
      "Sign out is remembered — you will not be silently re-logged in until you sign in again.",
      "Link email or OAuth from Profile to keep history across devices.",
      "BYOK keys live in Settings → API keys; Sovereign uses platform routing when no custom key is set.",
      "Session restores on page load — workspace renders while auth completes (no blocking splash on /chatbot).",
    ],
  },
  {
    title: "Providers & routing",
    items: [
      "Sovereign — default platform routing to the best available model for your plan.",
      "BYOK — Gemini, Kimi when you add verified keys in Settings.",
      "Offline — install SmolLM (~130MB) or Gemma in Settings → Offline AI; hybrid router picks local vs cloud.",
      "Hardware speed routing is automatic — there is no Turbo toggle in the UI.",
      "Personal ShadowTalk Model injects few-shot examples from your past chats at inference time.",
    ],
  },
  {
    title: "High-value flows",
    items: [
      "“Build a fitness app” → App Builder opens /ide with HTML/CSS/JS and live preview.",
      "Marketplace → Run agent → /chatbot?agent=id with specialist system behavior.",
      "Deep research, image gen, ShadowBrowser — from Tools menu, ⌘K, or natural language.",
      "“Open live mode” or mic → ShadowTalk Live voice conversation.",
      "Export chat — toolbar when a conversation has messages (Pro+).",
    ],
  },
  {
    title: "Command palette (⌘K)",
    items: [
      "Navigate anywhere: IDE, Mission Control, Marketplace, Security, Forge, Settings.",
      "Open in-chat modals: deep research, image gen, browser, offline tools, memory panel.",
      "Start new chat, toggle themes, open referral or workspace hubs.",
      "Voice command system also recognizes “docs”, “settings”, “marketplace”, and more.",
    ],
  },
];

export const DOC_FEATURES: DocFeatureItem[] = [
  {
    icon: "message",
    title: "AI Chat Workspace",
    description:
      "Streaming chat, four personalities, 30+ tools, file uploads, conversation history, and viral share cards.",
    badge: "Core",
  },
  {
    icon: "zap",
    title: "Mission Control",
    description:
      "Autonomous multi-step missions with approval gates when tools need confirmation. S.E.E. quotas per plan.",
    badge: "Pro+",
  },
  {
    icon: "users",
    title: "Marketplace Agents",
    description:
      "Install specialists — legal, code, research, security — with real prompts injected into chat.",
    badge: "Core",
  },
  {
    icon: "brain",
    title: "Personal ShadowTalk Model",
    description:
      "Default “My ShadowTalk” learns tone and preferences from your chats; few-shot context at every reply.",
    badge: "Core",
  },
  {
    icon: "code",
    title: "Personal IDE & App Builder",
    description:
      "Monaco editor, multi-file projects, live preview, mobile viewport — from chat or /ide.",
    badge: "Core",
  },
  {
    icon: "compass",
    title: "ShadowBrowser",
    description:
      "AI-assisted in-app browser with summaries, bookmarks, and Browse Together mode.",
    badge: "Free",
  },
  {
    icon: "search",
    title: "Deep Research",
    description:
      "Multi-step research with citations — from chat tools and /research hub.",
    badge: "Free limits",
  },
  {
    icon: "shield",
    title: "Cyber Command",
    description:
      "Security copilot, website scans, threat intel, and ops modules under /security.",
    badge: "Security",
  },
  {
    icon: "file",
    title: "Content Forge",
    description:
      "Generate documents, contracts, NDAs, and slide decks from prompts at /forge.",
    badge: "Pro+",
  },
  {
    icon: "lock",
    title: "Stealth Vault",
    description:
      "Client-side encrypted storage for sensitive notes and documents (Elite).",
    badge: "Elite",
  },
  {
    icon: "wifi-off",
    title: "Offline AI",
    description:
      "On-device SmolLM and optional Gemma via WebGPU/WASM when hardware allows.",
    badge: "Elite",
  },
  {
    icon: "key",
    title: "BYOK",
    description:
      "Use your Gemini or Kimi keys — billed by your provider, not ShadowTalk.",
    badge: "Settings",
  },
  {
    icon: "users",
    title: "Collaborative Rooms",
    description:
      "Real-time multi-user AI rooms at /rooms with shared context (Premium+).",
    badge: "Premium+",
  },
  {
    icon: "zap",
    title: "ShadowTalk Live",
    description:
      "Real-time voice mode — say “open live mode” or tap the mic in the composer.",
    badge: "Core",
  },
  {
    icon: "code",
    title: "Computer Mode",
    description:
      "WebContainer sandbox to run and preview generated apps without leaving the browser.",
    badge: "Core",
  },
  {
    icon: "search",
    title: "Knowledge Graph",
    description:
      "Entity and relationship graph from research at /research?tab=knowledge.",
    badge: "Research",
  },
];

export const DOC_TOOLS: DocToolItem[] = [
  { name: "Web search", trigger: "search for … / google …", description: "AI-powered web search with summarized results.", plan: "Free (5/day)" },
  { name: "Deep research", trigger: "research … / deep research", description: "Multi-step investigation with sources and report output.", plan: "Free (5/day)" },
  { name: "Image generation", trigger: "generate an image of …", description: "Create images from text prompts in chat.", plan: "Free (4/day)" },
  { name: "ShadowBrowser", trigger: "open browser / browse …", description: "In-app browser with AI page analysis.", plan: "Free" },
  { name: "Code / IDE", trigger: "open ide / build an app", description: "Opens Monaco IDE or App Builder with live preview.", plan: "Free" },
  { name: "Voice / Live", trigger: "open live mode / mic", description: "Real-time voice conversation (ShadowTalk Live).", plan: "Free (3 sessions/day)" },
  { name: "Document forge", trigger: "write a contract / slides", description: "Professional documents and presentations.", plan: "Pro+" },
  { name: "Security scan", trigger: "scan this site / security audit", description: "Website header and vulnerability checks.", plan: "Core" },
  { name: "Memory panel", trigger: "⌘K → memory", description: "View and edit long-term memories extracted from chats.", plan: "Free" },
  { name: "Offline tools", trigger: "⌘K → offline", description: "Local model status, downloads, on-device inference.", plan: "Elite" },
  { name: "Mission / Execute", trigger: "open execute / start mission", description: "Launch S.E.E. or Mission Control workflows.", plan: "Pro+" },
  { name: "Marketplace agent", trigger: "run [agent] from marketplace", description: "Specialist behavior injected via ?agent= URL param.", plan: "Free" },
  { name: "Multi-model", trigger: "⌘K → multi-model", description: "Compare responses across providers side by side.", plan: "Pro+" },
  { name: "Screen agent", trigger: "⌘K → screen-agent", description: "Vision over screen context for guided tasks.", plan: "Premium+" },
];

export const DOC_MISSION_CONTROL: DocMissionStep[] = [
  {
    step: 1,
    title: "Define a goal",
    description:
      "Open /missioncontrol or /execute and describe the outcome — e.g. “Research competitors, draft a one-pager, and email me a summary.” Missions work best with clear success criteria.",
  },
  {
    step: 2,
    title: "Review the plan",
    description:
      "The agent breaks work into steps: search, read, draft, call tools. You see the plan before execution starts. Edit or cancel if the approach looks wrong.",
  },
  {
    step: 3,
    title: "Approve sensitive actions",
    description:
      "Human-in-the-loop gates pause before external emails, purchases, destructive file ops, or high-risk security tools. Approve, skip, or abort from the mission UI.",
  },
  {
    step: 4,
    title: "Track progress",
    description:
      "Live step log shows tool calls, partial outputs, and errors. Failed steps can retry with adjusted prompts. Completed missions save artifacts to chat or Forge.",
  },
  {
    step: 5,
    title: "S.E.E. quotas",
    description:
      "Shadow Execution Engine missions are unlimited for all users — no monthly quota. The only practical limits are provider API limits and mission-step timeouts.",
  },
];

export const DOC_PRIVACY_SECTIONS: DocWorkspaceTopic[] = [
  {
    title: "Cloud chat (default)",
    items: [
      "Prompts route through ShadowTalk edge functions to platform models (e.g. Gemini family).",
      "We do not train foundation models on your chat content.",
      "Conversations stored in your account for history sync — see /privacy for retention.",
      "Use BYOK or local mode when you need provider-level billing control or air-gapped inference.",
    ],
  },
  {
    title: "BYOK (Bring Your Own Key)",
    items: [
      "Add Gemini or Kimi keys in Settings → API keys.",
      "Verify the key, then select that provider in the composer chip.",
      "Prompts go directly to your provider — you pay them, not ShadowTalk.",
      "Keys are stored encrypted; revoke anytime from Settings.",
    ],
  },
  {
    title: "Stealth Vault (Elite)",
    items: [
      "Client-side encryption for notes and sensitive documents.",
      "Encryption keys derived on your device — ShadowTalk cannot read vault contents.",
      "Access from /security?tab=vault. Separate from regular chat history.",
    ],
  },
  {
    title: "On-device / offline AI (Elite)",
    items: [
      "Download SmolLM (~130MB) or larger Gemma models in Settings → Offline AI.",
      "When routing selects local, inference runs in your browser via WebGPU/WASM.",
      "Prompts for that session are not sent to ShadowTalk servers.",
      "Requires Chromium with WebGPU; PWA install recommended for offline login cache.",
    ],
  },
  {
    title: "Transparency & compliance",
    items: [
      "/transparency — data handling, model routing, training policy.",
      "/privacy, /terms, /gdpr, /cookies — legal pages.",
      "/security — audit logs, trust score, cyber modules.",
      "Enterprise SSO and compliance dashboard at /enterprise and /compliance.",
    ],
  },
];

export const DOC_PRICING_TIERS: DocPricingTier[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "Everything included — no subscription, no credit card.",
    highlights: [
      "All features unlocked for every account",
      "Bring your own AI provider API key (BYOK)",
      "Choose your preferred provider and models",
      "Your provider may charge separately for API usage",
      "Encrypted vault, missions, research, IDE included",
      "No plans, no tiers, no checkout",
    ],
  },
];


export const DOC_DESKTOP: DocWorkspaceTopic[] = [
  {
    title: "Progressive Web App (PWA)",
    items: [
      "Visit shadowtalk-ai.com/chatbot in Chrome, Edge, or Safari.",
      "Install from the browser prompt (desktop) or Add to Home Screen (mobile).",
      "Opens directly to workspace; supports offline cache for Elite users.",
    ],
  },
  {
    title: "Desktop app (Electron)",
    items: [
      "Download builds for Windows, macOS, and Linux from /downloads.",
      "Native tray, faster relaunch, bundled offline assets where available.",
      "Same account as web — sign in once, sync history.",
    ],
  },
  {
    title: "Mobile",
    items: [
      "iOS 14+ (Safari) and Android 8+ (Chrome) supported.",
      "PWA install gives app-icon launch and safe-area layout.",
      "Microphone permission required for voice and ShadowTalk Live.",
    ],
  },
];

export const DOC_GLOSSARY: DocGlossaryItem[] = [
  { term: "Sovereign routing", definition: "Default platform AI routing that picks the best available model for your plan without you managing API keys." },
  { term: "BYOK", definition: "Bring Your Own Key — use your Gemini or Kimi API credentials in chat." },
  { term: "S.E.E.", definition: "Shadow Execution Engine — multi-step autonomous mission runner at /execute." },
  { term: "Mission Control", definition: "UI at /missioncontrol for planning, approving, and monitoring agent missions." },
  { term: "Personal ShadowTalk Model", definition: "On-device learning system that captures your style from chats and injects few-shot examples at inference." },
  { term: "Stealth Vault", definition: "Client-side encrypted storage for sensitive data; Elite plan." },
  { term: "ShadowBrowser", definition: "Built-in AI-assisted browser with Browse Together analysis mode." },
  { term: "Content Forge", definition: "Document and slide generation studio at /forge." },
  { term: "WebContainer", definition: "In-browser Node runtime used by Computer Mode and IDE preview." },
  { term: "PCE", definition: "Proactive Context Engine — Premium feature that surfaces relevant context before you ask." },
];

export const DOC_FAQ: DocFaqItem[] = [
  {
    q: "Where do I start?",
    a: "New visitors: shadowtalk-ai.com (marketing home). Returning users and signed-in accounts go straight to /chatbot. Click Try Chat or open /chatbot anytime. No account required for first session if anonymous sign-in is enabled.",
  },
  {
    q: "What's the difference between / and /chatbot?",
    a: "/ is the marketing home (features, pricing, use cases). /chatbot is the product workspace. /home redirects to /. Returning visitors who have chatted before skip / and land on /chatbot automatically.",
  },
  {
    q: "Why don't I see a boot or loading screen?",
    a: "We removed the full-screen boot and “Warming up…” gate on /chatbot so you can start typing immediately while the session restores in the background.",
  },
  {
    q: "What AI models does ShadowTalk use?",
    a: "Sovereign routing uses platform models (e.g. Gemini family via our gateway). With BYOK you can use your own Gemini or Kimi keys. Offline mode uses on-device SmolLM or Gemma when installed. Plan tier affects model speed and capability.",
  },
  {
    q: "How do I add my own API key?",
    a: "Settings or Profile → API keys. Choose a provider, paste your key, verify, then select that provider in the chat composer chip.",
  },
  {
    q: "What is Mission Control?",
    a: "A multi-step agent runner at /missioncontrol — it plans tasks, calls tools, and pauses for your approval on sensitive actions before continuing.",
  },
  {
    q: "What is the Personal ShadowTalk Model?",
    a: "A default “My ShadowTalk” profile that learns from your conversations (tone, preferences, recurring topics) and adds few-shot examples to prompts. Manage it at /personal-llm or Settings → Personalization. This is prompt-level learning, not full weight fine-tuning.",
  },
  {
    q: "How does offline mode work?",
    a: "Install a local model from Settings → Offline AI (SmolLM ~130MB or larger Gemma). When offline or when routing chooses local, replies run in your browser via WebGPU/WASM. Elite plan includes full offline login with cached credentials.",
  },
  {
    q: "Is my data private?",
    a: "We don't train foundation models on your chats. BYOK sends prompts to your provider. Stealth Vault and local inference keep sensitive work on-device when you enable those features. Read /privacy and /transparency for details.",
  },
  {
    q: "Are there usage limits on the free plan?",
    a: `Free includes all features with daily caps: ${FREE_TIER_MARKETING.messages}, ${FREE_TIER_MARKETING.images}, ${FREE_TIER_MARKETING.voice}, ${FREE_TIER_MARKETING.deepResearch}, plus limits on uploads, code gen, and web search. See /pricing for the full table.`,
  },
  {
    q: "How do I pay from Pakistan?",
    a: "International cards: /pricing via Stripe. Local methods (JazzCash, Easypaisa, bank transfer, USDT): /founder-access.",
  },
  {
    q: "Can I use ShadowTalk without signing in?",
    a: "Yes, when anonymous sign-in is enabled you get a guest session with stricter caps (10 chats, 3 images, 2 deep research). Link email from Profile to keep history.",
  },
  {
    q: "How do marketplace agents work?",
    a: "Browse /marketplace, click Run on an agent — you land on /chatbot?agent=id with that specialist's system prompt and tools wired in.",
  },
  {
    q: "Does ShadowTalk have an API?",
    a: "Yes — REST endpoints on ShadowTalk backend edge functions (chat, web-search, security scan, etc.). API keys are provisioned for Elite plans; see the API tab in these docs or /api.",
  },
  {
    q: "Is there a desktop app?",
    a: "Yes — Electron builds at /downloads, plus PWA install from any Chromium browser for a native-feeling shortcut.",
  },
  {
    q: "How is ShadowTalk different from ChatGPT?",
    a: "One workspace for chat, IDE, missions, research, browser, vault, and marketplace agents — with BYOK, offline, and approval-gated missions. Free tier unlocks all feature types with limits instead of hard paywalls.",
  },
  {
    q: "Who built ShadowTalk?",
    a: "Zain Ahmed Fahad Patel (Zain Ahmed), founder and lead architect, Karachi, Pakistan. Product since February 2024. Profile: /zain-ahmed-fahad-patel · About: /about.",
  },
  {
    q: "Where can I get help?",
    a: "/faq for quick answers, /help for the help center, /contact for support, /status for uptime. Ask in-chat: “what tools do you have?” or open /docs.",
  },
];

export const DOC_TROUBLESHOOTING: DocTroubleshootItem[] = [
  {
    issue: "Messages not sending",
    solutions: [
      "Check internet connection and refresh /chatbot.",
      "Open Settings — confirm Sovereign or a verified BYOK key.",
      "No product-imposed limits: all features are free. Your AI provider may enforce its own API rate limits or charges.",
      "Hard refresh (Ctrl+Shift+R) to clear stale JS chunks after deploys.",
    ],
  },
  {
    issue: "Stuck on loading or old boot screen",
    solutions: [
      "Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).",
      "Open /chatbot directly — workspace should load without a splash.",
      "Clear site cache; a deploy may still be propagating on your CDN.",
    ],
  },
  {
    issue: "Landed on marketing home instead of chat",
    solutions: [
      "First-time visitors see / by design. Click Try Chat or go to /chatbot.",
      "Returning users with chat history should auto-redirect to /chatbot.",
      "Sign in from /auth if you want signed-in routing to the workspace.",
    ],
  },
  {
    issue: "Session not persisting",
    solutions: [
      "Avoid private browsing if you want to stay signed in.",
      "If you signed out explicitly, sign in again from /auth.",
      "Allow cookies and local storage for shadowtalk-ai.com.",
    ],
  },
  {
    issue: "Voice input not working",
    solutions: [
      "Allow microphone permission in the browser.",
      "Use Chrome or Edge for best WebRTC support.",
      "Click the mic in the composer or say “open live mode”.",
      "Check free-tier voice session limit (3/day).",
    ],
  },
  {
    issue: "Offline model won't load",
    solutions: [
      "Use Chromium with WebGPU support (Chrome 113+, Edge 113+).",
      "Install SmolLM first (~130MB) before larger Gemma models.",
      "Settings → Offline AI — check download progress and storage quota.",
      "Elite plan required for full offline login cache.",
    ],
  },
  {
    issue: "Marketplace agent not activating",
    solutions: [
      "Click Run on the agent card — URL should include ?agent=.",
      "Refresh /chatbot after install.",
      "Check network; agent config may need a fresh deploy if DB migration pending.",
    ],
  },
  {
    issue: "BYOK key rejected",
    solutions: [
      "Confirm the key is active and has billing on the provider side.",
      "Re-verify in Settings after pasting — no extra spaces.",
      "Select the matching provider chip in the composer after verification.",
    ],
  },
  {
    issue: "IDE preview blank",
    solutions: [
      "Allow third-party cookies if WebContainer is blocked.",
      "Try Computer Mode at /computer for sandboxed runs.",
      "Hard refresh /ide after large App Builder output.",
    ],
  },
];

/** Lowercase blob for client-side search across docs tabs */
export function docSearchBlob(parts: {
  features: DocFeatureItem[];
  faq: DocFaqItem[];
  troubleshooting: DocTroubleshootItem[];
  workspace: DocWorkspaceTopic[];
  overview?: DocOverviewSection[];
  tools?: DocToolItem[];
  privacy?: DocWorkspaceTopic[];
  glossary?: DocGlossaryItem[];
}): string {
  return [
    DOC_TAGLINE,
    ...DOC_QUICK_START.map((s) => `${s.title} ${s.description}`),
    ...DOC_ROUTES.map((r) => `${r.path} ${r.label} ${r.desc}`),
    ...(parts.overview ?? DOC_OVERVIEW).flatMap((o) => [o.title, ...o.paragraphs]),
    ...(parts.tools ?? DOC_TOOLS).map((t) => `${t.name} ${t.trigger} ${t.description}`),
    ...(parts.privacy ?? DOC_PRIVACY_SECTIONS).flatMap((p) => [p.title, ...p.items]),
    ...(parts.glossary ?? DOC_GLOSSARY).map((g) => `${g.term} ${g.definition}`),
    ...DOC_MISSION_CONTROL.map((m) => `${m.title} ${m.description}`),
    ...DOC_PRICING_TIERS.flatMap((p) => [p.name, p.tagline, ...p.highlights]),
    ...parts.features.map((f) => `${f.title} ${f.description}`),
    ...parts.faq.map((f) => `${f.q} ${f.a}`),
    ...parts.troubleshooting.map((t) => `${t.issue} ${t.solutions.join(" ")}`),
    ...parts.workspace.map((w) => `${w.title} ${w.items.join(" ")}`),
  ].join(" ").toLowerCase();
}
