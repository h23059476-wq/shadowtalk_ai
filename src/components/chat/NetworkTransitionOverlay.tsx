import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, CloudUpload, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Offline banner. The old copy claimed offline AI was active on every offline
 * transition, but the local engine may not be provisioned — the claim was
 * false whenever the on-device model wasn't installed. The banner now
 * checks the engine's actual state (dynamic import keeps web-llm out of the
 * entry bundle) and only promises offline capability when the engine really
 * is ready. Otherwise it says exactly what is and isn't available.
 */
export const NetworkTransitionOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [transitioning, setTransitioning] = useState<'online' | 'offline' | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const pendingCount = 0;
  const syncPendingMessages = async () => {};

  useEffect(() => {
    let cancelled = false;
    const checkLocalEngine = async () => {
      try {
        const { localInferenceEngine } = await import('@/offline/LocalInferenceEngine');
        if (!cancelled) setLocalReady(localInferenceEngine.getState() === 'ready');
      } catch {
        if (!cancelled) setLocalReady(false);
      }
    };
    void checkLocalEngine();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setTransitioning(null);
      setSyncing(false);
      setSyncDone(false);
    }, 300);
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      setTransitioning('offline');
      setSyncing(false);
      setSyncDone(false);
      setVisible(true);
      setTimeout(dismiss, 3000);
    };

    const handleOnline = async () => {
      setTransitioning('online');
      setVisible(true);

      if (pendingCount > 0) {
        setSyncing(true);
        await syncPendingMessages();
        setSyncing(false);
        setSyncDone(true);
        setTimeout(dismiss, 2000);
      } else {
        setTimeout(dismiss, 2500);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCount, syncPendingMessages, dismiss]);

  if (!transitioning) return null;

  const isOffline = transitioning === 'offline';

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-5 py-3 rounded-xl border shadow-lg backdrop-blur-md text-sm font-medium',
          isOffline
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        )}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>
              {localReady
                ? "You're offline — on-device AI is active"
                : "You're offline — cloud chat and on-device AI are unavailable until the local model is installed"}
            </span>
          </>
        ) : syncDone ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <span>All synced — back online</span>
          </>
        ) : syncing ? (
          <>
            <CloudUpload className="h-4 w-4 animate-pulse" />
            <span>Syncing {pendingCount} pending items…</span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            <span>Back online</span>
          </>
        )}
      </div>
    </div>
  );
};
