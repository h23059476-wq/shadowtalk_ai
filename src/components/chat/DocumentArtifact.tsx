import React, { useState, useRef, useMemo } from 'react';
import {
  FileText, Download, Edit3, Check, X, Copy, Maximize2, Minimize2,
  FileDown, BookOpen, List, Printer, ChevronRight, Palette, Layout, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { DOCUMENT_PROSE_CLASS, polishProfessionalMarkdown } from '@/lib/professionalDocument';
import {
  exportWorldClassPdf,
  printWorldClassDocument,
  exportWorldClassMarkdown,
  exportWorldClassPlainText,
  exportWorldClassWordDoc,
  exportWorldClassHtml,
  type DocumentTheme,
} from '@/lib/worldClassDocumentExport';

interface DocumentArtifactProps {
  title: string;
  content: string;
  type: 'email' | 'article' | 'report' | 'proposal' | 'resume' | 'letter' | 'plan' | 'document';
}

const typeConfig: Record<string, { icon: string; accent: string; label: string; bg: string }> = {
  email: { icon: '✉️', accent: 'border-l-blue-500', label: 'Email', bg: 'from-blue-500/5 to-cyan-500/5' },
  article: { icon: '📝', accent: 'border-l-emerald-500', label: 'Article', bg: 'from-emerald-500/5 to-teal-500/5' },
  report: { icon: '📊', accent: 'border-l-violet-500', label: 'Report', bg: 'from-violet-500/5 to-purple-500/5' },
  proposal: { icon: '📋', accent: 'border-l-amber-500', label: 'Proposal', bg: 'from-amber-500/5 to-orange-500/5' },
  resume: { icon: '👤', accent: 'border-l-rose-500', label: 'Resume', bg: 'from-rose-500/5 to-pink-500/5' },
  letter: { icon: '💌', accent: 'border-l-sky-500', label: 'Letter', bg: 'from-sky-500/5 to-indigo-500/5' },
  plan: { icon: '🗺️', accent: 'border-l-lime-500', label: 'Business Plan', bg: 'from-lime-500/5 to-green-500/5' },
  document: { icon: '📄', accent: 'border-l-primary', label: 'Document', bg: 'from-muted/10 to-muted/5' },
};

// Extract TOC from markdown
const extractTOC = (content: string): { level: number; text: string; id: string }[] => {
  const headings: { level: number; text: string; id: string }[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const text = match[2].replace(/\*\*/g, '').trim();
      headings.push({
        level: match[1].length,
        text,
        id: text.toLowerCase().replace(/[^\w]+/g, '-'),
      });
    }
  }
  return headings;
};

