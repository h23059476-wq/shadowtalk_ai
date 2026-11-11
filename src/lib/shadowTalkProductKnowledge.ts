/**
 * Client-side ShadowTalk self-knowledge (summary).
 * Full authoritative text lives in backend/functions/_shared/shadowTalkProductKnowledge.ts
 */

import { FOUNDER_KNOWLEDGE_BRIEF, isFounderEmail } from "@/lib/founderKnowledge";

export const SHADOWTALK_SELF_KNOWLEDGE_BRIEF = `**ShadowTalk AI** (created by **Zain Ahmed**) is an end-to-end encrypted **autonomous** AI workspace — it learns from every chat, runs multi-step missions in-thread (S.E.E.), extracts memories, and proactively surfaces stale work and insights. 20+ chat modes, real tools (web search, deep research, image gen, scrape, security audit, presentations), and apps: Shadow Execution, Strategy Agent, Stealth Vault, Knowledge Graph, Shadow Browser, ShadowTalk Live, Content Forge, Analytics, and more.

**Access:** Free to use — no subscriptions and no paid tiers. Bring your own AI provider API key; your provider may charge separately for API usage. See /pricing.

**Founder:** ${FOUNDER_KNOWLEDGE_BRIEF}

**ShadowTalk Live:** Real-time voice mode — say "open live mode" or tap the mic in the composer.

**Ask in chat:** "what tools do you have?" · "open live mode" · "open execute" · "search for …" · "research …" · "generate an image of …"

**Docs:** /docs · **Help:** /faq · **About Zain:** /about`;

/** Injects product + founder knowledge for local/offline chat paths (cloud chat uses edge function). */
export function prependChatKnowledgeContext<T extends { role: string; content: unknown }>(
  messages: T[],
  userEmail?: string | null,
  userFullName?: string | null,
): T[] {

  const isFounder =
    isFounderEmail(userEmail) ||
    (userFullName && /zain\s*ahmed/i.test(userFullName));

  const parts = [
    `## ShadowTalk product knowledge\n${SHADOWTALK_SELF_KNOWLEDGE_BRIEF}`,
    `## Founder biography\n${FOUNDER_KNOWLEDGE_BRIEF}`,
    isFounder
      ? "The current user is Zain Ahmed, founder and CEO. Address them as the creator. Answer questions about them with full detail."
      : "",
  ].filter(Boolean);

  const withoutSystem = messages.filter((m) => m.role !== "system");
  return [{ role: "system", content: parts.join("\n\n") } as unknown as T, ...withoutSystem];
}
