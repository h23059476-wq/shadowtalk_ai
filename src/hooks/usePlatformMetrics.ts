import { useEffect, useState } from "react";
import { backend } from "@/integrations/local/client";
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
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [usersRes, convsRes, activityRes] = await Promise.all([
        backend.from("public_profiles").select("id", { count: "exact", head: true }),
        backend.from("conversations").select("id", { count: "exact", head: true }),
        backend.from("usage_analytics").select("user_id").gte("created_at", dayAgo).limit(400),
      ]);

      if (cancelled) return;

      const dau = new Set((activityRes.data ?? []).map((r) => r.user_id)).size;

      setMetrics({
        totalUsers: usersRes.count ?? 0,
        dailyActiveUsers: dau,
        totalConversations: convsRes.count ?? 0,
        isLoading: false,
      });
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
