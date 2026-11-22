import React, { useMemo, useState } from 'react';
import { localInferenceEngine } from '@/offline/LocalInferenceEngine';
import { StorageManager } from '@/offline/StorageManager';
import { markDeviceInstallConsent } from '@/offline/BackgroundInstall';
import { LOCAL_MODEL_TIERS, STARTER_LOCAL_MODEL, pickLocalModelForDevice, type LocalModelDefinition } from '@/ai/ModelRegistry';
import { Loader2, CheckCircle2, AlertCircle, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflineSetup: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  // Starter-first default: the smallest model that fits the device (Nano on
  // ≤2GB RAM — the mirror-backed 290MB tier; Lite 1B elsewhere). The user
  // can still opt into the 1.5B/3B tiers as explicit upgrades before installing.
  const deviceModel = useMemo(
    () =>
      typeof navigator !== 'undefined'
        ? pickLocalModelForDevice(
            (navigator as any).deviceMemory,
            /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
          )
        : STARTER_LOCAL_MODEL,
    [],
  );
  const [selectedModelId, setSelectedModelId] = useState(deviceModel.id);
  const [status, setStatus] = useState<'idle' | 'checking' | 'downloading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedModel: LocalModelDefinition =
    LOCAL_MODEL_TIERS.find((m) => m.id === selectedModelId) ?? deviceModel;

  const initializeOfflineMode = async () => {
    setStatus('checking');
    try {
      // 1. Request persistence
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        if (!persisted) {
          console.warn("Browser denied persistent storage. Eviction may occur.");
        }
      }

      // 2. Check estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const requiredBytes = selectedModel.approxStorageRequirementMB * 1024 * 1024;
        if (estimate.quota && estimate.usage) {
          const available = estimate.quota - estimate.usage;
          if (available < requiredBytes) {
            throw new Error(`Insufficient browser storage. Needs ${(requiredBytes / 1e9).toFixed(2)}GB, but only ${(available / 1e9).toFixed(2)}GB available.`);
          }
        }
      }

      // 3. Application-level check
      const hasSpace = await StorageManager.hasAvailableSpace(selectedModel.approxStorageRequirementMB);
      if (!hasSpace) {
        throw new Error("Insufficient storage available for local model.");
      }

      await StorageManager.requestPersistentStorage();

      // Explicit user intent (manual install) — latch device consent.
      markDeviceInstallConsent();
      setStatus('downloading');

      const success = await localInferenceEngine.initialize((report) => {
        const percent = Math.round(report.progress * 100);
        setProgress(percent);
      }, selectedModel.id);

      if (success) {
        setStatus('ready');
        setTimeout(() => {
          onComplete?.();
        }, 1500);
      } else {
        throw new Error("Failed to initialize local AI engine.");
      }

    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 max-w-md mx-auto border rounded-xl bg-card">
      <h2 className="text-xl font-bold">ShadowTalk Local Setup</h2>

      {status === 'idle' && (
        <>
          <p className="text-center text-muted-foreground mb-4">
            Install the local AI engine to use ShadowTalk offline. This will securely download model weights into your browser's persistent cache.
            <br /><br />
            <strong>Model:</strong> {selectedModel.displayName} <span className="text-xs">({selectedModel.id})</span><br />
            <strong>Size:</strong> ~{(selectedModel.approxStorageRequirementMB / 1024).toFixed(1)} GB
          </p>
          <div className="w-full space-y-1.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> Starts small so the download stays quick — the larger tiers are optional upgrades:</p>
            {LOCAL_MODEL_TIERS.map((m) => (
              <label
                key={m.id}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                  m.id === selectedModelId
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    type="radio"
                    name="local-model"
                    className="accent-primary shrink-0"
                    checked={m.id === selectedModelId}
                    onChange={() => setSelectedModelId(m.id)}
                  />
                  <span className="font-medium truncate">{m.displayName}</span>
                  {m.id === deviceModel.id && (
                    <span className="text-[10px] text-primary shrink-0">starter · recommended</span>
                  )}
                </span>
                <span className="text-[10px] whitespace-nowrap">~{(m.approxStorageRequirementMB / 1024).toFixed(1)} GB</span>
              </label>
            ))}
          </div>
          <Button onClick={initializeOfflineMode} className="w-full">Install Local AI Engine</Button>
        </>
      )}

      {(status === 'checking' || status === 'downloading') && (
        <div className="flex flex-col items-center space-y-4 w-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>{status === 'checking' ? 'Verifying storage quotas...' : 'Downloading model weights...'}</p>
          {status === 'downloading' && (
             <div className="w-full bg-secondary rounded-full h-2">
               <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
             </div>
          )}
        </div>
      )}

      {status === 'ready' && (
        <div className="flex flex-col items-center space-y-2 text-green-500">
          <CheckCircle2 className="w-8 h-8" />
          <p className="font-medium">Local AI Provisioned! ShadowTalk can now run offline.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center space-y-4 text-destructive w-full">
          <AlertCircle className="w-8 h-8" />
          <p className="text-center font-medium">{errorMsg}</p>
          <Button variant="outline" onClick={() => setStatus('idle')}>Try Again</Button>
        </div>
      )}
    </div>
  );
};
