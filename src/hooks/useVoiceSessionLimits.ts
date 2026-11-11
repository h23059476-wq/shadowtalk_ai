import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { DAILY_LIMITS } from '@/lib/productClaims';

const STORAGE_KEY = 'shadowtalk-voice-sessions-v1';

const getTodayKey = (): string => new Date().toISOString().split('T')[0];

interface VoiceUsage {
  count: number;
  date: string;
}

function loadUsage(): VoiceUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: getTodayKey() };
    const parsed = JSON.parse(raw) as VoiceUsage;
    if (parsed.date !== getTodayKey()) return { count: 0, date: getTodayKey() };
    return parsed;
  } catch {
    return { count: 0, date: getTodayKey() };
  }
}

/** Tracks daily voice session starts (analytics only — sessions are unlimited). */
export function useVoiceSessionLimits() {
  const { userPlan } = useAuth();
  const [usage, setUsage] = useState<VoiceUsage>(loadUsage);

  useEffect(() => {
    setUsage(loadUsage());
  }, []);

  // FREE ACCESS TRANSITION: voice sessions are unlimited.
  void userPlan;
  void DAILY_LIMITS;
  const limit = Infinity;

  const canStart = limit === Infinity || usage.count < limit;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - usage.count);

  const trackSession = useCallback(() => {
    setUsage((prev) => {
      const today = getTodayKey();
      const base = prev.date === today ? prev : { count: 0, date: today };
      const next = { count: base.count + 1, date: today };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { canStart, remaining, limit, count: usage.count, trackSession };
}
