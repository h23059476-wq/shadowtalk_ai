import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { AdminAnimatedCard } from "@/components/admin/AdminAnimatedCard";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MessageSquare, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageAnalyticsEntry {
  id: string;
  user_id: string;
  action_type: string;
  feature_used: string;
  created_at: any; // Firestore timestamp
}

interface DailyUsageEntry {
  id: string;
  user_id: string;
  usage_date: string;
  messages: number;
  deep_research: number;
}

export function FirebaseAnalytics() {
  const [logs, setLogs] = useState<UsageAnalyticsEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyUsageEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // 1. Listen to the latest 50 analytics events
    const logsRef = collection(db, "usage_analytics");
    const logsQuery = query(logsRef, orderBy("created_at", "desc"), limit(50));

    const unsubscribeLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const newLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UsageAnalyticsEntry[];
        setLogs(newLogs);
        setLoadingLogs(false);
      },
      (error) => {
        console.error("Firebase analytics listener error:", error);
        setLoadingLogs(false);
      }
    );

    // 2. Listen to today's daily usage limits
    const today = new Date().toISOString().split("T")[0];
    const dailyRef = collection(db, "daily_usage");
    const dailyQuery = query(dailyRef, where("usage_date", "==", today));

    const unsubscribeDaily = onSnapshot(
      dailyQuery,
      (snapshot) => {
        const stats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DailyUsageEntry[];
        setDailyStats(stats);
        setLoadingStats(false);
      },
      (error) => {
        console.error("Firebase daily usage listener error:", error);
        setLoadingStats(false);
      }
    );

    return () => {
      unsubscribeLogs();
      unsubscribeDaily();
    };
  }, []);

  const totalMessagesToday = dailyStats.reduce((sum, s) => sum + (s.messages || 0), 0);
  const totalDeepResearchToday = dailyStats.reduce((sum, s) => sum + (s.deep_research || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminAnimatedCard hover={false}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Global Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{totalMessagesToday}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Across all users via Firebase functions</p>
          </CardContent>
        </AdminAnimatedCard>

        <AdminAnimatedCard hover={false}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Deep Research Runs</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{totalDeepResearchToday}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Across all users via Firebase functions</p>
          </CardContent>
        </AdminAnimatedCard>
      </div>

      <AdminAnimatedCard hover={false} className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Live Usage Stream
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {loadingLogs ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No usage logs available</p>
            ) : (
              <AnimatePresence>
                {logs.map((log) => {
                  const date = log.created_at?.toDate ? log.created_at.toDate() : new Date();
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-4 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            User: <span className="text-muted-foreground font-mono">{log.user_id.slice(0, 8)}...</span>
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {log.action_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/80 font-mono bg-muted px-1.5 py-0.5 rounded-sm inline-block">
                          {log.feature_used}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{format(date, "h:mm:ss a")}</p>
                        <p className="text-xs text-muted-foreground opacity-50">{format(date, "MMM d")}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </AdminAnimatedCard>
    </div>
  );
}
