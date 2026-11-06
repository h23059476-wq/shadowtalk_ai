import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@/lib/backend-types';
import { backend, isConfigured } from '@/integrations/local/client';
import { syncProfile } from '@/lib/authProfile';
import { resolvePlanFromCheckSubscription, type UserPlan } from '@/lib/resolveUserPlan';

import {
  clearExplicitSignOut,
  isAnonymousUser,
  markExplicitSignOut,
} from '@/lib/persistentAuth';
import { clearUserLocalData } from '@/lib/signOutCleanup';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOffline: boolean;
  isAnonymous: boolean;
  userPlan: UserPlan;
  subscribed: boolean;
  subscriptionEnd: string | null;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Convert a cloud auth session into our local Session type. */
function toLocalSession(cloudSession: any): Session | null {
  if (!cloudSession) return null;
  return {
    access_token: cloudSession.access_token,
    refresh_token: cloudSession.refresh_token,
    token_type: cloudSession.token_type,
    expires_in: cloudSession.expires_in,
    expires_at: cloudSession.expires_at,
    user: {
      id: cloudSession.user?.id || '',
      email: cloudSession.user?.email || null,
      is_anonymous: cloudSession.user?.is_anonymous ?? false,
      app_metadata: cloudSession.user?.app_metadata || {},
      user_metadata: cloudSession.user?.user_metadata || {},
      aud: cloudSession.user?.aud || 'authenticated',
      created_at: cloudSession.user?.created_at || new Date().toISOString(),
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<UserPlan>('free');
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const initDone = useRef(false);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
    setUser(next?.user ?? null);
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await backend.auth.getUser();
      if (!user?.email) {
        // Anonymous/guest users are always on the free plan.
        setSubscribed(false);
        setUserPlan('free');
        setSubscriptionEnd(null);
        return;
      }

      // 1) Billing source of truth: subscribers row (written by admin/server).
      let subData: { subscribed?: boolean; plan?: string; product_id?: string; subscription_end?: string | null } | null = null;
      try {
        const { data } = await backend
          .from('subscribers')
          .select('plan, subscribed, product_id, subscription_end')
          .eq('user_id', user.id)
          .maybeSingle();
        subData = (data as any) ?? null;
      } catch {
        // subscribers table may not have a row yet — fall through to profile.
      }

      // 2) Fallback: server-managed plan on the profile document.
      if (!subData) {
        try {
          const { data } = await backend
            .from('profiles')
            .select('plan, subscription_end')
            .eq('id', user.id)
            .maybeSingle();
          if (data?.plan && data.plan !== 'free') {
            subData = {
              subscribed: true,
              plan: data.plan,
              subscription_end: (data as any).subscription_end ?? null,
            };
          }
        } catch {
          // Profile missing — treat as free.
        }
      }

      const resolved = resolvePlanFromCheckSubscription(user.email, subData);
      setUserPlan(resolved.plan);
      setSubscribed(resolved.subscribed);
      setSubscriptionEnd(resolved.subscriptionEnd);
    } catch (err) {
      console.warn('[Auth] checkSubscription failed:', err);
      setSubscribed(false);
      setUserPlan('free');
      setSubscriptionEnd(null);
    }
  }, []);

  // Batch 3: track the uid whose profile/subscription we last synced so the
  // duplicate onAuthStateChange('SIGNED_IN', sameUser) callback that fires right
  // after getSession() does NOT re-run syncProfile + checkSubscription (~6
  // extra Firestore ops per boot). The previous guard checked for an
  // 'INITIAL_SESSION' event that the Firebase adapter never emits, so it was
  // dead code. This uid-comparison guard is correct for any adapter.
  const lastSyncedUid = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const hydrate = (fbSession: any) => {
      if (!mounted) return;
      const local = toLocalSession(fbSession);
      applySession(local);
      const uid = local?.user?.id ?? null;
      if (uid && uid !== lastSyncedUid.current) {
        lastSyncedUid.current = uid;
        clearExplicitSignOut();
        if (typeof localStorage !== "undefined") localStorage.removeItem("shadowtalk-local-user");
        void syncProfile(uid, {
          email: local.user.email || undefined,
          display_name: (local.user.user_metadata as any)?.display_name || undefined,
        });
        void checkSubscription();
      } else if (!uid) {
        lastSyncedUid.current = null;
        setUserPlan('free');
        setSubscribed(false);
        setSubscriptionEnd(null);
      }
    };

    const bootstrap = async () => {
      try {
        const { data: { session: cloudSession } } = await backend.auth.getSession();
        if (!mounted) return;
        hydrate(cloudSession ?? null);

        const { data } = backend.auth.onAuthStateChange((event: string, next: any) => {
          if (!mounted) return;
          // The Firebase adapter emits 'SIGNED_IN' / 'SIGNED_OUT' (never
          // 'INITIAL_SESSION'). hydrate()'s uid guard already dedupes the
          // post-getSession() 'SIGNED_IN' callback for the same user.
          void event;
          hydrate(next?.user ? next : null);
        });
        if (mounted) authSubscription = data?.subscription ?? null;
      } catch (error) {
        console.warn('[Auth] session bootstrap failed:', error);
        if (mounted) {
          applySession(null);
          setUserPlan('free');
          setSubscribed(false);
          setSubscriptionEnd(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          initDone.current = true;
        }
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, [applySession, checkSubscription]);

  const signOut = async () => {
    // Capture the uid BEFORE Firebase signs out (currentUser becomes null
    // after backend.auth.signOut()). Used to scope ephemeral cleanup.
    const uid = user?.id ?? null;
    markExplicitSignOut();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('shadowtalk-local-user');
    }
    // Batch 3: clear only EPHEMERAL user-scoped state (E2EE session keys).
    // BYOK, persistent memory, and E2EE salt/fingerprint are PRESERVED.
    try {
      clearUserLocalData(uid);
    } catch (err) {
      console.warn('[Auth] clearUserLocalData error:', err);
    }
    try {
      await backend.auth.signOut();
    } catch (err) {
      console.warn('[Auth] signOut error:', err);
    }

    applySession(null);
    setUserPlan('free');
    setSubscribed(false);
    setSubscriptionEnd(null);
  };


  const value = {
    user,
    session,
    loading,
    isOffline,
    isAnonymous: isAnonymousUser(session),
    userPlan,
    subscribed,
    subscriptionEnd,
    signOut,
    checkSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
