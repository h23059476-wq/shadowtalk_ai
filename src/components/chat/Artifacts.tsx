import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { X, Download, Copy, ExternalLink, Maximize2, Minimize2, Code, FileText, Table, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'table' | 'chart' | 'html' | 'svg' | 'mermaid';
  title: string;
  content: string;
  language?: string;
  metadata?: Record<string, any>;
}

interface ArtifactsProps {
  artifacts: Artifact[];
  onClose: () => void;
  onRemoveArtifact: (id: string) => void;
}

export const Artifacts = ({ artifacts, onClose, onRemoveArtifact }: ArtifactsProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(artifacts[0]?.id || '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (artifacts.length === 0) return null;

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard!" });
  };

  const handleDownload = (artifact: Artifact) => {
    const ext = artifact.type === 'code' ? (artifact.language || 'txt') : 
                artifact.type === 'html' ? 'html' :
                artifact.type === 'svg' ? 'svg' :
                artifact.type === 'mermaid' ? 'mmd' :
                artifact.type === 'document' ? 'md' : 'txt';
    
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!" });
  };

  const getIcon = (type: Artifact['type']) => {
    switch (type) {
      case 'code': return <Code className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'table': return <Table className="h-4 w-4" />;
      case 'chart': return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const renderContent = (artifact: Artifact) => {
    switch (artifact.type) {
      case 'html':
        return (
          <iframe
            srcDoc={artifact.content}
            className="w-full h-full min-h-[400px] rounded-md border"
            sandbox="allow-scripts"
          />
        );
      case 'svg': {
        const sanitizedSvg = DOMPurify.sanitize(artifact.content, { 
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'g', 'defs', 'clipPath', 'use'],
          ADD_ATTR: ['viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'transform', 'xmlns'],
        });
        return (
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
        );
      }
      case 'code':
        return (
          <pre className="p-4 rounded-md bg-muted/50 overflow-auto text-sm font-mono h-full">
            <code>{artifact.content}</code>
          </pre>
        );
      default:
        return (
          <div className="p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto h-full">
            {artifact.content}
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "fixed right-0 top-0 h-full bg-background border-l shadow-xl z-50",
          isFullscreen ? "w-full" : "w-[600px] max-w-[50vw]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            Artifacts ({artifacts.length})
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100%-65px)]">
          <div className="border-b px-4">
            <TabsList className="h-auto p-1 bg-transparent gap-1 flex-wrap">
              {artifacts.map((artifact) => (
                <TabsTrigger
                  key={artifact.id}
                  value={artifact.id}
                  className="gap-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-muted"
                >
                  {getIcon(artifact.type)}
                  <span className="max-w-[100px] truncate">{artifact.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {artifacts.map((artifact) => (
            <TabsContent
              key={artifact.id}
              value={artifact.id}
              className="flex-1 flex flex-col m-0 data-[state=active]:flex"
            >
              {/* Artifact actions */}
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  {getIcon(artifact.type)}
                  <span className="font-medium">{artifact.title}</span>
                  {artifact.language && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {artifact.language}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(artifact.content)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(artifact)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {artifact.type === 'html' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const win = window.open('', '_blank');
                        if (win) {
                          win.document.write(artifact.content);
                          win.document.close();
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveArtifact(artifact.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4">
                {renderContent(artifact)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper to detect and extract artifacts from AI responses
export const extractArtifacts = (content: string): { cleanContent: string; artifacts: Artifact[] } => {
  const artifacts: Artifact[] = [];
  let cleanContent = content;

  // Extract code blocks with titles
  const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+?)\n)?([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const title = match[2] || `Code Snippet`;
    const code = match[3].trim();
    
    // Only extract substantial code blocks as artifacts
    if (code.split('\n').length > 5) {
      artifacts.push({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
        type: 'code',
        title,
        content: code,
        language,
      });
    }
  }

  // Extract HTML blocks
  const htmlRegex = /<html[\s\S]*?<\/html>/gi;
  while ((match = htmlRegex.exec(content)) !== null) {
    artifacts.push({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
      type: 'html',
      title: 'HTML Preview',
      content: match[0],
    });
  }

  // Extract SVG blocks
  const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
  while ((match = svgRegex.exec(content)) !== null) {
    artifacts.push({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
      type: 'svg',
      title: 'SVG Graphic',
      content: match[0],
    });
  }

  return { cleanContent, artifacts };
};
