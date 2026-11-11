/**
 * useTurboChat — React hook for ShadowTalk-Turbo.
 *
 * Uses turboEngine under the hood (self-contained, no turboPipeline dependency).
 * Falls back to useGlobalChat if no Groq key is available.
 */

import { useRef, useCallback, useState, useEffect } from "react";
import {
  turboComplete,
  isTurboAvailable as checkTurboAvailable,
  resolveTurboKey,
  type TurboEngineResult,
} from "@/lib/turbo";
import { useGlobalChat, type GlobalChatMessage } from "@/hooks/useGlobalChat";
import { globalMemory, buildRecallPacket } from "@/lib/memory/adaptiveMemory";
import { analyzeComplexity } from "@/lib/turbo/modelRouter";

export interface UseTurboChatReturn {
  send: (messages: GlobalChatMessage[], opts?: TurboChatHookOptions) => Promise<TurboChatResult>;
  abort: () => void;
  isLoading: boolean;
  isTurboAvailable: boolean;
  lastResult: TurboEngineResult | null;
}

export interface TurboChatHookOptions {
  systemPrompt?: string;
  personality?: "turbo" | "friendly" | "professional" | "creative";
  onDelta?: (accumulated: string) => void;
  forceStandard?: boolean;
}

export interface TurboChatResult {
  content: string;
  source: "turbo-groq" | "turbo-openai" | "turbo-openrouter" | "webgpu-local" | "standard-cloud" | "standard-offline" | "byok" | "error";
  ttftMs?: number;
  totalMs?: number;
}

const PERSONALITY_PREFIXES: Record<string, string> = {
  turbo: "You are ShadowTalk Turbo. Be direct, accurate, concise. Use **bold** for key terms, \\(code\\) for tech terms, bullets for lists.",
  friendly: "You are ShadowTalk. Be warm, helpful, concise.",
  professional: "You are ShadowTalk. Be precise, structured, data-driven.",
  creative: "You are ShadowTalk. Be imaginative, vivid, lateral.",
};

export function useTurboChat(): UseTurboChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [turboAvail, setTurboAvail] = useState(false);
  const [lastResult, setLastResult] = useState<TurboEngineResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const globalChat = useGlobalChat();

  useEffect(() => {
    const check = () => setTurboAvail(checkTurboAvailable());
    check();
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes("shadowtalk") || e.key?.includes("ai")) check();
    };
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(check, 30_000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const send = useCallback(
    async (
      messages: GlobalChatMessage[],
      opts: TurboChatHookOptions = {},
    ): Promise<TurboChatResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const turboKey = resolveTurboKey();

        // Intelligent Model Routing
        const complexity = analyzeComplexity(messages);
        
        // No key or forced standard or high complexity → use global chat
        if ((complexity === 'high' && opts.forceStandard) || (!turboKey && !opts.forceStandard)) {
          const result = await globalChat.send(messages, {
            systemPrompt: opts.systemPrompt,
            personality: opts.personality,
            onDelta: opts.onDelta,
            signal: controller.signal,
          });
          const source = result.source === "cloud" ? "standard-cloud" : result.source === "offline" ? "standard-offline" : "error";
          setIsLoading(false);
          return { content: result.content, source: source as TurboChatResult["source"] };
        }

        // ---- TURBO PATH ----
        const lastUser = [...messages].reverse().find(m => m.role === "user");
        let systemPrompt =
          opts.systemPrompt ||
          PERSONALITY_PREFIXES[opts.personality || "turbo"] ||
          PERSONALITY_PREFIXES.turbo;

        if (lastUser) {
          const recall = await buildRecallPacket(globalMemory, lastUser.content);
          if (recall) {
            systemPrompt = systemPrompt + "\n\n" + recall;
          }
        }

        const result = await turboComplete(
          systemPrompt,
          lastUser?.content || "",
          {
            signal: controller.signal,
            onDelta: opts.onDelta,
            taskComplexity: complexity,
          },
        );

        setLastResult(result);

        setIsLoading(false);
        return {
          content: result.content,
          source: result.source === "cloud" ? "standard-cloud" : "byok",
          ttftMs: result.ttftMs,
          totalMs: result.totalMs,
        };
      } catch (err) {
        if (controller.signal.aborted) {
          setIsLoading(false);
          return { content: "", source: "error" };
        }
        console.error("[TurboChat] Error:", err);
        setIsLoading(false);
        return { content: "Something went wrong. Please try again.", source: "error" };
      }
    },
    [globalChat],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  return { send, abort, isLoading, isTurboAvailable: turboAvail, lastResult };
}
