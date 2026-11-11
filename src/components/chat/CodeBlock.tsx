import { useState, useCallback, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, ChevronDown, ChevronUp, PenLine, Globe, Play, Download, Terminal, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  onOpenCanvas?: (code: string, language: string) => void;
  onOpenIDE?: (code: string, language: string) => void;
  onLaunchWebsite?: (code: string, language: string) => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript", typescript: "TypeScript", python: "Python",
  java: "Java", cpp: "C++", c: "C", csharp: "C#", go: "Go",
  rust: "Rust", ruby: "Ruby", php: "PHP", swift: "Swift",
  kotlin: "Kotlin", html: "HTML", css: "CSS", scss: "SCSS",
  json: "JSON", yaml: "YAML", xml: "XML", sql: "SQL",
  bash: "Bash", shell: "Shell", dockerfile: "Dockerfile",
  graphql: "GraphQL", markdown: "Markdown", jsx: "JSX", tsx: "TSX",
  text: "Plain Text", vue: "Vue", svelte: "Svelte", dart: "Dart",
  r: "R", scala: "Scala", lua: "Lua", perl: "Perl", toml: "TOML",
  ini: "INI", diff: "Diff", makefile: "Makefile",
};

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python", rb: "ruby",
  yml: "yaml", sh: "bash", shell: "bash", zsh: "bash",
};

const LANGUAGE_ICONS: Record<string, string> = {
  javascript: "JS", typescript: "TS", python: "PY", java: "JV",
  html: "HT", css: "CS", json: "{ }", sql: "DB", bash: "$_",
  rust: "RS", go: "GO", cpp: "C+", ruby: "RB", php: "PH",
  swift: "SW", kotlin: "KT", dart: "DT", tsx: "TX", jsx: "JX",
};

const LANG_COLORS: Record<string, string> = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572a5",
  java: "#b07219", html: "#e34c26", css: "#563d7c", json: "#292929",
  sql: "#e38c00", bash: "#89e051", rust: "#dea584", go: "#00add8",
  cpp: "#f34b7d", ruby: "#701516", php: "#4F5D95", swift: "#F05138",
  kotlin: "#A97BFF", jsx: "#61dafb", tsx: "#3178c6", vue: "#41b883",
  dart: "#00B4AB", scala: "#c22d40",
};

const FILE_EXTENSIONS: Record<string, string> = {
  javascript: ".js", typescript: ".ts", python: ".py", java: ".java",
  html: ".html", css: ".css", json: ".json", sql: ".sql",
  bash: ".sh", rust: ".rs", go: ".go", cpp: ".cpp", ruby: ".rb",
  php: ".php", swift: ".swift", kotlin: ".kt", jsx: ".jsx", tsx: ".tsx",
  yaml: ".yml", xml: ".xml", markdown: ".md", text: ".txt",
};

const isFullWebsite = (code: string, lang: string): boolean => {
  if (lang === 'html') {
    return (code.includes('<html') || code.includes('<!DOCTYPE')) &&
           (code.includes('<style') || code.includes('<script') || code.includes('<link'));
  }
  return false;
};

// Detect filename from first comment line
const detectFilename = (code: string, lang: string): string | null => {
  const firstLine = code.split('\n')[0]?.trim();
  if (!firstLine) return null;
  
  // Match patterns like: // filename.ts, # filename.py, /* filename.css */
  const patterns = [
    /^\/\/\s*([\w\-./]+\.\w+)\s*$/,
    /^#\s*([\w\-./]+\.\w+)\s*$/,
    /^\/\*\s*([\w\-./]+\.\w+)\s*\*\/$/,
  ];
  
  for (const p of patterns) {
    const m = firstLine.match(p);
    if (m) return m[1];
  }
  return null;
};

export const CodeBlock = ({ code, language, filename, onOpenCanvas, onOpenIDE, onLaunchWebsite }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  }, [code, toast]);

  const handleDownload = useCallback(() => {
    const ext = FILE_EXTENSIONS[normalizedLang] || '.txt';
    const fn = detectedFilename || `code${ext}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fn;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Downloaded ${fn}` });
  }, [code, toast]);

  const normalizedLang = LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase();
  const displayLabel = LANGUAGE_LABELS[normalizedLang] || language;
  const langIcon = LANGUAGE_ICONS[normalizedLang];
  const langColor = LANG_COLORS[normalizedLang] || "hsl(var(--primary))";
  const canLaunchWebsite = isFullWebsite(code, normalizedLang);
  const detectedFilename = filename || detectFilename(code, normalizedLang);
  const isDiff = normalizedLang === 'diff';

  const allLines = code.split("\n");
  const lineCount = allLines.length;
  const isLong = lineCount > 25;
  const displayCode = isLong && !expanded ? allLines.slice(0, 25).join("\n") : code;
  const hiddenLines = lineCount - 25;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-xl overflow-hidden my-4 max-w-full border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl shadow-black/50 group/code"
    >
      {/* Premium header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2">
          {/* macOS-style dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>

          {/* Language badge */}
          <div className="flex items-center gap-1.5">
            {langIcon && (
              <span
                className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: `${langColor}20`, color: langColor }}
              >
                {langIcon}
              </span>
            )}
            <span className="text-[11px] font-medium text-muted-foreground/80 select-none">
              {detectedFilename || displayLabel}
            </span>
          </div>

          {/* Line count */}
          <span className="text-[10px] text-muted-foreground/40 font-mono flex items-center gap-0.5">
            <Hash className="h-2.5 w-2.5" />
            {lineCount} lines
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {canLaunchWebsite && onLaunchWebsite && (
            <button
              onClick={() => onLaunchWebsite(code, language)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200"
            >
              <Globe className="h-3 w-3" />
              Launch
            </button>
          )}
          {onOpenIDE && (
            <button
              onClick={() => onOpenIDE(code, language)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all duration-200"
            >
              <Terminal className="h-3 w-3" />
              IDE
            </button>
          )}
          {onOpenCanvas && (
            <button
              onClick={() => onOpenCanvas(code, language)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all duration-200"
            >
              <PenLine className="h-3 w-3" />
              Canvas
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="check" initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-emerald-400">
                  <Check className="h-3 w-3" />
                  Copied
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Copy
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Code body */}
      <div ref={codeRef} className="overflow-x-auto relative">
        <SyntaxHighlighter
          language={normalizedLang}
          style={oneDark}
          showLineNumbers={lineCount > 1}
          wrapLines
          customStyle={{
            margin: 0,
            padding: lineCount > 1 ? "1rem 1rem 1rem 0" : "1rem",
            fontSize: "13px",
            lineHeight: "1.7",
            background: "transparent",
            border: "none",
          }}
          codeTagProps={{
            style: {
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', monospace",
              fontFeatureSettings: '"liga" 1, "calt" 1',
            }
          }}
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1.25em",
            color: "hsl(var(--muted-foreground) / 0.15)",
            fontSize: "11px",
            textAlign: "right" as const,
            userSelect: "none" as const,
          }}
          lineProps={(lineNumber) => ({
            style: {
              display: "block",
              paddingLeft: "0.5em",
              paddingRight: "0.5em",
            },
            className: "hover:bg-primary/[0.03] transition-colors duration-100",
          })}
        >
          {displayCode}
        </SyntaxHighlighter>

        {/* Gradient fade for collapsed */}
        {isLong && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand/collapse */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-border/20 text-[11px] font-medium text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 transition-all duration-200"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> Collapse</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> Show {hiddenLines} more lines</>
          )}
        </button>
      )}
    </motion.div>
  );
};
