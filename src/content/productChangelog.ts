export type ChangelogChangeType = "feature" | "improvement" | "bugfix" | "security";

export interface ChangelogChange {
  type: ChangelogChangeType;
  text: string;
}

export interface ProductChangelogEntry {
  version: string;
  title: string;
  summary: string;
  publishedAt: string;
  changes: ChangelogChange[];
  tags?: string[];
}

/** Built-in release notes — shown on /changelog (merged with CMS entries). */
export const PRODUCT_CHANGELOG: ProductChangelogEntry[] = [
  {
    version: "3.2.0",
    title: "Hybrid API Key & OmniRoute Gateway Integration",
    summary: "Launched the cohort-based onboarding system (Instant Start vs BYOK) with OmniRoute gateway routing for non-tech users. Added real-time /status page and /security trust center.",
    publishedAt: "2026-10-22",
    tags: ["OmniRoute", "BYOK", "Onboarding", "Security", "Status"],
    changes: [
      { type: "feature", text: "OmniRoute AI Gateway: NON_TECH (Instant Start) users now route through the load-balanced OmniRoute proxy with automatic 429 circuit-breaker rotation across Gemini, Groq, and Mistral." },
      { type: "feature", text: "Hybrid API Key onboarding: One-time modal on /chatbot splits users into Instant Start (50 msgs/day) or BYOK (unlimited, own key)." },
      { type: "feature", text: "New /status page: Real-time system health for OmniRoute, Firebase Auth, OpenRouter, Gemini, Firestore, and Hosting with uptime percentages and incident history." },
      { type: "feature", text: "New /security route: Trust center documenting client-side key storage, zero-training guarantee, encryption protocol, and OmniRoute proxy safety." },
      { type: "improvement", text: "Daily usage tracking: UTC-midnight-resetting 50/day cap for NON_TECH users with auto-detection of date rollover." },
      { type: "security", text: "BYOK keys stored strictly in browser localStorage — never sent to ShadowTalk backend servers." },
    ],
  },
  {
    version: "3.1.0",
    title: "PWA Offline Support & 11-Locale i18n",
    summary: "Added Progressive Web App offline caching, 11 hreflang locales, and Puppeteer-based prerendering for 13 SEO-critical routes.",
    publishedAt: "2026-09-15",
    tags: ["PWA", "i18n", "SEO", "Prerender"],
    changes: [
      { type: "feature", text: "PWA: Service worker caches JS/CSS/HTML/wasm up to 10 MB for offline access. Installable on iOS/Android/desktop." },
      { type: "feature", text: "11 hreflang alternates (en, es, fr, de, ar, hi, pt, ru, ja, zh, ur) on every page via ?hl= querystring." },
      { type: "feature", text: "Prerendering: 13 SEO-critical routes (/, /founder, /about, /pricing, /chatbot, etc.) pre-rendered via Puppeteer for instant crawler access." },
      { type: "improvement", text: "Vite manual chunks: vendor-react, vendor-firebase, vendor-ui, vendor-3d, vendor-editor, vendor-ai for optimal code-splitting." },
      { type: "bugfix", text: "Fixed COOP/COEP headers on Firebase Hosting — WebGPU and SharedArrayBuffer now work in production." },
    ],
  },
  {
    version: "3.0.0",
    title: "The Agentic Pivot: Less Bloat, More Power",
    summary: "Integrated OpenAI GPT-4o as a first-class citizen, and stripped away 40+ legacy pages to focus strictly on Omniscience and Twin.",
    publishedAt: "2026-08-31",
    tags: ["OpenAI", "Turbo Engine", "UX", "Agents"],
    changes: [
      { type: "feature", text: "OpenAI GPT-4o integration: Native SSE streaming support and complexity routing to handle the hardest tasks." },
      { type: "feature", text: "Focused exclusively on the 'Big Two': Omniscience (knowing everything contextually) and Twin (your digital clone)." },
      { type: "improvement", text: "Massive UI cleanup: Removed 40+ legacy hubs, marketplaces, and unnecessary pages to declutter the workspace." },
      { type: "security", text: "Secure environment variable handling for OpenAI and Groq keys, wired deeply into the Turbo Engine." },
    ],
  },
  {
    version: "2.6.0",
    title: "Workspace-first experience",
    summary: "Open ShadowTalk straight into chat — faster entry, persistent sessions, cleaner composer.",
    publishedAt: "2026-06-01",
    tags: ["UX", "Auth", "Chat"],
    changes: [
      { type: "feature", text: "Site root (/) now opens the /chatbot workspace; marketing lives at /home." },
      { type: "feature", text: "Persistent sessions — return visits stay signed in; optional anonymous auto sign-in (Gemini-style)." },
      { type: "improvement", text: "Removed boot splash and “Warming up…” screen on the chatbot path." },
      { type: "improvement", text: "Chat composer: send button aligned inside the pill; Turbo hardware badge removed from UI." },
      { type: "improvement", text: "Dedicated /pricing page with animated plan comparison." },
      { type: "improvement", text: "Marketing landing uses neural dock navigation (Pricing, Install, Login)." },
      { type: "bugfix", text: "Fixed coupon banner runtime error and header overlap on home." },
    ],
  },
  {
    version: "2.5.0",
    title: "App Builder & runnable Marketplace",
    summary: "Generate full web/mobile projects in the IDE; install agents that actually run in chat.",
    publishedAt: "2026-05-30",
    tags: ["IDE", "Marketplace"],
    changes: [
      { type: "feature", text: "App Builder — “build me an app” creates multi-file projects and opens /ide with live preview." },
      { type: "feature", text: "Marketplace agents inject real system prompts, starters, and IDE scripts from /chatbot?agent=." },
      { type: "improvement", text: "Personal IDE: multi-file explorer, mobile viewport, templates, AI assist actions." },
    ],
  },
  {
    version: "2.4.0",
    title: "Hardware-aware speed paths",
    summary: "Automatic local WebGPU/WASM vs cloud routing on capable devices.",
    publishedAt: "2026-05-28",
    tags: ["Performance", "Offline"],
    changes: [
      { type: "feature", text: "Hardware intelligence scores CPU/GPU and caches profile for routing decisions." },
      { type: "feature", text: "Hybrid router sends simple messages to on-device models when ready." },
      { type: "improvement", text: "WebGPU prewarm runs in background without blocking chat input." },
      { type: "improvement", text: "Startup performance — deferred chrome, shared platform metrics, lazy landing sections." },
    ],
  },
  {
    version: "2.3.0",
    title: "& agentic tools",
    summary: "Bring your own API keys and expanded chat tooling.",
    publishedAt: "2026-05-20",
    tags: ["", "Agents"],
    changes: [
      { type: "feature", text: "for Gemini and Kimi — keys in Profile/Settings." },
      { type: "feature", text: "Command palette (⌘K) for quick navigation and tool launch." },
      { type: "improvement", text: "Tool orchestration with human-in-the-loop confirmations on sensitive actions." },
    ],
  },
  {
    version: "2.2.0",
    title: "Foundation release",
    summary: "Desktop app, trust metrics, brand refresh, and an upgraded chat experience.",
    publishedAt: "2026-05-10",
    tags: ["Desktop", "Trust"],
    changes: [
      { type: "feature", text: "Electron desktop builds with native file picker and notifications." },
      { type: "feature", text: "Cyber Command Center — security copilot, scans, and ops modules." },
      { type: "improvement", text: "Honest product claims and live community metrics on landing." },
      { type: "security", text: "Security hardening migrations and stealth network guard options." },
    ],
  },
];

export function mergeChangelogWithCms(
  cmsEntries: Array<{
    id?: string;
    version: string;
    title: string;
    description: string;
    change_type: string;
    tags?: string[] | null;
    published_at?: string | null;
  }>,
): Array<ProductChangelogEntry & { id?: string }> {
  const staticVersions = new Set(PRODUCT_CHANGELOG.map((e) => e.version));

  const fromCms: Array<ProductChangelogEntry & { id?: string }> = cmsEntries
    .filter((e) => !staticVersions.has(e.version))
    .map((e) => ({
      id: e.id,
      version: e.version,
      title: e.title,
      summary: e.description,
      publishedAt: e.published_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      tags: (e.tags as string[]) ?? [],
      changes: [
        {
          type: (e.change_type as ChangelogChangeType) || "improvement",
          text: e.description,
        },
      ],
    }));

  return [...PRODUCT_CHANGELOG, ...fromCms].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
