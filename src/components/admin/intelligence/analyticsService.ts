/**
 * ShadowTalk Intelligence Center — Firebase-backed Analytics Service
 *
 * Reads REAL data from ShadowTalk's existing `usage_analytics` Firestore collection.
 * No seed data, no fabricated values. Empty/error states are explicit.
 */

import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  Timestamp,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  IntelligenceDataset,
  TimeRange,
  ComparisonPeriod,
  TelemetryIngestEvent,
  GeneratedReport,
  MetricValue,
} from "./types";

function notAvailable(label?: string): MetricValue {
  return { current: 0, formatted: "Not available", benchmark: label };
}

function emptyMetric(value: number, suffix: string = ""): MetricValue {
  return { current: value, formatted: value === 0 ? "0" : value.toLocaleString() + suffix };
}

function createEmptyDataset(range: TimeRange, comparison: ComparisonPeriod, totalEvents: number, fetchError: string | null): IntelligenceDataset {
  const na = notAvailable();
  return {
    overview: {
      dailyActiveUsers: na, weeklyActiveUsers: na, monthlyActiveUsers: na, newUsers: na,
      totalSessions: na, activationRate: na, missionCompletionRate: na, medianTimeToFirstValueSec: na,
      userActivityTrend: [], newVsReturningTrend: [], missionCompletionTrend: [], activationFunnel: [],
      providerDistribution: [],
      recentEvents: fetchError ? [{ id: "error", timestamp: new Date().toLocaleString(), category: "security" as const, title: "Firestore query failed", severity: "critical" as const, meta: fetchError }] : [],
    },
    userIntelligence: { signupConversionRate: na, activationRate: na, returningUsersCount: na, secondMissionConversionRate: na, signupToFirstValueRate: na, userJourneyFunnel: [], returningUserTrend: [], cohortRetention: { weeks: [], rows: [] }, userSegments: [] },
    missionAnalytics: { missionsStarted: na, missionsCompleted: na, missionsFailed: na, completionPercentage: na, medianTTFVSec: na, averageTTFVSec: na, failureCategories: [], responseTypes: [], durationBuckets: [] },
    aiIntelligence: { totalRequests: emptyMetric(0), overallSuccessRate: na, averageLatencyMs: na, unknownModelCount: na, providers: [], models: [], requestsByModelChart: [], latencyTrend: [] },
    costIntelligence: { verifiedCost: notAvailable("No provider-reported cost data"), estimatedCost: notAvailable("No pricing registry configured"), unavailablePricing: na, pricingCoverageRate: na, unitCostPerMission: na, dailyCostTrend: [], breakdown: [] },
    growthIntelligence: { organicTrafficRate: na, referralTrafficRate: na, overallSignupConversion: na, activeWorkspacesCreated: na, trafficChannels: [], topLandingPages: [], signupConversionTrend: [] },
    performance: { errorRate: na, eventDeliveryFailureRate: na, medianResponseLatencyMs: na, p99ResponseLatencyMs: na, analyticsDataQualityScore: na, missionFailureTrend: [], serviceHealth: [], errorLogCategories: [] },
    privacySecurity: { consentStatusOverview: na, analyticsCollectionStatus: "ACTIVE_ZERO_PII" as const, eventValidationStatus: na, dataMinimizationScore: na, adminAccessStatus: na, consentBreakdown: [], governanceChecks: [], adminAuditLog: [] },
    reports: { savedReports: [], metricSummaries: [] },
    meta: { generatedAt: new Date().toISOString(), timeRange: range, comparison, environment: "production", zeroContentGuarantee: true, totalIngestedEvents: totalEvents },
  };
}

