/**
 * useDailyUsage — daily usage tracking & rate-limiter for the Hybrid API Key system.
 *
 * Enforces the 100-message/day cap for NON_TECH (Instant Start) users.
 * TECH (BYOK) users are unmetered — the hook returns isLimited=false always.
 *
 * Usage:
 *   const { checkAndIncrement, isLimited, remaining, max } = useDailyUsage();
 *
 *   if (!checkAndIncrement()) {
 *     // Request blocked — limit reached. UI shows the upgrade modal.
 *     return;
 *   }
 *   // Proceed with the AI request...
 *
 * The hook reads from AIKeyContext (single source of truth) and exposes a
 * `checkAndIncrement()` function that:
 *   1. Returns false if the user is NON_TECH and has hit the cap (no increment).
 *   2. Returns true and increments the counter otherwise.
 *
 * Date handling: UTC-based, auto-resets at UTC midnight. The AIKeyContext
 * runs a 60s interval to detect rollover, so `remaining` stays accurate
 * even in long-running tabs.
 */

import { useCallback } from 'react';
import { useAIKeyContext } from '@/contexts/AIKeyContext';

export interface UseDailyUsageReturn {
  /** Current usage count for today (0 for TECH users). */
  count: number;
  /** Hard daily cap (100 for NON_TECH, Infinity for TECH). */
  max: number;
  /** Messages remaining today. */
  remaining: number;
  /** True when the user has hit the cap (NON_TECH only). */
  isLimited: boolean;
  /**
   * Check whether an AI request is allowed, and increment the counter if so.
   * Returns true if the request should proceed, false if blocked.
   * For TECH users, always returns true (no metering).
   */
  checkAndIncrement: () => boolean;
  /** Peek whether a request would be allowed WITHOUT incrementing. */
  canMakeRequest: () => boolean;
}

export function useDailyUsage(): UseDailyUsageReturn {
  const {
    userCohort,
    dailyUsageCount,
    maxDailyLimit,
    remainingMessages,
    isLimitReached,
    incrementUsage,
  } = useAIKeyContext();

  // TECH users: unmetered.
  const isTech = userCohort === 'TECH';
  const max = isTech ? Infinity : maxDailyLimit;
  const count = isTech ? 0 : dailyUsageCount;
  const remaining = isTech ? Infinity : remainingMessages;
  const isLimited = isTech ? false : isLimitReached;

  const canMakeRequest = useCallback(() => {
    if (isTech) return true;
    return !isLimitReached;
  }, [isTech, isLimitReached]);

  const checkAndIncrement = useCallback((): boolean => {
    if (isTech) return true;
    if (isLimitReached) return false;
    incrementUsage();
    return true;
  }, [isTech, isLimitReached, incrementUsage]);

  return {
    count,
    max,
    remaining,
    isLimited,
    checkAndIncrement,
    canMakeRequest,
  };
}

export default useDailyUsage;
