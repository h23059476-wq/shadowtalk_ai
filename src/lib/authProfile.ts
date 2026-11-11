/**
 * Profile sync — creates / updates a user profile document in Firestore.
 *
 * This was previously a no-op left over from the Supabase-era "local-only mode".
 * On the Firebase backend, the profiles collection is the source of truth for
 * user display name, avatar, email, and plan. Without syncing, the
 * AuthProvider's checkSubscription() can never find a profile row and every
 * user is permanently stuck on the "free" plan — even after paying.
 *
 * Security: the firestore.rules allow a user to create their own profile
 * (with plan: 'free') and update non-plan fields. Plan changes are
 * admin-only, so we never write the `plan` field here.
 */
import { doc, getDoc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import { fbDb } from '@/integrations/firebase/app';

export interface ProfileFields {
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * Ensure a profile document exists for the given user, and update any
 * provided fields. Never overwrites `plan` (admin-only field).
 *
 * This function is safe to call on every auth state change — it uses
 * setDoc with merge:true so it won't clobber existing data.
 */
export async function syncProfile(userId: string, fields: ProfileFields): Promise<void> {
  if (!userId) return;

  try {
    const db: Firestore = fbDb();
    const ref = doc(db, 'profiles', userId);

    // Build the update payload — only include defined fields.
    const update: Record<string, any> = {
      id: userId,
      updated_at: serverTimestamp(),
    };
    if (fields.email !== undefined) update.email = fields.email;
    if (fields.display_name !== undefined) update.display_name = fields.display_name;
    if (fields.avatar_url !== undefined) update.avatar_url = fields.avatar_url;

    // Check if the profile already exists so we know whether to set created_at.
    // Using getDoc first avoids clobbering created_at on subsequent syncs.
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      update.created_at = serverTimestamp();
      // New profiles always start on the free plan. The firestore.rules
      // enforce that only admins can change this field, so we set it once
      // at creation time.
      update.plan = 'free';
    }

    await setDoc(ref, update, { merge: true });

    const publicUpdate: Record<string, any> = { user_id: userId, updated_at: serverTimestamp() };
    if (fields.display_name !== undefined) publicUpdate.display_name = fields.display_name;
    if (fields.avatar_url !== undefined) publicUpdate.avatar_url = fields.avatar_url;
    await setDoc(doc(db, 'public_profiles', userId), publicUpdate, { merge: true });
  } catch (err) {
    // Profile sync is best-effort — it must never block the auth flow.
    // A missing profile just means the user appears as "free" until the
    // next sync succeeds.
    console.warn('[authProfile] syncProfile failed (non-fatal):', err);
  }
}
