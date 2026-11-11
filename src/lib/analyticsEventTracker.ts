import { trackEvent, db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Generate a simple session ID that persists for this browser session
const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

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

export const trackShadowTalkEvent = async (eventName: AnalyticsEventName, params?: Omit<AnalyticsEventParams, "session_id">) => {
  const fullParams = { ...params, session_id: SESSION_ID };
  
  // 1. Log to standard Firebase Analytics
  trackEvent(eventName, fullParams);

  // 2. Log to Firestore for the Admin Dashboard real-time funnel
  try {
    const eventsRef = collection(db, "analytics_events");
    await addDoc(eventsRef, {
      event_name: eventName,
      ...fullParams,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to log event to Firestore", err);
  }
};

