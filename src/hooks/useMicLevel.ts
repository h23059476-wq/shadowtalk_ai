/**
 * useMicLevel — real-time microphone loudness meter for Live Mode.
 *
 * Runs a getUserMedia + AnalyserNode loop and exposes a ref-based level
 * getter (0..1) so animation frames and barge-in detection can read the
 * level without React re-renders. Echo cancellation is enabled so the AI's
 * own TTS output (picked up by the mic) is suppressed — that's what makes
 * hands-free barge-in safe.
 */
import { useRef, useCallback, useEffect } from "react";

export interface MicLevelHandle {
  /** Request mic permission and start metering. Resolves false if unavailable. */
  start: () => Promise<boolean>;
  stop: () => void;
  /** Smoothed loudness 0..1 (fast attack, slow decay). */
  getLevel: () => number;
  isActive: () => boolean;
}

export function useMicLevel(): MicLevelHandle {
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const levelRef = useRef(0);
  const activeRef = useRef(false);

  const loop = useCallback(() => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return;
    analyser.getFloatTimeDomainData(data as any);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    // Map RMS (~0..0.5 for normal speech) to 0..1 with fast attack/slow decay.
    const instant = Math.min(1, rms * 3.2);
    const prev = levelRef.current;
    levelRef.current = instant > prev ? prev + (instant - prev) * 0.55 : prev + (instant - prev) * 0.12;
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (activeRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataRef.current = new Float32Array(analyser.fftSize);
      activeRef.current = true;
      levelRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
      return true;
    } catch {
      return false;
    }
  }, [loop]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    levelRef.current = 0;
  }, []);

  const getLevel = useCallback(() => levelRef.current, []);
  const isActive = useCallback(() => activeRef.current, []);

  useEffect(() => stop, [stop]);

  return { start, stop, getLevel, isActive };
}
