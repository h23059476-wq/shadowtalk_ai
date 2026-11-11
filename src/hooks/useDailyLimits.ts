import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { DAILY_LIMITS } from '@/lib/monetization';
import { backend } from '@/integrations/local/client';

type ActionType = keyof typeof DAILY_LIMITS.free;

interface DailyUsage {
  messages: number;
  fileUploads: number;
  codeGenerations: number;
  imageGenerations: number;
  webSearches: number;
  deepResearch: number;
  lastResetDate: string;
}

const STORAGE_KEY = 'shadowtalk-daily-usage-v2';

const getTodayKey = (): string => new Date().toISOString().split('T')[0];

const getDefaultUsage = (): DailyUsage => ({
  messages: 0,
  fileUploads: 0,
  codeGenerations: 0,
  imageGenerations: 0,
  webSearches: 0,
  deepResearch: 0,
  lastResetDate: getTodayKey(),
});

// Maps local camelCase keys to DB snake_case columns
const LOCAL_TO_DB: Record<string, string> = {
  messages: 'messages',
  fileUploads: 'file_uploads',
  codeGenerations: 'code_generations',
  imageGenerations: 'image_generations',
  webSearches: 'web_searches',
  deepResearch: 'deep_research',
};

export function useDailyLimits() {
  const { user, userPlan } = useAuth();
  const [usage, setUsage] = useState<DailyUsage>(getDefaultUsage);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load usage from backend (authenticated) or localStorage (guest)
  useEffect(() => {
    const load = async () => {
      const today = getTodayKey();

      if (user) {
        try {
          const { data } = await backend
            .from('daily_usage')
            .select('*')
            .eq('user_id', user.id)
            .eq('usage_date', today)
            .maybeSingle();

          if (data) {
            const loaded: DailyUsage = {
              messages: data.messages,
              fileUploads: data.file_uploads,
              codeGenerations: data.code_generations,
              imageGenerations: data.image_generations,
              webSearches: data.web_searches,
              deepResearch: data.deep_research,
              lastResetDate: data.usage_date,
            };
            setUsage(loaded);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
          } else {
            // Migrate localStorage data or create fresh
            const stored = localStorage.getItem(STORAGE_KEY);
            const fresh = stored ? JSON.parse(stored) : getDefaultUsage();
            const isToday = fresh.lastResetDate === today;
            const usageToSave = isToday ? fresh : getDefaultUsage();

            await backend.from('daily_usage').upsert({
              user_id: user.id,
              usage_date: today,
              messages: usageToSave.messages,
              file_uploads: usageToSave.fileUploads,
              code_generations: usageToSave.codeGenerations,
              image_generations: usageToSave.imageGenerations,
              web_searches: usageToSave.webSearches,
              deep_research: usageToSave.deepResearch,
            }, { onConflict: 'user_id,usage_date' });

            setUsage(usageToSave);
          }
        } catch {
          // Fallback to localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setUsage(parsed.lastResetDate === today ? parsed : getDefaultUsage());
          }
        }
      } else {
        // Guest: localStorage only
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.lastResetDate !== today) {
              const fresh = getDefaultUsage();
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
              setUsage(fresh);
            } else {
              setUsage(parsed);
            }
          } else {
            const fresh = getDefaultUsage();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
            setUsage(fresh);
          }
        } catch {
          setUsage(getDefaultUsage());
        }
      }
      setIsLoaded(true);
    };

    load();
  }, [user]);

  const getLimit = useCallback((_action: ActionType): number => {
    // FREE ACCESS TRANSITION: product-level daily caps are removed. Third-party
    // provider limits and backend abuse protection still apply naturally.
    return Infinity;
  }, []);

  const canPerform = useCallback((_action: ActionType): boolean => {
    return true;
  }, [getLimit]);

  const getRemaining = useCallback((action: ActionType): number => {
    const limit = getLimit(action);
    if (limit === Infinity) return Infinity;
    const current = usage[action as keyof DailyUsage] as number ?? 0;
    return Math.max(0, limit - current);
  }, [usage, getLimit]);

  const getPercentage = useCallback((action: ActionType): number => {
    const limit = getLimit(action);
    if (limit === Infinity) return 0;
    const current = usage[action as keyof DailyUsage] as number ?? 0;
    return Math.min((current / limit) * 100, 100);
  }, [usage, getLimit]);

  const trackUsage = useCallback((action: ActionType, count: number = 1) => {
    setUsage(prev => {
      const currentValue = prev[action as keyof DailyUsage];
      const newValue = typeof currentValue === 'number' ? currentValue + count : count;
      const updated: DailyUsage = { ...prev, [action]: newValue };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Sync to backend if authenticated
      if (user) {
        const dbColumn = LOCAL_TO_DB[action];
        if (dbColumn) {
          backend
            .from('daily_usage')
            .upsert({
              user_id: user.id,
              usage_date: getTodayKey(),
              [dbColumn]: newValue,
            }, { onConflict: 'user_id,usage_date' })
            .then(() => {});
        }
      }

      return updated;
    });
  }, [user]);

  const resetUsage = useCallback(() => {
    const fresh = getDefaultUsage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setUsage(fresh);
  }, []);

  return {
    usage,
    isLoaded,
    getLimit,
    canPerform,
    getRemaining,
    getPercentage,
    trackUsage,
    resetUsage,
    isUnlimited: true,
  };
}
