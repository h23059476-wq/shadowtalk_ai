import { useState, useEffect, useCallback } from 'react';
import { backend } from '@/integrations/local/client';
import { useAuth } from '@/components/AuthProvider';

// ─── AI Memory System ───
export interface AIMemory {
  id: string;
  content: string;
  category: string;
  source: string;
  confidence: number;
  times_referenced: number;
  last_referenced_at: string;
  created_at: string;
}

// ─── Daily Insights ───
export interface DailyInsight {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  is_read: boolean;
  is_pinned: boolean;
  metadata: Record<string, unknown>;
  generated_at: string;
}

// ─── Knowledge Entry ───
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  entry_type: string;
  access_count: number;
  created_at: string;
}

// ─── Streak ───
export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  total_active_days: number;
  streak_multiplier: number;
}

export const useIntelligenceHub = () => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [insights, setInsights] = useState<DailyInsight[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(
    () => localStorage.getItem("shadowtalk_insights_synthesizing") === "true"
  );

  useEffect(() => {
    const handleStart = () => setIsSynthesizing(true);
    const handleFinish = () => {
      setIsSynthesizing(false);
      loadAll(); // Reload insights when synthesis is done
    };
    
    window.addEventListener("insights_synthesis_started", handleStart);
    window.addEventListener("insights_synthesis_finished", handleFinish);
    return () => {
      window.removeEventListener("insights_synthesis_started", handleStart);
      window.removeEventListener("insights_synthesis_finished", handleFinish);
    };
  }, []);

  // ─── Load all data ───
  const loadAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [memRes, insRes, knRes, stRes] = await Promise.all([
        backend.from('ai_memories').select('*').eq('user_id', user.id).order('last_referenced_at', { ascending: false }).limit(50),
        backend.from('daily_insights').select('*').eq('user_id', user.id).order('generated_at', { ascending: false }).limit(20),
        backend.from('knowledge_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        backend.from('user_streaks').select('*').eq('user_id', user.id).single(),
      ]);
      if (memRes.data) setMemories(memRes.data as AIMemory[]);
      if (insRes.data) setInsights(insRes.data as DailyInsight[]);
      if (knRes.data) setKnowledgeEntries(knRes.data as KnowledgeEntry[]);
      if (stRes.data) setStreak(stRes.data as UserStreak);
    } catch (e) {
      console.error('[IntelligenceHub] Load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Update streak on visit ───
  const updateStreak = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    if (streak) {
      const lastDate = streak.last_active_date;
      if (lastDate === today) return; // Already active today
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const newStreak = lastDate === yesterdayStr ? streak.current_streak + 1 : 1;
      const longestStreak = Math.max(newStreak, streak.longest_streak);
      const multiplier = Math.min(1 + (newStreak * 0.1), 3.0); // Max 3x
      
      await backend.from('user_streaks').update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_active_date: today,
        total_active_days: streak.total_active_days + 1,
        streak_multiplier: multiplier,
      }).eq('user_id', user.id);
      
      setStreak(prev => prev ? { ...prev, current_streak: newStreak, longest_streak: longestStreak, last_active_date: today, total_active_days: prev.total_active_days + 1, streak_multiplier: multiplier } : null);
    } else {
      // First ever visit — upsert to avoid 409 conflict on duplicate
      const { data } = await backend.from('user_streaks').upsert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: today,
        total_active_days: 1,
        streak_multiplier: 1.0,
      }, { onConflict: 'user_id' }).select().single();
      if (data) setStreak(data as UserStreak);
    }
  }, [user, streak]);

  useEffect(() => { updateStreak(); }, [user]); // Run once on mount

  // ─── Extract memories from AI response ───
  const extractMemories = useCallback(async (userMessage: string, aiResponse: string) => {
    if (!user) return;
    
    // Simple heuristic extraction — look for personal facts
    const patterns = [
      { regex: /(?:my name is|i'm called|call me)\s+([A-Z][a-z]+)/i, category: 'identity' },
      { regex: /(?:i work at|i'm at|my company is)\s+(.+?)(?:\.|,|$)/i, category: 'work' },
      { regex: /(?:i (?:prefer|like|love|use))\s+(.+?)(?:\.|,|$)/i, category: 'preference' },
      { regex: /(?:i'm (?:a|an))\s+(.+?)(?:\.|,|$)/i, category: 'identity' },
      { regex: /(?:my (?:project|app|product) is)\s+(.+?)(?:\.|,|$)/i, category: 'project' },
      { regex: /(?:i'm (?:working on|building|developing))\s+(.+?)(?:\.|,|$)/i, category: 'project' },
      { regex: /(?:i (?:need|want) to)\s+(.+?)(?:\.|,|$)/i, category: 'goal' },
      { regex: /(?:my (?:industry|field|sector) is)\s+(.+?)(?:\.|,|$)/i, category: 'work' },
    ];

    for (const { regex, category } of patterns) {
      const match = userMessage.match(regex);
      if (match && match[1]) {
        const content = `${match[0].trim()}`;
        // Check if similar memory exists
        const existing = memories.find(m => 
          m.content.toLowerCase().includes(match[1].toLowerCase()) && m.category === category
        );
        if (!existing) {
          const { data } = await backend.from('ai_memories').insert({
            user_id: user.id,
            content,
            category,
            source: 'auto',
            confidence: 0.85,
          }).select().single();
          if (data) {
            setMemories(prev => [data as AIMemory, ...prev]);
            import("@/lib/autoImprove/eventBus").then(({ publishAutoImproveEvent }) =>
              publishAutoImproveEvent("feature_open", { feature: "memory_extract", category })
            );
          }
        }
      }
    }
  }, [user, memories]);

  // ─── Extract knowledge from conversation ───
  const extractKnowledge = useCallback(async (userMessage: string, aiResponse: string, conversationId?: string) => {
    if (!user || aiResponse.length < 200) return; // Only extract from substantial responses
    
    // Extract key insights from AI responses
    const lines = aiResponse.split('\n').filter(l => l.trim().length > 20);
    const headings = lines.filter(l => l.startsWith('#') || l.startsWith('**'));
    
    if (headings.length > 0) {
      const title = headings[0].replace(/[#*]/g, '').trim().slice(0, 100);
      const tags = extractTags(userMessage + ' ' + aiResponse);
      
      // Don't duplicate
      const existing = knowledgeEntries.find(k => 
        k.title.toLowerCase() === title.toLowerCase()
      );
      if (!existing && title.length > 5) {
        const { data } = await backend.from('knowledge_entries').insert({
          user_id: user.id,
          title,
          content: aiResponse.slice(0, 2000),
          tags,
          entry_type: categorizeEntry(userMessage),
          source_conversation_id: conversationId || null,
        }).select().single();
        if (data) setKnowledgeEntries(prev => [data as KnowledgeEntry, ...prev]);
      }
    }
  }, [user, knowledgeEntries]);

  // ─── Get memory context for AI ───
  const getMemoryContext = useCallback(() => {
    if (memories.length === 0) return '';
    const topMemories = memories.slice(0, 10);
    return `\n[User Memory Bank - ${memories.length} memories]\n` +
      topMemories.map(m => `- ${m.content} (${m.category})`).join('\n') + '\n';
  }, [memories]);

  // ─── Mark insight as read ───
  const markInsightRead = useCallback(async (id: string) => {
    if (!user) return;
    await backend.from('daily_insights').update({ is_read: true }).eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
  }, [user]);

  // ─── Pin/unpin insight ───
  const togglePinInsight = useCallback(async (id: string) => {
    if (!user) return;
    const insight = insights.find(i => i.id === id);
    if (!insight) return;
    await backend.from('daily_insights').update({ is_pinned: !insight.is_pinned }).eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_pinned: !i.is_pinned } : i));
  }, [user, insights]);

  // ─── Search knowledge ───
  const searchKnowledge = useCallback((query: string) => {
    const q = query.toLowerCase();
    return knowledgeEntries.filter(k => 
      k.title.toLowerCase().includes(q) || 
      k.content.toLowerCase().includes(q) ||
      k.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [knowledgeEntries]);

  // ─── Delete memory ───
  const deleteMemory = useCallback(async (id: string) => {
    if (!user) return;
    await backend.from('ai_memories').delete().eq('id', id);
    setMemories(prev => prev.filter(m => m.id !== id));
  }, [user]);

  // ─── Delete knowledge entry ───
  const deleteKnowledgeEntry = useCallback(async (id: string) => {
    if (!user) return;
    await backend.from('knowledge_entries').delete().eq('id', id);
    setKnowledgeEntries(prev => prev.filter(k => k.id !== id));
  }, [user]);

  const unreadInsights = insights.filter(i => !i.is_read).length;

  return {
    memories, insights, knowledgeEntries, streak,
    isLoading, isSynthesizing, unreadInsights,
    extractMemories, extractKnowledge, getMemoryContext,
    markInsightRead, togglePinInsight, searchKnowledge,
    deleteMemory, deleteKnowledgeEntry, loadAll,
  };
};

// ─── Helpers ───
function extractTags(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'and', 'in', 'that', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'from', 'or', 'but', 'not', 'this', 'can', 'how', 'what', 'do', 'my', 'me', 'i']);
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
}

function categorizeEntry(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('code') || q.includes('function') || q.includes('bug')) return 'technical';
  if (q.includes('strategy') || q.includes('business') || q.includes('plan')) return 'strategy';
  if (q.includes('design') || q.includes('ui') || q.includes('ux')) return 'design';
  if (q.includes('research') || q.includes('study') || q.includes('data')) return 'research';
  return 'insight';
}
