import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useAutoImproveContext } from "@/contexts/AutoImproveContext";

import { hasAnalyticsConsent } from "@/lib/autoImprove/consent";
import { isLearningEnabled } from "@/lib/autoImprove/learningConsent";
import { detectBotLikely } from "@/lib/analyticsBotGuard";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UiUxSuggestionPanel } from "@/components/autoImprove/UiUxSuggestionPanel";
import { useEnterpriseExperience } from "@/hooks/useEnterpriseExperience";

/**
 * Background engine: runs analysis on route changes, syncs cloud memories/insights, surfaces improvement toasts.
 */
export const AutoImproveEngine = () => {
  const location = useLocation();
  const { user } = useAuth();
  const enterprise = useEnterpriseExperience();
  const {
    runAnalysis,
    pendingImprovements,
    dismissImprovementNotice,
    capturePageView,
    uiUxSuggestions,
    dismissUiUxSuggestion,
    learningEnabled,
  } = useAutoImproveContext();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (!isLearningEnabled() || location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;
    if (detectBotLikely().isBot) return;
    void capturePageView(location.pathname);
  }, [location.pathname, capturePageView]);

  useEffect(() => {
    const t = setTimeout(() => runAnalysis(), 2000);
    return () => clearTimeout(t);
  }, [location.pathname, runAnalysis]);



  if (enterprise.isEnterpriseUser || enterprise.isEnterpriseDeployment) {
    return null;
  }

  return (
    <AnimatePresence>
      {learningEnabled && uiUxSuggestions.length > 0 && (
        <UiUxSuggestionPanel suggestions={uiUxSuggestions} onDismiss={dismissUiUxSuggestion} />
      )}
      {pendingImprovements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-20 right-4 z-[60] max-w-sm"
        >
          <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                ShadowTalk improved itself
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => pendingImprovements.forEach((i) => dismissImprovementNotice(i.id))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {pendingImprovements.slice(-3).map((imp) => (
                <li key={imp.id}>
                  <span className="text-foreground font-medium">{imp.label}</span>
                  <span className="block opacity-80">{imp.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AutoImproveEngine;
