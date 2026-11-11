export interface ComparisonPageData {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  canonical: string;
  summary: string;
  bestFor: string;
  whyShadowTalkWins: string[];
  faq: Array<{ question: string; answer: string }>;
  rows: Array<{
    category: string;
    shadowtalk: string;
    competitor: string;
  }>;
}

export const COMPARISON_PAGES: ComparisonPageData[] = [
  {
    slug: "chatgpt",
    competitor: "ChatGPT",
    title: "ShadowTalk AI vs ChatGPT",
    description:
      "Compare ShadowTalk AI vs ChatGPT for agentic workflows, privacy, multi-tool execution, and pricing.",
    canonical: "https://www.shadowtalk-ai.com/compare/chatgpt",
    summary:
      "ChatGPT is strong for general chat. ShadowTalk AI is built for buyers who want one workspace for missions, tools, research, privacy controls, .",
    bestFor:
      "Teams and builders who want an AI workspace that can finish multi-step work instead of only answering one prompt at a time.",
    whyShadowTalkWins: [
      "Agentic workflows run multi-step tasks with human oversight.",
      "Built-in tools reduce context switching across chat, research, code, and documents.",
      "",
      "Lower entry pricing for users who need an operational workspace, not just a chatbot.",
    ],
    faq: [
      {
        question: "How is ShadowTalk AI different from ChatGPT?",
        answer:
          "ShadowTalk AI focuses on agentic execution: missions, built-in tools, research flows, privacy controls, and optional stealth mode. ChatGPT is excellent for general-purpose chat, but ShadowTalk is designed as an operational workspace.",
      },
      {
        question: "Is ShadowTalk AI cheaper than ChatGPT?",
        answer:
          "ShadowTalk offers a BYOK — no platform fee and lower paid entry points for users who want multi-tool workflows, privacy features, and autonomous missions in one product.",
      },
    ],
    rows: [
      { category: "Autonomous workflows", shadowtalk: "Built-in agentic execution", competitor: "Primarily prompt-response chat" },
      { category: "Tooling", shadowtalk: "Built-in tools in one workspace", competitor: "Tooling varies by plan and workflow" },
      { category: "Privacy controls", shadowtalk: "E2EE options, vault, stealth mode", competitor: "Mostly cloud-first" },
      { category: "Privacy posture", shadowtalk: "E2EE workflows", competitor: "No primary secure workflow" },
      { category: "Best fit", shadowtalk: "Execution-heavy workflows", competitor: "General chat and writing" },
    ],
  },
  {
    slug: "claude",
    competitor: "Claude",
    title: "ShadowTalk AI vs Claude",
    description:
      "Compare ShadowTalk AI vs Claude for research, long-context work, privacy posture, missions, and product breadth.",
    canonical: "https://www.shadowtalk-ai.com/compare/claude",
    summary:
      "Claude is excellent for writing and long-context reasoning. ShadowTalk AI adds the surrounding operating system: missions, built-in tools, memory, privacy modules, and deep research.",
    bestFor:
      "Operators who love strong reasoning but need their AI to act across tools, documents, and repeatable workflows.",
    whyShadowTalkWins: [
      "Combines reasoning with execution so users can move from insight to action in one interface.",
      "Includes developer tools, presentations, research, and voice inside the same product.",
      "Adds enterprise-style privacy posture with vault, and local/secure options.",
      "Creates a deeper technical footprint for procurement and search-agent research via docs, facts, and architecture pages.",
    ],
    faq: [
      {
        question: "Is ShadowTalk AI better than Claude for writing?",
        answer:
          "Claude remains strong for writing-heavy tasks. ShadowTalk AI is better when the user needs writing plus execution, research, tools, privacy workflows, and autonomous follow-through.",
      },
      {
        question: "Why would a team choose ShadowTalk AI over Claude?",
        answer:
          "Teams choose ShadowTalk when they want one workspace for research, code, missions, voice, privacy controls,  instead of a standalone conversational model experience.",
      },
    ],
    rows: [
      { category: "Long-context reasoning", shadowtalk: "Strong with workspace context", competitor: "Very strong" },
      { category: "Execution layer", shadowtalk: "Agentic tool chains", competitor: "Limited product-native execution" },
      { category: "Developer workspace", shadowtalk: "IDE, tools, docs, API pages", competitor: "Less workspace breadth" },
      { category: "Privacy posture", shadowtalk: "Vault, local options", competitor: "Cloud-first" },
      { category: "Best fit", shadowtalk: "Research + execution teams", competitor: "Writing and reasoning-first teams" },
    ],
  },
  {
    slug: "perplexity",
    competitor: "Perplexity",
    title: "ShadowTalk AI vs Perplexity",
    description:
      "Compare ShadowTalk AI vs Perplexity for research depth, citations, actionability, privacy, and multi-step execution.",
    canonical: "https://www.shadowtalk-ai.com/compare/perplexity",
    summary:
      "Perplexity is strong for fast answer retrieval. ShadowTalk AI goes further by turning research into action with autonomous missions, tool execution, code, and internal workspace memory.",
    bestFor:
      "Buyers who need cited research plus follow-through: briefs, documents, workflows, presentations, and ongoing memory in one place.",
    whyShadowTalkWins: [
      "Deep research can flow directly into missions, reports, presentations, and code.",
      "Users get a persistent workspace instead of a search-first answer layer only.",
      "ShadowTalk supports sensitive workflows with privacy-first and local-first paths.",
      "The product surface is broader for B2B evaluations: API, docs, security, compliance, and architecture pages.",
    ],
    faq: [
      {
        question: "Is ShadowTalk AI a search engine like Perplexity?",
        answer:
          "ShadowTalk AI includes deep research and cited outputs, but it is broader than a search product. It is an AI workspace for research, execution, documents, code, memory, and automation.",
      },
      {
        question: "When should I choose ShadowTalk AI over Perplexity?",
        answer:
          "Choose ShadowTalk when you want research plus action: follow-up tasks, reports, code, presentations, collaboration, and privacy controls in one stack.",
      },
    ],
    rows: [
      { category: "Research answers", shadowtalk: "Deep research with next-step execution", competitor: "Fast cited answer engine" },
      { category: "Workspace memory", shadowtalk: "Persistent knowledge + hubs", competitor: "Limited workspace model" },
      { category: "Actionability", shadowtalk: "Missions, tools, docs, code", competitor: "Primarily answer retrieval" },
      { category: "Privacy options", shadowtalk: "Advanced E2EE workflows", competitor: "Cloud-first" },
      { category: "Best fit", shadowtalk: "Research-to-action workflows", competitor: "Search-first discovery" },
    ],
  },
  {
    slug: "typingmind",
    competitor: "TypingMind",
    title: "ShadowTalk AI vs TypingMind",
    description:
      "Compare ShadowTalk AI vs TypingMind for BYOK multi-model chat, agentic workflows, WebGPU local RAG, and privacy — for builders who want more than a UI shell.",
    canonical: "https://www.shadowtalk-ai.com/compare/typingmind",
    summary:
      "TypingMind is a popular BYOK chat UI: bring your own API keys, pick models, and pay once for the interface. ShadowTalk AI goes further — agentic workflows, built-in tools (Deep Research, Code IDE, encrypted vault, Video Studio), WebGPU local inference, and a multi-model canvas for side-by-side comparison — at a lower entry price (free tier, BYOK Pro).",
    bestFor:
      "Developers and power users who want a BYOK multi-model canvas plus agentic execution, not just a prettier chat shell.",
    whyShadowTalkWins: [
      "Agentic workflows run multi-step jobs with approval gates — TypingMind is single-turn chat.",
      "Multi-model canvas: compare Claude vs GPT-4o vs Gemini side-by-side with live color-coded diffing.",
      "WebGPU local inference + local vector RAG runs on-device via WebLLM — no provider roundtrip required.",
      "Encrypted vault (PBKDF2 + AES-256-GCM, zero-knowledge) ships in-product; TypingMind has no equivalent.",
      "BYOK — no platform fee and lower paid entry (BYOK Pro) vs TypingMind's one-time license fee.",
    ],
    faq: [
      {
        question: "Is ShadowTalk AI better than TypingMind?",
        answer:
          "It depends. TypingMind is a polished BYOK chat UI for users who already have API keys and want a clean interface. ShadowTalk AI is better for builders who want BYOK plus agentic workflows, a multi-model canvas, WebGPU local inference, local vector RAG, an encrypted vault, and built-in tools (Deep Research, Code IDE, Video Studio) in one product.",
      },
      {
        question: "Is ShadowTalk AI BYOK (bring your own key)?",
        answer:
          "Yes. ShadowTalk AI is 100% BYOK: paste your OpenAI, Anthropic, Google, Groq, Together, Mistral, or OpenRouter API key and the workspace calls the provider directly. Your key is stored encrypted on your device and never transits ShadowTalk servers.",
      },
      {
        question: "Does ShadowTalk AI cost less than TypingMind?",
        answer:
          "ShadowTalk is free to use with no credit card and no subscription. TypingMind is a one-time license purchase for the interface (then BYOK provider costs on top). For builders who want execution + tools, not just chat UI, ShadowTalk includes more per dollar.",
      },
    ],
    rows: [
      { category: "Pricing model", shadowtalk: "Free — no platform fee (BYOK)", competitor: "One-time license fee" },
      { category: "BYOK support", shadowtalk: "100% BYOK — all major providers", competitor: "BYOK — all major providers" },
      { category: "Multi-model canvas", shadowtalk: "Side-by-side with live diffing", competitor: "Single conversation at a time" },
      { category: "Agentic workflows", shadowtalk: "Multi-step missions with approval gates", competitor: "Single-turn chat only" },
      { category: "Built-in tools", shadowtalk: "Deep Research, Code IDE, Vault, Video Studio", competitor: "Plugins / extensions" },
      { category: "Local inference", shadowtalk: "WebGPU + WebLLM on-device", competitor: "Cloud-only by default" },
      { category: "Local vector RAG", shadowtalk: "On-device embeddings + retrieval", competitor: "No native local RAG" },
      { category: "Privacy posture", shadowtalk: "E2EE, vault, zero-knowledge", competitor: "BYOK + localStorage" },
      { category: "Best fit", shadowtalk: "Builders who want execution + BYOK", competitor: "Buyers who want a polished chat UI" },
    ],
  },
];

export const COMPARISON_PAGE_BY_SLUG = Object.fromEntries(
  COMPARISON_PAGES.map((page) => [page.slug, page]),
) as Record<string, ComparisonPageData>;
