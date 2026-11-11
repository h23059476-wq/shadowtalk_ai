import { CreateWebWorkerMLCEngine, WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { DEFAULT_LOCAL_MODEL } from "@/ai/ModelRegistry";
import { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";

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

  async initialize(onProgress?: (progress: InitProgressReport) => void): Promise<boolean> {
    if (this.isReady) {
      this.setState("ready");
      return true;
    }
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.setState("downloading");
    let sawModelLoadStart = false;
    try {
      const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
      this.engine = await CreateWebWorkerMLCEngine(
        worker,
        DEFAULT_LOCAL_MODEL.id,
        {
          initProgressCallback: (report: InitProgressReport) => {
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
          },
        },
      );
      this.isReady = true;
      this.setState("ready");
      return true;
    } catch (error) {
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

  async generate(messages: CloudChatMessage[], options?: CloudChatOptions): Promise<CloudChatResult> {
    if (!this.engine || !this.isReady) {
      return { content: "", error: "Local engine not ready.", source: "local", modelUsed: DEFAULT_LOCAL_MODEL.id };
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
      return { content, source: "local", modelUsed: DEFAULT_LOCAL_MODEL.id };
    } catch (error: any) {
      console.error("Local generation error:", error);
      this.setState("error");
      // The engine is still loaded — recover to `ready` shortly so the next
      // call can proceed, but keep the error visible in the meantime.
      if (this.isReady) {
        setTimeout(() => { if (this.isReady) this.setState("ready"); }, 1500);
      }
      return { content: "", error: error.message || "Local generation failed.", source: "local", modelUsed: DEFAULT_LOCAL_MODEL.id };
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
