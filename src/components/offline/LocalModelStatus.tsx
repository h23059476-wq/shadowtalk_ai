import React, { useEffect, useState } from 'react';
import { localInferenceEngine, type LocalEngineState } from '@/offline/LocalInferenceEngine';
import { DEFAULT_LOCAL_MODEL } from '@/ai/ModelRegistry';
import { DeviceCapability } from '@/offline/DeviceCapability';

/**
 * Batch 4 — replaced the 1s setInterval polling with a subscription to the
 * engine's state machine. Renders the full lifecycle state instead of a
 * binary "Ready / Not Loaded" badge.
 */
const STATE_LABEL: Record<LocalEngineState, string> = {
  idle: "Not Loaded",
  downloading: "Downloading…",
  loading: "Loading model…",
  ready: "Ready Offline",
  generating: "Generating…",
  error: "Error",
  offline: "Offline",
};

export const LocalModelStatus: React.FC = () => {
  const [engineState, setEngineState] = useState<LocalEngineState>(localInferenceEngine.getState());
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  useEffect(() => {
    DeviceCapability.hasWebGPU().then(setHasWebGPU);
    // Batch 4: subscribe to the engine state machine instead of polling.
    const unsub = localInferenceEngine.subscribe(setEngineState);
    setEngineState(localInferenceEngine.getState());
    return unsub;
  }, []);

  const isLoaded = engineState === "ready" || engineState === "generating";
  const isError = engineState === "error";

  return (
    <div className="p-4 rounded-lg bg-card border text-sm space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLoaded ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-muted'}`} />
        ShadowTalk Local
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
        <span>Model:</span>
        <span className="text-foreground">{DEFAULT_LOCAL_MODEL.displayName}</span>
        <span>Storage:</span>
        <span className="text-foreground">~{DEFAULT_LOCAL_MODEL.approxStorageRequirementMB} MB</span>
        <span>Acceleration:</span>
        <span className="text-foreground">{hasWebGPU ? 'WebGPU' : 'CPU'}</span>
        <span>Status:</span>
        <span className={`text-foreground ${isError ? 'text-red-500' : ''}`}>{STATE_LABEL[engineState]}</span>
      </div>
    </div>
  );
};
