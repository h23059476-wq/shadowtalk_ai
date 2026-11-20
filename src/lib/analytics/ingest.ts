/**
 * ShadowTalk Analytics — Offline-first Event Ingestion
 *
 * The queue lives in localStorage. Flushes are BATCHED into a single Firestore
 * writeBatch per drain, which fans out to exactly three write targets:
 *
 *   1. analytics_events/{autoId}      — raw event (real-time feed, capped reads)
 *   2. analytics_daily/{YYYY-MM-DD}   — atomic counter increments (dashboards)
 *   3. analytics_clients/{clientId}   — one anonymous profile: first-touch,
 *                                       last-seen, activation + retention flags
 *   3b. analytics_client_days/{day}_{clientId} — one heartbeat doc per active
 *                                       client per day (DAU counting)
 *
 * Offline = queue grows (capped), flush retries later. This is the same
 * promise the product makes: works in airplane mode, syncs when you're back.
 *
 * Privacy: payloads carry client_id (random UUID), session_id, path, referrer
 * host and event params only. No IP, no UA string, no PII.
 */

import {
  collection,
  doc,
  writeBatch,
  increment as fbIncrement,
  type FieldValue,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getClientId,
  getOrCreateFirstTouch,
  updateReturnFlags,
  localDayKey,
  touchSession,
} from "./identity";

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

const QUEUE_KEY = "st_analytics_queue_v1";
/** Hard cap: drop oldest beyond this (a full offline week still fits). */
export const QUEUE_LIMIT = 500;

export interface QueuedEvent {
  /** client-generated unique id — also used as the analytics_events doc id */
  id: string;
  name: string;
  ts: number;
  /** local YYYY-MM-DD bucket */
  day: string;
  path?: string;
  session_id?: string;
  client_id?: string;
  params?: Record<string, unknown>;
}

function readQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-QUEUE_LIMIT)));
  } catch {
    /* storage full/privacy mode — analytics silently off, app unaffected */
  }
}

export function enqueueEvent(event: QueuedEvent): void {
  const queue = readQueue();
  queue.push(event);
  writeQueue(queue.length > QUEUE_LIMIT ? queue.slice(queue.length - QUEUE_LIMIT) : queue);
}

export function queueSize(): number {
  return readQueue().length;
}

export function clearQueue(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(QUEUE_KEY);
    } catch {
      /* noop */
    }
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Daily counter aggregation — pure function (unit-tested)
// ---------------------------------------------------------------------------

export interface DailyCounterDelta {
  visits: number;
  page_views: number;
  messages: number;
  sessions_new: number;
  sessions_returning: number;
  events: number;
  ctas: number;
  ide_runs: number;
}

export type DailyMaps = {
  paths: Record<string, number>;
  referrers: Record<string, number>;
  campaigns: Record<string, number>;
};

const MESSAGE_EVENTS = new Set(["chat_message_sent"]);
const CTA_EVENTS = new Set(["cta_clicked"]);
const IDE_EVENTS = new Set(["ide_preview_run", "ide_code_run", "ide_agent_run", "ide_agent_apply", "ide_export_zip"]);

/**
 * Aggregates queued events into per-day counter deltas and attribution maps.
 * Pure — no Firebase, no DOM. One entry per day bucket.
 */
export function aggregateEvents(events: QueuedEvent[]): Record<string, { counters: DailyCounterDelta; maps: DailyMaps }> {
  const byDay: Record<string, { counters: DailyCounterDelta; maps: DailyMaps }> = {};
  const seenVisits = new Set<string>();
  const seenSessions = new Set<string>();

  for (const ev of events) {
    const day = ev.day;
    if (!byDay[day]) {
      byDay[day] = {
        counters: { visits: 0, page_views: 0, messages: 0, sessions_new: 0, sessions_returning: 0, events: 0, ctas: 0, ide_runs: 0 },
        maps: { paths: {}, referrers: {}, campaigns: {} },
      };
    }
    const bucket = byDay[day];
    bucket.counters.events += 1;

    // A visit = one session_started per session id (dedup across re-enqueues).
    if (ev.name === "session_started" && ev.session_id && !seenVisits.has(ev.session_id)) {
      seenVisits.add(ev.session_id);
      bucket.counters.visits += 1;
      const params = ev.params || {};
      if (params.is_new_client === true) bucket.counters.sessions_new += 1;
      else bucket.counters.sessions_returning += 1;
      const ref = typeof params.referrer === "string" ? params.referrer : "direct";
      bucket.maps.referrers[ref] = (bucket.maps.referrers[ref] || 0) + 1;
      const camp = typeof params.utm_campaign === "string" && params.utm_campaign ? params.utm_campaign : null;
      if (camp) bucket.maps.campaigns[camp] = (bucket.maps.campaigns[camp] || 0) + 1;
    }

    if (ev.name === "page_viewed" && ev.path) {
      bucket.counters.page_views += 1;
      const p = ev.path.slice(0, 120) || "/";
      bucket.maps.paths[p] = (bucket.maps.paths[p] || 0) + 1;
    }
    if (MESSAGE_EVENTS.has(ev.name)) bucket.counters.messages += 1;
    if (CTA_EVENTS.has(ev.name)) bucket.counters.ctas += 1;
    if (IDE_EVENTS.has(ev.name)) bucket.counters.ide_runs += 1;
  }

  return byDay;
}

// ---------------------------------------------------------------------------
// Flush — one writeBatch per drain
// ---------------------------------------------------------------------------

export interface FlushResult {
  flushed: number;
  failed: boolean;
}

