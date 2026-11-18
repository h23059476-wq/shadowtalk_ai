import { getAuth } from "firebase/auth";
import { getAnalytics, logEvent as firebaseLogEvent } from "firebase/analytics";

// Single source of truth: the shared Firebase app AND the persistent-cache
// Firestore instance both come from integrations/firebase/app.ts. Creating a
// second getFirestore() here would race the persistent one on import order —
// and the loser silently degraded to the memory-only cache, losing offline
// writes on reload. fbDb() is memoized, so both entry points share ONE
// instance with the durable IndexedDB mutation queue.
import { fbApp, fbDb } from "@/integrations/firebase/app";

const app = fbApp();
export const auth = getAuth(app);
export const db = fbDb();

// Analytics is OPTIONAL: `getAnalytics` throws on browsers without the
// required storage/API support (and in some embedded webviews), which used to
// blow up this whole module at import time — a white screen for the chat page.
// Gate it behind isSupported() and never let analytics kill the app.
import { isSupported } from "firebase/analytics";

let analyticsInstance: any = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((ok) => {
      if (ok) analyticsInstance = getAnalytics(app);
    })
    .catch(() => {
      // Analytics unavailable (unsupported browser / blocked storage) — fine.
    });
}

export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  try {
    if (analyticsInstance) {
      firebaseLogEvent(analyticsInstance, eventName, eventParams);
    }
  } catch (error) {
    console.warn("Analytics error:", error);
  }
};

export default app;
