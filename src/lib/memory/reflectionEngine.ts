/**
 * Memory reflection engine.
 *
 * STATUS: STUB. `shouldReflect()` always returns false and
 * `reflectOnConversation()` always returns []. The "Proactive Context
 * Engine (PCE)" feature advertised in pre-free-access-transition
 * marketing materials depends on this module and is therefore not
 * functional. See docs/audit/CLAIMS_REALITY_REPORT.md P0-8b.
 *
 * When a real reflection implementation is wired (e.g. periodic LLM
 * summarization of accumulated episodic memory), replace these stubs.
 */

export type MemoryReflection = {
  category: "preference" | "skill" | "context";
  key: string;
  value: unknown;
  confidence?: number;
};

export function shouldReflect(_messageCount: number): boolean {
  // STUB — reflection is not yet implemented.
  return false;
}

export async function reflectOnConversation(
  _conversation: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<MemoryReflection[] | null> {
  // STUB — reflection is not yet implemented.
  return [];
}
