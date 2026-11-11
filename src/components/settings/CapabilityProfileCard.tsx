/**
 * CapabilityProfileCard — displays provider/model capability information
 * in the existing Settings BYOK card.
 *
 * Shows supported, unsupported, and unknown capabilities with
 * evidence source and verification status.
 */

import { useMemo } from "react";
import { Check, X, HelpCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { getByokConfig, type ByokProvider } from "@/lib/byok";
import { getModelCapabilities, getRegistryVersion, getRegistryLastUpdated } from "@/lib/capabilityRegistry";
import { getCapabilitySummary } from "@/lib/capabilityCompatibility";

export function CapabilityProfileCard({ provider, model }: { provider?: ByokProvider; model?: string } = {}) {
  const saved = provider ? null : getByokConfig();
  const config = provider ? { provider, model: model || "" } : saved ? { provider: saved.provider, model: saved.model } : null;
  const cfgProvider = config?.provider;
  const cfgModel = config?.model;

  const capabilityData = useMemo(() => {
    if (!cfgProvider) return null;
    const caps = getModelCapabilities(cfgProvider, cfgModel || "");
    const summary = getCapabilitySummary(cfgProvider, cfgModel || "");
    return { caps, summary };
  }, [cfgProvider, cfgModel]);

  if (!config || !capabilityData) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/10 p-4 text-xs text-muted-foreground">
        No BYOK provider configured. Add an API key in Settings to see capability information.
      </div>
    );
  }

  const { caps, summary } = capabilityData;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Capability Profile</h4>
          <p className="text-[11px] text-muted-foreground">
            {config.provider} · {config.model}
          </p>
        </div>
        <div className="text-[10px] text-muted-foreground/60 font-mono">
          Registry v{getRegistryVersion()} · {getRegistryLastUpdated()}
        </div>
      </div>

      {/* Context window + max output */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border/30 bg-background/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Context Window</div>
          <div className="text-sm font-medium text-foreground">
            {caps.contextWindow ? `${(caps.contextWindow / 1000).toFixed(0)}K tokens` : "Unknown"}
          </div>
        </div>
        <div className="rounded-md border border-border/30 bg-background/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Max Output</div>
          <div className="text-sm font-medium text-foreground">
            {caps.maxOutputTokens ? `${(caps.maxOutputTokens / 1000).toFixed(0)}K tokens` : "Unknown"}
          </div>
        </div>
      </div>

      {/* Supported capabilities */}
      {summary.supported.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-emerald-500/70 font-semibold flex items-center gap-1">
            <Check className="h-3 w-3" /> Supported
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.supported.map((cap) => (
              <span key={cap} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Check className="h-2.5 w-2.5" /> {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unsupported capabilities */}
      {summary.unsupported.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-red-500/70 font-semibold flex items-center gap-1">
            <X className="h-3 w-3" /> Unsupported
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.unsupported.map((cap) => (
              <span key={cap} className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[11px] text-red-600 dark:text-red-400">
                <X className="h-2.5 w-2.5" /> {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unknown/unverified capabilities */}
      {summary.unknown.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-amber-500/70 font-semibold flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Unknown / Unverified
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.unknown.map((cap) => (
              <span key={cap} className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                <HelpCircle className="h-2.5 w-2.5" /> {cap}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            These capabilities have not been verified for your specific model. They may work but are not confirmed.
          </p>
        </div>
      )}

      {/* Limitation notes */}
      {caps.imageInput.limitation && (
        <div className="flex items-start gap-1.5 rounded-md bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{caps.imageInput.limitation}</span>
        </div>
      )}

      {/* Verification footer */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
        <ShieldCheck className="h-3 w-3" />
        <span>Capability data is based on official documentation and adapter implementation. Not all capabilities are verified for every model.</span>
      </div>
    </div>
  );
}
