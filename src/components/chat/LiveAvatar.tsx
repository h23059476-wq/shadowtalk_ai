/**
 * LiveAvatar — "Obsidian Core": the presence at the center of Live Mode.
 *
 * Monolith design language (ShadowTalk theme):
 *  - A perfect obsidian sphere — no face, no eyes, no cartoon blob
 *  - A single crescent rim light from above in the ShadowTalk cyan
 *  - Breathing idle; mic/TTS amplitude lights the sphere from within
 *  - Listening: a hairline ring whose opacity tracks the microphone
 *  - Speaking: a slow glint travels the rim with the TTS amplitude
 *  - Thinking: one small light orbits on a hairline ellipse — restrained
 *
 * All animation is a single requestAnimationFrame loop; loudness comes from
 * a getter (ref-based) so React never re-renders per frame.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type LiveAvatarPhase = "idle" | "listening" | "thinking" | "speaking";

interface LiveAvatarProps {
  phase: LiveAvatarPhase;
  /** Returns current loudness 0..1 (mic while listening, TTS while speaking). */
  getLevel?: () => number;
  size?: number;
  className?: string;
}

/** Phase hue in ShadowTalk brand space — ink monochrome + one cyan accent. */
const PHASE_HSL: Record<LiveAvatarPhase, [number, number, number]> = {
  idle: [195, 25, 68], // pale steel — barely tinted
  listening: [195, 100, 62], // brand cyan
  thinking: [270, 90, 72], // brand violet, lifted for glow
  speaking: [197, 95, 66], // cyan, brightest
};

const TAU = Math.PI * 2;

