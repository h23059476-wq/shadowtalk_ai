import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, BookOpen, Flame, Search, Trash2, Pin, PinOff,
  ChevronRight, Eye, X, TrendingUp, Lightbulb, Target, Star,
  Database, Clock, Tag, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemoryPanel } from '@/components/chat/MemoryPanel';
import { useIntelligenceHub, type AIMemory, type DailyInsight, type KnowledgeEntry, type UserStreak } from '@/hooks/useIntelligenceHub';

interface IntelligenceHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ isOpen, onClose }) => {
  const {
    memories, insights, knowledgeEntries, streak,
    unreadInsights, markInsightRead, togglePinInsight,
    searchKnowledge, deleteMemory, deleteKnowledgeEntry,
    isSynthesizing,
  } = useIntelligenceHub();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchKnowledge(searchQuery);
  }, [searchQuery, searchKnowledge]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 320 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 320 }}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] z-50 bg-card/95 backdrop-blur-xl border-l border-border flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Intelligence Hub</h2>
                <p className="text-[10px] text-muted-foreground">Your AI second brain</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Streak Banner */}
          {streak && streak.current_streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-400">
                    {streak.current_streak} day streak
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Best: {streak.longest_streak}d</span>
                  <span>Total: {streak.total_active_days}d</span>
                  <Badge variant="outline" className="text-[10px] h-4 text-amber-400 border-amber-500/30">
                    {streak.streak_multiplier.toFixed(1)}x
                  </Badge>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <StatBox icon={Brain} label="Memories" value={memories.length} color="text-violet-400" />
            <StatBox icon={Lightbulb} label="Insights" value={unreadInsights} color="text-amber-400" badge />
            <StatBox icon={BookOpen} label="Knowledge" value={knowledgeEntries.length} color="text-cyan-400" />
            <StatBox icon={Flame} label="Streak" value={streak?.current_streak || 0} color="text-orange-400" />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 grid grid-cols-4 h-8">
            <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
            <TabsTrigger value="memory" className="text-[10px]">Memory</TabsTrigger>
            <TabsTrigger value="insights" className="text-[10px]">
              Insights {unreadInsights > 0 && <span className="ml-1 text-primary">•</span>}
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-[10px]">Knowledge</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 mt-2">
            <TabsContent value="overview" className="mt-0 pb-4">
              <OverviewTab memories={memories} insights={insights} knowledge={knowledgeEntries} streak={streak} />
            </TabsContent>

            <TabsContent value="memory" className="mt-0 pb-4 space-y-4">
              <MemoryPanel />
              <MemoryTab memories={memories} onDelete={deleteMemory} />
            </TabsContent>

            <TabsContent value="insights" className="mt-0 pb-4">
              <InsightsTab 
                insights={insights} 
                isSynthesizing={isSynthesizing}
                onRead={markInsightRead} 
                onPin={togglePinInsight} 
              />
            </TabsContent>

            <TabsContent value="knowledge" className="mt-0 pb-4">
              <KnowledgeTab
                entries={knowledgeEntries}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchResults={searchResults}
                onDelete={deleteKnowledgeEntry}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Sub-components ───

const StatBox = ({ icon: Icon, label, value, color, badge }: {
  icon: React.ElementType; label: string; value: number; color: string; badge?: boolean;
}) => (
  <div className="p-2 rounded-lg bg-muted/30 text-center">
    <Icon className={`h-3.5 w-3.5 mx-auto ${color}`} />
    <div className="text-sm font-bold mt-0.5">{value}</div>
    <div className="text-[9px] text-muted-foreground">{label}</div>
  </div>
);

const OverviewTab = ({ memories, insights, knowledge, streak }: {
  memories: AIMemory[]; insights: DailyInsight[]; knowledge: KnowledgeEntry[]; streak: UserStreak | null;
}) => {
  const recentMemories = memories.slice(0, 3);
  const unreadInsights = insights.filter(i => !i.is_read).slice(0, 3);
  const recentKnowledge = knowledge.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Intelligence Score */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">Intelligence Score</span>
          <Star className="h-4 w-4 text-primary" />
        </div>
        <div className="text-3xl font-bold text-primary">
          {Math.min(100, memories.length * 2 + knowledge.length + (streak?.total_active_days || 0))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          The more you use ShadowTalk, the smarter it gets for you
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, memories.length * 2 + knowledge.length)}%` }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
          />
        </div>
      </div>

      {/* Lock-in message */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-center">
          <span className="text-muted-foreground">ShadowTalk has learned </span>
          <span className="font-bold text-primary">{memories.length} things</span>
          <span className="text-muted-foreground"> about you. Switching to ChatGPT means </span>
          <span className="font-bold text-destructive">starting from zero</span>
        </p>
      </div>

      {/* Recent Memories */}
      {recentMemories.length > 0 && (
        <Section title="Recent Memories" icon={Brain} color="text-violet-400">
          {recentMemories.map(m => (
            <MiniCard key={m.id} label={m.content} badge={m.category} />
          ))}
        </Section>
      )}

      {/* Unread Insights */}
      {unreadInsights.length > 0 && (
        <Section title="New Insights" icon={Lightbulb} color="text-amber-400">
          {unreadInsights.map(i => (
            <MiniCard key={i.id} label={i.title} badge={i.category} />
          ))}
        </Section>
      )}

      {/* Recent Knowledge */}
      {recentKnowledge.length > 0 && (
        <Section title="Knowledge Base" icon={BookOpen} color="text-cyan-400">
          {recentKnowledge.map(k => (
            <MiniCard key={k.id} label={k.title} badge={k.entry_type} />
          ))}
        </Section>
      )}
    </div>
  );
};

const Section = ({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-xs font-medium">{title}</span>
    </div>
    <div className="space-y-1">{children}</div>
  </div>
);

const MiniCard = ({ label, badge }: { label: string; badge: string }) => (
  <div className="p-2 rounded-lg bg-muted/30 flex items-center justify-between gap-2">
    <span className="text-xs truncate">{label}</span>
    <Badge variant="outline" className="text-[9px] h-4 shrink-0">{badge}</Badge>
  </div>
);

const MemoryTab = ({ memories, onDelete }: { memories: AIMemory[]; onDelete: (id: string) => void }) => {
  const grouped = useMemo(() => {
    const groups: Record<string, AIMemory[]> = {};
    memories.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [memories]);

  if (memories.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No memories yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Start chatting and I'll automatically learn about you
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Auto-learned from your conversations. The more you chat, the smarter ShadowTalk becomes.
      </p>
      {Object.entries(grouped).map(([category, mems]) => (
        <div key={category}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Tag className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{category}</span>
            <Badge variant="outline" className="text-[9px] h-4 ml-auto">{mems.length}</Badge>
          </div>
          <div className="space-y-1">
            {mems.map(m => (
              <div key={m.id} className="p-2.5 rounded-lg bg-muted/30 group flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{m.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground">
                      Referenced {m.times_referenced}x
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {m.confidence > 0.9 ? '🟢' : m.confidence > 0.7 ? '🟡' : '🔴'} {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => onDelete(m.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const InsightsTab = ({ insights, isSynthesizing, onRead, onPin }: {
  insights: DailyInsight[]; 
  isSynthesizing?: boolean;
  onRead: (id: string) => void; 
  onPin: (id: string) => void;
}) => {
  const pinned = insights.filter(i => i.is_pinned);
  const recent = insights.filter(i => !i.is_pinned);

  if (isSynthesizing && insights.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-12 text-center animate-pulse">
          <Lightbulb className="h-10 w-10 mx-auto text-primary/40 mb-3 animate-pulse" />
          <p className="text-sm font-medium text-primary/70">Synthesizing your daily insights...</p>
          <p className="text-xs text-muted-foreground mt-1">Analyzing your recent activity to generate personalized intelligence</p>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="p-3 rounded-lg border bg-muted/20 border-border/30 animate-pulse">
            <div className="h-4 bg-muted/40 rounded w-2/3 mb-2" />
            <div className="h-3 bg-muted/30 rounded w-full mb-1" />
            <div className="h-3 bg-muted/30 rounded w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No insights yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          ShadowTalk will push personalized insights based on your activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pinned.length > 0 && (
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400">📌 Pinned</span>
          <div className="space-y-2 mt-1.5">
            {pinned.map(i => (
              <InsightCard key={i.id} insight={i} onRead={onRead} onPin={onPin} />
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {recent.map(i => (
          <InsightCard key={i.id} insight={i} onRead={onRead} onPin={onPin} />
        ))}
      </div>
    </div>
  );
};

const InsightCard = ({ insight, onRead, onPin }: {
  insight: DailyInsight; onRead: (id: string) => void; onPin: (id: string) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-3 rounded-lg border ${!insight.is_read ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/50'}`}
    onClick={() => !insight.is_read && onRead(insight.id)}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          {!insight.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          <span className="text-xs font-medium">{insight.title}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{insight.content}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-[9px] h-4">{insight.category}</Badge>
          <span className="text-[9px] text-muted-foreground">
            {new Date(insight.generated_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); onPin(insight.id); }}>
        {insight.is_pinned ? <PinOff className="h-3 w-3 text-amber-400" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
      </Button>
    </div>
  </motion.div>
);

