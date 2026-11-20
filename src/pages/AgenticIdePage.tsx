import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, Check, Code2, Copy, Download, Eye,
  Files, Loader2, Monitor, PanelRightClose, PanelRightOpen, Play,
  RefreshCw, Smartphone, Sparkles, SquareDashedBottom, Tablet, Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { PageLoader } from "@/components/PageLoader";
import { useToast } from "@/hooks/use-toast";
import { trackShadowTalkEvent } from "@/lib/analyticsEventTracker";
import { cn } from "@/lib/utils";
import { IdeExplorer } from "@/components/ide/IdeExplorer";
import { IdeTemplatePicker, IDE_TEMPLATES } from "@/components/ide/IdeTemplatePicker";
import { SHADOWTALK_MONACO_THEME, defineShadowTalkTheme } from "@/lib/ide/monacoTheme";
import { inferLanguageFromName } from "@/lib/ide/agentProtocol";
import { validateSvg, svgToRasterBlob, downloadBlob, codedImageFileName } from "@/lib/codedImages";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));
const IdeAgentPanel = lazy(() => import("@/components/ide/IdeAgentPanel").then(m => ({ default: m.IdeAgentPanel })));

// ── Types ──────────────────────────────────────────────────────────────

interface IdeFile {
  name: string;
  content: string;
  language: string;
}

// ── Templates ──────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { files: IdeFile[] }> = {
  react: {
    files: [
      { name: "index.html", language: "html", content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="app.js"></script>
</body>
</html>` },
      { name: "app.js", language: "javascript", content: `const { useState } = React;

function App() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>React Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);` },
    ],
  },
  vanilla: {
    files: [
      { name: "index.html", language: "html", content: `<!DOCTYPE html>
<html>
<head>
  <title>Vanilla JS</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <h1>Hello from Vanilla JS</h1>
    <button id="btn">Click me</button>
    <p id="count">0</p>
  </div>
  <script src="script.js"></script>
</body>
</html>` },
      { name: "style.css", language: "css", content: `body { font-family: system-ui; padding: 40px; background: #08080d; color: #f4f4fb; }
button { padding: 8px 16px; background: #1ac6ff; color: #08080d; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; }
button:hover { opacity: 0.9; }` },
      { name: "script.js", language: "javascript", content: `let count = 0;
const btn = document.getElementById("btn");
const display = document.getElementById("count");
btn.addEventListener("click", () => {
  count++;
  display.textContent = count;
});` },
    ],
  },
  svg: {
    files: [
      { name: "poster.svg", language: "svg", content: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08080d"/>
      <stop offset="1" stop-color="#141428"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1ac6ff"/>
      <stop offset="0.5" stop-color="#a78bfa"/>
      <stop offset="1" stop-color="#f472b6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="980" cy="140" r="220" fill="#1ac6ff" opacity="0.08"/>
  <circle cx="180" cy="520" r="260" fill="#a78bfa" opacity="0.08"/>
  <rect x="90" y="240" width="420" height="8" rx="4" fill="url(#accent)"/>
  <text x="90" y="215" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#8a8aa3" letter-spacing="6">SHADOWTALK · CODED IMAGE</text>
  <text x="90" y="330" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#f4f4fb">Think AI.</text>
  <text x="90" y="404" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="url(#accent)">Think ShadowTalk.</text>
  <text x="90" y="470" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#8a8aa3">This poster is SVG code — edit it, then export PNG or JPG.</text>
  <rect x="90" y="520" width="240" height="56" rx="28" fill="none" stroke="url(#accent)" stroke-width="2"/>
  <text x="122" y="556" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#f4f4fb">Works offline</text>
</svg>` },
    ],
  },
  python: {
    files: [
      { name: "main.py", language: "python", content: `def fibonacci(n):
    """Generate the first n Fibonacci numbers."""
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

if __name__ == "__main__":
    nums = fibonacci(10)
    print(f"First 10 Fibonacci numbers: {nums}")` },
    ],
  },
};

// ── LocalStorage persistence ───────────────────────────────────────────

const STORAGE_KEY = "shadowtalk_ide_files_v1";

