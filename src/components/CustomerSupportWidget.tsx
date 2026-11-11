import { useState, useCallback, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, User, Sparkles, Brain, Zap } from "lucide-react";
import ChatbotLogo from "@/components/ChatbotLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useProactiveAI } from "@/hooks/useProactiveAI";
import { useProactiveOptIn } from "@/hooks/useProactiveOptIn";
import ProactiveOptInPrompt from "@/components/growth/ProactiveOptInPrompt";
import { getProactiveTypeLabel, PROACTIVE_ETHICS } from "@/lib/ethicalGrowth";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { backend } from "@/integrations/local/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MOOD_COLORS: Record<string, string> = {
  frustrated: "border-red-500/40 shadow-red-500/10",
  excited: "border-yellow-500/40 shadow-yellow-500/10",
  confused: "border-orange-500/40 shadow-orange-500/10",
  focused: "border-blue-500/40 shadow-blue-500/10",
  bored: "border-muted-foreground/30",
  rushed: "border-primary/40 shadow-primary/10",
  neutral: "border-border",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  greeting: <Sparkles className="h-3.5 w-3.5" />,
  returning: <Sparkles className="h-3.5 w-3.5" />,
  nudge: <Sparkles className="h-3.5 w-3.5" />,
};

function getTypeBadge(type: string) {
  return {
    label: getProactiveTypeLabel(type),
    icon: TYPE_ICONS[type] ?? <Sparkles className="h-3.5 w-3.5" />,
  };
}

const PROMPT_DISMISSED_KEY = "shadowtalk-proactive-prompt-dismissed";

const CustomerSupportWidget = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your 24/7 AI support assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { currentMessage, isVisible, detectedMood, dismiss, recordInteraction, optedIn, loaded } =
    useProactiveAI(isOpen);
  const { enable, disable } = useProactiveOptIn();
  const [promptDismissed, setPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem(PROMPT_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismissOptInPrompt = useCallback(() => {
    setPromptDismissed(true);
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const openFromProactive = useCallback(() => {
    if (currentMessage) {
      setMessages(prev => [...prev, { role: "assistant", content: currentMessage.content }]);
      dismiss();
      recordInteraction(currentMessage.content.slice(0, 50));
    }
    setIsOpen(true);
  }, [currentMessage, dismiss, recordInteraction]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    recordInteraction(userMessage.slice(0, 50));

    try {
      const { data: sessionData } = await backend.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_API_KEY,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
            body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: `You are a professional customer support specialist for ShadowTalk AI — an advanced AI platform. Follow this response framework strictly:

1. Opening: One clear, direct sentence addressing the user's issue. No filler phrases like "Of course!", "Absolutely!", "Great question!", or "Sure!".
2. Body: Structured, factual information in 2–3 short paragraphs separated by a blank line. Be specific and accurate.
3. Closing: One concrete next step or action the user can take.

Tone: Authoritative, calm, professional. Never casual or overly enthusiastic.
Format: Plain text only — no markdown headers, no bullet emojis, no excessive formatting. Use numbered steps only when explaining a process.
Length: Keep responses concise. Aim for under 120 words unless complexity demands more.

Product context: ShadowTalk AI is free to use — no subscriptions and no paid feature tiers. All features (AI chat, image generation, code execution, web search, voice, file uploads, offline mode, PWA, API access, developer marketplace) are included. Users bring their own AI provider API key; their provider may charge separately for API usage.`
              },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: "user", content: userMessage }
            ]
          }),
        }
      );

      if (!response.ok) {
        const t = await response.text().catch(() => "");
        throw new Error(t || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = { role: "assistant", content: assistantContent };
                  return newMessages;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again in a moment."
      }]);
      toast({ variant: "destructive", title: "Connection Error", description: "Failed to send message." });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, toast, recordInteraction]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const moodBorderClass = MOOD_COLORS[detectedMood] || MOOD_COLORS.neutral;
  const typeInfo = currentMessage ? getTypeBadge(currentMessage.type) : null;
  const showOptInPrompt = loaded && !optedIn && !promptDismissed;

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40 hidden sm:flex flex-col items-end gap-3">
        <AnimatePresence>
          {showOptInPrompt && (
            <ProactiveOptInPrompt
              onEnable={() => {
                enable();
                dismissOptInPrompt();
              }}
              onDismiss={dismissOptInPrompt}
            />
          )}
        </AnimatePresence>
        {/* Proactive Message Bubble */}
        <AnimatePresence>
          {optedIn && currentMessage && isVisible && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.85, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="max-w-[320px] cursor-pointer group"
              onClick={openFromProactive}
            >
              <div className={`relative bg-card/95 backdrop-blur-xl border-2 rounded-2xl rounded-br-md p-4 shadow-2xl transition-colors ${moodBorderClass}`}>
                {/* Dismiss */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); dismiss(); }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss suggestion"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>

                {/* Type badge */}
                {typeInfo && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                      {typeInfo.icon}
                      {typeInfo.label}
                    </div>
                  </div>
                )}

                {/* Content */}
                 <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                    <ChatbotLogo size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{currentMessage.content}</p>
                    <p className="text-xs text-primary mt-2 font-medium group-hover:underline">
                      Respond →
                    </p>
                  </div>
                </div>

                {/* Animated scan line */}
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                  animate={{ width: ["0%", "100%", "0%"], left: ["0%", "0%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Button */}
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-105 relative"
            style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 4px 15px hsl(0 0% 0% / 0.3)' }}
          >
            <MessageCircle className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </Button>

          {/* Mood indicator ring */}
          {detectedMood !== 'neutral' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute inset-0 rounded-full border-2 pointer-events-none ${
                detectedMood === 'frustrated' ? 'border-red-500/50' :
                detectedMood === 'excited' ? 'border-yellow-500/50' :
                detectedMood === 'confused' ? 'border-orange-500/50' :
                detectedMood === 'focused' ? 'border-blue-500/50' :
                'border-primary/30'
              }`}
            />
          )}

          {/* Notification sparkle */}
          {optedIn && currentMessage && isVisible && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5 }}
              className="absolute -top-2 -left-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg"
            >
              <Sparkles className="h-3 w-3 text-accent-foreground" />
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (location.pathname === "/chatbot") return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-h-[70vh] sm:max-h-[500px]">
      <Card className="bg-card/95 backdrop-blur-lg border-border shadow-2xl overflow-hidden flex flex-col h-[70vh] sm:h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
             <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                <ChatbotLogo size={28} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                AI Assistant
                {optedIn && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold uppercase tracking-wider">
                    {PROACTIVE_ETHICS.label}
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">Support chat — suggestions are optional</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {optedIn && (
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={disable}>
                {PROACTIVE_ETHICS.disable}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div key={i} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <ChatbotLogo size={20} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}>
                  {message.content || (isLoading && i === messages.length - 1 ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : "")}
                </div>
                {message.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Proactive AI • Reads mood • Predicts intent • 24/7
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CustomerSupportWidget;
