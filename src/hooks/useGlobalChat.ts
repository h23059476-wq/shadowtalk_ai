/**
 * useGlobalChat — standard (cloud/offline) chat path used as the fallback
 * for ShadowTalk-Turbo when no Groq key is available.
 */

import { useCallback, useRef, useState } from "react";
import { backend } from "@/integrations/local/client";
import { streamChatCompletion } from "@/lib/turbo/chatCompletion";
import { globalMemory, buildRecallPacket } from "@/lib/memory/adaptiveMemory";
import { AIProviderRouter } from "@/ai/AIProviderRouter";

export interface GlobalChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GlobalChatOptions {
  systemPrompt?: string;
  personality?: string;
  onDelta?: (accumulated: string) => void;
  signal?: AbortSignal;
  model?: string;
}

export interface GlobalChatResponse {
  content: string;
  source: "cloud" | "offline" | "error";
  error?: string;
}

export function useGlobalChat() {
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (messages: GlobalChatMessage[], opts: GlobalChatOptions = {}): Promise<GlobalChatResponse> => {
      setIsLoading(true);
      // Wire the abort controller so `abort()` (and unmount cleanup) can
      // actually cancel the in-flight stream — previously abortRef was never
      // assigned, so abort() was a silent no-op.
      const controller = new AbortController();
      abortRef.current = controller;
      const onExternalAbort = () => controller.abort();
      opts.signal?.addEventListener("abort", onExternalAbort);
      try {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        
        let contextPrefix = opts.systemPrompt;
        if (lastUser) {
          const recall = await buildRecallPacket(globalMemory, lastUser.content);
          if (recall) {
            contextPrefix = (contextPrefix ? contextPrefix + "\n\n" : "") + recall;
          }
        }
        
        // Build final message list
        const chatMessages = [...messages];
        if (contextPrefix) {
           chatMessages.unshift({ role: "system", content: contextPrefix });
        }

        const provider = await AIProviderRouter.getBestProvider();
        const { content, error } = await provider.streamChat(chatMessages, {
          signal: controller.signal,
          temperature: 0.7,
          onDelta: opts.onDelta,
        });
        if (error) throw new Error(error);

        return { content, source: "cloud" };
      } catch (err: any) {
        if (controller.signal.aborted || err?.name === "AbortError") {
          return { content: "", source: "error", error: "Chat stopped." };
        }
        if (err?.message === "offline_not_provisioned") {
          return {
            content: "",
            source: "error",
            error: "I'm offline and Local AI is not installed. Please connect to the internet or install Local AI in Settings.",
          };
        }
        return {
          content: "",
          source: "error",
          error: err instanceof Error ? err.message : "Chat request failed",
        };
      } finally {
        opts.signal?.removeEventListener("abort", onExternalAbort);
        if (abortRef.current === controller) abortRef.current = null;
        setIsLoading(false);
      }
    },
    [],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { send, abort, isLoading };
}
