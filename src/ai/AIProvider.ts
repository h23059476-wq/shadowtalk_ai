import { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";

export interface AIProvider {
  id: string;
  isAvailable(): boolean | Promise<boolean>;
  streamChat(messages: CloudChatMessage[], options?: CloudChatOptions): Promise<CloudChatResult>;
}
