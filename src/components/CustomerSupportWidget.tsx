import { useState, useCallback, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, User } from "lucide-react";
import ChatbotLogo from "@/components/ChatbotLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { backend } from "@/integrations/local/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data: sessionData } = await backend.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(
        '',
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: "",
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
          })
        }
      );

      if (!response.ok) {
        throw new Error("Support assistant currently unavailable");
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || data.reply || "Thank you for reaching out! A specialist will assist you.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please email us at shadowtalk@shadowtalk-ai.com."
      }]);
      toast({ variant: "destructive", title: "Connection Error", description: "Failed to send message." });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (location.pathname === "/chatbot" || location.pathname === "/ide") return null;

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40 hidden sm:flex flex-col items-end gap-3">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          aria-label="Open 24/7 AI support"
          className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-105 relative"
          style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 4px 15px hsl(0 0% 0% / 0.3)' }}
        >
          <MessageCircle className="h-6 w-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </Button>
      </div>
    );
  }

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
              </h3>
              <p className="text-xs text-muted-foreground">24/7 Customer Support</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close support chat">
            <X className="h-4 w-4" />
          </Button>
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
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" aria-label="Send message">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            ShadowTalk AI • 24/7 Verified Support
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CustomerSupportWidget;
