/**
 * Integration OAuth — no-op in local-only mode.
 */

export type IntegrationProvider = "google" | "github" | "slack" | "notion";

export type OAuthConnectResult = {
  ok: boolean;
  provider?: IntegrationProvider;
  error?: string;
  redirecting?: boolean;
};

export function getLinkedProfileUrl(): string {
  return `${window.location.origin}/profile?tab=linked`;
}

export async function connectIntegration(
  provider: IntegrationProvider,
  _scope?: string,
): Promise<OAuthConnectResult> {
  return { ok: false, error: `${provider} integration requires a cloud backend. Not available in local-only mode.` };
}

export function openOAuthPopup(_authUrl: string, _provider: IntegrationProvider): Promise<OAuthConnectResult> {
  return Promise.resolve({ ok: false, error: 'OAuth not available in local-only mode' });
}

export async function disconnectIntegration(_provider: IntegrationProvider): Promise<void> {
  // No-op
}

export async function fetchConnectedIntegrations(): Promise<{
  oauth: string[];
  whatsapp: boolean;
}> {
  return { oauth: [], whatsapp: false };
}

export async function upsertVaultConnection(_provider: IntegrationProvider): Promise<void> {
  // No-op
}