async function fetchUsageAnalytics(range: TimeRange): Promise<{
  data: {
    totalRequests: number; uniqueUsers: Set<string>; actionTypeBreakdown: Map<string, number>;
    featureUsedBreakdown: Map<string, number>;
    recentEvents: Array<{ id: string; timestamp: string; action_type: string; feature_used: string; tokens_used: number; }>;
    tokensUsedTotal: number; truncated: boolean; documentsScanned: number; malformedCount: number; inRangeCount: number; outOfRangeCount: number;
  } | null;
  error: string | null;
}> {
  try {
    const PAGE_SIZE = 1000; const MAX_PAGES = 5;
    const since = Date.now() - (range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : range === "30d" ? 30 * 86_400_000 : range === "90d" ? 90 * 86_400_000 : 0);
    const uniqueUsers = new Set<string>();
    const actionTypeBreakdown = new Map<string, number>();
    const featureUsedBreakdown = new Map<string, number>();
    const recentEvents: Array<{ id: string; timestamp: string; action_type: string; feature_used: string; tokens_used: number; }> = [];
    let tokensUsedTotal = 0, totalRequests = 0, documentsScanned = 0, truncated = false, malformedCount = 0, inRangeCount = 0, outOfRangeCount = 0;
    let lastVisible: DocumentSnapshot | null = null;
    let allInTimeRange = true;

    for (let page = 0; page < MAX_PAGES; page++) {
      const q = lastVisible
        ? query(collection(db, "usage_analytics"), orderBy("created_at", "desc"), startAfter(lastVisible), limit(PAGE_SIZE))
        : query(collection(db, "usage_analytics"), orderBy("created_at", "desc"), limit(PAGE_SIZE));
      const snapshot = await getDocs(q);
      if (snapshot.empty) break;
      documentsScanned += snapshot.size;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const createdAt = data.created_at;
        let ts: number | null = null; let malformedTimestamp = false;
        if (createdAt instanceof Timestamp) { ts = createdAt.toMillis(); }
        else if (typeof createdAt === "number" && createdAt > 0) { ts = createdAt; }
        else { malformedTimestamp = true; malformedCount++; }

        if (malformedTimestamp) continue;
        if (ts !== null && ts < since) { allInTimeRange = false; outOfRangeCount++; continue; }
        inRangeCount++; totalRequests++;

        const userId = data.user_id as string | undefined;
        if (userId) uniqueUsers.add(userId);
        const actionType = (data.action_type as string) || "unknown";
        actionTypeBreakdown.set(actionType, (actionTypeBreakdown.get(actionType) || 0) + 1);
        const featureUsed = (data.feature_used as string) || "unknown";
        featureUsedBreakdown.set(featureUsed, (featureUsedBreakdown.get(featureUsed) || 0) + 1);
        const tokensUsed = typeof data.tokens_used === "number" ? data.tokens_used : 0;
        tokensUsedTotal += tokensUsed;
        if (recentEvents.length < 20) {
          recentEvents.push({ id: doc.id, timestamp: ts !== null ? new Date(ts).toISOString() : "Unknown (malformed timestamp)", action_type: actionType, feature_used: featureUsed, tokens_used: tokensUsed });
        }
      }
      if (snapshot.size < PAGE_SIZE) break;
      lastVisible = snapshot.docs[snapshot.docs.length - 1];
    }

    if (totalRequests === 0 && documentsScanned === 0) return { data: null, error: null };
    if (!allInTimeRange === false && documentsScanned >= MAX_PAGES * PAGE_SIZE) truncated = true;

    return { data: { totalRequests, uniqueUsers, actionTypeBreakdown, featureUsedBreakdown, recentEvents, tokensUsedTotal, truncated, documentsScanned, malformedCount, inRangeCount, outOfRangeCount }, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Firestore error";
    console.warn("[intelligence] Failed to fetch usage_analytics:", msg);
    return { data: null, error: msg };
  }
}

