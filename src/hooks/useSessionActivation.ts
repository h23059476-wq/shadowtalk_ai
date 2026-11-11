import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Monetizes the 7-minute average session length.
 *
 * Triggers a non-intrusive "Save your local session & encrypted key profile"
 * prompt after EITHER:
 *   - 3 minutes of session time, OR
 *   - 3 model calls (whichever comes first)
 *
 * Fires once per session (tracked via sessionStorage). The host component
 * reads `shouldPromptSave` and renders the save-session CTA. Dismissal or
 * save both clear the flag for the rest of the session.
 *
 * Designed to capture high-intent users during the peak-attention window
 * (the 7-minute average session) before they close the tab.
 */

const SESSION_START_KEY = "shadowtalk_session_start_ts";
const SAVE_PROMPTED_KEY = "shadowtalk_save_prompted";
const MODEL_CALL_KEY = "shadowtalk_model_call_count";

const TIME_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
const CALL_THRESHOLD = 3; // 3 model calls

export interface SessionActivationState {
  /** True when the save-session prompt should be shown. */
  shouldPromptSave: boolean;
  /** Elapsed session time in ms (updates every 10s). */
  elapsedMs: number;
  /** Number of model calls in this session. */
  modelCallCount: number;
  /** Call this whenever a model response completes. */
  recordModelCall: () => void;
  /** Dismiss the prompt (user clicked "Not now" or saved). */
  dismissPrompt: () => void;
  /** Reset the session timer (e.g. on explicit logout). */
  resetSession: () => void;
}

function getSessionStart(): number {
  let t = sessionStorage.getItem(SESSION_START_KEY);
  if (!t) {
    t = String(Date.now());
    sessionStorage.setItem(SESSION_START_KEY, t);
  }
  return parseInt(t, 10);
}

function getModelCallCount(): number {
  const v = sessionStorage.getItem(MODEL_CALL_KEY);
  return v ? parseInt(v, 10) || 0 : 0;
}

export function useSessionActivation(): SessionActivationState {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [modelCallCount, setModelCallCount] = useState(getModelCallCount());
  const [shouldPromptSave, setShouldPromptSave] = useState(false);

  const startRef = useRef<number>(getSessionStart());
  const promptedRef = useRef<boolean>(
    sessionStorage.getItem(SAVE_PROMPTED_KEY) === "1",
  );

  // Tick elapsed time every 10s and check thresholds
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setElapsedMs(elapsed);
      if (
        !promptedRef.current &&
        (elapsed >= TIME_THRESHOLD_MS || getModelCallCount() >= CALL_THRESHOLD)
      ) {
        promptedRef.current = true;
        sessionStorage.setItem(SAVE_PROMPTED_KEY, "1");
        setShouldPromptSave(true);
      }
    };
    tick(); // fire once immediately
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);

  const recordModelCall = useCallback(() => {
    const next = getModelCallCount() + 1;
    sessionStorage.setItem(MODEL_CALL_KEY, String(next));
    setModelCallCount(next);
    if (!promptedRef.current && next >= CALL_THRESHOLD) {
      promptedRef.current = true;
      sessionStorage.setItem(SAVE_PROMPTED_KEY, "1");
      setShouldPromptSave(true);
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    setShouldPromptSave(false);
  }, []);

  const resetSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_START_KEY);
    sessionStorage.removeItem(SAVE_PROMPTED_KEY);
    sessionStorage.removeItem(MODEL_CALL_KEY);
    startRef.current = Date.now();
    sessionStorage.setItem(SESSION_START_KEY, String(startRef.current));
    setElapsedMs(0);
    setModelCallCount(0);
    setShouldPromptSave(false);
    promptedRef.current = false;
  }, []);

  return {
    shouldPromptSave,
    elapsedMs,
    modelCallCount,
    recordModelCall,
    dismissPrompt,
    resetSession,
  };
}

export default useSessionActivation;
