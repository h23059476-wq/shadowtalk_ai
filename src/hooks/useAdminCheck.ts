import { useState, useEffect } from 'react';
import { backend } from '@/integrations/local/client';
import { useAuth } from '@/components/AuthProvider';

export const useAdminCheck = () => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const checkAdminStatus = async () => {
      if (!user || !session) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await backend
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!active) return;
        setIsAdmin(!error && !!data);
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    };

    void checkAdminStatus();
    return () => { active = false; };
  }, [user?.id, !!session]);

  return { isAdmin, loading };
};