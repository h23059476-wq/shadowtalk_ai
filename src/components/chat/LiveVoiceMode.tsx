/**
 * LiveVoiceMode — ShadowTalk Live, Deep Cobalt redesign (WebGL fluid orb).
 *
 * Visual layer is an exact implementation of the approved reference design:
 * midnight-cobalt ambient field, procedural simplex-noise shader orb
 * (LiveOrb), User/Nyx speaking mode switcher, equalizer dock, status pill
 * with quiet caption, tactile control dock (camera / screen share / mic /
 * speaker / end) and a right-hand live transcript drawer with text fallback.
 *
 * Functional layer is the real streaming voice pipeline, preserved intact:
 *  1. Streaming speech — the AI response is spoken sentence by sentence as
 *     it streams from the LLM (onDelta), so first words come out in ~1s.
 *  2. Hands-free auto barge-in — the mic keeps metering while the AI speaks;
 *     sustained human speech (echo-cancelled) interrupts it. Manual
 *     tap-to-interrupt still works.
 *  3. Speech rhythm engine — punctuation-aware pauses, markdown/emoji
 *     stripped before TTS.
 *  4. Captions — the sentence being spoken appears live under the orb; the
 *     live STT draft appears while the user talks.
 *  5. Preserved: BYOK AI flow + cloud fallback, ElevenLabs voices + settings
 *     (persona pill dropdown) + browser-TTS fallback, offline fallback
 *     responses, abortable playback, real round-trip latency badge.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMicLevel } from "@/hooks/useMicLevel";
import { LiveOrb } from "./LiveOrb";
import "./live-voice.css";
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

function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const EQ_BAR_COUNT = 18;

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
  const [isMuted, setIsMuted] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [liveCaption, setLiveCaption] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [elevenLabsKeyInput, setElevenLabsKeyInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [hasEleven, setHasEleven] = useState(hasElevenLabsKey());

  const mic = useMicLevel();

  const recognitionRef = useRef<any>(null);
  const conversationRef = useRef<VoiceMessage[]>([]);
  const shouldContinueRef = useRef(false);
  const drawerFeedRef = useRef<HTMLDivElement>(null);
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
  const turnStartAtRef = useRef(0); // sendToAI start → first audio out = real latency badge
  const firstAudioRef = useRef(true);
  const bargeCooldownRef = useRef(0);
  const loudMsRef = useRef(0);
  const liveFrameRef = useRef<number | null>(null);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  /** Live audio amplitude — real TTS while speaking, mic while listening. */
  const getOrbLevel = useCallback(() => {
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

  // Auto-scroll transcript drawer
  useEffect(() => {
    if (drawerFeedRef.current) drawerFeedRef.current.scrollTop = drawerFeedRef.current.scrollHeight;
  }, [messages, liveCaption, showTranscript]);

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
      setIsMuted(false);
      setLiveCaption(null);
      setLatencyMs(null);
      setShowTranscript(false);
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
        // Real round-trip latency: question sent → first audio out.
        if (firstAudioRef.current) {
          firstAudioRef.current = false;
          setLatencyMs(Math.round(performance.now() - turnStartAtRef.current));
        }
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
    firstAudioRef.current = true;
    turnStartAtRef.current = performance.now();
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
      setIsMuted(false);
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
        setIsMuted(true);
      } else if (event.error === "no-speech") {
        if (shouldContinueRef.current && open) setTimeout(() => startListening(), 500);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* already started */ }
  }, [open, sendToAI, stopListening, bargeIn, toast]);

  // Keep ref in sync
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  // Mic button — prototype mute semantics on top of the real pipeline:
  // listening → mute (stop); muted → unmute + resume; AI speaking → barge-in.
  const handleMicToggle = () => {
    if (isListening) {
      shouldContinueRef.current = false;
      stopListening();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      shouldContinueRef.current = true;
      startListening();
    }
  };

  // Keyboard turn from the transcript drawer
  const handleTextSubmit = () => {
    const text = textDraft.trim();
    if (!text) return;
    setTextDraft("");
    setIsMuted(false);
    void sendToAI(text);
  };

  // Speaker button: silence the AI immediately (real output kill-switch).
  const handleSpeakerToggle = () => {
    if (isSpeakingRef.current || isProcessingRef.current) {
      bargeIn(false);
      shouldContinueRef.current = false;
    }
  };

  // Fullscreen toggle
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Clear the visible transcript log (session keeps running).
  const handleClearTranscript = () => {
    setMessages([]);
    conversationRef.current = [];
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

  // ---- Derived presentation state (design tokens ↔ real pipeline) ----
  const nyxActive = isSpeaking || isProcessing;
  const voiceName = VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name ?? "Nyx";

  const statusLabel = isMuted
    ? "Microphone Muted"
    : isSpeaking
      ? "✦ Nyx is speaking · Spatial Voice Engine"
      : isProcessing
        ? "✦ Nyx is responding · Streaming answer…"
        : isListening
          ? "● Listening to you · Speak freely..."
          : messages.length === 0
            ? "● Tap the mic and just start talking"
            : "● Ready · Tap the mic to continue";

  const idleCaption = messages.length === 0
    ? "I'm picking up your audio live. Speak naturally or ask anything."
    : "Tap the microphone to keep the conversation going.";

  const caption = isMuted
    ? "Tap the microphone icon to resume voice conversation."
    : currentTranscript
      ? currentTranscript
      : liveCaption
        ? liveCaption
        : !isProcessing && !isSpeaking
          ? idleCaption
          : null;

  const selectedUserBadge = isMuted ? "Muted" : "Listening";
  const nyxBadgeText = isSpeaking ? "Synthesizing voice" : "AI Responding";

  const eqBase = "w-1 rounded-full eq-bar shadow-[0_0_8px_rgba(61,209,250,0.7)]";
  const eqBarClass = (i: number) =>
    isSpeaking
      ? `${eqBase} bg-gradient-to-t from-indigo-500 via-blue-400 to-cyan-200 eq-ai-${(i % 4) + 1} shadow-[0_0_12px_rgba(61,209,250,0.9)]`
      : `${eqBase} bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-300 eq-user-${(i % 4) + 1}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="st-live fixed inset-0 z-[100] flex flex-col relative overflow-hidden bg-[#050b18] text-[#e4e8f7] font-body antialiased select-none"
        >
          {/* Celestial Deep Cobalt & Nebula Indigo Ambient Background Lighting */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(31,107,242,0.14)_0%,rgba(15,31,71,0.45)_50%,transparent_100%)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full bg-gradient-to-tr from-blue-700/[0.18] via-indigo-600/[0.15] to-cyan-400/[0.08] blur-[150px] opacity-75" />
            <div className="absolute -top-32 right-1/4 w-[600px] h-[500px] rounded-full bg-indigo-900/[0.22] blur-[140px] opacity-60" />
            <div className="absolute -bottom-36 left-1/3 w-[560px] h-[460px] rounded-full bg-cyan-600/[0.12] blur-[130px] opacity-50" />
          </div>

          {/* MINIMAL TOP BAR (Brand, Persona Voice Pill, Latency, Transcript, Fullscreen) */}
          <header className="relative z-30 w-full h-16 sm:h-20 px-6 sm:px-10 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-950/60 border border-cyan-400/30 backdrop-blur-md shadow-[0_0_15px_rgba(61,209,250,0.25)]">
                <span className={cn("w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(61,209,250,0.9)]", (isListening || isSpeaking) && "animate-pulse")} />
              </div>
              <span className="font-headline font-semibold text-lg tracking-tight text-white flex items-center gap-1.5">
                ShadowTalk
                <span className="text-cyan-300 text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-900/40 border border-cyan-500/30 tracking-wider shadow-[0_0_10px_rgba(61,209,250,0.25)]">LIVE</span>
              </span>
            </div>

            {/* Active Persona Voice Pill (opens voice settings) + latency badge */}
            <div className="relative flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="group hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/20 hover:border-cyan-400/40 backdrop-blur-xl transition-all text-sm font-medium text-white/90 shadow-[0_0_20px_rgba(31,107,242,0.15)]"
                title="Voice settings"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(61,209,250,0.8)]" />
                <span className="font-headline text-xs font-semibold tracking-wide text-cyan-200">Nyx</span>
                <span className="text-blue-300/40 text-xs">·</span>
                <span className="text-blue-200/70 text-xs font-normal">{hasEleven ? voiceName : "Browser Voice"}</span>
                <span className="material-symbols-outlined text-sm text-cyan-400/60 group-hover:text-cyan-300 transition-colors">expand_more</span>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/30 border border-blue-500/20 text-[11px] font-mono text-cyan-300/80 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(61,209,250,0.7)]" />
                <span>{latencyMs !== null ? `${latencyMs}ms` : "—ms"}</span>
              </div>

              {/* Voice settings dropdown */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-blue-500/25 bg-[#070e20]/95 backdrop-blur-2xl shadow-[0_0_40px_rgba(31,107,242,0.25)] z-50"
                  >
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="text-[11px] font-mono uppercase tracking-wider text-blue-300/70">ElevenLabs API Key (optional)</label>
                        <Input
                          type="password"
                          value={elevenLabsKeyInput}
                          onChange={(e) => setElevenLabsKeyInput(e.target.value)}
                          placeholder="sk_... (get free at elevenlabs.io)"
                          className="mt-1.5 bg-black/40 border-blue-500/20 text-sm text-white"
                        />
                        <p className="text-[10px] text-blue-300/50 mt-1">
                          Premium HD voices. Without a key, browser TTS is used.
                        </p>
                      </div>
                      {hasEleven && (
                        <div>
                          <label className="text-[11px] font-mono uppercase tracking-wider text-blue-300/70">Voice</label>
                          <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="mt-1.5 w-full bg-black/40 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-white"
                          >
                            {VOICE_OPTIONS.map(v => (
                              <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <Button onClick={handleSaveKey} size="sm" className="w-full rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white border-0">
                        Save Voice Settings
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Top Right: Transcript Drawer Toggle & Fullscreen */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/20 hover:border-cyan-400/40 text-blue-200/80 hover:text-cyan-200 transition-all backdrop-blur-xl shadow-sm"
                title="Toggle Transcript Drawer"
                aria-label="Toggle transcript drawer"
              >
                <span className="material-symbols-outlined text-[20px]">forum</span>
                {messages.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full ring-2 ring-[#050b18] shadow-[0_0_8px_rgba(61,209,250,0.9)]" />
                )}
              </button>
              <button
                onClick={handleFullscreen}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/20 hover:border-cyan-400/40 text-blue-200/80 hover:text-cyan-200 transition-all backdrop-blur-xl shadow-sm"
                title="Toggle Fullscreen"
                aria-label="Toggle fullscreen"
              >
                <span className="material-symbols-outlined text-[20px]">fullscreen</span>
              </button>
            </div>
          </header>

          {/* INTERACTIVE SPEECH MODE TOGGLE SWITCHER (User Speaking vs Nyx Speaking) */}
          <div className="relative z-30 flex items-center justify-center px-4 pt-1 pb-1">
            <div className="inline-flex p-1 rounded-full bg-blue-950/40 border border-blue-500/20 backdrop-blur-2xl shadow-[0_8px_32px_rgba(3,8,20,0.7)] transition-all">
              {/* User Speaking Segment */}
              <button
                onClick={() => {
                  if (isSpeaking) { bargeIn(false); return; }
                  if (isMuted || !isListening) { handleMicToggle(); }
                }}
                className={cn(
                  "relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 font-headline",
                  !nyxActive
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-[0_0_22px_rgba(31,107,242,0.55)] border border-cyan-300/30"
                    : "text-blue-200/60 hover:text-cyan-200",
                )}
                title="Switch to User Speaking Mode"
              >
                <span className={cn("w-2 h-2 rounded-full", !nyxActive ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-ping" : "bg-transparent hidden")} />
                <span className="material-symbols-outlined text-[17px] leading-none text-cyan-100">graphic_eq</span>
                <span className={cn(!nyxActive && "text-white font-semibold")}>User Speaking</span>
                <span className={cn(
                  "hidden md:inline-block font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold border",
                  !nyxActive
                    ? "bg-black/25 text-cyan-200 border-cyan-300/20"
                    : "bg-blue-900/30 text-blue-300/70 border-blue-500/20",
                )}>
                  {isMuted ? "Muted" : "Listening"}
                </span>
              </button>
              {/* Nyx Speaking Segment */}
              <button
                onClick={() => {
                  if (!nyxActive) {
                    // Honest state: there is nothing queued to speak yet.
                    setLiveCaption("Ask me something — I'll answer out loud.");
                  }
                }}
                className={cn(
                  "relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 font-headline",
                  nyxActive
                    ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-400 text-white shadow-[0_0_25px_rgba(61,209,250,0.55)] border border-cyan-300/40"
                    : "text-blue-200/60 hover:text-cyan-200",
                )}
                title="Nyx AI Speaking Mode"
              >
                <span className={cn("w-2 h-2 rounded-full", nyxActive ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-ping" : "bg-transparent hidden")} />
                <span className="material-symbols-outlined text-[17px] leading-none text-blue-400">auto_awesome</span>
                <span>Nyx Speaking</span>
                <span className={cn(
                  "hidden md:inline-block font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold border",
                  nyxActive
                    ? "bg-black/30 text-cyan-200 border-cyan-400/30"
                    : "bg-blue-900/30 text-blue-300/70 border-blue-500/20",
                )}>
                  {nyxBadgeText}
                </span>
              </button>
            </div>
          </div>

          {/* MAIN VOICE STAGE (Procedural Deep Cobalt WebGL Voice Orb) */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-2 min-h-0">
            <div className="relative flex flex-col items-center justify-center w-full max-w-2xl">
              {/* Fluid WebGL Voice Orb Stage Container */}
              <div
                className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] md:w-[480px] md:h-[480px] flex items-center justify-center cursor-pointer group"
                onClick={handleMicToggle}
                title="Tap to toggle speaking modes"
                role="button"
                aria-label={isMuted || !isListening ? "Start talking" : "Mute microphone"}
              >
                {/* Outer Acoustic Pulse Rings with Cobalt/Cyan Glow */}
                <div className="acoustic-pulse-ring absolute inset-2 rounded-full border border-cyan-400/20 pointer-events-none shadow-[0_0_20px_rgba(61,209,250,0.1)]" />
                <div className="acoustic-pulse-ring-delayed absolute inset-2 rounded-full border border-blue-500/20 pointer-events-none" />
                <div className="wave-ring absolute inset-6 sm:inset-4 rounded-full border border-cyan-400/25 pointer-events-none shadow-[0_0_30px_rgba(31,107,242,0.2)]" />
                <div className="wave-ring-delayed absolute inset-6 sm:inset-4 rounded-full border border-blue-500/30 pointer-events-none shadow-[0_0_25px_rgba(59,130,246,0.15)]" />
                {/* Ambient Volumetric Nebula Glow */}
                <div
                  className={cn(
                    "absolute inset-8 sm:inset-10 rounded-full animate-glow-pulse pointer-events-none blur-3xl transition-all duration-500",
                    nyxActive
                      ? "bg-gradient-to-tr from-blue-500/[0.3] via-indigo-600/[0.25] to-cyan-400/[0.28] scale-105"
                      : "bg-gradient-to-tr from-blue-600/[0.22] via-indigo-600/[0.18] to-cyan-400/[0.2]",
                  )}
                />
                <div className="absolute inset-14 sm:inset-16 bg-gradient-to-br from-indigo-700/[0.2] via-blue-500/[0.15] to-cyan-300/[0.12] rounded-full blur-2xl opacity-70 pointer-events-none" />
                {/* Procedural Deep Cobalt WebGL Shader Orb */}
                <div className="relative z-20 w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-[1.02]">
                  <LiveOrb getLevel={getOrbLevel} />
                </div>

                {/* Floating Audio Visualizer Dock with Cobalt-to-Cyan Gradient Equalizer */}
                <div className="absolute z-30 bottom-8 inset-x-12 sm:inset-x-20 flex items-center justify-center gap-1 sm:gap-1.5 h-16 pointer-events-none">
                  <div className={cn(
                    "flex items-center gap-1 sm:gap-1.5 h-full px-5 py-2.5 rounded-full backdrop-blur-2xl transition-all duration-300",
                    isSpeaking
                      ? "bg-slate-950/85 border border-cyan-400/45 shadow-[0_0_45px_rgba(61,209,250,0.35)]"
                      : "bg-slate-950/75 border border-cyan-500/30 shadow-[0_0_35px_rgba(31,107,242,0.35)]",
                  )}>
                    {Array.from({ length: EQ_BAR_COUNT }).map((_, i) => (
                      <span key={i} className={eqBarClass(i)} style={{ height: [12, 18, 24, 32, 20, 36, 42, 28, 38, 26, 34, 18, 10, 24, 34, 18, 10, 22][i] }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* State Indicator & Live Caption */}
              <div className="flex flex-col items-center gap-2 mt-3 text-center max-w-lg px-4">
                {/* Status Pill */}
                <div className={cn(
                  "flex items-center gap-2 px-3.5 py-1 rounded-full backdrop-blur-md transition-all duration-300",
                  isMuted
                    ? "bg-[#2a0a0e]/60 border border-[#ffb4ab]/30 shadow-[0_0_20px_rgba(255,180,171,0.2)]"
                    : "bg-blue-950/60 border border-cyan-400/30 shadow-[0_0_20px_rgba(31,107,242,0.25)]",
                )}>
                  <span className={cn(
                    "rounded-full",
                    isMuted
                      ? "w-1.5 h-1.5 bg-[#ffb4ab]"
                      : isSpeaking
                        ? "w-2 h-2 bg-cyan-300 shadow-[0_0_12px_rgba(61,209,250,1)] animate-ping"
                        : "w-2 h-2 bg-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.8)] animate-pulse",
                  )} />
                  <span className={cn(
                    "font-mono text-xs uppercase tracking-widest font-medium",
                    isMuted ? "text-[#ffb4ab]" : isSpeaking ? "text-cyan-300" : "text-cyan-200",
                  )}>
                    {statusLabel}
                  </span>
                  <div className="flex items-center gap-0.5 h-3 px-1.5 py-0.5 rounded-full bg-blue-900/40 ml-1 border border-cyan-500/20">
                    <span className="w-0.5 h-1.5 bg-cyan-300 rounded-full eq-user-1" />
                    <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full eq-user-2" />
                    <span className="w-0.5 h-3 bg-cyan-300 rounded-full eq-user-3" />
                    <span className="w-0.5 h-1.5 bg-blue-400 rounded-full eq-user-4" />
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-[#ffb4ab] font-mono tracking-wide">{error}</p>
                )}
                {/* Quiet Dynamic Caption / Active Thought */}
                <p className="font-body text-base sm:text-lg text-blue-100/80 font-normal leading-relaxed transition-all duration-300 min-h-[3.2rem] flex items-center justify-center text-center">
                  {caption ? (currentTranscript ? `"${caption}"` : caption) : ""}
                </p>
              </div>
            </div>
          </main>

          {/* MINIMAL TACTILE CONTROL DOCK */}
          <footer className="relative z-30 pt-2 flex items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),1.75rem)]">
            <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-full bg-slate-950/70 border border-blue-500/25 backdrop-blur-2xl shadow-[0_16px_45px_rgba(2,5,15,0.85)]">
              {/* Multimodal Vision / Camera Toggle */}
              <button
                onClick={() => toast({ title: "Camera vision", description: "Camera sharing isn't wired into live mode yet." })}
                className="group flex items-center justify-center w-12 h-12 rounded-full bg-blue-950/40 hover:bg-blue-900/50 text-blue-200/70 hover:text-cyan-200 transition-all border border-blue-500/15"
                title="Share Camera / Vision"
                aria-label="Share camera"
              >
                <span className="material-symbols-outlined text-[22px]">videocam</span>
              </button>
              {/* Screen Share Toggle */}
              <button
                onClick={() => toast({ title: "Screen share", description: "Screen sharing isn't wired into live mode yet." })}
                className="group hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-blue-950/40 hover:bg-blue-900/50 text-blue-200/70 hover:text-cyan-200 transition-all border border-blue-500/15"
                title="Share Screen"
                aria-label="Share screen"
              >
                <span className="material-symbols-outlined text-[22px]">screen_share</span>
              </button>
              {/* Center Primary Mic Toggle (Hero Tactile Pill with Cobalt & Cyan Accent) */}
              <button
                onClick={handleMicToggle}
                disabled={isProcessing && !isSpeaking}
                className={cn(
                  "relative flex items-center justify-center w-16 h-16 rounded-full text-white active:scale-95 transition-all duration-300",
                  isProcessing && !isSpeaking && "opacity-50 cursor-not-allowed",
                  isMuted
                    ? "bg-[#93000a] shadow-[0_0_25px_rgba(255,180,171,0.4)] border border-[#ffb4ab]/30"
                    : isListening
                      ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 hover:brightness-110 shadow-[0_0_35px_rgba(31,107,242,0.65)] hover:shadow-[0_0_50px_rgba(61,209,250,0.8)] border border-cyan-200/40 ring-2 ring-cyan-400/30"
                      : isSpeaking
                        ? "bg-blue-900/60 text-white/90 hover:brightness-110 shadow-[0_0_20px_rgba(31,107,242,0.3)] border border-blue-500/30"
                        : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 hover:brightness-110 shadow-[0_0_35px_rgba(31,107,242,0.65)] hover:shadow-[0_0_50px_rgba(61,209,250,0.8)] border border-cyan-200/40",
                )}
                title="Mute / Unmute Microphone"
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="material-symbols-outlined text-[26px] drop-shadow-sm">{isMuted ? "mic_off" : "mic"}</span>
                  {!isMuted && (
                    <div className="flex items-center gap-0.5 h-2">
                      <span className="w-0.5 h-1 bg-white rounded-full eq-user-1" />
                      <span className="w-0.5 h-2 bg-white rounded-full eq-user-2" />
                      <span className="w-0.5 h-1.5 bg-white rounded-full eq-user-3" />
                      <span className="w-0.5 h-1 bg-white rounded-full eq-user-4" />
                    </div>
                  )}
                </div>
                <span className={cn(
                  "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950",
                  isMuted ? "bg-[#ffb4ab]" : "bg-cyan-300 shadow-[0_0_8px_rgba(61,209,250,0.9)]",
                )} />
              </button>
              {/* Audio Output / Speaker (tap to silence the AI) */}
              <button
                onClick={handleSpeakerToggle}
                className="group relative flex items-center justify-center w-12 h-12 rounded-full transition-all border bg-blue-950/40 hover:bg-blue-900/50 text-blue-200/70 hover:text-cyan-200 border-blue-500/15"
                title="Speaker Output — tap to silence"
                aria-label="Speaker output"
              >
                <span className="material-symbols-outlined text-[22px]">volume_up</span>
                {isSpeaking && <span className="hidden absolute inset-0 rounded-full border border-cyan-400/60 animate-ping pointer-events-none" />}
              </button>
              {/* Close / End Session Pill Button */}
              <button
                onClick={() => {
                  if (window.confirm("Disconnect live session?")) handleClose();
                }}
                className="group flex items-center justify-center w-12 h-12 rounded-full bg-[#93000a]/30 hover:bg-[#93000a] text-[#ffb4ab] hover:text-white transition-all border border-[#ffb4ab]/25 shadow-sm"
                title="End Live Session"
                aria-label="End live session"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
          </footer>

          {/* MINIMAL TRANSCRIPT DRAWER / SLIDE-OVER */}
          <aside
            className={cn(
              "fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[#070e20]/95 backdrop-blur-2xl border-l border-blue-500/20 shadow-[0_0_60px_rgba(2,5,15,0.9)] z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
              showTranscript ? "translate-x-0" : "translate-x-full",
            )}
            aria-hidden={!showTranscript}
          >
            {/* Drawer Header */}
            <div className="h-20 px-6 border-b border-blue-500/15 flex items-center justify-between pt-[max(env(safe-area-inset-top),0px)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-300 text-[20px]">chat_bubble_outline</span>
                <span className="font-headline font-semibold text-sm text-white">Live Transcript</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearTranscript}
                  className="p-2 rounded-full hover:bg-blue-900/30 text-blue-300/60 hover:text-cyan-200 transition-colors"
                  title="Clear log"
                  aria-label="Clear transcript"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                </button>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="p-2 rounded-full hover:bg-blue-900/30 text-blue-300/60 hover:text-cyan-200 transition-colors"
                  aria-label="Close transcript drawer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            {/* Transcript Message Feed */}
            <div ref={drawerFeedRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-sm">
              {messages.length === 0 && !liveCaption && (
                <div className="text-xs font-mono text-blue-300/40 text-center py-6">
                  {messages.length === 0 && conversationRef.current.length === 0 ? "Transcript is empty — start talking." : "Transcript cleared."}
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                  {msg.role === "user" ? (
                    <span className="text-[11px] font-mono text-cyan-300/50 uppercase tracking-wider">You · {formatClock(msg.timestamp)}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(61,209,250,0.8)]" />
                      <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider">ShadowTalk (Nyx)</span>
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed",
                    msg.role === "user"
                      ? "rounded-tr-[4px] bg-blue-950/60 border border-blue-500/25 text-blue-100 shadow-sm"
                      : "rounded-tl-[4px] bg-slate-900/70 border border-blue-500/20 text-blue-100/90",
                  )}>
                    {msg.content}
                    {msg.role === "assistant" && (
                      <div className="mt-2.5 pt-2 border-t border-blue-500/15 flex items-center justify-end text-xs text-blue-300/50 font-mono">
                        <button
                          onClick={() => { try { void navigator.clipboard.writeText(msg.content); } catch { /* clipboard unavailable */ } }}
                          className="hover:text-cyan-300 transition-colors flex items-center gap-1"
                          aria-label="Copy message"
                        >
                          <span className="material-symbols-outlined text-xs">content_copy</span> Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Active in-flight speech */}
              {liveCaption && isSpeaking && (
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider">ShadowTalk</span>
                  </div>
                  <div className="max-w-[88%] rounded-2xl rounded-tl-[4px] bg-blue-950/40 border border-cyan-500/30 px-4 py-3 text-blue-100 leading-relaxed italic shadow-[0_0_15px_rgba(31,107,242,0.15)]">
                    {liveCaption}
                  </div>
                </div>
              )}
            </div>
            {/* Drawer Quick Prompt Inject Footer */}
            <div className="p-4 border-t border-blue-500/15 bg-slate-950/60 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <div className="flex items-center bg-blue-950/50 border border-blue-500/25 rounded-full px-4 py-1.5 focus-within:border-cyan-400/60 transition-colors shadow-inner">
                <input
                  className="w-full bg-transparent text-sm text-white placeholder-blue-300/40 border-0 outline-none focus:ring-0 py-1"
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
                  placeholder="Type a message or command..."
                  type="text"
                  aria-label="Type a message or command"
                />
                <button
                  onClick={handleTextSubmit}
                  className="text-cyan-400/70 hover:text-cyan-300 p-1 rounded-full transition-colors"
                  aria-label="Send message"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              </div>
            </div>
          </aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiveVoiceMode;
