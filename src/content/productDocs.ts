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
  "ShadowTalk AI is an elite agentic intelligence platform combining ultra-fast cloud models, high-performance WebGPU execution, persistent Business Memory, real-time analytics, and client-side cryptographic audit ledgers.";

export const DOC_OVERVIEW: DocOverviewSection[] = [
  {
    title: "What is ShadowTalk AI?",
    paragraphs: [
      "ShadowTalk AI is a production-grade, high-performance agentic workspace designed for engineers, researchers, founders, and enterprises. It unifies low-latency cloud inference, local edge intelligence, and deep operational customization into a distraction-free environment.",
      "Rather than treating AI as a disposable chat session, ShadowTalk maintains your business context through dedicated Business Memory, tracks execution metrics via interactive Analytics, and writes an encrypted activity ledger directly to your device via Shadow Memory.",
    ],
  },
  {
    title: "Core Architectural Foundations",
    paragraphs: [
      "1. Multi-Tier Turbo Engine: Dynamically routes prompts between ultra-fast Groq Llama-3.3 70B (600+ tok/s), DeepSeek R1 reasoning, OpenAI GPT-4o multimodal, and in-browser WebGPU runtimes.",
      "2. Zero-Cloud Shadow Memory (/shadow-memory): An on-device cryptographic ledger built on IndexedDB with automatic local storage fallback, guaranteeing zero telemetry leakage to external servers.",
      "3. Enterprise SaaS & Governance: Organization administration (/admin), developer APIs (/developers), and immutable compliance trails (/audit-logs).",
    ],
  },
  {
    title: "Privacy & Zero-Knowledge Architecture",
    paragraphs: [
      "ShadowTalk enforces a strict client-side privacy perimeter. User API keys, prompt injection filters, and on-device memory ledgers remain in your browser sandbox. We never train public foundation models on your proprietary business conversations.",
    ],
  },
  {
    title: "AI Provider Routing & Hybrid Intelligence",
    paragraphs: [
      "The AIProviderRouter serves as the brain of ShadowTalk's hybrid execution model. It intercepts every prompt and intelligently routes it based on network availability and model constraints.",
      "CloudAIProvider: Manages lightning-fast streaming for Groq, DeepSeek, and OpenAI endpoints via standardized fetch protocols.",
      "LocalAIProvider: Manages fully offline inference using the WebLLM engine, dynamically falling back to local models when disconnected."
    ]
  },
  {
    title: "Web Worker Inference Engine",
    paragraphs: [
      "To guarantee 60fps UI responsiveness during offline execution, the LocalInferenceEngine isolates the WebLLM runtime entirely in a background Web Worker (llm.worker.ts).",
      "Model weights are cached locally via Cache Storage/OPFS, preventing expensive re-downloads, while the main thread remains free from heavy tensor computations."
    ]
  },
  {
    title: "Activation & TTFV Telemetry",
    paragraphs: [
      "ShadowTalk measures Time To First Value (TTFV) through the ActivationAnalytics service.",
      "Every session is tracked from initial load to the first successful generation (both online and offline), logging anonymized metadata to Firestore while keeping prompt content strictly on-device."
    ]
  }
];

export const DOC_PRODUCT_PILLARS: DocFeatureItem[] = [
  {
    icon: "zap",
    title: "Multi-Model Turbo Engine",
    description: "Intelligent high-speed routing across Groq Llama-3.3 70B, DeepSeek R1, GPT-4o, and on-device WebGPU models.",
    badge: "Core Engine",
  },
  {
    icon: "lock",
    title: "Shadow Memory Journal",
    description: "100% on-device IndexedDB activity ledger with parameter inspection and multi-format exports (/shadow-memory).",
    badge: "Privacy",
  },
  {
    icon: "shield",
    title: "Real-Time Telemetry & Analytics",
    description: "Production Recharts dashboard measuring tokens, response latency, and feature usage (/analytics).",
    badge: "Intelligence",
  },
];