// Word count
const wordCount = (text: string): number => {
  return text.replace(/[#*`>\-\[\]()!]/g, '').split(/\s+/).filter(Boolean).length;
};

// Reading time
const readingTime = (text: string): number => {
  return Math.max(1, Math.ceil(wordCount(text) / 200));
};

export const DocumentArtifact: React.FC<DocumentArtifactProps> = ({ title, content, type }) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(() => polishProfessionalMarkdown(content, { tone: 'professional' }));
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [activeView, setActiveView] = useState<'rendered' | 'raw'>('rendered');
  const [selectedTheme, setSelectedTheme] = useState<DocumentTheme>('executive');
  const [viewMode, setViewMode] = useState<'scroll' | 'sheet'>('scroll');
  const [includeCover, setIncludeCover] = useState(true);
  const docRef = useRef<HTMLDivElement>(null);

  const config = typeConfig[type] || typeConfig.document;
  const toc = useMemo(() => extractTOC(editedContent), [editedContent]);
  const words = useMemo(() => wordCount(editedContent), [editedContent]);
  const readTime = useMemo(() => readingTime(editedContent), [editedContent]);

  const cleanFilename = (ext: string) => `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    toast({ title: 'Document copied to clipboard' });
  };

  const handleDownloadPdf = () => {
    try {
      exportWorldClassPdf(editedContent, cleanFilename('pdf'), {
        theme: selectedTheme,
        includeCoverPage: includeCover,
        classification: type === 'report' ? 'Executive Brief' : type === 'proposal' ? 'Strategic Proposal' : 'Confidential',
      });
      toast({ title: 'Ultra-HD PDF Downloaded' });
    } catch {
      toast({ title: 'PDF export failed', variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    try {
      printWorldClassDocument(editedContent, {
        theme: selectedTheme,
        includeCoverPage: includeCover,
      });
    } catch {
      toast({ title: 'Print preview failed', variant: 'destructive' });
    }
  };

  const handleDownloadWord = () => {
    try {
      exportWorldClassWordDoc(editedContent, cleanFilename('doc'), {
        classification: type === 'report' ? 'Executive Brief' : 'Confidential',
      });
      toast({ title: 'Word Document Downloaded' });
    } catch {
      toast({ title: 'Word export failed', variant: 'destructive' });
    }
  };

  const handleDownloadMd = () => {
    try {
      exportWorldClassMarkdown(editedContent, cleanFilename('md'), {
        theme: selectedTheme,
      });
      toast({ title: 'GFM Markdown Downloaded' });
    } catch {
      toast({ title: 'Markdown export failed', variant: 'destructive' });
    }
  };

  const handleDownloadTxt = () => {
    try {
      exportWorldClassPlainText(editedContent, cleanFilename('txt'));
      toast({ title: 'Executive Text File Downloaded' });
    } catch {
      toast({ title: 'Text export failed', variant: 'destructive' });
    }
  };

  const handleDownloadHtml = () => {
    try {
      exportWorldClassHtml(editedContent, cleanFilename('html'), {
        theme: selectedTheme,
      });
      toast({ title: 'Standalone Web Document Downloaded' });
    } catch {
      toast({ title: 'HTML export failed', variant: 'destructive' });
    }
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    toast({ title: 'Document updated' });
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`mt-3 rounded-xl border border-border/40 bg-gradient-to-br ${config.bg} overflow-hidden shadow-xl shadow-black/5 backdrop-blur-md ${
        isExpanded ? 'fixed inset-3 z-50 m-0' : ''
      }`}
    >
      {/* Premium header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.bg} border border-border/30 flex items-center justify-center text-base shadow-sm`}>
            {config.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight tracking-tight">{title}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider">
                {config.label}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {words.toLocaleString()} words · {readTime} min read
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium capitalize">
                {selectedTheme}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* View toggle */}
          {!isEditing && (
            <div className="flex items-center bg-muted/40 rounded-lg p-0.5 mr-1 border border-border/20">
              <button
                onClick={() => setActiveView('rendered')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  activeView === 'rendered' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-foreground'
                }`}
                title="Reading View"
              >
                <BookOpen className="h-3 w-3" />
              </button>
              <button
                onClick={() => setActiveView('raw')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  activeView === 'raw' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-foreground'
                }`}
                title="Raw Markdown"
              >
                <FileText className="h-3 w-3" />
              </button>
            </div>
          )}

          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSaveEdit} className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300">
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-7 px-2 text-xs text-red-400 hover:text-red-300">
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </>
          ) : (
            <>
              {/* Theme Picker */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Document Theme"
                >
                  <Palette className="h-3.5 w-3.5" />
                </Button>
                {showThemePicker && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border/40 rounded-lg shadow-2xl p-2 z-50 text-xs space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Style Preset</p>
                    {(['executive', 'obsidian', 'minimal', 'academic'] as DocumentTheme[]).map((thm) => (
                      <button
                        key={thm}
                        onClick={() => {
                          setSelectedTheme(thm);
                          setShowThemePicker(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between capitalize transition-colors ${
                          selectedTheme === thm ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        {thm}
                        {selectedTheme === thm && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                    <div className="pt-1 border-t border-border/30">
                      <button
                        onClick={() => {
                          setViewMode(viewMode === 'scroll' ? 'sheet' : 'scroll');
                          setShowThemePicker(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted/60 text-muted-foreground flex items-center gap-2"
                      >
                        <Layout className="h-3 w-3" />
                        {viewMode === 'sheet' ? 'Continuous Scroll' : 'Paginated Sheet'}
                      </button>
                      <button
                        onClick={() => {
                          setIncludeCover(!includeCover);
                          setShowThemePicker(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted/60 text-muted-foreground flex items-center justify-between"
                      >
                        <span>Include Cover Page</span>
                        <span className="text-[10px] font-semibold">{includeCover ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {toc.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTOC(!showTOC)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Table of Contents"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Edit Content"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Copy Text"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>

              {/* Comprehensive 6-Format Download Dropdown */}
              <div className="relative group/dl">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" title="Export Document">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border/40 rounded-xl shadow-2xl opacity-0 invisible group-hover/dl:opacity-100 group-hover/dl:visible transition-all duration-200 z-50 p-1 divide-y divide-border/20">
                  <div className="pb-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Document Formats</p>
                    <button onClick={handleDownloadPdf} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors flex items-center gap-2 rounded-md font-medium text-foreground">
                      <FileDown className="h-3.5 w-3.5 text-primary" /> Ultra-HD PDF (.pdf)
                    </button>
                    <button onClick={handlePrint} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors flex items-center gap-2 rounded-md text-foreground">
                      <Printer className="h-3.5 w-3.5 text-blue-500" /> Vector Print / Save PDF
                    </button>
                    <button onClick={handleDownloadWord} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors flex items-center gap-2 rounded-md text-foreground">
                      <FileDown className="h-3.5 w-3.5 text-indigo-500" /> Word Document (.doc)
                    </button>
                  </div>
                  <div className="pt-1">
                    <button onClick={handleDownloadMd} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors flex items-center gap-2 rounded-md text-foreground">
                      <FileText className="h-3.5 w-3.5 text-emerald-500" /> GFM Markdown (.md)
                    </button>
                    <button onClick={handleDownloadTxt} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors flex items-center gap-2 rounded-md text-foreground">
                      <FileText className="h-3.5 w-3.5 text-amber-500" /> Plain Text (.txt)
                    </button>
                    <button onClick={handleDownloadHtml} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors flex items-center gap-2 rounded-md text-foreground">
                      <Globe className="h-3.5 w-3.5 text-cyan-500" /> Web Page (.html)
                    </button>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table of Contents */}
      <AnimatePresence>
        {showTOC && toc.length > 2 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-border/20 bg-muted/10 overflow-hidden"
          >
            <div className="px-4 py-3">
              <h4 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">Executive Table of Contents</h4>
              <nav className="flex flex-col gap-0.5">
                {toc.map((item, i) => (
                  <button
                    key={i}
                    className="text-left text-xs text-muted-foreground/80 hover:text-foreground transition-colors flex items-center gap-1.5 py-0.5"
                    style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                    onClick={() => {
                      setShowTOC(false);
                      const el = document.getElementById(item.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <ChevronRight className="h-2.5 w-2.5 text-primary/60" />
                    <span>{item.text}</span>
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Canvas */}
      <div className={`${isExpanded ? 'overflow-y-auto max-h-[calc(100dvh-120px)]' : 'max-h-[min(540px,70dvh)] overflow-y-auto'} custom-scrollbar p-2 sm:p-4`}>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full min-h-[340px] p-6 bg-card text-sm text-foreground font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-xl border border-border/30"
            autoFocus
          />
        ) : activeView === 'raw' ? (
          <pre className="p-6 text-xs font-mono text-muted-foreground/90 whitespace-pre-wrap leading-relaxed bg-card/60 rounded-xl border border-border/30">
            {editedContent}
          </pre>
        ) : (
          <div ref={docRef} className="max-w-[8.5in] mx-auto">
            {/* Sheet view container or standard container */}
            <div className={`bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-sm shadow-xl px-6 py-8 sm:px-12 sm:py-12 ${
              viewMode === 'sheet' ? 'min-h-[11in] shadow-2xl relative' : ''
            }`}>
              {/* Optional Cover Page Mock */}
              {includeCover && (
                <div className="mb-10 pb-8 border-b-2 border-primary/20">
                  <div className="inline-block px-2.5 py-0.5 mb-3 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-md">
                    {type === 'report' ? 'Executive Report' : type === 'proposal' ? 'Strategic Proposal' : 'Official Document'}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">
                    {title}
                  </h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 italic mb-6">
                    Autonomous Intelligence Synthesis &bull; Client-Ready Formulation
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
                    <div><span className="block text-[9px] uppercase font-bold text-neutral-400">Author</span><span className="font-semibold text-neutral-800 dark:text-neutral-200">ShadowTalk AI</span></div>
                    <div><span className="block text-[9px] uppercase font-bold text-neutral-400">Date</span><span className="font-semibold text-neutral-800 dark:text-neutral-200">{new Date().toLocaleDateString()}</span></div>
                    <div><span className="block text-[9px] uppercase font-bold text-neutral-400">Classification</span><span className="font-semibold text-neutral-800 dark:text-neutral-200">Confidential</span></div>
                    <div><span className="block text-[9px] uppercase font-bold text-neutral-400">Scope</span><span className="font-semibold text-neutral-800 dark:text-neutral-200">{words.toLocaleString()} words</span></div>
                  </div>
                </div>
              )}

              {/* Document Markdown Body */}
              <div className={DOCUMENT_PROSE_CLASS}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')}>{children}</h1>,
                    h2: ({ children }) => <h2 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')}>{children}</h2>,
                    h3: ({ children }) => <h3 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')}>{children}</h3>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary bg-primary/5 px-4 py-2.5 rounded-r-lg not-italic text-sm text-foreground/90 my-4 shadow-sm">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6 border border-border/40 rounded-lg shadow-sm">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="bg-neutral-900 text-white dark:bg-neutral-800 px-3.5 py-2.5 font-semibold text-xs">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border-t border-border/30 px-3.5 py-2 text-foreground/80">{children}</td>
                    ),
                    li: ({ children, ...props }: any) => {
                      const text = String(children);
                      if (text.startsWith('☐ ') || text.startsWith('☑ ') || text.startsWith('[ ] ') || text.startsWith('[x] ')) {
                        const checked = text.startsWith('☑') || text.startsWith('[x]');
                        const cleanText = text.replace(/^(?:☐|☑|\[[ xX]\])\s*/, '');
                        return (
                          <li className="flex items-start gap-2 list-none -ml-4 my-1.5" {...props}>
                            <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                              checked ? 'bg-primary text-primary-foreground border-primary' : 'border-neutral-400 bg-background'
                            }`}>
                              {checked && '✓'}
                            </span>
                            <span className={checked ? 'line-through opacity-60' : ''}>{cleanText}</span>
                          </li>
                        );
                      }
                      return <li {...props}>{children}</li>;
                    },
                  }}
                >
                  {editedContent}
                </ReactMarkdown>
              </div>

              {/* Running Footer Simulation */}
              <div className="mt-12 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                <span>Generated by ShadowTalk AI Intelligence</span>
                <span>Page 1 of 1</span>
                <span>Strictly Confidential</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm -z-10" 
          onClick={() => setIsExpanded(false)} 
        />
      )}
    </motion.div>
  );
};

// Detect if AI response contains a document artifact.
// STRICT mode (audit fix): content must be 800+ chars AND contain explicit
// document structure markers. This stops casual AI responses from being
// auto-detected as documents and triggering the document-artifact UI
// (which can be exported as PDF).
//
// To force a document, use the /doc or /draft slash command — that sets
// toolExecution.tool = 'document_generator' which bypasses this check.
export function detectDocumentArtifact(content: string): { isDocument: boolean; title: string; type: DocumentArtifactProps['type']; documentContent: string } | null {
  if (!content || content.length < 800) return null;

  // Completion verification: if the content ends mid-sentence (no terminal
  // punctuation or markdown heading), treat it as incomplete and don't
  // auto-detect as a document. This stops half-finished AI responses from
  // being exported as incomplete PDFs.
  const trimmedEnd = content.trimEnd();
  const lastChar = trimmedEnd.slice(-1);
  const last5 = trimmedEnd.slice(-5).toLowerCase();
  const looksComplete =
    /[.!?]/.test(lastChar) ||           // ends with punctuation
    /```$/.test(trimmedEnd) ||          // ends with code block close
    /^#{1,6}\s/.test(trimmedEnd.split("\n").pop() || "") ||  // ends with heading
    last5.includes("---") ||            // ends with horizontal rule
    last5.includes("***");
  if (!looksComplete) return null;

  const documentPatterns: Array<{ regex: RegExp; type: DocumentArtifactProps['type']; titleExtractor: (match: RegExpMatchArray, content: string) => string }> = [
    {
      regex: /^(?:\*\*)?Subject[:\s]*(?:\*\*)?(.+?)(?:\n|$)/im,
      type: 'email',
      titleExtractor: (m) => m[1].trim().replace(/\*\*/g, ''),
    },
    {
      regex: /(?:^|\n)(?:##?\s*)?(?:Professional\s+Summary|Work\s+Experience|Education|Skills|Career\s+Objective)/im,
      type: 'resume',
      titleExtractor: (_m, c) => {
        const nameMatch = c.match(/^#\s+(.+?)(?:\n|$)/m);
        return nameMatch ? nameMatch[1].replace(/\*\*/g, '') : 'Resume';
      },
    },
    {
      regex: /(?:^|\n)(?:##?\s*)?(?:Executive\s+Summary)[\s\S]*?(?:##?\s*)?(?:Market\s+Analysis|Financial\s+Projections|Marketing\s+Strategy)/im,
      type: 'plan',
      titleExtractor: (_m, c) => {
        const titleMatch = c.match(/^#\s+(.+?)(?:\n|$)/m);
        return titleMatch ? titleMatch[1].replace(/\*\*/g, '') : 'Business Plan';
      },
    },
    {
      regex: /(?:^|\n)(?:##?\s*)?(?:Executive\s+Summary)[\s\S]*?(?:##?\s*)?(?:Findings|Recommendations|Conclusion|Analysis)/im,
      type: 'report',
      titleExtractor: (_m, c) => {
        const titleMatch = c.match(/^#\s+(.+?)(?:\n|$)/m);
        return titleMatch ? titleMatch[1].replace(/\*\*/g, '') : 'Report';
      },
    },
    {
      regex: /(?:^|\n)(?:##?\s*)?(?:Objective|Proposal\s+Overview|Project\s+Scope)[\s\S]*?(?:##?\s*)?(?:Timeline|Budget|Deliverables|Methodology)/im,
      type: 'proposal',
      titleExtractor: (_m, c) => {
        const titleMatch = c.match(/^#\s+(.+?)(?:\n|$)/m);
        return titleMatch ? titleMatch[1].replace(/\*\*/g, '') : 'Proposal';
      },
    },
    {
      regex: /(?:Dear\s+(?:Mr\.|Mrs\.|Ms\.|Dr\.|Sir|Madam|Hiring|Team|Editor)|To\s+Whom\s+It\s+May\s+Concern)/im,
      type: 'letter',
      titleExtractor: (_m, c) => {
        const reMatch = c.match(/(?:Re|Subject|Regarding)[:\s]+(.+?)(?:\n|$)/im);
        return reMatch ? reMatch[1].trim() : 'Letter';
      },
    },
    {
      regex: /^#\s+.+\n[\s\S]*?(?:##\s+.+\n[\s\S]*?){2,}/m,
      type: 'article',
      titleExtractor: (_m, c) => {
        const titleMatch = c.match(/^#\s+(.+?)(?:\n|$)/m);
        return titleMatch ? titleMatch[1].replace(/\*\*/g, '') : 'Article';
      },
    },
  ];

  const codeBlockCount = (content.match(/```/g) || []).length / 2;
  const lines = content.split('\n').length;
  if (codeBlockCount > 0 && codeBlockCount >= lines / 10) return null;

  for (const pattern of documentPatterns) {
    const match = content.match(pattern.regex);
    if (match) {
      const title = pattern.titleExtractor(match, content);
      return {
        isDocument: true,
        title: title.length > 60 ? title.slice(0, 57) + '...' : title,
        type: pattern.type,
        documentContent: polishProfessionalMarkdown(content, { tone: 'professional' }),
      };
    }
  }

  const headerCount = (content.match(/^#{1,3}\s+/gm) || []).length;
  if (headerCount >= 3 && content.length > 400) {
    const titleMatch = content.match(/^#\s+(.+?)(?:\n|$)/m);
    return {
      isDocument: true,
      title: titleMatch ? titleMatch[1].replace(/\*\*/g, '').slice(0, 60) : 'Generated Document',
      type: 'document',
      documentContent: polishProfessionalMarkdown(content, { tone: 'professional' }),
    };
  }

  return null;
}
