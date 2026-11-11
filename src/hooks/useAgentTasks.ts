import { useState, useEffect, useCallback } from 'react';
import { backend } from '@/integrations/local/client';

export interface TaskStep {
  id: string;
  action: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: string;
  duration?: number;
}

export interface AgentTask {
  id: string;
  user_id: string;
  goal: string;
  status: "idle" | "planning" | "executing" | "paused" | "completed" | "failed";
  steps: TaskStep[];
  startTime?: string;
  endTime?: string;
  logs: string[];
  executor_device_id: string;
  created_at?: string;
}

export const useAgentTasks = (deviceId: string) => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { user } } = await backend.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const sub = backend.from('agent_tasks').onSnapshot(
          { 
            filter: { field: 'user_id', op: '==', value: user.id }
          },
          (snapshot) => {
            if (!isMounted) return;
            const updatedTasks = snapshot.docs.map(d => d.data as AgentTask);
            // Sort by created_at desc
            updatedTasks.sort((a, b) => 
              (b.created_at || '').localeCompare(a.created_at || '')
            );
            setTasks(updatedTasks);
            setIsLoading(false);
          },
          (err) => {
            console.error('[useAgentTasks] Snapshot error:', err);
            setIsLoading(false);
          }
        );
        unsubscribe = sub.unsubscribe;
      } catch (err) {
        console.error('[useAgentTasks] Init error:', err);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const createTask = useCallback(async (goal: string): Promise<AgentTask | null> => {
    try {
      const { data: { user } } = await backend.auth.getUser();
      if (!user) return null;

      const newTask: AgentTask = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
        user_id: user.id,
        goal,
        status: "planning",
        steps: [],
        logs: [`[${new Date().toLocaleTimeString()}] Starting task: ${goal}`],
        executor_device_id: deviceId,
        created_at: new Date().toISOString(),
        startTime: new Date().toISOString(),
      };

      await backend.from('agent_tasks').insert(newTask);
      return newTask;
    } catch (err) {
      console.error('[useAgentTasks] createTask error:', err);
      return null;
    }
  }, [deviceId]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<AgentTask>) => {
    try {
      await backend.from('agent_tasks').update(updates).eq('id', taskId);
    } catch (err) {
      console.error('[useAgentTasks] updateTask error:', err);
    }
  }, []);

  const addLog = useCallback(async (taskId: string, message: string) => {
    try {
      // In a real app we might use array-union, but for now we fetch, append, and update.
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const newLog = `[${new Date().toLocaleTimeString()}] ${message}`;
      const updatedLogs = [...(task.logs || []), newLog];
      
      await backend.from('agent_tasks').update({ logs: updatedLogs }).eq('id', taskId);
    } catch (err) {
      console.error('[useAgentTasks] addLog error:', err);
    }
  }, [tasks]);

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    addLog
  };
};
