import { AIProvider } from "./AIProvider";
import { CloudAIProvider } from "./CloudAIProvider";
import { LocalAIProvider } from "./LocalAIProvider";
import { getPreferLocal } from "@/lib/aiAccessMode";

/**
 * Batch 4 — prefer-local wiring.
 *
 * Replaces the never-invoked `setPreferLocal` setter with a one-time read of
 * the user's UID-scoped `getPreferLocal()` flag inside `getBestProvider()`.
 * When true AND the local model is loaded (the user has run OfflineSetup),
 * the LocalAIProvider is preferred; otherwise the cloud provider is used
 * (preserving the BYOK-only architecture for the main chat path).
 *
 * The router is consumed by `useGlobalChat`, `imageEditorEngine.ts`, and
 * `PublicShadowTwinChat.tsx`. The main ChatbotPage does NOT use this router —
 * it calls `streamCloudChat` directly, so wiring prefer-local into the main
 * chat path is a separate, larger change and is intentionally out of scope
 * for Batch 4 (preserve existing working functionality).
 */
class AIProviderRouterImpl {
  private cloudProvider = new CloudAIProvider();
  private localProvider = new LocalAIProvider();

  async getBestProvider(): Promise<AIProvider> {
    const isOnline = navigator.onLine;
    const preferLocal = getPreferLocal();

    // Explicit prefer-local override — only honored when the local model is
    // actually loaded. Never silently falls back to local when unavailable.
    if (preferLocal) {
      if (await this.localProvider.isAvailable()) {
        return this.localProvider;
      }
      // fall through to cloud when local isn't provisioned
    }

    // Offline -> LocalAIProvider (if provisioned)
    if (!isOnline) {
      if (await this.localProvider.isAvailable()) {
        return this.localProvider;
      }
      throw new Error("offline_not_provisioned");
    }

    // Online requests always go through the account's selected BYOK/shared mode.
    return this.cloudProvider;
  }
}

export const AIProviderRouter = new AIProviderRouterImpl();