const KnowledgeTab = ({ entries, searchQuery, onSearchChange, searchResults, onDelete }: {
  entries: KnowledgeEntry[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResults: KnowledgeEntry[];
  onDelete: (id: string) => void;
}) => {
  const displayed = searchQuery.trim() ? searchResults : entries;
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => e.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search your knowledge graph..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Tag cloud */}
      {tagCounts.length > 0 && !searchQuery && (
        <div className="flex flex-wrap gap-1">
          {tagCounts.map(([tag, count]) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[9px] h-5 cursor-pointer hover:bg-primary/10"
              onClick={() => onSearchChange(tag)}
            >
              {tag} ({count})
            </Badge>
          ))}
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="text-center py-8">
          <Database className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">
            {searchQuery ? 'No results found' : 'Your knowledge base will grow as you chat'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg bg-muted/30 border border-border/50 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{entry.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{entry.content.slice(0, 150)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] h-4">{entry.entry_type}</Badge>
                    {entry.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[9px] text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => onDelete(entry.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Knowledge stats */}
      {entries.length > 0 && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <p className="text-xs">
            <span className="font-bold text-primary">{entries.length}</span>
            <span className="text-muted-foreground"> knowledge entries that only ShadowTalk has</span>
          </p>
        </div>
      )}
    </div>
  );
};
