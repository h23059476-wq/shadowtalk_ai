import { AIProvider } from "./AIProvider";
import { streamCloudChat, CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";
import { isTurboAvailable } from "@/lib/turbo";

export class CloudAIProvider implements AIProvider {
  id = "cloud";

  isAvailable(): boolean {
    return navigator.onLine;
  }

  async streamChat(messages: CloudChatMessage[], options?: CloudChatOptions): Promise<CloudChatResult> {
    // Basic wrapper around existing streamCloudChat for now
    // In reality, this would route to Turbo or Cloud depending on AI_PROVIDER_OPTIONS
    return streamCloudChat(messages, options);
  }
}
