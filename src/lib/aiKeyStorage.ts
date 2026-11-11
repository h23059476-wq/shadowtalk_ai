export type AiKeyStorageField = "cohort" | "api_key" | "onboarded" | "daily_usage";

/** A browser-storage key that cannot be shared across Firebase identities. */
export function aiKeyStorageKey(uid: string, field: AiKeyStorageField): string {
  return `shadowtalk_ai_v2.${uid}.${field}`;
}
