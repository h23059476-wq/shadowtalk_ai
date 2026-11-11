/**
 * LiveVoiceMode — Premium live voice conversation with barge-in.
 *
 * Features:
 *  - ElevenLabs TTS (natural human voices) with browser fallback
 *  - Barge-in: interrupt AI mid-sentence by speaking (like Gemini Live)
 *  - Continuous conversation loop (auto-listen after AI speaks)
 *  - Conversational personality (warm, casual, like a smart friend)
 *  - BYOK-powered AI (user's OpenRouter/OpenAI key or cloud fallback)
 *  - Animated orb visualizer that pulses with audio
 *  - AbortController for instant barge-in
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, PhoneOff, Loader2, Volume2, Sparkles, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAIKeyContext } from "@/contexts/AIKeyContext";
import { streamCloudChat, type CloudChatMessage } from "@/lib/cloudChat";
import { getByokConfig, streamByokChat } from "@/lib/byok";
import { buildChatSystemPrompt } from "@/lib/shadowTalkPersona";
import {
  speakWithElevenLabs,
  stopAllTTS,
  hasElevenLabsKey,
  setElevenLabsKey,
  getElevenLabsKey,
  VOICE_OPTIONS,
  DEFAULT_VOICE_ID,
} from "@/lib/elevenlabsTts";

interface LiveVoiceModeProps {
  open: boolean;
  onClose: () => void;
  personality?: string;
}

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function getFallbackResponse(userText: string): string {
  const lower = userText.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi ") || lower.includes("hey")) {
    return "Hey! Good to hear you. What's on your mind?";
  }
  if (lower.includes("how are you")) {
    return "I'm doing great, thanks! How about you — what's going on?";
  }
  if (lower.includes("what can you do") || lower.includes("who are you")) {
    return "I'm ShadowTalk AI, your voice buddy. I can chat, brainstorm, answer questions, or just keep you company. What do you wanna talk about?";
  }
  return "I heard you, but I'm having trouble connecting to my brain right now. Give me a sec and try again, okay?";
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({
  open,
  onClose,
  personality = "friendly",
}) => {
  const { toast } = useToast();
  const { userCohort, userApiKey } = useAIKeyContext();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [elevenLabsKeyInput, setElevenLabsKeyInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [hasEleven, setHasEleven] = useState(hasElevenLabsKey());

  const recognitionRef = useRef<any>(null);
  const conversationRef = useRef<VoiceMessage[]>([]);
  const shouldContinueRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const ttsAbortRef = useRef<AbortController | null>(null);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Keep refs in sync with state for use in callbacks
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Init ElevenLabs key from storage
  useEffect(() => {
    if (open) {
      setHasEleven(hasElevenLabsKey());
      setElevenLabsKeyInput(getElevenLabsKey() || "");
    }
  }, [open]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopListening();
      stopAllTTS();
      shouldContinueRef.current = false;
      setIsSpeaking(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // BARGE-IN: Stop AI speaking and start listening immediately
  const bargeIn = useCallback(() => {
    // Stop TTS
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    stopAllTTS();
    setIsSpeaking(false);
    isSpeakingRef.current = false;

    // Start listening immediately
    setTimeout(() => startListeningRef.current(), 100);
  }, []);

  // Speak using ElevenLabs (or browser fallback)
  const speak = useCallback((text: string) => {
    const controller = new AbortController();
    ttsAbortRef.current = controller;

    speakWithElevenLabs(text, {
      voiceId: selectedVoice,
      signal: controller.signal,
      onStart: () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      },
      onEnd: () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        ttsAbortRef.current = null;
        // Auto-resume listening after AI finishes
        if (shouldContinueRef.current && open) {
          setTimeout(() => startListeningRef.current(), 200);
        }
      },
      onError: (err) => {
        console.warn("[VoiceMode] TTS error:", err);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (shouldContinueRef.current && open) {
          setTimeout(() => startListeningRef.current(), 200);
        }
      },
    });
  }, [open, selectedVoice]);

  // Send to AI
  const sendToAI = useCallback(async (userText: string) => {
    setIsProcessing(true);
    isProcessingRef.current = true;
    setError(null);

    const userMsg: VoiceMessage = { role: "user", content: userText, timestamp: Date.now() };
    const newConv = [...conversationRef.current, userMsg];
    conversationRef.current = newConv;
    setMessages(newConv);

    try {
      const chatMessages: CloudChatMessage[] = [
        {
          role: "system",
          content: buildChatSystemPrompt({ personality }) +
            "\n\n## Voice Mode Rules (CRITICAL)\nYou are in LIVE VOICE conversation mode.\n- Keep responses SHORT: 1-3 sentences max. Never more than 4.\n- Be WARM and CASUAL — like talking to a smart friend. Use contractions (I'm, don't, that's).\n- NO markdown, NO headers, NO bullet points, NO code blocks.\n- Be natural and conversational — laugh, ask follow-up questions, show personality.\n- If the user says something short like 'yeah' or 'ok', respond briefly and keep the flow.\n- Match the user's energy — if they're excited, be excited. If they're calm, be calm.\n- NEVER start with 'Sure!' or 'Here's...' or 'Let me...'. Just respond naturally.",
        },
        ...newConv.slice(-10).map(m => ({
          role: m.role === "user" ? "user" as const : "assistant" as const,
          content: m.content,
        })),
      ];

      let responseText = "";
      let aiFailed = false;

      try {
        // BYOK-only: use the user's configured BYOK key directly.
        // The AIKeyContext cohort system is legacy — in BYOK-only mode,
        // getByokConfig() is the single source of truth.
        const byokConfig = getByokConfig();
        if (byokConfig?.apiKey) {
          const result = await streamByokChat(byokConfig, chatMessages, { temperature: 0.8 });
          responseText = result.content || "";
          if (!responseText && result.error) aiFailed = true;
        } else {
          // No BYOK key — try streamCloudChat as fallback (it will return
          // a clear error directing the user to add a key)
          const result = await streamCloudChat(chatMessages, { temperature: 0.8 });
          responseText = result.content || "";
          if (!responseText && result.error) aiFailed = true;
        }
      } catch (err: any) {
        console.warn("[VoiceMode] AI failed:", err?.message);
        aiFailed = true;
      }

      if (!responseText) {
        responseText = getFallbackResponse(userText);
      }

      const aiMsg: VoiceMessage = { role: "assistant", content: responseText, timestamp: Date.now() };
      conversationRef.current = [...conversationRef.current, aiMsg];
      setMessages(conversationRef.current);

      speak(responseText);

      if (aiFailed) {
        toast({ title: "Connection issue", description: "Using offline fallback responses." });
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [userCohort, userApiKey, personality, speak, toast]);

  // Start listening
  const startListening = useCallback(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      toast({ title: "Not supported", description: "Voice mode needs Chrome, Edge, or Safari.", variant: "destructive" });
      return;
    }

    // BARGE-IN: If AI is speaking, stop it and listen immediately
    if (isSpeakingRef.current) {
      bargeIn();
      return;
    }

    stopAllTTS();
    stopListening();

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
      setCurrentTranscript("");
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setCurrentTranscript(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (finalTranscript.trim()) {
        setCurrentTranscript("");
        void sendToAI(finalTranscript.trim());
      } else if (shouldContinueRef.current && open && !isProcessingRef.current) {
        setTimeout(() => {
          if (shouldContinueRef.current && open && !isProcessingRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 800);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow mic permissions.");
        shouldContinueRef.current = false;
      } else if (event.error === "no-speech") {
        if (shouldContinueRef.current && open) setTimeout(() => startListening(), 500);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* already started */ }
  }, [open, sendToAI, stopListening, bargeIn, toast]);

  // Keep ref in sync
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  // Handle mic toggle
  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      shouldContinueRef.current = true;
      startListening();
    }
  };

  // Close
  const handleClose = () => {
    shouldContinueRef.current = false;
    stopListening();
    stopAllTTS();
    setMessages([]);
    conversationRef.current = [];
    setCurrentTranscript("");
    setError(null);
    setIsSpeaking(false);
    onClose();
  };

  // Save ElevenLabs key
  const handleSaveKey = () => {
    if (elevenLabsKeyInput.trim()) {
      setElevenLabsKey(elevenLabsKeyInput.trim());
      setHasEleven(true);
      setShowSettings(false);
      toast({ title: "Voice configured!", description: "ElevenLabs premium voices are now active." });
    }
  };

  // Load voices
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] ios-glass-modal-backdrop flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.92, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="ios-glass-modal w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col rounded-[28px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Live Voice
                    {hasEleven && (
                      <span className="text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20">
                        HD VOICE
                    </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {isSpeaking ? "Tap mic to interrupt" : isListening ? "Listening..." : isProcessing ? "Thinking..." : "Ready to talk"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ElevenLabs Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-white/[0.06]"
                >
                  <div className="px-6 py-4 space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 uppercase tracking-wider">ElevenLabs API Key (optional)</label>
                      <Input
                        type="password"
                        value={elevenLabsKeyInput}
                        onChange={(e) => setElevenLabsKeyInput(e.target.value)}
                        placeholder="sk_... (get free at elevenlabs.io)"
                        className="mt-1 bg-black/30 border-white/10 text-sm text-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Premium HD voices. Without a key, browser TTS is used (lower quality).
                      </p>
                    </div>
                    {hasEleven && (
                      <div>
                        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Voice</label>
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        >
                          {VOICE_OPTIONS.map(v => (
                            <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Button onClick={handleSaveKey} size="sm" className="w-full ios-glass-button-accent text-white">
                      Save Voice Settings
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation transcript */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-[180px] max-h-[45vh]">
              {messages.length === 0 && !currentTranscript && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Sparkles className="w-10 h-10 text-purple-500/30 mb-3" />
                  <p className="text-sm text-slate-400">Tap the mic and just start talking.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {hasEleven ? "Premium HD voice enabled" : "Tip: Add an ElevenLabs key in settings for HD voices"}
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={cn(
                    "max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" ? "ios-glass-bubble-user text-white" : "ios-glass-bubble-ai text-slate-100"
                  )}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {currentTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[82%] px-4 py-2.5 rounded-2xl ios-glass-bubble-user text-white/60 text-sm italic">
                    {currentTranscript}...
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-center">
                  <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>
                </div>
              )}
            </div>

            {/* Status + Orb + Controls */}
            <div className="px-6 py-6 border-t border-white/[0.06] flex flex-col items-center gap-4">
              {/* Status */}
              <p className="text-sm font-medium text-white">
                {isProcessing ? "Thinking..." : isSpeaking ? "Speaking — tap mic to interrupt" : isListening ? "Listening..." : messages.length === 0 ? "Ready to talk" : "Tap to continue"}
              </p>

              {/* Animated Orb */}
              <div className="relative">
                {/* Outer pulse rings when listening */}
                {isListening && (
                  <>
                    <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-indigo-500/25" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
                      className="absolute inset-0 rounded-full bg-indigo-500/15" />
                  </>
                )}
                {/* Speaking rings */}
                {isSpeaking && (
                  <>
                    <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 0.8, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-purple-500/25" />
                    <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      className="absolute inset-0 rounded-full bg-purple-500/15" />
                  </>
                )}
                {/* Processing rings */}
                {isProcessing && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400/40" />
                )}

                {/* Mic button */}
                <button
                  onClick={handleMicToggle}
                  disabled={isProcessing && !isSpeaking}
                  className={cn(
                    "relative w-20 h-20 rounded-full flex items-center justify-center transition-all",
                    isListening
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_40px_rgba(99,102,241,0.5)]"
                      : isSpeaking
                        ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-[0_0_40px_rgba(168,85,247,0.5)]"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10",
                    isProcessing && !isSpeaking && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isProcessing && !isSpeaking ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : isListening ? (
                    <Mic className="w-7 h-7" />
                  ) : isSpeaking ? (
                    <Mic className="w-7 h-7" />
                  ) : (
                    <Mic className="w-7 h-7" />
                  )}
                </button>
              </div>

              {/* Hint */}
              <p className="text-[11px] text-slate-500 text-center max-w-xs">
                {isSpeaking
                  ? "💡 Tap mic to interrupt and speak — just like a real conversation"
                  : "Tap mic to start • Speak naturally • AI responds out loud"}
              </p>

              {/* End call button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="gap-2 rounded-full border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400"
              >
                <PhoneOff className="w-4 h-4" />
                End call
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiveVoiceMode;
