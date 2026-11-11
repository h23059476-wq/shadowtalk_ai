/**
 * ShadowTalk AI — Backend client.
 *
 * Firebase is the permanent backend: Firebase Auth, Firestore, Cloud Storage,
 * Cloud Functions and Firestore-backed realtime channels.
 *
 * Import as:  import { backend } from "@/integrations/local/client";
 */
import { createFirebaseBackend } from '@/integrations/firebase/adapter';

let _client: any = null;

function client(): any {
  if (!_client) {
    _client = createFirebaseBackend();
    console.log('[ShadowTalk] Backend: Firebase (auth, firestore, storage, functions).');
  }
  return _client;
}

export const backend: any = new Proxy({} as any, {
  get(_, prop) {
    const value = (client() as any)[prop as string];
    if (typeof value === 'function') return value.bind(client());
    return value;
  },
});

/** Firebase is always configured. */
export const isConfigured = true;

/** Backend kind identifier. */
export const backendKind = 'firebase' as const;
