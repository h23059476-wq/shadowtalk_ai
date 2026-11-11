/**
 * ShadowTalk AI — Firebase app bootstrap (permanent backend).
 *
 * Values come from VITE_FIREBASE_* env vars when present, otherwise from the
 * publishable web config below (safe to ship: Firebase web config is public and
 * access is governed by firestore.rules / storage.rules).
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const env = (import.meta as any).env ?? {};

const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'shadowtalk-ai-7a513';

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAOKVUWGIVihDXqAsY_Cl_XXeojTZ9xFNQ',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '819076379544',
  appId: env.VITE_FIREBASE_APP_ID || '1:819076379544:web:d164455df140a1255971ed',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-LGJV8D66QM',
};

/** Base URL for Cloud Functions (used by `backend.functions.invoke`). */
export const functionsBaseUrl: string =
  env.VITE_FIREBASE_FUNCTIONS_URL ||
  `https://${env.VITE_FIREBASE_REGION || 'us-central1'}-${PROJECT_ID}.cloudfunctions.net`;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function fbApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig as any);
  }
  return _app;
}

export function fbAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(fbApp());
    if (typeof window !== 'undefined') {
      setPersistence(_auth, browserLocalPersistence).catch((err) => {
        console.warn('[Firebase Auth] Failed to set browserLocalPersistence:', err);
      });
    }
  }
  return _auth;
}

export function fbDb(): Firestore {
  if (!_db) _db = getFirestore(fbApp());
  return _db;
}

export function fbStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(fbApp());
  return _storage;
}

/** Firebase is always configured — it is the permanent backend. */
export const isFirebaseConfigured = true;