export const DOC_QUICK_START: DocStep[] = [
  {
    step: 1,
    title: "Launch the AI Workspace",
    description:
      "Navigate to /chatbot. Anonymous sessions begin immediately. Sign in via /auth to synchronize your sessions and organization seats.",
  },
  {
    step: 2,
    title: "Engage with Multi-Model AI",
    description:
      "Send prompts in /chatbot using Turbo Engine speed routing. Use voice input, attach technical files, or test complex reasoning with DeepSeek R1.",
  },
  {
    step: 3,
    title: "Inspect Audit Logs",
    description:
      "Inspect your on-device cryptographic activity trail in /shadow-memory.",
  },
];

export const DOC_ROUTES: DocRouteLink[] = [
  // Core AI & Chat
  { path: "/chatbot", label: "AI Chatbot Workspace", desc: "Main product — streaming chat, multi-model selection, prompt injection defense, and voice input", group: "Core AI" },
  { path: "/analytics", label: "Production Analytics", desc: "Interactive charts for message volume, token synthesis, model distribution, and downloadable reports", group: "Core AI" },
  { path: "/shadow-memory", label: "Shadow Memory Journal", desc: "100% on-device IndexedDB cryptographic ledger with parameter inspection and CSV/JSON/Log export", group: "Core AI" },
  { path: "/sessions", label: "Session History", desc: "Browse, restore, search, and manage archived chat sessions across devices", group: "Core AI" },
  { path: "/templates", label: "Prompt Templates", desc: "Curated library of high-impact engineering, marketing, and strategic prompts", group: "Core AI" },
  { path: "/studio", label: "Model Playground", desc: "Fine-tune AI hyperparameters (temperature, top_p, frequency penalty) across providers", group: "Core AI" },
  { path: "/private-ai", label: "Private AI Hub", desc: "Edge AI architecture featuring in-browser WebGPU execution and zero cloud telemetry", group: "Core AI" },

  // Digital Twin & Sharing
  { path: "/shadow-twin", label: "Shadow Twin Studio", desc: "Configure your personal AI twin, tone settings, and custom public persona", group: "Shadow Twin" },
  { path: "/t/:username", label: "Public Twin Chat", desc: "Interactive public chat URL allowing others to interact with your published Shadow Twin", group: "Shadow Twin" },
  { path: "/s/:slug", label: "Shared Answer Viewer", desc: "Clean, read-only public viewer for shared chat solutions and code artifacts", group: "Shadow Twin" },

  // Enterprise & Developers
  { path: "/developers", label: "Developer Portal", desc: "BYOK provider keys, model selection, and provider switching (in /settings → Personalization)", group: "Enterprise" },
  { path: "/admin", label: "Organization Admin", desc: "Internal admin shell — currently shows zero placeholder metrics until live Firestore aggregates are wired", group: "Enterprise" },
  { path: "/billing", label: "Billing & Subscriptions", desc: "Free access — no subscriptions, no invoices. Provider API charges are between you and your provider.", group: "Enterprise" },
  // Note: /audit-logs route was previously listed here but does not exist in the app. Removed during the 2026-11-13 audit. See docs/audit/CLAIMS_REALITY_REPORT.md P2-9.

  // Public & Portal
  { path: "/home", label: "Marketing Home", desc: "Feature showcases, speed benchmarks, use-case wedges, and product tour", group: "Public" },
  { path: "/pricing", label: "Pricing & Plans", desc: "Free access — every feature, no subscriptions, no checkout. BYOK model.", group: "Public" },
  { path: "/docs", label: "System Documentation", desc: "Complete reference guides, API specifications, and troubleshooting playbooks", group: "Public" },
  { path: "/about", label: "About ShadowTalk", desc: "Our team, privacy philosophy, architectural principles, and leadership", group: "Public" },
  { path: "/changelog", label: "Product Changelog", desc: "Release notes, deployed optimizations, and platform version milestones", group: "Public" },
  { path: "/auth", label: "Authentication Portal", desc: "Sign in, account creation, password recovery, and enterprise OAuth", group: "Public" },
];

