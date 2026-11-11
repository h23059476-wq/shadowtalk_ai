import { Zap, TrendingDown, Clock } from "lucide-react";

/**
 * Real-time BYOK cost + savings badge for the chat footer.
 *
 * Shows three things in one compact row:
 *   ⚡ 142 tok/s    $0.0014 / req    Saved $19.86 vs ChatGPT Plus
 *
 * Reinforces the BYOK value proposition on every request — the user sees
 * real money saved vs the $20/mo ChatGPT Plus subscription.
 */

interface TokenCostBadgeProps {
  tokensPerSecond: number;
  lastRequestCost: number;
  monthSpendUsd: number;
  savingsVsChatGptPlus: number;
  compact?: boolean;
}

function formatUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function TokenCostBadge({
  tokensPerSecond,
  lastRequestCost,
  monthSpendUsd,
  savingsVsChatGptPlus,
  compact = false,
}: TokenCostBadgeProps) {
  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[10px] font-mono text-muted-foreground"
        title={`This request: ${formatUsd(lastRequestCost)} · This month: ${formatUsd(monthSpendUsd)} · Saved ${formatUsd(savingsVsChatGptPlus)} vs ChatGPT Plus`}
      >
        <Zap className="h-3 w-3 text-warning" />
        <span>{formatUsd(lastRequestCost)}/req</span>
        <span className="text-success">−{formatUsd(savingsVsChatGptPlus)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1.5" title="Streaming token speed">
        <Zap className="h-3.5 w-3.5 text-warning" />
        <span className="font-mono">
          {tokensPerSecond > 0 ? `${Math.round(tokensPerSecond)} tok/s` : "—"}
        </span>
      </div>
      <div className="flex items-center gap-1.5" title="Cost of the most recent request">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono">{formatUsd(lastRequestCost)} / req</span>
      </div>
      <div
        className="flex items-center gap-1.5 text-success"
        title={`You've spent ${formatUsd(monthSpendUsd)} this month on BYOK tokens. ChatGPT Plus would cost $20/mo.`}
      >
        <TrendingDown className="h-3.5 w-3.5" />
        <span className="font-mono font-medium">
          Saved {formatUsd(savingsVsChatGptPlus)} vs ChatGPT Plus
        </span>
      </div>
    </div>
  );
}

export default TokenCostBadge;
