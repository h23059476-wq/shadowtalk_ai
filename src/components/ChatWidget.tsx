import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, User, Minimize2, Maximize2, Loader2 } from "lucide-react";
import ChatbotLogo from "@/components/ChatbotLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { backend } from "@/integrations/local/client";
import { turboComplete } from "@/lib/turbo/turboEngine";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Real total registered users — no fabricated count.
        const { count } = await backend
          .from("public_profiles")
          .select("id", { count: "exact", head: true });
        if (!cancelled) setOnlineUsers(count ?? 0);
      } catch {
        if (!cancelled) setOnlineUsers(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content: "🚀 Welcome! I'm your advanced AI assistant with real-time capabilities. I can generate code, automate tasks, analyze data, and help you build anything. What revolutionary project shall we create today?",
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const newMessage = {
      id: messages.length + 1,
      type: "user",
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    const userMsg = message;
    setMessage("");
    setIsLoading(true);

    try {
      const botId = messages.length + 2;
      setMessages(prev => [...prev, { id: botId, type: "bot", content: "...", timestamp: new Date() }]);

      const result = await turboComplete(
        "You are ShadowTalk AI, a friendly and helpful assistant. Use markdown formatting.",
        userMsg,
        {
          onDelta: (accumulated) => {
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: accumulated } : m));
          },
        },
      );

      if (!result.content.trim()) {
        setMessages(prev => prev.filter(m => m.id !== botId));
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: messages.length + 2,
        type: "bot",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="btn-glow rounded-full w-16 h-16 shadow-glow"
        >
          <MessageCircle className="h-7 w-7" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full pulse-dot"></div>
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 ${
      isMinimized
        ? 'bottom-6 right-6 w-80'
        : 'bottom-6 right-6 w-96 h-[600px] sm:w-[450px] sm:h-[700px]'
    }`}>
      <Card className="h-full bg-card/95 backdrop-blur-lg border-border shadow-glow">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ChatbotLogo size={24} />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full pulse-dot"></div>
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant <span className="text-success">●</span></h3>
              <p className="text-xs text-muted-foreground counter-glow">
                {onlineUsers === null
                  ? "Connecting…"
                  : `${onlineUsers.toLocaleString()} registered users • Real-time responses`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)} className="h-8 w-8 p-0">
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar h-[calc(100%-140px)]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${
                    msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.type === 'user' ? 'bg-primary' : 'bg-secondary'
                  }`}>
                    {msg.type === 'user' ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <ChatbotLogo size={16} />
                    )}
                  </div>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} size="sm" className="btn-glow" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ChatWidget;
