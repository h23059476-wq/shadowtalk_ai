/**
 * Legacy static facade over `src/utils/deviceCapabilities.ts`.
 *
 * Kept because the offline code paths (LocalInferenceEngine, BackgroundInstall,
 * PrivateAiBanner, onboarding) call these statics. The real detection (adapter
 * limits, shader-f16, memory fallback, storage quota) lives in the new module
 * and is cached per session, so the twin-swap and WebGPU gates stay consistent
 * everywhere without repeated adapter requests.
 */
import { detectDeviceCapabilities } from "@/utils/deviceCapabilities";

export class DeviceCapability {
  static async hasWebGPU(): Promise<boolean> {
    try {
      return (await detectDeviceCapabilities()).webgpu;
    } catch {
      return false;
    }
  }

  /**
   * Whether the WebGPU adapter supports fp16 shader math (shader-f16).
   * q4f16_1 model weights need it; devices without the feature (software
   * adapters, older drivers) must fall back to the q4f32 twins.
   */
  static async supportsShaderF16(): Promise<boolean> {
    try {
      return (await detectDeviceCapabilities()).adapter?.shaderF16 === true;
    } catch {
      return false;
    }
  }

  static getDeviceClass(): "LOW" | "MEDIUM" | "HIGH" {
    // Basic heuristic: assume desktop/laptop might be medium/high, mobile low
    // For MVP, we can rely on WebGPU availability as the primary check
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? "LOW" : "MEDIUM"; // Simplified for now
  }
}