function loadFiles(): IdeFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IdeFile[];
      if (Array.isArray(parsed) && parsed.every((f) => typeof f.name === "string" && typeof f.content === "string")) {
        return parsed.map((f) => ({ ...f, language: f.language || inferLanguageFromName(f.name) }));
      }
    }
  } catch { /* ignore */ }
  return TEMPLATES.vanilla.files;
}

function saveFiles(files: IdeFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch { /* ignore */ }
}

// ── Preview building ───────────────────────────────────────────────────

function buildPreviewHtml(files: IdeFile[]): string | null {
  const htmlFile = files.find((f) => f.name.endsWith(".html") || f.name.endsWith(".htm"));
  if (!htmlFile) return null;

  let html = htmlFile.content;

  html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>(?:<\/link>)?/g, (_, href: string) => {
    const cssFile = files.find((f) => f.name === href);
    return cssFile ? `<style>${cssFile.content}</style>` : "";
  });

  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (_, src: string) => {
    const jsFile = files.find((f) => f.name === src);
    return jsFile ? `<script>${jsFile.content}</script>` : "";
  });

  return html;
}

type DeviceSize = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<DeviceSize, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

type Panel = "editor" | "preview" | "terminal" | "agent";
type DockTab = "preview" | "terminal" | "agent";

const CONSOLE_LINE_STYLE = (line: string) =>
  line.startsWith("Error") || line.startsWith("ERROR")
    ? "text-destructive"
    : line.startsWith("✓")
      ? "text-success"
      : line.startsWith("$")
        ? "text-primary"
        : "text-foreground/80";

// ── Main component ─────────────────────────────────────────────────────

