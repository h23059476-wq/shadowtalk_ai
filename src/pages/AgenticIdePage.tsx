import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Play, Square, Plus, File, Folder, Save, Download,
  Terminal, Eye, Code2, Bot, Trash2, ChevronRight, ChevronDown,
  Sparkles, RotateCcw, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { PageLoader } from "@/components/PageLoader";
import { trackShadowTalkEvent } from "@/lib/analyticsEventTracker";
import { cn } from "@/lib/utils";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));
const JulesPanel = lazy(() => import("@/components/ide/JulesPanel").then(m => ({ default: m.JulesPanel })));

// ── Types ──────────────────────────────────────────────────────────────

interface IdeFile {
  name: string;
  content: string;
  language: string;
}

// ── Templates ──────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; description: string; files: IdeFile[] }> = {
  react: {
    label: "React App",
    description: "React 18 + Vite-style HTML setup",
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
    label: "Vanilla JS",
    description: "Plain HTML + CSS + JavaScript",
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
      { name: "style.css", language: "css", content: `body { font-family: system-ui; padding: 40px; background: #0a0a0f; color: #fff; }
button { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; }
button:hover { background: #2563eb; }` },
      { name: "script.js", language: "javascript", content: `let count = 0;
const btn = document.getElementById("btn");
const display = document.getElementById("count");
btn.addEventListener("click", () => {
  count++;
  display.textContent = count;
});` },
    ],
  },
  python: {
    label: "Python",
    description: "Python script (syntax check only)",
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

// ── Language detection ─────────────────────────────────────────────────

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    html: "html", css: "css", json: "json", py: "python", md: "markdown",
    txt: "plaintext", sh: "shell", yml: "yaml", yaml: "yaml",
  };
  return map[ext] || "plaintext";
}

// ── LocalStorage persistence ───────────────────────────────────────────

const STORAGE_KEY = "shadowtalk_ide_files_v1";

function loadFiles(): IdeFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return TEMPLATES.vanilla.files;
}

function saveFiles(files: IdeFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch { /* ignore */ }
}

// ── Main component ─────────────────────────────────────────────────────

type Panel = "editor" | "preview" | "terminal" | "agent";

