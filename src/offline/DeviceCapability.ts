export class DeviceCapability {
  static async hasWebGPU(): Promise<boolean> {
    if (!('gpu' in navigator)) {
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch (e) {
      return false;
    }
  }

  /**
   * Whether the WebGPU adapter supports fp16 shader math (shader-f16).
   * q4f16_1 model weights need it; devices without the feature (software
   * adapters, older drivers) must fall back to the q4f32 twins.
   */
  static async supportsShaderF16(): Promise<boolean> {
    if (!('gpu' in navigator)) return false;
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
      if (!gpu) return false;
      const adapter = (await gpu.requestAdapter()) as { features?: Set<string> } | null;
      if (!adapter) return false;
      return adapter.features?.has?.('shader-f16') === true;
    } catch {
      return false;
    }
  }

  static getDeviceClass(): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Basic heuristic: assume desktop/laptop might be medium/high, mobile low
    // For MVP, we can rely on WebGPU availability as the primary check
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 'LOW' : 'MEDIUM'; // Simplified for now
  }
}
