import React, { useEffect, useState } from 'react';
import { localInferenceEngine, type LocalEngineState } from '@/offline/LocalInferenceEngine';
import { STARTER_LOCAL_MODEL, getLocalModelDefinition } from '@/ai/ModelRegistry';
import { DeviceCapability } from '@/offline/DeviceCapability';
import { detectDeviceCapabilities } from '@/utils/deviceCapabilities';

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
  /** Only a software (SwiftShader) adapter — works, but say "slow" honestly. */
  const [softwareAdapter, setSoftwareAdapter] = useState(false);
  /** The engine's real failure reason, shown on the Error row. */
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    DeviceCapability.hasWebGPU().then(setHasWebGPU);
    detectDeviceCapabilities()
      .then((caps) => setSoftwareAdapter(caps.adapter?.isFallbackAdapter === true))
      .catch(() => {});
    // Batch 4: subscribe to the engine state machine instead of polling, and
    // keep the failure reason in sync so the Error row explains itself.
    const unsub = localInferenceEngine.subscribe((state) => {
      setEngineState(state);
      setLastError(localInferenceEngine.getLastError());
    });
    setEngineState(localInferenceEngine.getState());
    setLastError(localInferenceEngine.getLastError());
    return unsub;
  }, []);

  const isLoaded = engineState === "ready" || engineState === "generating";
  const isError = engineState === "error";

  // Show the model that is actually loaded (may be a user-picked upgrade or
  // the q4f32 twin); before anything loads, show the starter that the
  // background install / OfflineSetup will download.
  const displayedModel =
    (isLoaded ? getLocalModelDefinition(localInferenceEngine.getCurrentModelId()) : undefined) ??
    STARTER_LOCAL_MODEL;

  return (
    <div className="p-4 rounded-lg bg-card border text-sm space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLoaded ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-muted'}`} />
        ShadowTalk Local
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
        <span>Model:</span>
        <span className="text-foreground">{displayedModel.displayName}</span>
        <span>Storage:</span>
        <span className="text-foreground">~{displayedModel.approxStorageRequirementMB} MB</span>
        <span>Acceleration:</span>
        {/* There is no CPU engine — without WebGPU the on-device tier cannot
            run at all, and claiming "CPU" sent users hunting for a fallback
            that does not exist. When only a software adapter exists, say so
            honestly instead of implying hardware speed. */}
        <span className="text-foreground">
          {!hasWebGPU ? 'Not available' : softwareAdapter ? 'WebGPU (software — slow)' : 'WebGPU'}
        </span>
        <span>Status:</span>
        <span className={`text-foreground ${isError ? 'text-red-500' : ''}`}>{STATE_LABEL[engineState]}</span>
      </div>
      {!hasWebGPU && (
        <p className="text-xs text-muted-foreground">
          Local AI needs WebGPU. In Chrome/Edge enable Settings → System → "Use hardware acceleration when
          available", reload, then verify at <span className="underline">chrome://gpu</span>.
        </p>
      )}
      {isError && lastError && (
        <p className="text-xs text-red-500/90 leading-relaxed">{lastError}</p>
      )}
    </div>
  );
};
