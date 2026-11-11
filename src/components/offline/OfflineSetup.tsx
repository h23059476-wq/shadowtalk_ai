import React, { useState } from 'react';
import { localInferenceEngine } from '@/offline/LocalInferenceEngine';
import { StorageManager } from '@/offline/StorageManager';
import { DEFAULT_LOCAL_MODEL } from '@/ai/ModelRegistry';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflineSetup: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'downloading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

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
        const requiredBytes = DEFAULT_LOCAL_MODEL.approxStorageRequirementMB * 1024 * 1024;
        if (estimate.quota && estimate.usage) {
          const available = estimate.quota - estimate.usage;
          if (available < requiredBytes) {
            throw new Error(`Insufficient browser storage. Needs ${(requiredBytes / 1e9).toFixed(2)}GB, but only ${(available / 1e9).toFixed(2)}GB available.`);
          }
        }
      }

      // 3. Application-level check
      const hasSpace = await StorageManager.hasAvailableSpace(DEFAULT_LOCAL_MODEL.approxStorageRequirementMB);
      if (!hasSpace) {
        throw new Error("Insufficient storage available for local model.");
      }
      
      await StorageManager.requestPersistentStorage();
      
      setStatus('downloading');
      
      const success = await localInferenceEngine.initialize((report) => {
        const percent = Math.round(report.progress * 100);
        setProgress(percent);
      });

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
            <br/><br/>
            <strong>Model:</strong> {DEFAULT_LOCAL_MODEL.id} <br/>
            <strong>Size:</strong> ~{(DEFAULT_LOCAL_MODEL.approxStorageRequirementMB / 1024).toFixed(1)} GB
          </p>
          <Button onClick={initializeOfflineMode}>Install Local AI Engine</Button>
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
