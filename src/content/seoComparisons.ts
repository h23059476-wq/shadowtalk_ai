import type { GuideRelated } from "./seoGuides";

/**
 * SEO/GEO/AEO comparison content — one head-to-head page per high-intent
 * "X vs Y" search cluster, plus a hub at /compare.
 *
 * Every landscape fact here is checkable and dated (Nov 2026):
 *  - LM Studio device sync is an open feature request (#2467); ChatterUI's
 *    WebDAV chat merge is unshipped.
 *  - Proton's published Lumo security model documents server-side processing
 *    of decrypted prompts.
 *  - web-llm-chat / Secret Llama are local browser demos without sync or
 *    durable storage.
 *  - Ollama is a local runtime/server; chats stay on one machine.
 *  - Perplexity is a cloud answer engine (free tier ad-supported).
 *
 * Honesty rules enforced by seoGrowth.test.ts:
 *  - every page carries a "where the other tool wins" section (no rag claims)
 *  - every verdict states the category claim with its intersection point
 *  - ShadowTalk's own defaults (server-side storage when Private Mode is off,
 *    shared mode server transit) are stated where relevant
 */

export type ComparisonEdge = "shadowtalk" | "them" | "both" | "neither";

export interface ComparisonRow {
  dimension: string;
  shadowtalk: string;
  them: string;
  edge: ComparisonEdge;
}

export interface SeoComparison {
  slug: string;
  competitor: string;
  breadcrumb: string;
  h1: string;
  /** Extractive two-to-three-sentence verdict — the block answer engines quote */
  definition: string;
  intro: string;
  rows: ComparisonRow[];
  whereTheyWinHeading: string;
  whereTheyWin: string[];
  verdictHeading: string;
  verdictParagraphs: string[];
  faqs: Array<{ question: string; answer: string }>;
  related: GuideRelated[];
  ctaLabel: string;
}

export const COMPARE_SLUGS = [
  "chatgpt",
  "gemini",
  "claude",
  "lm-studio",
  "proton-lumo",
  "web-llm-chat",
  "ollama",
  "jan",
  "perplexity",
  "poe",
  "pocketpal",
  "deepseek",
  "copilot",
  "grok",
  "duckduckgo-ai",
  "brave-leo",
] as const;