export default function AgenticIdePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [files, setFiles] = useState<IdeFile[]>(loadFiles);
  const [activeFile, setActiveFile] = useState<string>(files[0]?.name || "");
  const [panel, setPanel] = useState<Panel>("editor");
  const [dockTab, setDockTab] = useState<DockTab>("preview");
  const [dockOpen, setDockOpen] = useState(true);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [mobileExplorer, setMobileExplorer] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(files.length === 0);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<DeviceSize>("desktop");
  const [previewNonce, setPreviewNonce] = useState(0);

  const previewRef = useRef<HTMLIFrameElement>(null);
  const monacoRef = useRef<{ addCommand: (keybinding: number, handler: () => void) => void } | null>(null);
  const [previewHtmlLive, setPreviewHtmlLive] = useState<string | null>(null);

  // Persist files to localStorage on change
  useEffect(() => { saveFiles(files); }, [files]);

  // Track page view
  useEffect(() => {
    trackShadowTalkEvent("ide_page_viewed");
  }, []);

  const currentFile = useMemo(() => files.find((f) => f.name === activeFile), [files, activeFile]);
  const previewHtml = useMemo(() => buildPreviewHtml(files), [files]);

  // Debounced preview content — typing never thrashes the iframe runtime
  useEffect(() => {
    const t = window.setTimeout(() => setPreviewHtmlLive(previewHtml), 600);
    return () => window.clearTimeout(t);
  }, [previewHtml]);
  const svgPreviewFile = useMemo(() => {
    const target = activeFile.endsWith(".svg") ? activeFile : files.find((f) => f.name.endsWith(".svg"))?.name;
    if (previewHtml) return null; // HTML preview wins
    if (!target) return null;
    const file = files.find((f) => f.name === target);
    return file ? { name: file.name, validation: validateSvg(file.content) } : null;
  }, [files, activeFile, previewHtml]);

  // ── File operations ──
  const updateFileContent = useCallback((content: string) => {
    setFiles((prev) => prev.map((f) => f.name === activeFile ? { ...f, content } : f));
  }, [activeFile]);

  const addFile = useCallback((name: string, content = "") => {
    setFiles((prev) => {
      if (prev.some((f) => f.name === name)) return prev;
      return [...prev, { name, content, language: inferLanguageFromName(name) }];
    });
    setActiveFile(name);
    setConsoleLines((prev) => [...prev, `$ created ${name}`]);
  }, []);

  const renameFile = useCallback((oldName: string, newName: string) => {
    setFiles((prev) => prev.map((f) => f.name === oldName ? { ...f, name: newName, language: inferLanguageFromName(newName) } : f));
    setActiveFile((prev) => (prev === oldName ? newName : prev));
    setConsoleLines((prev) => [...prev, `$ renamed ${oldName} → ${newName}`]);
    trackShadowTalkEvent("ide_file_rename");
  }, []);

  const deleteFile = useCallback((name: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.name !== name);
      setActiveFile((cur) => (cur === name ? next[0]?.name ?? "" : cur));
      return next;
    });
    setConsoleLines((prev) => [...prev, `$ deleted ${name}`]);
  }, []);

  const loadTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES[templateId];
    if (!template) return;
    setFiles(template.files);
    setActiveFile(template.files[0].name);
    setShowTemplatePicker(false);
    setConsoleLines([`$ loaded template: ${IDE_TEMPLATES.find((t) => t.id === templateId)?.label ?? templateId}`]);
    setPanel("editor");
  }, []);

  // ── Export / copy ──
  const copyAll = useCallback(async () => {
    const text = files.map((f) => `// === ${f.name} ===\n${f.content}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [files]);

  const downloadFile = useCallback((name: string) => {
    const file = files.find((f) => f.name === name);
    if (!file) return;
    downloadBlob(new Blob([file.content], { type: "text/plain;charset=utf-8" }), name);
  }, [files]);

  const exportZip = useCallback(async () => {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    try {
      const { zipSync, strToU8 } = await import("fflate");
      const zipped = zipSync(Object.fromEntries(files.map((f) => [f.name, strToU8(f.content)])));
      downloadBlob(new Blob([zipped], { type: "application/zip" }), `shadowtalk-workspace-${stamp}.zip`);
      trackShadowTalkEvent("ide_export_zip", { files: files.length });
    } catch {
      // fflate unavailable — fall back to the plain-text bundle
      const text = files.map((f) => `// === ${f.name} ===\n${f.content}`).join("\n\n\n");
      downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `shadowtalk-workspace-${stamp}.txt`);
    }
  }, [files]);

  // ── Preview ──
  const runPreview = useCallback(() => {
    if (!previewHtml && !svgPreviewFile) {
      setConsoleLines((prev) => [...prev, "Error: preview needs an .html file (or an .svg to render)"]);
      setDockTab("terminal");
      setPanel("terminal");
      return;
    }
    setPanel("preview");
    setDockTab("preview");
    setDockOpen(true);
    setPreviewNonce((n) => n + 1);
    trackShadowTalkEvent("ide_preview_run");
  }, [previewHtml, svgPreviewFile]);

  const runPreviewRef = useRef(runPreview);
  runPreviewRef.current = runPreview;

  // ── Console (run active file) ──
  const runCode = useCallback(() => {
    setIsRunning(true);
    setConsoleLines((prev) => [...prev, `$ run ${activeFile || "(no file)"}`]);

    if (!currentFile) {
      setConsoleLines((prev) => [...prev, "Error: no file is open"]);
    } else if (activeFile.endsWith(".py")) {
      setConsoleLines((prev) => [
        ...prev,
        "Python runs outside the browser sandbox — hand it to the AI Agent instead:",
        "open the AI panel and ask it to review or execute the logic in JavaScript.",
      ]);
    } else if (/\.(js|mjs|jsx)$/.test(activeFile)) {
      try {
        const logs: string[] = [];
        const sandboxConsole = {
          log: (...args: unknown[]) => logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ")),
          error: (...args: unknown[]) => logs.push("ERROR: " + args.map(String).join(" ")),
          warn: (...args: unknown[]) => logs.push("WARN: " + args.map(String).join(" ")),
        };
        // eslint-disable-next-line no-new-func
        const fn = new Function("console", currentFile.content);
        fn(sandboxConsole);
        setConsoleLines((prev) => [...prev, ...logs, "✓ Execution complete"]);
      } catch (err) {
        setConsoleLines((prev) => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
      }
    } else {
      setConsoleLines((prev) => [...prev, `Cannot execute ${activeFile} — press Preview for HTML, or run .js files`]);
    }

    setIsRunning(false);
    setPanel("terminal");
    setDockTab("terminal");
    trackShadowTalkEvent("ide_code_run", { file: activeFile });
  }, [activeFile, currentFile]);

  // ── Agent integration ──
  const julesFiles = useMemo(
    () => files.map((f) => ({ name: f.name, content: f.content, language: f.language })),
    [files],
  );

  const handleApplyChanges = useCallback((changes: Array<{ path: string; content: string; isNew: boolean }>) => {
    setFiles((prev) => {
      const next = [...prev];
      for (const change of changes) {
        const idx = next.findIndex((f) => f.name === change.path);
        if (idx >= 0) {
          next[idx] = { ...next[idx], content: change.content };
        } else {
          next.push({ name: change.path, content: change.content, language: inferLanguageFromName(change.path) });
        }
      }
      return next;
    });
    setActiveFile((cur) => (changes.some((c) => c.path === cur) ? cur : changes[0]?.path ?? cur));
    setConsoleLines((prev) => [...prev, `✓ agent applied ${changes.length} change${changes.length === 1 ? "" : "s"}`]);
  }, []);

  const exportSvgImage = useCallback(async (format: "png" | "jpeg") => {
    const source = svgPreviewFile?.validation.ok ? svgPreviewFile.validation.svg : null;
    if (!source) return;
    try {
      const blob = await svgToRasterBlob(source, {
        format,
        scale: 2,
        background: format === "jpeg" ? "#ffffff" : undefined,
      });
      downloadBlob(blob, codedImageFileName(format === "png" ? "png" : "jpg"));
    } catch {
      toast({ title: "Export failed", description: "The SVG could not be rasterized.", variant: "destructive" });
    }
  }, [svgPreviewFile, toast]);

  // ── Keyboard shortcuts ──
  const savedToast = useCallback(() => {
    toast({ title: "Saved", description: "Your workspace auto-saves on this device — nothing is uploaded." });
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        savedToast();
      } else if (e.key === "Enter") {
        e.preventDefault();
        runPreviewRef.current();
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        setExplorerOpen((v) => !v);
      } else if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        setDockOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [savedToast]);

  const dockContent = (context: "desktop" | "inline") => (
    <>
      {/* Dock tab strip — the mobile bottom nav covers switching inline */}
      {context === "desktop" && (
        <div className="shrink-0 h-9 flex items-center gap-1 px-2 border-b border-border bg-card/30">
          {([
            { id: "preview" as const, label: "Preview", icon: Eye },
            { id: "agent" as const, label: "AI Agent", icon: Bot },
            { id: "terminal" as const, label: "Console", icon: Terminal },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDockTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                dockTab === tab.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" aria-hidden />
              {tab.label}
            </button>
          ))}
          <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={() => setDockOpen(false)} aria-label="Hide panel">
            <PanelRightClose className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      {/* Preview */}
      <div className={cn("flex-1 min-h-0 flex-col", dockTab === "preview" ? "flex" : "hidden")} data-panel="preview">
        {previewHtml ? (
          <>
            <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-border bg-background/40">
              {([
                { id: "desktop" as const, icon: Monitor, label: "Desktop" },
                { id: "tablet" as const, icon: Tablet, label: "Tablet" },
                { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
              ]).map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  aria-label={`${d.label} preview`}
                  aria-pressed={device === d.id}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    device === d.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <d.icon className="h-3.5 w-3.5" aria-hidden />
                </button>
              ))}
              <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                {device === "desktop" ? "responsive" : DEVICE_WIDTH[device]}
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-muted-foreground hidden xl:inline">auto-refreshes as you type</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewNonce((n) => n + 1)} aria-label="Reload preview">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
            <div className="flex-1 min-h-0 bg-muted/30 flex justify-center overflow-hidden">
              <div
                className="h-full bg-white transition-[width] duration-200"
                style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
              >
                <iframe
                  key={previewNonce}
                  ref={previewRef}
                  title="Preview"
                  srcDoc={previewHtmlLive ?? undefined}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-forms allow-popups"
                />
              </div>
            </div>
          </>
        ) : svgPreviewFile ? (
          <SvgPreview file={svgPreviewFile} onExport={exportSvgImage} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="space-y-2 max-w-xs">
              <Eye className="h-8 w-8 text-muted-foreground/40 mx-auto" aria-hidden />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nothing to preview yet. Add an <span className="font-mono text-foreground">index.html</span> (or an <span className="font-mono text-foreground">.svg</span>), or ask the AI Agent to build one.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Agent */}
      <div className={cn("flex-1 min-h-0", dockTab === "agent" ? "block" : "hidden")} data-panel="agent">
        <Suspense fallback={<PageLoader />}>
          <IdeAgentPanel
            files={julesFiles}
            activeFileName={activeFile || undefined}
            onApplyChanges={handleApplyChanges}
            onCreateFile={(name, content) => {
              addFile(name, content);
              setPanel("editor");
            }}
          />
        </Suspense>
      </div>

      {/* Console */}
      <div className={cn("flex-1 min-h-0 flex-col bg-background font-mono text-xs", dockTab === "terminal" ? "flex" : "hidden")} data-panel="terminal">
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">output</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={runCode} disabled={isRunning} className="h-6 gap-1 text-[10px] px-2">
              {isRunning ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Play className="h-3 w-3" aria-hidden />}
              Run active file
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setConsoleLines([])} aria-label="Clear console">
              <SquareDashedBottom className="h-3 w-3" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-0.5">
          {consoleLines.length === 0 ? (
            <p className="text-muted-foreground/50">
              Output appears here. “Run” executes the active .js file in a sandbox; Preview renders HTML.
            </p>
          ) : (
            consoleLines.map((line, i) => (
              <div key={i} className={cn("whitespace-pre-wrap break-words leading-relaxed", CONSOLE_LINE_STYLE(line))}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <SEOHead
        meta={{
          title: "Agentic IDE — code, run and ship in the browser | ShadowTalk AI",
          description: "A redesigned in-browser IDE with a ShadowTalk theme: Monaco editor, live multi-device preview, an AI agent that edits files and draws SVG images you can export as PNG/JPG, and a ZIP export. Keyless or BYOK AI — nothing to install.",
          canonical: "https://www.shadowtalk-ai.com/ide",
        }}
      />
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="agentic-ide">
        {/* ── Top bar ── */}
        <header className="shrink-0 h-12 flex items-center gap-1.5 px-3 border-b border-border bg-card/60 backdrop-blur-xl">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chatbot")} className="h-8 w-8" aria-label="Back to chat">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileExplorer(true)}
            className="h-8 gap-1.5 text-xs lg:hidden"
            aria-label="Toggle file explorer"
          >
            <Files className="h-3.5 w-3.5" aria-hidden />
            Files
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-secondary p-[3px] flex items-center justify-center shrink-0" aria-hidden>
              <Code2 className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
            <span className="font-semibold text-sm truncate">ShadowTalk IDE</span>
            <Badge variant="outline" className="text-[10px] h-5 gap-1 border-primary/40 text-primary hidden sm:inline-flex">
              <Sparkles className="h-2.5 w-2.5" aria-hidden /> Agentic
            </Badge>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={copyAll} className="gap-1.5 text-xs h-8 hidden md:inline-flex">
            {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void exportZip()} className="gap-1.5 text-xs h-8">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export<span className="hidden md:inline">&nbsp;.zip</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTemplatePicker(true)} className="gap-1.5 text-xs h-8 hidden md:inline-flex">
            Templates
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setPanel("agent"); setDockTab("agent"); }}
            className="gap-1.5 text-xs h-8 lg:hidden"
            aria-label="Open AI panel"
          >
            <Bot className="h-3.5 w-3.5" aria-hidden />
            AI
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDockOpen((v) => !v)}
            className="h-8 w-8 hidden lg:inline-flex"
            aria-label={dockOpen ? "Hide side panel" : "Show side panel"}
          >
            {dockOpen ? <PanelRightClose className="h-4 w-4" aria-hidden /> : <PanelRightOpen className="h-4 w-4" aria-hidden />}
          </Button>
          <Button
            size="sm"
            onClick={runPreview}
            className="gap-1.5 text-xs h-8 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Preview
          </Button>
        </header>
        <div className="shrink-0 h-px bg-gradient-to-r from-primary/50 via-secondary/40 to-accent/50" aria-hidden />

        {/* ── Body ── */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Explorer — desktop */}
          <IdeExplorer
            className={cn("w-56 shrink-0 border-r border-border hidden lg:flex", !explorerOpen && "lg:hidden")}
            files={files}
            activeFile={activeFile}
            onSelect={(name) => { setActiveFile(name); setPanel("editor"); }}
            onAdd={addFile}
            onRename={renameFile}
            onDelete={deleteFile}
            onDownloadFile={downloadFile}
          />

          {/* Editor column */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* File tabs */}
            <div className="shrink-0 h-9 flex items-stretch border-b border-border bg-card/30 overflow-x-auto" role="tablist" aria-label="Open files">
              {files.map((file) => (
                <button
                  key={file.name}
                  role="tab"
                  aria-selected={activeFile === file.name}
                  onClick={() => setActiveFile(file.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 text-xs font-mono border-r border-border/60 whitespace-nowrap transition-colors",
                    activeFile === file.name
                      ? "text-foreground bg-background border-b-2 border-b-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-b-2 border-b-transparent",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", activeFile === file.name ? "bg-primary" : "bg-muted-foreground/40")} aria-hidden />
                  {file.name}
                </button>
              ))}
              {files.length === 0 && (
                <span className="px-3 text-xs text-muted-foreground self-center">No files yet</span>
              )}
            </div>

            {/* Editor / mobile panel area */}
            <div className="flex-1 min-h-0">
              {files.length === 0 ? (
                <EmptyWorkspace onStart={() => setShowTemplatePicker(true)} />
              ) : (
                <>
                  {/* Editor — always visible on desktop; switched on mobile */}
                  <div className={cn("h-full", panel !== "editor" && "hidden lg:block")}>
                    <Suspense fallback={<PageLoader />}>
                      <MonacoEditor
                        height="100%"
                        language={currentFile?.language || "plaintext"}
                        theme={SHADOWTALK_MONACO_THEME}
                        value={currentFile?.content ?? ""}
                        onChange={(val) => updateFileContent(val || "")}
                        beforeMount={defineShadowTalkTheme}
                        onMount={(editor, monaco) => {
                          monacoRef.current = editor;
                          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, savedToast);
                          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runPreviewRef.current());
                        }}
                        loading={<PageLoader />}
                        options={{
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          fontLigatures: true,
                          lineHeight: 1.7,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          tabSize: 2,
                          wordWrap: "on",
                          automaticLayout: true,
                          padding: { top: 14, bottom: 24 },
                          cursorBlinking: "smooth",
                          smoothScrolling: true,
                          renderLineHighlight: "all",
                          bracketPairColorization: { enabled: true },
                          guides: { indentation: true },
                        }}
                      />
                    </Suspense>
                  </div>

                  {/* Mobile inline dock — replaces the editor on small screens */}
                  <div className={cn("h-full flex flex-col lg:hidden", panel === "editor" && "hidden")}>
                    {dockContent("inline")}
                  </div>
                </>
              )}
            </div>
          </main>

          {/* Desktop dock — a real side column */}
          {dockOpen && files.length > 0 && (
            <aside
              className="hidden lg:flex flex-col w-[360px] xl:w-[400px] shrink-0 border-l border-border bg-card/20"
              data-testid="ide-dock"
            >
              {dockContent("desktop")}
            </aside>
          )}

          {/* Mobile explorer drawer */}
          {mobileExplorer && (
            <div className="fixed inset-0 z-40 lg:hidden" data-testid="mobile-explorer">
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileExplorer(false)} aria-hidden />
              <div className="absolute inset-y-0 left-0 w-64 border-r border-border bg-background shadow-[var(--shadow-elevated)] flex flex-col">
                <IdeExplorer
                  className="flex-1"
                  files={files}
                  activeFile={activeFile}
                  onSelect={(name) => { setActiveFile(name); setPanel("editor"); setMobileExplorer(false); }}
                  onAdd={addFile}
                  onRename={renameFile}
                  onDelete={deleteFile}
                  onDownloadFile={downloadFile}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile panel switcher ── */}
        {files.length > 0 && (
          <nav
            className="shrink-0 h-11 flex items-stretch border-t border-border bg-card/60 lg:hidden"
            aria-label="IDE panels"
          >
            {([
              { id: "editor" as const, label: "Code", icon: Code2 },
              { id: "preview" as const, label: "Preview", icon: Eye },
              { id: "agent" as const, label: "AI", icon: Bot },
              { id: "terminal" as const, label: "Console", icon: Terminal },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setPanel(tab.id);
                  if (tab.id !== "editor") setDockTab(tab.id);
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  panel === tab.id ? "text-primary" : "text-muted-foreground",
                )}
                aria-pressed={panel === tab.id}
              >
                <tab.icon className="h-4 w-4" aria-hidden />
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {/* ── Status bar ── */}
        <footer className="shrink-0 h-7 flex items-center gap-3 px-3 border-t border-border bg-card/60 text-[10px] font-mono text-muted-foreground">
          <span className="truncate">{activeFile || "no file"}</span>
          {currentFile && <span className="text-primary/80 hidden sm:inline">{currentFile.language}</span>}
          {currentFile && (
            <span className="hidden sm:inline">{currentFile.content.split("\n").length} ln · {currentFile.content.length} chars</span>
          )}
          <span className="hidden sm:inline">⌘S save · ⌘↵ preview · ⌘B files · ⌘J panels</span>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            auto-saved on-device · zero upload
          </span>
        </footer>

        {/* ── Template picker ── */}
        <IdeTemplatePicker
          open={showTemplatePicker}
          onPick={loadTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      </div>
    </>
  );
}

// ── Sub components ─────────────────────────────────────────────────────

function EmptyWorkspace({ onStart }: { onStart: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-[7px] flex items-center justify-center mx-auto shadow-[var(--shadow-glow)]" aria-hidden>
          <Code2 className="h-7 w-7 text-primary-foreground" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight">
            Build in the browser.{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Nothing leaves this device.
            </span>
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Write code with a full editor, hit Preview to run it instantly, and let the AI Agent
            build features, fix bugs and even draw SVG images you can export as PNG or JPG.
          </p>
        </div>
        <Button onClick={onStart} className="gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90">
          <Sparkles className="h-4 w-4" aria-hidden />
          Start from a template
        </Button>
      </div>
    </div>
  );
}

function SvgPreview({ file, onExport }: {
  file: { name: string; validation: ReturnType<typeof validateSvg> };
  onExport: (format: "png" | "jpeg") => void | Promise<void>;
}) {
  const [pngState, setPngState] = useState<"idle" | "working" | "error">("idle");
  const [jpgState, setJpgState] = useState<"idle" | "working" | "error">("idle");

  const validation = file.validation;
  if (validation.ok === false) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-2 max-w-xs">
          <p className="text-xs text-destructive">This SVG can’t be rendered as an image.</p>
          <p className="text-[11px] text-muted-foreground font-mono">{validation.reason}</p>
        </div>
      </div>
    );
  }

  const { svg, width, height } = validation;
  const previewUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const exportAs = async (format: "png" | "jpeg") => {
    const setState = format === "png" ? setPngState : setJpgState;
    setState("working");
    await onExport(format);
    setState("idle");
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-border bg-background/40">
        <span className="text-[10px] font-mono text-muted-foreground truncate">
          {file.name} · {Math.round(width)}×{Math.round(height)}
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px] px-2 border-primary/40 text-primary" disabled={pngState === "working"} onClick={() => void exportAs("png")}>
          {pngState === "working" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Download className="h-3 w-3" aria-hidden />}
          PNG
        </Button>
        <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px] px-2 border-primary/40 text-primary" disabled={jpgState === "working"} onClick={() => void exportAs("jpeg")}>
          {jpgState === "working" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Download className="h-3 w-3" aria-hidden />}
          JPG
        </Button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-muted/30 overflow-auto">
        <img
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white"
          draggable={false}
        />
      </div>
    </div>
  );
}
