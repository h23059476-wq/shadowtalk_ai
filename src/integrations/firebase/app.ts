/**
 * ShadowTalk AI — Firebase app bootstrap (permanent backend).
 *
 * Values come from VITE_FIREBASE_* env vars when present, otherwise from the
 * publishable web config below (safe to ship: Firebase web config is public and
 * access is governed by firestore.rules / storage.rules).
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
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

/**
 * Base URL for the ShadowTalk edge backend, used by `backend.functions.invoke`
 * and the branded auth-email calls in `auth.ts` (POST /requestPasswordReset,
 * POST /sendVerificationEmail) and `cloudChat.ts` (POST /chat).
 *
 * Since 2026-11-24 this defaults to the Cloudflare Worker deployed by
 * `scripts/deploy_cf_worker.py` (https://shadowtalk-email.z67061935.workers.dev).
 * The previous default — the Firebase Cloud Functions URL — died in
 * production (every cloudfunctions.net endpoint returned 404; the CI deploy
 * step could no longer ship functions), so the worker took over the branded
 * email endpoints and deliberately keeps the historic 404 contract on /chat
 * so nothing silently changes shape.
 *
 * Override with VITE_FIREBASE_FUNCTIONS_URL (e.g. to move back to Firebase
 * Cloud Functions or to a custom domain in front of the worker).
 */
export const functionsBaseUrl: string =
  env.VITE_FIREBASE_FUNCTIONS_URL || 'https://shadowtalk-email.z67061935.workers.dev';

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
  if (!_db) {
    try {
      // PERSISTENT multi-tab cache — the backbone of "offline never fails".
      // getFirestore() defaults to a memory-only cache (LruGcMemoryOffline
      // ComponentProvider in firebase v12), which means every Firestore write
      // queued while offline lived in RAM only: a page reload (or the OS
      // killing the tab) silently threw it away, and queries answered empty
      // offline after a reload. persistentLocalCache writes the mutation
      // queue and snapshot to IndexedDB, so offline messages survive reloads,
      // reconnects flush them to the backend, and reads resolve from cache
      // while the device has no network. persistentMultipleTabManager lets
      // every open tab share that cache instead of demoting all-but-one tab
      // to the degraded memory-only mode.
      // If IndexedDB is unavailable (private browsing, locked-down webviews)
      // Firestore falls back to the memory cache automatically.
      _db = initializeFirestore(fbApp(), {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // initializeFirestore throws when a Firestore instance already exists
      // for this app (another module created the default first). Reuse it —
      // degraded (memory) but functional; never let bootstrap throw.
      _db = getFirestore(fbApp());
    }
  }
  return _db;
}

export function fbStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(fbApp());
  return _storage;
}

/** Firebase is always configured — it is the permanent backend. */
export const isFirebaseConfigured = true;
