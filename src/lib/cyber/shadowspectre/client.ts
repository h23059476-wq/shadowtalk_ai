import { backend } from "@/integrations/local/client";
import { streamCloudChat, type CloudChatMessage } from "@/lib/cloudChat";
import type { AuthorizationContext, ShadowSpectreHead, ShadowSpectreMessage } from "./types";

export type StreamShadowSpectreOptions = {
  messages: ShadowSpectreMessage[];
  head?: ShadowSpectreHead | string;
  authorization?: AuthorizationContext | null;
  onToken: (token: string) => void;
  signal?: AbortSignal;
};

export async function streamShadowSpectre(
  options: StreamShadowSpectreOptions,
): Promise<{ content: string; head: ShadowSpectreHead }> {
  const { messages, head, onToken, signal } = options;
  const { data: { session } } = await backend.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Unauthorized. Sign in to use ShadowSpectre.");
  }

  const cloudMessages: CloudChatMessage[] = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  let previousContent = "";
  const result = await streamCloudChat(cloudMessages, {
    model: undefined,
    signal,
    onDelta: (content) => {
      onToken(content.slice(previousContent.length));
      previousContent = content;
    },
  });
  if (result.error) throw new Error(result.error);

  return { content: result.content, head: (head || "general") as ShadowSpectreHead };
}
