/**
 * MCP Tool: answer_faq
 * Search ShadowTalk AI's published FAQ and return matching answers.
 */
import { FAQS } from "../data";
import type { McpTool } from "../index";

const tool: McpTool = {
  name: "answer_faq",
  title: "Answer FAQ",
  description:
    "Search ShadowTalk AI's published FAQ (pricing, accounts, privacy, offline use, supported platforms) and return matching answers.",
  inputSchema: {
    question: { type: "string", optional: true, description: "The question to look up. Omit to return every FAQ entry." },
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ question }) => {
    const q = question?.trim().toLowerCase();
    const words = q ? q.split(/\W+/).filter((w: string) => w.length > 3) : [];

    const scored = FAQS.map((faq: any) => {
      const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
      const score = words.filter((w: string) => haystack.includes(w)).length;
      return { faq, score };
    });

    const hits = words.length
      ? scored.filter((s: any) => s.score > 0).sort((a: any, b: any) => b.score - a.score).map((s: any) => s.faq)
      : FAQS;

    const results = hits.length > 0 ? hits : FAQS;
    const text = results.map((faq: any) => `**${faq.question}**\n${faq.answer}`).join("\n\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: { faqs: results, matched: hits.length > 0 && words.length > 0 },
    };
  },
};

export default tool;