function buildDatasetFromReal(real: NonNullable<Awaited<ReturnType<typeof fetchUsageAnalytics>>["data"]>, range: TimeRange, comparison: ComparisonPeriod, dynamicEventCount: number): IntelligenceDataset {
  const ds = createEmptyDataset(range, comparison, real.totalRequests + dynamicEventCount, null);

  if (real.truncated) {
    ds.overview.recentEvents.unshift({ id: "truncation-notice", timestamp: "Notice", category: "security" as const, title: "Data truncated", severity: "warning" as const, meta: `Showing ${real.documentsScanned.toLocaleString()} documents. Older records in this time range were not loaded.` });
  }
  if (real.malformedCount > 0) {
    ds.overview.recentEvents.unshift({ id: "malformed-notice", timestamp: "Notice", category: "security" as const, title: "Data quality warning", severity: "warning" as const, meta: `${real.malformedCount} document(s) have invalid timestamps (null or wrong type). Excluded from date-scoped metrics. Note: documents with NO created_at field are invisible to this query and cannot be counted.` });
  }

  const totalAssignable = real.inRangeCount + real.outOfRangeCount;
  ds.performance.analyticsDataQualityScore = { current: totalAssignable > 0 ? Math.round((real.inRangeCount / totalAssignable) * 100) : 100, formatted: totalAssignable > 0 ? `${Math.round((real.inRangeCount / totalAssignable) * 100)}%` : "N/A", benchmark: `In-range: ${real.inRangeCount} · Out-of-range: ${real.outOfRangeCount} · Unassignable: ${real.malformedCount} · Scanned: ${real.documentsScanned}` };

  ds.overview.dailyActiveUsers = { current: real.uniqueUsers.size, formatted: real.uniqueUsers.size.toLocaleString(), benchmark: "Approximate — unique user_id values in the queried window" };
  ds.overview.totalSessions = { current: real.totalRequests, formatted: real.totalRequests.toLocaleString(), benchmark: "Total AI requests (not sessions)" };
  ds.aiIntelligence.totalRequests = { current: real.totalRequests, formatted: real.totalRequests.toLocaleString() };

  ds.aiIntelligence.providers = Array.from(real.featureUsedBreakdown.entries()).filter(([feature]) => feature !== "unknown").map(([feature, requests]) => ({
    provider: feature as any, requests, percentage: real.totalRequests > 0 ? Math.round((requests / real.totalRequests) * 100) : 0, avgLatencyMs: 0, successRate: 0, activeKeys: 0,
  }));
  ds.aiIntelligence.models = [];
  ds.aiIntelligence.overallSuccessRate = notAvailable("Success/failure not recorded in usage_analytics");
  ds.aiIntelligence.averageLatencyMs = notAvailable("Latency not recorded in usage_analytics");

  const errorCount = Array.from(real.actionTypeBreakdown.entries()).filter(([action]) => action.includes("error")).reduce((sum, [, count]) => sum + count, 0);
  if (real.totalRequests > 0) {
    ds.performance.errorRate = { current: Math.round((errorCount / real.totalRequests) * 10000) / 100, formatted: `${(Math.round((errorCount / real.totalRequests) * 10000) / 100).toFixed(2)}%`, benchmark: "PROXY — inferred from action_type containing 'error', not a verified error rate" };
  } else {
    ds.performance.errorRate = notAvailable("No requests in selected range");
  }

  ds.overview.recentEvents = real.recentEvents.map((ev) => ({ id: ev.id, timestamp: new Date(ev.timestamp).toLocaleString(), category: "mission" as const, title: `${ev.action_type}`, severity: "nominal" as const, meta: `Feature: ${ev.feature_used}${ev.tokens_used > 0 ? ` · Tokens: ${ev.tokens_used.toLocaleString()}` : ""}` }));

  return ds;
}

export interface IAnalyticsService {
  fetchDataset(range: TimeRange, comparison: ComparisonPeriod): Promise<IntelligenceDataset>;
  ingestEvent(event: TelemetryIngestEvent): Promise<boolean>;
  generateReport(name: string, range: TimeRange, comparison: ComparisonPeriod, format: "csv" | "json", metrics: string[]): Promise<GeneratedReport>;
  exportDataset(dataset: IntelligenceDataset, format: "json" | "csv"): string;
  getDynamicEventCount(): number;
  resetTelemetry(): void;
}

const STORAGE_KEY = "shadowtalk_telemetry_events_v1";
const REPORTS_STORAGE_KEY = "shadowtalk_saved_reports_v1";

