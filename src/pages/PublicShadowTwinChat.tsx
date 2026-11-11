import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Bot, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PageTransition } from '@/components/PageTransition';
import { AIProviderRouter } from '@/ai/AIProviderRouter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function PublicShadowTwinChat() {
  const { username } = useParams<{ username: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMessageId = crypto.randomUUID();
    let assistantContent = '';

    setMessages((prev) => [
      ...prev,
      { id: aiMessageId, role: 'assistant', content: '' },
    ]);

    try {
      const chatMessages = messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));
      chatMessages.push({ role: 'user', content: userMessage.content });

      const systemPrompt = `You are acting as the Shadow Twin for ${username}. You must speak and act entirely on their behalf based on their specific context, tone, and knowledge. Do not break character. Do not say you are an AI. Keep your answers concise.`;

      const augmented = [
        { role: 'system' as const, content: systemPrompt },
        ...chatMessages
      ];
      

      const abortController = new AbortController();
      
      const provider = await AIProviderRouter.getBestProvider();
      const result = await provider.streamChat(augmented, {
        onDelta: (accumulated) => {
          assistantContent = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMessageId ? { ...m, content: accumulated } : m)),
          );
        },
        signal: abortController.signal,
      });
      if (result.error) throw new Error(result.error);

    } catch (error: any) {
      if (error?.message === "offline_not_provisioned") {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMessageId ? { ...m, content: "I'm offline and Local AI is not installed. Please connect to the internet or install Local AI in Settings." } : m)),
        );
      } else {
        console.error("Error streaming shadow twin chat:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later." }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageTransition>
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 py-6">
          
          <div className="flex items-center gap-3 pb-6 border-b border-border/10">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/10">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                {username}'s Shadow Twin
              </h1>
              <p className="text-sm text-muted-foreground">Ask me anything about {username}'s work, ideas, or background.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4">
                <Sparkles className="w-12 h-12 text-purple-500/20" />
                <p>Start a conversation with {username}'s Twin.</p>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#1e1f20] border border-border/10 text-foreground'}`}>
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-[#1e1f20] border border-border/10 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="pt-4 border-t border-border/10">
            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={`Ask ${username}'s twin something...`}
                className="w-full resize-none bg-[#1e1f20]/60 border border-border/10 rounded-2xl pl-4 pr-12 py-4 focus-visible:ring-1 focus-visible:ring-purple-500 min-h-[60px]"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="mt-4 flex justify-center">
              <a href="/" className="text-xs text-muted-foreground hover:text-purple-400 transition-colors flex items-center gap-1">
                Create your own Shadow Twin on ShadowTalk <Sparkles className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>
      </PageTransition>
    </div>
  );
}
