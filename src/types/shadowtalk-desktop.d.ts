export interface ShadowTalkDesktopInfo {
  platform: NodeJS.Platform;
  arch: string;
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  userDataPath: string;
  documentsPath: string;
  homePath: string;
  shadowtalkDataPath: string;
  /** Tier C: installer shipped default MLC model cache */
  offlineModelBundled?: boolean;
  offlineModelPath?: string;
  /** Sovereign desktop capable */
  sovereignDesktopCapable?: boolean;
}

export interface ShadowTalkDesktopAPI {
  isDesktop: true;
  platform: NodeJS.Platform;
  getInfo: () => Promise<ShadowTalkDesktopInfo>;
  openFile: (options?: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  saveFile: (options?: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  readTextFile: (filePath: string) => Promise<string>;
  writeTextFile: (filePath: string, content: string) => Promise<{ ok: boolean }>;
  openPath: (filePath: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  revealInFolder: (filePath: string) => Promise<void>;
  showNotification: (title: string, body: string) => Promise<void>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  chatStream: (
    payload: { url: string; headers: Record<string, string>; body: string },
    onChunk: (chunk: string) => void,
    onEnd: (result: { ok: boolean; status: number; body: string }) => void,
  ) => Promise<{ started: boolean }>;
  fetchUrl: (url: string) => Promise<{ ok: boolean; status: number; text: string; error?: string }>;
  preferredLogin?: () => Promise<{ redirected: boolean; error?: Error }>;
  secureStore?: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    getAllKeys(): Promise<string[]>;
  };
}

interface OpenDialogOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

declare global {
  interface Window {
    shadowtalkDesktop?: ShadowTalkDesktopAPI;
  }
}

export {};