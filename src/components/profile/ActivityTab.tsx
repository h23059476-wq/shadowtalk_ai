import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { backend } from "@/integrations/local/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, MessageSquare, Zap, Brain, Clock, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { SettingsStagger } from "@/components/settings/SettingsStagger";

interface ActivityTabProps {
  userId: string;
}

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export const ActivityTab = ({ userId }: ActivityTabProps) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    streak: 0,
    lastActive: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const [convList, convCount, msgCount, streakRes] = await Promise.all([
          backend
            .from("conversations")
            .select("id, title, created_at, updated_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(15),
          backend
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          backend
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          backend.from("user_streaks").select("*").eq("user_id", userId).maybeSingle(),
        ]);

        setConversations(convList.data || []);
        setStats({
          totalConversations: convCount.count ?? 0,
          totalMessages: msgCount.count ?? 0,
          streak: streakRes.data?.current_streak ?? 0,
          lastActive: streakRes.data?.last_active_date ?? "",
        });
      } catch (e) {
        console.error("Failed to load activity", e);
      } finally {
        setLoading(false);
      }
    };
    void fetchActivity();
  }, [userId]);

  const openChat = (conversationId: string) => {
    navigate(`/chatbot?conversation=${conversationId}`);
  };

  return (
    <SettingsStagger className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Conversations", value: stats.totalConversations, icon: MessageSquare, color: "text-blue-400" },
          { label: "Messages", value: stats.totalMessages, icon: Brain, color: "text-violet-400" },
          { label: "Day Streak", value: stats.streak > 0 ? `${stats.streak}🔥` : "0", icon: Zap, color: "text-amber-400" },
          {
            label: "Last Active",
            value: stats.lastActive
              ? formatDistanceToNow(new Date(stats.lastActive), { addSuffix: true })
              : "—",
            icon: Clock,
            color: "text-emerald-400",
          },
        ].map((stat) => (
          <Card key={stat.label} className="card-glass border-border/50">
            <CardContent className="p-4 text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
              <p className="text-lg font-bold truncate">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-glass border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Recent conversations
            </CardTitle>
            <CardDescription>Open any chat from your history</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/chatbot")}>
            New chat
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <Button className="mt-4" size="sm" onClick={() => navigate("/chatbot")}>
                Start chatting
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => openChat(conv.id)}
                  className="flex w-full items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title || "Untitled chat"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conv.updated_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SettingsStagger>
  );
};