export const SEO_COMPARISONS: Record<string, SeoComparison> = {
  chatgpt: {
    slug: "chatgpt",
    competitor: "ChatGPT",
    breadcrumb: "ShadowTalk vs ChatGPT",
    h1: "ShadowTalk AI vs ChatGPT — offline, private, and free vs the cloud giant",
    definition:
      "ChatGPT is a cloud service: every answer is generated on OpenAI's servers, an account is required, and without internet it cannot answer at all. ShadowTalk AI is a free browser workspace that runs a model on your own device, queues chats sent offline and syncs them when you're back, and never trains on your data — the first AI chat in a browser that works offline and syncs when you're back.",
    intro:
      "This comparison is deliberately concrete: what each product does offline, where your prompts are processed, what an account buys you, and what each one costs. We say where ChatGPT wins, too — because a comparison that hides the other side's strengths is marketing, not research.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — after a one-time model download, inference runs on your device with zero network egress",
        them: "No — every token is generated on OpenAI's servers, so no connection means no answers",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync automatically when signal returns",
        them: "Not applicable — the app itself requires a connection",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "Yes — account required for use",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk:
          "16+ providers via BYOK: OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter and more — pick per task",
        them: "OpenAI models only",
        edge: "shadowtalk",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk:
          "Private Mode encrypts chats end-to-end (AES-256-GCM) with device-derived keys. Honest default: chats are stored server-side when Private Mode is off",
        them: "Stored server-side with opt-out training controls; no client-side end-to-end encryption",
        edge: "shadowtalk",
      },
      {
        dimension: "Training on your chats",
        shadowtalk: "Never — on any tier, including free shared mode",
        them: "Free-tier conversations can be used for training unless you opt out",
        edge: "shadowtalk",
      },
      {
        dimension: "Deep research with citations",
        shadowtalk: "Built into the chat workspace, free",
        them: "Built in — heavier research gated to paid tiers",
        edge: "both",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK passes provider costs straight through at cost",
        them: "Free tier with limits; subscription for heavier use",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where ChatGPT wins",
    whereTheyWin: [
      "Frontier-model quality: OpenAI's flagship models reason better than anything that fits in a browser tab — if you need maximum capability and are always online, that matters",
      "Ecosystem: custom GPTs, mature mobile apps, wide third-party integrations and voice that feels native",
      "Reliability at scale: a decade of infrastructure investment behind every answer",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Choose ChatGPT when you want the strongest frontier models and live inside its ecosystem, always online. Choose ShadowTalk when the network disappears, when you don't want an account, when you want your pick of 16+ providers through one workspace, or when you want encryption you control — ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, and ChatGPT is structurally unable to say that.",
      "They are not mutually exclusive: many ShadowTalk users keep BYOK OpenAI keys, so their ShadowTalk workspace calls the same frontier models ChatGPT does — with offline fallback and a privacy dial around them.",
    ],
    faqs: [
      {
        question: "Can ChatGPT work offline?",
        answer:
          "No. ChatGPT is a cloud service — prompts and responses are generated on OpenAI's servers, so without internet neither the web app nor the mobile app can produce an answer. If you need offline AI chat, you need an on-device model like ShadowTalk's WebGPU mode, LM Studio, or Ollama.",
      },
      {
        question: "Is ShadowTalk AI really free where ChatGPT charges?",
        answer:
          "ShadowTalk AI is free to use with no subscription and no card. On-device models cost nothing to run; cloud models are free within shared-tier daily limits or unlimited with your own API key (BYOK) — your provider may charge for API usage at cost, with no markup. ChatGPT's heavier usage and research features sit behind a subscription.",
      },
      {
        question: "Which one is more private?",
        answer:
          "It depends on the tier you choose, and ShadowTalk publishes the limits: on-device chat has zero network egress, Private Mode encrypts stored chats end-to-end (AES-256-GCM), and BYOK requests go browser-to-provider — but default chats are stored server-side when Private Mode is off, and free shared-mode requests transit ShadowTalk's server. ChatGPT offers no end-to-end encryption and uses free-tier conversations for training unless you opt out. ShadowTalk never trains on your chats on any tier.",
      },
      {
        question: "Can I use my ChatGPT/OpenAI key inside ShadowTalk?",
        answer:
          "Yes. Paste your OpenAI API key into ShadowTalk's BYOK settings and your workspace calls OpenAI models directly from your browser — alongside Anthropic, Google, Groq, DeepSeek and 12+ other providers, with the on-device model as your offline fallback.",
      },
    ],
    related: [
      { label: "ShadowTalk vs Proton Lumo", href: "/vs/proton-lumo", note: "Encrypted AI that still needs the cloud" },
      { label: "ShadowTalk vs LM Studio", href: "/vs/lm-studio", note: "Desktop local AI vs browser local AI" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "How offline chat and sync actually work" },
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "The three privacy tiers, defined" },
    ],
    ctaLabel: "Try ShadowTalk free — no account",
  },

  "lm-studio": {
    slug: "lm-studio",
    competitor: "LM Studio",
    breadcrumb: "ShadowTalk vs LM Studio",
    h1: "ShadowTalk AI vs LM Studio — a browser tab vs a desktop app",
    definition:
      "LM Studio runs open models locally as a native desktop app — powerful, with thousands of GGUF models and a local API server. But its chats stay on one machine (device sync is still an open feature request, LM Studio issue #2467) and it never runs in a browser tab. ShadowTalk AI is the browser-native counterpart: no install, WebGPU inference, resumable model downloads, and offline-queued chats that sync when you're back.",
    intro:
      "LM Studio is the best-known name in local AI, so this is the comparison offline-AI searchers hit first. The honest summary: LM Studio outclasses a browser on model breadth and hardware ceiling; ShadowTalk outclasses it on zero-install access, sync, and the product surface around the model.",
    rows: [
      {
        dimension: "Install required",
        shadowtalk: "None — the browser tab is the app; models download per-shard and resume",
        them: "Native desktop app to download and maintain per OS",
        edge: "shadowtalk",
      },
      {
        dimension: "Runs in a browser",
        shadowtalk: "Yes — WebGPU inference on your GPU, inside the workspace",
        them: "No — desktop application only",
        edge: "shadowtalk",
      },
      {
        dimension: "Offline inference",
        shadowtalk: "Yes — after the one-time model download",
        them: "Yes — fully local",
        edge: "both",
      },
      {
        dimension: "Chat sync across devices",
        shadowtalk:
          "Automatic catch-up sync, including messages queued while offline — end-to-end encrypted when Private Mode is on",
        them:
          "Not available — device sync remains an open feature request (LM Studio #2467)",
        edge: "shadowtalk",
      },
      {
        dimension: "Model library",
        shadowtalk: "Curated WebGPU-ready set: Qwen 2.5, Llama 3.2, SmolLM2 (0.5B-3B)",
        them: "Thousands of GGUF models, including 70B-class on suitable hardware",
        edge: "them",
      },
      {
        dimension: "Hardware ceiling",
        shadowtalk: "What the browser + GPU can hold — practical up to ~3B-class models",
        them: "Hardware-sized: 13B-70B+ on big RAM/GPU machines",
        edge: "them",
      },
      {
        dimension: "Local API server for your own apps",
        shadowtalk: "No — ShadowTalk is a workspace, not a server",
        them: "Yes — OpenAI-compatible local API",
        edge: "them",
      },
      {
        dimension: "Cloud models when a task is too heavy",
        shadowtalk: "Yes — automatic escalation to cloud models, free tier or BYOK",
        them: "No — local only",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where LM Studio wins",
    whereTheyWin: [
      "Model breadth: the entire GGUF ecosystem, from 1B toys to 70B-class frontier-adjacent models, discoverable in-app",
      "Raw capability: on desktop hardware it runs models no browser can hold",
      "Developer tooling: a local OpenAI-compatible server that powers your own projects",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Pick LM Studio if you're a power user with the hardware and you want the widest local model zoo or a local API server. Pick ShadowTalk if you want local AI with nothing to install — one browser tab on any WebGPU machine — plus the piece LM Studio still doesn't have: chats that survive the device, with offline queueing and automatic sync when you're back. The gap is documented by LM Studio itself: device sync is still issue #2467 on their tracker.",
      "Both are free to use. The difference is the shape: a desktop app for one machine, or the first AI chat in a browser that works offline and syncs when you're back.",
    ],
    faqs: [
      {
        question: "Does LM Studio sync chats between devices?",
        answer:
          "Not yet. Cross-device chat sync is a long-standing open feature request on LM Studio's tracker (issue #2467, checked Nov 2026). Each LM Studio install keeps its own chat history on that machine. ShadowTalk syncs chats across devices — including messages queued while offline — automatically.",
      },
      {
        question: "Is ShadowTalk an LM Studio alternative?",
        answer:
          "It's the browser-native alternative. LM Studio is a desktop app with a larger model ceiling; ShadowTalk runs WebGPU models inside a browser workspace with no install, adds automatic sync, cloud escalation for heavy tasks, research with citations, and an IDE. Use both: LM Studio for 70B-class local models on big hardware, ShadowTalk for everyday offline-capable chat that follows you across devices.",
      },
      {
        question: "Which is better for low-end machines?",
        answer:
          "For very old machines, neither on-device option shines — LM Studio can run tiny GGUF models, and ShadowTalk's device-tiered registry offers a 600MB nano model for modest WebGPU devices, falling back to cloud chat when online. ShadowTalk pre-checks GPU features and storage quota before downloading anything.",
      },
      {
        question: "Do both work without internet?",
        answer:
          "Yes — LM Studio fully local; ShadowTalk offline after the one-time app-shell install and model download. Only ShadowTalk then queues your offline-sent messages and syncs them on reconnect, though; LM Studio history stays on the machine that made it.",
      },
    ],
    related: [
      { label: "ShadowTalk vs Ollama", href: "/vs/ollama", note: "The other local-AI heavyweight, compared" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "How WebGPU inference works" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Requirements, tiers and honest limits" },
      { label: "All comparisons", href: "/compare", note: "Every head-to-head in one place" },
    ],
    ctaLabel: "Try browser AI — no install",
  },

  "proton-lumo": {
    slug: "proton-lumo",
    competitor: "Proton Lumo",
    breadcrumb: "ShadowTalk vs Proton Lumo",
    h1: "ShadowTalk AI vs Proton Lumo — encrypted AI, compared honestly",
    definition:
      "Proton Lumo encrypts stored chat history with zero-access encryption — but inference is cloud-only: Lumo's published security model documents the server decrypting your prompt to process it, and you need an account and a live connection. ShadowTalk AI adds the missing half — an on-device model with zero network egress — plus E2EE Private Mode (AES-256-GCM) and BYOK across 16+ providers.",
    intro:
      "Proton's privacy pedigree is real, and we credit it below. But the encrypted-AI camp has a structural gap: encryption around storage while the cloud still sees the prompt. This page maps exactly where the two products differ — including the limits we ship in public and they don't have to admit because their defaults are different.",
    rows: [
      {
        dimension: "Offline use",
        shadowtalk: "Yes — on-device inference, zero network egress after model download",
        them: "No — cloud-only; no connection, no answers",
        edge: "shadowtalk",
      },
      {
        dimension: "Where your prompt is processed",
        shadowtalk:
          "On your device (WebGPU mode) or at your chosen provider via BYOK — direct browser-to-provider, no ShadowTalk proxy",
        them: "Proton servers — Lumo's security model documents decrypting the prompt server-side to answer",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately",
        them: "Yes — Proton account",
        edge: "shadowtalk",
      },
      {
        dimension: "Stored-history encryption",
        shadowtalk:
          "Private Mode: end-to-end AES-256-GCM, keys derived on your device, non-extractable and memory-only",
        them: "Zero-access encryption of stored history",
        edge: "both",
      },
      {
        dimension: "Sync across devices",
        shadowtalk: "Yes — including offline-queued chats on reconnect",
        them: "Yes — synced encrypted history",
        edge: "both",
      },
      {
        dimension: "Model choice",
        shadowtalk: "On-device models + 16+ providers via BYOK",
        them: "Proton's served models only",
        edge: "shadowtalk",
      },
      {
        dimension: "Trust pedigree",
        shadowtalk:
          "Independent product built in public; honest limits published (default chats stored server-side; free shared mode transits the server)",
        them:
          "A decade of audited privacy credentials, Swiss jurisdiction, institutional reputation",
        edge: "them",
      },
    ],
    whereTheyWinHeading: "Where Proton Lumo wins",
    whereTheyWin: [
      "Institutional trust: audits, Swiss legal protection and a ten-year track record you can point a compliance team at",
      "Polish and support of a mature privacy company behind it",
      "A name enterprises already recognize",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Lumo is the strongest brand in encrypted AI — and it still needs the internet, an account, and Proton's servers seeing your prompt in cleartext to answer it. ShadowTalk covers the intersection Lumo can't reach: on-device inference that never touches a network, offline chat that queues and syncs, and encryption you hold the keys to. If institutional pedigree is your top requirement, Lumo is a fine choice; if 'nothing sees my prompt' is the requirement, that's the on-device tier.",
      "One honest asymmetry to weigh: Lumo's zero-access storage is its default; ShadowTalk's end-to-end encryption is opt-in Private Mode, and we document exactly what the defaults do instead. ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back — encrypted AI that also survives the tunnel.",
    ],
    faqs: [
      {
        question: "Is Proton Lumo really private?",
        answer:
          "For stored history, yes — zero-access encryption means Proton can't read chats at rest. But its published security model describes decrypting your prompt on the server to generate an answer, so the prompt itself is visible to Lumo's servers in the moment. For 'nothing ever leaves my device', you need on-device inference — ShadowTalk's WebGPU mode or comparable local tools.",
      },
      {
        question: "Does Proton Lumo work offline?",
        answer:
          "No. Lumo is a cloud service with cloud-only inference — no connection means no answers, and there's no offline queueing. ShadowTalk works fully offline after a one-time model download and syncs queued chats when you're back.",
      },
      {
        question: "Which has stronger encryption?",
        answer:
          "Both encrypt stored history with keys users control — Lumo with zero-access encryption, ShadowTalk's Private Mode with AES-256-GCM keys derived on your device as non-extractable, memory-only browser keys (encrypt-or-null storage contract). The bigger privacy difference is inference location: ShadowTalk can answer without any server involvement at all.",
      },
      {
        question: "Is ShadowTalk a Proton Lumo alternative?",
        answer:
          "Yes — with different trade-offs. ShadowTalk trades Proton's institutional pedigree for on-device inference, offline capability, no account requirement, BYOK across 16+ providers and a free workspace with no card. It's the encrypted-AI option that also works in a tunnel.",
      },
    ],
    related: [
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The cloud giant, compared honestly" },
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "Three privacy tiers, defined precisely" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Chat with no internet — and sync later" },
      { label: "Security & Trust", href: "/security", note: "Our full data-handling write-up" },
    ],
    ctaLabel: "Try encrypted + offline AI — free",
  },

  "web-llm-chat": {
    slug: "web-llm-chat",
    competitor: "web-llm-chat",
    breadcrumb: "ShadowTalk vs web-llm-chat",
    h1: "ShadowTalk AI vs web-llm-chat — when a demo becomes a product",
    definition:
      "web-llm-chat (like Secret Llama) proves a browser tab can run an LLM fully locally — no account, no server, real WebGPU inference. What it doesn't have is anything around the model: no sync, no backup, no offline queueing, no durability guarantees. ShadowTalk AI ships that same WebGPU capability as a product — durable storage, offline queue + sync catch-up, automatic cloud escalation, research with citations, tools and an IDE.",
    intro:
      "This is the closest comparison on raw technology: both run MLC-class WebLLM inference in a tab. The differences are everything the demo leaves out — which is exactly what breaks when you use a demo daily. We credit what the open-source demos are better at, too.",
    rows: [
      {
        dimension: "On-device WebGPU inference",
        shadowtalk: "Yes — watchdogged worker, q4f16/q4f32 model twins by GPU feature",
        them: "Yes — the original proof that browsers can do this",
        edge: "both",
      },
      {
        dimension: "Offline queue + sync on reconnect",
        shadowtalk: "Yes — durable local queue, automatic catch-up sync, E2EE when Private Mode is on",
        them: "No sync at all — history lives in one browser on one device",
        edge: "shadowtalk",
      },
      {
        dimension: "Durability of your history",
        shadowtalk:
          "Durable on-device storage, reload-safe — verified by automated offline smoke tests on every build",
        them: "Browser storage of a demo; refresh and lost state are real risks",
        edge: "shadowtalk",
      },
      {
        dimension: "Resumable model downloads",
        shadowtalk: "Per-shard caching — interrupted downloads resume, never restart",
        them: "Basic caching; a dropped connection can restart a large fetch",
        edge: "shadowtalk",
      },
      {
        dimension: "Cloud escalation for heavy tasks",
        shadowtalk: "Automatic — small talk stays local, heavy work goes to your chosen cloud model",
        them: "None — local only",
        edge: "shadowtalk",
      },
      {
        dimension: "Workspace around the model",
        shadowtalk: "Research with citations, ProofLoop missions, voice mode, agentic IDE, appearance studio",
        them: "A chat box",
        edge: "shadowtalk",
      },
      {
        dimension: "Simplicity and hackability",
        shadowtalk: "A full product — more surface, more moving parts",
        them: "Minimal MIT-licensed codebase — fork it, read it, learn from it",
        edge: "them",
      },
    ],
    whereTheyWinHeading: "Where web-llm-chat (and Secret Llama) win",
    whereTheyWin: [
      "Radical simplicity: a small open-source codebase you can read in an afternoon and fork in minutes",
      "Educational value: the clearest way to understand how browser LLM inference actually works",
      "Zero product surface: nothing to configure, nothing to learn",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Use web-llm-chat or Secret Llama to learn how browser AI works — they're excellent at that. Use ShadowTalk when you want the same on-device privacy with the engineering around it: chats that survive reloads and dead zones, queue-and-sync for offline sends, automatic cloud escalation, and a real workspace. The demo proves the capability; the product is what makes it survivable — the first AI chat in a browser that works offline and syncs when you're back.",
      "The same honesty rule as everywhere else on this site: ShadowTalk's defaults store chats server-side when Private Mode is off, and free shared-mode requests transit the server — the on-device tier and BYOK-direct tier are the zero-server paths. The demo's simplicity is its genuine advantage; ours is shipping the product around the same engine.",
    ],
    faqs: [
      {
        question: "What is web-llm-chat?",
        answer:
          "An open-source demo that runs LLMs fully in the browser via WebGPU with no account and no server — one of several (with Secret Llama) that proved local browser inference works. It's a technology demonstration, not a synced product: no cross-device sync, no offline queueing, no durability guarantees.",
      },
      {
        question: "Does web-llm-chat sync my chats?",
        answer:
          "No. History stays in that browser on that device — nothing backs it up or moves it. That's the gap ShadowTalk was built to close: on-device inference plus durable storage and automatic sync when you're back.",
      },
      {
        question: "Is ShadowTalk just a web-llm-chat wrapper?",
        answer:
          "No — it shares the WebLLM inference engine class (MLC), as does the whole browser-AI category, but ShadowTalk adds the missing layers: a device-tiered model registry with quota pre-checks, watchdogged inference workers, resumable per-shard downloads, offline queueing with catch-up sync, cloud escalation, and the workspace (research, missions, IDE) around it.",
      },
      {
        question: "Which should a developer fork?",
        answer:
          "If the goal is learning or building your own minimal client, the MIT-licensed demo wins — that's its job. If the goal is shipping offline-capable AI chat to real users, the durability, sync and fallback engineering is the hard part, and it's done here.",
      },
    ],
    related: [
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "The engineering behind browser LLMs" },
      { label: "ShadowTalk vs LM Studio", href: "/vs/lm-studio", note: "Desktop local AI, compared" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "What works offline, honestly" },
      { label: "All comparisons", href: "/compare", note: "Every head-to-head in one place" },
    ],
    ctaLabel: "Use the productized version — free",
  },

  ollama: {
    slug: "ollama",
    competitor: "Ollama",
    breadcrumb: "ShadowTalk vs Ollama",
    h1: "ShadowTalk AI vs Ollama — nothing to install vs a local runtime",
    definition:
      "Ollama is a developer-grade local model runtime: terminal-first, huge model library, an OpenAI-compatible local API, and an ecosystem of UIs built on it. Chats stay on the machine unless you build your own sync stack. ShadowTalk AI is the end-user shape of local AI — no install, the browser is the runtime, models download per-shard and resume, and offline-queued chats sync on reconnect.",
    intro:
      "Ollama and ShadowTalk agree on the philosophy — your hardware, your data — and differ on the audience and the packaging. This page compares them for someone deciding where to run local models, including what Ollama does that ShadowTalk deliberately doesn't.",
    rows: [
      {
        dimension: "Install required",
        shadowtalk: "None — a browser tab; app shell + model download once",
        them: "CLI / desktop install, model pulls, updates",
        edge: "shadowtalk",
      },
      {
        dimension: "Primary audience",
        shadowtalk: "Anyone who wants AI chat without giving up the network story",
        them: "Developers and homelab users comfortable with a terminal",
        edge: "them",
      },
      {
        dimension: "Runs in a browser",
        shadowtalk: "Yes — the browser is the runtime (WebGPU)",
        them: "No — native runtime; UIs are separate projects",
        edge: "shadowtalk",
      },
      {
        dimension: "Offline inference",
        shadowtalk: "Yes — after one-time download",
        them: "Yes — fully local",
        edge: "both",
      },
      {
        dimension: "Chat sync across devices",
        shadowtalk: "Automatic, including offline-queued messages",
        them: "Not built in — you assemble it yourself (or pair with third-party UIs)",
        edge: "shadowtalk",
      },
      {
        dimension: "Model library",
        shadowtalk: "Curated WebGPU set, 0.5B-3B",
        them: "Large library: 7B-70B+ class models on suitable hardware",
        edge: "them",
      },
      {
        dimension: "Local API for your own apps",
        shadowtalk: "No — it's a workspace, not a server",
        them: "Yes — OpenAI-compatible endpoint, the core of its ecosystem",
        edge: "them",
      },
      {
        dimension: "Cloud escalation when a task is too heavy",
        shadowtalk: "Automatic, with BYOK across 16+ providers",
        them: "None — local only",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where Ollama wins",
    whereTheyWin: [
      "Model zoo and ceiling: big models on big hardware, the whole open-model ecosystem one `ollama pull` away",
      "The local API server: the de-facto standard backend for self-hosted AI projects",
      "Ecosystem: Open WebUI and dozens of integrations built around it",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Run Ollama if you're building — it's the best local runtime and API in the category. Use ShadowTalk if you're using: no terminal, no install, no sync assembly — a browser tab that works offline on-device and syncs when you're back, with cloud escalation to 16+ providers when a task outgrows a 3B model. They're complements: plenty of LocalMind-style setups bolt Ollama to a sync stack; ShadowTalk is the version where that engineering is already shipped.",
    ],
    faqs: [
      {
        question: "Is Ollama good for non-developers?",
        answer:
          "It's improving, but Ollama's core is a command-line runtime — most friendly UIs around it are separate installs. ShadowTalk targets that same 'local AI' need with zero setup: open a tab, download a model once, chat — and the chat syncs across devices automatically, which Ollama doesn't do out of the box.",
      },
      {
        question: "Does Ollama sync chats between devices?",
        answer:
          "Not natively. Chat history lives on the machine running Ollama; cross-device sync means assembling your own stack or pairing with third-party tools. ShadowTalk ships sync — including messages queued while offline — as a core feature.",
      },
      {
        question: "Can Ollama run in a browser tab?",
        answer:
          "No — Ollama is a native runtime that serves models over HTTP. Browser-local inference is a different stack (WebGPU + WebLLM/MLC-class engines), which is what ShadowTalk uses. Both run on your hardware; one needs an install, the other needs a tab.",
      },
      {
        question: "Which is faster, Ollama or browser AI?",
        answer:
          "On the same hardware, a native runtime like Ollama has an edge — no browser memory limits, bigger quantization choices, and direct GPU access. Browser WebGPU is close for small models (1B-3B class) and wins on convenience: no install and your history follows you across devices.",
      },
    ],
    related: [
      { label: "ShadowTalk vs LM Studio", href: "/vs/lm-studio", note: "The other desktop local-AI app" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "Model tiers and what they need" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Offline chat + sync, honestly explained" },
      { label: "All comparisons", href: "/compare", note: "Every head-to-head in one place" },
    ],
    ctaLabel: "Local AI, zero install — try it",
  },

  perplexity: {
    slug: "perplexity",
    competitor: "Perplexity",
    breadcrumb: "ShadowTalk vs Perplexity",
    h1: "ShadowTalk AI vs Perplexity — research with citations, with or without the cloud",
    definition:
      "Perplexity is an answer engine: live web search with citations, fast and excellent for lookups — always online, account-based, and the free tier is ad-supported. ShadowTalk AI runs deep research with cited sources inside a private workspace that also chats offline on-device, keeps working through dead zones, and costs nothing with BYOK.",
    intro:
      "Perplexity defined the cited-answer category, so the fair question is: when do its strengths matter, and when does an offline-capable, private, multi-model workspace beat an always-online answer engine? Here's the honest split.",
    rows: [
      {
        dimension: "Live web answers with citations",
        shadowtalk: "Deep research mode cites sources inside the workspace",
        them: "The core product — real-time index, fast iterative search",
        edge: "them",
      },
      {
        dimension: "Works offline",
        shadowtalk: "Yes — on-device chat after one-time download; only live search needs the network",
        them: "No — cloud-only answer engine",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately",
        them: "Yes",
        edge: "shadowtalk",
      },
      {
        dimension: "Privacy dial",
        shadowtalk:
          "On-device tier with zero network egress; BYOK direct browser-to-provider; E2EE Private Mode (AES-256-GCM)",
        them: "Cloud processing of every query; free tier is ad-supported",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk: "16+ providers via BYOK, plus the on-device model",
        them: "Perplexity's served selection",
        edge: "shadowtalk",
      },
      {
        dimension: "Verifiable agent missions",
        shadowtalk: "ProofLoop plans, finishes and publishes cryptographic proof cards",
        them: "Not a capability",
        edge: "shadowtalk",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK at cost",
        them: "Free with ads and limits; Pro subscription for heavy use",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where Perplexity wins",
    whereTheyWin: [
      "Freshness and breadth: a dedicated crawl-and-index pipeline behind every answer — faster and wider than workspace-side research",
      "Search UX: iterative query refinement is the product, not a mode",
      "Speed for quick factual lookups when you're online",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Perplexity is the right tool for fast, fresh, cited web answers — full stop. ShadowTalk is the right tool when research has to keep working without a network, when the privacy dial matters (on-device zero egress, BYOK direct, E2EE Private Mode), when you want one workspace for research + missions + code + voice, and when you want it free with your own keys. They overlap on 'answers with citations'; they differ on everything the network is doing — ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, and Perplexity structurally can't run without one.",
    ],
    faqs: [
      {
        question: "Does ShadowTalk do research like Perplexity?",
        answer:
          "ShadowTalk's deep research mode runs inside the workspace and returns cited sources you can verify — tuned for missions and multi-step work rather than one-shot lookups. For always-fresh web-wide answers, Perplexity's dedicated index is the stronger tool; for research that must survive offline gaps and stay private, ShadowTalk is.",
      },
      {
        question: "Does Perplexity work offline?",
        answer:
          "No — it's a cloud answer engine; every query needs a connection and an account. ShadowTalk's on-device chat works with zero network after the one-time model download, and live search is the only part that needs to be online.",
      },
      {
        question: "Which is more private for research?",
        answer:
          "Perplexity processes every query in its cloud and the free tier is ad-supported. ShadowTalk's privacy is tiered: on-device research and chat with zero network egress, BYOK requests straight from your browser to the provider you chose, and E2EE Private Mode (AES-256-GCM) for stored work — with the honest limits documented (default chats are stored server-side when Private Mode is off).",
      },
      {
        question: "Can I use both?",
        answer:
          "Yes — they complement well: Perplexity for live web lookups, ShadowTalk as the workspace that keeps chatting, researching and coding offline and private. With BYOK you can even route research tasks to whichever provider suits the job.",
      },
    ],
    related: [
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "Cloud AI, compared honestly" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Research and chat with no internet" },
      { label: "ProofLoop — verifiable AI missions", href: "/proofloop", note: "Plans, finishes, proves" },
      { label: "All comparisons", href: "/compare", note: "Every head-to-head in one place" },
    ],
    ctaLabel: "Research offline + private — free",
  },

  gemini: {
    slug: "gemini",
    competitor: "Gemini",
    breadcrumb: "ShadowTalk vs Gemini",
    h1: "ShadowTalk AI vs Gemini — Google's cloud vs your own device",
    definition:
      "Gemini is Google's cloud AI assistant: it requires a Google account and a connection — every answer is generated on Google's servers, and Google's published Gemini Apps privacy notice states free-tier conversations can be used to improve its products. ShadowTalk AI runs a model on your own device with zero network egress, queues chats sent offline and syncs them when you're back, and never trains on your data — free, no account required.",
    intro:
      "Gemini is the default AI for billions of Android and Chrome users, so this is the second comparison people search for. The honest summary: Gemini's multimodal breadth and Google integration are real strengths; offline work, guest privacy and model choice are structurally impossible for it — and that's exactly the half ShadowTalk owns.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — after a one-time model download, inference runs on your device with zero network egress",
        them: "No — every answer is generated on Google's servers",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "Yes — a Google account is required for use",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync automatically when signal returns",
        them: "Not applicable — the assistant requires a connection",
        edge: "shadowtalk",
      },
      {
        dimension: "Training on your chats",
        shadowtalk: "Never — on any tier, including free shared mode",
        them: "Google's published Gemini Apps privacy notice states free-tier conversations can be used to improve its products",
        edge: "shadowtalk",
      },
      {
        dimension: "Multimodal breadth",
        shadowtalk: "Cloud models via BYOK — multimodal support depends on the provider you choose",
        them: "Deep native image, video and audio understanding in one model family",
        edge: "them",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk:
          "Private Mode encrypts chats end-to-end (AES-256-GCM) with device-derived keys. Honest default: chats are stored server-side when Private Mode is off",
        them: "Stored on Google's infrastructure under Google's policy; no client-side end-to-end encryption",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk:
          "16+ providers via BYOK plus an on-device model — pick per task, including Google itself",
        them: "Google models only",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where Gemini wins",
    whereTheyWin: [
      "Multimodal depth: Gemini's native image, video and audio understanding is genuinely ahead — if your work is visual or audio-heavy, that matters",
      "Google ecosystem: Workspace, Android and Chrome integrations put Gemini where a billion people already are",
      "Frontier capability and long context on Google's hardware, no download required",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Choose Gemini when you live in Google's ecosystem and want the strongest multimodal cloud assistant, always online. Choose ShadowTalk when the network disappears, when you don't want a Google account attached to your prompts, when training-free chat matters, or when you want your pick of 16+ providers — ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, and Gemini is structurally unable to say that.",
      "They are not mutually exclusive: with BYOK, your Google AI Studio key runs Gemini models inside ShadowTalk — with an on-device fallback underneath and a privacy dial around them.",
    ],
    faqs: [
      {
        question: "Can Gemini run offline?",
        answer:
          "No. Gemini is a cloud service — prompts are answered on Google's servers, so without a connection neither the web app nor the Android app can generate an answer. For offline AI chat you need an on-device model like ShadowTalk's WebGPU mode, or desktop tools like LM Studio and Ollama.",
      },
      {
        question: "Does Google train on my Gemini conversations?",
        answer:
          "On free tiers, Google's published Gemini Apps privacy notice states conversations can be used to improve its products; paid tiers carry different terms. ShadowTalk never trains on your conversations on any tier — the on-device tier additionally never sends your prompt anywhere at all.",
      },
      {
        question: "Which is more private?",
        answer:
          "ShadowTalk, with published limits: on-device chat has zero network egress, Private Mode encrypts stored chats end-to-end (AES-256-GCM), BYOK requests go browser-to-provider — while default chats are stored server-side when Private Mode is off and free shared-mode requests transit ShadowTalk's server. Gemini offers no client-side end-to-end encryption and processes every prompt on Google's servers.",
      },
      {
        question: "Can I use my Gemini API key inside ShadowTalk?",
        answer:
          "Yes — paste a Google AI Studio key into BYOK settings and Gemini models run inside your ShadowTalk workspace directly from the browser, alongside 15+ other providers, with the on-device model as your offline fallback.",
      },
    ],
    related: [
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The other cloud giant, scored" },
      { label: "ShadowTalk vs Claude", href: "/vs/claude", note: "Anthropic's assistant, compared" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Offline + sync, end to end" },
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "The three privacy tiers" },
    ],
    ctaLabel: "Try ShadowTalk free — no account",
  },

  claude: {
    slug: "claude",
    competitor: "Claude",
    breadcrumb: "ShadowTalk vs Claude",
    h1: "ShadowTalk AI vs Claude — frontier writing vs offline-first work",
    definition:
      "Claude is Anthropic's cloud assistant — one of the strongest writers and coders available, and it requires an account and a live connection: there is no offline mode and no client-side end-to-end encryption. ShadowTalk AI keeps working when the internet doesn't: on-device inference in the browser, offline-queued chats that sync when you're back, and your choice of 16+ providers — including Anthropic itself via BYOK.",
    intro:
      "Claude has earned its reputation on long-form writing and code, and we say so plainly below. This comparison is about the structural differences: where inference runs, what happens when the network drops, who holds the encryption keys, and what either costs.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — after a one-time model download, inference runs on your device",
        them: "No — cloud service; no connection means no answers",
        edge: "shadowtalk",
      },
      {
        dimension: "Long-form writing and code quality",
        shadowtalk: "Strong via BYOK frontier models, capped by what a tab can run on-device",
        them: "Among the best available — Anthropic's models are genuinely excellent at writing and coding",
        edge: "them",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync automatically when signal returns",
        them: "Not applicable — the assistant requires a connection",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "Yes — account required for use",
        edge: "shadowtalk",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk:
          "Private Mode encrypts chats end-to-end (AES-256-GCM) with device-derived keys. Honest default: chats are stored server-side when Private Mode is off",
        them: "Stored server-side under Anthropic's policy; no client-side end-to-end encryption",
        edge: "shadowtalk",
      },
      {
        dimension: "Training on your chats",
        shadowtalk: "Never — on any tier, including free shared mode",
        them: "Anthropic states consumer-tier conversations may be used for model improvement unless settings say otherwise (checked Nov 2026)",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk:
          "16+ providers via BYOK plus an on-device model — pick per task, including Anthropic itself",
        them: "Anthropic models only",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where Claude wins",
    whereTheyWin: [
      "Writing and code quality: Anthropic's frontier models are among the strongest available for long-form drafting and software work",
      "Very large context windows on server hardware — whole codebases and book-length documents in one prompt",
      "A mature agentic coding surface backed by frontier capability",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Choose Claude when you need the best writing and coding a frontier model can do and you're always online. Choose ShadowTalk when the network can't be trusted, when you don't want an account, when you want training-free chat, or when you want Anthropic models inside a private, synced workspace — ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, and Claude has no offline story at all.",
      "Many users get both: paste an Anthropic key into BYOK and Claude's models run inside ShadowTalk from your browser — with the on-device model underneath for the moments the network fails.",
    ],
    faqs: [
      {
        question: "Can Claude work offline?",
        answer:
          "No. Claude is a cloud service — inference happens on Anthropic's servers, so without a connection it cannot answer. If you need AI that works offline, ShadowTalk's on-device mode, LM Studio, Ollama or Jan run models directly on your hardware.",
      },
      {
        question: "Is Claude free to use?",
        answer:
          "Claude has a free tier with usage caps, and its stronger usage sits behind subscriptions. ShadowTalk is free to use with no card: on-device chat costs nothing, shared-tier cloud chat runs within daily limits, and BYOK passes your provider's API price straight through at cost.",
      },
      {
        question: "Which is more private?",
        answer:
          "ShadowTalk, with its limits published: on-device chat has zero network egress, Private Mode encrypts stored chats end-to-end (AES-256-GCM), and BYOK requests go browser-to-provider — while default chats are stored server-side when Private Mode is off. Claude processes every prompt on Anthropic's servers and offers no client-side end-to-end encryption.",
      },
      {
        question: "Can I use my Anthropic API key inside ShadowTalk?",
        answer:
          "Yes — paste your Anthropic key into BYOK settings and Claude's models run inside your ShadowTalk workspace directly from the browser, next to 15+ other providers, with offline on-device chat as the fallback underneath.",
      },
    ],
    related: [
      { label: "ShadowTalk vs Gemini", href: "/vs/gemini", note: "Google's assistant, scored" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The original cloud comparison" },
      { label: "Local vs cloud AI", href: "/local-vs-cloud-ai", note: "The trade-offs, dimension by dimension" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "How the offline half works" },
    ],
    ctaLabel: "Try ShadowTalk free — no account",
  },

  jan: {
    slug: "jan",
    competitor: "Jan",
    breadcrumb: "ShadowTalk vs Jan",
    h1: "ShadowTalk AI vs Jan — open-source desktop vs browser tab",
    definition:
      "Jan is a free, open-source desktop app that runs GGUF models locally with a built-in local API server — genuinely good software with the same structural limits as every native local-AI app: it doesn't run in a browser tab, and its chats stay on the machine you installed it on. ShadowTalk AI is the browser-native counterpart: zero install, WebGPU inference, resumable model downloads, and offline-queued chats that sync across devices when you're back.",
    intro:
      "Jan sits in the same family as LM Studio and Ollama — desktop local AI, with the strengths (hardware ceiling, model breadth, openness) and the limits (install, one machine, no browser) that family implies. This page scores both sides honestly, checked November 2026.",
    rows: [
      {
        dimension: "Install required",
        shadowtalk: "None — the browser tab is the app; models download per-shard and resume",
        them: "Desktop app to download and maintain per operating system",
        edge: "shadowtalk",
      },
      {
        dimension: "Runs in a browser",
        shadowtalk: "Yes — that's the whole product",
        them: "No — native desktop application",
        edge: "shadowtalk",
      },
      {
        dimension: "Sync across devices",
        shadowtalk: "Automatic catch-up sync, including messages queued while offline; E2EE when Private Mode is on",
        them: "Chats stay on the machine where Jan is installed (no built-in cross-device chat sync as of Nov 2026)",
        edge: "shadowtalk",
      },
      {
        dimension: "Open source",
        shadowtalk: "Client is public; sync and shared-mode infrastructure are not fully open",
        them: "Fully open-source codebase you can audit and fork",
        edge: "them",
      },
      {
        dimension: "Model breadth",
        shadowtalk: "Device-tiered on-device fleet plus 16+ cloud providers via BYOK",
        them: "The whole GGUF/Hugging Face zoo on your own hardware",
        edge: "them",
      },
      {
        dimension: "Works offline",
        shadowtalk: "Yes — on-device WebGPU inference plus durable offline queue",
        them: "Yes — local inference by design",
        edge: "both",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk:
          "Private Mode encrypts chats end-to-end (AES-256-GCM). Honest default: chats are stored server-side when Private Mode is off",
        them: "Chats stay in local files on your machine — nothing to encrypt in transit",
        edge: "both",
      },
    ],
    whereTheyWinHeading: "Where Jan wins",
    whereTheyWin: [
      "Fully open-source: every line is auditable and forkable — a real commitment we don't fully match on the infrastructure side",
      "Desktop hardware ceiling: with a big GPU, Jan runs model sizes no browser tab can touch",
      "A local API server and extension ecosystem for tinkerers",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Choose Jan if open source is your priority and you want desktop-grade local AI with a local API server. Choose ShadowTalk when you want the same offline capability with nothing to install, a synced history that follows you across devices, and cloud escalation when a task outgrows the tab — ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, while Jan's chats stay on the machine that ran them.",
      "The pattern is the one that repeats across local AI: native tools win on openness and raw hardware; the browser wins on reach, sync and zero friction.",
    ],
    faqs: [
      {
        question: "Is Jan free?",
        answer:
          "Yes — Jan is free and open-source, and its local models cost nothing to run. ShadowTalk is also free with no card; its on-device tier is likewise free, with cloud models available through the shared tier or your own BYOK key at provider cost.",
      },
      {
        question: "Does Jan sync chats across devices?",
        answer:
          "Not built-in as of November 2026 — Jan's chats live in local storage on the machine where it's installed. Cross-device sync is exactly the gap ShadowTalk fills: offline-queued messages catch up automatically, end-to-end encrypted when Private Mode is on.",
      },
      {
        question: "Which runs bigger models?",
        answer:
          "Jan — desktop apps tap your full hardware, so with a large GPU it runs GGUF models far beyond what fits in a browser tab. ShadowTalk's honest ceiling is the ~3B class on-device, with automatic cloud escalation (16+ providers) for everything heavier.",
      },
      {
        question: "Do both work offline?",
        answer:
          "Yes — local inference is the shared value. The difference is everything around it: ShadowTalk adds the synced workspace, guest mode and zero install, while Jan adds full openness and a local API server on your desktop.",
      },
    ],
    related: [
      { label: "ShadowTalk vs LM Studio", href: "/vs/lm-studio", note: "The better-known desktop local AI" },
      { label: "ShadowTalk vs Ollama", href: "/vs/ollama", note: "The developer runtime, scored" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "The WebGPU mechanics" },
      { label: "Best offline AI chat — ranked", href: "/best-offline-ai-chat", note: "Where each tool ranks" },
    ],
    ctaLabel: "Try the browser tab — free",
  },

  pocketpal: {
    slug: "pocketpal",
    competitor: "PocketPal",
    breadcrumb: "ShadowTalk vs PocketPal",
    h1: "ShadowTalk AI vs PocketPal — phone AI with and without a sync gap",
    definition:
      "PocketPal is an open-source mobile app that runs GGUF models entirely on your phone — genuinely useful offline AI with the gap every native on-device app shares: history lives on that one phone, and there is no web version. ShadowTalk AI installs as a PWA straight from the browser on iOS and Android, also runs on-device offline, queues chats sent offline and syncs them when you're back — so phone and desktop share one history.",
    intro:
      "This is the mobile-flavored version of the desktop comparisons: a capable native on-device app against a browser workspace that also runs on-device but doesn't strand your history on the device. Both approaches are legitimate; the difference is what happens when you put the phone down.",
    rows: [
      {
        dimension: "Install",
        shadowtalk: "One tap from the browser — installable PWA, no store visit",
        them: "App store or APK download per platform",
        edge: "shadowtalk",
      },
      {
        dimension: "Runs models on the phone, offline",
        shadowtalk: "Yes — device-tiered WebGPU models, zero network egress",
        them: "Yes — GGUF models run fully on-device",
        edge: "both",
      },
      {
        dimension: "Cross-device sync",
        shadowtalk: "Automatic catch-up sync; offline-queued messages arrive when signal returns; E2EE when Private Mode is on — with the honest default stated: chats are stored server-side when Private Mode is off",
        them: "Chats stay on the phone — no cross-device sync as of Nov 2026",
        edge: "shadowtalk",
      },
      {
        dimension: "Desktop companion",
        shadowtalk: "The same workspace in any browser — one history across phone and desktop",
        them: "None — mobile-only",
        edge: "shadowtalk",
      },
      {
        dimension: "Model breadth",
        shadowtalk: "Device-tiered on-device fleet plus 16+ cloud providers via BYOK",
        them: "Any GGUF model from Hugging Face your phone can carry",
        edge: "them",
      },
      {
        dimension: "Cloud escalation",
        shadowtalk: "Automatic fallback to cloud models when a task or device outgrows the tab",
        them: "None — purely local",
        edge: "shadowtalk",
      },
      {
        dimension: "Price",
        shadowtalk: "Free, no card; BYOK passes provider cost straight through",
        them: "Free and open-source",
        edge: "both",
      },
    ],
    whereTheyWinHeading: "Where PocketPal wins",
    whereTheyWin: [
      "Native performance: a native app can use the phone more directly — warm-up and thermals are often better than a browser tab doing GPU work",
      "Full GGUF zoo: swap in any community model your phone can carry, without waiting for our device tiers",
      "No browser dependency at all — the app is the OS citizen",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Choose PocketPal if you want a dedicated native app and you'll only ever work on that one phone. Choose ShadowTalk when the phone is one of several screens: the same on-device offline chat, plus a synced history that reaches your desktop, plus cloud escalation for the tasks a phone can't chew — ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, and a native mobile app without a backend can't close that loop.",
      "Both are free; try them the same afternoon and keep the one that matches how many devices you actually use.",
    ],
    faqs: [
      {
        question: "Does PocketPal sync chats between devices?",
        answer:
          "No — PocketPal's chats are stored locally on the phone, with no built-in cross-device sync as of November 2026. ShadowTalk's offline queue plus catch-up sync moves history between phone and desktop, encrypted end-to-end when Private Mode is on.",
      },
      {
        question: "Which is better on Android?",
        answer:
          "For raw on-device model variety and native performance, PocketPal. For the same offline chat with sync, a desktop companion and cloud escalation in the same workspace, ShadowTalk — it installs on Android in one tap with no app store.",
      },
      {
        question: "Can I use PocketPal offline?",
        answer:
          "Yes — that's its core strength: GGUF models run fully on the phone. ShadowTalk's on-device tier matches that offline capability and adds the sync layer for when the network returns.",
      },
      {
        question: "Do I need an app store for ShadowTalk on my phone?",
        answer:
          "No — it's a PWA: open the site in a mobile browser, add it to the home screen, and the installed app runs offline with the device-tiered model. No store review, no APK sideloading, and updates arrive when you reload.",
      },
    ],
    related: [
      { label: "Offline AI on your phone", href: "/mobile-offline-ai", note: "The mobile PWA guide" },
      { label: "ShadowTalk vs Jan", href: "/vs/jan", note: "The desktop sibling of this comparison" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Offline + sync, end to end" },
      { label: "AI chat without an account", href: "/ai-chat-without-account", note: "Guest mode on mobile" },
    ],
    ctaLabel: "Install the PWA — free",
  },
  deepseek: {
    slug: "deepseek",
    competitor: "DeepSeek",
    breadcrumb: "ShadowTalk vs DeepSeek",
    h1: "ShadowTalk AI vs DeepSeek — open-weight value, but the official app is cloud-only",
    definition:
      "DeepSeek's official chat is a cloud service: answers are generated on its servers, an account is required, and without internet it cannot reply. Its models are open-weight — but running them locally means assembling your own stack. ShadowTalk AI is a free browser workspace that runs a model on your device, queues chats sent offline and syncs them when you're back — and can call DeepSeek's own API via BYOK.",
    intro:
      "This comparison separates the two things people mean by 'DeepSeek': the open-weight models anyone can self-host, and the official chat app, which is a cloud product with an account, server-side storage and no offline mode. We score the app, note where the open weights change the picture, and credit DeepSeek fully where it wins.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — after a one-time model download, on-device WebGPU inference with zero network egress",
        them: "No — the official chat app is cloud-only; every token is generated on DeepSeek's servers",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync automatically when signal returns",
        them: "Not applicable — the app needs a connection to function",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "Yes — email or phone sign-up for the chat app",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk: "16+ providers via BYOK — DeepSeek's API among them — plus the on-device model",
        them: "DeepSeek models only",
        edge: "shadowtalk",
      },
      {
        dimension: "Running DeepSeek's open weights",
        shadowtalk: "Via BYOK: call DeepSeek's hosted API from the same workspace as every other provider",
        them: "MIT-licensed weights — the community runs them in LM Studio, Ollama and vLLM on hardware you own and size yourself",
        edge: "them",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk: "Private Mode encrypts chats end-to-end (AES-256-GCM) with device-derived keys. Honest default: chats are stored server-side when Private Mode is off",
        them: "Stored server-side on DeepSeek infrastructure; its consumer privacy notice permits using data to improve services, and transparency concerns drew regulator action in 2025 — Italy restricted the service and South Korea suspended app downloads",
        edge: "shadowtalk",
      },
      {
        dimension: "Training on your chats",
        shadowtalk: "Never — on any tier, including free shared mode",
        them: "Consumer terms permit improvement uses; API and enterprise terms differ",
        edge: "shadowtalk",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK passes provider costs straight through at cost",
        them: "Free chat; an API among the cheapest of the major labs",
        edge: "both",
      },
    ],
    whereTheyWinHeading: "Where DeepSeek wins",
    whereTheyWin: [
      "Frontier reasoning per dollar: near-frontier quality at API prices that undercut the major labs — through BYOK, that value reaches you with no markup",
      "Open weights: MIT-licensed releases the community can inspect, fine-tune and self-host — a freedom no closed cloud assistant offers",
      "Math, code and reasoning strength that punches far above its price point",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "DeepSeek's models are genuinely excellent, which is exactly why ShadowTalk supports them via BYOK. The official DeepSeek app, though, is structurally cloud-only: account required, no offline mode, consumer data usable for improvement, and a 2025 privacy record that drew regulator action in Italy and South Korea. Choose the DeepSeek app when you always work online and want the cheapest frontier-adjacent API. Choose ShadowTalk when you want those same models in one workspace next to 15+ other providers — plus an on-device model that works offline and syncs when you're back. ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, and a cloud-only app can't say that.",
    ],
    faqs: [
      {
        question: "Can DeepSeek work offline?",
        answer:
          "The official DeepSeek chat app cannot — it's cloud-only, so without internet it produces nothing. The models themselves are open-weight, so you can run DeepSeek models offline with your own tooling (LM Studio, Ollama) on your own hardware. ShadowTalk gives you the middle path: DeepSeek via BYOK when online, plus a built-in on-device model that always works offline.",
      },
      {
        question: "Is DeepSeek private?",
        answer:
          "Its privacy posture has real limits: the consumer notice permits using your data to improve services, chats are stored server-side, and in 2025 Italy restricted the service and South Korea suspended app downloads over transparency concerns about data handling. If you want DeepSeek models with privacy controls around them, BYOK in ShadowTalk routes requests browser-to-provider and Private Mode encrypts stored chats end-to-end.",
      },
      {
        question: "Why does ShadowTalk support DeepSeek if it's a competitor?",
        answer:
          "Because ShadowTalk is a workspace, not a model lab: it doesn't resell inference or lock you to one provider. DeepSeek's API is one of 16+ providers you can connect — pick the best model per task, at provider prices, with no markup.",
      },
      {
        question: "Which is cheaper?",
        answer:
          "For the app experience, both are free — ShadowTalk has no subscription and no card, and DeepSeek's chat is free. For model usage: DeepSeek's API is famously cheap, and ShadowTalk's BYOK passes it through at cost; the on-device model costs nothing to run at all.",
      },
    ],
    related: [
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "The privacy tiers in detail" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The other cloud giant, scored" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Offline + sync, end to end" },
      { label: "Free AI chat guide", href: "/free-ai-chat", note: "What 'free' means here" },
    ],
    ctaLabel: "Run DeepSeek in ShadowTalk — free",
  },
  copilot: {
    slug: "copilot",
    competitor: "Microsoft Copilot",
    breadcrumb: "ShadowTalk vs Copilot",
    h1: "ShadowTalk AI vs Microsoft Copilot — cloud assistant vs offline workspace",
    definition:
      "Microsoft Copilot is a cloud assistant: every answer is generated on Microsoft's servers, a Microsoft account is required, and offline it cannot answer at all. ShadowTalk AI is a free browser workspace that runs a model on your own device, queues chats sent offline and syncs them when you're back, and spans 16+ providers via BYOK — with no subscription.",
    intro:
      "Copilot is deeply useful inside Microsoft's world — Windows, Edge and Microsoft 365. This comparison scores the fundamentals that matter everywhere else: what happens when the network drops, where prompts are processed, what an account buys you, and what each product costs. We credit Copilot fully where its ecosystem wins.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — on-device WebGPU inference with zero network egress after a one-time download",
        them: "No — cloud-only; no connection means no answers",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue locally and sync automatically when signal returns",
        them: "Not applicable — the assistant itself requires a connection",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "Yes — a Microsoft account for the consumer product",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk: "16+ providers via BYOK — OpenAI, Anthropic, Google, Groq, DeepSeek and more",
        them: "Microsoft-curated models; no provider choice",
        edge: "shadowtalk",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk: "Private Mode encrypts chats end-to-end (AES-256-GCM). Honest default: chats are stored server-side when Private Mode is off",
        them: "Stored server-side in your Microsoft account; consumer and enterprise tiers carry different contractual protections",
        edge: "shadowtalk",
      },
      {
        dimension: "Training on your chats",
        shadowtalk: "Never — on any tier, including free shared mode",
        them: "Consumer conversations are processed under Microsoft's privacy policy; enterprise M365 Copilot carries stronger contractual commitments",
        edge: "shadowtalk",
      },
      {
        dimension: "Workspace integration",
        shadowtalk: "Chat, deep research with citations, ProofLoop missions, voice and an IDE in one synced workspace",
        them: "Windows, Edge and Microsoft 365 integration is best-in-class inside that ecosystem",
        edge: "them",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK passes provider costs through at cost",
        them: "Free tier with limits; Copilot Pro subscription for heavier use",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where Microsoft Copilot wins",
    whereTheyWin: [
      "Ecosystem depth: Windows, Edge, Word, Excel and Teams integration — Copilot is the OS citizen ShadowTalk deliberately is not",
      "Image generation and web-grounded answers are built into the free tier",
      "Enterprise reach: M365 Copilot with tenant-level data governance for organizations already inside Microsoft's contracts",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "If you live inside Windows and Microsoft 365, Copilot earns its place — that integration is real and we don't pretend otherwise. But as a chat product it is structurally cloud-only: account required, no offline mode, provider choice fixed by Microsoft. ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back — free, no account, 16+ providers via BYOK — which makes the two useful together: Copilot for the Microsoft surface, ShadowTalk for everything that has to keep working when the network doesn't.",
    ],
    faqs: [
      {
        question: "Can Microsoft Copilot work offline?",
        answer:
          "No — Copilot is cloud-only, so without a connection it cannot answer. If you need offline AI chat, you need an on-device model: ShadowTalk's WebGPU mode in a browser tab, or desktop tools like LM Studio and Ollama.",
      },
      {
        question: "Does Copilot train on my chats?",
        answer:
          "Consumer Copilot conversations are processed under Microsoft's privacy policy with associated controls; enterprise M365 Copilot carries explicit contractual commitments around tenant data. ShadowTalk never trains on your chats on any tier, and Private Mode encrypts stored chats end-to-end.",
      },
      {
        question: "Which is better on Windows?",
        answer:
          "For OS and Office integration, Copilot — nothing beats it inside that ecosystem. For offline work, provider choice, research tools and privacy dials, ShadowTalk. They coexist fine: many users keep Copilot in Windows and ShadowTalk as the workspace that works everywhere, including offline.",
      },
      {
        question: "Is ShadowTalk really free where Copilot charges?",
        answer:
          "Yes — ShadowTalk is free with no subscription and no card; on-device models cost nothing to run and BYOK cloud usage passes through at provider prices with no markup. Copilot's heavier usage sits behind the Copilot Pro subscription.",
      },
    ],
    related: [
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The OpenAI side of Copilot, scored" },
      { label: "ShadowTalk vs Gemini", href: "/vs/gemini", note: "The other OS-bundled assistant" },
      { label: "Local vs cloud AI guide", href: "/local-vs-cloud-ai", note: "The trade-offs, dimension by dimension" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Offline + sync, end to end" },
    ],
    ctaLabel: "Try the offline workspace — free",
  },
  "duckduckgo-ai": {
    slug: "duckduckgo-ai",
    competitor: "DuckDuckGo AI Chat",
    breadcrumb: "ShadowTalk vs DuckDuckGo AI",
    h1: "ShadowTalk AI vs DuckDuckGo AI Chat — anonymous cloud vs on-device",
    definition:
      "DuckDuckGo AI Chat (duck.ai) is anonymous and free, with a published policy that model providers can't train on your chats — but the models still run in the cloud, so it needs a connection and cannot answer offline. ShadowTalk AI runs a model on your own GPU with zero network egress, queues chats sent offline and syncs them when you're back — also with no account.",
    intro:
      "DuckDuckGo deserves real credit: duck.ai proves anonymous cloud chat can work, and its no-training policy is public. This comparison is about the remaining structural gap — inference location. Cloud models need a connection every time; an on-device model doesn't. We score both honestly.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — on-device inference with zero network egress after a one-time download",
        them: "No — prompts are proxied to cloud model providers; no connection, no answers",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync when you're back",
        them: "Not applicable — the service is a cloud relay",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "No — anonymous by design, DuckDuckGo's genuinely good idea",
        edge: "both",
      },
      {
        dimension: "Inference location",
        shadowtalk: "Your GPU, in your browser tab — prompts never cross the network in on-device mode",
        them: "Cloud: DuckDuckGo proxies prompts to model providers under a no-training contract",
        edge: "shadowtalk",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk: "Private Mode encrypts chats end-to-end (AES-256-GCM). Honest default: chats are stored server-side when Private Mode is off",
        them: "Recent chats kept locally in the browser; no end-to-end encryption layer and no cross-device sync ships as of November 2026",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk: "Device-tiered open models on-device plus 16+ cloud providers via BYOK",
        them: "A small curated menu of cloud models; daily limits on the free tier",
        edge: "shadowtalk",
      },
      {
        dimension: "Cross-device sync",
        shadowtalk: "Yes — one synced history across phone and desktop, E2EE when Private Mode is on",
        them: "No account means no cross-device chat sync — history stays per-device",
        edge: "shadowtalk",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK passes provider costs through at cost",
        them: "Free with daily limits; a paid plan adds higher limits and extra models",
        edge: "both",
      },
    ],
    whereTheyWinHeading: "Where DuckDuckGo AI Chat wins",
    whereTheyWin: [
      "Simplicity: duck.ai is a webpage with zero setup — no model download, nothing to install, usable in seconds",
      "Frontier models anonymously: curated cloud models under a published no-training policy — anonymous access to big models is something on-device tiers can't match",
      "Trust signal: DuckDuckGo's brand is privacy, and its no-training contract with model providers is public",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "duck.ai is the best anonymous cloud chat on the market — if your bar is 'no account, no training', it clears it. The structural limit is the same as every cloud tool: prompts cross the network every time, so there's no offline mode and no cross-device history. ShadowTalk keeps the anonymity and adds local compute: the first AI chat in a browser that works offline and syncs when you're back — no account either, with zero-egress on-device inference and end-to-end encryption when Private Mode is on.",
    ],
    faqs: [
      {
        question: "Is DuckDuckGo AI chat private?",
        answer:
          "More than most cloud chat: no account, and DuckDuckGo publishes its policy that model providers can't train on your duck.ai chats. But prompts still cross the network to cloud servers every time. ShadowTalk's on-device mode keeps prompts on your GPU entirely — nothing crosses the network at all — and Private Mode adds end-to-end encryption for stored and synced chats.",
      },
      {
        question: "Does duck.ai work offline?",
        answer:
          "No — it relays prompts to cloud models, so it needs a connection every time. For offline chat you need a model that runs on your device: ShadowTalk's WebGPU mode, LM Studio, Ollama or similar.",
      },
      {
        question: "Does duck.ai sync chats across devices?",
        answer:
          "No — with no account there's no cross-device chat sync; recent chats live per browser as of November 2026. ShadowTalk syncs one history across phone and desktop, encrypted end-to-end when Private Mode is on.",
      },
      {
        question: "Which is more private — duck.ai or ShadowTalk?",
        answer:
          "They differ by layer. duck.ai anonymizes transit to the cloud (strong no-training policy, but your prompt still reaches a server to be answered). ShadowTalk's on-device mode eliminates transit entirely — the strongest privacy there is — and its published defaults state exactly what still touches a server in other modes.",
      },
    ],
    related: [
      { label: "AI chat without an account", href: "/ai-chat-without-account", note: "Guest mode, honestly" },
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "The three privacy tiers" },
      { label: "ShadowTalk vs Brave Leo", href: "/vs/brave-leo", note: "The other browser AI, scored" },
      { label: "What is on-device AI", href: "/what-is-on-device-ai", note: "Why inference location matters" },
    ],
    ctaLabel: "Anonymous + on-device — free",
  },
  "brave-leo": {
    slug: "brave-leo",
    competitor: "Brave Leo",
    breadcrumb: "ShadowTalk vs Brave Leo",
    h1: "ShadowTalk AI vs Brave Leo — browser AI, scored honestly",
    definition:
      "Brave Leo is a sidebar assistant built into the Brave browser: its default models run on Brave's cloud servers, the free tier is rate-limited, and heavier use is a paid subscription. ShadowTalk AI is a free workspace that runs a model on your own GPU, works offline with queued sync, and runs in any modern browser — Chrome, Edge or Brave itself.",
    intro:
      "Leo and ShadowTalk share a privacy-first instinct — Brave states Leo chats aren't used for training, and it even lets advanced users point Leo at their own model server. The structural differences are where the models run and what happens to your history. Both sides get full credit below.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — on-device WebGPU inference, zero network egress after a one-time download",
        them: "Not by default — Leo's models run on Brave's cloud; only a self-hosted custom model endpoint changes that",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync when signal returns",
        them: "Not applicable — the default experience needs a connection",
        edge: "shadowtalk",
      },
      {
        dimension: "Browser lock-in",
        shadowtalk: "None — works in Chrome, Edge, Brave, any modern browser with WebGPU",
        them: "Brave browser only — the sidebar ships inside Brave",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "No account for the rate-limited free tier; Leo Premium subscription for higher limits",
        edge: "both",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk: "Private Mode encrypts chats end-to-end (AES-256-GCM). Honest default: chats are stored server-side when Private Mode is off",
        them: "Leo history lives locally per device and can auto-wipe on exit; no end-to-end encrypted cross-device sync ships as of November 2026",
        edge: "shadowtalk",
      },
      {
        dimension: "Cross-device sync",
        shadowtalk: "Yes — one synced history across phone and desktop, E2EE when Private Mode is on",
        them: "Leo chats are per-device; Brave Sync covers browser data, not Leo chats",
        edge: "shadowtalk",
      },
      {
        dimension: "Model choice",
        shadowtalk: "Device-tiered open models on-device + 16+ cloud providers via BYOK",
        them: "Brave-curated cloud models; advanced users can add a custom (e.g. local Ollama) endpoint",
        edge: "both",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK passes provider costs through at cost",
        them: "Free tier with rate limits; Leo Premium subscription beyond that",
        edge: "shadowtalk",
      },
    ],
    whereTheyWinHeading: "Where Brave Leo wins",
    whereTheyWin: [
      "Zero setup inside Brave: the sidebar is already there — no download, no tab management, one shortcut away",
      "Custom model endpoints: Leo can point at your own OpenAI-compatible server (including local Ollama) — an advanced feature done well",
      "No-training stance by default: Brave's published policy says Leo conversations aren't used for model training",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Leo is a good sidebar and Brave's privacy instincts are real — the custom-endpoint support deserves respect. But it is still cloud inference inside a single browser, rate-limited free and subscription-paid beyond that, with per-device history. ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back: the model runs on your GPU in any modern browser, on-device chat has no rate limits, and your history follows you across devices end-to-end encrypted when Private Mode is on.",
    ],
    faqs: [
      {
        question: "Does Brave Leo work offline?",
        answer:
          "Not by default — Leo's models run on Brave's cloud. Advanced users can add a custom endpoint pointing at a local Ollama server, but that's your own stack to run and it still lives outside the browser tab. ShadowTalk's on-device model needs no stack: it downloads into the browser once and runs offline with zero network egress.",
      },
      {
        question: "Is Brave Leo private?",
        answer:
          "Respectably: Brave publishes that Leo chats aren't used for training and routes them through its own infrastructure. They still cross the network to be answered, and history is per-device. ShadowTalk's on-device mode never transits, and Private Mode encrypts stored and synced chats end-to-end.",
      },
      {
        question: "Does Leo sync chats across devices?",
        answer:
          "No — Leo chat history is per-device as of November 2026; Brave Sync handles browser data, not Leo conversations. ShadowTalk syncs one history across phone and desktop, end-to-end encrypted when Private Mode is on.",
      },
      {
        question: "Do I need Brave to use ShadowTalk?",
        answer:
          "No — ShadowTalk runs in any modern browser with WebGPU: Chrome, Edge or Brave itself, on desktop and Android. Install it as a PWA in one tap; no app store, no account.",
      },
    ],
    related: [
      { label: "AI chat without an account", href: "/ai-chat-without-account", note: "Guest mode, honestly" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "How on-device inference works" },
      { label: "ShadowTalk vs DuckDuckGo AI", href: "/vs/duckduckgo-ai", note: "The anonymous cloud alternative, scored" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The cloud giant, scored" },
    ],
    ctaLabel: "Any browser, on-device, free",
  },

  grok: {
    slug: "grok",
    competitor: "Grok",
    breadcrumb: "ShadowTalk vs Grok",
    h1: "ShadowTalk AI vs Grok — real-time X data vs an AI that works offline",
    definition:
      "Grok is xAI's cloud assistant: prompts are processed on xAI's servers, an account is required, and without internet it cannot answer at all. Its real differentiator is live access to X (Twitter) posts and trends — genuinely useful for breaking events and real-time sentiment. ShadowTalk AI is a free browser workspace that runs a model on your own device, queues chats sent offline and syncs when you're back, and never trains on your data.",
    intro:
      "Grok is the cloud assistant with a genuinely distinct hook — the social firehose — so this comparison scores that strength honestly instead of dismissing it, then maps the structural differences: offline, account, model choice, encryption and price. Landscape checked Nov 2026; verify current tiers with xAI.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — after a one-time model download, on-device WebGPU inference with zero network egress",
        them: "No — every answer is generated on xAI's servers, so no connection means no answer",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync automatically when signal returns",
        them: "Not applicable — the app needs a connection to function",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "Yes — an X or grok.com account",
        edge: "shadowtalk",
      },
      {
        dimension: "Real-time social data",
        shadowtalk: "Deep research with citations when online — but no social firehose",
        them: "Live integration with X posts and trends — differentiating for breaking events and sentiment",
        edge: "them",
      },
      {
        dimension: "Model choice",
        shadowtalk: "16+ providers via BYOK — OpenAI, Anthropic, Google, Groq, DeepSeek and more — plus the on-device model",
        them: "xAI's Grok models only",
        edge: "shadowtalk",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk: "Private Mode encrypts chats end-to-end (AES-256-GCM) with device-derived keys. Honest default: chats are stored server-side when Private Mode is off",
        them: "Stored server-side on xAI infrastructure; no client-side end-to-end encryption",
        edge: "shadowtalk",
      },
      {
        dimension: "Training on your chats",
        shadowtalk: "Never — on any tier, including free shared mode",
        them: "Public X content is a documented training source; chat-data terms live in its published privacy notice — check current terms",
        edge: "shadowtalk",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK passes provider costs straight through at cost",
        them: "Free tier with usage limits; X Premium subscriptions raise limits and model access (checked Nov 2026)",
        edge: "both",
      },
    ],
    whereTheyWinHeading: "Where Grok wins",
    whereTheyWin: [
      "Real-time X integration: live posts and trends for breaking events, sentiment and what the social web is actually saying — nothing offline can replicate that",
      "Frontier-class Grok models with a distinct, less-filtered voice that some users genuinely prefer",
      "Built-in image generation inside the same assistant",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Choose Grok when you're always online and want its real X firehose — breaking events, sentiment, the social layer no other assistant has. Choose ShadowTalk when the network disappears, when you don't want an account, when you want your pick of 16+ providers, or when you want encryption you control: ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back, and a cloud-only assistant is structurally unable to say that.",
      "The honest middle path: many users keep both — Grok for the social web, ShadowTalk as the default workspace that keeps answering offline, with defaults published rather than buried (chats stored server-side when Private Mode is off, E2EE when it's on).",
    ],
    faqs: [
      {
        question: "Can Grok work offline?",
        answer:
          "No. Grok is a cloud service — prompts are processed on xAI's servers, so without internet it produces nothing. If you need offline AI chat, you need an on-device model like ShadowTalk's WebGPU mode, LM Studio or Ollama. ShadowTalk also gives you cloud power via BYOK when you're back online.",
      },
      {
        question: "Is Grok free?",
        answer:
          "There's a free tier with usage limits, and X Premium subscriptions raise limits and model access (checked Nov 2026 — verify current tiers with xAI). ShadowTalk is free with no subscription and no card: the on-device model costs nothing to run, and BYOK passes provider API prices through at cost.",
      },
      {
        question: "Does xAI train on my data?",
        answer:
          "Public X posts are a documented training source for xAI; for chat-specific terms, read its current published privacy notice rather than taking this page's word for it. ShadowTalk's commitment is unconditional: no training on your chats on any tier, and the on-device model keeps sensitive prompts on your machine entirely.",
      },
      {
        question: "Which should I actually pick?",
        answer:
          "If your work is real-time social intelligence, Grok's firehose is the point — use it. If your work has to survive dead zones, blocked networks and privacy-conscious material, ShadowTalk's offline core, no-account guest mode and E2EE Private Mode are the point. They're not mutually exclusive: one is a source, the other is a workspace that keeps working.",
      },
    ],
    related: [
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The other cloud giant, scored" },
      { label: "ShadowTalk vs Perplexity", href: "/vs/perplexity", note: "Real-time answers, compared" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "How offline + sync works" },
      { label: "Free AI chat guide", href: "/free-ai-chat", note: "What 'free' means here" },
    ],
    ctaLabel: "Try AI that works offline — free",
  },

  poe: {
    slug: "poe",
    competitor: "Poe",
    breadcrumb: "ShadowTalk vs Poe",
    h1: "ShadowTalk AI vs Poe — points-metered aggregator vs BYOK at cost, offline",
    definition:
      "Poe is Quora's multi-model aggregator: one account gives you chat access to many providers' models, but everything runs on Poe's cloud servers — account required, no offline mode, and usage metered through daily points or a subscription. ShadowTalk AI aggregates differently: your own API keys (BYOK) go browser-to-provider at cost across 16+ providers, plus an on-device model that works offline and syncs when you're back — no subscription, no points.",
    intro:
      "Both products answer the same need — many models, one place — so this comparison is about the mechanics: who holds the keys, who meters your usage, where inference runs, and what happens when the internet does. Where Poe is genuinely better, we say so. Landscape checked Nov 2026.",
    rows: [
      {
        dimension: "Works offline",
        shadowtalk: "Yes — after a one-time model download, on-device WebGPU inference with zero network egress",
        them: "No — a cloud aggregator; every answer is generated on Poe's servers",
        edge: "shadowtalk",
      },
      {
        dimension: "Chats sent while offline",
        shadowtalk: "Queue in durable local storage and sync automatically when signal returns",
        them: "Not applicable — the app needs a connection to function",
        edge: "shadowtalk",
      },
      {
        dimension: "Account required",
        shadowtalk: "No — guests chat immediately, including with the on-device model",
        them: "Yes — a Quora/Poe account",
        edge: "shadowtalk",
      },
      {
        dimension: "Multi-model access",
        shadowtalk: "16+ providers via BYOK at provider cost — pick the best model per task, no markup",
        them: "Many providers' models behind one login — simple, but metered in points",
        edge: "both",
      },
      {
        dimension: "Usage metering",
        shadowtalk: "On-device is unlimited and free; BYOK pays provider API prices at cost — no points, no subscription",
        them: "Free daily points; a subscription raises the ceiling for heavy use",
        edge: "shadowtalk",
      },
      {
        dimension: "Stored-chat encryption",
        shadowtalk: "Private Mode encrypts chats end-to-end (AES-256-GCM) with device-derived keys. Honest default: chats are stored server-side when Private Mode is off",
        them: "Stored server-side on Quora infrastructure; no client-side end-to-end encryption",
        edge: "shadowtalk",
      },
      {
        dimension: "Custom bots and sharing",
        shadowtalk: "Workspace tools instead: research with citations, ProofLoop missions, voice, an IDE",
        them: "Create, publish and even monetize custom bots — a real ecosystem ShadowTalk doesn't try to copy",
        edge: "them",
      },
      {
        dimension: "Price",
        shadowtalk: "Free to use, no card; BYOK at cost — heavy use bills like the API it is",
        them: "Free tier on daily points; subscription for serious volume",
        edge: "both",
      },
    ],
    whereTheyWinHeading: "Where Poe wins",
    whereTheyWin: [
      "Zero-setup breadth: many frontier models behind one login — no API keys to create, store or manage, which is genuinely simpler for casual multi-model sampling",
      "The custom-bot ecosystem: build, publish and monetize bots inside Poe — a network effect nothing in ShadowTalk mirrors",
      "Bundled image and video generation alongside chat models",
    ],
    verdictHeading: "The verdict",
    verdictParagraphs: [
      "Choose Poe when you want many models with zero setup and you're happy metering your usage in points — its custom-bot ecosystem is real value for creators. Choose ShadowTalk when you want the economics at cost instead of points, the privacy dial (on-device zero egress, E2EE Private Mode), or the part no cloud aggregator can offer: it works offline and syncs when you're back — the first AI chat in a browser that can say that.",
      "The mechanics matter long-term: points end, subscriptions renew, and aggregator markups sit between you and the provider. BYOK is the same one-workplace idea with you holding the keys — provider prices at cost, no metering games, and an on-device model underneath it all that answers whether or not the network does.",
    ],
    faqs: [
      {
        question: "Can Poe work offline?",
        answer:
          "No. Poe is a cloud aggregator — prompts are processed on its servers, so without internet it cannot answer. ShadowTalk's on-device model runs in the browser on your GPU with zero network egress, and chats sent offline queue and sync when you're back.",
      },
      {
        question: "Is Poe cheaper than BYOK?",
        answer:
          "Depends on volume. Light users ride free daily points and Poe is effectively free. Heavy users should compare honestly: a Poe subscription versus provider API prices paid at cost through BYOK — at high volume, at-cost pricing usually wins, and the on-device tier is free in both worlds. Your meter decides.",
      },
      {
        question: "Does Poe see my chats?",
        answer:
          "As a cloud service, Poe processes every prompt server-side and stores chats on Quora infrastructure — that's how the product works. ShadowTalk's tiers are published: on-device chats never transit the server, Private Mode stores ciphertext (AES-256-GCM), and the default (server-side storage when Private Mode is off) is documented rather than buried.",
      },
      {
        question: "Why does ShadowTalk use BYOK instead of reselling models?",
        answer:
          "Because reselling inference means metering it. ShadowTalk is a workspace, not a middleman: your keys go browser-to-provider at the provider's own price, with no points and no markup — and the on-device model underneath costs nothing to run, works offline, and never trains on your chats.",
      },
    ],
    related: [
      { label: "ShadowTalk vs Perplexity", href: "/vs/perplexity", note: "The answer engine, scored" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The single-provider giant" },
      { label: "Free AI chat guide", href: "/free-ai-chat", note: "What 'free' means here" },
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "The three privacy tiers" },
    ],
    ctaLabel: "One workspace, your keys, offline too — free",
  },
};

