import { useState, useEffect, useCallback } from 'react';
import { backend } from '@/integrations/local/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export type MemoryCategory = 'profile' | 'voice' | 'customers' | 'facts';

export interface BusinessMemory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryFormData {
  category: MemoryCategory;
  title: string;
  content: string;
  priority?: number;
}

export const MEMORY_CATEGORIES: { id: MemoryCategory; label: string; description: string; icon: string }[] = [
  { id: 'profile', label: 'Business Profile', description: 'Company name, industry, mission, values, products/services', icon: '🏢' },
  { id: 'voice', label: 'Brand Voice', description: 'Tone, style, key phrases, terminology to use/avoid', icon: '🎤' },
  { id: 'customers', label: 'Customer Context', description: 'Target audience, pain points, FAQs, common objections', icon: '👥' },
  { id: 'facts', label: 'Custom Facts', description: 'Free-form facts and operational notes the AI should know', icon: '📝' },
];

const GUEST_LOCAL_STORAGE_KEY = 'shadowtalk_business_memories';
const localStorageKey = (userId?: string) => userId
  ? `${GUEST_LOCAL_STORAGE_KEY}.${userId}`
  : GUEST_LOCAL_STORAGE_KEY;

export const SAMPLE_BUSINESS_MEMORIES: MemoryFormData[] = [
  {
    category: 'profile',
    title: 'Company Overview',
    content: 'ShadowTalk AI — An elite, distraction-free agentic workspace powering on-device privacy, intelligent routing, and personalized execution.',
    priority: 10,
  },
  {
    category: 'voice',
    title: 'Brand Tone & Communication Style',
    content: 'Concise, authoritative, modern, and deeply technical yet accessible. Avoid robotic boilerplate. Be decisive and precise.',
    priority: 8,
  },
  {
    category: 'customers',
    title: 'Target Audience Profile',
    content: 'Software engineers, AI researchers, founders, and cybersecurity professionals seeking fast, private, and capable agentic intelligence.',
    priority: 7,
  },
  {
    category: 'facts',
    title: 'Core Architecture Guardrails',
    content: 'Always prefer local execution and privacy-first pipelines. Never leak proprietary user data or external keys.',
    priority: 9,
  },
];

