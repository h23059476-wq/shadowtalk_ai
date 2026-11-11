import { Link } from "react-router-dom";
import { Info } from "lucide-react";

type FreeTierLimitsStripProps = {
  className?: string;
  showUpgradeLink?: boolean;
};

/** Free access strip — ShadowTalk AI is free, BYOK for AI usage. */
export function FreeTierLimitsStrip({ className = "", showUpgradeLink = true }: FreeTierLimitsStripProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-xs sm:text-sm text-muted-foreground ${className}`}
      role="note"
    >
      <div className="flex items-start gap-2 min-w-0">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-foreground/90 font-medium">Free to use — no subscription, no credit card</p>
          <p>
            ShadowTalk AI is free to use. Bring your own AI provider API key and
            choose your preferred models. Your provider may charge separately for
            API usage.
          </p>
        </div>
      </div>
      {showUpgradeLink && (
        <Link to="/pricing" className="shrink-0 text-primary font-medium hover:underline sm:ml-auto">
          How free access works →
        </Link>
      )}
    </div>
  );
}

export default FreeTierLimitsStrip;
