import { useAuth } from '@/components/AuthProvider';
import { isFounderEmail } from '@/lib/resolveUserPlan';

/**
 * Admin panel gate — restricted to the founder account email ONLY
 * (zain@shadowtalk-ai.com), enforced against the signed-in user's verified
 * ID token email. No Firestore round-trip and no role document needed;
 * server-side Firestore rules mirror the same founder-email check, so the
 * panel's privileged reads (profiles, conversations, messages, analytics)
 * are gated by the identical condition.
 */
export const useAdminCheck = () => {
  const { user, loading } = useAuth();
  const isAdmin = isFounderEmail(user?.email ?? null);
  return { isAdmin, loading };
};