export const LiveAvatar: React.FC<LiveAvatarProps> = ({
  phase,
  getLevel,
  size = 320,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const getLevelRef = useRef(getLevel);
  phaseRef.current = phase;
  getLevelRef.current = getLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    // Smoothly-lerped state intensities — the avatar morphs, never snaps.
    const intensity: Record<LiveAvatarPhase, number> = {
      idle: 0, listening: 0, thinking: 0, speaking: 0,
    };
    const hsl: [number, number, number] = [...PHASE_HSL.idle] as [number, number, number];

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const k05 = (dt: number, halfLife: number) => 1 - Math.pow(0.5, dt / halfLife);

    let raf = 0;
    let last = performance.now();
    let t = 0; // seconds of animation time
    let smoothedLevel = 0;

    const hslStr = (h: number, s: number, l: number, a: number) => `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a.toFixed(3)})`;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!reduced) t += dt;

      // --- state blend ---
      const target = phaseRef.current;
      for (const p of Object.keys(intensity) as LiveAvatarPhase[]) {
        const want = p === target ? 1 : 0;
        intensity[p] = lerp(intensity[p], want, k05(dt, 0.22)); // ~600ms full blend
      }
      for (let i = 0; i < 3; i++) {
        hsl[i] = lerp(hsl[i], PHASE_HSL[target][i], k05(dt, 0.15));
      }

      // --- loudness ---
      const raw = Math.max(0, Math.min(1, getLevelRef.current?.() ?? 0));
      smoothedLevel = lerp(smoothedLevel, raw, raw > smoothedLevel ? 0.5 : 0.12);
      const level = smoothedLevel;

      // --- draw ---
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      const listening = intensity.listening;
      const thinking = intensity.thinking;
      const speaking = intensity.speaking;
      const idle = intensity.idle;

      const [h, s, l] = hsl;
      const breathe = 1 + Math.sin(t * 1.15) * 0.014 * (0.5 + idle);
      const R = size * 0.285 * breathe * (1 + level * 0.035);

      // --- faint halo: keeps the stage alive without decoration ---
      const haloR = R * (2.0 + level * 0.35);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, haloR);
      halo.addColorStop(0, hslStr(h, s, l, 0.05 + level * 0.10 + speaking * 0.03));
      halo.addColorStop(1, hslStr(h, s, l, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, TAU);
      ctx.fill();

      // --- structural hairline orbits (static, Monolith discipline) ---
      for (const [k, alpha] of [[1.42, 0.05], [1.58, 0.035], [1.74, 0.022]] as const) {
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, TAU);
        ctx.stroke();
      }

      // --- listening ring: hairline that answers the microphone ---
      if (listening > 0.02) {
        const ringA = listening * (0.10 + level * 0.42);
        ctx.strokeStyle = hslStr(h, s, l, ringA);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.3, 0, TAU);
        ctx.stroke();
        if (level > 0.12) {
          ctx.strokeStyle = hslStr(h, s, l, listening * level * 0.30);
          ctx.beginPath();
          ctx.arc(cx, cy, R * 1.3 + level * 9, 0, TAU);
          ctx.stroke();
        }
      }

      // --- thinking: one small light on a hairline ellipse ---
      if (thinking > 0.02) {
        const orbR = R * 1.44;
        ctx.strokeStyle = hslStr(h, s, l, 0.16 * thinking);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, orbR, orbR * 0.42, -0.35, 0, TAU);
        ctx.stroke();
        const a = t * 1.1;
        ctx.fillStyle = `rgba(255,255,255,${0.8 * thinking})`;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * orbR, cy + Math.sin(a) * orbR * 0.42 - orbR * 0.1, 2.2, 0, TAU);
        ctx.fill();
      }

      // --- the sphere: perfect circle, opaque ink body ---
      // Fully opaque so the halo behind can never bleed through — a
      // transparent center is what made the sphere read as an eyeball.
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      const body = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.05);
      body.addColorStop(0, "rgba(10,14,21,1)");
      body.addColorStop(0.72, "rgba(6,9,14,1)");
      body.addColorStop(1, "rgba(2,4,8,1)");
      ctx.fillStyle = body;
      ctx.shadowColor = hslStr(h, s, l, 0.12 + level * 0.22);
      ctx.shadowBlur = 16 + level * 28;
      ctx.fill();
      ctx.shadowBlur = 0;

      // --- inner light: amplitude lights the core from within (overlay on
      // the opaque ink, centered so it reads as glow, never as a face) ---
      if (level > 0.02) {
        const coreR = R * (0.30 + level * 0.34);
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        core.addColorStop(0, hslStr(h, s, l + 8, 0.30 * (0.3 + speaking * 0.4 + listening * 0.35) * level + 0.05));
        core.addColorStop(1, hslStr(h, s, l, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, TAU);
        ctx.fill();
      }

      // --- rim light: crisp crescent from above; glow radiates outward only
      // (a shadow-blur glow bleeds into the ink and reads as an eyeball) ---
      const rimA = 0.42 + level * 0.30 + speaking * 0.08;
      for (const [lw, alpha, rOff] of [
        [1.6, rimA, 0],
        [3.2, rimA * 0.32, 2.2],
        [6.5, rimA * 0.14, 5.5],
      ] as const) {
        ctx.strokeStyle = hslStr(h, s + 10, Math.min(l + 20, 92), alpha);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(cx, cy, R + rOff, -Math.PI * 0.92, -Math.PI * 0.08);
        ctx.stroke();
      }
      // faint floor reflection on the lower edge
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 0.8, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();

      // --- speaking glint: travels the rim with the voice ---
      if (speaking > 0.02) {
        const sweep = t * 1.5;
        for (const [lw, alpha, rOff] of [
          [2, speaking * (0.18 + level * 0.45), 0],
          [4, speaking * (0.08 + level * 0.2), 2],
        ] as const) {
          ctx.strokeStyle = hslStr(h, s, Math.min(l + 22, 94), alpha);
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.arc(cx, cy, R + rOff, sweep, sweep + 0.7);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={cn("block", className)}
      aria-hidden="true"
    />
  );
};

export default LiveAvatar;
