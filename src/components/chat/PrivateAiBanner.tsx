import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceCapability } from "@/offline/DeviceCapability";
import {
  getBackgroundInstallSnapshot,
  subscribeBackgroundInstall,
  getInstallDecision,
  recordInstallDecision,
  startBackgroundInstall,
  type BackgroundInstallSnapshot,
} from "@/offline/BackgroundInstall";
import { localInferenceEngine } from "@/offline/LocalInferenceEngine";

/**
 * The one-time background-install ask.
 *
 * Shown once per account on the chat page: "Install private AI in
 * background? ~600MB". Accepting streams the starter model's shards down in
 * the background (resumable — WebLLM caches per-shard) while the user keeps
 * chatting via BYOK/escalation; when it lands, chat silently flips to
 * on-device (see BackgroundInstall) and this collapses into a small progress
 * pill, then disappears. Declining is remembered and the Settings → Offline
 * AI panel stays available as the manual path.
 */
export function PrivateAiBanner({ userId }: { userId: string }) {
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const [snap, setSnap] = useState<BackgroundInstallSnapshot>(() => getBackgroundInstallSnapshot());
  const [decision, setDecision] = useState<"accepted" | "declined" | null>(() =>
    getInstallDecision(userId),
  );
  const [dismissed, setDismissed] = useState(false);

  // WebGPU gate — the banner is meaningless without an adapter.
  useEffect(() => {
    let active = true;
    void DeviceCapability.hasWebGPU().then((ok) => {
      if (active) setWebgpu(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeBackgroundInstall(setSnap), []);

  // Decision + engine can change out-of-band (wizard completed, another
  // account signed in) — re-read both.
  useEffect(() => {
    setDecision(getInstallDecision(userId));
  }, [userId]);
  useEffect(() => {
    const unsub = localInferenceEngine.subscribe(() => setSnap(getBackgroundInstallSnapshot()));
    return unsub;
  }, []);

  // Resume an accepted install after a reload mid-download. Idempotent —
  // startBackgroundInstall early-returns when ready/already starting.
  useEffect(() => {
    if (decision !== "accepted" || snap.phase === "ready") return;
    void startBackgroundInstall(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision, userId]);

  const accept = useCallback(() => {
    setDecision("accepted");
    recordInstallDecision(userId, true);
  }, [userId]);

  const decline = useCallback(() => {
    setDecision("declined");
    recordInstallDecision(userId, false);
  }, [userId]);

  if (webgpu === false || dismissed) return null;
  if (decision === "declined") return null;
  if (snap.phase === "ready" || localInferenceEngine.isLoaded()) return null;

  // Accepted → compact progress pill while the shards stream down.
  if (decision === "accepted") {
    if (snap.phase === "failed") {
      return (
        <div
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full border border-destructive/40 bg-card px-3 py-2 text-xs shadow-lg md:right-6"
          role="status"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <span className="max-w-[220px] truncate text-muted-foreground">
            Private AI install failed
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 rounded-full px-2 text-[11px]"
            onClick={() => void startBackgroundInstall(userId)}
          >
            Retry
          </Button>
          <button
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }
    return (
      <div
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2.5 rounded-full border bg-card px-3.5 py-2 text-xs shadow-lg md:right-6"
        role="status"
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
        <span className="font-medium">Private AI</span>
        <span className="w-16 shrink-0 bg-secondary">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${Math.round(snap.progress * 100)}%` }}
          />
        </span>
        <span className="tabular-nums text-muted-foreground">{Math.round(snap.progress * 100)}%</span>
      </div>
    );
  }

  // No decision yet → the one-time ask.
  return (
    <div className="fixed bottom-24 right-4 z-40 max-w-xs rounded-xl border bg-card p-4 shadow-lg md:right-6">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install your private AI in the background?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            ~300–700MB, one time depending on your device. Your chats stay on this device — nothing
            is sent to a server. Keep chatting while it downloads; private mode switches on
            automatically.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={accept}>
              <ShieldCheck className="h-3.5 w-3.5" /> Install in background
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={decline}>
              Not now
            </Button>
          </div>
        </div>
        <button
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
