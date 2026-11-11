/**
 * AIKeyContext — Unified API Key & User Onboarding System for ShadowTalk AI.
 *
 * Splits users into two cohorts on first visit to /chatbot:
 *  - 'TECH'     : BYOK mode — user supplies their own OpenRouter/OpenAI key.
 *                 Unlimited messages, direct provider connection.
 *  - 'NON_TECH' : Instant Start mode — uses the shared platform key
 *                 (VITE_OPENROUTER_SHARED_KEY or backend /api/ai-proxy).
 *                 Hard-capped at 50 messages/day (UTC reset).
 *
 * All AI features (Chat, Doc Gen, Image Gen, Vision, Doc Analysis) route
 * through executeAIRequest() which reads this context to decide auth.
 *
 * Storage is namespaced by Firebase UID. Unscoped legacy onboarding keys are
 * never loaded because their owner cannot be established safely.
 *
 * Backward compatibility:
 *  - Existing UID-scoped BYOK configs are respected — if the active user
 *    already has one, we auto-migrate them to the TECH cohort
 *    on first load without showing the onboarding modal.
 *  - Existing daily message counter (shadowtalk-daily-msgs-YYYY-MM-DD)
 *    is NOT touched — this context uses its own shadowtalk_daily_usage key
 *    with a {count, date} object so we can reset cleanly on UTC midnight.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { getByokConfig, saveByokConfig, clearByokConfig, type ByokConfig } from '@/lib/byok';
import { useAuth } from '@/components/AuthProvider';
import { aiKeyStorageKey } from '@/lib/aiKeyStorage';

// ── Types ──────────────────────────────────────────────────────────────

export type UserCohort = 'TECH' | 'NON_TECH';

export interface DailyUsage {
  count: number;
  date: string; // 'YYYY-MM-DD' (UTC)
}

export interface AIKeyContextValue {
  /** Current cohort — null until onboarding is completed. */
  userCohort: UserCohort | null;
  /** User's API key (TECH only). Stored in localStorage. */
  userApiKey: string;
  /** Whether the one-time onboarding has been completed. */
  hasCompletedOnboarding: boolean;
  /** Messages sent today (NON_TECH only). */
  dailyUsageCount: number;
  /** Hard daily cap for NON_TECH users. */
  readonly maxDailyLimit: number;
  /** Remaining messages for today (NON_TECH). */
  remainingMessages: number;
  /** Whether the daily limit has been reached. */
  isLimitReached: boolean;

  /** Set TECH cohort with a user-provided API key. */
  setTechCohort: (apiKey: string, provider?: ByokConfig['provider']) => void;
  /** Set NON_TECH cohort (uses shared platform key). */
  setNonTechCohort: () => void;
  /** Increment the daily usage counter (NON_TECH only). No-op for TECH. */
  incrementUsage: () => void;
  /** Reset onboarding — allows switching cohorts from settings. */
  resetOnboarding: () => void;
  /** Clear the stored API key (used on sign-out or key rotation). */
  clearApiKey: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────

const MAX_DAILY_LIMIT = 50;

const AIKeyContext = createContext<AIKeyContextValue | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────────

/** Today's date in UTC as 'YYYY-MM-DD'. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Read the daily usage object, resetting if the date has rolled over. */
function readDailyUsage(uid: string): DailyUsage {
  if (typeof localStorage === 'undefined') return { count: 0, date: todayUTC() };
  try {
    const raw = localStorage.getItem(aiKeyStorageKey(uid, 'daily_usage'));
    if (!raw) return { count: 0, date: todayUTC() };
    const parsed = JSON.parse(raw) as DailyUsage;
    // If the stored date isn't today, reset the counter.
    if (parsed.date !== todayUTC()) {
      const reset = { count: 0, date: todayUTC() };
      localStorage.setItem(aiKeyStorageKey(uid, 'daily_usage'), JSON.stringify(reset));
      return reset;
    }
    return { count: Math.max(0, parsed.count || 0), date: parsed.date };
  } catch {
    return { count: 0, date: todayUTC() };
  }
}

/** Write the daily usage object. */
function writeDailyUsage(uid: string, usage: DailyUsage): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(aiKeyStorageKey(uid, 'daily_usage'), JSON.stringify(usage));
  } catch {
    // storage full or unavailable — best-effort
  }
}

/**
 * Check for an existing BYOK config and auto-migrate it to the TECH cohort.
 * This ensures backward compatibility for users who already set up BYOK
 * before the onboarding system was added.
 */
function migrateExistingByok(): { cohort: UserCohort; key: string } | null {
  const existing = getByokConfig();
  if (existing?.apiKey) {
    return { cohort: 'TECH', key: existing.apiKey };
  }
  return null;
}

// ── Provider ───────────────────────────────────────────────────────────

