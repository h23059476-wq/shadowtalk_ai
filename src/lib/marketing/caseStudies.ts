/**
 * PSOF case studies for Phase 4 GEO — Problem, Solution, Outcome, Framework.
 */

export interface CaseStudy {
  id: string;
  title: string;
  persona: string;
  problem: string;
  solution: string;
  outcome: string;
  framework: string;
  ctaHref: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "founder-gtm-sprint",
    title: "Founder GTM sprint in one afternoon",
    persona: "Solo founder, pre-seed",
    problem:
      "Needed a credible GTM plan and investor one-pager but was bouncing between ChatGPT, Google Docs, and Perplexity with no single export.",
    solution:
      "Used ShadowTalk /strategy and Mission Control: market sizing → channel plan → one-pager draft with cited research in one workspace.",
    outcome:
      "Shipped a shareable plan same day — no upgrade needed because ShadowTalk is free to use and includes the full workflow.",
    framework: "PSOF: Problem = tab sprawl · Solution = agentic strategy missions · Outcome = finished artifact · Framework = Strategy Agent + exports",
    ctaHref: "/ai-business-planner",
  },
  {
    id: "anonymous-research",
    title: "Sensitive research without an account wall",
    persona: "Security-conscious consultant",
    problem:
      "Client work required AI research but corporate ChatGPT accounts were blocked; needed instant access without training-data uncertainty.",
    solution:
      "Started on /chatbot anonymous tier, enabled E2EE chat, used deep research with citations and Stealth Vault for draft storage.",
    outcome:
      "Delivered cited brief without forcing a consumer OpenAI account; retained ShadowTalk for recurring client workflows.",
    framework: "PSOF: Problem = access + privacy · Solution = anonymous + vault · Outcome = compliant delivery · Framework = /anonymous-ai wedge",
    ctaHref: "/anonymous-ai",
  },
  {
    id: "multilingual-support",
    title: "Urdu + English support docs for a regional team",
    persona: "Operations lead, Karachi",
    problem:
      "Team needed AI drafts in Urdu and English; mainstream tools defaulted to English-only UX and inconsistent tone.",
    solution:
      "ShadowTalk language switcher (ur + en) plus multilingual chat for SOP drafts and customer reply templates.",
    outcome:
      "Faster bilingual doc turnaround; team stayed on free tier for drafting, Premium for higher volume.",
    framework: "PSOF: Problem = language gap · Solution = 11-locale workspace · Outcome = bilingual ops · Framework = /multilingual-ai",
    ctaHref: "/multilingual-ai",
  },
];
