import { useEffect, useState } from "react";
import { backend } from "@/integrations/local/client";
import { fbAuth } from "@/integrations/firebase/app";
import {
  buildCommunityHighlights,
  type CommunityHighlight,
  type PlatformMetrics,
} from "@/lib/platformMetricsShared";
import { usePlatformMetricsContext } from "@/contexts/PlatformMetricsContext";

export type { CommunityHighlight, PlatformMetrics };
export { buildCommunityHighlights };

const initial: PlatformMetrics = {
  totalUsers: 0,
  dailyActiveUsers: 0,
  totalConversations: 0,
  isLoading: true,
};

export function usePlatformMetrics(): PlatformMetrics {
  const shared = usePlatformMetricsContext();
  const [metrics, setMetrics] = useState<PlatformMetrics>(initial);

  useEffect(() => {
    if (shared) return;

    let cancelled = false;

    const load = async () => {
      // Production fix: per-user collections 403 under Firestore rules for
      // signed-out visitors — only query them when authenticated, and never
      // let a denial leave the loading state stuck or throw.
      const signed = Boolean(fbAuth().currentUser);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      try {
        const [usersRes, convsRes, activityRes] = await Promise.all([
          backend.from("public_profiles").select("id", { count: "exact", head: true }),
          signed
            ? backend.from("conversations").select("id", { count: "exact", head: true })
            : Promise.resolve({ count: null, data: [] } as { count: number | null; data: unknown[] }),
          signed
            ? backend.from("usage_analytics").select("user_id").gte("created_at", dayAgo).limit(400)
            : Promise.resolve({ data: [] } as { data: Array<{ user_id?: string }> }),
        ]);

        if (cancelled) return;

        const dau = new Set(((activityRes.data ?? []) as Array<{ user_id?: string }>).map((r) => r.user_id)).size;

        setMetrics({
          totalUsers: (usersRes as { count?: number | null }).count ?? 0,
          dailyActiveUsers: dau,
          totalConversations: (convsRes as { count?: number | null }).count ?? 0,
          isLoading: false,
        });
      } catch {
        if (cancelled) return;
        setMetrics({ totalUsers: 0, dailyActiveUsers: 0, totalConversations: 0, isLoading: false });
      }
    };

    const start = () => void load();
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 3000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(start, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [shared]);

  return shared ?? metrics;
}
