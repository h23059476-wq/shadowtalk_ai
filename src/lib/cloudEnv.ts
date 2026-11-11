/** Build-time ShadowTalk backend config.
 * Local-only mode — all functions return empty strings / false.
 */

/** Always returns empty string in local-only mode. */
export function getApiBaseUrl(): string {
  return "";
}

/** Always returns empty string since API keys are now on the backend. */
export function getApiKey(): string {
  return "";
}

/** Returns true since cloud is now configured via Firebase Functions. */
export function isCloudConfigured(): boolean {
  return true;
}

/** Returns the URL for the chat function. */
export function getChatFunctionUrl(): string {
  return "";
}

/** Returns the URL for a specific Firebase Cloud Function. */
export function getFirebaseFunctionUrl(functionName: string): string {
  if (import.meta.env.DEV) {
    return `http://127.0.0.1:5001/shadowtalk-ai-7a513/us-central1/${functionName}`;
  }
  return `https://us-central1-shadowtalk-ai-7a513.cloudfunctions.net/${functionName}`;
}

/** Returns headers including the Firebase Auth token. */
export function getChatFetchHeaders(accessToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

export const DESKTOP_ENV_SETUP_HINT =
  "ShadowTalk runs in local-only mode. Configure keys in Settings for cloud inference.";

/** Format a fetch error for display. */
export function formatChatFetchError(err: unknown): string {
  const msg =
    err instanceof Error ? err.message : "Error connecting to chat service.";
  if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
    return (
      "Could not reach the chat service. Check your internet connection and settings."
    );
  }
  return msg;
}
