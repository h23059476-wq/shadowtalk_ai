import { MLCEngine, WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Instantiate the core engine
const engine = new MLCEngine();

// Pass it to the Web Worker handler which takes care of communication with the main thread
const handler = new (WebWorkerMLCEngineHandler as any)(engine);

// Bind message events
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