export const DOC_WORKSPACE_GUIDE: DocWorkspaceTopic[] = [
  {
    title: "AI Chatbot Workspace (/chatbot)",
    items: [
      "Center Feed: High-speed streaming AI responses with syntax-highlighted code blocks, copy actions, and markdown rendering.",
      "Composer Controls: Dynamic input supporting text, file attachments (+ Attach), voice transcription (Mic), and model toggling.",
      "Prompt Injection Shield: Real-time client-side heuristics that detect and neutralize prompt hacking attempts before reaching the LLM.",
      "Multi-Model Switching: Seamlessly swap between Groq Llama-3.3 70B Turbo, DeepSeek R1, and OpenAI GPT-4o.",
    ],
  },
  {
    title: "Production Analytics (/analytics)",
    items: [
      "KPI Metric Cards: Live count of Total Messages, Total Tokens Processed, Average Response Latency (620ms), and Privacy Score (100%).",
      "Interactive Visualizations: Daily message volume AreaChart, token usage LineChart, feature breakdown BarChart, and model distribution Donut PieChart.",
      "Report Export: Download a timestamped .json telemetry snapshot for compliance and reporting.",
    ],
  },
  {
    title: "On-Device Shadow Memory (/shadow-memory)",
    items: [
      "100% Client Isolation: All activities are stored in IndexedDB on your device — never transmitted to cloud servers.",
      "Detailed Activity Journal: Logs chat sessions, vault operations, web searches, code generation, voice queries, and system events.",
      "Parameters Inspector: Expandable JSON viewer for event metadata and execution parameters.",
      "Multi-Format Export: Download your full activity history as JSON, CSV, or raw plaintext .log files.",
    ],
  },
  {
    title: "Offline Mode & Local Edge AI (PWA)",
    items: [
      "Zero-Cloud Execution: ShadowTalk can run entirely disconnected from the internet, leveraging WebGPU to run localized models.",
      "Background Model Loading: The LocalInferenceEngine utilizes a Web Worker to ensure UI responsiveness while models are loaded and running.",
      "Progressive Web App (PWA): Install ShadowTalk on your device to cache application assets and run AI models without an active network connection.",
      "Intelligent Fallbacks: Tools requiring the cloud (e.g. real-time web search) are automatically queued in IndexedDB and execute upon reconnection.",
      "Architecture: The LocalInferenceEngine relies on a persistent Web Worker (`llm.worker.ts`) to manage model weights. By caching the model in IndexedDB (OPFS), subsequent loads are near-instant, providing an unparalleled user experience even in airplane mode."
    ],
  }
];

export const DOC_FEATURES: DocFeatureItem[] = [
  {
    icon: "zap",
    title: "Multi-Model Turbo Engine",
    description: "Blazing fast streaming through Groq Llama-3.3 70B (600+ tok/s), DeepSeek R1, and GPT-4o.",
    badge: "Engine",
  },
  {
    icon: "lock",
    title: "Shadow Memory Ledger",
    description: "Tamper-evident on-device IndexedDB activity journal with zero cloud telemetry leakage (/shadow-memory).",
    badge: "Privacy",
  },
  {
    icon: "shield",
    title: "Live Production Analytics",
    description: "Real-time token synthesis tracking, latency monitoring, and exportable JSON reports (/analytics).",
    badge: "Metrics",
  },
  {
    icon: "users",
    title: "Shadow Twin Clones",
    description: "Train an AI digital twin matching your writing style and publish shareable chat links (/t/:username).",
    badge: "Persona",
  },
  {
    icon: "wifi-off",
    title: "Private AI WebGPU",
    description: "Run quantized LLMs directly inside your browser GPU with zero external network connectivity.",
    badge: "Offline",
  },
  {
    icon: "code",
    title: "Developer REST API",
    description: "Programmatic API key generation, webhooks, and SDK quickstarts for enterprise automation (/developers).",
    badge: "API",
  },
  {
    icon: "compass",
    title: "Enterprise Administration",
    description: "Manage team seats, organizational governance, and compliance audit logs (/admin & /audit-logs).",
    badge: "Enterprise",
  },
];

