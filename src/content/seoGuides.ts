/**
 * SEO/GEO/AEO guide content — one intent-cluster page per search cluster.
 *
 * Every claim here is grounded in shipped code (see MODEL_MIRROR_SETUP.md,
 * src/offline/, src/lib/cloudChat.ts, src/lib/e2e-encryption.ts) or in the
 * open landscape (LM Studio feature request #2467, ChatterUI WebDAV issue,
 * Proton's published Lumo security model) — checked Nov 2026.
 */

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export interface GuideRelated {
  label: string;
  href: string;
  note: string;
}

export interface SeoGuide {
  slug: string;
  breadcrumb: string;
  h1: string;
  /** Extractive two-to-three-sentence answer — the block answer engines quote */
  definition: string;
  intro: string;
  sections: GuideSection[];
  howTo?: { name: string; steps: string[] };
  faqs: Array<{ question: string; answer: string }>;
  related: GuideRelated[];
  ctaLabel: string;
}

export const SEO_GUIDES: Record<string, SeoGuide> = {
  "offline-ai-chat": {
    slug: "offline-ai-chat",
    breadcrumb: "Offline AI chat",
    h1: "Offline AI chat that actually works",
    definition:
      "ShadowTalk AI is a free, installable web app where the AI model runs on your own device. After a one-time download (300MB-2.6GB depending on your device tier), chat works with zero internet — and anything you send while offline queues up in durable local storage and syncs the moment you're back. You install it in one tap from the browser: no app store, no account, no card.",
    intro:
      "Most AI assistants die the moment your signal does. ShadowTalk is built the other way round: the model lives on your device, the app shell is cached, and the network is only needed for the very first visit and for optional cloud work. This guide explains what works offline, what still needs a connection, and why the offline-plus-sync combination is something the rest of the market doesn't ship.",
    sections: [
      {
        heading: "Can you use ChatGPT offline?",
        paragraphs: [
          "No — ChatGPT, Gemini and Claude are cloud services: every token is generated on their servers, so without a connection they simply cannot answer. That's true even for their mobile apps with history cached.",
          "The offline options that do exist each give up something. Desktop apps like LM Studio and Ollama run powerful local models but keep chats on one machine — LM Studio's device sync is still an open feature request (issue #2467) and ChatterUI's WebDAV chat-merge never shipped. Mobile apps like PocketPal or MuraAI run models on your phone but don't sync either. Browser demos like Secret Llama or web-llm-chat run locally with no accounts — but nothing backs up or moves your history.",
          "ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back: on-device WebGPU inference for the answers, durable local caching for the chats, and automatic catch-up sync the next time you have signal — with end-to-end encryption while synced when Private Mode is on.",
        ],
      },
      {
        heading: "Built for real dead zones",
        paragraphs: [
          "Tunnels, flights, rural coverage gaps, blackout zones, campus firewalls — ShadowTalk assumes the network is a sometimes-food. Because inference runs on your GPU through a background Web Worker, replies stream at the speed of your hardware, not your signal bar.",
        ],
        bullets: [
          "Reloads lose nothing: chats and drafts persist in durable on-device storage (verified by automated offline smoke tests in CI)",
          "The app shell loads with zero third-party requests — fonts, scripts and even model weights come from ShadowTalk's own infrastructure",
          "Interrupted model downloads pause and resume shard-by-shard; a dying connection never restarts from zero",
          "Chats sent with no signal queue locally and arrive when the network returns — no re-sending, no lost drafts",
        ],
      },
      {
        heading: "The part everyone else is missing: sync",
        paragraphs: [
          "Offline AI and synced AI chat have never shipped in the same product — until now. The landscape as of November 2026, each line checkable:",
        ],
        bullets: [
          "Offline AI camp (LM Studio, web-llm-chat, Secret Llama): real on-device models, no sync at all — LM Studio device sync is feature request #2467, ChatterUI's WebDAV merge is unshipped",
          "Encrypted AI camp (Proton Lumo, Confer): synced encrypted history — but cloud-only inference, an account, and a live internet requirement; Lumo's own security model documents the server decrypting your prompt in cleartext to answer it",
          "Local + sync attempts (Locra and Pal Chat via iCloud, LocalMind via your own Ollama/LM Studio server plus your own S3): native apps or bring-your-own-server — never just a browser tab",
        ],
      },
      {
        heading: "What you need (honest requirements)",
        paragraphs: [
          "On-device chat needs a WebGPU-capable browser — Chrome or Edge 113+ — and enough storage for the model tier your device picks. The very first visit needs a connection to install the app shell and download the model once; everything after that runs locally. Cloud models and real-time web search always use the network, and devices without WebGPU fall back to cloud chat when online.",
        ],
        bullets: [
          "Browser: Chrome or Edge 113+ (WebGPU enabled by default)",
          "Storage: about 600MB-2.6GB by model tier — the manager pre-checks your quota before downloading",
          "Account: none required — guests get a local model automatically",
          "iOS note: the PWA installs, but WebGPU support on iPhones varies by iOS version; on-device mode targets Chrome/Edge on desktop and Android first",
        ],
      },
    ],
    howTo: {
      name: "Start chatting offline in about a minute",
      steps: [
        "Open shadowtalk-ai.com in Chrome or Edge 113+ while you still have a connection.",
        "Install the app: use the install icon in the address bar (PWA) — it lands on your home screen or dock.",
        "Open the model manager, pick the model your device suggests, and let it download once — interrupted downloads resume automatically.",
        "Go offline. Keep chatting: replies are generated on your device with zero network requests.",
        "When signal returns, queued messages sync on their own — end-to-end encrypted if Private Mode is on.",
      ],
    },
    faqs: [
      {
        question: "Does offline AI chat work with no internet at all?",
        answer:
          "Yes — for on-device models. After the one-time model download, chat inference runs entirely in your browser with zero network egress: no prompts, replies or history leave the device. The app shell itself reloads offline too, which our automated offline smoke tests verify on every build.",
      },
      {
        question: "What happens to messages I send while offline?",
        answer:
          "They're written to durable on-device storage first and queue for sync. When the network returns, they sync automatically — you never re-send or lose a draft. With Private Mode on, everything that syncs is end-to-end encrypted (AES-256-GCM) before it leaves the device.",
      },
      {
        question: "Is offline AI chat free?",
        answer:
          "Yes. ShadowTalk AI is free to use with no subscription and no card. On-device models cost nothing to run. Cloud models are free on the shared tier within daily limits, or unlimited with your own provider API key (BYOK).",
      },
      {
        question: "Which devices support offline AI chat?",
        answer:
          "Anything running Chrome or Edge 113+ with WebGPU: Windows, macOS, Linux and most modern Android phones. The app pre-checks GPU features and storage quota, then picks a model tier that fits — from a 600MB nano model on modest devices up to 3B-class models on 8GB+ machines.",
      },
      {
        question: "Is offline chat actually private?",
        answer:
          "On-device chat has zero network egress, so nothing exists to intercept. For stored history, Private Mode encrypts messages, titles and metadata end-to-end with AES-256-GCM using keys derived on your device. Honest caveat: default (non-private) chats are stored server-side, and the free shared mode routes requests through ShadowTalk's server — use BYOK plus Private Mode or on-device mode when you need nothing to touch a server.",
      },
    ],
    related: [
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "Cloud-only vs offline-first, scored" },
      { label: "Private AI chat — encryption, no account, BYOK", href: "/private-ai-chat", note: "How the three privacy tiers work" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "WebGPU models, sizes and speed" },
      { label: "Security & Trust", href: "/security", note: "Encryption, keys and data handling" },
    ],
    ctaLabel: "Start offline AI chat — free",
  },

  "private-ai-chat": {
    slug: "private-ai-chat",
    breadcrumb: "Private AI chat",
    h1: "Private AI chat — no account, no plaintext on a server",
    definition:
      "ShadowTalk AI is a free AI chat where you can start as a guest with no account, send cloud requests browser-to-provider with your own API key (BYOK), run the model fully on your device, and switch on end-to-end encryption (AES-256-GCM) for stored chats in Private Mode. You choose the privacy tier per conversation — including the tier where no server ever sees plaintext.",
    intro:
      "\"Private\" is the most abused word in AI. This page defines exactly what ShadowTalk does at each tier, where your keys live, what the server can and cannot see, and where the honest limits are — so you can decide instead of trusting a slogan.",
    sections: [
      {
        heading: "What \"private AI chat\" should mean",
        paragraphs: ["Six checks any private AI chat should pass. ShadowTalk passes them at some tier — and tells you exactly which:"],
        bullets: [
          "No account required to start — guests can chat immediately, including with a local model",
          "Your keys stay yours — BYOK keys live in your browser and are sent directly to the provider you chose",
          "No training on your conversations — ShadowTalk never trains foundation models on your chats",
          "An on-device option — inference can run in your browser with zero network egress",
          "Encryption at rest you control — Private Mode encrypts chats end-to-end before storage",
          "Honest server story — documented, not hidden: what defaults store, what free shared mode transits",
        ],
      },
      {
        heading: "Three privacy tiers you pick per chat",
        paragraphs: ["ShadowTalk's privacy is a dial, not a promise:"],
        bullets: [
          "Tier 1 — Guest + on-device: no account, model runs in your browser, zero network egress. Nothing to intercept because nothing is sent.",
          "Tier 2 — BYOK direct: paste an API key from any of 16+ providers (OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter and more). The key is stored in your browser only, and requests go straight from your browser to the provider — including Anthropic's direct browser access header — with no ShadowTalk proxy in the path.",
          "Tier 3 — Private Mode: stored chats, titles and metadata are encrypted end-to-end with AES-256-GCM. Keys are derived on your device from your passphrase, held as non-extractable browser keys, and kept memory-only. Turning Private Mode on mid-conversation retroactively encrypts the whole history. Storage follows an encrypt-or-null contract: if encryption fails, nothing is written rather than silently falling back to plaintext.",
        ],
      },
      {
        heading: "How that compares to the privacy-first names you know",
        paragraphs: [
          "Proton Lumo protects chat history with zero-access encryption — but inference is cloud-only (its published security model describes the server decrypting your prompt to process it), it needs an account and it needs the internet. Secret Llama and web-llm-chat run fully in your browser with no server — but they have no sync, no backup and no upgrade path to cloud models. ShadowTalk is the only product that combines on-device inference, end-to-end encrypted storage, cross-device sync and BYOK direct-to-provider in one browser tab — free.",
        ],
      },
      {
        heading: "Honest limits (read this part)",
        paragraphs: [
          "Privacy claims die in the fine print, so here is ours. Default chats — when Private Mode is off — are stored server-side in Firestore. The free shared mode routes cloud requests through ShadowTalk's server, which necessarily sees that mode's prompts. The service includes analytics events. Server-side data has admin read access in the database rules. If you need zero server exposure, that's exactly what Tiers 1-3 are for: on-device mode, BYOK direct requests, and Private Mode encryption. Most products hide this paragraph; shipping it is the point.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does ShadowTalk train AI on my chats?",
        answer:
          "No. ShadowTalk never trains foundation models on your conversations — on any tier, including the free shared mode.",
      },
      {
        question: "Where are my API keys stored?",
        answer:
          "In your browser, namespaced per user. Requests carrying your key go directly from your browser to the provider you chose — no ShadowTalk proxy in the path. The server-held key pool only exists for the free shared mode, which refuses BYOK accounts by design.",
      },
      {
        question: "What exactly does Private Mode encrypt?",
        answer:
          "Message content, conversation titles and metadata, at rest, with AES-256-GCM. Keys are derived on your device from your passphrase and are non-extractable, memory-only browser keys. Enabling Private Mode mid-chat retroactively encrypts the whole conversation, and the storage contract is encrypt-or-null: a failed encryption skips the write instead of storing plaintext.",
      },
      {
        question: "Can the ShadowTalk server read my chats?",
        answer:
          "It depends on the tier you chose — and we say so plainly. On-device chats never transit the server. Private Mode chats are stored as ciphertext. Default chats are stored server-side, and free shared-mode requests are processed by the server. The honest answer is why the tiers exist.",
      },
      {
        question: "Do I need an account for private AI chat?",
        answer:
          "No. Guests can chat with an on-device model immediately. An account is only needed if you want your encrypted history to follow you across devices.",
      },
    ],
    related: [
      { label: "ShadowTalk vs Proton Lumo", href: "/vs/proton-lumo", note: "Encrypted AI, compared honestly" },
      { label: "Offline AI chat — works with no internet", href: "/offline-ai-chat", note: "On-device models plus sync on reconnect" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "Which models run on-device" },
      { label: "Security & Trust", href: "/security", note: "The full data-handling write-up" },
    ],
    ctaLabel: "Start private AI chat — free",
  },

  "run-llm-in-browser": {
    slug: "run-llm-in-browser",
    breadcrumb: "Run an LLM in your browser",
    h1: "Run an LLM in your browser — no install, no server",
    definition:
      "With WebGPU, a modern browser can run quantized LLMs — Llama 3.2, Qwen 2.5, SmolLM2 — directly in a tab, on your own GPU. ShadowTalk AI turns that capability into a product: a device-tiered model manager, resumable per-shard downloads, a watchdogged inference worker, and automatic escalation to cloud models when a task is too heavy — free.",
    intro:
      "Browser LLMs spent years as demos. This page explains how they actually work, which models fit which machines, and what separates a packaged product from a proof-of-concept — with the specific engineering ShadowTalk ships for each gap.",
    sections: [
      {
        heading: "How a browser runs a language model",
        paragraphs: [
          "Three pieces make it work. First, WebGPU: the browser exposes your GPU's compute shaders to JavaScript, which is what makes billion-parameter models interactive on consumer hardware. Second, an inference engine — ShadowTalk uses MLC's WebLLM — running in a background Web Worker so the interface stays responsive while the model thinks. Third, storage: model weights stream down as shards and are cached per-shard in the browser's Cache API, which is what makes downloads resumable and repeat visits instant.",
        ],
        bullets: [
          "WebGPU compute shaders execute the transformer on your hardware — prompts never leave the device",
          "The engine runs in a Web Worker: the UI keeps 60fps while tokens stream",
          "Per-shard caching means a dropped connection pauses the download; it resumes, never restarts",
          "GPUs without the shader-f16 feature automatically get q4f32 quantized model twins — the swap happens at activation time",
        ],
      },
      {
        heading: "Models you can run, and what they need",
        paragraphs: [
          "ShadowTalk's model registry pre-checks your GPU features and storage quota, then offers the tiers that fit. All sizes below are approximate on-device footprints:",
        ],
        table: {
          headers: ["Model", "Strength", "Size (q4f16 / q4f32)"],
          rows: [
            ["Qwen2.5-0.5B-Instruct", "Nano tier — modest devices", "600MB / 700MB"],
            ["Llama-3.2-1B-Instruct", "Instant default — fast, capable", "880MB / 1.1GB"],
            ["SmolLM2-1.7B-Instruct", "Balanced everyday chat", "1.68GB / 2.0GB"],
            ["Qwen2.5-Coder-1.5B / 3B", "Code generation on-device", "1.5GB / 2.3GB"],
            ["Llama-3.2-3B-Instruct", "Pro tier — needs 8GB+ devices", "2.1GB / 2.4GB"],
            ["Qwen2.5-3B-Instruct", "Pro tier — strongest local chat", "2.3GB / 2.6GB"],
          ],
        },
      },
      {
        heading: "From demo to product: the gaps most browser LLMs leave open",
        paragraphs: [
          "Running a model in a tab is easy; shipping it is not. What ShadowTalk adds around the raw engine:",
        ],
        bullets: [
          "Tiered, consent-gated background install with storage-quota pre-checks and auto-retry with backoff — offline pauses and resumes cleanly",
          "Watchdogged engine lifecycle: 45s init watchdog, generation watchdogs, and a recovery ladder that caps worst-case wait at about three minutes",
          "A tested hybrid router (30+ unit-tested cases): small talk and quick replies stay on-device, heavy tasks escalate to your chosen cloud model — Apple-Intelligence-style routing, in a browser",
          "A supply chain you can audit: zero third-party runtime calls, self-hosted fonts, and model weights plus engine WASMs mirrored on the project's own git branch — Hugging Face is not on the critical path",
        ],
      },
      {
        heading: "Developer notes",
        paragraphs: [
          "The stack is Vite + React + TypeScript with @mlc-ai/web-llm 0.2.x, vite-plugin-pwa for the precached shell (10MB-per-file cap, weights excluded by design), and a puppeteer-verified offline smoke test in CI that asserts zero third-party hits under a network cut. The mirrored 0.5B model twins and their model_lib WASMs live on the repo's orphan weights branch, byte-identical to upstream, with an env override for self-hosters.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need a GPU to run an LLM in the browser?",
        answer:
          "You need a WebGPU-capable browser and any modern GPU — integrated graphics included. ShadowTalk pre-checks GPU features: hardware without shader-f16 automatically gets q4f32 quantized model twins, and devices without usable WebGPU fall back to cloud chat when online.",
      },
      {
        question: "Which browsers can run browser LLMs?",
        answer:
          "Chrome and Edge 113+ ship WebGPU by default and are the tested path. Firefox and Safari support is emerging and varies by version. The rest of ShadowTalk (cloud chat, research, tools) works in any modern browser.",
      },
      {
        question: "How fast is in-browser inference?",
        answer:
          "Interactive — on the order of tens of tokens per second on recent laptops — depending on your GPU and model tier. The 0.5B-1B tiers feel instant for chat; 3B-class models trade speed for depth. Inference runs in a Web Worker, so streaming replies don't freeze the interface.",
      },
      {
        question: "Does on-device inference send my prompts anywhere?",
        answer:
          "No. On-device mode has zero network egress — prompts, context and replies stay in the tab. Traffic only happens when you explicitly use cloud models or network tools like web search.",
      },
      {
        question: "Can I switch models after downloading one?",
        answer:
          "Yes — the model manager lists everything you've downloaded and lets you switch active models anytime; downloads are per-shard cached, so trying another tier is a one-time incremental download, not a re-download.",
      },
    ],
    related: [
      { label: "ShadowTalk vs web-llm-chat", href: "/vs/web-llm-chat", note: "The demo vs the product, scored" },
      { label: "ShadowTalk vs LM Studio", href: "/vs/lm-studio", note: "Desktop local AI vs browser local AI" },
      { label: "Offline AI chat — works with no internet", href: "/offline-ai-chat", note: "What keeps working after the download" },
      { label: "Private AI chat — encrypted, no account", href: "/private-ai-chat", note: "The three privacy tiers" },
      { label: "Documentation", href: "/docs", note: "Full feature and setup reference" },
    ],
    ctaLabel: "Run your first browser LLM — free",
  },

  "what-is-on-device-ai": {
    slug: "what-is-on-device-ai",
    breadcrumb: "What is on-device AI",
    h1: "What is on-device AI? The plain-English explainer",
    definition:
      "On-device AI means the model runs on your own hardware instead of a cloud server: your prompt, the context and the reply never leave the machine. In a browser this works through WebGPU — your GPU executes a quantized model (roughly 600MB-2.6GB) inside the tab. ShadowTalk AI is a free workspace built around it: on-device chat with zero network egress, offline queueing and automatic sync, plus cloud models when a task needs them.",
    intro:
      "\"On-device\" is the phrase behind private AI, offline AI and edge AI — and it's often used loosely for products that still phone home. This page defines it precisely, shows how a browser can run a model, and lays out what on-device AI is genuinely good for and where cloud models still win.",
    sections: [
      {
        heading: "On-device vs cloud AI",
        paragraphs: ["The two architectures differ in where the model physically runs — everything else follows from that:"],
        table: {
          headers: ["Aspect", "On-device AI", "Cloud AI"],
          rows: [
            ["Where inference runs", "Your CPU/GPU — in a browser via WebGPU", "The provider's servers"],
            ["What leaves your device", "Nothing (zero network egress)", "Your prompt, context and identity"],
            ["Works offline", "Yes, after a one-time model download", "No"],
            ["Model capability", "Practical ceiling ~3B-class in a browser tab", "Frontier models, hundreds of billions of parameters"],
            ["Cost of inference", "Your electricity — nothing else", "Metered or subscription"],
            ["Latency", "Speed of your hardware, not your signal", "Network round-trips"],
          ],
        },
      },
      {
        heading: "How a browser can run a model",
        paragraphs: [
          "Three pieces make it work. WebGPU exposes your GPU's compute shaders to JavaScript. An inference engine (MLC's WebLLM class) executes the transformer in a background Web Worker so the interface stays responsive. And model weights stream down as shards cached in the browser — which makes downloads resumable and repeat visits instant. ShadowTalk wraps that capability with a device-tiered model registry, quota pre-checks and watchdogged workers.",
        ],
      },
      {
        heading: "The privacy math",
        paragraphs: [
          "On-device chat has zero network egress: no prompt, no context, no metadata leaves the tab, so there is nothing to intercept or store server-side. That is the tier where 'nothing sees my prompt' is literally true. Stored history is a separate question — ShadowTalk's Private Mode encrypts chats end-to-end (AES-256-GCM) with keys derived on your device, and default chats are stored server-side when Private Mode is off. Both facts are documented, because privacy claims die in the fine print.",
        ],
      },
      {
        heading: "What on-device AI is good for (and not)",
        paragraphs: [
          "Good for: everyday chat, drafting, summarizing, code help at small scale, anything sensitive, and any situation with bad or no connectivity. Not (yet) for: frontier-level reasoning, very long context, or the newest model releases — those need cloud models, which is why ShadowTalk routes heavy tasks upward automatically instead of pretending a 3B model is a frontier model.",
        ],
      },
    ],
    faqs: [
      {
        question: "What does on-device AI mean?",
        answer:
          "The AI model executes on your hardware rather than a cloud server. Your prompt, context and the reply never leave the machine — in a browser, via WebGPU compute shaders running a quantized model. It's the architecture behind private AI, offline AI and edge AI.",
      },
      {
        question: "Is on-device AI better for privacy?",
        answer:
          "For the prompt itself, yes — categorically. With zero network egress there is nothing to intercept, log or store server-side. Stored history is a separate matter: ShadowTalk's Private Mode encrypts it end-to-end (AES-256-GCM); default chats are stored server-side when Private Mode is off, and we say so in public.",
      },
      {
        question: "How big are on-device AI models?",
        answer:
          "In a browser, roughly 600MB-2.6GB depending on tier: Qwen2.5-0.5B (600MB), Llama-3.2-1B (880MB), SmolLM2-1.7B (1.68GB) up to Qwen2.5-3B (2.3GB). The model manager pre-checks your GPU features and storage quota before downloading anything.",
      },
      {
        question: "Does on-device AI work offline?",
        answer:
          "Yes — that's the point. After the one-time model download, inference runs entirely locally with no connection. ShadowTalk additionally queues messages you send while offline and syncs them when you're back, which is the combination the rest of the market doesn't ship.",
      },
      {
        question: "Which devices support on-device AI?",
        answer:
          "Anything with a WebGPU-capable browser — Chrome or Edge 113+ on Windows, macOS, Linux and most modern Android. GPUs without the shader-f16 feature automatically get q4f32 quantized model twins; devices without usable WebGPU fall back to cloud chat when online.",
      },
    ],
    related: [
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "The technical how-to" },
      { label: "Offline AI chat — works with no internet", href: "/offline-ai-chat", note: "Offline chat + sync, honestly" },
      { label: "Private AI chat — encrypted, no account", href: "/private-ai-chat", note: "The three privacy tiers" },
      { label: "All comparisons", href: "/compare", note: "On-device AI vs the market" },
    ],
    ctaLabel: "Try on-device AI — free",
  },

  "best-offline-ai-chat": {
    slug: "best-offline-ai-chat",
    breadcrumb: "Best offline AI chat",
    h1: "The best offline AI chat in 2026 — ranked with criteria, not vibes",
    definition:
      "The best offline AI chat depends on one question: does your history survive the device? Most local tools don't clear that bar — LM Studio's device sync is still an open feature request (#2467), ChatterUI's WebDAV merge never shipped, and browser demos like Secret Llama and web-llm-chat have no sync at all. ShadowTalk AI is the only option that combines on-device WebGPU chat, offline queueing, automatic sync when you're back, and zero install — free.",
    intro:
      "\"Best\" lists usually hide the criteria. Here's ours, up front: what actually runs offline, whether your chats follow you across devices, whether an account is forced on you, what has to be installed, and what it costs. Then we score the real contenders — including the ones that beat us on raw model size.",
    sections: [
      {
        heading: "The criteria (what \"best offline\" has to mean)",
        bullets: [
          "Offline inference — answers generated with zero network after setup, not a cached chat log",
          "Sync — chats follow you across devices, including messages queued while offline",
          "No forced account — usable as a guest, instantly",
          "Friction — what must be installed, and how big the download is",
          "Privacy — where prompts are processed and what the defaults store",
          "Price — free to use, or gated",
        ],
      },
      {
        heading: "The contenders, scored",
        paragraphs: ["Landscape checked Nov 2026 — every cell is checkable:"],
        table: {
          headers: ["Tool", "Runs", "Syncs chats", "Account", "Install"],
          rows: [
            ["ShadowTalk AI", "Browser tab (WebGPU) + cloud", "Yes — incl. offline queue", "No", "None — one tab"],
            ["LM Studio", "Desktop app (GGUF)", "No — open feature request #2467", "No", "Native app"],
            ["Ollama", "Local runtime + terminal", "No — assemble it yourself", "No", "CLI + models"],
            ["PocketPal", "Mobile app", "No", "No", "App store"],
            ["Secret Llama / web-llm-chat", "Browser demo", "No", "No", "None — one tab"],
            ["ChatGPT / Gemini / Claude", "Cloud only", "Yes (online only)", "Yes", "None — one tab"],
          ],
        },
      },
      {
        heading: "The ranking",
        paragraphs: [
          "1. ShadowTalk AI — the only tool that clears every criterion at once: on-device WebGPU models, offline queueing with automatic catch-up sync, no account, nothing to install, free. Its honest limit: browser models top out around 3B-class, with automatic cloud escalation when a task needs more.",
          "2. LM Studio — the best desktop local-AI experience and the widest model library, with a real local API. Loses the top spot on one measurable fact: no sync (issue #2467), and nothing runs in a browser.",
          "3. Ollama — the developer's local runtime with a huge model zoo; terminal-first and sync-less by default.",
          "4. PocketPal — capable mobile offline chat, single-device.",
          "5. Secret Llama / web-llm-chat — the honest demos: real local inference in a tab, no durability, no sync.",
          "6. ChatGPT / Gemini / Claude — excluded from the top ranks by definition: cloud-only, so they don't work offline at all.",
        ],
      },
      {
        heading: "Which to pick if…",
        bullets: [
          "You want offline chat whose history follows you across devices — ShadowTalk, the only one that ships both",
          "You want the biggest local models on desktop hardware — LM Studio (or Ollama)",
          "You're building your own stack and need a local API — Ollama",
          "You want to learn how browser inference works — Secret Llama or web-llm-chat",
          "You only ever have signal — the cloud assistants are fine, and ShadowTalk's cloud tier with BYOK covers that too",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the best offline AI chat app?",
        answer:
          "For the combination of offline inference, cross-device sync and zero install: ShadowTalk AI — free, no account, on-device WebGPU models with offline queueing and automatic sync. If you want maximum local model size on desktop hardware instead, LM Studio or Ollama are stronger — but their chats stay on one machine (LM Studio sync is still feature request #2467).",
      },
      {
        question: "Why do most offline AI apps fail the sync test?",
        answer:
          "Because offline-first storage is engineering nobody shipped: LM Studio's device sync remains an open feature request, ChatterUI's WebDAV chat-merge never launched, and browser demos persist nothing. Local+sync attempts (Locra, Pal Chat via iCloud; LocalMind via your own Ollama plus S3) are native apps or bring-your-own-server — never just a browser tab.",
      },
      {
        question: "Is offline AI chat actually private?",
        answer:
          "On-device chat is the most private tier that exists: zero network egress means prompts, context and replies never leave your device. For stored history, check each product's defaults — ShadowTalk's Private Mode encrypts end-to-end (AES-256-GCM) and its honest-limits paragraph states exactly what happens when it's off.",
      },
      {
        question: "Do offline AI chat apps cost money?",
        answer:
          "The local options are free to varying degrees — ShadowTalk is free to use with no card (your provider may charge separately if you use cloud models via BYOK), LM Studio and Ollama are free downloads, and the browser demos are free. Subscription AI assistants are cloud products, so they aren't offline options at all.",
      },
    ],
    related: [
      { label: "Offline AI chat — works with no internet", href: "/offline-ai-chat", note: "The flagship guide" },
      { label: "ShadowTalk vs LM Studio", href: "/vs/lm-studio", note: "The closest contender, scored" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "Why cloud-only tools rank last for offline" },
      { label: "What is on-device AI", href: "/what-is-on-device-ai", note: "The concept behind the ranking" },
    ],
    ctaLabel: "Try the top pick — free",
  },

  "ai-chat-without-account": {
    slug: "ai-chat-without-account",
    breadcrumb: "AI chat without an account",
    h1: "AI chat without an account — what's actually possible",
    definition:
      "You can chat with AI without creating an account: ShadowTalk AI starts guests immediately on an on-device model — no email, no sign-up, no card — and the on-device tier has zero network egress, so nothing leaves your browser. Cloud chat also works free within shared-tier daily limits. An account only becomes necessary if you want your encrypted history to follow you across devices.",
    intro:
      "\"No sign-up AI chat\" searches exploded because every major assistant gates itself behind an account — and most no-login tools turn out to be thin wrappers over someone else's API. This page defines exactly what works without an account in ShadowTalk, what an account adds, and the honest limits of guest mode.",
    sections: [
      {
        heading: "What you can do with no account",
        bullets: [
          "Chat instantly with the on-device model — zero network egress, so prompts never leave the device",
          "Use free cloud chat within shared-tier daily limits",
          "Install the PWA to your home screen or dock in one tap",
          "Work offline after the one-time model download — chats queue and sync when you're back",
          "Switch on Private Mode for end-to-end encryption of stored chats",
        ],
      },
      {
        heading: "What an account actually adds",
        paragraphs: [
          "One thing, honestly: persistence across devices. A guest's workspace lives in that browser; an account lets your encrypted history catch up on your other machines, including messages queued while you were offline. That's it — no feature is held hostage behind sign-up, no trial timer, no card.",
        ],
      },
      {
        heading: "The honest limits of guest mode",
        paragraphs: [
          "Guest history is local to the browser you used — clear the browser's storage and it's gone. Cloud chat without an account is rate-limited to protect the shared pool (BYOK keys are namespaced per user, so unlimited cloud models come with a free account and your own key). And the standing fine print: default chats are stored server-side when Private Mode is off, and free shared-mode requests transit ShadowTalk's server — on-device mode is the tier where nothing touches a server.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I use AI chat without signing up?",
        answer:
          "Yes. ShadowTalk AI starts guests immediately — no email, no card — including with the on-device model, which has zero network egress. Free cloud chat works within shared-tier daily limits. An account is only needed if you want your encrypted history to follow you across devices.",
      },
      {
        question: "Is no-account AI chat private?",
        answer:
          "The on-device tier is the most private AI that exists: no account means no identity to attach, and zero network egress means no prompt ever leaves your device. For stored history, Private Mode encrypts end-to-end (AES-256-GCM). Honest caveat: default chats are stored server-side when Private Mode is off — the tiers exist so you can choose.",
      },
      {
        question: "Why do most AI assistants force accounts?",
        answer:
          "Because their architecture requires it — inference runs on their servers, so they need identity, billing and abuse controls around every request. When the model runs on your device, none of that is necessary: there is no server call to gate. That's the structural reason ShadowTalk can offer guest mode.",
      },
      {
        question: "What happens to my chats if I stay a guest?",
        answer:
          "They persist in that browser's local storage — reloads, offline work and restarts keep them. They don't sync to other devices until you create an account, and clearing browser storage clears them. If that persistence matters to you, sign up free and switch on Private Mode so what syncs is encrypted.",
      },
    ],
    related: [
      { label: "Private AI chat — encrypted, no account", href: "/private-ai-chat", note: "The three privacy tiers" },
      { label: "Offline AI chat — works with no internet", href: "/offline-ai-chat", note: "Guest mode, offline" },
      { label: "What is on-device AI", href: "/what-is-on-device-ai", note: "Why no server is needed" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "Account-required vs guest-first, scored" },
    ],
    ctaLabel: "Start chatting — no account",
  },
};
