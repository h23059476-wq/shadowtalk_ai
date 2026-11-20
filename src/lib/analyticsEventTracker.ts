/**
 * ShadowTalk Analytics — public tracking facade.
 *
 * `trackShadowTalkEvent(name, params)` stays the one API every feature calls.
 * Internals (Batch 4) now run on the first-party offline-first pipeline in
 * `src/lib/analytics/`:
 *
 *   - anonymous client id + 30-min sessions      (analytics/identity.ts)
 *   - offline queue, batched Firestore writes    (analytics/ingest.ts)
 *   - auto page views via <AnalyticsRouteTracker> (analytics/track.tsx)
 *
 * Events land in three Firestore targets atomically per flush:
 *   analytics_events/{id}    raw event feed (admin real-time views)
 *   analytics_daily/{day}    atomic counter increments (dashboards, cheap reads)
 *   analytics_clients/{id}   anonymous profile: first touch, activation, D1/D7/D30
 *
 * Privacy: no PII, no IP, no user agent, no fingerprinting. The client id is
 * a random UUID that the user can wipe via resetAnalyticsIdentity().
 */

export {
  track as trackEventEnriched,
  initAnalytics,
  AnalyticsRouteTracker,
  type TrackParams,
} from "./analytics/track";
export { resetAnalyticsIdentity, getClientId } from "./analytics/identity";

import { track as pipelineTrack } from "./analytics/track";

export type AnalyticsEventName =
  | "page_viewed"
  | "cta_clicked"
  | "session_started"
  | "mission_started"
  | "first_meaningful_result" // TTFV point
  | "mission_completed"       // Full duration point
  | "mission_failed"
  | "tool_called"
  | "tool_failed"
  | "chat_message_sent"
  | "demo_started"
  | "demo_completed"
  | "feature_used"
  | "user_returned"
  | "ide_page_viewed"
  | "ide_preview_run"
  | "ide_code_run"
  | "ide_agent_run"
  | "ide_agent_apply"
  | "ide_agent_image_save"
  | "ide_export_zip"
  | "ide_file_rename"
  | "benchmarks_try_in_workspace"
  | "benchmarks_cta_clicked"
  | "coming_soon_page_viewed";

export interface AnalyticsEventParams {
  session_id?: string;
  user_id?: string;
  mission_id?: string;
  feature?: string;
  model?: string;
  duration_ms?: number;
  ttfv_ms?: number;
  success?: boolean;
  error_type?: string;
  tool_name?: string;
  input_tokens?: number;
  output_tokens?: number;
  cached_tokens?: number;
  estimated_cost?: number; // Estimated AI cost in USD
  cost_type?: "estimated" | "exact"; // Ensure token/cost tracking falls back to estimated
  cta_name?: string;
  [key: string]: any;
}

// Simple per-load session marker kept for Firebase Analytics parity — the
// first-party pipeline generates proper 30-minute sessions on its own.
const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

/**
 * Track one product event.
 *
 * The first-party pipeline is the system of record: the event is enriched
 * (anonymous client id, 30-min session, day bucket, path), queued offline
 * and flushed to Firestore in ONE batched write (analytics_events feed +
 * analytics_daily counters + analytics_clients profile). Google Analytics
 * mirrors the event client-side inside the pipeline when available.
 */
export const trackShadowTalkEvent = async (eventName: AnalyticsEventName, params?: Omit<AnalyticsEventParams, "session_id">) => {
  const fullParams = { ...params, session_id: SESSION_ID };
  pipelineTrack(eventName, fullParams);
};
