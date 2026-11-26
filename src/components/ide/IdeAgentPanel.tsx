import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp, Bot, Check, CircleStop, Code2, Download, Eraser,
  LayoutGrid, Loader2, MessageCircleQuestion,
  Sparkles, Wand2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIdeAgent } from "@/hooks/useIdeAgent";
import ShadowVisualRenderer from "@/components/visual/ShadowVisualRenderer";
import type { IdeAgentChange, IdeAgentMessage, IdeAgentMode } from "@/hooks/useIdeAgent";
import type { AgentSegment } from "@/lib/ide/agentProtocol";
import { getCachedAiAccessMode } from "@/lib/aiAccessMode";
import { isTurboAvailable } from "@/lib/turbo/turboEngine";
import { trackShadowTalkEvent } from "@/lib/analyticsEventTracker";
import { cn } from "@/lib/utils";
import type { JulesWorkspaceFile, ParsedFileChange } from "@/lib/jules/types";

const QUICK_TASKS: Array<{ label: string; icon: typeof Wand2; prompt: string; mode?: IdeAgentMode }> = [
  { label: "Build a landing page", icon: Zap, prompt: "Build a small dark-themed product landing page (index.html + style.css + app.js) with a hero, three feature cards and a footer." },
  { label: "Refactor", icon: Wand2, prompt: "Refactor the active file for clarity and maintainability. Keep behavior identical." },
  { label: "Fix bugs", icon: Zap, prompt: "Find and fix bugs and edge cases in the workspace. Explain each fix in one line." },
  { label: "Add a feature", icon: Sparkles, prompt: "Add one small, useful feature to this project. Keep it self-contained." },
  { label: "Chart the data", icon: LayoutGrid, prompt: "Create a visual summary of this project: emit a shadowvisual block (mode chart, diagram or infographic) that presents the project's structure or key metrics as a studio visual." },
  { label: "Explain the code", icon: MessageCircleQuestion, prompt: "Explain how this project works, file by file. Keep it short.", mode: "ask" },
];

interface IdeAgentPanelProps {
  files: JulesWorkspaceFile[];
  activeFileName?: string;
  onApplyChanges: (changes: ParsedFileChange[]) => void;
}

function accessLabel(): { text: string; connected: boolean } {
  if (!isTurboAvailable()) return { text: "Not connected", connected: false };
  const mode = getCachedAiAccessMode();
  return mode === "byok"
    ? { text: "BYOK key", connected: true }
    : { text: "Keyless cloud", connected: true };
}

