import { AIProvider } from "./AIProvider";
import { localInferenceEngine } from "@/offline/LocalInferenceEngine";
import { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";
import { DeviceCapability } from "@/offline/DeviceCapability";

export class LocalAIProvider implements AIProvider {
  id = "local";

  async isAvailable(): Promise<boolean> {
    const hasGpu = await DeviceCapability.hasWebGPU();
    return hasGpu && localInferenceEngine.isLoaded();
  }

  async streamChat(messages: CloudChatMessage[], options?: CloudChatOptions): Promise<CloudChatResult> {
    return localInferenceEngine.generate(messages, options);
  }
}
