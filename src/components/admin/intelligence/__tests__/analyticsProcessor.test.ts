import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { classifyTimestamp, processDocument, processBatch, mergeBatchResults, shouldContinuePagination, isAtDocumentCap, type DocumentData } from "../analyticsProcessor";

describe("classifyTimestamp", () => {
  it("Firestore Timestamp valid", () => { const r = classifyTimestamp(Timestamp.fromMillis(1700000000000)); expect(r.malformed).toBe(false); expect(r.ts).toBe(1700000000000); });
  it("positive number valid", () => { expect(classifyTimestamp(1700000000000).malformed).toBe(false); });
  it("null malformed", () => { expect(classifyTimestamp(null).malformed).toBe(true); });
  it("undefined malformed", () => { expect(classifyTimestamp(undefined).malformed).toBe(true); });
  it("string malformed", () => { expect(classifyTimestamp("2024").malformed).toBe(true); });
  it("boolean malformed", () => { expect(classifyTimestamp(true).malformed).toBe(true); });
  it("negative malformed", () => { expect(classifyTimestamp(-1).malformed).toBe(true); });
  it("zero malformed", () => { expect(classifyTimestamp(0).malformed).toBe(true); });
  it("object malformed", () => { expect(classifyTimestamp({seconds:1}).malformed).toBe(true); });
});

describe("processDocument", () => {
  const now = 1700000000000, hourAgo = now - 3600000, dayAgo = now - 86400000;
  it("in-range Timestamp", () => { expect(processDocument({created_at: Timestamp.fromMillis(now)}, hourAgo).inRange).toBe(true); });
  it("out-of-range Timestamp", () => { expect(processDocument({created_at: Timestamp.fromMillis(dayAgo)}, hourAgo).outOfRange).toBe(true); });
  it("in-range number", () => { expect(processDocument({created_at: now}, hourAgo).inRange).toBe(true); });
  it("out-of-range number", () => { expect(processDocument({created_at: dayAgo}, hourAgo).outOfRange).toBe(true); });
  it("null malformed", () => { expect(processDocument({created_at: null}, hourAgo).malformed).toBe(true); });
  it("string malformed", () => { expect(processDocument({created_at: "x"}, hourAgo).malformed).toBe(true); });
  it("missing field malformed", () => { expect(processDocument({}, hourAgo).malformed).toBe(true); });
  it("zero malformed", () => { expect(processDocument({created_at: 0}, hourAgo).malformed).toBe(true); });
});

describe("processBatch", () => {
  const now = 1700000000000, hourAgo = now - 3600000, dayAgo = now - 86400000;
  it("counts only in-range", () => { const r = processBatch([{created_at:Timestamp.fromMillis(now),user_id:"u1"},{created_at:Timestamp.fromMillis(dayAgo),user_id:"u2"},{created_at:null,user_id:"u3"}], hourAgo); expect(r.inRangeCount).toBe(1); expect(r.outOfRangeCount).toBe(1); expect(r.malformedCount).toBe(1); });
  it("uniqueUsers in-range only", () => { const r = processBatch([{created_at:Timestamp.fromMillis(now),user_id:"in"},{created_at:Timestamp.fromMillis(dayAgo),user_id:"out"},{created_at:null,user_id:"bad"}], hourAgo); expect(r.uniqueUsers.has("in")).toBe(true); expect(r.uniqueUsers.has("out")).toBe(false); expect(r.uniqueUsers.size).toBe(1); });
  it("no malformed in metrics", () => { const r = processBatch([{created_at:null,user_id:"u1",tokens_used:999},{created_at:"bad",user_id:"u2",tokens_used:888},{created_at:0,user_id:"u3",tokens_used:777}], hourAgo); expect(r.inRangeCount).toBe(0); expect(r.malformedCount).toBe(3); expect(r.tokensUsedTotal).toBe(0); });
  it("empty batch", () => { const r = processBatch([], hourAgo); expect(r.inRangeCount).toBe(0); });
  it("limits recentEvents to 20", () => { const docs: DocumentData[] = []; for(let i=0;i<30;i++) docs.push({created_at:Timestamp.fromMillis(now+i),user_id:`u${i}`}); expect(processBatch(docs, hourAgo).recentEvents.length).toBe(20); });
});

describe("mergeBatchResults", () => {
  const now = 1700000000000, hourAgo = now - 3600000;
  it("merges counts", () => { const m = mergeBatchResults([processBatch([{created_at:Timestamp.fromMillis(now),user_id:"u1"}],hourAgo),processBatch([{created_at:Timestamp.fromMillis(now+1),user_id:"u2"}],hourAgo)]); expect(m.inRangeCount).toBe(2); });
  it("deduplicates users", () => { const m = mergeBatchResults([processBatch([{created_at:Timestamp.fromMillis(now),user_id:"same"}],hourAgo),processBatch([{created_at:Timestamp.fromMillis(now+1),user_id:"same"}],hourAgo)]); expect(m.uniqueUsers.size).toBe(1); });
});

describe("pagination", () => {
  it("continue on full page", () => { expect(shouldContinuePagination(1000,1000)).toBe(true); });
  it("stop on partial page", () => { expect(shouldContinuePagination(500,1000)).toBe(false); });
  it("at cap", () => { expect(isAtDocumentCap(5000,5,1000)).toBe(true); });
  it("under cap", () => { expect(isAtDocumentCap(4999,5,1000)).toBe(false); });
  it("mixed types no skip", () => { const r = processBatch([{created_at:"str",user_id:"s"},{created_at:1700000000000,user_id:"n"},{created_at:Timestamp.fromMillis(1700000000000),user_id:"t"},{created_at:null,user_id:"null"}], 1700000000000-3600000); expect(r.inRangeCount).toBe(2); expect(r.malformedCount).toBe(2); });
  it("no premature stop on out-of-range", () => { const p1 = processBatch(Array.from({length:1000},(_,i)=>({created_at:Timestamp.fromMillis(1700000000000-86400000-i*1000),user_id:`o${i}`})),1700000000000-3600000); const p2 = processBatch(Array.from({length:100},(_,i)=>({created_at:1700000000000+i*1000,user_id:`i${i}`})),1700000000000-3600000); const m = mergeBatchResults([p1,p2]); expect(m.outOfRangeCount).toBe(1000); expect(m.inRangeCount).toBe(100); });
  it("truncation at cap", () => { const pages:DocumentData[][]=[]; for(let p=0;p<5;p++){const page:DocumentData[]=[]; for(let i=0;i<1000;i++) page.push({created_at:Timestamp.fromMillis(1700000000000+p*1000+i),user_id:`u${p}${i}`}); pages.push(page);} const results=pages.map(p=>processBatch(p,1700000000000-3600000)); const m=mergeBatchResults(results); expect(m.inRangeCount).toBe(5000); expect(isAtDocumentCap(5000,5,1000)).toBe(true); });
});

describe("serverTimestamp format", () => {
  it("Timestamp valid", () => { expect(classifyTimestamp(Timestamp.fromMillis(1700000000000)).malformed).toBe(false); });
  it("Timestamp millisecond range", () => { expect(classifyTimestamp(Timestamp.fromMillis(1700000000000)).ts!).toBeGreaterThan(1e12); });
  it("mixed Timestamp + numeric", () => { const r = processBatch([{created_at:1700000000000,user_id:"n"},{created_at:Timestamp.fromMillis(1700000000000),user_id:"t"}],1700000000000-3600000); expect(r.inRangeCount).toBe(2); });
});