/** The AI side of the IDE: a streaming agent that edits files and renders studio visuals. */
export function IdeAgentPanel({ files, activeFileName, onApplyChanges }: IdeAgentPanelProps) {
  const { toast } = useToast();
  const agent = useIdeAgent(files, activeFileName);
  const [task, setTask] = useState("");
  const [mode, setMode] = useState<IdeAgentMode>("agent");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const transcriptRef = useRef<HTMLDivElement>(null);
  const access = useMemo(accessLabel, []);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [agent.messages]);

  const send = useCallback((text: string, sendMode: IdeAgentMode = mode) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    void agent.send(trimmed, sendMode);
    setTask("");
    trackShadowTalkEvent("ide_agent_run", { mode: sendMode, chars: trimmed.length });
  }, [agent, mode]);

  const applyChange = useCallback((msgId: string, change: IdeAgentChange) => {
    onApplyChanges([{ path: change.path, content: change.content, isNew: change.isNew }]);
    agent.markApplied(msgId, [change.path]);
    setAppliedIds((prev) => new Set(prev).add(`${msgId}:${change.path}`));
    toast({ title: `Applied to ${change.path}`, description: "The file is updated in the editor." });
    trackShadowTalkEvent("ide_agent_apply", { path: change.path });
  }, [agent, onApplyChanges, toast]);

  const applyAll = useCallback((msg: IdeAgentMessage) => {
    if (!msg.changes?.length) return;
    onApplyChanges(msg.changes.map((c) => ({ path: c.path, content: c.content, isNew: c.isNew })));
    agent.markApplied(msg.id, msg.changes.map((c) => c.path));
    setAppliedIds((prev) => {
      const next = new Set(prev);
      for (const c of msg.changes!) next.add(`${msg.id}:${c.path}`);
      return next;
    });
    toast({ title: `${msg.changes.length} change${msg.changes.length === 1 ? "" : "s"} applied`, description: "Workspace updated." });
    trackShadowTalkEvent("ide_agent_apply", { count: msg.changes.length });
  }, [agent, onApplyChanges, toast]);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="ide-agent-panel">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-card/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-secondary p-[3px] flex items-center justify-center shrink-0">
            <Bot className="h-3.5 w-3.5 text-primary-foreground" aria-hidden />
          </span>
          <span className="text-sm font-semibold truncate">AI Agent</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 gap-1 shrink-0",
              access.connected
                ? "border-primary/40 text-primary"
                : "border-warning/40 text-warning",
            )}
          >
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            {access.text}
          </Badge>
        </div>
        {agent.messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={agent.clear} aria-label="Clear conversation">
            <Eraser className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 min-h-0 overflow-y-auto">
        {agent.messages.length === 0 ? (
          <EmptyAgentState
            onPick={(t, m) => send(t, m ?? mode)}
            filesCount={files.length}
            activeFileName={activeFileName}
          />
        ) : (
          <div className="p-3 space-y-4">
            {agent.messages.map((msg) => (
              <AgentMessageView
                key={msg.id}
                msg={msg}
                onApplyChange={applyChange}
                onApplyAll={applyAll}
              />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-card/40 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <ModePill active={mode === "agent"} onClick={() => setMode("agent")} icon={Wand2} label="Agent" />
          <ModePill active={mode === "ask"} onClick={() => setMode("ask")} icon={MessageCircleQuestion} label="Ask" />
          <span className="ml-auto text-[10px] text-muted-foreground font-mono hidden sm:block">
            {files.length} file{files.length === 1 ? "" : "s"} in context
          </span>
        </div>
        <div className="relative">
          <Textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(task);
              }
            }}
            placeholder={mode === "agent" ? "Describe what to build or change…" : "Ask about this code…"}
            className="min-h-[64px] max-h-32 text-xs resize-none pr-11 bg-background/60"
            aria-label="Message the IDE agent"
          />
          {agent.isStreaming ? (
            <Button
              size="icon"
              onClick={agent.stop}
              className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-destructive/90 hover:bg-destructive text-destructive-foreground"
              aria-label="Stop generating"
            >
              <CircleStop className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => send(task)}
              disabled={!task.trim()}
              className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Agent edits run in your workspace — review every change before applying.
        </p>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────

function EmptyAgentState({ onPick, filesCount, activeFileName }: {
  onPick: (prompt: string, mode?: IdeAgentMode) => void;
  filesCount: number;
  activeFileName?: string;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-4 space-y-1.5">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Your AI pair programmer
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {filesCount > 0
            ? <>The agent sees your whole workspace — currently <span className="font-mono text-foreground">{filesCount} file{filesCount === 1 ? "" : "s"}</span>{activeFileName ? <> with <span className="font-mono text-foreground">{activeFileName}</span> in focus</> : null}. It proposes full-file changes; you apply them.</>
            : <>Start from a template in the toolbar, then describe what you want built.</>}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Quick tasks</p>
        <div className="grid grid-cols-1 gap-1.5">
          {QUICK_TASKS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => onPick(q.prompt, q.mode)}
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-card/50 px-3 py-2 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5 transition-colors"
            >
              <q.icon className="h-3.5 w-3.5 text-primary/80 group-hover:text-primary shrink-0" aria-hidden />
              <span className="flex-1">{q.label}</span>
              <ArrowUp className="h-3 w-3 opacity-0 group-hover:opacity-60 -rotate-45 shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Message rendering ──────────────────────────────────────────────────

function AgentMessageView({ msg, onApplyChange, onApplyAll }: {
  msg: IdeAgentMessage;
  onApplyChange: (msgId: string, change: IdeAgentChange) => void;
  onApplyAll: (msg: IdeAgentMessage) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%] rounded-2xl rounded-br-md border border-primary/25 bg-primary/10 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  const segments: AgentSegment[] = msg.segments ?? [{ type: "text", text: msg.content }];
  const pending = msg.changes?.filter((c) => !c.applied) ?? [];

  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return (
            <p key={i} className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
              {seg.text}
            </p>
          );
        }
        if (seg.type === "visual") {
          // Studio visual — the JSON-to-engine renderer validates + styles it.
          return (
            <div key={i} className="my-1">
              <ShadowVisualRenderer payload={seg.raw} />
            </div>
          );
        }
        if (seg.type === "file") {
          return (
            <FileChangeCard
              key={`${seg.path}-${i}`}
              change={{ path: seg.path, content: seg.content, language: seg.language, isNew: seg.isNew }}
              onApply={() => onApplyChange(msg.id, { path: seg.path, content: seg.content, language: seg.language, isNew: seg.isNew })}
            />
          );
        }
        return (
          <pre key={i} className="rounded-lg border border-border bg-card/60 p-2.5 text-[10px] font-mono overflow-x-auto max-h-44 whitespace-pre-wrap text-muted-foreground">
            {seg.content}
          </pre>
        );
      })}

      {msg.streaming && !msg.segments?.length && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
          Thinking…
        </p>
      )}

      {msg.error && <p className="text-[11px] text-destructive">{msg.error}</p>}

      {pending.length > 0 && !msg.streaming && (
        <Button
          size="sm"
          onClick={() => onApplyAll(msg)}
          className="w-full h-8 gap-1.5 text-xs bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Apply all {pending.length} change{pending.length === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  );
}

function FileChangeCard({ change, onApply }: {
  change: IdeAgentChange;
  onApply: () => void;
}) {
  const lines = change.content.split("\n").length;
  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 space-y-2 transition-colors",
        change.applied
          ? "border-success/30 bg-success/5"
          : "border-primary/25 bg-primary/5 hover:border-primary/40",
      )}
      data-testid="ide-agent-file-change"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Code2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
        <span className="font-mono text-[11px] truncate flex-1">{change.path}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {change.isNew ? "new" : "edit"} · {lines} line{lines === 1 ? "" : "s"}
        </span>
      </div>
      <pre className="rounded-lg bg-background/80 border border-border/60 p-2 text-[10px] font-mono max-h-28 overflow-auto whitespace-pre text-muted-foreground">
        {change.content.slice(0, 600)}
        {change.content.length > 600 ? "\n…" : ""}
      </pre>
      <div className="flex items-center gap-1.5">
        {change.applied ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
            <Check className="h-3 w-3" aria-hidden />
            Applied
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={onApply} className="h-7 gap-1 text-[11px] border-primary/40 text-primary hover:bg-primary/10">
            <Download className="h-3 w-3" aria-hidden />
            Apply
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground/70 ml-auto">nothing runs until you apply</span>
      </div>
    </div>
  );
}

function ModePill({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: typeof Wand2;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </button>
  );
}

export default IdeAgentPanel;
