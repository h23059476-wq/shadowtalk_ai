import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { SuggestedPrompts } from './SuggestedPrompts';
import { AIResponseGlow } from './PremiumChatEffects';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachment?: { type: 'image' | 'file'; data: string; name: string; mimeType: string };
  /** Batch R1 — forwarded to MessageBubble (research citations + structured datasets). */
  citations?: Array<{ url: string; title?: string }>;
  researchData?: unknown[];
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  showSuggestions: boolean;
  personality: string;
  userPlan: string;
  speakingMessageId: string | null;
  isSpeaking: boolean;
  onSelectPrompt: (prompt: string) => void;
  onEdit: (index: number, content: string) => void;
  onRegenerate: (index: number) => void;
  onTextToSpeech: (text: string, messageId: string) => void;
  onOpenCodeCanvas: (code: string, language: string) => void;
  onOpenIDE?: (code: string, language: string) => void;
  onLaunchWebsite?: (code: string, language: string) => void;
  onOpenInBrowser?: (url: string) => void;
  onConfirmTool?: (messageId: string) => void;
  onCancelTool?: (messageId: string) => void;
  onShareReply?: (content: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  thinkingStage?: 'understanding' | 'reasoning' | 'generating' | 'refining' | null;
  layout?: 'default' | 'gemini' | 'shadow-pulse';
  enterpriseShare?: boolean;
  includeReferralInShare?: boolean;
}

export const ChatMessagesInner: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  showSuggestions,
  personality,
  userPlan,
  speakingMessageId,
  isSpeaking,
  onSelectPrompt,
  onEdit,
  onRegenerate,
  onTextToSpeech,
  onOpenCodeCanvas,
  onOpenIDE,
  onLaunchWebsite,
  onOpenInBrowser,
  onShareReply,
  messagesEndRef,
  thinkingStage,
  layout = 'default',
  enterpriseShare,
  includeReferralInShare,
}) => {
  const isGemini = layout === 'gemini' || layout === 'shadow-pulse';
  const STAGE_INFO = {
    understanding: { text: 'Parsing intent & context', icon: '🧠', color: 'text-blue-400', glow: 'shadow-blue-500/20' },
    reasoning: { text: 'Chain-of-thought reasoning', icon: '⚡', color: 'text-amber-400', glow: 'shadow-amber-500/20' },
    generating: { text: 'Synthesizing response', icon: '✨', color: 'text-violet-400', glow: 'shadow-violet-500/20' },
    refining: { text: 'Polishing & validating', icon: '🎯', color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Track whether the user has scrolled away from the bottom.
  // If so, don't yank them back down while the AI is streaming.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll to top when suggestions are shown (initial state)
  useEffect(() => {
    if (showSuggestions && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      stickToBottomRef.current = true;
    }
  }, [showSuggestions]);

  // Scroll to bottom on new messages, but use instant scroll while streaming
  // to avoid triggering layout thrashing on every token.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || showSuggestions) return;
    if (!stickToBottomRef.current) return;
    // Use instant scroll while loading (streaming) to avoid triggering
    // heavy layout recalcs via smooth scroll on every token.
    if (isLoading) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, showSuggestions]);

  return (
    <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar scroll-smooth shadowtalk-chat-messages-scroll">

      <div
        className={`mx-auto px-3 xs:px-4 sm:px-6 py-4 xs:py-6 sm:py-10 w-full min-w-0 ${
          isGemini ? 'max-w-[800px] space-y-5 sm:space-y-8' : 'max-w-5xl space-y-6 sm:space-y-12'
        }`}
      >
        {/* Suggested prompts */}
        {showSuggestions && (
          <div className="min-h-[calc(100dvh-13rem)] flex items-center justify-center">
            <SuggestedPrompts 
              onSelect={onSelectPrompt} 
              personality={personality}
            />
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            index={index}
            isLoading={isLoading}
            userPlan={userPlan}
            speakingMessageId={speakingMessageId}
            isSpeaking={isSpeaking}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
            onTextToSpeech={onTextToSpeech}
            onOpenCodeCanvas={onOpenCodeCanvas}
            onOpenIDE={onOpenIDE}
            onLaunchWebsite={onLaunchWebsite}
            onOpenInBrowser={onOpenInBrowser}
            onShareReply={onShareReply}
            enterpriseShare={enterpriseShare}
            includeReferralInShare={includeReferralInShare}
            layout={isGemini ? 'gemini' : 'default'}
          />
        ))}

        {/* Premium thinking indicator */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-muted-foreground/50" />
            </div>
            
            <div className="relative">
              {!isGemini && <AIResponseGlow isActive={true} />}
              <motion.div 
                className={
                  isGemini
                    ? "px-1 py-2"
                    : "bg-card/90 backdrop-blur-md border border-border/40 rounded-2xl rounded-tl-md px-4 py-3 shadow-lg"
                }
              >
                {isGemini ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.35, 1, 0.35] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                        />
                      ))}
                    </div>
                    <span>Thinking…</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                            className="w-1.5 h-1.5 bg-primary rounded-full"
                          />
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        {thinkingStage && (
                          <motion.div
                            key={thinkingStage}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className={`flex items-center gap-1.5 text-xs font-medium ${STAGE_INFO[thinkingStage].color}`}
                          >
                            <span>{STAGE_INFO[thinkingStage].icon}</span>
                            <span>{STAGE_INFO[thinkingStage].text}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {thinkingStage && (
                      <motion.div className="h-0.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary/60 rounded-full"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          style={{ width: '50%' }}
                        />
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>
    </div>
  );
};

export const ChatMessages = React.memo(ChatMessagesInner);
