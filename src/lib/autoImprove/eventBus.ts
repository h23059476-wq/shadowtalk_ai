import type { BehaviorEvent, BehaviorEventType } from "./types";
import { appendBehaviorEvent } from "./eventStore";

type BusListener = (event: BehaviorEvent) => void;

const listeners = new Set<BusListener>();

export function subscribeAutoImprove(listener: BusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Unified event bus: persist locally and notify subscribers. */
export async function publishAutoImproveEvent(
  type: BehaviorEventType,
  payload?: Record<string, string | number | boolean>
): Promise<BehaviorEvent> {
  const event: BehaviorEvent = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
    ts: Date.now(),
    type,
    payload,
  };
  await appendBehaviorEvent(event);
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      console.warn("[AutoImprove] listener error", e);
    }
  });
  return event;
}
