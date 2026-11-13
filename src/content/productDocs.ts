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
  "ShadowTalk AI is a BYOK-first agentic workspace: bring your own provider key, feed it documents with local-first Stealth RAG, run approved local tools via MCP, and talk to a living voice presence in LIVE Mode — with on-device memory, honest token telemetry, and zero training on your data.";

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
      "1. BYOK-First Multi-Provider Engine: Your provider API key stays in your browser and streams directly to the provider — 16+ supported providers with per-provider context budgeting, honest token telemetry, and optional on-device WebLLM inference when the model/device path is available.",
      "2. Zero-Cloud Shadow Memory (/shadow-memory): An on-device activity ledger built on IndexedDB with automatic local storage fallback, guaranteeing zero telemetry leakage to external servers.",
      "3. The Intelligent Workspace: Stealth RAG ingests and retrieves your documents locally, the Dynamic Token Optimizer compacts context non-destructively, and the MCP Bridge runs your local tools behind explicit approvals.",
    ],
  },
  {
    title: "Privacy & Zero-Knowledge Architecture",
    paragraphs: [
      "ShadowTalk enforces a strict client-side privacy perimeter. User API keys, prompt injection filters, and on-device memory ledgers remain in your browser sandbox. We never train public foundation models on your proprietary business conversations.",
    ],
  },
  {
    title: "The Intelligent Workspace (Stealth RAG · Token Optimizer · MCP Bridge)",
    paragraphs: [
      "Stealth RAG: drop a document into chat and it is extracted, chunked, embedded and indexed entirely on your device (IndexedDB, isolated per user and project), then retrieved automatically into the conversation. The default embedder is honest on-device feature hashing; neural embeddings are an explicit opt-in via your own BYOK key on documented provider endpoints only.",
      "Dynamic Token Optimizer: per-provider context windows and output caps for every BYOK provider, CJK-aware token estimation, and non-destructive compaction — decisions, requirements, open questions and your recent message floor are protected, summaries are computed locally at zero cost, and your stored conversation is never rewritten.",
      "MCP Bridge: a zero-dependency Node companion pairs with your browser over loopback (127.0.0.1 only, token-gated, DNS-rebinding defended) so approved local tools can be invoked from chat — every tool starts at ask-every-use, and write/execute tools always prompt.",
    ],
  },
  {
    title: "LIVE Voice Mode — A Presence, Not a Chatbot",
    paragraphs: [
      "LIVE Mode is a full-screen voice conversation with a living avatar: a canvas-rendered presence that breathes, blinks, and morphs with real microphone and TTS amplitude, its aura re-tinting per phase (idle, listening, thinking, speaking).",
      "Interruption is hands-free: while the AI speaks, the mic keeps metering and sustained speech hands you the floor instantly (echo-cancelled, with a grace period and cooldown so the AI never interrupts itself). Tap-to-interrupt remains as a fallback.",
      "Replies stream in as they generate — the first sentence is spoken roughly a second after you stop talking — and a rhythm engine strips emoji and markdown before TTS and inserts punctuation-aware pauses between sentences.",
    ],
  },
  {
    title: "AI Provider Routing & Hybrid Intelligence",
    paragraphs: [
      "ShadowTalk is BYOK-first: the browser streams directly to your configured provider (OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together, Fireworks, DeepSeek, xAI, Cohere, Perplexity, Hyperbolic, Novita, DeepInfra, and more) using your own key from Settings → Personalization → BYOK.",
      "Streaming is native: provider deltas (onDelta) feed both the chat surface and LIVE Mode's speech pipeline, so voice replies begin speaking the first completed sentence while the rest is still generating.",
      "LocalAIProvider: Manages fully offline inference using the WebLLM engine, dynamically falling back to local models when disconnected. A shared-gateway path exists for accounts without a key — with honest errors, never fake responses."
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
    title: "BYOK Multi-Provider Engine",
    description: "Direct browser-to-provider streaming across 16+ providers with per-provider context budgeting and on-device WebGPU fallback.",
    badge: "Core Engine",
  },
  {
    icon: "file",
    title: "Intelligent Workspace",
    description: "Stealth RAG document ingestion and retrieval, non-destructive context compaction, and approval-gated local MCP tools.",
    badge: "Workspace",
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
      "Send prompts in /chatbot on your own BYOK provider key, drag documents in for automatic local retrieval, or tap the phone icon for LIVE voice conversation with a hands-free, interruptible presence.",
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
  { path: "/chatbot", label: "AI Chatbot Workspace", desc: "Main product — streaming chat on your BYOK provider, drag-drop document ingestion (Stealth RAG), MCP tool approvals, and LIVE voice mode", group: "Core AI" },
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
  { path: "/status", label: "Service Status", desc: "Component catalog of ShadowTalk services with an honest notice that live monitoring and incident history are not yet wired", group: "Public" },
  { path: "/security", label: "Security & Trust Center", desc: "Client-side key storage, zero-training guarantee, encryption posture, and proxy safety documentation", group: "Public" },
];

export const DOC_WORKSPACE_GUIDE: DocWorkspaceTopic[] = [
  {
    title: "AI Chatbot Workspace (/chatbot)",
    items: [
      "Center Feed: High-speed streaming AI responses with syntax-highlighted code blocks, copy actions, and markdown rendering.",
      "Composer Controls: Dynamic input supporting text, file attachments (+ Attach), voice input (Mic), keyboard fallback in LIVE Mode, and model toggling.",
      "Prompt Injection Shield: Real-time client-side heuristics that detect and neutralize prompt hacking attempts before reaching the LLM.",
      "Multi-Model Switching: Bring your own key and swap between any supported BYOK provider and model per conversation.",
      "Context Indicator: See which documents and memories are in scope for the current conversation.",
    ],
  },
  {
    title: "Intelligent Workspace (Stealth RAG & Token Optimizer)",
    items: [
      "Drag-Drop Ingestion: Drop documents into chat or use the composer paperclip — extraction supports PDF, DOCX, PPTX, XLSX, ODT, TXT/MD/CSV/JSON and code (25 MB cap).",
      "Local Indexing: Documents are chunked and embedded on-device in IndexedDB, isolated by user and project; deletion removes everything atomically.",
      "Automatic Retrieval: Relevant passages are retrieved into the conversation automatically — non-fatal on any failure, and the RAG module stays out of the initial chat bundle.",
      "Honest Embeddings: The default on-device embedder is lexical feature hashing (disclosed as such); remote neural embeddings are an explicit opt-in using your own BYOK key on documented endpoints only.",
      "Non-Destructive Compaction: When context overflows, a local extractive summary reshapes only the outgoing request — decisions, requirements, open questions and your recent message floor are never compacted, and stored history is never rewritten.",
    ],
  },
  {
    title: "LIVE Voice Mode",
    items: [
      "Living Avatar: A canvas-rendered presence that breathes, blinks, and morphs with real microphone and TTS amplitude, with a phase-colored aura (idle, listening, thinking, speaking).",
      "Hands-Free Barge-In: Talk over the AI while it speaks — sustained speech interrupts it (echo-cancelled, with grace period and cooldown). Tap-to-interrupt remains as a fallback.",
      "Streaming Speech: Replies are spoken sentence by sentence as the model generates, with punctuation-aware pauses and emoji/markdown stripped before TTS.",
      "Premium Voices: ElevenLabs HD voices with your own key, browser speech-synthesis fallback otherwise.",
      "Captions & Transcript: Live captions show your words and the AI's current sentence; a compact transcript strip keeps recent turns visible.",
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
    icon: "file",
    title: "Stealth RAG Ingestion",
    description: "Drag documents into chat — extracted, chunked, embedded and indexed on-device with automatic, non-fatal retrieval.",
    badge: "Workspace",
  },
  {
    icon: "message",
    title: "LIVE Voice Mode",
    description: "Full-screen voice conversation with a living avatar, hands-free barge-in, and streaming sentence-by-sentence speech.",
    badge: "Voice",
  },
  {
    icon: "brain",
    title: "MCP Local Tools",
    description: "Run your local MCP servers via a zero-dependency companion with loopback pairing and approval-gated invocation.",
    badge: "Agentic",
  },
  {
    icon: "code",
    title: "BYOK Provider Portal",
    description: "Manage your own provider keys, model selection, and provider switching (/developers, configured in /settings → Personalization).",
    badge: "API",
  },
  {
    icon: "compass",
    title: "Organization Administration",
    description: "Internal admin console at /admin — organization seats and governance; metrics land as Firestore aggregates go live.",
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
    name: "Voice Input & LIVE Mode",
    trigger: "Composer Microphone button or LIVE phone icon",
    description: "Web Speech recognition for dictation; LIVE Mode adds a living avatar, hands-free barge-in, and streaming TTS (ElevenLabs with your key, browser fallback otherwise).",
    plan: "All Plans",
  },
  {
    name: "Stealth RAG Retrieval",
    trigger: "Drag-drop or paperclip in /chatbot",
    description: "Local-first document ingestion and automatic retrieval — on-device embeddings, user/project isolation, zero configuration.",
    plan: "All Plans",
  },
  {
    name: "MCP Local Tools",
    trigger: "Settings → Local Tools (companion pairing)",
    description: "Intent-matched invocation of your local MCP servers with granular permissions and approval dialogs for sensitive actions.",
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
    title: "Bring Your Own Keys (BYOK)",
    items: [
      "Configure your personal provider keys in /settings → Personalization → BYOK.",
      "Keys are stored client-side in your browser (localStorage, per-user) and dispatched directly to provider endpoints — never to ShadowTalk backend servers.",
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
    term: "BYOK Engine",
    definition: "ShadowTalk's direct browser-to-provider request path: your key streams to your chosen provider, with per-provider context budgeting from the Dynamic Token Optimizer.",
  },
  {
    term: "Stealth RAG",
    definition: "Local-first retrieval: documents are extracted, chunked, embedded and indexed on-device and retrieved automatically into conversations — no retrieval configuration exposed.",
  },
  {
    term: "MCP Bridge",
    definition: "A zero-dependency local companion that pairs with your browser over loopback to run your MCP tools behind explicit, per-tool approvals.",
  },
  {
    term: "LIVE Mode",
    definition: "Full-screen voice conversation with a living canvas avatar, hands-free barge-in, and streaming sentence-by-sentence TTS.",
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
    a: "Whatever your provider offers — ShadowTalk streams directly to your BYOK provider (OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, DeepSeek, and more) with per-provider context budgeting. On capable devices, on-device WebGPU (WebLLM) models work fully offline.",
  },
  {
    q: "How do I manage my provider keys?",
    a: "ShadowTalk is BYOK-first: add your provider key in /settings → Personalization → BYOK. Keys stay in your browser's local storage and are sent directly to the provider — never to ShadowTalk servers. The /developers page documents the provider portal.",
  },
  {
    q: "How does LIVE voice mode work?",
    a: "Tap the phone icon in /chatbot. You get a full-screen conversation with a living avatar: replies stream in sentence by sentence, and you can interrupt hands-free simply by speaking. ElevenLabs HD voices use your own key; browser speech synthesis is the fallback.",
  },
  {
    q: "What happens to documents I drop into chat?",
    a: "They are extracted, chunked, embedded and indexed entirely on your device (IndexedDB, isolated per user and project), and relevant passages are retrieved automatically into the conversation. Nothing is uploaded unless you explicitly opt into a remote embedding provider with your own key.",
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
  {
    issue: "LIVE voice mode has no sound or can't hear me",
    solutions: [
      "Allow microphone permissions for the site — barge-in and dictation both need the mic.",
      "Use Chrome, Edge, or Safari: Web Speech recognition is not supported in all browsers (Firefox lacks it).",
      "For premium HD voices, add an ElevenLabs key in LIVE Mode settings (gear icon); otherwise browser speech synthesis is used.",
      "If the AI interrupts itself, lower the speaker volume — echo cancellation handles most bleed, but very loud speakers can re-trigger barge-in.",
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