class FirebaseAnalyticsService implements IAnalyticsService {
  private dynamicEvents: TelemetryIngestEvent[] = [];
  private userReports: GeneratedReport[] = [];
  constructor() { this.loadFromStorage(); }
  private loadFromStorage() { if (typeof window !== "undefined") { try { const s = localStorage.getItem(STORAGE_KEY); if (s) this.dynamicEvents = JSON.parse(s); const r = localStorage.getItem(REPORTS_STORAGE_KEY); if (r) this.userReports = JSON.parse(r); } catch { this.dynamicEvents = []; } } }
  private saveToStorage() { if (typeof window !== "undefined") { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.dynamicEvents)); localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(this.userReports)); } catch {} } }
  getDynamicEventCount(): number { return this.dynamicEvents.length; }
  resetTelemetry(): void { this.dynamicEvents = []; this.userReports = []; if (typeof window !== "undefined") { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(REPORTS_STORAGE_KEY); } }

  async fetchDataset(range: TimeRange = "7d", comparison: ComparisonPeriod = "previous_period"): Promise<IntelligenceDataset> {
    const { data: real, error } = await fetchUsageAnalytics(range);
    if (error) return createEmptyDataset(range, comparison, 0, error);
    if (!real) return createEmptyDataset(range, comparison, this.dynamicEvents.length, null);
    const dataset = buildDatasetFromReal(real, range, comparison, this.dynamicEvents.length);
    if (this.userReports.length > 0) dataset.reports.savedReports = [...this.userReports];
    if (this.dynamicEvents.length > 0) {
      const latest = this.dynamicEvents[this.dynamicEvents.length - 1];
      dataset.overview.recentEvents.unshift({ id: `live-ev-${Date.now().toString().slice(-4)}`, timestamp: "Just now", category: "mission", title: `[Demo] Live Ingestion: ${latest.eventType} (${latest.modelId})`, severity: latest.success ? "nominal" : "warning", meta: `${latest.tokensTotal.toLocaleString()} tokens in ${latest.durationMs}ms via ${latest.provider}` });
    }
    return dataset;
  }
  async ingestEvent(event: TelemetryIngestEvent): Promise<boolean> { this.dynamicEvents.push({ ...event, timestamp: event.timestamp || Date.now() }); this.saveToStorage(); return true; }
  async generateReport(name: string, range: TimeRange, comparison: ComparisonPeriod, format: "csv" | "json", metrics: string[]): Promise<GeneratedReport> {
    const newReport: GeneratedReport = { id: `rep-${Date.now().toString().slice(-4)}`, name: name || `Intelligence Report (${range.toUpperCase()})`, dateRange: range, comparison, createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }), format, fileSize: "—", metricsIncluded: metrics.length > 0 ? metrics : ["AI Requests", "Unique Users"] };
    this.userReports.unshift(newReport); this.saveToStorage(); return newReport;
  }
  exportDataset(dataset: IntelligenceDataset, format: "json" | "csv"): string {
    if (format === "json") {
      return JSON.stringify({ exportedAt: new Date().toISOString(), environment: "ShadowTalk Production Telemetry", zeroContentGuarantee: true, timeRange: dataset.meta.timeRange, comparison: dataset.meta.comparison, note: "Metrics marked 'Not available' are not recorded in the usage_analytics schema.", executiveSummary: { totalAIRequests: dataset.aiIntelligence.totalRequests.formatted, uniqueUsers: dataset.overview.dailyActiveUsers.formatted, errorRate: dataset.performance.errorRate.formatted, tokensUsed: "Not available", cost: "Not available" }, featureUsage: dataset.aiIntelligence.providers.map((p) => ({ feature: p.provider, requests: p.requests, percentage: p.percentage })), recentEvents: dataset.overview.recentEvents.map((e) => ({ timestamp: e.timestamp, title: e.title, meta: e.meta })) }, null, 2);
    } else {
      const rows = [["Category", "Metric", "Current Value", "Source"], ["AI Intelligence", "Total AI Requests", dataset.aiIntelligence.totalRequests.formatted, "usage_analytics"], ["Overview", "Unique Users (approximate)", dataset.overview.dailyActiveUsers.formatted, "usage_analytics.user_id"], ["Performance", "Error Rate", dataset.performance.errorRate.formatted, "usage_analytics.action_type"], ["Cost", "Verified Cost", "Not available", "No cost field in schema"], ["Cost", "Estimated Cost", "Not available", "No pricing registry configured"], ["Mission", "TTFV", "Not available", "Not recorded"], ["Mission", "Completion Rate", "Not available", "Not recorded"]];
      return rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    }
  }
}

export const analyticsService: IAnalyticsService = new FirebaseAnalyticsService();
