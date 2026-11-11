export class OfflineDetector {
  private _isOffline: boolean;
  private listeners: Set<(isOffline: boolean) => void> = new Set();

  constructor() {
    this._isOffline = !navigator.onLine;

    window.addEventListener('online', () => this.setOffline(false));
    window.addEventListener('offline', () => this.setOffline(true));
  }

  get isOffline(): boolean {
    return this._isOffline;
  }

  get isOnline(): boolean {
    return !this._isOffline;
  }

  get connectionStatus(): 'online' | 'offline' {
    return this._isOffline ? 'offline' : 'online';
  }

  public reportRequestFailure() {
    // If a request fails, we might temporarily assume offline
    if (!this._isOffline && !navigator.onLine) {
      this.setOffline(true);
    }
  }

  private setOffline(offline: boolean) {
    if (this._isOffline !== offline) {
      this._isOffline = offline;
      this.listeners.forEach(l => l(offline));
    }
  }

  subscribe(callback: (isOffline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const offlineDetector = new OfflineDetector();
