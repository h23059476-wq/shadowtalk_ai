import React, { useMemo } from 'react';
import { User, Copy, RefreshCw, Volume2, VolumeX, Lock, Edit2, ExternalLink, Compass, Sparkles, Share2, MoreHorizontal, FileText, Paperclip } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCopyWithAttribution } from '@/lib/growth/selfMarketing';
import { useUserReferralCode } from '@/hooks/useUserReferralCode';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { LazyMarkdown } from './LazyMarkdown';
import { CodeBlock } from './CodeBlock';
import { ResearchDataCard } from './ResearchDataCard';
import { useToast } from '@/hooks/use-toast';
import { DocumentArtifact, detectDocumentArtifact } from './DocumentArtifact';
import { ToolExecutionCard } from './ToolExecutionCard';
import { ToolType } from '@/hooks/useToolOrchestrator';
import { getChatShowTimestamps } from '@/lib/profilePreferences';
import { format } from 'date-fns';

const extractUrls = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches.map(url => url.replace(/[.,;:!?)]+$/, '')))];
};

const openInBrowser = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Batch 4 — format a friendly provider-source label for AI messages.
 * Maps the canonical source + provider + modelUsed to a short human label.
 *
 *   "byok"      → "via <Provider> (your key)"     (e.g. "via OpenAI (your key)")
 *   "shared"    → "via ShadowTalk shared"         (the Firebase Function path)
 *   "local"     → "via Local (<model>)"           (on-device web-llm)
 *   "omniroute" → "via OmniRoute"
 *   anything else with modelUsed → "via <modelUsed>"
 */