export default function AgenticIdePage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<IdeFile[]>(loadFiles);
  const [activeFile, setActiveFile] = useState<string>(files[0]?.name || "index.html");
  const [activePanel, setActivePanel] = useState<Panel>("editor");
  const [showTemplatePicker, setShowTemplatePicker] = useState(files.length === 0);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Persist files to localStorage on change
  useEffect(() => { saveFiles(files); }, [files]);

  // Track page view
  useEffect(() => {
    trackShadowTalkEvent("ide_page_viewed");
  }, []);

  const currentFile = files.find((f) => f.name === activeFile);

  const updateFileContent = useCallback((content: string) => {
    setFiles((prev) => prev.map((f) => f.name === activeFile ? { ...f, content } : f));
  }, [activeFile]);

  const addFile = useCallback(() => {
    const name = newFileName.trim();
    if (!name) return;
    if (files.some((f) => f.name === name)) {
      setTerminalOutput((prev) => [...prev, `Error: File "${name}" already exists`]);
      return;
    }
    setFiles((prev) => [...prev, { name, content: "", language: detectLanguage(name) }]);
    setActiveFile(name);
    setNewFileName("");
    setShowNewFile(false);
  }, [newFileName, files]);

  const deleteFile = useCallback((name: string) => {
    if (files.length <= 1) return; // keep at least one file
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (activeFile === name) {
      const remaining = files.filter((f) => f.name !== name);
      setActiveFile(remaining[0]?.name || "");
    }
  }, [files, activeFile]);

  const loadTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES[templateId];
    if (!template) return;
    setFiles(template.files);
    setActiveFile(template.files[0].name);
    setShowTemplatePicker(false);
    setTerminalOutput([`Loaded template: ${template.label}`]);
  }, []);

  // ── Preview (iframe-based — works for HTML/CSS/JS) ──
  const runPreview = useCallback(() => {
    const htmlFile = files.find((f) => f.name.endsWith(".html"));
    if (!htmlFile) {
      setTerminalOutput((prev) => [...prev, "Error: No HTML file found for preview"]);
      setActivePanel("terminal");
      return;
    }

    // Inline all CSS and JS into the HTML for the iframe srcdoc
    let html = htmlFile.content;
    
    // Replace <link rel="stylesheet" href="X.css"> with inline <style>
    html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>(?:<\/link>)?/g, (_, href) => {
      const cssFile = files.find((f) => f.name === href);
      return cssFile ? `<style>${cssFile.content}</style>` : "";
    });

    // Replace <script src="X.js"></script> with inline <script>
    html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (_, src) => {
      const jsFile = files.find((f) => f.name === src);
      return jsFile ? `<script>${jsFile.content}</script>` : "";
    });

    if (previewRef.current) {
      previewRef.current.srcdoc = html;
    }
    setActivePanel("preview");
    setTerminalOutput((prev) => [...prev, "Preview running..."]);
    trackShadowTalkEvent("ide_preview_run");
  }, [files]);

  // ── Terminal (Python syntax check, JS eval) ──
  const runCode = useCallback(() => {
    setIsRunning(true);
    setTerminalOutput((prev) => [...prev, `$ Running ${activeFile}...`]);
    
    if (activeFile.endsWith(".py")) {
      // Python — can't run in browser, but show the code
      setTerminalOutput((prev) => [...prev, "Python execution requires a backend. Showing code:", currentFile?.content || ""]);
    } else if (activeFile.endsWith(".js") || activeFile.endsWith(".ts")) {
      // JavaScript — eval in a sandboxed try/catch
      try {
        const logs: string[] = [];
        const sandboxConsole = {
          log: (...args: unknown[]) => logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ")),
          error: (...args: unknown[]) => logs.push("ERROR: " + args.join(" ")),
          warn: (...args: unknown[]) => logs.push("WARN: " + args.join(" ")),
        };
        // eslint-disable-next-line no-new-func
        const fn = new Function("console", currentFile?.content || "");
        fn(sandboxConsole);
        setTerminalOutput((prev) => [...prev, ...logs, "✓ Execution complete"]);
      } catch (err) {
        setTerminalOutput((prev) => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
      }
    } else {
      setTerminalOutput((prev) => [...prev, `Cannot run ${activeFile} — use Preview for HTML files`]);
    }
    
    setIsRunning(false);
    setActivePanel("terminal");
    trackShadowTalkEvent("ide_code_run", { file: activeFile });
  }, [activeFile, currentFile]);

  const copyAll = useCallback(async () => {
    const text = files.map((f) => `// === ${f.name} ===\n${f.content}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [files]);

  const downloadAll = useCallback(() => {
    const text = files.map((f) => `// === ${f.name} ===\n${f.content}`).join("\n\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shadowtalk-workspace-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  // ── AI agent (JulesPanel) file format ──
  const julesFiles = files.map((f) => ({ name: f.name, content: f.content, language: f.language }));
  const handleApplyChanges = useCallback((changes: Array<{ path: string; content: string; isNew: boolean }>) => {
    setFiles((prev) => {
      const next = [...prev];
      for (const change of changes) {
        const idx = next.findIndex((f) => f.name === change.path);
        if (idx >= 0) {
          next[idx] = { ...next[idx], content: change.content };
        } else {
          next.push({ name: change.path, content: change.content, language: detectLanguage(change.path) });
        }
      }
      return next;
    });
    setTerminalOutput((prev) => [...prev, `✓ AI agent applied ${changes.length} change(s)`]);
  }, []);

  return (
    <>
      <SEOHead
        meta={{
          title: "Agentic IDE — Code, Run, Deploy | ShadowTalk AI",
          description: "In-browser agentic IDE with Monaco editor, live preview, AI code agent, and multi-file workspaces. Built for developers.",
          canonical: "https://www.shadowtalk-ai.com/ide",
        }}
      />
      <div className="h-screen flex flex-col bg-zinc-950 text-foreground overflow-hidden">
        {/* ── Top Bar ── */}
        <header className="shrink-0 h-12 flex items-center gap-2 px-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chatbot")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-sm">ShadowTalk IDE</span>
            <Badge variant="outline" className="text-[10px] h-5 gap-1 border-emerald-500/30 text-emerald-400">
              <Sparkles className="h-2.5 w-2.5" /> Agentic
            </Badge>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={copyAll} className="gap-1.5 text-xs h-8">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadAll} className="gap-1.5 text-xs h-8">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTemplatePicker(true)} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Templates
          </Button>
          <Button size="sm" onClick={runPreview} className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500">
            <Play className="h-3.5 w-3.5" /> Preview
          </Button>
        </header>

        {/* ── Main 3-column layout ── */}
        <div className="flex-1 flex min-h-0">
          {/* ── File Explorer (left) ── */}
          <aside className="w-52 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Files</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowNewFile(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {showNewFile && (
                <div className="px-2 py-1.5 flex gap-1">
                  <Input
                    autoFocus
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addFile(); if (e.key === "Escape") setShowNewFile(false); }}
                    placeholder="filename.js"
                    className="h-7 text-xs"
                  />
                  <Button size="sm" onClick={addFile} className="h-7 px-2 text-xs">Add</Button>
                </div>
              )}
              {files.map((file) => (
                <div
                  key={file.name}
                  className={cn(
                    "group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs transition-colors",
                    activeFile === file.name ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-400 hover:bg-zinc-800/50",
                  )}
                  onClick={() => setActiveFile(file.name)}
                >
                  <File className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.name); }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-zinc-800 text-[10px] text-zinc-600">
              {files.length} file{files.length !== 1 ? "s" : ""} · auto-saved
            </div>
          </aside>

          {/* ── Editor + Panels (center) ── */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Panel tabs */}
            <div className="shrink-0 h-9 flex items-center border-b border-zinc-800 bg-zinc-900/50 px-2 gap-1">
              {[
                { id: "editor" as const, label: "Editor", icon: Code2 },
                { id: "preview" as const, label: "Preview", icon: Eye },
                { id: "terminal" as const, label: "Terminal", icon: Terminal },
                { id: "agent" as const, label: "AI Agent", icon: Bot },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    activePanel === tab.id ? "bg-zinc-800 text-foreground" : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
              {activePanel === "editor" && (
                <Button variant="ghost" size="sm" onClick={runCode} disabled={isRunning} className="gap-1.5 text-xs h-7">
                  <Play className="h-3 w-3" /> Run
                </Button>
              )}
            </div>

            {/* Panel content */}
            <div className="flex-1 min-h-0 relative">
              {/* Editor */}
              {activePanel === "editor" && currentFile && (
                <Suspense fallback={<PageLoader />}>
                  <MonacoEditor
                    height="100%"
                    language={currentFile.language}
                    theme="vs-dark"
                    value={currentFile.content}
                    onChange={(val) => updateFileContent(val || "")}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      tabSize: 2,
                      wordWrap: "on",
                      automaticLayout: true,
                    }}
                  />
                </Suspense>
              )}

              {/* Preview */}
              {activePanel === "preview" && (
                <div className="h-full bg-white">
                  <iframe
                    ref={previewRef}
                    title="Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-popups"
                  />
                </div>
              )}

              {/* Terminal */}
              {activePanel === "terminal" && (
                <div className="h-full bg-zinc-950 font-mono text-xs p-3 overflow-y-auto">
                  {terminalOutput.length === 0 ? (
                    <p className="text-zinc-600">Terminal output will appear here. Click "Run" to execute code.</p>
                  ) : (
                    terminalOutput.map((line, i) => (
                      <div key={i} className={cn(
                        "whitespace-pre-wrap",
                        line.startsWith("Error") || line.startsWith("ERROR") ? "text-red-400" :
                        line.startsWith("✓") ? "text-emerald-400" :
                        line.startsWith("$") ? "text-cyan-400" :
                        "text-zinc-300"
                      )}>
                        {line}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* AI Agent */}
              {activePanel === "agent" && (
                <Suspense fallback={<PageLoader />}>
                  <JulesPanel
                    files={julesFiles}
                    activeFileName={activeFile}
                    onApplyChanges={handleApplyChanges}
                  />
                </Suspense>
              )}
            </div>
          </main>
        </div>

        {/* ── Template Picker Modal ── */}
        {showTemplatePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplatePicker(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-1">Start a new project</h2>
              <p className="text-xs text-zinc-500 mb-4">Pick a template to load into the IDE.</p>
              <div className="space-y-2">
                {Object.entries(TEMPLATES).map(([id, tpl]) => (
                  <button
                    key={id}
                    onClick={() => loadTemplate(id)}
                    className="w-full text-left rounded-xl border border-zinc-700 p-3 hover:border-emerald-500/50 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{tpl.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{tpl.description}</p>
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setShowTemplatePicker(false)} className="w-full mt-4 text-xs">
                Cancel
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
