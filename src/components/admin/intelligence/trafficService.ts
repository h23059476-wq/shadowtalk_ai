/**
 * ShadowTalk Intelligence Center — Traffic & Funnel Service
 *
 * Reads the first-party analytics aggregates written by the client SDK
 * (src/lib/analytics/): analytics_daily counters, analytics_clients anonymous
 * profiles, analytics_client_days heartbeats. Zero-PII by schema — the
 * collections carry no emails, no IPs, no user agents.
 *
 * Aggregation math is exported as PURE functions (sumDailyDocs, mergeMapTop,
 * computeFunnel, computeCohortRates) so the numbers are unit-testable
 * without Firebase.
 */

import { collection, getDocs, limit as fsLimit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyDocData {
  day: string;
  visits: number;
  page_views: number;
  messages: number;
  sessions_new: number;
  sessions_returning: number;
  events: number;
  ctas: number;
  ide_runs: number;
}

/** One flat attribution counter: analytics_attrib/{day}__{type}__{key}. */
export interface AttribDocData {
  day: string;
  type: "paths" | "referrers" | "campaigns";
  key: string;
  count: number;
}

export interface ClientDocData {
  client_id: string;
  first_seen: number;
  last_seen: number;
  first_path?: string;
  first_referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  returned_d1?: boolean;
  returned_d7?: boolean;
  returned_d30?: boolean;
  first_message_at?: number;
  message_count?: number;
}

export interface TrafficKpis {
  visits: number;
  pageViews: number;
  messages: number;
  events: number;
  ctas: number;
  newClients: number;
  returningSessions: number;
  activationRate: number | null;
}

export interface FunnelStage {
  label: string;
  value: number;
  /** percentage of the first stage, null when the base is zero */
  rate: number | null;
}

export interface FunnelResult {
  stages: FunnelStage[];
  /** clients eligible for the D7 window (first_seen at least 7 days ago) */
  d7Cohort: number;
  d1Cohort: number;
}

export interface TrafficSnapshot {
  kpis: TrafficKpis;
  trend: Array<{ day: string; visits: number; pageViews: number; messages: number }>;
  funnel: FunnelResult;
  cohortRates: { d1: number | null; d7: number | null; d30: number | null };
  topPages: Array<{ label: string; count: number }>;
  referrers: Array<{ label: string; count: number }>;
  campaigns: Array<{ label: string; count: number }>;
  totalDaysObserved: number;
}

// ---------------------------------------------------------------------------
// PURE aggregation math (unit-tested)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO-ish local day key (YYYY-MM-DD) from an epoch ms value. */
export function dayKeyFromTs(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Sums daily docs restricted to the last `rangeDays` days (inclusive of
 * today). String comparison is safe because both keys are YYYY-MM-DD.
 */
export function sumDailyDocs(
  docs: DailyDocData[],
  rangeDays: number,
  now: number = Date.now(),
): { totals: TrafficKpis; trend: Array<{ day: string; visits: number; pageViews: number; messages: number }>; daysObserved: number } {
  const cutoff = dayKeyFromTs(now - (rangeDays - 1) * DAY_MS);
  const inRange = docs.filter((d) => d.day >= cutoff);

  const totals: TrafficKpis = {
    visits: 0,
    pageViews: 0,
    messages: 0,
    events: 0,
    ctas: 0,
    newClients: 0,
    returningSessions: 0,
    activationRate: null,
  };
  for (const d of inRange) {
    totals.visits += d.visits || 0;
    totals.pageViews += d.page_views || 0;
    totals.messages += d.messages || 0;
    totals.events += d.events || 0;
    totals.ctas += d.ctas || 0;
    totals.newClients += d.sessions_new || 0;
    totals.returningSessions += d.sessions_returning || 0;
  }

  const trend = inRange
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({ day: d.day.slice(5), visits: d.visits || 0, pageViews: d.page_views || 0, messages: d.messages || 0 }));

  return { totals, trend, daysObserved: inRange.length };
}

/**
 * Merges flat attribution docs (analytics_attrib) into the top N entries.
 * `cutoffDay` filters out entries older than the selected range.
 */
export function mergeAttribTop(
  docs: AttribDocData[],
  cutoffDay: string,
  n: number,
): Array<{ label: string; count: number }> {
  const merged = new Map<string, number>();
  for (const d of docs) {
    if (!d.day || d.day < cutoffDay) continue;
    merged.set(d.key, (merged.get(d.key) || 0) + (d.count || 0));
  }
  return Array.from(merged.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Classic acquisition funnel over a client cohort (clients whose first_seen
 * falls inside the range):
 *   Visits (cohort size) → Sent a first message (activation) → Returned on day 7.
 * D7 only counts clients that have been alive long enough to possibly return
 * (first_seen ≤ now − 7d); younger clients are excluded from the denominator
 * instead of being silently counted as churned.
 */
export function computeFunnel(clients: ClientDocData[], now: number = Date.now()): FunnelResult {
  const cohort = clients;
  const activated = cohort.filter((c) => typeof c.first_message_at === "number").length;

  const d1Eligible = cohort.filter((c) => now - c.first_seen >= 1 * DAY_MS - 6 * 60 * 60 * 1000);
  const d1Returned = d1Eligible.filter((c) => c.returned_d1 === true).length;

  const d7Eligible = cohort.filter((c) => now - c.first_seen >= 7 * DAY_MS - 6 * 60 * 60 * 1000);
  const d7Returned = d7Eligible.filter((c) => c.returned_d7 === true).length;

  const base = cohort.length;
  const pct = (v: number, b: number) => (b > 0 ? Math.round((v / b) * 1000) / 10 : null);

  return {
    stages: [
      { label: "Visits (first touch)", value: base, rate: 100 },
      { label: "Sent a first message", value: activated, rate: pct(activated, base) },
      { label: "Returned on day 7", value: d7Returned, rate: pct(d7Returned, d7Eligible.length) },
    ],
    d7Cohort: d7Eligible.length,
    d1Cohort: d1Eligible.length,
  };
}

/** D1/D7/D30 retention table over eligible cohorts (for the summary chips). */
export function computeCohortRates(clients: ClientDocData[], now: number = Date.now()): { d1: number | null; d7: number | null; d30: number | null } {
  const rate = (flag: "returned_d1" | "returned_d7" | "returned_d30", days: number) => {
    const eligible = clients.filter((c) => now - c.first_seen >= days * DAY_MS - 6 * 60 * 60 * 1000);
    if (eligible.length === 0) return null;
    const returned = eligible.filter((c) => c[flag] === true).length;
    return Math.round((returned / eligible.length) * 1000) / 10;
  };
  return { d1: rate("returned_d1", 1), d7: rate("returned_d7", 7), d30: rate("returned_d30", 30) };
}

// ---------------------------------------------------------------------------
// Firestore reads (admin-gated by the rules: analytics_* are admin-read)
// ---------------------------------------------------------------------------

const MAX_DAILY_DOCS = 400;
const MAX_CLIENT_DOCS = 2000;
const MAX_ATTRIB_DOCS = 300;

/** Epoch cutoff for the client cohort query. */
function cutoffTs(rangeDays: number, now: number): number {
  return now - rangeDays * DAY_MS;
}

export async function fetchTrafficSnapshot(rangeDays: number, now: number = Date.now()): Promise<TrafficSnapshot> {
  // Daily counter docs: small collection, safe to pull and filter locally
  // (doc ids are dates; a range query on documentId needs cursors — not worth it).
  const dailySnap = await getDocs(query(collection(db, "analytics_daily"), fsLimit(MAX_DAILY_DOCS)));
  const daily: DailyDocData[] = dailySnap.docs.map((d) => ({ ...(d.data() as DailyDocData), day: d.id }));

  // Client cohort: everyone whose first touch falls inside the range.
  const clientsSnap = await getDocs(
    query(
      collection(db, "analytics_clients"),
      where("first_seen", ">=", cutoffTs(rangeDays, now)),
      fsLimit(MAX_CLIENT_DOCS),
    ),
  );
  const clients: ClientDocData[] = clientsSnap.docs.map((d) => d.data() as ClientDocData);

  // Flat attribution: one query per type (single-field index, no composite
  // needed); the day cutoff is applied client-side in mergeAttribTop.
  const cutoffDay = dayKeyFromTs(now - (rangeDays - 1) * DAY_MS);
  const fetchAttrib = async (type: "paths" | "referrers" | "campaigns"): Promise<AttribDocData[]> => {
    const snap = await getDocs(query(collection(db, "analytics_attrib"), where("type", "==", type), fsLimit(MAX_ATTRIB_DOCS)));
    return snap.docs.map((d) => d.data() as AttribDocData);
  };
  const [pathDocs, referrerDocs, campaignDocs] = await Promise.all([fetchAttrib("paths"), fetchAttrib("referrers"), fetchAttrib("campaigns")]);

  const { totals, trend, daysObserved } = sumDailyDocs(daily, rangeDays, now);
  const cohortClients = clients;
  const funnel = computeFunnel(cohortClients, now);
  const rates = computeCohortRates(cohortClients, now);

  const activated = cohortClients.filter((c) => typeof c.first_message_at === "number").length;
  totals.activationRate = cohortClients.length > 0 ? Math.round((activated / cohortClients.length) * 1000) / 10 : null;
  totals.newClients = cohortClients.length;

  return {
    kpis: totals,
    trend,
    funnel: {
      stages: funnel.stages,
      d7Cohort: funnel.d7Cohort,
      d1Cohort: funnel.d1Cohort,
    },
    cohortRates: rates,
    topPages: mergeAttribTop(pathDocs, cutoffDay, 8),
    referrers: mergeAttribTop(referrerDocs, cutoffDay, 8),
    campaigns: mergeAttribTop(campaignDocs, cutoffDay, 8),
    totalDaysObserved: daysObserved,
  };
}
