/**
 * Tier-1 local inference — microphone capture → 16 kHz mono PCM.
 *
 * Browser SpeechRecognition APIs stream audio to a cloud service; the
 * whisper path needs the RAW samples instead. This module records with
 * MediaRecorder (opus/webm), decodes via AudioContext, downmixes to mono and
 * resamples to the 16 kHz whisper expects — entirely on-device.
 */

export interface LocalRecording {
  /** Stop recording and resolve to whisper-ready PCM. */
  stop(): Promise<Float32Array>;
  /** Hard-cancel (no transcription). */
  cancel(): void;
}

/**
 * Start a microphone recording. Requests permission on call; rejects with a
 * user-readable Error when the mic is unavailable or permission is denied.
 */
export async function startLocalRecording(): Promise<LocalRecording> {
  const media = navigator.mediaDevices?.getUserMedia;
  if (!media) {
    throw new Error("Microphone capture is not available in this browser.");
  }
  let stream: MediaStream;
  try {
    stream = await media.call(navigator.mediaDevices, { audio: true });
  } catch {
    throw new Error("Microphone permission was denied — voice input needs the mic.");
  }

  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  let cancelled = false;

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(250);

  const cleanup = () => {
    for (const track of stream.getTracks()) track.stop();
  };

  return {
    stop(): Promise<Float32Array> {
      return new Promise<Float32Array>((resolve, reject) => {
        if (cancelled) {
          cleanup();
          reject(new Error("Recording was cancelled."));
          return;
        }
        recorder.onstop = async () => {
          cleanup();
          try {
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            const pcm = await decodeToMono16k(blob);
            resolve(pcm);
          } catch (error) {
            reject(error instanceof Error ? error : new Error("Audio decoding failed."));
          }
        };
        if (recorder.state !== "inactive") recorder.stop();
        else recorder.onstop?.(new Event("stop"));
      });
    },
    cancel(): void {
      cancelled = true;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } finally {
        cleanup();
      }
    },
  };
}

const TARGET_SAMPLE_RATE = 16_000; // whisper's expected rate

/** Decode any browser-supported audio blob → 16 kHz mono Float32 PCM. */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtor =
    (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error("Web Audio is unavailable in this browser.");
  const decodeContext = new AudioCtor();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeContext.decodeAudioData(arrayBuffer);
  } finally {
    void decodeContext.close();
  }

  // Downmix to mono first.
  const mono = new Float32Array(decoded.length);
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const channel = decoded.getChannelData(ch);
    for (let i = 0; i < decoded.length; i++) mono[i] += channel[i] / decoded.numberOfChannels;
  }

  // Resample to 16 kHz (linear interpolation is plenty for ASR).
  const sourceRate = decoded.sampleRate;
  if (sourceRate === TARGET_SAMPLE_RATE) return mono;
  const ratio = TARGET_SAMPLE_RATE / sourceRate;
  const outLength = Math.max(1, Math.round(decoded.length * ratio));
  const resampled = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i / ratio;
    const left = Math.floor(srcPos);
    const right = Math.min(left + 1, decoded.length - 1);
    const frac = srcPos - left;
    resampled[i] = mono[left] * (1 - frac) + mono[right] * frac;
  }
  return resampled;
}
