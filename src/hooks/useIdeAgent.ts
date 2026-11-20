import { useCallback, useRef, useState } from "react";
import { turboComplete } from "@/lib/turbo/turboEngine";
import {
  buildIdeAgentSystemPrompt,
  buildWorkspaceContext,
  parseAgentResponse,
} from "@/lib/ide/agentProtocol";
import type { AgentSegment } from "@/lib/ide/agentProtocol";
import type { JulesWorkspaceFile } from "@/lib/jules/types";

export type IdeAgentMode = "agent" | "ask";

/** A file change card in the IDE transcript (UI state layered on the protocol change). */
export interface IdeAgentChange {
  path: string;
  content: string;
  language: string;
  isNew: boolean;
  applied?: boolean;
}

export interface IdeAgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Parsed segments — resolved once the reply finishes streaming. */
  segments?: AgentSegment[];
  /** File changes extracted from the reply, ready to apply. */
  changes?: IdeAgentChange[];
  error?: string;
  streaming?: boolean;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Conversational IDE agent on top of the app's AI router (keyless shared
 * access or BYOK). Streams replies, then parses them into renderable
 * segments and applicable file changes.
 */
export function useIdeAgent(files: JulesWorkspaceFile[], activeFileName?: string) {
  const [messages, setMessages] = useState<IdeAgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const filesRef = useRef(files);
  const activeRef = useRef(activeFileName);
  filesRef.current = files;
  activeRef.current = activeFileName;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );
  }, []);

  const send = useCallback(
    async (task: string, mode: IdeAgentMode = "agent"): Promise<void> => {
      const trimmed = task.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: IdeAgentMessage = { id: newId(), role: "user", content: trimmed };
      const assistantId = newId();
      const assistantMsg: IdeAgentMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const workspaceFiles = filesRef.current;
      const userContent =
        mode === "agent"
          ? buildWorkspaceContext(trimmed, workspaceFiles, activeRef.current)
          : [
              `QUESTION / REVIEW REQUEST:\n${trimmed}`,
              `ACTIVE FILE: ${activeRef.current ?? "(none)"}`,
              `FILE CONTENT:\n${workspaceFiles.find((f) => f.name === activeRef.current)?.content ?? "(empty)"}`,
            ].join("\n\n");

      try {
        const result = await turboComplete(buildIdeAgentSystemPrompt(mode), userContent, {
          temperature: 0.2,
          maxTokens: 4096,
          signal: controller.signal,
          onDelta: (accumulated) => {
            // Live-parse so the transcript renders structured blocks while streaming.
            const live = parseAgentResponse(
              accumulated,
              filesRef.current.map((f) => f.name),
            );
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: accumulated, segments: live.segments, changes: live.changes }
                  : m,
              ),
            );
          },
        });

        const parsed = parseAgentResponse(
          result.content,
          workspaceFiles.map((f) => f.name),
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: result.content, segments: parsed.segments, changes: parsed.changes, streaming: false }
              : m,
          ),
        );
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  error: aborted
                    ? "Stopped."
                    : err instanceof Error
                      ? err.message
                      : "The agent request failed.",
                }
              : m,
          ),
        );
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [isStreaming],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages([]);
  }, []);

  /** Mark a change set as applied so its cards flip to the applied state. */
  const markApplied = useCallback((assistantId: string, paths: string[]) => {
    const pathSet = new Set(paths);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId || !m.changes) return m;
        const changes: IdeAgentChange[] = m.changes.map((c) =>
          pathSet.has(c.path) ? { ...c, isNew: false, applied: true } : c,
        );
        return { ...m, changes };
      }),
    );
  }, []);

  return { messages, isStreaming, send, stop, clear, markApplied };
}