/** One-line verdicts for the /compare hub and llms.txt */
export const COMPARE_HUB_LINE: Record<string, string> = {
  chatgpt: "Cloud giant vs offline-first: account, servers and no internet vs on-device, no account, free",
  gemini: "Google's cloud assistant vs on-device zero-egress chat that syncs when you're back",
  claude: "Frontier writing, cloud-only and account-required vs offline queue + sync in a tab",
  "lm-studio": "Powerful desktop app whose sync is still feature request #2467 vs browser tab that syncs",
  "proton-lumo": "Zero-access stored history — but prompts decrypted server-side and no offline vs on-device + E2EE",
  "web-llm-chat": "The MIT-licensed demo that proved browser LLMs vs the product around it",
  ollama: "The developer runtime with a huge model zoo vs zero-install end-user local AI",
  jan: "Fully open-source desktop local AI vs the zero-install browser tab that syncs",
  perplexity: "The always-online answer engine vs cited research that survives dead zones",
  pocketpal: "On-device AI on one phone vs the PWA that also runs on-device — and syncs",
  deepseek: "Open-weight frontier value, but the official app is cloud-only with 2025 regulator scrutiny vs BYOK + on-device offline",
  copilot: "Microsoft's cloud assistant baked into Windows vs a browser tab that answers offline and syncs",
  "duckduckgo-ai": "Anonymous cloud chat with a no-training policy vs zero-egress on-device chat that also syncs",
  "brave-leo": "A Brave-only sidebar on cloud models vs a workspace whose model runs on your GPU in any browser",
  poe: "Quora's points-metered aggregator on cloud servers vs BYOK at cost across 16+ providers — plus an offline on-device model",
  grok: "xAI's cloud assistant with the live X firehose vs on-device chat with zero egress and no account",
};