export const DOC_TOOLS: DocToolItem[] = [
  {
    name: "Business Memory Injector",
    trigger: "Automatic in /chatbot or configure in /workspace",
    description: "Injects active company profile, brand voice rules, and customer parameters directly into the LLM system prompt.",
    plan: "All Plans",
  },
  {
    name: "Shadow Memory Tracker",
    trigger: "Automatic background client logging",
    description: "Records user actions, navigation, searches, and vault events into on-device IndexedDB storage.",
    plan: "All Plans",
  },
  {
    name: "Voice Transcription (Whisper)",
    trigger: "Composer Microphone button",
    description: "Transcribes voice queries in real-time with high-accuracy speech-to-text recognition.",
    plan: "All Plans",
  },
  {
    name: "Prompt Injection Filter",
    trigger: "Pre-flight message verification",
    description: "Sanitizes malicious prompt override and jailbreak attempts before dispatching to model endpoints.",
    plan: "All Plans",
  },
  {
    name: "Deep Web Search",
    trigger: "Natural language query or Search mode",
    description: "Fetches grounded, up-to-date web intelligence with source citations.",
    plan: "Free (BYOK)",
  },
  {
    name: "Analytics Report Generator",
    trigger: "Click 'Export Report' in /analytics",
    description: "Generates an audit-ready JSON payload documenting token volumes, latency, and model metrics.",
    plan: "All Plans",
  },
];

export const DOC_MISSION_CONTROL: DocMissionStep[] = [
  {
    step: 1,
    title: "Initiate Autonomous Mission",
    description: "Define an objective in /studio or /chatbot specifying target deliverables, tools, and constraints.",
  },
  {
    step: 2,
    title: "Multi-Agent Synthesis",
    description: "The AI breaks the objective into subtasks, queries external sources, and executes step-by-step reasoning.",
  },
  {
    step: 3,
    title: "Review & Audit Output",
    description: "Inspect generated code, reports, or data artifacts, with all actions logged to your local Shadow Memory.",
  },
];

export const DOC_PRIVACY_SECTIONS: DocWorkspaceTopic[] = [
  {
    title: "Zero Cloud Training Guarantee",
    items: [
      "ShadowTalk AI does not use your proprietary prompts, business memories, or file attachments to train foundation models.",
      "All on-device memory entries are restricted to local IndexedDB and never mirrored to external logging servers.",
    ],
  },
  {
    title: "",
    items: [
      "Configure your personal Groq, OpenAI, or Anthropic API keys in /settings.",
      "Keys are stored in encrypted client-side browser storage and dispatched directly to provider endpoints.",
    ],
  },
  {
    title: "Client-Side Isolation & Kill Switch",
    items: [
      "Immediate session wiping through the Stealth Kill Switch in the navigation bar.",
      "One-click 'Erase All' in /shadow-memory instantly purges all local cryptographic records.",
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
      "Install ShadowTalk directly from your browser (Chrome, Edge, Safari) for a native window experience.",
      "Supports offline launch with cached credentials and on-device WebGPU model execution.",
    ],
  },
  {
    title: "Hardware Acceleration",
    items: [
      "Leverages WebGPU for hardware-accelerated on-device neural processing.",
      "Requires modern Chromium or Safari with WebGPU support enabled.",
    ],
  },
];

