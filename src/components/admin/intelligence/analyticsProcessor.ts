/**
 * Pure analytics processing functions — extracted for unit testing.
 */
import { Timestamp } from "firebase/firestore";

export interface ProcessedRecord { inRange: boolean; outOfRange: boolean; malformed: boolean; ts: number | null; }
export interface DocumentData { created_at?: unknown; user_id?: string; action_type?: string; feature_used?: string; tokens_used?: unknown; }

export function classifyTimestamp(createdAt: unknown): { ts: number | null; malformed: boolean } {
  if (createdAt instanceof Timestamp) return { ts: createdAt.toMillis(), malformed: false };
  if (typeof createdAt === "number" && createdAt > 0) return { ts: createdAt, malformed: false };
  return { ts: null, malformed: true };
}

export function processDocument(data: DocumentData, since: number): ProcessedRecord {
  const { ts, malformed } = classifyTimestamp(data.created_at);
  if (malformed) return { inRange: false, outOfRange: false, malformed: true, ts: null };
  if (ts !== null && ts < since) return { inRange: false, outOfRange: true, malformed: false, ts };
  return { inRange: true, outOfRange: false, malformed: false, ts };
}

export function processBatch(docs: DocumentData[], since: number) {
  const uniqueUsers = new Set<string>();
  const actionTypeBreakdown = new Map<string, number>();
  const featureUsedBreakdown = new Map<string, number>();
  let inRangeCount = 0, outOfRangeCount = 0, malformedCount = 0, tokensUsedTotal = 0;
  const recentEvents: Array<{ timestamp: string; action_type: string; feature_used: string; tokens_used: number; }> = [];

  for (const data of docs) {
    const result = processDocument(data, since);
    if (result.malformed) { malformedCount++; continue; }
    if (result.outOfRange) { outOfRangeCount++; continue; }
    inRangeCount++;
    const userId = data.user_id; if (userId) uniqueUsers.add(userId);
    const actionType = data.action_type || "unknown"; actionTypeBreakdown.set(actionType, (actionTypeBreakdown.get(actionType) || 0) + 1);
    const featureUsed = data.feature_used || "unknown"; featureUsedBreakdown.set(featureUsed, (featureUsedBreakdown.get(featureUsed) || 0) + 1);
    const tokensUsed = typeof data.tokens_used === "number" ? data.tokens_used : 0; tokensUsedTotal += tokensUsed;
    if (recentEvents.length < 20) recentEvents.push({ timestamp: result.ts !== null ? new Date(result.ts).toISOString() : "Unknown", action_type: actionType, feature_used: featureUsed, tokens_used: tokensUsed });
  }
  return { inRangeCount, outOfRangeCount, malformedCount, uniqueUsers, actionTypeBreakdown, featureUsedBreakdown, tokensUsedTotal, recentEvents };
}

export function mergeBatchResults(batches: ReturnType<typeof processBatch>[]) {
  const uniqueUsers = new Set<string>(); const actionTypeBreakdown = new Map<string, number>(); const featureUsedBreakdown = new Map<string, number>();
  let inRangeCount = 0, outOfRangeCount = 0, malformedCount = 0, tokensUsedTotal = 0;
  const recentEvents: Array<{ timestamp: string; action_type: string; feature_used: string; tokens_used: number; }> = [];
  for (const batch of batches) {
    inRangeCount += batch.inRangeCount; outOfRangeCount += batch.outOfRangeCount; malformedCount += batch.malformedCount; tokensUsedTotal += batch.tokensUsedTotal;
    batch.uniqueUsers.forEach((u) => uniqueUsers.add(u));
    batch.actionTypeBreakdown.forEach((v, k) => actionTypeBreakdown.set(k, (actionTypeBreakdown.get(k) || 0) + v));
    batch.featureUsedBreakdown.forEach((v, k) => featureUsedBreakdown.set(k, (featureUsedBreakdown.get(k) || 0) + v));
    for (const ev of batch.recentEvents) if (recentEvents.length < 20) recentEvents.push(ev);
  }
  return { inRangeCount, outOfRangeCount, malformedCount, uniqueUsers, actionTypeBreakdown, featureUsedBreakdown, tokensUsedTotal, recentEvents };
}

export function shouldContinuePagination(batchSize: number, pageSize: number): boolean { return batchSize >= pageSize; }
export function isAtDocumentCap(documentsScanned: number, maxPages: number, pageSize: number): boolean { return documentsScanned >= maxPages * pageSize; }