function readLocalMemories(userId?: string): BusinessMemory[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(localStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalMemories(memories: BusinessMemory[], userId?: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(localStorageKey(userId), JSON.stringify(memories));
  } catch {
    /* ignore storage quota errors */
  }
}

export function useBusinessMemory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState<BusinessMemory[]>([]);
  const [loadedUid, setLoadedUid] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMemories = useCallback(async () => {
    const local = readLocalMemories(user?.id);
    setMemories(local);
    setLoadedUid(user?.id ?? null);
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await backend
        .from('business_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const remoteMemories = data as unknown as BusinessMemory[];
        if (remoteMemories.length > 0) {
          setMemories(remoteMemories);
          writeLocalMemories(remoteMemories, user.id);
        } else {
          // Use only this account's local cache when the remote has no rows.
          setMemories(local);
        }
      } else {
        setMemories(local);
      }
    } catch (error) {
      console.warn('Error fetching remote business memories, using local cache:', error);
      setMemories(local);
    } finally {
      setLoadedUid(user?.id ?? null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const addMemory = async (data: MemoryFormData): Promise<boolean> => {
    setSaving(true);
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const newMemory: BusinessMemory = {
      id,
      user_id: user?.id || 'local-user',
      category: data.category,
      title: data.title.trim(),
      content: data.content.trim(),
      priority: data.priority || 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    try {
      // 1. Optimistically write to local state and storage
      const updated = [newMemory, ...memories];
      setMemories(updated);
      writeLocalMemories(updated, user?.id);

      // 2. Persist to Firestore if user is authenticated
      if (user && !user.id.startsWith('local-')) {
        await backend.from('business_memories').insert({
          id: newMemory.id,
          user_id: user.id,
          category: newMemory.category,
          title: newMemory.title,
          content: newMemory.content,
          priority: newMemory.priority,
          is_active: true,
        }).catch((e: any) => console.warn('Remote sync failed:', e));
      }

      toast({
        title: 'Memory Saved',
        description: `"${newMemory.title}" is now active in your AI workspace context.`,
      });
      return true;
    } catch (error: any) {
      console.error('Error adding memory:', error);
      toast({
        title: 'Save Warning',
        description: 'Saved locally on this device.',
      });
      return true;
    } finally {
      setSaving(false);
    }
  };

  const updateMemory = async (id: string, data: Partial<MemoryFormData & { is_active: boolean }>): Promise<boolean> => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updated = memories.map((m) =>
        m.id === id ? { ...m, ...data, updated_at: now } : m
      );
      setMemories(updated);
      writeLocalMemories(updated, user?.id);

      if (user && !user.id.startsWith('local-')) {
        await backend
          .from('business_memories')
          .update({ ...data, updated_at: now })
          .eq('id', id)
          .eq('user_id', user.id)
          .catch((e: any) => console.warn('Remote update failed:', e));
      }

      toast({
        title: 'Memory Updated',
        description: 'Business context updated successfully.',
      });
      return true;
    } catch (error) {
      console.error('Error updating memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to update memory',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteMemory = async (id: string): Promise<boolean> => {
    try {
      const updated = memories.filter((m) => m.id !== id);
      setMemories(updated);
      writeLocalMemories(updated, user?.id);

      if (user && !user.id.startsWith('local-')) {
        await backend
          .from('business_memories')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
          .catch((e: any) => console.warn('Remote delete failed:', e));
      }

      toast({
        title: 'Memory Deleted',
        description: 'Removed from AI context.',
      });
      return true;
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete memory',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleMemory = async (id: string): Promise<boolean> => {
    const memory = memories.find((m) => m.id === id);
    if (!memory) return false;
    return updateMemory(id, { is_active: !memory.is_active });
  };

  const loadExampleTemplate = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const seeded: BusinessMemory[] = SAMPLE_BUSINESS_MEMORIES.map((s, idx) => ({
        id: `sample-${Date.now()}-${idx}`,
        user_id: user?.id || 'local-user',
        category: s.category,
        title: s.title,
        content: s.content,
        priority: s.priority || 5,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));

      const combined = [...seeded, ...memories.filter((m) => !m.id.startsWith('sample-'))];
      setMemories(combined);
      writeLocalMemories(combined, user?.id);

      toast({
        title: 'Sample Profile Loaded',
        description: '4 starter memories loaded to demonstrate AI context customization.',
      });
      return true;
    } finally {
      setSaving(false);
    }
  };

  const visibleMemories = loadedUid === (user?.id ?? null) ? memories : [];

  const getActiveMemories = useCallback((): BusinessMemory[] => {
    return visibleMemories.filter((m) => m.is_active);
  }, [visibleMemories]);

  const getMemoriesByCategory = useCallback((category: MemoryCategory): BusinessMemory[] => {
    return visibleMemories.filter((m) => m.category === category);
  }, [visibleMemories]);

  const getMemoryContext = useCallback((): string => {
    const activeMemories = getActiveMemories();
    if (activeMemories.length === 0) return '';

    const sections: string[] = [];

    for (const category of MEMORY_CATEGORIES) {
      const categoryMemories = activeMemories.filter((m) => m.category === category.id);
      if (categoryMemories.length > 0) {
        sections.push(`### ${category.label}\n${categoryMemories.map((m) => `- **${m.title}**: ${m.content}`).join('\n')}`);
      }
    }

    return `## BUSINESS MEMORY (Use this context to personalize responses)\n\n${sections.join('\n\n')}`;
  }, [getActiveMemories]);

  return {
    memories: visibleMemories,
    loading,
    saving,
    addMemory,
    updateMemory,
    deleteMemory,
    toggleMemory,
    loadExampleTemplate,
    getActiveMemories,
    getMemoriesByCategory,
    getMemoryContext,
    refetch: fetchMemories,
  };
}
