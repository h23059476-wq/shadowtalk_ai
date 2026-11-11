import { useState, useEffect, useCallback } from 'react';
import { backend } from '@/integrations/local/client';
import { useAuth } from '@/components/AuthProvider';

export function useUserSettings<T = any>(settingKey: string, defaultValue: T) {
  const { user } = useAuth();
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load from DB, fallback to localStorage
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (!user) {
      // For unauthenticated users, use localStorage
      try {
        const stored = localStorage.getItem(`shadowtalk_${settingKey}`);
        if (stored) setValue(JSON.parse(stored));
      } catch { /* ignore */ }
      setIsLoading(false);
      return;
    }

    const load = () => {
      try {
        const sub = backend
          .from('user_settings')
          .onSnapshot(
            { 
              filter: { 
                and: [
                  { field: 'user_id', op: '==', value: user.id },
                  { field: 'setting_key', op: '==', value: settingKey }
                ]
              } 
            },
            async (snapshot) => {
              if (snapshot.docs.length > 0) {
                const data = snapshot.docs[0].data;
                setValue(data.setting_value as T);
              } else {
                // Migrate from localStorage if exists
                // Signed-in settings must never fall back to the anonymous,
                // browser-wide value: it may belong to a different account.
                const stored = localStorage.getItem(`shadowtalk_${settingKey}_${user.id}`)
                  || localStorage.getItem(`custom_instructions_${user.id}`);
                if (stored && settingKey === 'custom_instructions') {
                  const parsed = JSON.parse(stored);
                  setValue(parsed as T);
                  // Save to DB
                  await backend.from('user_settings').upsert({
                    user_id: user.id,
                    setting_key: settingKey,
                    setting_value: parsed,
                  }, { onConflict: 'user_id,setting_key' });
                }
              }
              setIsLoading(false);
            },
            (e) => {
              console.error(`[UserSettings] Failed to load ${settingKey}:`, e);
              setIsLoading(false);
            }
          );
        unsubscribe = sub.unsubscribe;
      } catch (e) {
        console.error(`[UserSettings] Setup error for ${settingKey}:`, e);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, settingKey]);

  const save = useCallback(async (newValue: T) => {
    setValue(newValue);
    
    if (!user) {
      localStorage.setItem(`shadowtalk_${settingKey}_guest`, JSON.stringify(newValue));
      return;
    }

    setIsSaving(true);
    try {
      await backend.from('user_settings').upsert({
        user_id: user.id,
        setting_key: settingKey,
        setting_value: newValue as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,setting_key' });
    } catch (e) {
      console.error(`[UserSettings] Failed to save ${settingKey}:`, e);
      // Fallback to localStorage
      localStorage.setItem(`shadowtalk_${settingKey}`, JSON.stringify(newValue));
    }
    setIsSaving(false);
  }, [user, settingKey]);

  return { value, save, isLoading, isSaving };
}
