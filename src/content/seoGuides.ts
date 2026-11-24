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
      { label: "BYOK AI chat — bring your own key", href: "/byok-ai-chat", note: "Your key, provider prices, no markup" },
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

  "free-ai-chat": {
    slug: "free-ai-chat",
    breadcrumb: "Free AI chat",
    h1: "Free AI chat that's actually free — no card, no markup, no feature locks",
    definition:
      "ShadowTalk AI is a free AI chat workspace with no subscription, no paywalled features and no credit card: the on-device model costs nothing to run, cloud chat is free within shared-tier daily limits, and if you bring your own API key (BYOK) you pay your provider directly at cost — ShadowTalk adds no markup and does not resell inference. And because the model runs in your browser, the free tier works offline too.",
    intro:
      "Almost every 'free AI chat' lands you on a metered tier: caps that tighten, features reserved for subscribers, and free conversations that may be used for training. This page explains what free actually means in ShadowTalk — what costs nothing, what you'd ever pay for and why, and where the honest limits sit.",
    sections: [
      {
        heading: "What 'free' means across AI apps, honestly",
        paragraphs: [
          "Every AI product is free somewhere — the differences are in what the free tier actually includes and where it quietly stops being free. The table below is the honest version, checked November 2026.",
        ],
        table: {
          headers: ["Product style", "What's free", "The catch"],
          rows: [
            [
              "Cloud assistants (ChatGPT, Gemini, Claude)",
              "A daily-capped free tier",
              "Limits tighten without notice, stronger models and research sit behind subscriptions, and free-tier conversations can be used for training unless you opt out where the settings allow",
            ],
            [
              "Local desktop apps (LM Studio, Ollama, Jan)",
              "The software and the models",
              "Your hardware is the price — and chats stay on that one machine, with no sync (LM Studio's is still feature request #2467)",
            ],
            [
              "Browser demos (web-llm-chat, Secret Llama)",
              "Everything",
              "They're demos — no durable storage, no sync, no product around the model",
            ],
            [
              "ShadowTalk AI",
              "The whole workspace, the on-device model and a shared cloud tier",
              "Heavy BYOK cloud use passes your provider's API price straight through — at cost, with no markup",
            ],
          ],
        },
      },
      {
        heading: "The three free tiers inside ShadowTalk",
        paragraphs: [
          "One workspace, three ways to chat for nothing — each with its limits stated in public:",
        ],
        bullets: [
          "On-device model: runs on your GPU via WebGPU, costs nothing forever, zero network egress after the one-time download (300MB-2.6GB depending on device tier)",
          "Shared free tier: cloud chat within daily limits, no key needed — honest fine print: free shared-mode requests transit ShadowTalk's server, and default chats are stored server-side unless Private Mode is on",
          "BYOK: paste a key from any of 16+ providers (OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter and more); requests go browser-to-provider and your provider may charge for API usage — at their price, not inflated",
        ],
      },
      {
        heading: "What you never pay for",
        bullets: [
          "The workspace itself: multi-model chat, tools, streaming and mission control",
          "ProofLoop missions, deep research with citations and the agentic IDE",
          "Sync across devices, the offline queue, and encrypted Private Mode (AES-256-GCM when you switch it on)",
          "No feature locks: nothing on this list is gated behind a plan",
        ],
      },
      {
        heading: "When you'd still pay — and why that's not a subscription in disguise",
        paragraphs: [
          "The only money that ever moves is between you and your model provider. If you run frontier models all day through your own API key, your provider bills you directly for those tokens — ShadowTalk never sees the payment, never marks it up and never resells inference. That's the difference between a product that's free and a product that's 'free' with a meter inside.",
        ],
      },
    ],
    howTo: {
      name: "Start free in under a minute",
      steps: [
        "Open shadowtalk-ai.com/chatbot in Chrome or Edge (113+) — no sign-up screen, no card form",
        "Pick the on-device model to chat for free with zero network egress — the model downloads once in device-sized shards (resumable if interrupted)",
        "Or skip the download and use a shared-tier cloud model within daily limits",
        "Optional: paste an API key in BYOK settings for your choice of 16+ providers, billed by them at cost",
      ],
    },
    faqs: [
      {
        question: "Is ShadowTalk AI really free, or free like a trial?",
        answer:
          "Really free — there is no paid tier to upgrade to. The workspace, ProofLoop, deep research, voice, the IDE, sync and the on-device model are all free. The only possible cost is your own provider's API price if you bring a key and use it heavily, and that goes directly to the provider.",
      },
      {
        question: "What's the catch with the free shared tier?",
        answer:
          "Daily limits, stated up front, plus the honest fine print: free shared-mode requests transit ShadowTalk's server and default chats are stored server-side unless Private Mode is on. If you want cloud chat without that server in the middle, BYOK sends requests straight from your browser to your provider.",
      },
      {
        question: "Do I need a credit card for anything?",
        answer:
          "No. Guests start with the on-device model and shared-tier cloud chat without ever entering payment details. A card only enters the picture if you create one with a provider to buy an API key — that's their relationship, not ours.",
      },
      {
        question: "How is this different from ChatGPT's free tier?",
        answer:
          "ChatGPT's free tier meters a cloud product and reserves its best features for subscribers; ShadowTalk is free because the expensive part — inference — happens on your hardware, and cloud models come from 16+ providers you choose, not one vendor's meter. The comparison is scored dimension by dimension in ShadowTalk vs ChatGPT.",
      },
    ],
    related: [
      { label: "AI chat without an account", href: "/ai-chat-without-account", note: "Guest mode, zero sign-up" },
      { label: "Best offline AI chat — ranked", href: "/best-offline-ai-chat", note: "Free options compared on criteria" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "Free tiers, compared honestly" },
      { label: "BYOK AI chat — bring your own key", href: "/byok-ai-chat", note: "Provider prices at cost, no subscription" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "The free model that runs offline" },
    ],
    ctaLabel: "Chat free — no card",
  },

  "mobile-offline-ai": {
    slug: "mobile-offline-ai",
    breadcrumb: "Offline AI on your phone",
    h1: "Offline AI on your phone — no app store, no sync gap",
    definition:
      "ShadowTalk AI runs offline on iOS and Android as an installable PWA: one tap from the browser, no app store, and the model runs on your phone's GPU with zero network egress after a one-time download. Chats you send offline queue up and sync when you're back — and because the workspace is the same web app on every device, phone and desktop history catch up with each other instead of living on separate machines.",
    intro:
      "Offline AI on mobile usually means a native app from an app store — and native on-device apps share one structural flaw: their history is trapped on the device. This page covers what offline AI actually looks like on a phone in ShadowTalk, what your hardware can handle, and the limits we'd rather tell you now than after you install.",
    sections: [
      {
        heading: "Native offline AI apps have a sync problem on phones",
        paragraphs: [
          "Mobile on-device apps like PocketPal run GGUF models on your phone — real offline AI, and we credit them for it. But their chats live on that one phone: nothing flows to a desktop, nothing backs up, and switching devices means starting over. That's the same gap desktop tools like LM Studio have (device sync is still open feature request #2467 there), repeated on the device you actually carry.",
          "ShadowTalk approaches it from the other side: the phone gets the same web workspace as every other device, the model runs on-device, and the durable offline queue plus catch-up sync means what you do on the train arrives on your desktop.",
        ],
      },
      {
        heading: "What offline looks like on a phone",
        bullets: [
          "Install is one tap: open the site in a mobile browser and add it to your home screen as a PWA — no store, no review lag, no separate download",
          "The app picks a model sized to your device tier — roughly 300MB to 2.6GB, downloaded once over Wi-Fi in resumable shards",
          "Inference runs in a background worker on your phone's GPU — replies stream at hardware speed, not signal speed",
          "Messages sent with no signal queue in durable local storage and sync when the network returns",
          "Reloads, force-quits and restarts lose nothing — the cache is built to survive, verified by automated offline smoke tests",
        ],
      },
      {
        heading: "Honest limits on mobile hardware",
        paragraphs: [
          "Phones are not GPUs with screens, and pretending otherwise is how on-device AI gets a bad name. The practical ceiling for smooth on-device chat is the 1B-3B class — strong for drafting, summarizing, rewriting and Q&A, not frontier reasoning. WebGPU on mobile means a current Chrome or Edge on Android (113+); iOS Safari can run the PWA and its cloud tiers, with on-device support dependent on Apple's WebGPU rollout as of November 2026. Long sessions warm the phone and spend battery like any 3D game would — the GPU is doing real work. And the first visit plus model download need a connection; offline starts on the second.",
        ],
      },
    ],
    howTo: {
      name: "Install offline AI on your phone",
      steps: [
        "Open shadowtalk-ai.com in Chrome (Android) or Safari (iOS)",
        "Add to Home Screen — Android: menu → 'Install app'; iOS: Share → 'Add to Home Screen'",
        "Open the installed app and pick the on-device model; let the device-tiered model download over Wi-Fi once (shards resume if interrupted)",
        "Chat — from here on, no signal required; offline messages queue and sync when you're back",
      ],
    },
    faqs: [
      {
        question: "Does offline AI work on iPhone?",
        answer:
          "The ShadowTalk PWA installs on iOS and works offline for the app shell and your chats. The on-device model depends on WebGPU support in iOS Safari, which Apple is still rolling out — as of November 2026 the reliable fully-offline path on iOS is the app's cached shell with queued chats that sync, while Android Chrome 113+ gets the complete on-device GPU experience.",
      },
      {
        question: "How big are the on-device models on mobile?",
        answer:
          "Device-tiered: roughly 300MB-2.6GB, downloaded once. The smallest tier (Llama-3.2-1B-Instruct class, around 880MB-1.1GB) runs well on mid-range phones; the practical ceiling for smooth mobile chat is the ~3B class, with automatic cloud fallback for heavier asks.",
      },
      {
        question: "Will this eat my mobile data?",
        answer:
          "Only the first model download is large, and it should be done over Wi-Fi — after that, offline chat uses zero data because inference happens on the phone. Sync and cloud models are small requests. If you install on mobile data, shard-resumable downloads mean an interruption never restarts from zero.",
      },
      {
        question: "Can my phone and desktop share the same history?",
        answer:
          "Yes — that's the point. Sign in free and both devices see the same workspace: chats composed offline on the phone queue locally, then sync and appear on desktop, encrypted end-to-end when Private Mode is on. Native on-device apps can't offer this without their own cloud backend.",
      },
    ],
    related: [
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "How offline + sync works end to end" },
      { label: "AI chat without an account", href: "/ai-chat-without-account", note: "Try it before signing up" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "The WebGPU mechanics underneath" },
      { label: "ShadowTalk vs PocketPal", href: "/vs/pocketpal", note: "Native mobile app vs synced PWA, scored" },
    ],
    ctaLabel: "Install on your phone — free",
  },

  "webgpu-ai-chat": {
    slug: "webgpu-ai-chat",
    breadcrumb: "WebGPU AI chat",
    h1: "WebGPU AI chat — how a browser tab runs a language model on your GPU",
    definition:
      "WebGPU is the browser API that gives a web page direct access to your GPU's compute power, and it's what makes ShadowTalk AI possible: a quantized language model loads into GPU memory and generates tokens inside the tab — no server, no prompt leaving the device. It needs a modern Chromium browser (Chrome or Edge 113+), a one-time model download, and nothing else: no install, no drivers, no cloud GPU.",
    intro:
      "For thirty years the browser could show you things and, eventually, run games — but it couldn't think. WebGPU changed that, and this page explains what it actually does, what hardware and browsers support it today (November 2026), why the model weights come from ShadowTalk's own infrastructure, and where the honest limits sit.",
    sections: [
      {
        heading: "What WebGPU actually does",
        paragraphs: [
          "WebGL let the browser paint; WebGPU lets it compute. It exposes modern GPU compute shaders to JavaScript, and language-model inference is exactly that — a long chain of matrix multiplications that GPUs do orders of magnitude faster than CPUs. ShadowTalk runs the model inside a background Web Worker talking to the GPU through WebGPU, so the tab stays responsive while tokens stream at hardware speed.",
          "The model itself is quantized — compressed from full precision so that billion-parameter networks fit in consumer memory. That's why the on-device fleet is the 1B-3B class rather than a frontier model: a quantized 3B is genuinely useful and fits in an integrated GPU's reach; a frontier model does not fit in your tab, and honesty about that is part of the product.",
        ],
      },
      {
        heading: "Browser and hardware support, honestly",
        bullets: [
          "Desktop: Chrome and Edge 113 or newer ship WebGPU by default — that's the supported path",
          "Android: current Chrome supports WebGPU, which is what makes fully-offline AI work on Android phones",
          "Safari and Firefox: incomplete or behind flags as of November 2026 — the PWA and cloud tiers still work there, but the on-device GPU path targets Chromium",
          "Hardware: integrated GPUs handle the 1B class comfortably; the practical ceiling in-browser is the ~3B class — low-end devices automatically fall back to cloud models instead of stuttering",
          "First run needs a connection to fetch the model (300MB-2.6GB, resumable shard-by-shard); every run after that is fully offline",
        ],
      },
      {
        heading: "Why the model weights come from ShadowTalk's own infrastructure",
        paragraphs: [
          "A surprising number of browser AI demos pull their model weights from third-party CDNs, which means your first load trusts a supply chain you can't see. ShadowTalk serves its own app shell and model weights from its own infrastructure with zero third-party requests — the offline hardening work exists so the whole stack, from fonts to shards, behaves like one self-hosted product. Downloads are sharded and resumable, so a dropped connection never restarts a 2GB file from byte zero.",
        ],
      },
      {
        heading: "What the GPU path changes for privacy",
        paragraphs: [
          "When inference happens on your GPU, the prompt never crosses the network — there is no server to see it, no log to hold it. That's the on-device tier. Sync is a separate, opt-in system: default chats are stored server-side when Private Mode is off, and when you switch Private Mode on, stored chats are end-to-end encrypted (AES-256-GCM) with keys derived on your device. The GPU path is private by physics; Private Mode is private by cryptography — you can have both.",
        ],
      },
    ],
    howTo: {
      name: "Check your browser is WebGPU-ready and start",
      steps: [
        "Check your version: Chrome or Edge 113 or newer (chrome://version), on desktop or Android",
        "Open shadowtalk-ai.com/chatbot — no install step exists",
        "Pick the on-device model and let it download over Wi-Fi once; shards resume if the connection drops",
        "Chat — if your device is below the GPU bar, ShadowTalk automatically falls back to cloud models rather than stalling",
      ],
    },
    faqs: [
      {
        question: "Which browsers support WebGPU for AI chat?",
        answer:
          "Chrome and Edge 113 or newer, including current Chrome on Android — that's the supported path for on-device inference. Safari and Firefox remain incomplete or behind flags as of November 2026; the ShadowTalk PWA and its cloud tiers still work in them, but the fully-offline GPU chat targets Chromium.",
      },
      {
        question: "Do I need a gaming GPU for browser AI?",
        answer:
          "No. Integrated graphics handle the 1B-class quantized models comfortably, and that class covers drafting, rewriting, summarizing and Q&A. Bigger quantized models up to roughly 3B run on better hardware; beyond that, ShadowTalk escalates to cloud models instead of pretending a tab can do frontier reasoning.",
      },
      {
        question: "Why does the model download before I can chat offline?",
        answer:
          "Because the weights have to live on your device for inference to be local — that's the entire privacy and offline story. The download happens once, in resumable shards sized to your device tier (300MB-2.6GB); after it, inference runs with zero network egress.",
      },
      {
        question: "Is running a model in my browser safe?",
        answer:
          "The model is data, not code — loading weights cannot execute anything on your machine. ShadowTalk additionally serves the whole stack from its own infrastructure with zero third-party requests, so there's no CDN supply chain in the loop, and the app works as an installed PWA afterward.",
      },
    ],
    related: [
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "The practical WebGPU guide" },
      { label: "What is on-device AI", href: "/what-is-on-device-ai", note: "The plain-English definition" },
      { label: "Local vs cloud AI", href: "/local-vs-cloud-ai", note: "When the GPU path is the right one" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Offline + sync, end to end" },
    ],
    ctaLabel: "Run WebGPU AI — free",
  },

  "local-vs-cloud-ai": {
    slug: "local-vs-cloud-ai",
    breadcrumb: "Local vs cloud AI",
    h1: "Local AI vs cloud AI — the honest trade-offs, and the hybrid that ends the argument",
    definition:
      "Local AI runs the model on your hardware: your data stays put, it works offline, and marginal cost is zero — but models that fit a browser or phone (practical up to ~3B parameters) trail frontier cloud models on hard reasoning. Cloud AI delivers frontier capability for a metered price, online-only, with every prompt processed on someone else's servers. ShadowTalk AI runs both in one workspace — on-device first, cloud escalation when a task outgrows the tab — and syncs your history across devices either way.",
    intro:
      "The local-vs-cloud debate is usually tribal: privacy maximalists on one side, capability maximalists on the other. Both are right about their half. This page scores the trade-offs dimension by dimension, says plainly where each side wins, and shows the hybrid design that stops forcing a choice.",
    sections: [
      {
        heading: "The dimension-by-dimension trade",
        paragraphs: ["Scored honestly, checked November 2026:"],
        table: {
          headers: ["Dimension", "Local (on-device)", "Cloud"],
          rows: [
            [
              "Privacy",
              "Prompt never leaves the device — nothing to leak, log or subpoena",
              "Every prompt is processed on the provider's servers under their policy",
            ],
            [
              "Offline",
              "Fully works after a one-time model download",
              "No connection, no answers — by architecture",
            ],
            [
              "Latency",
              "Bound by your hardware, not your signal — no network round-trip",
              "Bound by network plus server queue",
            ],
            [
              "Cost",
              "Free after the download; your electricity",
              "Free tiers with caps, then subscriptions or metered API pricing",
            ],
            [
              "Capability",
              "Practical ceiling ~3B in a browser — great at everyday tasks, not frontier reasoning",
              "Frontier models, huge contexts, live web, broad multimodal",
            ],
            [
              "Setup",
              "One-time download; no account",
              "Account, billing identity, terms acceptance",
            ],
          ],
        },
      },
      {
        heading: "Where local wins today",
        bullets: [
          "Sensitive material — medical notes, legal drafts, financials, HR documents — where 'processed on our servers' is a dealbreaker",
          "Flights, tunnels, rural dead zones, capped data plans and censored or fragile networks",
          "Volume work: no rate limits, no token bills, no throttling — the marginal chat costs nothing",
          "Guest-mode use with no identity attached at all",
        ],
      },
      {
        heading: "Where cloud still wins",
        bullets: [
          "Frontier reasoning: anything that needs the smartest model available still belongs to the cloud",
          "Very long context and heavy multimodal work (images, audio, video at scale)",
          "Live web knowledge and fresh citations",
          "Zero-wait start: no model download when you just need one answer",
        ],
      },
      {
        heading: "The hybrid: on-device first, cloud when a task outgrows the tab",
        paragraphs: [
          "ShadowTalk's architecture is the compromise neither camp offers: device-tiered on-device models answer first, and when a request exceeds what the tab can handle, it escalates to cloud models automatically — BYOK across 16+ providers, or the shared free tier within daily limits. Your history stays in one synced workspace across devices, with the honest defaults in the open: chats are stored server-side when Private Mode is off, end-to-end encrypted (AES-256-GCM) when it's on, and BYOK requests go browser-to-provider without passing through ShadowTalk.",
          "That's the practical answer to local vs cloud: local as the always-available floor, cloud as the capability ceiling you reach for deliberately — in one tab, for free.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is local AI good enough for daily use?",
        answer:
          "For the everyday majority — drafting, rewriting, summarizing, Q&A, coding help at small scale — a quantized 1B-3B model on your hardware is genuinely good, and it's instant, private and free. For hard reasoning and long documents, frontier cloud models still win; a hybrid workspace lets each task take the right path.",
      },
      {
        question: "Can I mix local and cloud models in one chat history?",
        answer:
          "Yes — that's the point of the hybrid design. On-device, shared-tier and BYOK cloud models all write into the same synced workspace, so a conversation can start on a train with no signal on the local model and escalate to a frontier cloud model when you're back.",
      },
      {
        question: "Is local AI actually private?",
        answer:
          "Inference is: the prompt is processed on your GPU and never crosses the network. Storage and sync are separate choices — ShadowTalk's defaults are published (chats stored server-side when Private Mode is off), and Private Mode encrypts stored chats end-to-end with AES-256-GCM so what syncs is unreadable in transit and at rest.",
      },
      {
        question: "Which should I start with?",
        answer:
          "Start with the on-device model: it's free, private, needs no account and works offline — then add cloud when you meet a task that outgrows it. Setup is one download, not one subscription.",
      },
    ],
    related: [
      { label: "What is on-device AI", href: "/what-is-on-device-ai", note: "The local side, defined" },
      { label: "Run an LLM in your browser", href: "/run-llm-in-browser", note: "How the local half runs" },
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "The privacy tiers in detail" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "Local AI when the network dies" },
    ],
    ctaLabel: "Run both — free",
  },
  "chatgpt-down": {
    slug: "chatgpt-down",
    breadcrumb: "ChatGPT down",
    h1: "ChatGPT down? What still works when AI goes offline",
    definition:
      "When ChatGPT goes down, every cloud assistant riding the same dependence fails with it — status.openai.com tracks the incidents, and they happen several times a year. On-device AI is the chat that keeps answering: ShadowTalk's WebGPU model runs on your machine with zero network, and a multi-provider BYOK workspace routes the same prompt to Anthropic, Google or Groq when one provider has a bad day.",
    intro:
      "Outages are the tax you pay for cloud-only AI: when the provider's servers are down, your work stops with them. This guide explains why outages happen, exactly what still works during one, and the two moves — an on-device model and multi-provider BYOK — that make any single outage irrelevant. Written as preparation, not panic.",
    sections: [
      {
        heading: "Why ChatGPT goes down (and why that's structural)",
        paragraphs: [
          "Cloud-only AI has one path to an answer: your prompt reaches the provider's servers, gets processed there, and the response travels back. Capacity shifts, deployments, regional incidents or attacks anywhere on that path mean no answers — no matter how good your connection is. OpenAI publishes incidents at status.openai.com; Google and Anthropic run their own status pages, and the same applies to every cloud-only assistant including Gemini, Claude and Copilot.",
          "The point is not that OpenAI is unreliable — it's that any cloud-only tool carries this failure mode by construction. The servers are someone else's, and so is the downtime.",
        ],
      },
      {
        heading: "The two moves that make outages irrelevant",
        paragraphs: [
          "Neither move requires giving up the cloud. Together they remove the single point of failure:",
        ],
        bullets: [
          "Move 1 — an on-device model: after a one-time download, inference runs on your own GPU in the browser with zero network. Outages on someone else's servers cannot touch it; in airplane mode it still answers.",
          "Move 2 — multi-provider BYOK: if OpenAI specifically is down, route the same prompt to Anthropic, Google, Groq, DeepSeek or any of 16+ providers in the same workspace — same chat history, same tools, no re-setup.",
          "Local history stays readable: chats cached on your device are available during an outage, while cloud-only history sits unreachable behind the provider's downtime.",
        ],
      },
      {
        heading: "Honest limits during an outage",
        paragraphs: [
          "Preparation has limits worth knowing in advance:",
        ],
        bullets: [
          "The on-device model is small — nano to 3B-class depending on your device. It handles drafting, Q&A and reasoning well; it is not frontier quality, and saying otherwise would be dishonest",
          "Live web search and grounding need a network — do research before the outage or after connectivity returns",
          "If your own internet is down entirely, cloud providers can't help at all — that's the on-device case, and it needs the model downloaded in advance",
          "ShadowTalk's default chats are stored server-side with a durable local cache that survives outages — use Private Mode if you want the synced copy end-to-end encrypted",
        ],
      },
    ],
    howTo: {
      name: "Make your AI outage-proof in five minutes",
      steps: [
        "Open shadowtalk-ai.com in Chrome or Edge 113+ while your connection is healthy.",
        "Install the app (PWA): the install icon in the address bar puts it on your home screen or dock.",
        "Open the model manager and download the suggested model tier once — interrupted downloads resume automatically.",
        "Optionally add your own provider API keys in Settings for multi-provider failover: OpenAI, Anthropic, Google, Groq and more.",
        "Next outage: keep working on the on-device model, and flip frontier tasks to another provider — one click, same history.",
      ],
    },
    faqs: [
      {
        question: "Why is ChatGPT down right now?",
        answer:
          "Check status.openai.com — most incidents are capacity or deployment problems that resolve in minutes to hours, and the status page is the only live source of truth. This page can't see live status; the whole point is not needing to. With an on-device model and multi-provider BYOK, one provider's downtime stops being your problem.",
      },
      {
        question: "Can I use ChatGPT offline?",
        answer:
          "No. ChatGPT is cloud-only — every token is generated on OpenAI's servers, so without internet it cannot answer at all. That's structural, not a bug they can patch away. On-device AI (like ShadowTalk's WebGPU mode) is the chat that keeps working offline.",
      },
      {
        question: "What can I use when ChatGPT is down?",
        answer:
          "Two things, in one free workspace: the on-device model, which answers regardless of any provider's status, and other cloud providers — Anthropic, Google, Groq and more via BYOK — which are unaffected by an OpenAI incident. If the outage is capacity-related, a smaller on-device model also sidesteps the queue entirely.",
      },
      {
        question: "Will an outage delete or hide my chats?",
        answer:
          "Cloud history lives server-side, so if a provider is down you may not reach it until they recover — your chats aren't gone, just temporarily unreachable. Chats stored on your device stay readable throughout. ShadowTalk's default chats are stored server-side too, but with a durable local cache that survives outages; Private Mode makes the synced copy end-to-end encrypted.",
      },
      {
        question: "Does outage-proofing cost anything?",
        answer:
          "No. The on-device model is free to download and free to run, ShadowTalk has no subscription and no card, and BYOK passes provider API prices through at cost. Outage-proofing is a setup step, not a purchase.",
      },
    ],
    related: [
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The structural difference, scored" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "How offline + sync actually works" },
      { label: "Free AI chat guide", href: "/free-ai-chat", note: "What 'free' means here" },
      { label: "AI chat without an account", href: "/ai-chat-without-account", note: "Start as a guest" },
    ],
    ctaLabel: "Get outage-proof AI — free",
  },
  "ai-chat-for-travel": {
    slug: "ai-chat-for-travel",
    breadcrumb: "AI chat for travel",
    h1: "AI chat that works while traveling — offline on flights, abroad, anywhere",
    definition:
      "Yes — you can chat with AI in airplane mode. Download a model to your device once (from about 600MB), and ShadowTalk AI answers on your own GPU with zero network: no roaming, no SIM, no hotel wifi needed. Anything you send while offline queues in durable local storage and syncs automatically when you land. No app store, no account, no card.",
    intro:
      "Travel is where cloud AI fails hardest: airplane wifi that barely opens a webpage, roaming charges, hotel captive portals, dead zones on trains and in the mountains. This guide covers what actually works mid-flight, what to set up before you leave, and the honest limits — because offline-AI claims deserve fine print too.",
    sections: [
      {
        heading: "The travel problem: AI dies exactly when you need it",
        paragraphs: [
          "Cloud assistants need constant connectivity, and travel strips it away: inflight wifi is slow and expensive, roaming data is costly and metered, hotel networks hide behind captive portals that block apps, and trains, mountains and rural routes have dead zones by design. The fix is local compute — a model that lives on your device and answers without asking any server.",
          "That's what ShadowTalk's on-device mode is: WebGPU inference in a browser tab, running on your laptop or Android phone with zero network egress. The app installs as a PWA in one tap — no app store — and the whole shell works offline once installed.",
        ],
      },
      {
        heading: "What works mid-flight (and at 30,000 feet)",
        paragraphs: ["With the model downloaded before boarding:", ""],
        bullets: [
          "On-device chat is unlimited and network-free — drafting, translating, summarizing, planning, Q&A at the speed of your GPU",
          "Messages you send while offline queue in durable local storage and sync automatically when you land — end-to-end encrypted when Private Mode is on",
          "Your full local chat history stays readable offline — review notes and drafts from the ground",
          "The installed PWA reloads offline — no first-page stall, no app-store dependency",
        ],
      },
      {
        heading: "Prep checklist before you leave",
        paragraphs: ["Five minutes on good wifi covers the whole trip:", ""],
        bullets: [
          "Install the PWA and download the model tier your device suggests (600MB-2.6GB; the manager pre-checks storage quota)",
          "Use Chrome or Edge 113+ on laptop or Android — the app pre-checks WebGPU support for you",
          "Add provider API keys if you want frontier models the moment you reconnect (BYOK, at cost, no markup)",
          "GPU work draws battery — plugged-in seats help; a nano tier runs comfortably on modest hardware",
        ],
      },
      {
        heading: "Honest limits on the road",
        paragraphs: ["What offline AI can't do, stated plainly:", ""],
        bullets: [
          "No live web mid-flight — flight statuses, news and search need a connection; do research before boarding",
          "Frontier cloud models need the network — the on-device tier trades capability for independence",
          "iOS: the PWA installs on iPhones, but WebGPU support varies by iOS version — on-device mode targets Chrome/Edge on desktop and Android first",
          "The very first install needs a real connection — captive portals can block it, so set up before travel, not at the gate",
        ],
      },
    ],
    howTo: {
      name: "Set up travel-ready offline AI before you fly",
      steps: [
        "On good wifi, open shadowtalk-ai.com in Chrome or Edge 113+ and install the PWA from the address bar.",
        "Open the model manager and download the suggested model tier once — 600MB-2.6GB depending on your device.",
        "Verify airplane-readiness: turn on airplane mode and confirm chat still answers (it runs on your GPU).",
        "Optionally add your provider API keys for instant frontier-model access when you reconnect.",
        "Fly: chat offline as much as you like — queued messages sync automatically on landing, E2EE with Private Mode on.",
      ],
    },
    faqs: [
      {
        question: "Can I use AI in airplane mode?",
        answer:
          "Yes — with an on-device model. After the one-time download, inference runs entirely on your GPU with zero network activity: no wifi needed, no cellular data, nothing sends or receives. Cloud-only assistants cannot do this — they need a connection for every token.",
      },
      {
        question: "Will offline AI use my roaming data?",
        answer:
          "No — on-device inference has zero network egress, so roaming isn't touched at all. Messages you send offline queue locally and sync later when you choose to connect, so you control when data is used.",
      },
      {
        question: "Does it work in a hotel with a captive portal?",
        answer:
          "Once installed, yes — the app shell and model are cached on your device, so the app runs without passing the portal. The very first install does need a real internet connection, which captive portals can block — that's why you set up before travel or on a network you can pass.",
      },
      {
        question: "What about iPhone?",
        answer:
          "The PWA installs on iOS, but WebGPU support on iPhones varies by iOS version, so on-device mode targets Chrome/Edge on desktop and Android first. Everything else — install, offline shell, queued sync — works on iOS; check the model manager on your device to see what's available.",
      },
      {
        question: "Is travel-ready AI free?",
        answer:
          "Yes — the app is free with no account and no card, and the on-device model costs nothing to run. Cloud models via BYOK pass provider prices through at cost if you add them; the offline core costs nothing.",
      },
    ],
    related: [
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "The full offline + sync guide" },
      { label: "Offline AI on your phone", href: "/mobile-offline-ai", note: "The mobile PWA, in detail" },
      { label: "ChatGPT down playbook", href: "/chatgpt-down", note: "The outage version of this page" },
      { label: "Free AI chat guide", href: "/free-ai-chat", note: "What 'free' means here" },
    ],
    ctaLabel: "Install before you fly — free",
  },
  "ai-chat-for-students": {
    slug: "ai-chat-for-students",
    breadcrumb: "AI chat for students",
    h1: "AI chat for students — free, no account, and it works offline at school",
    definition:
      "Students get the worst deal from cloud AI: school networks that block it, subscriptions that need a card, and accounts that follow you around. ShadowTalk AI is a free browser workspace where guests start instantly with no account, the on-device model answers after a one-time download with zero network — so school firewalls and dead wifi simply don't matter — and chats sent offline queue up and sync when you're back. It's a study aid built to explain and drill, not to write your essay for you.",
    intro:
      "This guide is written for the actual student situation: locked-down school networks, shared laptops, no budget, and the line between getting help and getting caught cheating. We cover what the on-device model handles well for study, what it doesn't, and the honest rules of using AI to actually learn.",
    sections: [
      {
        heading: "Why school networks break cloud AI (and why local AI doesn't care)",
        paragraphs: [
          "School and university networks block AI sites for policy and bandwidth reasons: domain filters, captive portals that log you in before anything loads, and device restrictions on managed laptops. Every cloud assistant — ChatGPT, Gemini, Copilot — needs to reach its provider's servers for every single token, so any one of those blocks stops it completely.",
          "An on-device model has no such choke point: after the one-time download, inference runs on your own GPU inside the browser tab and makes zero network requests. There is literally nothing for the filter to block — the model is already on your machine. Install it on your home wifi once, and it works at school, in the library basement and on the bus.",
        ],
      },
      {
        heading: "What the on-device model handles well for study",
        paragraphs: ["Honest capabilities, at the 1B-3B class your browser can run:", ""],
        bullets: [
          "Explaining concepts in plain language — ask for the same idea three ways until one lands",
          "Quizzing you: have it generate practice questions from a topic, then check your answers",
          "Summarizing your own notes and drafts — text you paste stays on your device with zero egress",
          "Planning: study schedules, essay outlines, revision priorities",
          "Drafting and rewriting practice — but as feedback on your writing, not a replacement for it",
        ],
      },
      {
        heading: "Use it to learn, not to cheat",
        paragraphs: [
          "The honest framing: this is a tutor that never gets tired of your questions, not a homework machine. Submitting AI-written text as your own work is cheating at most schools — and the on-device model, at 1B-3B class, won't produce frontier essays anyway. What it does produce is patient explanation and endless practice questions, which is exactly the part of studying nobody gets enough of.",
          "The learning loop that works: read the material, explain it back to the model in your own words, ask it to poke holes, quiz yourself, repeat. Your school's AI policy is the final word on what's allowed in graded work — policies differ, so know yours.",
        ],
      },
      {
        heading: "Honest limits",
        paragraphs: ["What a browser-tab model can't do, stated plainly:", ""],
        bullets: [
          "The on-device model is 1B-3B class — excellent at explanation and drilling, not frontier quality; escalate heavy tasks to cloud models (free shared tier or BYOK) when you're back online",
          "No live web offline — research current sources when you have a connection",
          "The first install and model download need real wifi — set up at home, not in class",
          "iOS: the PWA installs, but on-device mode targets Chrome/Edge on desktop and Android first — WebGPU support on iPhones varies by iOS version",
        ],
      },
    ],
    howTo: {
      name: "Set up study-ready offline AI in five minutes",
      steps: [
        "On your home wifi, open shadowtalk-ai.com in Chrome or Edge 113+ on your laptop or Android phone.",
        "Install the PWA from the address bar — one tap, no app store, no account needed.",
        "Open the model manager and download the suggested model tier once (600MB-2.6GB; interrupted downloads resume).",
        "Test it offline: turn wifi off and ask it to quiz you on a topic you're revising.",
        "At school: open the installed app and study — queued messages sync when you reconnect; keep graded work inside your school's AI rules.",
      ],
    },
    faqs: [
      {
        question: "How can I use AI at school when the wifi blocks it?",
        answer:
          "Use an on-device model. After the one-time download, inference runs entirely on your own GPU with zero network requests — there's no AI site for the school filter to block, because the model is already on your machine. Install on home wifi first, then the app and model work anywhere: classroom, library, bus.",
      },
      {
        question: "Is there a free AI that doesn't need an account for homework help?",
        answer:
          "Yes — ShadowTalk guests start chatting immediately with no sign-up, no email and no card: the on-device model runs on your device for free. Cloud models are free within shared-tier daily limits, or unlimited with your own API key via BYOK at provider cost. Nothing here requires an account.",
      },
      {
        question: "Can my teacher or parents see my chats?",
        answer:
          "On-device chats never cross the network, so nobody sees them in transit — and ShadowTalk never trains on your chats on any tier. Default chats are stored server-side when Private Mode is off; turn Private Mode on and stored chats are end-to-end encrypted (AES-256-GCM) so even ShadowTalk's servers can't read them. Since it's your device and your session, what you study is between you and the model.",
      },
      {
        question: "Can it write my essay for me?",
        answer:
          "It can draft text, but submitting AI writing as your own is academic dishonesty at most schools and a bad way to learn. Use it the way that actually raises your grades: outlines, feedback on your drafts, explanations of concepts you're stuck on, and unlimited practice quizzes. The on-device model is a tutor, not a ghostwriter.",
      },
      {
        question: "Does it work on a phone or a school Chromebook?",
        answer:
          "Android phones and laptops with Chrome or Edge 113+ are the supported path for on-device mode. Managed Chromebooks vary: the workspace itself works in any modern browser, and WebGPU availability on locked-down devices depends on the admin's configuration — the app tells you what's available on your device.",
      },
    ],
    related: [
      { label: "AI chat without an account", href: "/ai-chat-without-account", note: "Guest mode, in detail" },
      { label: "Free AI chat guide", href: "/free-ai-chat", note: "What 'free' means here" },
      { label: "Offline AI on your phone", href: "/mobile-offline-ai", note: "The mobile PWA setup" },
      { label: "Offline AI chat guide", href: "/offline-ai-chat", note: "How offline + sync works" },
    ],
    ctaLabel: "Study-ready AI, free — no account",
  },
  "who-can-read-your-ai-chats": {
    slug: "who-can-read-your-ai-chats",
    breadcrumb: "Who can read your AI chats",
    h1: "Who can read your AI chats — the honest tier-by-tier answer",
    definition:
      "It depends entirely on where the model runs. Cloud assistants keep your prompts on the company's servers, where employees in defined roles, legal process and — on some free tiers — training pipelines can reach them. ShadowTalk AI publishes its own answer tier by tier: the on-device model never crosses the network, Private Mode encrypts chats end-to-end (AES-256-GCM), and default chats are stored server-side — stated plainly instead of buried in a policy.",
    intro:
      "\"Are my AI chats private?\" deserves a better answer than a shrug. This page maps who can actually reach your conversations on the big cloud assistants and in ShadowTalk's three tiers — and where each one's guarantees genuinely end. No marketing, just the reach paths, named.",
    sections: [
      {
        heading: "The cloud default: who can reach your prompts",
        paragraphs: [
          "On any cloud assistant, your prompt travels to the provider's servers and is processed there. The people who can reach it fall into a few buckets: employees and contractors in defined trust-and-safety or support roles under the provider's published policies; legal process (warrants, subpoenas, government requests) under the provider's jurisdiction; and on several free tiers, the training pipeline itself — ChatGPT's free-tier conversations can be used for training unless you opt out, Google's Gemini Apps notice says free-tier conversations can improve its products, and Anthropic's consumer settings may use conversations for improvement unless configured otherwise (landscape checked Nov 2026 — verify current notices). Breach risk is the tail case every server-side store carries.",
          "None of this makes cloud AI unusable — it makes it a choice you should actually know you're making.",
        ],
      },
      {
        heading: "ShadowTalk's tiers, stated plainly",
        paragraphs: ["Three tiers, each with a different reach profile:", ""],
        bullets: [
          "On-device (WebGPU): inference runs on your GPU with zero network egress — the prompt never leaves your machine, full stop. This is the only tier with no server in the loop at all.",
          "BYOK cloud: your API key sends requests browser-to-provider. The provider you chose sees the prompt under its policies; ShadowTalk's server isn't in the request path.",
          "Private Mode: stored chats are end-to-end encrypted (AES-256-GCM) with device-derived, non-extractable keys — message content, titles and metadata are ciphertext at rest, and full history can be encrypted retroactively.",
          "The honest default: when Private Mode is off, chats are stored server-side — readable by the same classes of access as any cloud store. That default is documented, not hidden.",
          "Training: never — on any tier, including free shared mode.",
        ],
      },
      {
        heading: "What end-to-end encryption does — and doesn't — cover",
        paragraphs: [
          "E2EE protects stored and synced chat content: what sits on the server is ciphertext, and the keys live on your device. What it does not do is change where inference happens — if you ask a cloud model, the prompt necessarily reaches that provider. That's physics, not policy: the only way for the model to answer without anyone else seeing the prompt is to run the model on your own hardware.",
          "So the private stack, in order of strength: on-device for sensitive material (zero exposure), E2EE Private Mode for stored history you sync across devices, BYOK for cloud power with a direct provider relationship. Honest limits: sync requires servers to relay ciphertext, account recovery can't read what the keys can't decrypt, and screenshots on your screen are outside any encryption model.",
        ],
      },
    ],
    howTo: {
      name: "Lock your chats down in four steps",
      steps: [
        "Install the PWA and download the on-device model — sensitive questions then never leave your machine.",
        "Turn on Private Mode and set your passphrase: stored history becomes AES-256-GCM ciphertext on the server.",
        "Prefer the on-device model for anything you wouldn't paste into a public forum; use BYOK cloud when you need frontier capability.",
        "Review the security page's published limits — including the server-side default — so your threat model matches the product's real guarantees.",
      ],
    },
    faqs: [
      {
        question: "Can OpenAI employees read my ChatGPT conversations?",
        answer:
          "In defined circumstances, yes: OpenAI's policy allows limited human review for trust-and-safety purposes, and free-tier conversations can be used for model training unless you opt out. Paid tiers come with different training defaults. It's a published policy, not a secret — but most people never read it, which is why this page exists.",
      },
      {
        question: "Are ShadowTalk's on-device chats visible to anyone?",
        answer:
          "No one sees them in transit because there is no transit: on-device inference makes zero network requests, and the chat lives in your device's local storage. If you're signed in and Private Mode is off, the stored copy syncs server-side; turn Private Mode on and the synced copy is end-to-end encrypted ciphertext. Either way, ShadowTalk never trains on your chats.",
      },
      {
        question: "What does end-to-end encryption actually protect here?",
        answer:
          "Stored chat content, titles and metadata at rest — AES-256-GCM with device-derived non-extractable keys, plus an encrypt-or-null storage contract and retroactive encryption of existing history. It does not change where inference runs: a cloud model always receives your prompt, so the most sensitive questions belong on the on-device model, where nothing leaves the machine.",
      },
      {
        question: "Does ShadowTalk train on my chats?",
        answer:
          "Never — on any tier, including the free shared tier. ShadowTalk doesn't resell inference and doesn't resell your data; the business is the workspace, not the corpus.",
      },
      {
        question: "What's the most private way to use AI here?",
        answer:
          "On-device model for anything sensitive — zero network egress means zero server exposure. Private Mode on for stored history you want synced as ciphertext. BYOK when you want cloud capability with a browser-to-provider request path. And keep the honest default in mind: Private Mode off means chats are stored server-side, same as any cloud product's storage.",
      },
    ],
    related: [
      { label: "Private AI chat guide", href: "/private-ai-chat", note: "The three privacy tiers, in detail" },
      { label: "What is on-device AI", href: "/what-is-on-device-ai", note: "Zero egress, defined" },
      { label: "ShadowTalk vs Proton Lumo", href: "/vs/proton-lumo", note: "Encrypted cloud AI, compared honestly" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The cloud default, scored" },
    ],
    ctaLabel: "Keep your chats yours — free",
  },
  "is-chatgpt-plus-worth-it": {
    slug: "is-chatgpt-plus-worth-it",
    breadcrumb: "Is ChatGPT Plus worth it",
    h1: "Is ChatGPT Plus worth it? The honest 2026 math",
    definition:
      "For some people, yes: if you hit ChatGPT's free-tier limits most days, need frontier models for professional output and live in its ecosystem, the $20/month subscription buys real capability. For everyday use — chatting, drafting, studying, summarizing — the honest math is different: ShadowTalk AI runs an on-device model free with no usage limits, offers shared cloud chat within daily limits, and takes BYOK keys straight to 16+ providers at cost — no subscription, no card, and the offline core keeps working when the internet doesn't.",
    intro:
      "\"Is Plus worth it?\" has no universal answer, so this page gives you criteria instead of a verdict-shaped ad: when the subscription earns its money, when it doesn't, and what a free BYOK workspace covers. Prices change — we note where to verify current terms — but the structural part of the math doesn't.",
    sections: [
      {
        heading: "When Plus is genuinely worth it",
        paragraphs: [
          "The subscription earns its $20 when you hit one or more of these, checked honestly: you regularly exhaust the free tier's message limits and pay in waiting time; your work needs the strongest frontier models for long, complex output; you lean on ecosystem features (custom GPTs, integrations, advanced voice/image daily); or your hourly rate makes the subscription trivially cheaper than friction. For a working professional who uses AI all day, that math usually lands on yes.",
        ],
      },
      {
        heading: "When it isn't",
        paragraphs: [
          "The math flips for light and mid-weight use — the majority of people, by usage:",
        ],
        bullets: [
          "Under the free limits most days? A subscription buys capacity you aren't using",
          "Drafting, Q&A, study help, summarizing: the on-device model in ShadowTalk covers these free, with zero usage limits and zero network",
          "Want many models, not one company's? BYOK routes OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter and more through one workspace — at provider cost, no markup, no middleman subscription",
          "Care about privacy or working offline? A cloud subscription can't run on your GPU, can't work in airplane mode and can't encrypt stored chats end-to-end — ShadowTalk does all three",
        ],
      },
      {
        heading: "The free stack, in one place",
        paragraphs: ["What ShadowTalk gives you without a subscription or card:", ""],
        bullets: [
          "On-device models: free forever, no rate limits — 0.5B-3B class on your GPU via WebGPU",
          "Shared cloud chat: free within daily limits on the shared tier",
          "BYOK: 16+ providers at cost — you pay the provider's API price for what you actually use, and nothing when you don't",
          "Deep research with citations, ProofLoop missions, voice and the IDE: built in, not gated behind a tier",
          "The claim no subscription can make: ShadowTalk is the first AI chat in a browser that works offline and syncs when you're back",
        ],
      },
      {
        heading: "The honest catch",
        paragraphs: [
          "BYOK usage is billed by the provider and varies with volume — heavy frontier-model use can cost more than $20/month at list API prices, and it's your card, not a flat fee. The on-device model is not frontier quality; if you need maximum capability with zero setup and zero key management, Plus is genuinely the simpler product. A free stack is not the same as a frontier stack — know which one your work actually needs before you cancel anything.",
        ],
      },
    ],
    howTo: {
      name: "Test the free stack before you pay",
      steps: [
        "Open shadowtalk-ai.com in Chrome or Edge 113+ — no account, no card.",
        "Use the on-device model for a week of your normal tasks: drafting, Q&A, summaries. It's free with no limits.",
        "If you need frontier quality, add one BYOK key (OpenAI, Anthropic, Google, Groq and more) and compare — you pay the provider's API price only for what you use.",
        "Compare that month's real usage bill against $20 — and against what the shared free tier already covered.",
        "Subscribe to Plus only if the frontier ceiling and its ecosystem still justify the flat fee for your actual workload.",
      ],
    },
    faqs: [
      {
        question: "Is ChatGPT Plus worth $20 a month?",
        answer:
          "If you're a daily heavy user who needs frontier-model quality and the ecosystem, usually yes. If you're under the free limits most days, probably not — much of what you do (drafting, Q&A, studying, summarizing) runs free and unlimited on an on-device model, and multi-model access can come from BYOK at provider cost instead of a flat subscription. Judge by your actual usage, not by the feature list.",
      },
      {
        question: "What's the cheapest way to use top AI models?",
        answer:
          "At volume, BYOK is usually the cheapest honest option: ShadowTalk passes provider API prices straight through with no markup, you can route each task to the best-value provider (Groq for speed, DeepSeek for cheap reasoning, OpenAI or Anthropic for frontier quality), and the on-device model handles everything it can for free. Check current provider pricing yourself — it moves often.",
      },
      {
        question: "Can I use ChatGPT models without a Plus subscription?",
        answer:
          "Yes — an OpenAI API key works inside ShadowTalk via BYOK, billed by OpenAI at usage cost with no subscription. You get the same OpenAI models inside a workspace that also runs an on-device model offline and connects 15+ other providers.",
      },
      {
        question: "Do I lose anything by skipping Plus?",
        answer:
          "Honestly, yes: the frontier ceiling on demand, OpenAI's ecosystem polish (custom GPTs, integrations), and the simplicity of one flat bill with no keys to manage. If those matter to your daily work, subscribe. What you gain by skipping: no flat fee, provider prices at cost, model choice, and an on-device model that works offline — a cloud subscription can't offer any of those.",
      },
      {
        question: "Is free AI worse for privacy?",
        answer:
          "Cloud free tiers are where training-on-chats clauses bite hardest: ChatGPT's free-tier conversations can train unless you opt out, and Google's Gemini notice says free-tier conversations can improve its products (checked Nov 2026). Free doesn't have to mean that — ShadowTalk never trains on chats on any tier, the on-device model never phones home, and Private Mode encrypts stored history end-to-end (AES-256-GCM).",
      },
    ],
    related: [
      { label: "Free AI chat guide", href: "/free-ai-chat", note: "What 'free' means here" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "The structural comparison" },
      { label: "Local vs cloud AI", href: "/local-vs-cloud-ai", note: "The cost math, dimension by dimension" },
      { label: "ChatGPT down playbook", href: "/chatgpt-down", note: "The outage angle subscriptions can't fix" },
      { label: "BYOK AI chat — bring your own key", href: "/byok-ai-chat", note: "The pay-per-use alternative, honestly mathed" },
    ],
    ctaLabel: "Run the free math yourself",
  },
  "byok-ai-chat": {
    slug: "byok-ai-chat",
    breadcrumb: "BYOK AI chat",
    h1: "BYOK AI chat: bring your own key, pay the provider, skip the middleman",
    definition:
      "BYOK — bring your own key — means an AI app runs on your own provider API key instead of reselling you inference through a subscription: you pay the provider's API price for what you actually use, and the app takes no cut. ShadowTalk AI is a free, installable browser workspace with BYOK for 16+ providers (OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter and more) — your key stays in your browser and requests go straight from your browser to the provider you chose, with no ShadowTalk proxy or markup in the path. Its on-device model needs no key, no subscription and no internet at all.",
    intro:
      "BYOK is how most of the AI power-user world already works — IDEs, terminal agents and a growing list of chat apps take your key instead of your $20 — yet most BYOK tools are desktop installs or single-tab web clients, and almost none of them can answer a question when the Wi-Fi dies. This page explains what BYOK actually is, when it's cheaper than a flat subscription (and when it isn't), how ShadowTalk handles your key, and what BYOK plus an offline on-device model buys you that neither a subscription nor a desktop BYOK app can.",
    sections: [
      {
        heading: "What is BYOK in AI?",
        paragraphs: [
          "BYOK (bring your own key) flips the business model of an AI app: instead of charging you a monthly subscription for access to models the vendor resells, the app connects directly to your own API key from a provider like OpenAI, Anthropic, Google, Groq, DeepSeek or OpenRouter. The provider bills you at their published API price for exactly what you use; the app itself takes no cut of inference. It's the same model your IDE or terminal agent likely already uses — now applied to a full chat workspace.",
          "The trade is straightforward: you get provider prices with no markup and free choice of models, in exchange for a one-time setup step (pasting a key) and the responsibility of your own provider bill.",
        ],
        bullets: [
          "You pay the provider's API price for what you use — nothing when you don't",
          "No middleman rate limits between you and the provider",
          "Any provider's models in one workspace, switchable per task",
          "OpenRouter exposes free-tier models, so you can try BYOK without paying anything",
        ],
      },
      {
        heading: "BYOK vs a flat subscription: the honest math",
        paragraphs: [
          "For light and mid-weight use — the majority of people by volume — BYOK usually wins: you pay for what you use and nothing when you don't, and everyday tasks can run on ShadowTalk's on-device model for free with no usage limits at all. The honest catch cuts the other way for heavy users: frontier models at list API prices can cost more than a flat $20/month if you generate enormous volume every day, and a subscription bundles zero-setup simplicity with no keys to manage. Judge by your actual usage, not by the marketing.",
        ],
        table: {
          headers: ["Dimension", "BYOK (your key)", "Flat subscription"],
          rows: [
            ["Cost model", "Provider's API price for actual usage — nothing when idle", "Fixed monthly fee whether you use it or not"],
            ["Model choice", "16+ providers in one workspace, switchable per task", "One vendor's models and rate limits"],
            ["Markup", "None — the app takes no cut of inference", "You fund the reseller's margin"],
            ["Offline", "On-device model works with no key and no internet", "None — cloud-only by design"],
            ["Setup", "One paste in Settings → Connections", "None, but an account is required"],
          ],
        },
      },
      {
        heading: "How ShadowTalk handles your key",
        paragraphs: [
          "BYOK keys in ShadowTalk live in your browser, namespaced per user — they are not sent to ShadowTalk's servers for BYOK accounts. Requests go directly from your browser to the provider you chose (including Anthropic's direct browser access), so there is no ShadowTalk proxy in the path and no place for a markup to hide. Keys are validated before first use, and you can set a different default model per provider.",
          "The server-held key pool you may have read about exists only for the free shared cloud mode — and that mode refuses BYOK accounts by design, so the two paths never mix. ShadowTalk does not resell inference on any tier.",
        ],
      },
      {
        heading: "BYOK plus offline: the combination the rest of the market doesn't ship",
        paragraphs: [
          "Most BYOK apps are desktop installs (or web clients that still need the network for every token), and the local-AI apps that do work offline keep your chats trapped on one machine — LM Studio's device sync is still an open feature request (#2467, checked Nov 2026). ShadowTalk pairs BYOK cloud models with an on-device model that runs in your browser on WebGPU: no key, no account, no card, and no internet required after a one-time download (300MB–2.6GB depending on your device tier).",
          "That pairing is the point: frontier quality when you're connected and willing to pay provider prices, capable draft-and-summarize work free and offline when you're not, and anything you send while offline queues up in durable local storage and syncs the moment you're back — end-to-end encrypted when Private Mode is on. Neither a subscription nor a desktop BYOK app can offer both halves.",
        ],
        bullets: [
          "Cloud BYOK models: frontier quality, billed by your provider at cost",
          "On-device models (Qwen 2.5, Llama 3.2, SmolLM2 tiers): free forever, no key, no rate limits",
          "Offline sends queue locally and auto-sync on reconnect",
          "One synced workspace across phone and desktop — the PWA installs in one tap, no app store",
        ],
      },
    ],
    howTo: {
      name: "Set up BYOK in ShadowTalk",
      steps: [
        "Open shadowtalk-ai.com in Chrome or Edge (113+) — no account and no card required to start.",
        "Get an API key from a provider: OpenAI, Anthropic, Google, Groq, DeepSeek or OpenRouter (OpenRouter offers free-tier models to start with).",
        "In ShadowTalk, open Settings → Connections (\"API keys & integrations\").",
        "Pick your provider, paste the key, and set the default model you want that provider to serve — the key is validated before it's saved.",
        "Chat: requests go directly from your browser to the provider you chose, at provider cost, with no ShadowTalk markup.",
        "Optional: install the on-device model from the offline settings — then everyday chat works free with no key and no internet, and cloud BYOK stays available when you're back online.",
      ],
    },
    faqs: [
      {
        question: "What is BYOK in AI?",
        answer:
          "BYOK (bring your own key) means an AI app uses an API key from your own provider account — OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter and more — instead of reselling inference through a subscription. You pay the provider directly for what you use and the app takes no cut. In ShadowTalk, keys stay in your browser and requests go straight from your browser to the provider you chose.",
      },
      {
        question: "Is BYOK cheaper than a subscription like ChatGPT Plus?",
        answer:
          "For light and mid-weight use, usually yes — you pay only for what you use, OpenRouter offers free-tier models, and everyday tasks run free on ShadowTalk's on-device model with no usage limits. The honest catch: heavy frontier-model use at list API prices can cost more than a flat $20/month, and a subscription saves you the key setup. Judge by your actual volume.",
      },
      {
        question: "Where does ShadowTalk store my API key?",
        answer:
          "In your browser, namespaced per user — BYOK keys are not sent to ShadowTalk's servers. Requests go directly from your browser to the provider you chose (including Anthropic's direct browser access), so there is no ShadowTalk proxy in the path. The server-held key pool exists only for the free shared mode, which refuses BYOK accounts by design.",
      },
      {
        question: "Which providers can I bring a key from?",
        answer:
          "16+ providers, including OpenAI, Anthropic, Google, Groq, DeepSeek and OpenRouter. Keys are validated before first use and each provider can have its own default model, so you can route speed work to Groq, cheap reasoning to DeepSeek and frontier quality to OpenAI or Anthropic in one workspace.",
      },
      {
        question: "Can I use ShadowTalk without an API key?",
        answer:
          "Yes. The on-device model runs in your browser on WebGPU (Chrome/Edge 113+) after a one-time download — free, no usage limits, no key, no card, and it keeps working offline. BYOK cloud models are optional, for when you need frontier quality.",
      },
      {
        question: "Does BYOK work offline?",
        answer:
          "Cloud BYOK models need a connection — the key opens a door to a provider's servers, and nothing you paste changes that. The on-device model needs no key at all and works with zero internet: anything you send while offline queues in durable local storage and syncs when you're back.",
      },
    ],
    related: [
      { label: "Offline AI chat — works with no internet", href: "/offline-ai-chat", note: "The on-device model needs no key at all" },
      { label: "Is ChatGPT Plus worth it", href: "/is-chatgpt-plus-worth-it", note: "The honest $20/month math vs the free stack" },
      { label: "Free AI chat", href: "/free-ai-chat", note: "What 'free' actually means here" },
      { label: "Who can read your AI chats", href: "/who-can-read-your-ai-chats", note: "Tier-by-tier server visibility" },
      { label: "ShadowTalk vs ChatGPT", href: "/vs/chatgpt", note: "Cloud-only vs BYOK + on-device, scored" },
    ],
    ctaLabel: "Start BYOK chat — free, no card",
  },
};

