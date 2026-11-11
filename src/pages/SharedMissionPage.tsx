import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { ArrowRight, CheckCircle2, XCircle, Share2 } from "lucide-react";
import { sanitizeMissionForPublic } from "@/lib/missionShare";

const SITE_DEFINITION =
  "ShadowTalk AI is a sovereign agentic AI workspace: encrypted chat, Mission Control missions, 30+ tools, voice, code IDE, desktop app, and optional offline models. Free to use — no subscription. Bring your own AI provider API key; your provider may charge separately for API usage.";

const SharedMissionPage = () => {
  const { id = "" } = useParams<{ id: string }>();

  const mission = typeof window !== "undefined" && id
    ? sanitizeMissionForPublic((window as any).__SHARED_MISSIONS?.[id] ?? {})
    : null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/mission/${encodeURIComponent(id)}`
      : `/mission/${encodeURIComponent(id)}`;

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // fallback silent
    }
  };

  const meta = {
    title: mission
      ? `${mission.title} — ShadowTalk Mission Log`
      : "Shared Mission — ShadowTalk AI",
    description: mission
      ? `Read-only execution log: ${mission.title}. Run this mission yourself in ShadowTalk AI — free, no signup.`
      : SITE_DEFINITION,
    canonical: shareUrl,
    keywords: [
      "ShadowTalk mission",
      "agentic mission log",
      "autonomous AI workflow",
      "Mission Control",
      "AI execution proof",
    ],
  };

  const structuredData = mission
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: mission.title,
        url: shareUrl,
        description:
          "Agentic mission execution log from ShadowTalk AI Mission Control.",
        step: mission.steps.map((step) => ({
          "@type": "HowToStep",
          name: step.action,
          text: step.result || step.status,
        })),
      }
    : null;

  if (!mission) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead meta={meta} structuredData={structuredData ? [structuredData] : undefined} />
        <div className="container mx-auto px-4 py-20 max-w-3xl text-center">
          <h1 className="text-3xl font-bold mb-3">This mission log is private or expired</h1>
          <p className="text-muted-foreground mb-6">
            Ask the creator to reshare their completed mission from ShadowTalk Mission Control.
          </p>
          <Button asChild className="btn-glow">
            <Link to="/chatbot">
              Run your own mission <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead meta={meta} structuredData={structuredData ? [structuredData] : undefined} />

      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-40 bg-background/70">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="gradient-text">ShadowTalk</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyShareUrl}>
              <Share2 className="mr-2 h-4 w-4" />
              Copy proof link
            </Button>
            <Button asChild size="sm" className="btn-glow">
              <Link to={`/chatbot?utm_source=shared_mission&utm_medium=viral`}>
                Run this mission free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <p className="text-sm text-muted-foreground mb-2">{SITE_DEFINITION}</p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">{mission.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
          <span className="text-sm font-medium capitalize">{mission.status}</span>
          {mission.started_at && (
            <span className="text-xs text-muted-foreground">
              Started: {new Date(mission.started_at).toLocaleString()}
            </span>
          )}
          {mission.completed_at && (
            <span className="text-xs text-muted-foreground">
              Completed: {new Date(mission.completed_at).toLocaleString()}
            </span>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/60 p-6 sm:p-8 mb-10">
          <h2 className="text-xl font-bold mb-4">Execution log</h2>
          <div className="space-y-4">
            {mission.steps.map((step, idx) => (
              <div key={step.id} className="rounded-lg border border-border/50 bg-background/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium">{step.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.tool_name && (
                      <span className="text-[11px] text-muted-foreground">{step.tool_name}</span>
                    )}
                    {step.status === "completed" && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {step.status === "failed" && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                {step.result && (
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                    {step.result}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center space-y-3">
          <h2 className="text-2xl font-bold">Run this mission yourself</h2>
          <p className="text-sm text-muted-foreground">
            Zero signup required. Open ShadowTalk AI and send the same goal.
          </p>
          <Button asChild size="lg" className="btn-glow">
            <Link to={`/chatbot?utm_source=shared_mission&utm_medium=viral`}>
              Open ShadowTalk free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SharedMissionPage;