/** Key used for the per-day client heartbeat doc. */
function clientDayId(day: string, clientId: string): string {
  return `${day}_${clientId}`;
}

/** Attach a FieldValue.increment entry to a payload object. */
function increments(payload: Record<string, unknown>, field: string, by: number): void {
  payload[field] = fbIncrement(by);
}

/**
 * Drains the queue into Firestore. On ANY failure the queue is restored
 * (events are never lost) and a later trigger retries.
 */
export async function flushAnalyticsQueue(now: number = Date.now()): Promise<FlushResult> {
  const events = readQueue();
  if (events.length === 0) return { flushed: 0, failed: false };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { flushed: 0, failed: false }; // stay queued; sync when back online
  }

  const clientId = getClientId();
  const firstTouch = getOrCreateFirstTouch(now);
  const returnFlags = updateReturnFlags(firstTouch.firstSeen, now);
  touchSession(now);

  const byDay = aggregateEvents(events);

  try {
    const batch = writeBatch(db);

    // 1. Raw events (real-time feed for the admin panels)
    for (const ev of events) {
      const payload: Record<string, unknown> = {
        event_name: ev.name,
        session_id: ev.session_id || "unknown",
        timestamp: ev.ts,
        day: ev.day,
        client_id: clientId,
      };
      if (ev.path) payload.path = ev.path;
      if (ev.params && Object.keys(ev.params).length > 0) payload.params = ev.params;
      batch.set(doc(db, "analytics_events", ev.id), payload);
    }

    // 2. Daily counters + attribution maps (atomic increments, merge-safe)
    for (const [day, agg] of Object.entries(byDay)) {
      const counters = agg.counters as unknown as Record<string, number>;
      const increments: Record<string, FieldValue> = {};
      for (const [key, value] of Object.entries(counters)) {
        increments[key] = fbIncrement(value);
      }
      const maps: Record<string, Record<string, FieldValue>> = { paths: {}, referrers: {}, campaigns: {} };
      for (const [mapName, entries] of Object.entries(agg.maps)) {
        for (const [key, value] of Object.entries(entries)) {
          maps[mapName][key] = fbIncrement(value);
        }
      }
      batch.set(
        doc(db, "analytics_daily", day),
        { ...increments, paths: maps.paths, referrers: maps.referrers, campaigns: maps.campaigns },
        { merge: true },
      );
    }

    // 3. Anonymous client profile (upsert; retention flags flip server-side too)
    const clientPayload: Record<string, unknown> = {
      client_id: clientId,
      first_seen: firstTouch.firstSeen,
      last_seen: now,
      first_path: firstTouch.landingPath,
      first_referrer: firstTouch.referrer,
      ...returnFlags,
    };
    if (firstTouch.utmSource) clientPayload.utm_source = firstTouch.utmSource;
    if (firstTouch.utmMedium) clientPayload.utm_medium = firstTouch.utmMedium;
    if (firstTouch.utmCampaign) clientPayload.utm_campaign = firstTouch.utmCampaign;
    const messageEvents = events.filter((ev) => MESSAGE_EVENTS.has(ev.name));
    if (messageEvents.length > 0) {
      // Earliest send in this drain — with the ordered offline queue this is
      // the true first message; the update rule pins it set-once server-side.
      clientPayload.first_message_at = Math.min(...messageEvents.map((ev) => ev.ts));
      increments(clientPayload, "message_count", messageEvents.length);
    }
    batch.set(doc(db, "analytics_clients", clientId), clientPayload, { merge: true });

    // 4. Daily heartbeat for DAU counting (one doc per client per day)
    batch.set(
      doc(db, "analytics_client_days", clientDayId(localDayKey(now), clientId)),
      { client_id: clientId, day: localDayKey(now), updated_at: now },
      { merge: true },
    );

    await batch.commit();

    // Success: drop the flushed events. New events enqueued during the
    // in-flight commit are preserved (writeQueue replaces, never truncates
    // newer entries beyond the cap).
    const remaining = readQueue().slice(events.length);
    writeQueue(remaining);
    return { flushed: events.length, failed: false };
  } catch (err) {
    // Never destroy data on failure — queue stays for the next trigger.
    console.warn("[analytics] flush failed; keeping queue for retry", err);
    return { flushed: 0, failed: true };
  }
}

// ---------------------------------------------------------------------------
// Flush triggers — installed once by track.ts initAnalytics()
// ---------------------------------------------------------------------------

let triggersInstalled = false;
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function installFlushTriggers(): void {
  if (triggersInstalled || typeof window === "undefined") return;
  triggersInstalled = true;

  const tryFlush = () => {
    void flushAnalyticsQueue().catch(() => {});
  };

  window.addEventListener("online", tryFlush);
  window.addEventListener("pagehide", tryFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") tryFlush();
  });
  flushTimer = setInterval(tryFlush, 20_000);
  // Flush whatever a previous session left queued as soon as we load online.
  tryFlush();
}

export function __resetFlushTriggersForTests(): void {
  triggersInstalled = false;
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
}

/** Test-only: expose the collection/doc path convention without Firebase. */
export function __pathForTests(kind: "daily" | "client" | "clientDay" | "event", key: string, clientId = "CLIENT"): string {
  switch (kind) {
    case "daily": return `analytics_daily/${key}`;
    case "client": return `analytics_clients/${clientId}`;
    case "clientDay": return `analytics_client_days/${clientDayId(key, clientId)}`;
    case "event": return `analytics_events/${key}`;
  }
}
