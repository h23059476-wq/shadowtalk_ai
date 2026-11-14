export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: "Architecture" | "Agentic AI" | "Tutorials" | "Product Updates";
  excerpt: string;
  publishedAt: string;
  readTime: string;
  author: {
    name: string;
    role: string;
  };
  tags: string[];
  content: string;
}

/**
 * Engineering blog — grounded in the actual repository implementation.
 * Every claim in these posts traces to shipped code or the delivery docs
 * in docs/intelligent-workspace/. No placeholder content.
 */
export const PRODUCTION_POSTS: BlogPost[] = [
  {
    id: "post-live-mode-redesign",
    title: "LIVE Mode Redesign: A Voice Presence, Not a Chatbot",
    slug: "live-mode-voice-presence-redesign",
    category: "Product Updates",
    excerpt: "Why talking to an AI feels like operating a robot — and the four engineering fixes (living avatar, hands-free barge-in, streaming speech, rhythm engine) that turned ShadowTalk LIVE Mode into a conversation.",
    publishedAt: "November 13, 2026",
    readTime: "9 min read",
    author: {
      name: "Zain Ahmed Fahad Patel",
      role: "Founder & Lead Architect",
    },
    tags: ["Voice", "Canvas", "WebAudio", "Streaming", "Barge-in"],
    content: `We shipped a full redesign of LIVE Mode — ShadowTalk's real-time voice conversation surface. This post is the honest engineering story: what made the old mode feel like talking to a robot, and what we changed.

### The four root causes of "robot feel"

We audited the previous LiveVoiceMode implementation and found four concrete causes — none of them exotic, all of them compounding:

1. **Interruption required a tap.** Barge-in existed, but it was manual: the microphone recognizer was stopped while the AI spoke, and the user had to press the mic button to interrupt. In a real conversation you interrupt by speaking. A system that can't hear you while it talks is, definitionally, a robot.

2. **Dead air before every reply.** The AI waited for the entire LLM response to finish generating before speaking a single word. Even a short answer produced seconds of silence followed by a wall of speech. Ironically, the streaming infrastructure (an onDelta callback on the provider request) already existed in the codebase — voice mode simply never used it.

3. **A static "orb".** The visualizer was a div with two CSS pulse rings. It reacted to state (listening/speaking) but never to sound. Nothing about it felt alive.

4. **Flat, unsafe text-to-speech.** The full reply was spoken as one block, with no rhythm, and anything the model emitted — emoji, markdown, URLs — went straight to the TTS engine, which dutifully reads emoji aloud.

### A presence, not a visualizer: LiveAvatar

The centerpiece is LiveAvatar, a canvas-rendered "living shadow" driven by a single requestAnimationFrame loop. It breathes (a slow organic scale oscillation), and it has two glowing eyes that blink on a randomized timer, drift with micro-saccades, widen when listening, half-close in thought, and squint slightly during energetic speech. The body is a harmonic blob — three sine waves on the radius — whose amplitude is driven by real audio loudness. Phase transitions (idle, listening, thinking, speaking) lerp smoothly and re-tint the aura; they never snap.

Crucially, loudness comes from a ref-based getter, not React state: zero re-renders per frame. Mic loudness comes from a getUserMedia plus AnalyserNode RMS meter (useMicLevel). While the AI speaks, we attach a WebAudio MediaElementSource to the playing audio element and read its amplitude in the same loop — the avatar visibly speaks the words.

### Hands-free barge-in

While the AI speaks, the mic keeps metering. Sustained loudness above threshold for roughly 280 milliseconds triggers an interrupt: TTS aborts, the in-flight LLM stream is cancelled, the queued sentences are dropped, and the recognizer takes the floor. Two guards make this safe in practice: a 700 millisecond grace period after TTS starts (echo cancellation suppresses most speaker bleed, but the tail needs covering), and a 1.6 second cooldown after each interrupt. Tap-to-interrupt still works — auto barge-in is additive.

### Streaming speech pipeline

The response pipeline changed from "generate everything, then speak" to speak-while-generating: every onDelta is fed to an extractor that emits each completed sentence the moment its punctuation lands. A speech queue speaks chunk one while chunk two is still being generated; first audio now starts roughly a second after you finish talking, instead of after the whole response. If you interrupt mid-stream, the in-flight generation aborts with it — no zombie sentences.

### The rhythm engine

speechChunking strips emoji, markdown, and URLs before TTS (URLs become "a link"), splits sentences without breaking on abbreviations (Dr., e.g., and p.m. do not trigger breaks), splits overlong sentences on clause boundaries, and plans punctuation pauses: 150 milliseconds after a comma, 230 after a semicolon, 320 after a period or question mark, 420 at the end of a turn. ElevenLabs voices and the browser-TTS fallback both flow through the same engine.

### What was preserved

The BYOK AI flow, cloud fallback, ElevenLabs voice settings, offline fallback responses, and the component's public API are untouched — the redesign is a swap of the conversation engine and the surface, not a rewrite of the product. Try it: open the workspace, tap the phone icon, and talk over the AI mid-sentence. It hands you the floor.`,
  },
  {
    id: "post-stealth-rag",
    title: "Stealth RAG: Local-First Retrieval for the Intelligent Workspace",
    slug: "stealth-rag-local-first-retrieval",
    category: "Architecture",
    excerpt: "Drag a document into chat and it becomes retrievable context — extracted, chunked, embedded and indexed entirely on-device. Here is the pipeline, including the honest limits of a lexical embedder.",
    publishedAt: "November 13, 2026",
    readTime: "8 min read",
    author: {
      name: "Zain Ahmed Fahad Patel",
      role: "Founder & Lead Architect",
    },
    tags: ["RAG", "IndexedDB", "Privacy", "Embeddings"],
    content: `Stealth RAG is the retrieval layer of ShadowTalk's intelligent workspace. The design goal was aggressive: users drag a document into the conversation and it simply becomes context — no embedding configuration, no chunk-size settings, no retrieval pipeline exposed.

### The pipeline

The pipeline (src/lib/rag/) has six stages, all client-side:

1. **Validate** — a 25 MB cap and a check that extraction is supported.
2. **Extract** — reuses the existing documentIntelligence layer: PDF via pdfjs-dist, DOCX via mammoth, PPTX/XLSX/ODT via fflate plus DOM parsing, TXT/MD/CSV/JSON/code as UTF-8. No duplicate extraction infrastructure.
3. **Chunk** — a roughly 1,600-character target with paragraph-aware ~200-character overlap; giant paragraphs split by sentence; deterministic output.
4. **Embed** — a pluggable EmbeddingProvider (see below).
5. **Index** — an IndexedDB database, documents and chunks written in one transaction; duplicates detected by content hash at the same scope.
6. **Associate** — every record carries user_id and project_id; every read filters by the authenticated user; deletion removes document and chunks atomically.

### The embedding honesty problem

The default provider is local-hash: on-device feature hashing (tokens plus bigrams into a signed 512-dimension vector, sublinear TF, L2-normalized). Zero network, zero cost, works offline. It is, honestly, a lexical embedder — not a neural model. We say so, in the UI and in the delivery docs. It works well for keyword-shaped queries and poorly for paraphrase-heavy ones, and pretending otherwise would be the kind of claim this project refuses to make.

Neural embeddings are available one way today: remote providers (OpenAI, Gemini, Mistral, Together, Fireworks, Novita, DeepInfra, Hyperbolic) can be opted into per user under Settings → Local Tools, using the user's own BYOK key and documented embeddings endpoints only — providers without documented embedding APIs are refused by an explicit capability list rather than silently guessed. A WebGPU transformers.js path was investigated and deliberately not shipped: re-adding onnxruntime would put roughly 10 MB of WASM into every PWA precache. The interface leaves room for a future opt-in; nothing claims it today.

### Retrieval in the conversation path

On message send, the RAG module is dynamically imported — it stays out of the initial chat bundle — and retrieval runs as a non-fatal step: any failure degrades to the conversation without documents, never to an error. The query is embedded with the same provider family as the index; mixed-provider scopes fall back to the matching provider's chunks or return nothing rather than mixing vector spaces.

### Why local-first matters

Everything above runs in your browser. Documents never leave the device unless you explicitly opt into a remote embedding provider with your own key. Combined with user-scoped indexing, this is the same privacy perimeter as the rest of ShadowTalk: the retrieval corpus is yours, isolated by project, and deletable with the document.`,
  },
  {
    id: "post-mcp-bridge",
    title: "The MCP Bridge: Local Tools With Human-in-the-Loop Approvals",
    slug: "mcp-bridge-human-in-the-loop-tools",
    category: "Agentic AI",
    excerpt: "A browser page cannot inspect your local software — so ShadowTalk ships a zero-dependency Node companion, loopback-only pairing, and a permission model where write tools always ask first.",
    publishedAt: "November 13, 2026",
    readTime: "7 min read",
    author: {
      name: "Zain Ahmed Fahad Patel",
      role: "Founder & Lead Architect",
    },
    tags: ["MCP", "Agentic", "Security", "Approvals"],
    content: `Model Context Protocol servers are the practical way to give an AI agent real tools — filesystem access, databases, internal APIs. But ShadowTalk is a browser app, and a web page cannot inspect local software. Rather than ship a fake UI, we shipped a design that admits this constraint: the user runs a small companion process on their machine, and the browser pairs with it over loopback.

### The companion process

The bridge is a zero-dependency Node (version 18 or newer) script that spawns configured MCP servers as stdio subprocesses and exposes them to the paired browser tab over a loopback-only HTTP JSON-RPC API. The MCP stdio wire protocol is newline-delimited JSON-RPC 2.0; the three methods the bridge needs — initialize, tools/list, tools/call — are implemented by hand, which is why there are no npm dependencies to audit.

### The security perimeter

The threat model is a malicious web page trying to use your local tools. The defenses:

- The bridge binds 127.0.0.1 only, and the Host header must be loopback — a DNS-rebinding defense.
- A pairing token is generated at boot and printed in the terminal, and is required on every request. A cross-origin page can complete neither preflight nor invocation, and gets no CORS grant to read anything.
- MCP servers spawn via argv arrays with shell execution disabled — no shell interpolation anywhere.
- allowedRoots path containment: absolute-path arguments are canonicalized and forced inside declared roots before reaching the MCP server; traversal chains are rejected.
- Tool calls have a 60-second default timeout; crashed servers surface honestly (status: stopped) and restart with a bounded backoff.
- A JSONL audit log records auth failures, host rejections, invocations (args summarized to keys and value types), and denials.

### Permissions: discovery grants nothing

In the browser client, permission categories are derived from MCP annotations: a read-only hint maps to read-only, a destructive hint to write, unknown tools conservatively to write, and execution-shaped names to execute. Every tool starts at ask-every-use. Read-only tools may be promoted to allow-always, and that grant is revocable. Write and execute tools always prompt — the storage layer refuses to persist sensitive grants, and hand-edited storage is stripped on load.

### Intent-based invocation

When you type "list the files in my project folder", a deterministic matcher scores message text against tool names and descriptions (name-token overlap weighted 0.6, description overlap 0.4, threshold 0.5). Ambiguous requests return null — which becomes a clarifying question in chat, not a wrong tool call. Argument extraction fills only schema-declared string properties that literally appear in your message; it never invents complex arguments.

The result renders through the existing tool-card pipeline, failures are explained in-chat, and every step is visible in Settings → Local Tools, where per-tool switches, recent activity, and a disconnect that revokes the pairing token live. The agent gets tools; you keep the veto.`,
  },
  {
    id: "post-token-optimizer",
    title: "The Dynamic Token Optimizer: Context Budgeting Without Lying",
    slug: "dynamic-token-optimizer-context-budgeting",
    category: "Architecture",
    excerpt: "Sixteen BYOK providers, sixteen context windows, and a hard rule: everything estimated is labeled estimated. How conversation compaction reshapes requests without ever mutating history.",
    publishedAt: "November 13, 2026",
    readTime: "8 min read",
    author: {
      name: "Zain Ahmed Fahad Patel",
      role: "Founder & Lead Architect",
    },
    tags: ["Context Window", "Tokens", "Compaction", "BYOK"],
    content: `Before the intelligent workspace initiative, ShadowTalk's entire context-management strategy was a fixed slice: the last 14 messages went to the model, everything older vanished silently. Worse, the cost tracker was called with a hard-coded model string that had nothing to do with the model actually serving your request. The Dynamic Token Optimizer replaced both, under one constraint: no invented numbers.

### Per-provider budgets

The model registry carries context windows and output caps for all sixteen BYOK providers plus the shared gateway, with known-model overrides (GPT-4o at 128K, Claude at 200K, Gemini Pro at 2M, DeepSeek at 64K, Llama-3.x at 131K) and conservative round-down defaults for unknown models — 32K for aggregators whose model lineup is unknowable. The usable input budget is the context window minus reserved output minus a 5 percent safety margin (capped at 1,024 tokens). The old hard-coded 8,192 max-tokens is now clamped to each provider's documented output limit.

### Estimation, labeled as estimation

Token counts are estimated with a CJK-aware heuristic: CJK characters count roughly one token each, other text roughly one per four characters. A naive characters-over-four rule overcounts Chinese and Japanese by about four times, and ShadowTalk ships eleven UI languages — so the correction matters. Everything estimated is labeled estimated in the telemetry surfaces.

### Non-destructive compaction

When estimated history plus the fixed prompt prefix exceeds the budget, compaction runs — and it never touches your stored conversation. Protected message classes are never compacted regardless of age: decisions, requirements and constraints, unfinished tasks, unresolved questions, and file or research references, plus a verbatim recent tail of 14 messages preserved as the floor. Everything else in the overflow becomes one extractive summary per run, computed locally with zero provider calls — compaction never creates cost. Each summary carries source message IDs for traceability back to the original messages.

The outgoing request references the original message objects by index, so rich content like vision images passes through untouched, and the original conversation in state and Firestore is never mutated. Summaries persist to a user-owned Firestore collection for inspection and recovery.

### Why non-destructive matters

Most chat apps compact by rewriting history. That is convenient and quietly lossy: the version you reread is no longer what happened. Reshaping only the outgoing request costs a little more bookkeeping and preserves the ground truth — the conversation you see is always the conversation that happened.`,
  },
  {
    id: "post-byok-tutorial",
    title: "Tutorial: BYOK in ShadowTalk — Your Key, Your Provider, Your Bill",
    slug: "byok-setup-tutorial",
    category: "Tutorials",
    excerpt: "ShadowTalk is BYOK-first: your provider API key stays in your browser and talks straight to the provider. Here is the full setup, what streams where, and what happens without a key.",
    publishedAt: "November 13, 2026",
    readTime: "6 min read",
    author: {
      name: "Zain Ahmed Fahad Patel",
      role: "Founder & Lead Architect",
    },
    tags: ["BYOK", "Getting Started", "Providers", "Streaming"],
    content: `ShadowTalk is BYOK-first. There is no subscription and no proxy metering your tokens: you bring a provider API key, it is stored in your browser, and requests go from your browser to the provider you chose. This tutorial walks the whole path.

### Step 1 — Add your key

Open Settings → Personalization → BYOK and paste a key from any supported provider — OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together, Fireworks, DeepSeek, xAI, Cohere, Perplexity, Hyperbolic, Novita, DeepInfra, and more. Keys are stored in your browser's localStorage, on the same trust domain as your session. They are never sent to ShadowTalk backend servers; the direct browser-to-provider request is the product.

### Step 2 — Pick a model

Each provider exposes its models with documented context windows, and the Dynamic Token Optimizer clamps output to each provider's real limits. You can switch provider and model per conversation; the workspace shows which provider is serving the current session.

### Step 3 — Watch it stream

Responses stream token by token into the chat surface. The same stream feeds LIVE Mode's speech pipeline, where completed sentences are spoken the moment their punctuation arrives — voice replies begin roughly a second after you stop talking.

### Step 4 — Give it documents

Drag a file into the workspace or use the composer paperclip. Stealth RAG extracts, chunks, embeds and indexes it locally (25 MB cap; PDF, DOCX, PPTX, XLSX, ODT, TXT/MD/CSV/JSON and code are supported), and relevant passages are retrieved automatically into later conversation turns. Retrieval is non-fatal: if anything fails, the chat continues without the documents rather than breaking.

### Without a key

ShadowTalk does not fake responses. Without a configured key you get a clear message directing you to Settings → Personalization → BYOK, and the shared-gateway path (if enabled for your account) is the only fallback — with honest errors when it is unavailable.

### Security notes

Two rules to remember. First, never put a provider key in a VITE_ environment variable — everything with that prefix is embedded into the public browser bundle. Second, a browser-held key is readable by anything running in your browser on that origin; that is the BYOK trade, and it is disclosed rather than hidden. If you need stronger isolation, use a provider-issued restricted key scoped to the minimum permissions.`,
  },
  {
    id: "post-intelligent-workspace-release",
    title: "v3.3 + v3.4: The Intelligent Workspace and a LIVE Mode That Listens",
    slug: "intelligent-workspace-release-notes",
    category: "Product Updates",
    excerpt: "The two releases that changed the product's shape: Stealth RAG, the Token Optimizer and the MCP Bridge landed together — then LIVE Mode was rebuilt around a living avatar and hands-free interruption.",
    publishedAt: "November 13, 2026",
    readTime: "7 min read",
    author: {
      name: "Zain Ahmed Fahad Patel",
      role: "Founder & Lead Architect",
    },
    tags: ["Release", "Workspace", "RAG", "Voice"],
    content: `Two releases shipped in one week, and together they change what ShadowTalk is: from a chat page with features around it into an intelligent workspace with a voice presence at its center. This is the changelog with the reasoning attached.

### v3.3 — the intelligent workspace

The unified workspace experience landed in one coordinated push:

- **Stealth RAG** — drag-and-drop ingestion with automatic local indexing and retrieval. No retrieval settings exposed; 25 MB per-document cap; PDF, DOCX, PPTX, XLSX, ODT and text/code supported. The context indicator shows what the model can see.
- **Dynamic Token Optimizer** — provider-aware context budgeting across all BYOK providers, non-destructive conversation compaction with protected message classes, and honest token telemetry that reports the real provider and model.
- **Native MCP Bridge** — a zero-dependency local companion, loopback-only pairing, granular permissions, and approval-gated invocation of your local tools from chat.
- **Memory, real** — memory reflection and on-device embeddings became genuinely functional in this cycle (replacing a path that was not production-honest), and signed-out 403 noise was eliminated.
- **Chat history that survives reload** — recognizable conversation history after a page refresh, with the missing Firestore composite indexes deployed.
- **Deterministic Google sign-in** — the OAuth redirect now lands exactly where it should: back on the workspace, with no loop.
- **Mobile** — a responsive redesign across routes, plus a PWA manifest fix that restores mobile install (display, start_url and scope now satisfy Chrome's install criteria).

### v3.4 — LIVE Mode becomes a presence

The voice surface was rebuilt end to end: a canvas-rendered living avatar (breathing, blinking, phase-colored aura, amplitude-driven morphing), hands-free barge-in with echo-cancelled mic metering, a streaming speech pipeline that starts speaking the first sentence while the rest is still generating, and a rhythm engine that strips emoji and markdown before TTS and inserts punctuation-aware pauses. The old tap-to-interrupt still works; it is now the fallback, not the requirement.

### What did not change

BYOK is still the spine: keys stay in the browser and talk directly to providers. Shadow Memory stays fully on-device. And the honesty rule — no invented benchmarks, no fake integrations, claims traceable to code — applied to every item above. Full engineering write-ups for Stealth RAG, the MCP Bridge, the Token Optimizer and the LIVE Mode redesign are on this blog.`,
  },
];
