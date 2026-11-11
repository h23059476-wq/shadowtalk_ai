import { useState, useEffect, useCallback } from 'react';
import { backend } from '@/integrations/local/client';
import {
  consumeLocalMissionQuota,
  getLocalMissionQuotaInfo,
  shouldUseAnonymousMissionStore,
} from '@/lib/anonymousAutonomousMode';
import { useFeatureGating, PlanTier } from './useFeatureGating';

// =============================================================================
// Mission Quota System - Industry-Benchmarked Limits
// Based on 2026 freelancer studies: 3-5 high-reliability missions preferred
// Hybrid billing: 3 free retries per mission before counting
// =============================================================================

// FREE ACCESS TRANSITION: mission quota is unlimited for every plan. The map
// is kept so optional monetization can reintroduce limits later.
export const MISSION_LIMITS: Record<PlanTier, number> = {
  free: Infinity,
  pro: Infinity,
  premium: Infinity,
  lifetime: Infinity,
  elite: Infinity,
  enterprise: Infinity,
};

export const MAX_FREE_RETRIES = 3;
export const MISSION_STEP_TIMEOUT_MS = 30 * 60 * 1000; // 30-min ceiling per step

export interface MissionQuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  plan: PlanTier;
  resetDate: string; // first of next month
}

export const useMissionQuota = () => {
  const { userPlan, hasSpecialAccess } = useFeatureGating();
  const [quotaInfo, setQuotaInfo] = useState<MissionQuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  };

  const getNextMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  };

  const fetchQuota = useCallback(async () => {
    try {
      if (shouldUseAnonymousMissionStore()) {
        const local = getLocalMissionQuotaInfo();
        setQuotaInfo({
          used: local.used,
          limit: local.limit,
          remaining: local.remaining,
          plan: 'free',
          resetDate: local.resetDate,
        });
        return;
      }

      const { data: { user } } = await backend.auth.getUser();
      if (!user) {
        setQuotaInfo({
          used: 0,
          limit: MISSION_LIMITS.free,
          remaining: MISSION_LIMITS.free,
          plan: 'free',
          resetDate: getNextMonthStart(),
        });
        return;
      }

      // Count missions this month that were marked as "completed" by user (success-fee)
      // Failed/cancelled missions with retry_count < MAX_FREE_RETRIES don't count
      const monthStart = getMonthStart();
      
      const { count, error } = await backend
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart)
        .in('status', ['completed', 'running', 'queued'])
        .or(`status.eq.completed,and(status.in.(failed),retry_count.gte.${MAX_FREE_RETRIES})`);

      if (error) throw error;

      const plan = (hasSpecialAccess ? 'enterprise' : userPlan) as PlanTier;
      const limit = MISSION_LIMITS[plan] ?? MISSION_LIMITS.free;
      const used = count || 0;

      setQuotaInfo({
        used,
        limit,
        remaining: Math.max(0, limit - used),
        plan,
        resetDate: getNextMonthStart(),
      });
    } catch (error) {
      console.error('Error fetching mission quota:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userPlan, hasSpecialAccess]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  // Free access: missions never blocked by quota (abuse protections elsewhere
  // are untouched).
  const canCreateMission = true;

  const consumeMission = useCallback(async () => {
    if (shouldUseAnonymousMissionStore()) {
      consumeLocalMissionQuota();
    }
    await fetchQuota();
  }, [fetchQuota]);

  return {
    quotaInfo,
    isLoading,
    canCreateMission,
    consumeMission,
    refreshQuota: fetchQuota,
    maxRetries: MAX_FREE_RETRIES,
    stepTimeoutMs: MISSION_STEP_TIMEOUT_MS,
  };
};
