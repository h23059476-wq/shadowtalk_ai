/**
 * Realtime channels backed by Firestore snapshot listeners.
 *
 * `postgres_changes` listeners map to onSnapshot on the referenced collection.
 * `broadcast` / `presence` are backed by a `realtime_channels` collection so
 * multi-client messaging keeps working without a websocket server.
 */
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  setDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { fbDb } from './app';

type Handler = (payload: any) => void;

class FirebaseChannel {
  private unsubs: (() => void)[] = [];
  private pgListeners: { table: string; event: string; filter?: string; cb: Handler }[] = [];
  private broadcastListeners: { event: string; cb: Handler }[] = [];
  private presenceState: Record<string, any[]> = {};
  private presenceCbs: Handler[] = [];
  private localUid: string | null = null;
  state = 'closed';

  constructor(private name: string) {}

  on(type: string, opts: any, cb?: Handler) {
    const handler = (cb || opts) as Handler;
    if (type === 'postgres_changes') {
      this.pgListeners.push({
        table: opts?.table,
        event: opts?.event || '*',
        filter: opts?.filter,
        cb: handler,
      });
    } else if (type === 'broadcast') {
      this.broadcastListeners.push({ event: opts?.event || '*', cb: handler });
    } else if (type === 'presence') {
      this.presenceCbs.push(handler);
    }
    return this;
  }

  subscribe(cb?: (status: string, err?: any) => void) {
    this.state = 'joined';

    for (const l of this.pgListeners) {
      if (!l.table) continue;
      try {
        const constraints: any[] = [];
        const m = l.filter?.match(/^([\w.]+)=eq\.(.+)$/);
        if (m) constraints.push(where(m[1], '==', m[2]));
        let first = true;
        const unsub = onSnapshot(
          query(collection(fbDb(), l.table), ...constraints),
          (snap) => {
            if (first) {
              first = false;
              return;
            }
            snap.docChanges().forEach((change) => {
              const eventType =
                change.type === 'added' ? 'INSERT' : change.type === 'modified' ? 'UPDATE' : 'DELETE';
              if (l.event !== '*' && l.event !== eventType) return;
              const row = { id: change.doc.id, ...change.doc.data() };
              l.cb({
                eventType,
                schema: 'public',
                table: l.table,
                new: eventType === 'DELETE' ? {} : row,
                old: eventType === 'DELETE' ? row : {},
              });
            });
          },
          (err) => console.warn('[realtime] snapshot error:', err?.message),
        );
        this.unsubs.push(unsub);
      } catch (err) {
        console.warn('[realtime] listener setup failed:', err);
      }
    }

    if (this.broadcastListeners.length) {
      const since = Date.now();
      const unsub = onSnapshot(
        query(
          collection(fbDb(), 'realtime_channels'),
          where('channel', '==', this.name),
          orderBy('created_at', 'asc'),
        ),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const data: any = change.doc.data();
            const ts = data.created_at?.toDate?.()?.getTime?.() ?? Date.now();
            if (ts < since - 1000) return;
            for (const l of this.broadcastListeners) {
              if (l.event === '*' || l.event === data.event) {
                l.cb({ type: 'broadcast', event: data.event, payload: data.payload });
              }
            }
          });
        },
        (err) => console.warn('[realtime] broadcast error:', err?.message),
      );
      this.unsubs.push(unsub);
    }

    if (this.presenceCbs.length) {
      const unsub = onSnapshot(
        query(
          collection(fbDb(), 'room_presences'),
          where('channel', '==', this.name)
        ),
        (snap) => {
          const state: Record<string, any[]> = {};
          snap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.payload && data.uid) {
              state[data.uid] = [data.payload];
            }
          });
          this.presenceState = state;
          this.presenceCbs.forEach((cb) => cb({ event: 'sync' }));
        },
        (err) => console.warn('[realtime] presence error:', err?.message)
      );
      this.unsubs.push(unsub);
    }

    cb?.('SUBSCRIBED');
    return this;
  }

  async send(payload: { type?: string; event?: string; payload?: any }) {
    try {
      await addDoc(collection(fbDb(), 'realtime_channels'), {
        channel: this.name,
        event: payload?.event || 'message',
        payload: payload?.payload ?? {},
        created_at: serverTimestamp(),
      });
      return 'ok';
    } catch (err) {
      console.warn('[realtime] send failed:', err);
      return 'error';
    }
  }

  private getUid(payload: any) {
    return payload?.id || payload?.user_id || 'anonymous';
  }

  async track(payload: any) {
    try {
      this.localUid = this.getUid(payload);
      await setDoc(doc(fbDb(), 'room_presences', `${this.name}_${this.localUid}`), {
        channel: this.name,
        uid: this.localUid,
        payload: payload,
        updated_at: serverTimestamp(),
      });
      // Optimistic update
      this.presenceState[this.localUid] = [payload];
      this.presenceCbs.forEach((cb) => cb({ event: 'sync' }));
      return 'ok';
    } catch (err) {
      console.warn('[realtime] track failed:', err);
      return 'error';
    }
  }

  async untrack() {
    try {
      if (this.localUid) {
        await deleteDoc(doc(fbDb(), 'room_presences', `${this.name}_${this.localUid}`));
        delete this.presenceState[this.localUid];
        this.localUid = null;
      }
      return 'ok';
    } catch (err) {
      console.warn('[realtime] untrack failed:', err);
      return 'error';
    }
  }
  presenceStateFn() {
    return this.presenceState;
  }

  unsubscribe() {
    this.unsubs.forEach((u) => {
      try {
        u();
      } catch {
        /* ignore */
      }
    });
    this.unsubs = [];
    this.state = 'closed';
    return 'ok';
  }
}

export function createRealtimeAdapter() {
  const channels = new Map<string, any>();

  const channel = (name = 'default') => {
    if (!channels.has(name)) {
      const ch = new FirebaseChannel(name) as any;
      ch.presenceState = () => ch.presenceStateFn();
      channels.set(name, ch);
    }
    return channels.get(name);
  };

  const removeChannel = (ch?: any) => {
    try {
      ch?.unsubscribe?.();
    } catch {
      /* ignore */
    }
    for (const [k, v] of channels) if (v === ch) channels.delete(k);
  };

  return {
    channel,
    removeChannel,
    removeAllChannels: () => {
      for (const ch of channels.values()) ch.unsubscribe?.();
      channels.clear();
    },
    getChannels: () => Array.from(channels.values()),
    realtime: {
      connect: () => {},
      disconnect: () => {},
      channel,
      removeChannel,
      getChannels: () => Array.from(channels.values()),
      setAuth: () => {},
    },
  };
}
