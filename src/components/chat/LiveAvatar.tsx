/**
 * LiveAvatar — the presence at the center of Live Mode.
 *
 * A canvas-rendered "living shadow" that replaces the old static orb:
 *  - Breathing idle (slow, organic scale oscillation)
 *  - Microphone-amplitude-driven surface morphing while listening
 *  - TTS-amplitude-driven undulation while speaking (sound you can SEE)
 *  - Two glowing eyes that blink, saccade and react to the phase
 *  - Orbital motes that breathe outward with loudness
 *  - Smooth color transitions between phases (never snaps)
 *
 * All animation is a single requestAnimationFrame loop; the loudness comes
 * from a getter (ref-based) so React never re-renders per frame.
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

/** Target hue per phase — deep shadow core, colored energy. */
const PHASE_COLOR: Record<LiveAvatarPhase, [number, number, number]> = {
  idle: [34, 211, 238], // cyan
  listening: [99, 102, 241], // indigo
  thinking: [167, 139, 250], // violet
  speaking: [192, 132, 252], // purple-pink
};

const TAU = Math.PI * 2;
const POINTS = 72;

export const LiveAvatar: React.FC<LiveAvatarProps> = ({
  phase,
  getLevel,
  size = 320,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const levelRef = useRef(0);
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
    const color: [number, number, number] = [...PHASE_COLOR.idle] as [number, number, number];

    // Eyes: blink timer + micro-saccades.
    let nextBlink = 1.6 + Math.random() * 3;
    let blinkT = 0; // 0 = open, 1 = closed
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    let nextSaccade = 2 + Math.random() * 2;
    let saccadeTargetX = 0;
    let saccadeTargetY = 0;

    // Orbital motes.
    const MOTES = reduced ? 0 : 14;
    const motes = Array.from({ length: MOTES }, () => ({
      angle: Math.random() * TAU,
      radius: 0.55 + Math.random() * 0.5, // × core radius
      speed: 0.12 + Math.random() * 0.5,
      size: 1 + Math.random() * 2.2,
      alpha: 0.25 + Math.random() * 0.5,
      wobble: Math.random() * TAU,
    }));

    let raf = 0;
    let last = performance.now();
    let t = 0; // seconds of animation time
    let smoothedLevel = 0;

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!reduced) t += dt;

      // --- state blend ---
      const target = phaseRef.current;
      for (const p of Object.keys(intensity) as LiveAvatarPhase[]) {
        const want = p === target ? 1 : 0;
        intensity[p] = lerp(intensity[p], want, 1 - Math.pow(0.001, dt)); // ~600ms
      }
      const targetColor = PHASE_COLOR[target];
      for (let i = 0; i < 3; i++) {
        color[i] = lerp(color[i], targetColor[i], 1 - Math.pow(0.005, dt));
      }

      // --- loudness ---
      const raw = Math.max(0, Math.min(1, getLevelRef.current?.() ?? 0));
      smoothedLevel = lerp(smoothedLevel, raw, raw > smoothedLevel ? 0.5 : 0.1);
      levelRef.current = smoothedLevel;

      // --- eyes behavior ---
      nextBlink -= dt;
      if (nextBlink <= 0) {
        blinkT = 1;
        nextBlink = 2.5 + Math.random() * 4;
      }
      blinkT = Math.max(0, blinkT - dt * 9);
      nextSaccade -= dt;
      if (nextSaccade <= 0) {
        saccadeTargetX = (Math.random() - 0.5) * 7;
        saccadeTargetY = (Math.random() - 0.5) * 5;
        nextSaccade = 1.4 + Math.random() * 2.6;
      }
      eyeOffsetX = lerp(eyeOffsetX, saccadeTargetX, 1 - Math.pow(0.02, dt));
      eyeOffsetY = lerp(eyeOffsetY, saccadeTargetY, 1 - Math.pow(0.02, dt));

      // --- draw ---
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      const listening = intensity.listening;
      const thinking = intensity.thinking;
      const speaking = intensity.speaking;
      const idle = intensity.idle;
      const level = levelRef.current;

      const thinkingSlow = 0.35 * thinking;
      const breathe = 1 + Math.sin(t * 1.5) * 0.022 * (0.4 + idle);
      const baseR = size * 0.26 * breathe;

      const [r, g, b] = color.map(Math.round);
      const energy = 0.35 + level * 0.65; // 0..1 overall liveliness

      // --- outer aura ---
      const auraR = baseR * (1.55 + level * 0.45 + listening * 0.15);
      const aura = ctx.createRadialGradient(cx, cy, baseR * 0.4, cx, cy, auraR);
      aura.addColorStop(0, `rgba(${r},${g},${b},${0.22 + level * 0.25})`);
      aura.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, auraR, 0, TAU);
      ctx.fill();

      // --- motes ---
      if (MOTES) {
        for (const m of motes) {
          m.angle += (m.speed + thinkingSlow * 2.2 + speaking * level * 1.4) * dt;
          const wob = Math.sin(t * 2 + m.wobble) * 6;
          const mr = baseR * m.radius + wob + speaking * level * baseR * 0.35;
          const mx = cx + Math.cos(m.angle) * mr;
          const my = cy + Math.sin(m.angle) * mr * 0.92;
          ctx.fillStyle = `rgba(${r},${g},${b},${m.alpha * (0.5 + energy * 0.5)})`;
          ctx.beginPath();
          ctx.arc(mx, my, m.size * (1 + level * 0.8), 0, TAU);
          ctx.fill();
        }
      }

      // --- thinking orbit ring ---
      if (thinking > 0.02) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.28 * thinking})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, baseR * 1.28, baseR * 1.28 * 0.35, Math.sin(t * 0.7) * 0.5, 0, TAU);
        ctx.stroke();
        // two bright dots chasing around the ring
        for (let k = 0; k < 2; k++) {
          const a = t * (1.8 + k * 0.9) + k * Math.PI;
          const px = cx + Math.cos(a) * baseR * 1.28;
          const py = cy + Math.sin(a) * baseR * 1.28 * 0.35;
          ctx.fillStyle = `rgba(255,255,255,${0.75 * thinking})`;
          ctx.beginPath();
          ctx.arc(px, py, 3.2, 0, TAU);
          ctx.fill();
        }
      }

      // --- the body blob (harmonic surface) ---
      const bodyPhase = t * 2.4 + thinking * t * 2.0;
      const amp = (0.028 + level * 0.10) * (0.5 + speaking * 0.8 + listening * 0.7 + idle * 0.35);
      ctx.beginPath();
      for (let i = 0; i <= POINTS; i++) {
        const a = (i / POINTS) * TAU;
        const w =
          Math.sin(a * 3 + bodyPhase) * amp +
          Math.sin(a * 5 - bodyPhase * 1.35) * amp * 0.6 +
          Math.sin(a * 2 + bodyPhase * 0.7) * amp * 0.8;
        const rr = baseR * (1 + w);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.96;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const body = ctx.createRadialGradient(cx, cy - baseR * 0.25, baseR * 0.1, cx, cy, baseR * 1.15);
      body.addColorStop(0, `rgba(${Math.min(r + 70, 255)},${Math.min(g + 70, 255)},${Math.min(b + 90, 255)},0.95)`);
      body.addColorStop(0.45, `rgba(${r},${g},${b},0.75)`);
      body.addColorStop(0.85, `rgba(${Math.max(r - 60, 10)},${Math.max(g - 70, 12)},${Math.max(b - 40, 30)},0.9)`);
      body.addColorStop(1, `rgba(6,8,18,0.95)`);
      ctx.fillStyle = body;
      ctx.shadowColor = `rgba(${r},${g},${b},${0.55 + level * 0.3})`;
      ctx.shadowBlur = 26 + level * 30;
      ctx.fill();
      ctx.shadowBlur = 0;

      // rim light
      ctx.strokeStyle = `rgba(${Math.min(r + 90, 255)},${Math.min(g + 90, 255)},${Math.min(b + 110, 255)},${0.35 + level * 0.35})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // --- eyes ---
      const eyeY = cy - baseR * 0.18 + eyeOffsetY;
      const eyeDx = baseR * 0.34 + eyeOffsetX;
      const openK = 1 - blinkT;
      // speaking with energy → gentle happy squint; thinking → half-lidded, looking up-left
      const squint = speaking * 0.18 + thinking * 0.30 - listening * 0.10;
      const eyeH = baseR * 0.24 * Math.max(0.06, openK * (1 - Math.max(0, squint)));
      const eyeW = baseR * 0.16;
      const lookUp = thinking * baseR * 0.12;
      for (const side of [-1, 1]) {
        const ex = cx + side * eyeDx;
        const ey = eyeY - lookUp;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.fillStyle = `rgba(240,252,255,${0.9 - blinkT * 0.85})`;
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        // pupil glint
        if (openK > 0.5) {
          ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
          ctx.beginPath();
          ctx.ellipse(side * eyeW * 0.28, eyeH * 0.18, eyeW * 0.42, eyeH * 0.5, 0, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
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
