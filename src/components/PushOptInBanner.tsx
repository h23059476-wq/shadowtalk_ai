import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import {
  enablePushNotifications,
  listenForegroundPush,
  notificationPermission,
} from "@/lib/pushNotifications";

/**
 * FCM campaign opt-in — a quiet, dismissible banner next to the workspace
 * verification notice. Shows when the user is signed in and notifications
 * aren't yet registered: untouched permission ("default") OR already-granted
 * permission with no saved token (returning user, cleared storage). Never
 * nags users who denied permission, and never renders for guests.
 */
export default function PushOptInBanner() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [registered, setRegistered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPermission(notificationPermission());
    try {
      if (localStorage.getItem("shadowtalk.push-registered") === "1") setRegistered(true);
      if (localStorage.getItem("shadowtalk.push-optin-dismissed") === "1") setDismissed(true);
    } catch {
      /* storage unavailable — keep showing */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    return listenForegroundPush(({ title, body }) => {
      toast({ title, description: body });
    });
  }, [user]);

  if (!user || permission === "unsupported" || permission === "denied" || registered || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("shadowtalk.push-optin-dismissed", "1");
    } catch {
      /* non-fatal */
    }
  };

  const enable = async () => {
    setBusy(true);
    const result = await enablePushNotifications(user.id);
    setBusy(false);
    if (result.ok) {
      setRegistered(true);
      try {
        localStorage.setItem("shadowtalk.push-registered", "1");
      } catch {
        /* non-fatal */
      }
      toast({
        title: "Notifications on",
        description: "You'll hear about major releases, model drops and downtime alerts here.",
      });
    } else {
      toast({
        title: "Notifications not enabled",
        description: result.error || "Your browser blocked the request. You can retry from browser settings.",
        variant: "destructive",
      });
      setPermission(notificationPermission());
    }
  };

  return (
    <div className="fixed top-3 left-1/2 z-[60] w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
          <Bell className="h-4.5 w-4.5 text-cyan-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">Turn on ShadowTalk notifications?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            Release news, new models and downtime alerts — no marketing spam, one tap to switch off.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {busy ? "Enabling…" : "Enable"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden />
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="rounded-md p-1 text-slate-500 hover:text-slate-200"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
