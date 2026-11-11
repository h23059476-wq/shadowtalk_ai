import { CreateMLCEngine, MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

// ---- Configuration ----
// We default to a small, fast model for in-browser execution.
export const WEBGPU_MODEL = "Llama-3.1-8B-Instruct-q4f32_1-MLC";

// Singleton engine instance
let enginePromise: Promise<MLCEngine> | null = null;
let _progressCallback: ((report: InitProgressReport) => void) | null = null;

// ---- Public API ----

/**
 * Initializes (and caches) the WebGPU LLM Engine.
 * Downloads the model weights to IndexedDB on first run.
 */
export async function getLocalEngine(
  onProgress?: (report: InitProgressReport) => void
): Promise<MLCEngine> {
  if (onProgress) {
    _progressCallback = onProgress;
  }

  if (!enginePromise) {
    // Determine if we are running locally (Electron/Capacitor) or Web.
    // If it's the bundled app, the models are in the public folder (served at /models/...).
    const isNativeApp = !!(window as any).Capacitor || navigator.userAgent.toLowerCase().includes('electron');
    
    // We construct a custom AppConfig so WebLLM doesn't fetch from huggingface.
    const customAppConfig = {
      model_list: [
        {
          model_id: WEBGPU_MODEL,
          model_url: isNativeApp ? `/models/${WEBGPU_MODEL}` : `https://huggingface.co/mlc-ai/${WEBGPU_MODEL}`,
          model_lib_url: `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_43/${WEBGPU_MODEL}-webgpu.wasm`
        }
      ]
    };

    enginePromise = CreateMLCEngine(WEBGPU_MODEL, {
      appConfig: customAppConfig as any,
      initProgressCallback: (report: InitProgressReport) => {
        if (_progressCallback) _progressCallback(report);
      }
    });
  }
  
  return enginePromise;
}

/**
 * Executes a fast completion entirely locally.
 */
export async function localComplete(
  systemPrompt: string,
  userContent: string,
  onDelta?: (delta: string) => void
): Promise<string> {
  try {
    const engine = await getLocalEngine();
    
    if (onDelta) {
      const chunks = await engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        stream: true,
        temperature: 0.5,
        max_tokens: 2048,
      });
      
      let fullText = "";
      for await (const chunk of chunks) {
        const token = chunk.choices[0]?.delta?.content || "";
        fullText += token;
        onDelta(fullText);
      }
      return fullText;
    } else {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.5,
        max_tokens: 2048,
      });
      
      return reply.choices[0]?.message.content || "";
    }
  } catch (error) {
    console.error("[WebGPU LocalEngine] Failed completion:", error);
    throw error;
  }
}

/**
 * Unloads the engine from memory to free up VRAM.
 */
export async function unloadLocalEngine(): Promise<void> {
  if (enginePromise) {
    try {
      const engine = await enginePromise;
      engine.unload();
      enginePromise = null;
    } catch (e) {
      console.warn("Failed to unload WebGPU engine", e);
    }
  }
}

/**
 * Quickly checks if WebGPU is supported by the current browser.
 */
export function isEngineLoaded(): boolean {
  return enginePromise !== null;
}

export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}
