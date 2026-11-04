import { useState, useEffect } from "react";
import { backend } from "@/integrations/local/client";
import { useAuth } from "@/components/AuthProvider";
import { isFounderEmail } from "@/lib/resolveUserPlan";

export const useFounderCheck = () => {
  const { user, session } = useAuth();
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user || !session) { setIsFounder(false); setLoading(false); return; }
      if (isFounderEmail(user.email)) { setIsFounder(true); setLoading(false); return; }
      setLoading(true);
      try {
        const { data, error } = await backend.from("user_roles").select("role").eq("user_id", user.id).eq("role", "founder").maybeSingle();
        if (!active) return;
        setIsFounder(!error && !!data);
      } catch { if (active) setIsFounder(false); }
      finally { if (active) setLoading(false); }
    };
    void check();
    return () => { active = false; };
  }, [user?.id, !!session]);

  return { isFounder, loading };
};
