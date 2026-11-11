import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { backend } from "@/integrations/local/client";
import {
  buildCommunityHighlights,
  type PlatformMetrics,
} from "@/lib/platformMetricsShared";

const CACHE_KEY = "shadowtalk_platform_metrics_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

const initial: PlatformMetrics = {
  totalUsers: 0,
  dailyActiveUsers: 0,
  totalConversations: 0,
  isLoading: true,
};

type PlatformMetricsContextValue = PlatformMetrics & {
  refresh: () => void;
  highlights: ReturnType<typeof buildCommunityHighlights>;
};

const PlatformMetricsContext = createContext<PlatformMetricsContextValue | null>(null);

function readCache(): PlatformMetrics | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, metrics } = JSON.parse(raw) as { at: number; metrics: PlatformMetrics };
    if (Date.now() - at > CACHE_TTL_MS) return null;
    return { ...metrics, isLoading: false };
  } catch {
    return null;
  }
}

function writeCache(metrics: PlatformMetrics) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), metrics: { ...metrics, isLoading: false } }),
    );
  } catch {
    /* ignore */
  }
}

async function fetchMetrics(): Promise<PlatformMetrics> {
  try {
    const { data, error } = await (backend as unknown as { rpc: (name: string) => Promise<{ data: unknown; error: unknown }> }).rpc("get_public_platform_metrics");
    if (!error && data && typeof data === "object") {
      const row = data as {
        totalUsers?: number;
        totalConversations?: number;
        dailyActiveUsers?: number;
      };
      const metrics: PlatformMetrics = {
        totalUsers: row.totalUsers ?? 0,
        dailyActiveUsers: row.dailyActiveUsers ?? 0,
        totalConversations: row.totalConversations ?? 0,
        isLoading: false,
      };
      writeCache(metrics);
      return metrics;
    }
  } catch {
    /* fall through to legacy queries */
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [usersRes, convsRes, activityRes] = await Promise.all([
    backend.from("public_profiles").select("id", { count: "exact", head: true }),
    backend.from("conversations").select("id", { count: "exact", head: true }),
    backend.from("usage_analytics").select("user_id").gte("created_at", dayAgo).limit(400),
  ]);

  const dau = new Set((activityRes.data ?? []).map((r) => r.user_id)).size;

  const metrics: PlatformMetrics = {
    totalUsers: usersRes.count ?? 0,
    dailyActiveUsers: dau,
    totalConversations: convsRes.count ?? 0,
    isLoading: false,
  };
  writeCache(metrics);
  return metrics;
}

export function PlatformMetricsProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<PlatformMetrics>(() => readCache() ?? initial);

  const load = useCallback(async () => {
    if (readCache()) {
      setMetrics(readCache()!);
      return;
    }
    setMetrics((prev) => ({ ...prev, isLoading: true }));
    try {
      const next = await fetchMetrics();
      setMetrics(next);
    } catch {
      setMetrics((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setMetrics(cached);
      return;
    }

    const start = () => void load();

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const t = window.setTimeout(start, 800);
    return () => window.clearTimeout(t);
  }, [load]);

  const value = useMemo<PlatformMetricsContextValue>(
    () => ({
      ...metrics,
      refresh: load,
      highlights: buildCommunityHighlights(metrics),
    }),
    [metrics, load],
  );

  return (
    <PlatformMetricsContext.Provider value={value}>{children}</PlatformMetricsContext.Provider>
  );
}

export function usePlatformMetricsContext(): PlatformMetricsContextValue | null {
  return useContext(PlatformMetricsContext);
}
