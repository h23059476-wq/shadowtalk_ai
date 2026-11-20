/**
 * First-party analytics unit tests — identity, offline queue, aggregation
 * math and funnel computation. All storage is injected (no localStorage
 * dependency) and Firestore is module-mocked; the rules themselves are
 * covered by firestore.rules.test.ts against the emulator.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Firestore is never actually touched — ingest.ts only needs the module to
// resolve for its imports. Pure functions under test don't call it.
vi.mock("@/lib/firebase", () => ({ db: {}, app: {}, trackEvent: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn((n: number) => ({ __increment: n })),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

import {
  __injectStoresForTests,
  computeReturnFlags,
  ensureSession,
  getClientId,
  getOrCreateFirstTouch,
  localDayKey,
  resetAnalyticsIdentity,
  SESSION_TIMEOUT_MS,
  type KVStore,
} from "../identity";
import { aggregateEvents, enqueueEvent, flushAnalyticsQueue, queueSize, clearQueue, __pathForTests, type QueuedEvent } from "../ingest";
import {
  computeCohortRates,
  computeFunnel,
  dayKeyFromTs,
  mergeAttribTop,
  sumDailyDocs,
  type AttribDocData,
  type ClientDocData,
  type DailyDocData,
} from "@/components/admin/intelligence/trafficService";

function makeMemoryStore(): KVStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const NOW = 1_800_000_000_000; // fixed "today" for deterministic assertions
const DAY = 24 * 60 * 60 * 1000;

let localStore: ReturnType<typeof makeMemoryStore>;
let sessionStore: ReturnType<typeof makeMemoryStore>;

beforeEach(() => {
  localStore = makeMemoryStore();
  sessionStore = makeMemoryStore();
  __injectStoresForTests(localStore, sessionStore);
  clearQueue();
});

afterEach(() => {
  __injectStoresForTests(null, null);
  vi.restoreAllMocks();
});

describe("identity — anonymous client id", () => {
  it("generates a client id once and persists it across calls", () => {
    const first = getClientId();
    const second = getClientId();
    expect(first).toBe(second);
    expect(localStore.map.get("st_analytics_client_id_v1")).toBe(first);
  });

  it("resetAnalyticsIdentity wipes id + attribution so a new one is generated", () => {
    const first = getClientId();
    getOrCreateFirstTouch(NOW);
    resetAnalyticsIdentity();
    expect(localStore.map.has("st_analytics_client_id_v1")).toBe(false);
    expect(localStore.map.has("st_analytics_first_touch_v1")).toBe(false);
    const second = getClientId();
    expect(second).not.toBe(first);
  });
});

describe("identity — 30-minute sessions", () => {
  it("opens a session once and keeps it within the inactivity window", () => {
    const first = ensureSession(NOW);
    expect(first.isNewVisit).toBe(true);
    const second = ensureSession(NOW + 5 * 60 * 1000);
    expect(second.isNewVisit).toBe(false);
    expect(second.sessionId).toBe(first.sessionId);
  });

  it("opens a NEW visit after 30 minutes of inactivity", () => {
    const first = ensureSession(NOW);
    const later = ensureSession(NOW + SESSION_TIMEOUT_MS + 1000);
    expect(later.isNewVisit).toBe(true);
    expect(later.sessionId).not.toBe(first.sessionId);
  });
});

describe("identity — first-touch attribution", () => {
  it("captures the landing path and persists first touch once", () => {
    const touch = getOrCreateFirstTouch(NOW);
    expect(touch.firstSeen).toBe(NOW);
    expect(touch.landingPath).toBe("/"); // no location in test env → root
    // A later call must NOT move firstSeen (first-write-wins semantics).
    const again = getOrCreateFirstTouch(NOW + 10 * DAY);
    expect(again.firstSeen).toBe(NOW);
  });
});

describe("identity — return flags", () => {
  it("flips d1/d7/d30 when the browser returns inside each window", () => {
    const firstSeen = NOW;
    // Same-visit day 0: nothing yet.
    expect(computeReturnFlags({}, firstSeen, NOW + 1000).returned_d1).toBeUndefined();
    // Day 1 (±6h grace).
    expect(computeReturnFlags({}, firstSeen, firstSeen + 1 * DAY).returned_d1).toBe(true);
    // Day 7.
    expect(computeReturnFlags({}, firstSeen, firstSeen + 7 * DAY).returned_d7).toBe(true);
    // Day 30.
    expect(computeReturnFlags({}, firstSeen, firstSeen + 30 * DAY).returned_d30).toBe(true);
  });

  it("keeps flags sticky once true", () => {
    const firstSeen = NOW;
    const afterD1 = computeReturnFlags({}, firstSeen, firstSeen + 1 * DAY);
    const muchLater = computeReturnFlags(afterD1, firstSeen, firstSeen + 20 * DAY);
    expect(muchLater.returned_d1).toBe(true);
    expect(muchLater.returned_d7).toBeUndefined();
  });
});

describe("identity — localDayKey", () => {
  it("formats the local calendar day as YYYY-MM-DD", () => {
    const ts = new Date(2026, 10, 21, 13, 45).getTime(); // Nov 21 2026 local
    expect(localDayKey(ts)).toBe("2026-11-21");
  });
});

describe("ingest — offline queue", () => {
  const ev = (name: string, day = "2026-11-21", extra: Partial<QueuedEvent> = {}): QueuedEvent => ({
    id: `evt-${name}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    ts: NOW,
    day,
    session_id: "sess-1",
    ...extra,
  });

  it("enqueues and reports size; clearQueue empties it", () => {
    enqueueEvent(ev("page_viewed", "2026-11-21", { path: "/home" }));
    enqueueEvent(ev("cta_clicked"));
    expect(queueSize()).toBe(2);
    clearQueue();
    expect(queueSize()).toBe(0);
  });

  it("caps the queue at 500 events, dropping the OLDEST", () => {
    for (let i = 0; i < 520; i++) {
      enqueueEvent({ id: `evt-${i}`, name: "page_viewed", ts: NOW, day: "2026-11-21", path: `/p/${i}` });
    }
    expect(queueSize()).toBe(500);
  });
});

describe("ingest — aggregateEvents math", () => {
  it("sums counters per day and dedups one visit per session", () => {
    const byDay = aggregateEvents([
      { id: "1", name: "session_started", ts: NOW, day: "2026-11-21", session_id: "s1", params: { is_new_client: true, referrer: "news.ycombinator.com", utm_campaign: "show_hn" } },
      { id: "2", name: "page_viewed", ts: NOW, day: "2026-11-21", session_id: "s1", path: "/home" },
      { id: "3", name: "page_viewed", ts: NOW, day: "2026-11-21", session_id: "s1", path: "/pricing" },
      { id: "4", name: "chat_message_sent", ts: NOW, day: "2026-11-21", session_id: "s1" },
      { id: "5", name: "ide_preview_run", ts: NOW, day: "2026-11-21", session_id: "s1" },
      // duplicate session_started for the SAME session must not double-count a visit
      { id: "6", name: "session_started", ts: NOW, day: "2026-11-21", session_id: "s1", params: { is_new_client: true } },
      // next day bucket
      { id: "7", name: "session_started", ts: NOW + DAY, day: "2026-11-22", session_id: "s2", params: { is_new_client: false } },
    ]);

    const d1 = byDay["2026-11-21"];
    expect(d1.counters.visits).toBe(1);
    expect(d1.counters.sessions_new).toBe(1);
    expect(d1.counters.page_views).toBe(2);
    expect(d1.counters.messages).toBe(1);
    expect(d1.counters.ide_runs).toBe(1);
    expect(d1.counters.ctas).toBe(0);
    expect(d1.counters.events).toBe(6);
    expect(d1.maps.paths["/home"]).toBe(1);
    expect(d1.maps.paths["/pricing"]).toBe(1);
    expect(d1.maps.referrers["news.ycombinator.com"]).toBe(1);
    expect(d1.maps.campaigns["show_hn"]).toBe(1);

    const d2 = byDay["2026-11-22"];
    expect(d2.counters.visits).toBe(1);
    expect(d2.counters.sessions_returning).toBe(1);
    expect(d2.maps.referrers["direct"]).toBe(1); // defaulted referrer
  });

  it("exposes stable doc path conventions", () => {
    expect(__pathForTests("daily", "2026-11-21")).toBe("analytics_daily/2026-11-21");
    expect(__pathForTests("client", "x", "CLIENT")).toBe("analytics_clients/CLIENT");
    expect(__pathForTests("clientDay", "2026-11-21", "abc")).toBe("analytics_client_days/2026-11-21_abc");
    expect(__pathForTests("event", "evt-1")).toBe("analytics_events/evt-1");
  });
});

describe("ingest — flush race safety", () => {
  it("keeps events enqueued DURING an in-flight commit (regression: slice() dropped them)", async () => {
    // Rebuild the firestore mock with a controllable writeBatch for this test.
    const { writeBatch } = await import("firebase/firestore");
    const mocked = vi.mocked(writeBatch);
    let releaseCommit: (() => void) | null = null;
    const commitGate = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    const batchObj = { set: vi.fn(), commit: vi.fn(() => commitGate) };
    mocked.mockReturnValue(batchObj as never);

    const mk = (id: string, name = "page_viewed"): QueuedEvent => ({
      id,
      name,
      ts: NOW,
      day: "2026-11-21",
      session_id: "s-race",
      path: "/home",
    });

    enqueueEvent(mk("evt-a"));
    enqueueEvent(mk("evt-b"));

    const flushing = flushAnalyticsQueue(NOW);
    // Event lands while the commit is still in flight.
    enqueueEvent(mk("evt-c"));
    releaseCommit?.();
    const result = await flushing;

    expect(result.failed).toBe(false);
    expect(result.flushed).toBe(2);
    // evt-c survived — it was never part of the committed batch.
    expect(queueSize()).toBe(1);
  });
});

describe("trafficService — pure aggregation", () => {
  const docFor = (day: string, visits: number, pageViews: number, messages: number): DailyDocData => ({
    day,
    visits,
    page_views: pageViews,
    messages,
    sessions_new: 0,
    sessions_returning: 0,
    events: visits + pageViews,
    ctas: 0,
    ide_runs: 0,
  });

  it("sumDailyDocs restricts to the range and builds an ordered trend", () => {
    const now = new Date(2026, 10, 21).getTime();
    const docs = [
      docFor("2026-11-19", 5, 10, 1),
      docFor("2026-11-21", 2, 4, 2),
      docFor("2026-10-01", 100, 100, 100), // outside a 7-day range
      docFor("2026-11-20", 3, 6, 1),
    ];
    const { totals, trend, daysObserved } = sumDailyDocs(docs, 7, now);
    expect(totals.visits).toBe(10); // 5 + 2 + 3
    expect(totals.pageViews).toBe(20);
    expect(totals.messages).toBe(4);
    expect(daysObserved).toBe(3);
    expect(trend.map((t) => t.day)).toEqual(["11-19", "11-20", "11-21"]);
  });

  it("mergeAttribTop merges flat attribution docs and ranks", () => {
    const docs: AttribDocData[] = [
      { day: "2026-11-20", type: "paths", key: "/home", count: 3 },
      { day: "2026-11-20", type: "paths", key: "/ide", count: 1 },
      { day: "2026-11-21", type: "paths", key: "/home", count: 2 },
      { day: "2026-11-21", type: "paths", key: "/pricing", count: 4 },
      { day: "2026-10-01", type: "paths", key: "/old", count: 100 },
    ];
    const top = mergeAttribTop(docs, "2026-11-19", 2);
    expect(top[0]).toEqual({ label: "/home", count: 5 });
    expect(top[1]).toEqual({ label: "/pricing", count: 4 });
    // out-of-range entry excluded
    expect(top.find((t) => t.label === "/old")).toBeUndefined();
  });

  it("computeFunnel walks visit → first message → day-7 return", () => {
    const now = NOW;
    const mk = (over: Partial<ClientDocData>): ClientDocData => ({
      client_id: "c",
      first_seen: now - 10 * DAY,
      last_seen: now,
      ...over,
    });
    const clients: ClientDocData[] = [
      mk({ first_message_at: now - 9 * DAY, returned_d7: true }), // activated + retained
      mk({ first_message_at: now - 9 * DAY }), // activated only
      mk({}), // visited only
      mk({ first_seen: now - 1 * DAY, first_message_at: now }), // too young for D7 denominator
    ];
    const funnel = computeFunnel(clients, now);
    expect(funnel.stages[0]).toMatchObject({ value: 4, rate: 100 });
    expect(funnel.stages[1]).toMatchObject({ value: 3 });
    expect(funnel.stages[1].rate).toBe(75);
    // D7 denominator excludes the 1-day-old client.
    expect(funnel.d7Cohort).toBe(3);
    expect(funnel.stages[2]).toMatchObject({ value: 1 });
    expect(funnel.stages[2].rate).toBeCloseTo(33.3, 1);
  });

  it("computeCohortRates returns null for empty cohorts (no fabricated numbers)", () => {
    const now = NOW;
    const clients: ClientDocData[] = [
      { client_id: "a", first_seen: now - 8 * DAY, last_seen: now, returned_d7: true, returned_d1: true },
      { client_id: "b", first_seen: now - 8 * DAY, last_seen: now, returned_d7: false, returned_d1: false },
    ];
    const rates = computeCohortRates(clients, now);
    expect(rates.d1).toBe(50);
    expect(rates.d7).toBe(50);
    expect(rates.d30).toBeNull(); // cohort too young for D30
  });

  it("dayKeyFromTs formats like identity.localDayKey", () => {
    const ts = new Date(2026, 0, 2).getTime();
    expect(dayKeyFromTs(ts)).toBe("2026-01-02");
  });
});
