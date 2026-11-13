/**
 * Intelligent Workspace Batch 1 — compaction block persistence.
 *
 * Compaction summaries must be stored SEPARATELY from the conversation with
 * traceability to their source messages (the original conversation is never
 * mutated or overwritten). Blocks live in the user-owned Firestore collection
 * `conversation_compactions` (added to the `isUserDataCollection()` whitelist
 * with the same `user_id == request.auth.uid` strength as messages).
 */

import { backend } from "@/integrations/local/client";
import type { CompactionBlock } from "@/lib/tokenOptimizer/compaction";

export interface StoredCompactionRow {
  id?: string;
  block_id: string;
  kind: string;
  summary: string;
  source_message_ids: string;
  source_count: number;
  created_at: string;
}

/** Persist compaction blocks for a conversation. Fire-and-forget friendly. */
export async function saveCompactionBlocks(
  userId: string,
  conversationId: string,
  blocks: CompactionBlock[],
): Promise<void> {
  for (const block of blocks) {
    const { error } = await backend
      .from("conversation_compactions")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        block_id: block.id,
        kind: block.kind,
        summary: block.summary,
        source_message_ids: JSON.stringify(block.sourceMessageIds),
        source_count: block.sourceCount,
        created_at: block.createdAt,
      })
      .select()
      .single();
    if (error) {
      console.error("[tokenOptimizer] compaction block insert failed:", error?.message || error);
    }
  }
}

/**
 * Load persisted compaction blocks (for inspection/recovery UI). Malformed
 * rows are skipped — a bad row must never break conversation loading.
 */
export async function loadCompactionBlocks(
  userId: string,
  conversationId: string,
): Promise<CompactionBlock[]> {
  const { data, error } = await backend
    .from("conversation_compactions")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId);
  if (error || !Array.isArray(data)) return [];
  const blocks: CompactionBlock[] = [];
  for (const row of data as StoredCompactionRow[]) {
    if (!row?.block_id || typeof row.summary !== "string") continue;
    let sourceIds: string[] = [];
    try {
      const parsed = JSON.parse(row.source_message_ids);
      if (Array.isArray(parsed)) sourceIds = parsed.filter((id) => typeof id === "string");
    } catch {
      /* keep empty */
    }
    blocks.push({
      id: row.block_id,
      kind: "extractive",
      summary: row.summary,
      summaryTokens: Math.ceil(row.summary.length / 4),
      sourceMessageIds: sourceIds,
      sourceCount: typeof row.source_count === "number" ? row.source_count : sourceIds.length,
      createdAt: row.created_at || new Date().toISOString(),
    });
  }
  return blocks;
}
