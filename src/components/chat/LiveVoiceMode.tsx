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
 *  3. LiveAvatar — a living animated presence: breathing, blinking eyes,
 *     mic/TTS-amplitude-driven morphing, phase-colored aura, orbital motes.
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
import { Mic, PhoneOff, Loader2, Sparkles, X, Settings2, Keyboard } from "lucide-react";
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-[#05070d] text-slate-100 overflow-hidden"
        >
          {/* Ambient field */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(76,29,149,0.16),transparent_60%)]" />
            <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.07),transparent_65%)]" />
          </div>

          {/* Top bar */}
          <div className="relative flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 rounded-full px-2.5 py-1">
                <span className={cn("w-1.5 h-1.5 rounded-full bg-cyan-400", (isListening || isSpeaking) && "animate-pulse")} />
                LIVE
              </span>
              <p className="text-sm text-slate-300 max-w-[52vw] sm:max-w-none truncate">{statusText}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasEleven && (
                <span className="hidden sm:inline text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20">
                  HD VOICE
                </span>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Voice settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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

          {/* Stage: avatar + captions */}
          <div className="relative flex-1 flex flex-col items-center justify-center gap-5 px-5 min-h-0">
            <div className="relative">
              <LiveAvatar phase={phase} getLevel={getAvatarLevel} size={typeof window !== "undefined" && window.innerWidth < 420 ? 260 : 320} />
            </div>

            {/* Captions */}
            <div className="w-full max-w-lg min-h-[76px] flex flex-col items-center justify-center text-center">
              {currentTranscript ? (
                <motion.p key={currentTranscript.length} initial={{ opacity: 0.75 }} animate={{ opacity: 1 }}
                  className="text-base text-slate-300 italic">
                  “{currentTranscript}”
                </motion.p>
              ) : liveCaption ? (
                <motion.p key={liveCaption} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-lg sm:text-xl font-medium leading-snug text-white/95">
                  {liveCaption}
                </motion.p>
              ) : !isProcessing && messages.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Sparkles className="w-6 h-6 text-purple-400/40" />
                  <p className="text-sm text-slate-400">This is a live conversation.</p>
                  <p className="text-xs text-slate-500">
                    Just talk — and talk over me anytime to interrupt.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Recent transcript */}
          {(messages.length > 0 || error) && (
            <div ref={scrollRef} className="relative max-h-24 overflow-y-auto px-5 pb-2 space-y-1.5">
              {error && (
                <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>
              )}
              {messages.slice(-6).map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={cn(
                    "max-w-[80%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed",
                    msg.role === "user"
                      ? "ios-glass-bubble-user text-white/90"
                      : "ios-glass-bubble-ai text-slate-300/90"
                  )}>
                    {msg.content}
                  </div>
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
                      className="bg-black/30 border-white/10 text-sm text-white rounded-full"
                    />
                    <Button size="sm" onClick={handleTextSubmit} className="rounded-full ios-glass-button-accent text-white px-4">
                      Send
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setKeyboardOpen(!keyboardOpen)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border transition-colors",
                  keyboardOpen
                    ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                )}
                aria-label="Type a message"
              >
                <Keyboard className="w-5 h-5" />
              </button>

              <button
                onClick={handleMicToggle}
                disabled={isProcessing && !isSpeaking}
                className={cn(
                  "relative w-[76px] h-[76px] rounded-full flex items-center justify-center transition-all",
                  isListening
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_50px_rgba(99,102,241,0.55)]"
                    : isSpeaking
                      ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-[0_0_50px_rgba(168,85,247,0.55)]"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10",
                  isProcessing && !isSpeaking && "opacity-50 cursor-not-allowed"
                )}
                aria-label={isListening ? "Stop talking" : "Start talking"}
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

              <Button
                variant="outline"
                size="icon"
                onClick={handleClose}
                className="w-12 h-12 rounded-full border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400"
                aria-label="End conversation"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-500">
              {isSpeaking
                ? "Interrupt me anytime — just start talking"
                : "Speak naturally • sentences stream in as I think"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiveVoiceMode;
