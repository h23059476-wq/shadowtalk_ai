/**
 * ShadowTalk AI — Firebase backend client.
 *
 * Presents the same surface the app already calls (`backend.auth`, `.from`,
 * `.functions`, `.storage`, `.channel`, `.rpc`) on top of Firebase.
 */
import { fbAuth, functionsBaseUrl, isFirebaseConfigured } from './app';
import { createAuthAdapter } from './auth';
import { createFirestoreFrom } from './firestore';
import { createStorageAdapter } from './storage';
import { createRealtimeAdapter } from './realtime';

function createFunctionsAdapter() {
  return {
    async invoke(name: string, opts?: { body?: any; headers?: Record<string, string>; method?: string }) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(opts?.headers || {}),
        };
        const user = fbAuth().currentUser;
        if (user) {
          try {
            headers.Authorization = `Bearer ${await user.getIdToken()}`;
          } catch {
            /* offline — send unauthenticated */
          }
        }

        const res = await fetch(`${functionsBaseUrl}/${name}`, {
          method: opts?.method || 'POST',
          headers,
          body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }

        if (!res.ok) {
          const error: any = new Error(
            (data && (data.error || data.message)) || `Function "${name}" failed (${res.status})`,
          );
          error.status = res.status;
          error.context = { status: res.status, body: data };
          return { data: null, error };
        }
        return { data, error: null };
      } catch (err: any) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    },
  };
}

export function createFirebaseBackend() {
  const realtime = createRealtimeAdapter();
  return {
    auth: createAuthAdapter(),
    from: createFirestoreFrom(),
    storage: createStorageAdapter(),
    functions: createFunctionsAdapter(),
    rpc: async (_fn: string, _params?: any) => ({
      data: null,
      error: new Error('Database functions are not available on the Firebase backend.'),
    }),
    ...realtime,
  };
}

export { isFirebaseConfigured };
