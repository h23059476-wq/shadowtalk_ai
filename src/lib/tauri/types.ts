/** TypeScript surface mirrored from Rust Tauri backend commands.

The Rust backend will implement these commands via `#[tauri::command]`
and register them in `src-tauri/src/main.rs` / `lib.rs`.
*/

export interface TauriLocalAuth {
  authenticateWithBiometric(reason?: string): Promise<boolean>;
  signInWithCredentials(payload: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }>;
  signOut(): Promise<void>;
  hasStoredCredentials(): Promise<boolean>;
}

export interface TauriSecureStoreItem {
  key: string;
  value: string;
  service?: string;
  account?: string;
}

export interface TauriSecureStore {
  get(key: string): Promise<string | null>;
  set(item: TauriSecureStoreItem): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface TauriWhatsAppLocalBridge {
  getQrPayload(): Promise<{ qr: string; expiresAt: string } | null>;
  getStatus(): Promise<{ ready: boolean; phone?: string; lastError?: string }>;
  disconnect(): Promise<void>;
}

export type MediaMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'audio/wav'
  | 'audio/mp3'
  | 'video/mp4';

export interface MediaPipelineInput {
  mimeType: MediaMimeType;
  bytes: ArrayBuffer | Uint8Array;
}

export interface MediaPipelineResult {
  success: boolean;
  outputPath?: string;
  mimeType: MediaMimeType;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface TauriMediaPipeline {
  transcode(input: MediaPipelineInput, targetMime: MediaMimeType): Promise<MediaPipelineResult>;
  extract(input: MediaPipelineInput): Promise<MediaPipelineResult>;
}
