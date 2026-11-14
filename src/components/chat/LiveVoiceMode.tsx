/**
 * LiveVoiceMode — Immersive live voice conversation. Redesigned to feel like
 * talking to a presence, not operating a robot.
 *
 * What changed vs the old modal (the "robot feel" fixes):
 *  1. Streaming speech pipeline — the AI's response is spoken sentence by
 *     sentence as it streams from the LLM (onDelta), so the first words come
 *     out in ~1s instead of after the whole response is generated.
 *  2. Hands-free auto barge-in — the mic keeps metering while the AI speaks;
 *     sustained human speech (echo-cancelled) interrupts it, exactly like
 *     ChatGPT Advanced Voice / Gemini Live. Manual tap-to-interrupt still works.
 *  3. LiveAvatar — "Obsidian Core": a perfect rim-lit ink sphere (Monolith
 *     design language, ShadowTalk brand cyan). No eyes, no cartoon blob.
 *  4. Speech rhythm engine — punctuation-aware pauses, emoji/markdown
 *     stripped before TTS, natural cadence instead of a flat wall of text.
 *  5. Captions — the sentence being spoken appears live under the avatar.
 *
 * Preserved from the previous version: BYOK AI flow + cloud fallback,
 * ElevenLabs voices + settings panel + browser-TTS fallback, offline
 * fallback responses, mic toggle semantics, abortable playback.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, PhoneOff, Loader2, X, Settings2, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMicLevel } from "@/hooks/useMicLevel";
import { LiveAvatar, type LiveAvatarPhase } from "./LiveAvatar";
import { useAIKeyContext } from "@/contexts/AIKeyContext";
import { streamCloudChat, type CloudChatMessage } from "@/lib/cloudChat";
import { getByokConfig, streamByokChat } from "@/lib/byok";
import { buildChatSystemPrompt } from "@/lib/shadowTalkPersona";
import { splitIntoSpeechChunks, extractStreamingChunks, type SpeechChunk } from "@/lib/speechChunking";
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
  const [liveCaption, setLiveCaption] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [elevenLabsKeyInput, setElevenLabsKeyInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [hasEleven, setHasEleven] = useState(hasElevenLabsKey());

  const mic = useMicLevel();

  const recognitionRef = useRef<any>(null);
  const conversationRef = useRef<VoiceMessage[]>([]);
  const shouldContinueRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const ttsAbortRef = useRef<AbortController | null>(null);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isListeningRef = useRef(false);

  // Streaming speech pipeline
  const sessionRef = useRef(0); // bumped on barge-in/close — invalidates stale async work
  const speakQueueRef = useRef<SpeechChunk[]>([]);
  const turnAbortRef = useRef<AbortController | null>(null);
  const streamDoneRef = useRef(true);
  const consumedIdxRef = useRef(0);
  const fullTextRef = useRef("");

  // TTS amplitude + auto barge-in detection
  const ttsCtxRef = useRef<AudioContext | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsLevelRef = useRef(0);
  const browserPulseRef = useRef(0);
  const ttsStartAtRef = useRef(0);
  const bargeCooldownRef = useRef(0);
  const loudMsRef = useRef(0);
  const liveFrameRef = useRef<number | null>(null);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  const phase: LiveAvatarPhase = isSpeaking ? "speaking" : isProcessing ? "thinking" : isListening ? "listening" : "idle";

  /** Loudness for the avatar — real TTS amplitude while speaking, mic while listening. */
  const getAvatarLevel = useCallback(() => {
    if (isSpeakingRef.current) return Math.max(ttsLevelRef.current, browserPulseRef.current);
    if (isListeningRef.current) return mic.getLevel();
    return 0;
  }, [mic]);

  // One shared animation-frame loop: TTS level decay + hands-free barge-in.
  useEffect(() => {
    if (!open) return;
    let last = performance.now();
    const analyserBuf = new Float32Array(1024);
    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      // TTS amplitude from the analyser attached to the playing audio element.
      const analyser = ttsAnalyserRef.current;
      const audio = ttsAudioRef.current;
      if (analyser && audio && !audio.paused) {
        analyser.getFloatTimeDomainData(analyserBuf as any);
        let sum = 0;
        for (let i = 0; i < analyserBuf.length; i++) sum += analyserBuf[i] * analyserBuf[i];
        ttsLevelRef.current = Math.min(1, Math.sqrt(sum / analyserBuf.length) * 3.4);
      } else {
        ttsLevelRef.current = Math.max(0, ttsLevelRef.current - dt * 0.004);
      }
      browserPulseRef.current = Math.max(0, browserPulseRef.current - dt * 0.005);

      // Hands-free barge-in: sustained mic loudness while the AI speaks.
      if (isSpeakingRef.current && mic.isActive()) {
        const sinceStart = now - ttsStartAtRef.current;
        const lvl = mic.getLevel();
        if (sinceStart > 700 && lvl > 0.5) {
          loudMsRef.current += dt;
        } else {
          loudMsRef.current = Math.max(0, loudMsRef.current - dt * 1.6);
        }
        if (loudMsRef.current > 280 && now - bargeCooldownRef.current > 1600) {
          bargeCooldownRef.current = now;
          loudMsRef.current = 0;
          bargeIn(true);
        }
      }
      liveFrameRef.current = requestAnimationFrame(tick);
    };
    liveFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (liveFrameRef.current !== null) cancelAnimationFrame(liveFrameRef.current);
      liveFrameRef.current = null;
    };
  }, [open, mic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, currentTranscript]);

  // Init ElevenLabs key from storage + start mic metering
  useEffect(() => {
    if (open) {
      setHasEleven(hasElevenLabsKey());
      setElevenLabsKeyInput(getElevenLabsKey() || "");
      void mic.start(); // visualizer + hands-free barge-in (echo-cancelled)
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      sessionRef.current++;
      stopListening();
      if (turnAbortRef.current) { turnAbortRef.current.abort(); turnAbortRef.current = null; }
      if (ttsAbortRef.current) { ttsAbortRef.current.abort(); ttsAbortRef.current = null; }
      stopAllTTS();
      speakQueueRef.current = [];
      shouldContinueRef.current = false;
      setIsSpeaking(false);
      setLiveCaption(null);
      mic.stop();
      ttsAnalyserRef.current = null;
      ttsAudioRef.current = null;
      try { ttsCtxRef.current?.close(); } catch { /* already closed */ }
      ttsCtxRef.current = null;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  /** Attach a WebAudio analyser to the playing TTS element (real amplitude). */
  const attachTtsAnalyser = useCallback((audio: HTMLAudioElement) => {
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ttsCtxRef.current) ttsCtxRef.current = new Ctor();
      const ctx = ttsCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyser.connect(ctx.destination); // keep the audio audible
      ttsAnalyserRef.current = analyser;
      ttsAudioRef.current = audio;
      audio.addEventListener("ended", () => { ttsAudioRef.current = null; });
    } catch {
      // Analyser is a visual nicety — playback still works without it.
    }
  }, []);

  // Hands-free or manual interrupt: stop AI, take the floor.
  const bargeIn = useCallback((auto = false) => {
    sessionRef.current++; // invalidate any in-flight stream + queued chunks
    speakQueueRef.current = [];
    streamDoneRef.current = true;
    if (ttsAbortRef.current) { ttsAbortRef.current.abort(); ttsAbortRef.current = null; }
    stopAllTTS();
    ttsLevelRef.current = 0;
    browserPulseRef.current = 0;
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setLiveCaption(null);
    if (turnAbortRef.current) { turnAbortRef.current.abort(); turnAbortRef.current = null; }
    if (isProcessingRef.current) {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
    if (auto && navigator.vibrate) { try { navigator.vibrate(18); } catch { /* optional */ } }
    setTimeout(() => startListeningRef.current(), 120);
  }, []);

  // Resume listening after a turn fully finishes.
  const finishTurn = useCallback(() => {
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setLiveCaption(null);
    if (shouldContinueRef.current && open) {
      setTimeout(() => {
        if (shouldContinueRef.current && open && !isProcessingRef.current && !isSpeakingRef.current) {
          startListeningRef.current();
        }
      }, 320);
    }
  }, [open]);

  const speakNextChunk = useCallback((session: number) => {
    if (session !== sessionRef.current) return;
    if (isSpeakingRef.current) return;
    const chunk = speakQueueRef.current.shift();
    if (!chunk) {
      if (streamDoneRef.current) finishTurn();
      return;
    }
    setLiveCaption(chunk.text);
    const controller = new AbortController();
    ttsAbortRef.current = controller;
    speakWithElevenLabs(chunk.text, {
      voiceId: selectedVoice,
      signal: controller.signal,
      onAudioEl: attachTtsAnalyser,
      onBoundary: () => { browserPulseRef.current = 1; },
      onStart: () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        ttsStartAtRef.current = performance.now();
      },
      onEnd: () => {
        if (ttsAbortRef.current === controller) ttsAbortRef.current = null;
        if (session !== sessionRef.current) return; // barge-in superseded this turn
        if (speakQueueRef.current.length > 0) {
          setTimeout(() => speakNextChunk(session), chunk.pauseAfterMs);
        } else if (streamDoneRef.current) {
          finishTurn();
        }
        // else: stream still generating — next onDelta will pump the queue.
      },
      onError: (err) => {
        console.warn("[VoiceMode] TTS error:", err);
        if (session !== sessionRef.current) return;
        if (speakQueueRef.current.length > 0) {
          setTimeout(() => speakNextChunk(session), 150);
        } else {
          finishTurn();
        }
      },
    });
  }, [selectedVoice, attachTtsAnalyser, finishTurn]);

  // Send to AI — streaming speech pipeline
  const sendToAI = useCallback(async (userText: string) => {
    const session = ++sessionRef.current;
    streamDoneRef.current = false;
    setIsProcessing(true);
    isProcessingRef.current = true;
    setError(null);

    const userMsg: VoiceMessage = { role: "user", content: userText, timestamp: Date.now() };
    const newConv = [...conversationRef.current, userMsg];
    conversationRef.current = newConv;
    setMessages(newConv);

    turnAbortRef.current = new AbortController();
    consumedIdxRef.current = 0;
    fullTextRef.current = "";

    // Speak each completed sentence as it streams in.
    const onDelta = (acc: string) => {
      if (session !== sessionRef.current) return;
      fullTextRef.current = acc;
      const { chunks, newConsumed } = extractStreamingChunks(acc, consumedIdxRef.current);
      if (chunks.length) {
        consumedIdxRef.current = newConsumed;
        speakQueueRef.current.push(...chunks);
        speakNextChunk(session);
      }
    };

    try {
      const chatMessages: CloudChatMessage[] = [
        {
          role: "system",
          content: buildChatSystemPrompt({ personality }) +
            "\n\n## Voice Mode Rules (CRITICAL)\nYou are in LIVE VOICE conversation mode.\n- Keep responses SHORT: 1-3 sentences max. Never more than 4.\n- Be WARM and CASUAL — like talking to a smart friend. Use contractions (I'm, don't, that's).\n- NO markdown, NO headers, NO bullet points, NO code blocks, NO emoji (this is spoken aloud).\n- Vary your rhythm: mix short and medium sentences. One idea per sentence.\n- React first, then speak — acknowledge what you heard ('oh nice', 'hmm', 'no way') before answering.\n- Be natural and conversational — laugh, ask follow-up questions, show personality.\n- If the user says something short like 'yeah' or 'ok', respond briefly and keep the flow.\n- Match the user's energy — if they're excited, be excited. If they're calm, be calm.\n- NEVER start with 'Sure!' or 'Here's...' or 'Let me...'. Just respond naturally.",
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
        const byokConfig = getByokConfig();
        if (byokConfig?.apiKey) {
          const result = await streamByokChat(byokConfig, chatMessages, {
            temperature: 0.8,
            signal: turnAbortRef.current?.signal,
            onDelta,
          });
          responseText = result.content || "";
          if (!responseText && result.error) aiFailed = true;
        } else {
          const result = await streamCloudChat(chatMessages, {
            temperature: 0.8,
            signal: turnAbortRef.current?.signal,
            onDelta,
          });
          responseText = result.content || "";
          if (!responseText && result.error) aiFailed = true;
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // Barge-in cancelled this turn — commit whatever was already said.
          const partial = fullTextRef.current.trim();
          if (partial) {
            const aiMsg: VoiceMessage = { role: "assistant", content: partial, timestamp: Date.now() };
            conversationRef.current = [...conversationRef.current, aiMsg];
            setMessages(conversationRef.current);
          }
          return;
        }
        console.warn("[VoiceMode] AI failed:", err?.message);
        aiFailed = true;
      }

      if (!responseText) {
        responseText = getFallbackResponse(userText);
      }

      const aiMsg: VoiceMessage = { role: "assistant", content: responseText, timestamp: Date.now() };
      conversationRef.current = [...conversationRef.current, aiMsg];
      setMessages(conversationRef.current);

      // Flush the stream tail (text after the last complete sentence).
      // Non-streaming paths never call onDelta, so the full response becomes
      // the source and is spoken as one chunked block.
      const source = fullTextRef.current || responseText;
      const tail = source.slice(consumedIdxRef.current).trim();
      if (tail) {
        speakQueueRef.current.push(...splitIntoSpeechChunks(tail, true));
      }
      streamDoneRef.current = true;
      speakNextChunk(session);

      if (aiFailed) {
        toast({ title: "Connection issue", description: "Using offline fallback responses." });
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      turnAbortRef.current = null;
    }
  }, [userCohort, userApiKey, personality, speakNextChunk, toast]);

  // Start listening
  const startListening = useCallback(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      toast({ title: "Not supported", description: "Voice mode needs Chrome, Edge, or Safari.", variant: "destructive" });
      return;
    }

    // If the AI is speaking, take the floor immediately (manual barge-in).
    if (isSpeakingRef.current) {
      bargeIn(false);
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
      isListeningRef.current = true;
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
      isListeningRef.current = false;
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
      isListeningRef.current = false;
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
      shouldContinueRef.current = false;
      stopListening();
    } else {
      shouldContinueRef.current = true;
      startListening();
    }
  };

  // Keyboard turn
  const handleTextSubmit = () => {
    const text = textDraft.trim();
    if (!text) return;
    setTextDraft("");
    void sendToAI(text);
  };

  // Close
  const handleClose = () => {
    sessionRef.current++;
    shouldContinueRef.current = false;
    stopListening();
    if (turnAbortRef.current) { turnAbortRef.current.abort(); turnAbortRef.current = null; }
    if (ttsAbortRef.current) { ttsAbortRef.current.abort(); ttsAbortRef.current = null; }
    stopAllTTS();
    speakQueueRef.current = [];
    setMessages([]);
    conversationRef.current = [];
    setCurrentTranscript("");
    setLiveCaption(null);
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

  // Editorial status word center-stage (Monolith).
  const phaseWord =
    isSpeaking ? "Speaking." : isListening ? "Listening." : isProcessing ? "Thinking." : "ShadowTalk";

  const statusHint = isSpeaking
    ? "Just talk over me to interrupt"
    : isListening
      ? "Speak naturally — I am listening"
      : isProcessing
        ? "Gathering my thoughts"
        : messages.length === 0
          ? "Tap the mic and just start talking"
          : "Tap to continue";

  // Kept for assistive tech (announced politely, invisible on stage).
  const statusText =
    isSpeaking ? "Speaking — just talk to interrupt"
    : isListening ? "Listening…"
    : isProcessing ? "Thinking…"
    : messages.length === 0 ? "Tap the mic and just start talking"
    : "Tap to continue";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex flex-col bg-[hsl(240_12%_3%)] text-slate-100 overflow-hidden"
        >
          {/* Monolith stage: one faint spotlight, vignette, film grain */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[150vmin] h-[150vmin] bg-[radial-gradient(circle,hsl(195_100%_55%/0.05),transparent_62%)]" />
            <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_58%,rgba(0,0,0,0.55)_100%)]" />
            <div
              className="absolute inset-0 opacity-[0.045]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")",
              }}
            />
          </div>

          <p className="sr-only" role="status">{statusText}</p>

          {/* Top bar */}
          <div className="relative flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
            <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-white/55 border border-white/12 rounded-full px-3 py-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_hsl(195_100%_55%/0.9)]",
                  (isListening || isSpeaking) && "animate-pulse",
                )}
              />
              Live
            </span>
            {hasEleven && (
              <span className="hidden sm:inline text-[9px] font-mono uppercase tracking-[0.22em] text-white/35 border border-white/10 rounded-full px-2.5 py-1">
                HD Voice
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/85 border border-transparent hover:border-white/12 transition-colors"
                aria-label="Voice settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/85 border border-transparent hover:border-white/12 transition-colors"
                aria-label="Close live mode"
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
                className="relative overflow-hidden border-b border-white/[0.06]"
              >
                <div className="px-5 py-4 space-y-3 max-w-md mx-auto">
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">ElevenLabs API Key (optional)</label>
                    <Input
                      type="password"
                      value={elevenLabsKeyInput}
                      onChange={(e) => setElevenLabsKeyInput(e.target.value)}
                      placeholder="sk_... (get free at elevenlabs.io)"
                      className="mt-1.5 bg-white/[0.04] border-white/12 text-sm text-white"
                    />
                    <p className="text-[10px] text-white/30 mt-1">
                      Premium HD voices. Without a key, browser TTS is used (lower quality).
                    </p>
                  </div>
                  {hasEleven && (
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Voice</label>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="mt-1.5 w-full bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-sm text-white"
                      >
                        {VOICE_OPTIONS.map(v => (
                          <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button onClick={handleSaveKey} size="sm" variant="outline" className="w-full border-white/20 bg-white/[0.04] text-white/85 hover:bg-white/[0.08] hover:text-white">
                    Save Voice Settings
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stage: obsidian core + editorial status word + captions */}
          <div className="relative flex-1 flex flex-col items-center justify-center gap-2 px-5 min-h-0">
            <div className="relative">
              <LiveAvatar phase={phase} getLevel={getAvatarLevel} size={typeof window !== "undefined" && window.innerWidth < 420 ? 250 : 320} />
            </div>

            {/* Serif status word — the Monolith moment */}
            <div className="h-16 flex items-start justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phaseWord}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className="font-serif italic text-2xl sm:text-3xl text-white/85 tracking-wide"
                >
                  {phaseWord}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 text-center">
              {statusHint}
            </p>

            {/* Captions between hairlines */}
            <div className="w-full max-w-xl flex flex-col items-center gap-3 mt-3">
              <div className="h-px w-14 bg-white/10" />
              <div className="min-h-[58px] flex flex-col items-center justify-center text-center">
                {currentTranscript ? (
                  <motion.p key={currentTranscript.length} initial={{ opacity: 0.7 }} animate={{ opacity: 1 }}
                    className="font-serif italic text-base sm:text-lg text-slate-400">
                    “{currentTranscript}”
                  </motion.p>
                ) : liveCaption ? (
                  <motion.p key={liveCaption} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="text-lg sm:text-2xl font-light leading-snug text-white/90">
                    {liveCaption}
                  </motion.p>
                ) : null}
              </div>
              <div className="h-px w-14 bg-white/10" />
            </div>
          </div>

          {/* Recent transcript — editorial log, no bubbles */}
          {(messages.length > 0 || error) && (
            <div ref={scrollRef} className="relative max-h-28 overflow-y-auto px-6 pb-2 space-y-2.5">
              {error && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-300/90 text-center py-1">{error}</p>
              )}
              {messages.slice(-6).map((msg, idx) => (
                <div key={idx} className="flex gap-3 items-baseline">
                  <span
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-[0.22em] w-16 shrink-0 text-right pt-0.5",
                      msg.role === "user" ? "text-cyan-200/45" : "text-violet-200/35",
                    )}
                  >
                    {msg.role === "user" ? "You" : "Shadow"}
                  </span>
                  <p className="text-[13px] leading-relaxed text-slate-300/80 min-w-0">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="relative px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2">
            {/* Keyboard input */}
            <AnimatePresence>
              {keyboardOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mb-3">
                    <Input
                      autoFocus
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
                      placeholder="Type instead of talking…"
                      className="bg-white/[0.04] border-white/12 text-sm text-white rounded-full"
                    />
                    <Button size="sm" onClick={handleTextSubmit} variant="outline" className="rounded-full border-white/20 bg-transparent text-white/80 hover:bg-white/[0.06] px-5">
                      Send
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-7">
              <button
                onClick={() => setKeyboardOpen(!keyboardOpen)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border transition-colors",
                  keyboardOpen
                    ? "bg-cyan-400/10 border-cyan-300/40 text-cyan-200"
                    : "bg-white/[0.03] border-white/12 text-white/45 hover:text-white/85 hover:border-white/25"
                )}
                aria-label="Type a message"
              >
                <Keyboard className="w-[18px] h-[18px]" />
              </button>

              <button
                onClick={handleMicToggle}
                disabled={isProcessing && !isSpeaking}
                className={cn(
                  "relative w-[72px] h-[72px] rounded-full flex items-center justify-center border transition-colors",
                  isListening
                    ? "bg-cyan-400/10 border-cyan-300/60 text-cyan-100 shadow-[0_0_48px_hsl(195_100%_55%/0.30),inset_0_0_18px_hsl(195_100%_55%/0.12)]"
                    : isSpeaking
                      ? "bg-white/[0.06] border-white/25 text-white"
                      : "bg-white/[0.03] border-white/15 text-white/60 hover:text-white/90 hover:border-white/30",
                  isProcessing && !isSpeaking && "opacity-40 cursor-not-allowed"
                )}
                aria-label={isListening ? "Stop talking" : "Start talking"}
              >
                {isProcessing && !isSpeaking ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Mic className="w-6 h-6" strokeWidth={1.5} />
                )}
              </button>

              <button
                onClick={handleClose}
                className="w-12 h-12 rounded-full flex items-center justify-center border border-red-400/20 bg-red-500/[0.05] text-red-300/70 hover:text-red-300 hover:border-red-400/40 transition-colors"
                aria-label="End conversation"
              >
                <PhoneOff className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiveVoiceMode;
