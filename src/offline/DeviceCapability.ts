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

  static getDeviceClass(): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Basic heuristic: assume desktop/laptop might be medium/high, mobile low
    // For MVP, we can rely on WebGPU availability as the primary check
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 'LOW' : 'MEDIUM'; // Simplified for now
  }
}
