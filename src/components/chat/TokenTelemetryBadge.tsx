/**
 * Intelligent Workspace Batch 4 — honest token/cost telemetry badge.
 *
 * Shows what the LAST provider request actually consumed. Every number is
 * labeled measured or estimated — estimated numbers are never dressed up as
 * savings, and cached tokens appear only when the provider reported them.
 */

import { useState } from "react";
import { Gauge } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TokenTelemetry } from "@/lib/chatMessageMetadata";

interface TokenTelemetryBadgeProps {
  telemetry: TokenTelemetry | null;
  /** Cumulative BYOK spend from the cost tracker (USD, this browser). */
  monthSpendUsd: number;
  requestCount: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-medium">{value}{hint ? <span className="ml-1 font-normal text-muted-foreground">{hint}</span> : null}</span>
    </div>
  );
}

export function TokenTelemetryBadge({ telemetry, monthSpendUsd, requestCount }: TokenTelemetryBadgeProps) {
  const [open, setOpen] = useState(false);
  if (!telemetry) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Token usage details"
          className="touch-target inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/30"
        >
          <Gauge className="h-3 w-3" aria-hidden />
          {formatTokens(telemetry.inputTokens)} in
          {telemetry.compaction?.applied ? ` · ${telemetry.compaction.compactedMessages} compacted` : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 glass-strong">
        <p className="text-xs font-semibold mb-1">Last request</p>
        <p className="text-[11px] text-muted-foreground mb-2">
          {telemetry.model ? `Model: ${telemetry.model}` : "Model unknown"}
          {telemetry.provider ? ` · ${telemetry.provider}` : ""}
        </p>
        <div className="rounded-lg bg-muted/20 px-2.5 py-1.5">
          <Row
            label="Input tokens"
            value={formatTokens(telemetry.inputTokens)}
            hint={telemetry.inputMeasured ? "measured" : "estimated"}
          />
          <Row
            label="Output tokens"
            value={formatTokens(telemetry.outputTokens)}
            hint={telemetry.outputMeasured ? "measured" : "estimated"}
          />
          {typeof telemetry.cachedInputTokens === "number" && (
            <Row label="Served from provider cache" value={formatTokens(telemetry.cachedInputTokens)} hint="reported" />
          )}
          {telemetry.compaction?.applied && (
            <Row
              label="Conversation compacted"
              value={`${telemetry.compaction.compactedMessages} msgs`}
              hint={`~${formatTokens(telemetry.compaction.estimatedSavingsTokens)} est. saved`}
            />
          )}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          "Estimated" numbers use a documented char-based heuristic — the provider did not report usage for this request.
          Estimated savings are estimates, not billing.
        </p>
        <div className="mt-2 border-t border-border/40 pt-1.5">
          <Row label="Cumulative BYOK spend (this browser, month)" value={`$${monthSpendUsd.toFixed(4)}`} />
          <Row label="Requests tracked" value={String(requestCount)} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TokenTelemetryBadge;
