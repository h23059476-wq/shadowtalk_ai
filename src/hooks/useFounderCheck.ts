import { useAuth } from "@/components/AuthProvider";
import { isFounderEmail } from "@/lib/resolveUserPlan";

/**
 * Founder gate — restricted to the founder account email ONLY
 * (zain@shadowtalk-ai.com), checked against the signed-in user's email.
 * Server-side Firestore rules (isFounder()) enforce the identical
 * founder-email condition for privileged reads, so client and server
 * agree on exactly one account.
 */
export const useFounderCheck = () => {
  const { user, loading } = useAuth();
  const isFounder = isFounderEmail(user?.email ?? null);
  return { isFounder, loading };
};
