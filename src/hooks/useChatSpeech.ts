import { useCallback, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { startLocalRecording, type LocalRecording } from "@/lib/localInference/audioCapture";
import { getLocalInferenceClient } from "@/lib/localInference/localEngineClient";
import { getHfCacheInventory } from "@/lib/localInference/hfCacheManager";
import { HF_ASR_MODEL } from "@/lib/localInference/hfModels";

/**
 * Chat voice input + read-aloud.
 *
 * Tier-1 offline voice input: when the browser has no cloud SpeechRecognition
 * (Firefox/Safari), the user is offline, or local transcription is preferred,
 * dictation records the mic locally and transcribes with whisper-tiny.en
 * through the dedicated inference worker — no cloud speech API involved.
 * Preference is a simple localStorage flag set from the Offline Model Manager.
 */
const LOCAL_TRANSCRIBE_PREF = "shadowtalk.localTranscription.v1";

export function getLocalTranscriptionPref(): "auto" | "prefer" | "off" {
  try {
    const raw = localStorage.getItem(LOCAL_TRANSCRIBE_PREF);
    return raw === "prefer" || raw === "off" ? raw : "auto";
  } catch {
    return "auto";
  }
}

export function setLocalTranscriptionPref(value: "auto" | "prefer" | "off"): void {
  localStorage.setItem(LOCAL_TRANSCRIBE_PREF, value);
}

async function whisperModelCached(): Promise<boolean> {
  try {
    const inventory = await getHfCacheInventory();
    return inventory.models.some((m) => m.repoId === HF_ASR_MODEL.repoId && m.hasWeights);
  } catch {
    return false;
  }
}

export function useChatSpeech() {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const localRecordingRef = useRef<LocalRecording | null>(null);
  /** Transcript callback captured at dictation start, consumed on stop. */
  const localTranscriptCbRef = useRef<((text: string) => void) | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const recording = localRecordingRef.current;
    const onTranscript = localTranscriptCbRef.current;
    localRecordingRef.current = null;
    localTranscriptCbRef.current = null;
    setIsListening(false);
    if (!recording) return;
    // Second click finalizes offline dictation: stop the capture, decode the
    // PCM and transcribe on-device. (The old flow called recording.stop()
    // immediately after start — the mic captured ~0ms and whisper could never
    // receive a usable clip, so offline dictation could not actually work.)
    void (async () => {
      try {
        const pcm = await recording.stop();
        if (pcm.length < 1600) {
          toast({ title: "Nothing audible", description: "The recording was too short — hold the conversation longer before stopping." });
          return;
        }
        const client = getLocalInferenceClient();
        const result = await client.transcribeAudio(pcm);
        const text = result.text?.trim();
        if (text && onTranscript) {
          onTranscript(text);
        } else {
          toast({ title: "Nothing audible", description: "No speech was detected in the recording." });
        }
      } catch (error) {
        toast({
          title: "Offline transcription unavailable",
          description:
            error instanceof Error ? error.message : "The on-device speech model could not run.",
          variant: "destructive",
        });
      }
    })();
  }, [toast]);

  /** Offline dictation path: record → decode 16 kHz mono → whisper via worker. */
  const startLocalDictation = useCallback(
    (onTranscript: (text: string) => void) => {
      (async () => {
        try {
          const recording = await startLocalRecording();
          localTranscriptCbRef.current = onTranscript;
          localRecordingRef.current = recording;
          setIsListening(true);
          // Recording keeps running until the user clicks the mic again —
          // stopListening() finalizes the clip and runs whisper on-device.
        } catch (error) {
          localRecordingRef.current = null;
          localTranscriptCbRef.current = null;
          setIsListening(false);
          toast({
            title: "Offline transcription unavailable",
            description:
              error instanceof Error ? error.message : "The on-device speech model could not run.",
            variant: "destructive",
          });
        }
      })();
    },
    [toast],
  );

  /** Cloud dictation path (Chrome's SpeechRecognition API). */
  const startCloudDictation = useCallback(
    (onTranscript: (text: string) => void) => {
      const w = window as any;
      const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        toast({
          title: "Voice input unavailable",
          description:
            "This browser has no speech recognition. Install the offline Whisper model in Settings → Offline AI to dictate without one.",
          variant: "destructive",
        });
        return;
      }
      stopListening();
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = Array.from(event.results);
        const last = results[results.length - 1];
        const text = last[0]?.transcript?.trim();
        if (text && last.isFinal) onTranscript(text);
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [stopListening, toast],
  );

  /** Dictation: fills the chat input from the microphone. */
  const startDictation = useCallback(
    (onTranscript: (text: string) => void) => {
      const w = window as any;
      const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      const pref = getLocalTranscriptionPref();
      const cloudUnavailable = !SpeechRecognitionCtor;
      const offline = navigator.onLine === false;

      const useLocal = cloudUnavailable || pref === "prefer" || (offline && pref !== "off");
      if (useLocal) {
        // The local model may not be installed yet — check before recording
        // so a missing install is reported honestly instead of failing mid-clip.
        void whisperModelCached().then((cached) => {
          if (!cached) {
            // Offline with no model, or user prefers local without installing:
            // the cloud path cannot serve these cases either.
            if (offline || cloudUnavailable || pref === "prefer") {
              toast({
                title: "Offline speech model not installed",
                description:
                  "Install Whisper Tiny (EN) from Settings → Offline AI → Offline Model Manager to dictate without a connection.",
                variant: "destructive",
              });
              return;
            }
            // pref was 'prefer' but the user is online with cloud available:
            // fall through to the cloud path below.
          } else {
            startLocalDictation(onTranscript);
            return;
          }
          if (!offline && !cloudUnavailable) startCloudDictation(onTranscript);
        });
        return;
      }

      startCloudDictation(onTranscript);
    },
    [startCloudDictation, startLocalDictation, toast],
  );

  const toggleDictation = useCallback(
    (onTranscript: (text: string) => void) => {
      if (isListening) {
        stopListening();
        return;
      }
      startDictation(onTranscript);
    },
    [isListening, startDictation, stopListening],
  );

  const speakMessage = useCallback(
    (text: string, messageId: string) => {
      if (!("speechSynthesis" in window)) {
        toast({ title: "Text-to-speech unavailable", variant: "destructive" });
        return;
      }

      window.speechSynthesis.cancel();
      const plain = text.replace(/[#*_`[\]]/g, "").slice(0, 4000);
      const utterance = new SpeechSynthesisUtterance(plain);
      utterance.rate = 1;
      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingMessageId(messageId);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };
      window.speechSynthesis.speak(utterance);
    },
    [toast],
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  return {
    isListening,
    isSpeaking,
    speakingMessageId,
    toggleDictation,
    stopListening,
    speakMessage,
    stopSpeaking,
  };
}