export const DOC_GLOSSARY: DocGlossaryItem[] = [
  {
    term: "Turbo Engine",
    definition: "ShadowTalk's dynamic routing mechanism that balances lightning-fast Groq Llama-3.3 70B with DeepSeek R1 and OpenAI GPT-4o.",
  },
  {
    term: "Business Memory",
    definition: "Persistent organizational context items (Profile, Voice, Customers, Facts) injected into AI prompts via /workspace.",
  },
  {
    term: "Shadow Memory",
    definition: "An encrypted on-device activity journal stored in IndexedDB that records user events with zero cloud sync via /shadow-memory.",
  },
  {
    term: "Shadow Twin",
    definition: "A personalized AI clone trained on your tone and preferences with a public shareable interface (/t/:username).",
  },
  {
    term: "WebGPU Runtime",
    definition: "In-browser neural inference allowing local LLMs to execute directly on your graphics hardware without an internet connection.",
  },
  {
    term: "Prompt Injection Shield",
    definition: "Real-time client-side heuristic filters that inspect incoming inputs to prevent adversarial jailbreaks or unauthorized system overrides.",
  },
  {
    term: "Developer Portal",
    definition: "The developer workspace at /developers providing REST API tokens, usage quotas, webhooks, and code examples.",
  },
];

export const DOC_FAQ: DocFaqItem[] = [
  {
    q: "What makes ShadowTalk different from standard chat tools?",
    a: "ShadowTalk combines multi-model cloud intelligence (Groq Llama-3.3, DeepSeek R1, GPT-4o) with on-device WebGPU privacy, persistent Business Memory (/workspace), and a zero-cloud encrypted telemetry journal (/shadow-memory).",
  },
  {
    q: "How does Business Memory work?",
    a: "Business Memory lets you record company facts, voice parameters, customer profiles, and custom rules in /workspace. When active, these memories are automatically formatted and injected into your chatbot system prompt so the AI always knows your exact context.",
  },
  {
    q: "Where is Shadow Memory stored?",
    a: "Shadow Memory is stored 100% locally on your device inside your browser's IndexedDB engine (with local storage fallback). No activity telemetry is ever dispatched to our servers.",
  },
  {
    q: "Which AI models can I use?",
    a: "ShadowTalk natively routes between Groq Llama-3.3 70B Turbo, DeepSeek R1 reasoning, OpenAI GPT-4o, and on-device WebGPU edge models. You can also supply your own API keys in /settings.",
  },
  {
    q: "How do I access the Developer API?",
    a: "Navigate to /developers to generate your Bearer API tokens, view rate limits, configure webhooks, and read endpoint specifications.",
  },
  {
    q: "How does authentication and session persistence work?",
    a: "When you sign in at /auth, you are redirected directly to /chatbot. Your session remains securely authenticated until you explicitly choose to log out.",
  },
];

export const DOC_TROUBLESHOOTING: DocTroubleshootItem[] = [
  {
    issue: "Messages not streaming or sending",
    solutions: [
      "Check your internet connection.",
      "Verify your API keys in /settings → Personalization → BYOK (OpenAI, Groq, Anthropic, etc.). Do NOT put provider API keys in .env — VITE_* values are embedded in browser bundles.",
      "If using a private window where IndexedDB is blocked, ShadowTalk automatically uses local storage fallback.",
    ],
  },
  {
    issue: "Business Memory not appearing in AI answers",
    solutions: [
      "Navigate to /workspace and ensure the memory toggle is switched to 'Active'.",
      "Click 'Preview AI Context' in /workspace to verify the formatted context block contains your rules.",
      "Refresh the chat session or start a new conversation to apply context updates.",
    ],
  },
  {
    issue: "Shadow Memory ledger appears empty",
    solutions: [
      "Click 'Seed Demo Logs' in /shadow-memory to populate baseline security and telemetry activities.",
      "Ensure browser storage permissions are granted for IndexedDB.",
    ],
  },
];

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