/** One-line summaries for the /guides hub and llms.txt */
export const GUIDE_HUB_LINE: Record<string, string> = {
  "offline-ai-chat": "How offline chat and automatic sync actually work — honestly",
  "private-ai-chat": "The three privacy tiers: on-device, BYOK, end-to-end encryption",
  "run-llm-in-browser": "WebGPU step by step — model sizes, speed, switching",
  "what-is-on-device-ai": "The plain-English definition, with the privacy math",
  "best-offline-ai-chat": "Offline AI apps ranked on published criteria",
  "ai-chat-without-account": "Guest mode: zero sign-up, zero egress, honest limits",
  "free-ai-chat": "What 'free' actually means — no card, no markup, no locks",
  "mobile-offline-ai": "Offline AI on your phone as a PWA, without the sync gap",
  "webgpu-ai-chat": "How a browser tab runs a language model on your GPU",
  "local-vs-cloud-ai": "The trade-offs scored, and the hybrid that ends the argument",
  "chatgpt-down": "The outage playbook: on-device AI + multi-provider BYOK, so no single cloud stops your work",
  "ai-chat-for-travel": "Offline AI on flights, roaming and dead zones — download before you fly, sync on landing",
  "ai-chat-for-students": "Free study aid with no account that survives school wifi — learn with it, honestly",
  "who-can-read-your-ai-chats": "The tier-by-tier answer: who can reach your prompts — and what E2EE actually covers",
  "is-chatgpt-plus-worth-it": "The honest math: when $20/month earns it, and the free stack that covers most of what it does",
  "byok-ai-chat": "BYOK explained: your key, your provider's prices, no markup — plus the keyless on-device model that works offline",
};
