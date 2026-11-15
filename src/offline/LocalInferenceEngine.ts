import { CreateWebWorkerMLCEngine, WebWorkerMLCEngine, type InitProgressCallback, type InitProgressReport, type MLCEngineConfig } from "@mlc-ai/web-llm";
import { DEFAULT_LOCAL_MODEL, getLocalModelDefinition, pickLocalModelForDevice, type LocalModelDefinition } from "@/ai/ModelRegistry";
import { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";
import { DeviceCapability } from "@/offline/DeviceCapability";
import { buildMirrorAppConfig, isMirrorEligibleError } from "@/offline/modelMirror";

/**
 * Batch 4 — LocalInferenceEngine state machine.
 *
 * Exposes the engine's lifecycle state so the UI can render accurate status
 * (idle / downloading / loading / ready / generating / error / offline) and
 * subscribe to transitions, replacing the 1s polling that LocalModelStatus
 * used previously. The state machine is additive — existing methods
 * (initialize / isLoaded / generate / unload) keep their signatures.
 *
 * State transitions:
 *   idle      → downloading  (initialize() starts)
 *   downloading → loading     (web-llm reports model-load progress)
 *   loading   → ready        (engine created successfully)
 *   downloading|loading → error (initialize() throws)
 *   ready     → generating   (generate() starts)
 *   generating → ready       (generate() finishes — success or aborted)
 *   generating → error       (generate() throws)
 *   *         → idle         (unload())
 */
export type LocalEngineState =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "generating"
  | "error"
  | "offline";

export class LocalInferenceEngine {
  private engine: WebWorkerMLCEngine | null = null;
  private isInitializing = false;
  private isReady = false;
  /** Model actually loaded into the engine (tier-picked or user-selected). */
  private currentModelId: string = DEFAULT_LOCAL_MODEL.id;

  // Batch 4: state machine
  private state: LocalEngineState = "idle";
  private listeners = new Set<(s: LocalEngineState) => void>();

  /** Current engine state. */
  getState(): LocalEngineState {
    return this.state;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: (s: LocalEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private setState(next: LocalEngineState) {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }

  /**
   * Build the WebLLM worker engine for one model. Isolated so the mirror
   * retry gets a pristine worker (a failed Create can leave the old one
   * wedged) and can inject the mirrored appConfig.
   */
  private async createEngine(
    model: LocalModelDefinition,
    contextWindowSize: number,
    progressCb: InitProgressCallback,
    useMirror: boolean,
  ): Promise<WebWorkerMLCEngine> {
    const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
    const engineConfigs: MLCEngineConfig = { initProgressCallback: progressCb };
    if (useMirror) {
      const mirrorAppConfig = buildMirrorAppConfig();
      if (mirrorAppConfig) engineConfigs.appConfig = mirrorAppConfig;
    }
    try {
      return await CreateWebWorkerMLCEngine(
        worker,
        model.id,
        engineConfigs,
        // web-llm ChatOptions — snake_case ChatConfig overrides. The context
        // window cap lands here; engine-level config stays in createEngine.
        { context_window_size: contextWindowSize },
      );
    } catch (error) {
      // The worker is unusable after a failed create — free it before the
      // caller decides whether to retry on the mirror.
      try { worker.terminate(); } catch { /* already dead */ }
      throw error;
    }
  }

  async initialize(
    onProgress?: (progress: InitProgressReport) => void,
    /** Optional explicit model id; defaults to the device-tier pick. */
    modelId?: string,
    /** Optional engine config overrides (contextWindowSize etc.). */
    engineConfig?: { contextWindowSize?: number },
  ): Promise<boolean> {
    if (this.isReady) {
      this.setState("ready");
      return true;
    }
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.setState("downloading");
    let sawModelLoadStart = false;
    // Resolve the model: explicit id when valid, else the device-tier pick.
    const requested = modelId ? getLocalModelDefinition(modelId) : undefined;
    let model = requested ?? pickLocalModelForDevice(
      typeof navigator !== "undefined" ? (navigator as any).deviceMemory : undefined,
      typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    );
    // fp16 weights need the shader-f16 GPU feature — swap to the q4f32 twin
    // when the adapter lacks it (software adapters, older drivers).
    if (model.fallbackModelId && !(await DeviceCapability.supportsShaderF16())) {
      const twin = getLocalModelDefinition(model.fallbackModelId);
      if (twin) {
        console.info(`[local-engine] shader-f16 unavailable — falling back to ${twin.id}`);
        model = twin;
      }
    }
    this.currentModelId = model.id;
    // KV-cache cap: the 0.5B–3B local models can't fit a 4k context on weak
    // GPUs (device-lost errors under memory pressure). 2k tokens covers
    // everyday private chat and roughly halves KV memory.
    const resolvedEngineConfig = { contextWindowSize: 2048, ...engineConfig };
    const progressCb: InitProgressCallback = (report) => {
      // web-llm emits progress through both the download and the model
      // load. The progress text changes from "Fetching..." to
      // "Loading..." once weights arrive; use that as the signal to
      // move from `downloading` to `loading`.
      const text = (report?.text || "").toLowerCase();
      if (!sawModelLoadStart && (text.includes("loading") || text.includes("initializing"))) {
        sawModelLoadStart = true;
        this.setState("loading");
      }
      onProgress?.(report);
    };
    try {
      this.engine = await this.createEngine(model, resolvedEngineConfig.contextWindowSize, progressCb, false);
      this.isReady = true;
      this.setState("ready");
      return true;
    } catch (error) {
      // Mirror retry: a Hugging Face CDN hiccup should never brick private AI.
      // One attempt against the self-hosted mirror (when configured) for
      // network-shaped failures; GPU/device errors are not worth a retry.
      if (isMirrorEligibleError(error) && buildMirrorAppConfig()) {
        console.info("[local-engine] primary download failed — retrying from the configured mirror");
        try {
          this.engine = await this.createEngine(model, resolvedEngineConfig.contextWindowSize, progressCb, true);
          this.isReady = true;
          this.setState("ready");
          return true;
        } catch (mirrorError) {
          console.error("Mirror download also failed:", mirrorError);
        }
      }
      console.error("Failed to initialize WebLLM engine:", error);
      this.setState("error");
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  isLoaded(): boolean {
    return this.isReady;
  }

  /** Model id currently loaded (or selected for the next initialize). */
  getCurrentModelId(): string {
    return this.currentModelId;
  }

  async generate(messages: CloudChatMessage[], options?: CloudChatOptions): Promise<CloudChatResult> {
    if (!this.engine || !this.isReady) {
      return { content: "", error: "Local engine not ready.", source: "local", modelUsed: this.currentModelId };
    }

    this.setState("generating");
    try {
      const webLlmMessages = messages.map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content
      }));

      const chunks = await this.engine.chat.completions.create({
        messages: webLlmMessages as any,
        temperature: options?.temperature ?? 0.7,
        stream: true,
      });

      let content = "";
      for await (const chunk of chunks) {
        if (options?.signal?.aborted) {
          break;
        }
        const delta = chunk.choices[0]?.delta?.content || "";
        content += delta;
        options?.onDelta?.(content);
      }
      this.setState("ready");
      return { content, source: "local", modelUsed: this.currentModelId };
    } catch (error: any) {
      console.error("Local generation error:", error);
      this.setState("error");
      // The engine is still loaded — recover to `ready` shortly so the next
      // call can proceed, but keep the error visible in the meantime.
      if (this.isReady) {
        setTimeout(() => { if (this.isReady) this.setState("ready"); }, 1500);
      }
      return { content: "", error: error.message || "Local generation failed.", source: "local", modelUsed: this.currentModelId };
    }
  }

  async unload() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.isReady = false;
    }
    this.setState("idle");
  }
}

// Singleton instance
export const localInferenceEngine = new LocalInferenceEngine();
