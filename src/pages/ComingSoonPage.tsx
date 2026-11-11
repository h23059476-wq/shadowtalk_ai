import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft, Zap, Home } from "lucide-react";
import { trackShadowTalkEvent } from "@/lib/analyticsEventTracker";

/**
 * Catch-all fallback for routes that don't have a real implementation yet.
 * Shows a friendly "coming soon" message with navigation back to working areas.
 *
 * Routes pointing here: /ai-strategy-consultant, /anonymous-ai, /answers,
 * /deep-research, /discover, /partnerships, /privacy-score, /security-audit,
 * /studio, /transparency, /trust, /video-studio, /workspace
 */

// Map of path → friendly feature name
const FEATURE_NAMES: Record<string, string> = {
  "/ai-strategy-consultant": "AI Strategy Consultant",
  "/anonymous-ai": "Anonymous AI",
  "/answers": "Shared Answers",
  "/deep-research": "Deep Research",
  "/discover": "Discover",
  "/partnerships": "Partnerships",
  "/privacy-score": "Privacy Score",
  "/security-audit": "Security Audit",
  "/studio": "Studio",
  "/transparency": "Transparency Dashboard",
  "/trust": "Trust Center",
  "/video-studio": "Video Studio",
  "/workspace": "Workspace",
};

export default function ComingSoonPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const featureName = FEATURE_NAMES[path] || "This feature";

  useEffect(() => {
    trackShadowTalkEvent("coming_soon_page_viewed", { path });
  }, [path]);

  return (
    <>
      <SEOHead
        meta={{
          title: `${featureName} — Coming Soon | ShadowTalk AI`,
          description: `${featureName} is coming soon to ShadowTalk AI. Explore the live workspace in the meantime.`,
          noIndex: true,
        }}
      />
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mb-2">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{featureName}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This feature is in active development and will ship soon. ShadowTalk AI is
              built by a solo founder — your patience means the world.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => navigate("/chatbot")}
              className="gap-2"
            >
              <Zap className="h-4 w-4 fill-current" />
              Open the workspace
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/home")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Back to home
            </Button>
          </div>
          <div className="pt-4 border-t border-border/40">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go back to the previous page
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
