/**
 * ElevenLabs TTS — Direct browser-to-ElevenLabs API call.
 *
 * Uses the user's BYOK ElevenLabs API key (stored in localStorage) or
 * falls back to browser SpeechSynthesis if no key is configured.
 *
 * Premium voice quality — far better than browser TTS.
 */

const ELEVENLABS_API_KEY_PREFIX = "shadowtalk_elevenlabs_key.";

function storageKey(): string | null {
  const uid = fbAuth().currentUser?.uid;
  return uid ? `${ELEVENLABS_API_KEY_PREFIX}${uid}` : null;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string;
}

/** Default voice — "Rachel" (natural female, conversational). */
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/** Premium conversational voices. */
export const VOICE_OPTIONS: { id: string; name: string; description: string; gender: string }[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm, conversational female", gender: "female" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Strong, confident female", gender: "female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft, friendly female", gender: "female" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Warm, conversational male", gender: "male" },
  { id: "VR6AewLTigWG4xSOukaH", name: "Arnold", description: "Deep, authoritative male", gender: "male" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Deep, narrative male", gender: "male" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Samuel", description: "Calm, professional male", gender: "male" },
];

export function getElevenLabsKey(): string | null {
  try {
    const key = storageKey();
    return key ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function setElevenLabsKey(key: string): void {
  try {
    const storage = storageKey();
    if (storage) localStorage.setItem(storage, key.trim());
  } catch {
    // ignore
  }
}

export function hasElevenLabsKey(): boolean {
  return !!getElevenLabsKey();
}

export interface SpeakOptions {
  voiceId?: string;
  signal?: AbortSignal;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

/**
 * Speak text using ElevenLabs API directly from the browser.
 * Falls back to browser SpeechSynthesis if no API key is configured.
 *
 * Returns an AbortController so the caller can stop playback (barge-in).
 */
export async function speakWithElevenLabs(
  text: string,
  opts: SpeakOptions = {},
): Promise<AbortController> {
  const controller = new AbortController();
  const signal = opts.signal || controller.signal;

  // Merge abort signals
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort());
  }

  const apiKey = getElevenLabsKey();
  const voiceId = opts.voiceId || DEFAULT_VOICE_ID;

  if (!apiKey) {
    // Fallback to browser TTS
    speakWithBrowserTTS(text, opts);
    return controller;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 2500),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
        signal,
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`ElevenLabs ${response.status}: ${errText.slice(0, 200)}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.volume = 0.9;

    opts.onStart?.();

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      opts.onEnd?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      opts.onError?.("Audio playback failed");
    };

    // Handle abort
    signal.addEventListener("abort", () => {
      audio.pause();
      URL.revokeObjectURL(audioUrl);
      opts.onEnd?.();
    });

    await audio.play();
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    console.warn("[ElevenLabs TTS] Failed, falling back to browser TTS:", err?.message);
    // Fallback to browser TTS
    speakWithBrowserTTS(text, opts);
  }

  return controller;
}

/** Browser SpeechSynthesis fallback — used when no ElevenLabs key is set. */
function speakWithBrowserTTS(text: string, opts: SpeakOptions = {}) {
  if (!("speechSynthesis" in window)) {
    opts.onError?.("Text-to-speech not supported");
    return;
  }

  window.speechSynthesis.cancel();
  const plain = text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[#*_`[\]()]/g, "")
    .replace(/\n{2,}/g, ". ")
    .slice(0, 4000);

  const utterance = new SpeechSynthesisUtterance(plain);
  utterance.rate = 1.05;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Natural")) ||
    voices.find(v => v.lang.startsWith("en"));
  if (preferredVoice) utterance.voice = preferredVoice;

  utterance.onstart = () => opts.onStart?.();
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = () => opts.onError?.("Speech synthesis error");

  if (opts.signal) {
    opts.signal.addEventListener("abort", () => {
      window.speechSynthesis.cancel();
      opts.onEnd?.();
    });
  }

  window.speechSynthesis.speak(utterance);
}

/** Stop all TTS playback (both ElevenLabs and browser). */
export function stopAllTTS(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  // Stop any playing Audio elements
  document.querySelectorAll("audio").forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
}
import { fbAuth } from "@/integrations/firebase/app";