function formatSourceLabel(source: string, provider?: string, modelUsed?: string): string {
  switch (source) {
    case "byok": {
      if (provider) {
        const known: Record<string, string> = {
          openai: "OpenAI",
          anthropic: "Anthropic",
          gemini: "Google Gemini",
          groq: "Groq",
          openrouter: "OpenRouter",
          mistral: "Mistral",
          deepseek: "DeepSeek",
          together: "Together",
          fireworks: "Fireworks",
          perplexity: "Perplexity",
          cohere: "Cohere",
          xai: "xAI",
          cerebras: "Cerebras",
          hyperbolic: "Hyperbolic",
          novita: "Novita",
          deepinfra: "DeepInfra",
        };
        const label = known[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
        return `via ${label} (your key)`;
      }
      return "via your API key";
    }
    case "shared":
      return "via ShadowTalk shared";
    case "local":
      return modelUsed ? `via Local (${modelUsed})` : "via Local (on-device)";
    case "omniroute":
      return "via OmniRoute";
    default:
      return modelUsed ? `via ${modelUsed}` : "";
  }
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachment?: { type: 'image' | 'file'; data: string; name: string; mimeType: string };
  imageUrl?: string;
  toolExecution?: { tool: string; status: 'pending' | 'running' | 'complete' | 'error' | 'confirm'; params?: Record<string, string>; result?: string };
  isShadowTwin?: boolean;
  shadowTwinName?: string;
  /** Batch 4 — provider-source label. Values: "byok" | "shared" | "local" | "omniroute". */
  source?: string;
  /** Batch 4 — model actually used (e.g. "gpt-4o-mini", "Llama-3.2-1B-Instruct-q4f16_1-MLC"). */
  modelUsed?: string;
  /** Batch 4 — upstream provider name (e.g. "openai", "openrouter"). */
  provider?: string;
  /** Batch R1 — provider-reported citations (web research), preserved from the SSE layer. */
  citations?: Array<{ url: string; title?: string }>;
  /** Batch R1 — structured research datasets captured from ```shadowdata blocks. */
  researchData?: unknown[];
}

interface MessageBubbleProps {
  message: Message;
  index: number;
  isLoading: boolean;
  userPlan: string;
  speakingMessageId: string | null;
  isSpeaking: boolean;
  onEdit: (index: number, content: string) => void;
  onRegenerate: (index: number) => void;
  onTextToSpeech: (text: string, messageId: string) => void;
  onOpenCodeCanvas: (code: string, language: string) => void;
  onOpenIDE?: (code: string, language: string) => void;
  onLaunchWebsite?: (code: string, language: string) => void;
  onOpenInBrowser?: (url: string) => void;
  layout?: 'default' | 'gemini' | 'shadow-pulse';
  /** @deprecated Prefer `layout`. Kept for older ChatMessages that pass variant="neural". */
  variant?: 'default' | 'neural';
  onConfirmTool?: (messageId: string) => void;
  onCancelTool?: (messageId: string) => void;
  onShareReply?: (content: string) => void;
  enterpriseShare?: boolean;
  includeReferralInShare?: boolean;
}

const MessageBubbleInner: React.FC<MessageBubbleProps> = ({
  message,
  index,
  isLoading,
  userPlan,
  speakingMessageId,
  isSpeaking,
  onEdit,
  onRegenerate,
  onTextToSpeech,
  onOpenCodeCanvas,
  onOpenIDE,
  onLaunchWebsite,
  onOpenInBrowser,
  layout: layoutProp = 'default',
  variant,
  onConfirmTool,
  onCancelTool,
  onShareReply,
  enterpriseShare = false,
  includeReferralInShare = true,
}) => {
  const { toast } = useToast();
  const referralCode = useUserReferralCode();
  const isUser = message.type === 'user';
  const isWelcome = message.id === 'welcome';
  const layout =
    layoutProp !== 'default' || variant !== 'neural' ? layoutProp : 'gemini';
  const isClean = layout === 'gemini' || layout === 'shadow-pulse';

  // Detect document artifacts in AI responses
  const documentArtifact = useMemo(() => {
    if (isUser || isWelcome) return null;
    return detectDocumentArtifact(message.content);
  }, [message.content, isUser, isWelcome]);

  const handleCopy = async () => {
    const text = !isUser
      ? formatCopyWithAttribution(
          message.content,
          includeReferralInShare ? referralCode : null,
          { enterprise: enterpriseShare },
        )
      : message.content;
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: !isUser
        ? enterpriseShare
          ? 'Includes invite link for colleagues.'
          : 'Includes your ShadowTalk invite link.'
        : undefined,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: Math.min(index * 0.02, 0.1)
      }}
      className={`group flex items-start gap-3 md:gap-4 py-3 ${isUser ? 'flex-row-reverse' : ''} ${isClean ? 'neural-message-row' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 select-none ${
        isUser 
          ? 'bg-primary text-primary-foreground'
          : 'bg-transparent'
      }`}>
        {isUser 
          ? <User className="h-4 w-4 text-muted-foreground/80" /> 
          : message.isShadowTwin
            ? <User className={`h-5 w-5 ${isClean ? 'text-purple-400/80' : 'text-purple-400'}`} />
            : <Sparkles className={`h-5 w-5 ${isClean ? 'text-muted-foreground/60' : 'text-blue-400'}`} />
        }
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-2 ${isUser ? 'items-end max-w-[85%] sm:max-w-[75%]' : 'items-start w-full'} `} style={{ width: isUser ? undefined : '100%' }}>
        {!isUser && message.isShadowTwin && (
          <div className="text-xs font-semibold text-purple-400/80 flex items-center gap-1.5 ml-1">
            {message.shadowTwinName || "Shadow Twin"}
          </div>
        )}
        {/* Batch 4 — provider-source label for AI messages. */}
        {!isUser && !message.isShadowTwin && message.source && (
          <div className="text-[11px] font-medium text-muted-foreground/70 flex items-center gap-1 ml-1">
            {formatSourceLabel(message.source, message.provider, message.modelUsed)}
          </div>
        )}
        {/* Image attachment */}
        {message.attachment?.type === 'image' && (
          <img
            src={message.attachment.data}
            alt={message.attachment.name}
            className="max-w-[200px] sm:max-w-md rounded-2xl border border-border/10 shadow-lg mb-2"
          />
        )}

        {/* File attachment (non-image) */}
        {message.attachment?.type === 'file' && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-muted/20 mb-2 max-w-md">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{message.attachment.name}</p>
              <p className="text-[11px] text-muted-foreground">{message.attachment.mimeType || 'File'}</p>
            </div>
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
        )}

        {/* AI Generated Image */}
        {message.imageUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-border/10 shadow-lg max-w-xl mb-3 group/image">
            <img 
              src={message.imageUrl} 
              alt="AI Generated" 
              className="w-full h-auto object-contain transition-transform duration-500 group-hover/image:scale-[1.02]"
            />
            <a 
              href={message.imageUrl} 
              download={`shadowtalk-${Date.now()}.png`}
              className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[12px] font-medium px-4 py-2 rounded-full hover:bg-black/80 transition-all opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 translate-y-0 sm:translate-y-2 sm:group-hover/image:translate-y-0 shadow-lg"
              aria-label="Download image"
            >
              Download
            </a>
          </div>
        )}

        {/* Message bubble */}
        <div className={`w-full transition-all duration-300 ${
          isUser 
            ? isClean
              ? 'bg-primary text-primary-foreground rounded-[22px] rounded-br-md px-4 py-2.5 max-w-max'
              : 'ios-glass-bubble-user bg-primary/80 text-primary-foreground rounded-[28px] rounded-tr-sm px-6 py-3.5 shadow-sm max-w-max'
            : isClean
              ? 'bg-transparent border-none shadow-none px-0 py-0.5 article-response'
              : 'ios-glass-bubble-ai bg-transparent border border-white/[0.06] shadow-none px-5 py-3 article-response'
        }`}>
          {isUser ? (
            <p className="text-[15.5px] leading-relaxed whitespace-pre-wrap break-words font-normal tracking-wide">{typeof message.content === 'string' ? message.content : String(message.content || '')}</p>
          ) : (
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:my-5 prose-headings:mt-10 prose-headings:mb-5 prose-headings:first:mt-0 prose-ul:my-6 prose-ol:my-6 prose-li:my-2 prose-hr:my-10 prose-hr:border-border/10 [&_.katex]:text-foreground [&_.katex-display]:my-10 [&_.katex-display]:overflow-x-auto overflow-hidden">
              <LazyMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    
                    const isShortSnippet = !match && !codeString.includes('\n') && codeString.length < 80;
                    
                    // Batch R1 — render structured research-data blocks as a
                    // compact capture card instead of a raw JSON dump. The full
                    // JSON stays in message content and persistence.
                    if (!inline && match?.[1] === 'shadowdata') {
                      return <ResearchDataCard raw={codeString} />;
                    }
                    if (!inline && match) {
                      return <CodeBlock code={codeString} language={match[1]} onOpenCanvas={onOpenCodeCanvas} onOpenIDE={onOpenIDE} onLaunchWebsite={onLaunchWebsite} />;
                    }
                    if (inline || isShortSnippet) {
                      return (
                        <code className="bg-muted/50 text-foreground/90 px-1.5 py-0.5 rounded text-[14.5px] font-mono" {...props}>
                          {children}
                        </code>
                      );
                      
                    }
                    return <CodeBlock code={codeString} language="text" onOpenCanvas={onOpenCodeCanvas} onOpenIDE={onOpenIDE} onLaunchWebsite={onLaunchWebsite} />;
                  },
                  ul({ children }) { return <ul className="list-disc pl-7 space-y-3 my-6 marker:text-foreground/30">{children}</ul>; },
                  ol({ children }) { return <ol className="list-decimal pl-7 space-y-3 my-6 marker:text-foreground/40 marker:font-bold">{children}</ol>; },
                  li({ children, ...props }: any) {
                    // Task list checkbox support
                    const text = String(children);
                    const isChecked = text.match(/^\[x\]/i);
                    const isUnchecked = text.match(/^\[ \]/);
                    
                    if (isChecked || isUnchecked) {
                      return (
                        <li className="flex items-start gap-4 list-none -ml-6 my-3" {...props}>
                          <span className={`mt-1.5 w-5 h-5 rounded-md border flex items-center justify-center text-[12px] shrink-0 ${
                            isChecked ? 'bg-primary/30 border-primary/50 text-primary' : 'border-border/60'
                          }`}>
                            {isChecked && '✓'}
                          </span>
                          <span className={isChecked ? 'line-through text-muted-foreground/40' : ''}>
                            {text.replace(/^\[[ x]\]\s*/i, '')}
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li className="text-[16.5px] leading-relaxed pl-1" {...props}>{children}</li>
                    ); 
                  },
                  h1({ children }) { 
                    return (
                      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-foreground/95 border-b border-border/5 pb-4">
                        {children}
                      </h1>
                    ); 
                  },
                  h2({ children }) { 
                    return (
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-12 first:mt-0 mb-6 text-foreground/90">
                        {children}
                      </h2>
                    ); 
                  },
                  h3({ children }) { return <h3 className="text-xl md:text-2xl font-semibold mt-10 first:mt-0 text-foreground/85 tracking-tight">{children}</h3>; },
                  h4({ children }) { return <h4 className="text-lg md:text-xl font-medium text-muted-foreground mt-6">{children}</h4>; },
                  p({ children }) { return <p className="text-[16.5px] md:text-[17.5px] leading-relaxed mb-6 last:mb-0 text-foreground/85 font-normal tracking-wide">{children}</p>; },
                  strong({ children }) { return <strong className="font-bold text-foreground/95">{children}</strong>; },
                  em({ children }) { return <em className="italic text-foreground/70">{children}</em>; },
                  hr() { return <hr className="my-12 border-border/10" />; },
                  a({ children, href }) { 
                    return (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={(e) => { e.preventDefault(); if (href) openInBrowser(href); }}
                        className="text-blue-400 font-semibold hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-400/70 cursor-pointer transition-all duration-300"
                      >
                        {children}
                      </a>
                    ); 
                  },
                  blockquote({ children }) {
                    // Detect callout type from emoji prefix
                    const text = String(children);
                    const isWarning = text.includes('⚠️');
                    const isSuccess = text.includes('✅');
                    const isKey = text.includes('🔑') || text.includes('📌');
                    const isTip = text.includes('💡');
                    
                    const borderColor = isWarning ? 'border-amber-400/50' : isSuccess ? 'border-emerald-400/50' : isKey ? 'border-violet-400/50' : isTip ? 'border-sky-400/50' : 'border-primary/30';
                    const bgColor = isWarning ? 'bg-amber-500/[0.04]' : isSuccess ? 'bg-emerald-500/[0.04]' : isKey ? 'bg-violet-500/[0.04]' : isTip ? 'bg-sky-500/[0.04]' : 'bg-primary/[0.03]';
                    
                    return (
                      <blockquote className={`border-l-[4px] ${borderColor} pl-6 py-4 my-6 ${bgColor} rounded-r-2xl text-foreground/85 not-italic [&_p]:mb-2 [&_p]:last:mb-0 [&_p]:text-[15px] [&_p]:leading-relaxed font-medium`}>
                        {children}
                      </blockquote>
                    ); 
                  },
                  table({ children }) { 
                    return (
                      <div className="overflow-x-auto my-6 rounded-2xl border border-border/10 shadow-md bg-[#1e1f20]/20">
                        <table className="min-w-full divide-y divide-border/10">{children}</table>
                      </div>
                    ); 
                  },
                  thead({ children }) {
                    return <thead className="bg-muted/20">{children}</thead>;
                  },
                  th({ children }) { 
                    return (
                      <th className="px-5 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {children}
                      </th>
                    ); 
                  },
                  td({ children }) { 
                    return <td className="border-t border-border/10 px-5 py-3.5 text-[15px] text-foreground/80">{children}</td>; 
                  },
                  tr({ children }) {
                    return <tr className="hover:bg-muted/5 transition-colors duration-150">{children}</tr>;
                  },
                  // Enhanced image rendering
                  img({ src, alt }) {
                    return (
                      <img 
                        src={src} 
                        alt={alt || ''} 
                        className="rounded-2xl border border-border/10 shadow-xl max-w-full h-auto my-6"
                        loading="lazy"
                      />
                    );
                  },
                }}
              >
                {typeof message.content === 'string' ? message.content : String(message.content || '')}
              </LazyMarkdown>
            </div>
          )}
        </div>

        {/* Tool Execution Card */}
        {message.toolExecution && (
          <ToolExecutionCard
            tool={message.toolExecution.tool as ToolType}
            status={message.toolExecution.status}
            params={message.toolExecution.params}
            result={message.toolExecution.result}
            alert={message.toolExecution.status === 'error' ? 'Tool execution failed' : undefined}
            onConfirm={onConfirmTool ? () => onConfirmTool(message.id) : undefined}
            onCancel={onCancelTool ? () => onCancelTool(message.id) : undefined}
          />
        )}

        {/* Document Artifact - auto-detected from AI response */}
        {documentArtifact && (
          <DocumentArtifact
            title={documentArtifact.title}
            content={documentArtifact.documentContent}
            type={documentArtifact.type}
          />
        )}

        {/* Extracted URLs / provider citations */}
        {!isUser && !isWelcome && (() => {
          // Batch R1 — prefer provider-reported citations (with titles) over
          // regex extraction when available; fall back to the legacy scan.
          const linkChips: Array<{ url: string; label: string }> = message.citations?.length
            ? message.citations.map((c) => {
                let domain = '';
                try { domain = new URL(c.url).hostname.replace('www.', ''); } catch { domain = c.url.slice(0, 30); }
                const label = (c.title && c.title.length > 3 ? c.title : domain).trim();
                return { url: c.url, label: label.length > 28 ? label.slice(0, 28) + '…' : label };
              })
            : extractUrls(message.content).map((url) => {
                let domain = '';
                try { domain = new URL(url).hostname.replace('www.', ''); } catch { domain = url.slice(0, 30); }
                return { url, label: domain };
              });
          // Dedupe by URL (citations can repeat across annotations).
          const seen = new Set<string>();
          const urls = linkChips.filter((c) => !seen.has(c.url) && seen.add(c.url));
          if (urls.length === 0) return null;
          const displayUrls = urls.slice(0, 3);
          
          return (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {displayUrls.map(({ url, label }, idx) => {
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openInBrowser(url)}
                      className="h-7 px-3 text-[11px] gap-1.5 text-muted-foreground/60 hover:text-blue-400 rounded-full bg-muted/20 hover:bg-muted/40 transition-all"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {label}
                    </Button>
                    {onOpenInBrowser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenInBrowser(url)}
                        className="h-7 px-2 text-[11px] text-muted-foreground/40 hover:text-cyan-400 rounded-full transition-all"
                        title="Open in ShadowBrowser"
                      >
                        <Compass className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {urls.length > 3 && (
                <span className="text-[11px] text-muted-foreground/30 px-2 font-medium">+{urls.length - 3} more sources</span>
              )}
            </div>
          );
        })()}

        {getChatShowTimestamps() && !isWelcome && message.timestamp && (
          <p className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            {format(message.timestamp, "MMM d, h:mm a")}
          </p>
        )}

        {/* Actions */}
        {!isWelcome && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 focus-within:translate-y-0 mt-2">
            {isUser ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEdit(index, message.content)} 
                disabled={isLoading} 
                className="h-8 px-3 text-[11px] text-muted-foreground/60 hover:text-foreground rounded-full hover:bg-muted/40"
              >
                <Edit2 className="h-3 w-3 mr-1.5" />
                Edit
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRegenerate(index)} 
                  disabled={isLoading} 
                  className="h-8 px-3 text-[11px] text-muted-foreground/60 hover:text-foreground rounded-full hover:bg-muted/40"
                  aria-label="Regenerate response"
                >
                  <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopy} 
              className="h-8 px-3 text-[11px] text-muted-foreground/60 hover:text-foreground rounded-full hover:bg-muted/40"
              aria-label="Copy message"
            >
              <Copy className="h-3 w-3 mr-1.5" />
              Copy
            </Button>
            {!isUser && (
              /* Spec §10 / §15 — secondary actions live behind a "More" menu. */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground rounded-full hover:bg-muted/40"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onTextToSpeech(message.content, message.id)}
                    disabled={isLoading}
                    className="gap-2 text-[13px]"
                  >
                    {speakingMessageId === message.id && isSpeaking ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                    {speakingMessageId === message.id && isSpeaking ? 'Stop reading' : 'Read aloud'}
                    {userPlan !== 'pro' && userPlan !== 'elite' && (
                      <Lock className="h-3 w-3 ml-auto opacity-60" aria-label="Upgrade required" />
                    )}
                  </DropdownMenuItem>
                  {onShareReply && (
                    <DropdownMenuItem
                      onClick={() => onShareReply(message.content)}
                      disabled={isLoading}
                      className="gap-2 text-[13px]"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share reply
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Memoised wrapper — prevents all existing message bubbles from re-rendering
 * on every streaming token. Only re-renders when this specific message changes.
 */
export const MessageBubble = React.memo(MessageBubbleInner, (prev, next) => {
  // Only skip re-render if the message content, speaking state and loading state are identical
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.toolExecution?.status === next.message.toolExecution?.status &&
    prev.message.source === next.message.source &&
    prev.message.provider === next.message.provider &&
    prev.message.modelUsed === next.message.modelUsed &&
    // Batch R1 — research citations/datasets arrive AFTER the content settles,
    // so the comparator must react to them or the chips/card never render.
    prev.message.citations === next.message.citations &&
    prev.message.researchData === next.message.researchData &&
    prev.isLoading === next.isLoading &&
    prev.speakingMessageId === next.speakingMessageId &&
    prev.isSpeaking === next.isSpeaking
  );
});