export const AIKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id ?? null;
  const activeUid = useRef<string | null>(null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [userCohort, setUserCohort] = useState<UserCohort | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({ count: 0, date: todayUTC() });
  const migratedUids = useRef(new Set<string>());

  // Load onboarding and credentials only from the active user's namespace.
  // Legacy global keys are deliberately not migrated because their owner is unknown.
  useEffect(() => {
    if (authLoading) return;
    if (activeUid.current !== uid) {
      activeUid.current = uid;
      setLoadedUid(null);
      setUserCohort(null);
      setUserApiKey('');
      setHasCompletedOnboarding(false);
      setDailyUsage({ count: 0, date: todayUTC() });
    }
    if (!uid || typeof window === 'undefined') return;

    const cohortKey = aiKeyStorageKey(uid, 'cohort');
    const apiKeyStorage = aiKeyStorageKey(uid, 'api_key');
    const onboardedKey = aiKeyStorageKey(uid, 'onboarded');
    const storedCohort = localStorage.getItem(cohortKey) as UserCohort | null;
    const storedKey = localStorage.getItem(apiKeyStorage) || '';
    const onboarded = localStorage.getItem(onboardedKey) === '1';

    if (storedCohort && onboarded) {
      setUserCohort(storedCohort);
      setUserApiKey(storedKey);
      setHasCompletedOnboarding(true);
    } else if (!migratedUids.current.has(uid)) {
      // 2. Backward-compat: migrate existing BYOK users to TECH cohort.
      const migrated = migrateExistingByok();
      if (migrated) {
        localStorage.setItem(cohortKey, migrated.cohort);
        localStorage.setItem(apiKeyStorage, migrated.key);
        localStorage.setItem(onboardedKey, '1');
        setUserCohort(migrated.cohort);
        setUserApiKey(migrated.key);
        setHasCompletedOnboarding(true);
        migratedUids.current.add(uid);
      } else {
        migratedUids.current.add(uid);
      }
    }

    // 3. Load daily usage (auto-resets on UTC date rollover).
    setDailyUsage(readDailyUsage(uid));
    setLoadedUid(uid);
  }, [authLoading, uid]);

  // Check for UTC date rollover every 60s (so a long-running tab resets at midnight).
  useEffect(() => {
    const interval = setInterval(() => {
      if (!uid) return;
      const current = readDailyUsage(uid);
      setDailyUsage((prev) => {
        if (prev.date !== current.date) return current;
        return prev;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [uid]);

  const setTechCohort = useCallback((apiKey: string, provider: ByokConfig['provider'] = 'openrouter') => {
    if (!uid) return;
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    localStorage.setItem(aiKeyStorageKey(uid, 'cohort'), 'TECH');
    localStorage.setItem(aiKeyStorageKey(uid, 'api_key'), trimmed);
    localStorage.setItem(aiKeyStorageKey(uid, 'onboarded'), '1');

    // Also sync to the existing BYOK system so all current AI code paths work.
    const model = provider === 'openai' ? 'gpt-4o-mini'
      : provider === 'groq' ? 'llama-3.3-70b-versatile'
      : provider === 'gemini' ? 'gemini-2.0-flash'
      : 'openai/gpt-4o-mini'; // openrouter default
    saveByokConfig({ provider, apiKey: trimmed, model, mode: 'always' });

    setUserCohort('TECH');
    setUserApiKey(trimmed);
    setHasCompletedOnboarding(true);
  }, [uid]);

  const setNonTechCohort = useCallback(() => {
    if (!uid) return;
    localStorage.setItem(aiKeyStorageKey(uid, 'cohort'), 'NON_TECH');
    localStorage.removeItem(aiKeyStorageKey(uid, 'api_key'));
    localStorage.setItem(aiKeyStorageKey(uid, 'onboarded'), '1');

    // Clear any existing BYOK config so it doesn't interfere with the
    // OmniRoute gateway routing. NON_TECH requests go through
    // VITE_OMNIROUTE_ENDPOINT (handled in executeAIRequest.ts).
    clearByokConfig();

    setUserCohort('NON_TECH');
    setUserApiKey('');
    setHasCompletedOnboarding(true);
  }, [uid]);

  const incrementUsage = useCallback(() => {
    // Only NON_TECH users are metered.
    if (userCohort !== 'NON_TECH') return;

    setDailyUsage((prev) => {
      // Ensure we're incrementing today's count (reset if date rolled).
      const base = prev.date === todayUTC() ? prev : { count: 0, date: todayUTC() };
      const next = { count: base.count + 1, date: todayUTC() };
      if (uid) writeDailyUsage(uid, next);
      return next;
    });
  }, [userCohort, uid]);

  const resetOnboarding = useCallback(() => {
    if (uid) {
      localStorage.removeItem(aiKeyStorageKey(uid, 'cohort'));
      localStorage.removeItem(aiKeyStorageKey(uid, 'api_key'));
      localStorage.removeItem(aiKeyStorageKey(uid, 'onboarded'));
    }
    // Don't clear BYOK here — let the user re-pick.
    setUserCohort(null);
    setUserApiKey('');
    setHasCompletedOnboarding(false);
  }, [uid]);

  const clearApiKey = useCallback(() => {
    if (uid) localStorage.removeItem(aiKeyStorageKey(uid, 'api_key'));
    clearByokConfig();
    setUserApiKey('');
  }, [uid]);

  const dailyUsageCount = dailyUsage.count;
  const remainingMessages = Math.max(0, MAX_DAILY_LIMIT - dailyUsageCount);
  const isLimitReached = userCohort === 'NON_TECH' && dailyUsageCount >= MAX_DAILY_LIMIT;

  const value: AIKeyContextValue = {
    userCohort: loadedUid === uid ? userCohort : null,
    userApiKey: loadedUid === uid ? userApiKey : '',
    hasCompletedOnboarding: loadedUid === uid && hasCompletedOnboarding,
    dailyUsageCount: loadedUid === uid ? dailyUsageCount : 0,
    maxDailyLimit: MAX_DAILY_LIMIT,
    remainingMessages: loadedUid === uid ? remainingMessages : MAX_DAILY_LIMIT,
    isLimitReached: loadedUid === uid && isLimitReached,
    setTechCohort,
    setNonTechCohort,
    incrementUsage,
    resetOnboarding,
    clearApiKey,
  };

  return <AIKeyContext.Provider value={value}>{children}</AIKeyContext.Provider>;
};

// ── Hook ───────────────────────────────────────────────────────────────

export function useAIKeyContext(): AIKeyContextValue {
  const ctx = useContext(AIKeyContext);
  if (ctx === undefined) {
    throw new Error('useAIKeyContext must be used within an AIKeyProvider');
  }
  return ctx;
}

export default AIKeyContext;
