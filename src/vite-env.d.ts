/// <reference types="vite/client" />

interface ImportMetaEnv {
  
  readonly VITE_API_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ---- Web Speech API shims (not in lib.dom by default) ----
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
  item(index: number): SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
  item(index: number): SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionCtor {
  new (): SpeechRecognition;
}
interface Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}
declare const SpeechRecognition: SpeechRecognitionCtor | undefined;

// ---- WebGPU type shim ----
  interface GPU {
    requestAdapter(): Promise<unknown>;
  }
interface Navigator {
  gpu?: GPU;
}

declare module "virtual:pwa-register" {
  export function registerSW(options?: Record<string, unknown>): (reload?: boolean) => Promise<void>;
}
