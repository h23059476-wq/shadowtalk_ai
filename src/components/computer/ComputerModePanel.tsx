import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCodeSandbox } from "@/hooks/useCodeSandbox";
import { cn } from "@/lib/utils";
import {
  Terminal,
  Loader2,
  Power,
  Globe,
  Cpu,
  Play,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { COMPUTER_FRAME_PATH, isCrossOriginIsolated } from "@/lib/crossOriginIsolation";

type TerminalLine = {
  type: "input" | "output" | "error" | "system";
  text: string;
};

const QUICK_COMMANDS = [
  { label: "node -v", cmd: "node -v" },
  { label: "npm -v", cmd: "npm -v" },
  { label: "ls", cmd: "ls -la" },
  { label: "Hello JS", cmd: 'node -e "console.log(\\"ShadowTalk Computer Mode\\")"' },
];

export function ComputerModePanel({ embedded = false }: { embedded?: boolean }) {
  const sandbox = useCodeSandbox();
  const isolated = isCrossOriginIsolated();
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      type: "system",
      text: "ShadowTalk Computer Mode — real in-browser shell (WebContainer). Web research opens in Shadow Browser.",
    },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);

  const boot = useCallback(async () => {
    const support = sandbox.checkSupport();
    setLines((prev) => [
      ...prev,
      {
        type: "system",
        text: support.webContainerSupported
          ? "Booting WebContainer…"
          : `Limited mode: needs cross-origin isolation (COOP/COEP). Open ${COMPUTER_FRAME_PATH} for the full shell.`,
      },
    ]);
    const ok = await sandbox.initialize();
    setLines((prev) => [
      ...prev,
      {
        type: ok ? "system" : "error",
        text: ok
          ? "✓ Computer ready — try: node -v, npm init -y, node -e \"console.log(1+1)\""
          : sandbox.error || "Failed to boot computer runtime.",
      },
    ]);
  }, [sandbox]);

  useEffect(() => {
    void boot();
    return () => sandbox.teardown();
    // Boot once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const runCommand = useCallback(
    async (command: string) => {
      const cmd = command.trim();
      if (!cmd) return;
      setLines((prev) => [...prev, { type: "input", text: `$ ${cmd}` }]);
      setHistory((h) => [...h.slice(-50), cmd]);
      setHistoryIdx(-1);

      if (cmd === "clear") {
        setLines([{ type: "system", text: "Terminal cleared." }]);
        return;
      }

      const result = await sandbox.runShellCommand(cmd);
      if (result.output) {
        result.output.split("\n").forEach((line) =>
          setLines((prev) => [...prev, { type: "output", text: line }]),
        );
      }
      if (result.error) {
        setLines((prev) => [...prev, { type: "error", text: result.error! }]);
      }
      if (result.success && !result.output && !result.error) {
        setLines((prev) => [...prev, { type: "system", text: "(done)" }]);
      }
    },
    [sandbox],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void runCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx < 0) return;
      const next = historyIdx + 1;
      if (next >= history.length) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(next);
        setInput(history[next]);
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", embedded ? "h-full" : "max-w-5xl mx-auto")}>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cpu className="h-5 w-5 text-primary" />
                Computer Mode
              </CardTitle>
              <CardDescription>
                Real npm/node shell in your browser — like Manus/Kimi code execution, sandboxed directly on your device.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sandbox.isReady ? "default" : "secondary"}>
                {sandbox.isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Booting
                  </>
                ) : sandbox.isReady ? (
                  <>
                    <Power className="h-3 w-3 mr-1" /> Shell ready
                  </>
                ) : (
                  "Offline / limited"
                )}
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link to="/research?tab=browser">
                  <Globe className="h-3.5 w-3.5 mr-1" />
                  Web browser
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isolated && !embedded && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
              WebContainer needs isolated headers.{" "}
              <a href={COMPUTER_FRAME_PATH} className="underline font-medium text-amber-100">
                Open isolated computer shell
              </a>{" "}
              or hard-refresh after deploy.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMANDS.map((q) => (
              <Button
                key={q.cmd}
                variant="secondary"
                size="sm"
                className="text-xs h-7"
                disabled={sandbox.isExecuting}
                onClick={() => void runCommand(q.cmd)}
              >
                <Play className="h-3 w-3 mr-1" />
                {q.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setLines([{ type: "system", text: "Terminal cleared." }])}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>

          <div className="rounded-lg border border-border/60 bg-zinc-950 text-zinc-100 font-mono text-xs overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-zinc-900/80">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-zinc-400">shadowtalk@computer ~</span>
            </div>
            <ScrollArea className={embedded ? "h-[min(60vh,520px)]" : "h-[420px]"}>
              <div className="p-3 space-y-0.5">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "whitespace-pre-wrap break-all",
                      line.type === "input" && "text-sky-300",
                      line.type === "error" && "text-red-400",
                      line.type === "system" && "text-zinc-500",
                      line.type === "output" && "text-zinc-200",
                    )}
                  >
                    {line.text}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2 p-2 border-t border-border/40 bg-zinc-900/50">
              <span className="text-emerald-400 pl-1 pt-2">$</span>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={sandbox.isExecuting}
                placeholder={sandbox.isReady ? "npm init -y && node -e \"console.log('hi')\"" : "Booting…"}
                className="font-mono text-xs bg-transparent border-0 focus-visible:ring-0 text-zinc-100"
              />
              {sandbox.isExecuting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-2" />}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Shell runs locally via WebContainer. Full cloud VM browser automation (click/type on any site) is on the
            roadmap — use <Link to="/research?tab=browser" className="text-primary hover:underline">Shadow Browser</Link>{" "}
            for research and scrape today.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
