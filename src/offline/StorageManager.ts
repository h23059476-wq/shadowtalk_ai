export interface StorageStatus {
  availableMB: number;
  totalMB: number;
  isPersistent: boolean;
}

export class StorageManager {
  static async requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return true;
    }
    return false;
  }

  static async getStorageEstimate(): Promise<StorageStatus> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      return {
        availableMB: (quota - usage) / (1024 * 1024),
        totalMB: quota / (1024 * 1024),
        isPersistent: await navigator.storage.persisted()
      };
    }
    // Fallback if API not supported
    return {
      availableMB: 0,
      totalMB: 0,
      isPersistent: false
    };
  }

  static async hasAvailableSpace(requiredMB: number): Promise<boolean> {
    const status = await this.getStorageEstimate();
    return status.availableMB >= requiredMB;
  }
}
