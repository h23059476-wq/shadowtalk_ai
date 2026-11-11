import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent as firebaseLogEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAOKVUWGIVihDXqAsY_Cl_XXeojTZ9xFNQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shadowtalk-ai-7a513.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shadowtalk-ai-7a513",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "shadowtalk-ai-7a513.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "819076379544",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:819076379544:web:d164455df140a1255971ed",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LGJV8D66QM"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics conditionally (only in browser, usually wrapped in checks for production/consent)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  try {
    if (analytics) {
      firebaseLogEvent(analytics, eventName, eventParams);
    }
  } catch (error) {
    console.warn("Analytics error:", error);
  }
};

export default app;
