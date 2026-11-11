import { useState } from "react";
import {
  Bot, Loader2, Play, Shield, Sparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLocalCodeAgent } from "@/hooks/useLocalCodeAgent";

import type { JulesWorkspaceFile, ParsedFileChange } from "@/lib/jules/types";

const QUICK_TASKS = [
  { label: "Refactor", prompt: "Refactor this code for clarity and maintainability." },
  { label: "Add tests", prompt: "Add tests for the core logic." },
  { label: "Fix bugs", prompt: "Find and fix bugs and edge cases." },
  { label: "Explain", prompt: "Explain this code in detail.", code: false },
];

interface JulesPanelProps {
  files: JulesWorkspaceFile[];
  activeFileName?: string;
  onApplyChanges: (changes: ParsedFileChange[]) => void;
}

/** On-device code agent — no cloud egress; replaces cloud Jules when device-only pledge is active. */
export function JulesPanel({ files, activeFileName, onApplyChanges }: JulesPanelProps) {
  const [task, setTask] = useState("");
  const agent = useLocalCodeAgent(files, activeFileName);

  const handleApply = () => {
    if (!agent.lastResult) return;
    const target = activeFileName ?? files[0]?.name ?? "output.txt";
    onApplyChanges([{ path: target, content: agent.lastResult, isNew: false }]);
    agent.clearPendingChanges();
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-foreground">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">On-Device Agent</span>
          <Badge variant="secondary" className="text-[10px] h-5 gap-1">
            <Shield className="h-2.5 w-2.5" /> Local only
          </Badge>
          {agent.isRunning && <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />}
        </div>
        {agent.lastResult && (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={agent.reset}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Running in cloud via Groq.
          </p>

          <Textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what the on-device agent should do with your workspace…"
            className="min-h-[80px] text-xs resize-none"
          />

          <div className="flex flex-wrap gap-1">
            {QUICK_TASKS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setTask(q.prompt)}
                className="text-[10px] px-2 py-1 rounded-full border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>

          <Button
            className="w-full h-8 gap-2 bg-emerald-700 hover:bg-emerald-600"
            disabled={agent.isRunning || !task.trim()}
            onClick={() => void agent.runTask(task, true)}
          >
            {agent.isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Run on-device
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            {files.length} file{files.length === 1 ? "" : "s"} in workspace · zero cloud upload
          </p>

          {agent.statusLine && (
            <p className="text-[11px] text-emerald-400/90">{agent.statusLine}</p>
          )}

          {agent.lastResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-2">
              <p className="text-xs font-medium text-emerald-400">Output ready</p>
              <pre className="text-[10px] max-h-32 overflow-auto text-muted-foreground whitespace-pre-wrap">
                {agent.lastResult.slice(0, 1200)}
                {agent.lastResult.length > 1200 ? "\n…" : ""}
              </pre>
              <Button size="sm" className="w-full h-8 gap-1" onClick={handleApply}>
                <Play className="h-3.5 w-3.5" /> Apply to {activeFileName ?? "workspace"}
              </Button>
            </div>
          )}

          {agent.error && (
            <p className={cn("text-[11px] px-2", "text-red-400")}>{agent.error}</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
