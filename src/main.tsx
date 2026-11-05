// Polyfill crypto.randomUUID for non-secure contexts (e.g., testing on local network IP)
if (typeof crypto === 'undefined') {
  (window as any).crypto = {} as Crypto;
}
if (!crypto.randomUUID) {
  crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });
import { initPerformanceMonitoring, deferNonCritical } from "./lib/performance";
import { warmHardwareProfile, prewarmFastestLocalPath } from "./lib/hardwareIntelligence";
import { installViteChunkRecovery, clearViteChunkRecoveryFlag } from "./lib/viteChunkRecovery";

import { applyPerfProfile } from "./lib/perf/devicePerfTier";
import { setupGlobalErrorHandling } from "./lib/globalErrorHandler";

// Setup global error interceptors for better UX
setupGlobalErrorHandling();

// Detect device perf tier ASAP so CSS degrades heavy effects on low-end hardware.
applyPerfProfile();
 
installViteChunkRecovery();

// Initialize performance monitoring
initPerformanceMonitoring();


 
// Global error listeners have been moved to setupGlobalErrorHandling
 
// Warm WebGPU + configure on-device inference runtimes (idle, non-blocking)
deferNonCritical(() => {
  warmHardwareProfile();
  prewarmFastestLocalPath();
});

// NOTE: Service workers are registered via `registerSW({ immediate: true })`
// above and must stay registered — unregistering here killed PWA/offline
// support for every returning user.

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found. Check your index.html.");
}

createRoot(container).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);

clearViteChunkRecoveryFlag();
