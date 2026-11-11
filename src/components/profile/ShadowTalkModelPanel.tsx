import { Brain, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShadowTalkModel } from "@/hooks/useShadowTalkModel";

export function ShadowTalkModelPanel() {
  const { enabled, state, training, trainNow, resetModel, refresh } = useShadowTalkModel();

  if (!enabled) {
    return (
      <Card className="card-glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-primary" />
            ShadowTalk Sovereign Model
          </CardTitle>
          <CardDescription>
            Enable adaptive learning above to use the on-device model that learns from you via
            unsupervised clustering (no manual training labels).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const status = state?.status ?? "untrained";

  return (
    <Card className="card-glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          ShadowTalk Sovereign Model
        </CardTitle>
        <CardDescription>
          Your private model starts untrained, ingests chat on-device, and runs unsupervised
          k-means training to discover topics — automatically while you chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "ready" ? "default" : "secondary"}>
            {status === "untrained"
              ? "Untrained"
              : status === "learning"
                ? "Learning"
                : "Ready"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {state?.corpusCount ?? 0} messages · {state?.trainingGeneration ?? 0} training cycles
          </span>
        </div>

        {state?.clusters && state.clusters.length > 0 && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Discovered topics (unsupervised)
            </p>
            <ul className="text-sm space-y-1">
              {state.clusters
                .sort((a, b) => b.size - a.size)
                .slice(0, 6)
                .map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground text-xs">{c.size}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={training || (state?.corpusCount ?? 0) < 3}
            onClick={() => void trainNow()}
          >
            {training ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Train now
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => void resetModel()}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Reset model
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Select <strong>ShadowTalk Model</strong> in chat to use learned context. Inference uses
          your local Llama model when available, with cloud fallback. Embeddings and clusters stay
          on this device.
        </p>
      </CardContent>
    </Card>
  );
}
