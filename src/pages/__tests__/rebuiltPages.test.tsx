import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBusinessMemory } from '@/hooks/useBusinessMemory';
import { useShadowMemory } from '@/hooks/useShadowMemory';

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Rebuilt Production Pages Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Note: The "Route Definitions in App.tsx" test was removed because it
  // asserted legacy routes (/workspace, /analytics, /shadow-memory) that
  // were removed in the v3.0.0 architecture pivot. The App.tsx now uses
  // /chatbot as the single workspace entry point. The hook tests below
  // still verify the underlying engines work correctly.

  describe('useBusinessMemory (Engine for /workspace)', () => {
    it('initializes and provides default categories and context snippet', async () => {
      const { result } = renderHook(() => useBusinessMemory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(Array.isArray(result.current.memories)).toBe(true);

      // Load starter templates
      await act(async () => {
        await result.current.loadExampleTemplate();
      });

      expect(result.current.memories.length).toBeGreaterThanOrEqual(4);

      // Verify categories exist
      const categories = result.current.memories.map((m) => m.category);
      expect(categories).toContain('profile');
      expect(categories).toContain('voice');
      expect(categories).toContain('customers');
      expect(categories).toContain('facts');

      // Verify AI context snippet builder
      const snippet = result.current.getMemoryContext();
      expect(snippet).toContain('BUSINESS MEMORY');
      expect(snippet).toContain('ShadowTalk AI');

      // Test addMemory
      await act(async () => {
        await result.current.addMemory({
          title: 'Custom Engineering Rule',
          category: 'facts',
          content: 'Always provide clean markdown code blocks with syntax highlighting.',
          priority: 9,
        });
      });

      const found = result.current.memories.find((m) => m.title === 'Custom Engineering Rule');
      expect(found).toBeDefined();
      expect(found?.content).toBe('Always provide clean markdown code blocks with syntax highlighting.');

      // Test deleteMemory
      if (found) {
        await act(async () => {
          await result.current.deleteMemory(found.id);
        });
        const remaining = result.current.memories.find((m) => m.title === 'Custom Engineering Rule');
        expect(remaining).toBeUndefined();
      }
    });
  });

  describe('useShadowMemory (Engine for /shadow-memory)', () => {
    it('manages on-device activity ledger and exports in JSON, CSV, and logs format', async () => {
      const { result } = renderHook(() => useShadowMemory());

      await act(async () => {
        await result.current.log('chat', 'Audit Chat Session', 'Tested reasoning engine', { test: true });
        await result.current.log('vault', 'Audit Vault File Stored', 'Encrypted file locally');
      });

      const activities = await result.current.getActivities();
      expect(activities.length).toBeGreaterThanOrEqual(2);

      const stats = await result.current.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);

      // Verify JSON export
      const jsonStr = await result.current.exportJSON();
      const parsed = JSON.parse(jsonStr);
      expect(Array.isArray(parsed)).toBe(true);

      // Verify CSV export
      const csvStr = await result.current.exportCSV();
      expect(csvStr).toContain('id,category,action,detail,timestamp');
      expect(csvStr).toContain('Audit Chat Session');

      // Verify plaintext log export
      const logStr = await result.current.exportLogs();
      expect(logStr).toContain('[CHAT] Audit Chat Session');
    });
  });
});
