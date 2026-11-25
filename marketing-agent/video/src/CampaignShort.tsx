/**
 * CampaignShort — vertical (1080x1920 @30fps, 30s) branded marketing short
 * for the n8n marketing pipeline. This is the pipeline-facing successor of
 * the edge-tts/ffmpeg generate_short.py: same 5-line script contract
 * (video_script_lines: hook first, CTA last), rendered with the original
 * ShadowTalk Remotion brand engine instead.
 *
 * Timeline (900 frames):
 *   S1   0-135   hook: typewriter headline (lines[0])
 *   S2-S4 135-540 three insight cards (lines[1..3]) with index numbers
 *   S5 540-900   CTA line (lines[4]) lands on the music impact,
 *                end card (logo, gradient wordmark, URL) from frame 720
 *
 * Audio: committed synth music bed (public/music-bed.mp3) from the same
 * generator family as the first YouTube trailer — pad, sub, ticks, arp,
 * riser into the 18.0s impact, fade tail. No TTS, no ffmpeg post-mux.
 *
 * Deterministic: no Math.random, no Date.now — every frame reproducible.
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND_GRADIENT, C, DURATION_FRAMES, FONT, SAFE_X, SAFE_Y, mulberry32 } from "./theme";
import { LogoMark } from "./components/LogoMark";
import { Typewriter } from "./components/Typewriter";

export interface CampaignShortProps {
  /** Exactly 5 spoken lines from the campaign package: hook first, CTA last. */
  lines?: string[];
  /** Site URL shown on the end card. */
  url?: string;
  /** Source keyword (Content_Queue) — shown as a subtle kicker on the hook. */
  keyword?: string;
}

export const defaultCampaignProps: CampaignShortProps = {
  lines: [
    "Your AI, your rules.",
    "Multi-model chat with your own keys.",
    "Runs offline, on your device.",
    "Private by design.",
    "Try ShadowTalk — free.",
  ],
  url: "shadowtalk-ai.com",
  keyword: "",
};

/** Whole-scene opacity window fade (local frames). */
const SceneFade: React.FC<{
  len: number;
  inFrames?: number;
  outFrames?: number;
  children: React.ReactNode;
}> = ({ len, inFrames = 9, outFrames = 11, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, inFrames, len - outFrames, len],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Spring rise helper. */
const Rise: React.FC<{
  at: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, y = 42, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 130 } });
  return (
    <div
      style={{
        transform: `translateY(${(1 - s) * y}px)`,
        opacity: interpolate(s, [0, 1], [0, 1]),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ------------------------------------------------------------- background --

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const rng = mulberry32(20261125);

  // seeded dot field, slow drift
  const dots = Array.from({ length: 56 }, () => ({
    x: rng() * width,
    y: rng() * height,
    r: 1.2 + rng() * 2.6,
    phase: rng() * Math.PI * 2,
    speed: 0.4 + rng() * 0.8,
  }));

  const glowA = {
    x: width * (0.18 + 0.05 * Math.sin(frame / 210)),
    y: height * (0.16 + 0.04 * Math.cos(frame / 260)),
  };
  const glowB = {
    x: width * (0.84 + 0.05 * Math.cos(frame / 240)),
    y: height * (0.82 + 0.04 * Math.sin(frame / 220)),
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: "absolute",
          left: glowA.x,
          top: glowA.y,
          width: 900,
          height: 900,
          marginLeft: -450,
          marginTop: -450,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(26,198,255,0.13) 0%, rgba(26,198,255,0) 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: glowB.x,
          top: glowB.y,
          width: 1000,
          height: 1000,
          marginLeft: -500,
          marginTop: -500,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(158,71,245,0.11) 0%, rgba(158,71,245,0) 62%)`,
        }}
      />
      {dots.map((d, i) => {
        const tw = 0.5 + 0.5 * Math.sin(frame / (26 * d.speed) + d.phase);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x + Math.sin(frame / 90 + d.phase) * 8,
              top: d.y + Math.cos(frame / 110 + d.phase) * 8,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: "50%",
              backgroundColor: "rgba(245,245,245,0.7)",
              opacity: 0.05 + 0.13 * tw,
            }}
          />
        );
      })}
      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(7,7,9,0) 42%, rgba(7,7,9,0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ persistent UI --

const TopBrand: React.FC<{ url: string }> = ({ url }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_Y - 96,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 14,
        opacity,
      }}
    >
      <LogoMark size={40} />
      <div
        style={{
          fontFamily: FONT.headline,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: 6,
          color: C.fgSoft,
        }}
      >
        SHADOW<span style={{ color: C.primary }}>TALK</span>
        <span style={{ color: C.muted, fontWeight: 500, letterSpacing: 2 }}> · {url}</span>
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ scene: number }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        bottom: SAFE_Y - 60,
        left: SAFE_X,
        right: SAFE_X,
        display: "flex",
        gap: 10,
      }}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < scene;
        const fill = spring({ frame: frame - 6, fps, config: { damping: 18 } });
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: i <= scene ? "rgba(26,198,255,0.28)" : "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: i < scene ? `${Math.round(fill * 100)}%` : "0%",
                height: "100%",
                background: BRAND_GRADIENT,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

// --------------------------------------------------------------- scenes --

const HookScene: React.FC<{ line: string; keyword?: string }> = ({ line, keyword }) => {
  const frame = useCurrentFrame();
  const chipOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${SAFE_X}px` }}>
      {keyword ? (
        <div
          style={{
            position: "absolute",
            top: SAFE_Y + 130,
            opacity: chipOpacity * 0.75,
            fontFamily: FONT.mono,
            fontSize: 24,
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            padding: "10px 26px",
            backgroundColor: C.glass,
            whiteSpace: "nowrap",
            maxWidth: 860,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {keyword}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: FONT.headline,
          fontWeight: 800,
          fontSize: 86,
          lineHeight: 1.16,
          color: C.fg,
          textAlign: "center",
          textShadow: "0 4px 40px rgba(26,198,255,0.22)",
        }}
      >
        <Typewriter text={line} startFrame={12} charsPerFrame={0.9} />
      </div>
    </AbsoluteFill>
  );
};

const InsightScene: React.FC<{ line: string; index: number }> = ({ line, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const numSpring = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 90 } });
  const label = String(index).padStart(2, "0");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${SAFE_X}px` }}>
      <div
        style={{
          position: "absolute",
          fontFamily: FONT.headline,
          fontWeight: 800,
          fontSize: 320,
          color: "transparent",
          WebkitTextStroke: `2px rgba(26,198,255,0.16)`,
          transform: `translateY(${(1 - numSpring) * 60}px)`,
          lineHeight: 1,
        }}
      >
        {label}
      </div>
      <Rise at={14} y={46}>
        <div
          style={{
            fontFamily: FONT.headline,
            fontWeight: 700,
            fontSize: 74,
            lineHeight: 1.22,
            color: C.fgSoft,
            textAlign: "center",
            maxWidth: 860,
          }}
        >
          {line.split(" ").map((word, wi) => {
            // accent the first brand-ish word (ShadowTalk / your / free) lightly
            const accent = /^(ShadowTalk|free|offline|private|yours|your)$/i.test(word.replace(/[^A-Za-z]/g, ""));
            return (
              <span key={wi} style={accent ? { color: C.primary } : undefined}>
                {word}{" "}
              </span>
            );
          })}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

const CtaScene: React.FC<{ line: string }> = ({ line }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 2, fps, config: { damping: 13, stiffness: 140 } });
  const endCardIn = interpolate(frame, [150, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const pulse = 1 + 0.035 * Math.sin(Math.max(0, frame - 150) / 7);
  // CTA line hands over to the end card: fade it out as the card fades in
  const lineOut = interpolate(frame, [146, 178], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${SAFE_X}px` }}>
      {/* CTA line lands exactly on the music impact (frame 0 of this scene) */}
      <div
        style={{
          fontFamily: FONT.headline,
          fontWeight: 800,
          fontSize: 88,
          lineHeight: 1.18,
          textAlign: "center",
          background: BRAND_GRADIENT,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          transform: `translateY(${(1 - s) * 56}px) scale(${0.96 + 0.04 * s})`,
          opacity: s * lineOut,
        }}
      >
        {line}
      </div>

      {/* end card */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: endCardIn,
          transform: `scale(${0.94 + 0.06 * endCardIn})`,
        }}
      >
        <Rise at={158} y={54} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ transform: `scale(${pulse})`, marginBottom: 44 }}>
            <LogoMark size={230} glow />
          </div>
          <div
            style={{
              fontFamily: FONT.headline,
              fontWeight: 800,
              fontSize: 92,
              letterSpacing: 2,
              color: C.fg,
            }}
          >
            SHADOW<span style={{ background: BRAND_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TALK</span>
          </div>
          <div style={{ marginTop: 26, fontFamily: FONT.body, fontWeight: 600, fontSize: 34, color: C.muted }}>
            free · no subscription · no credit card
          </div>
          <div
            style={{
              marginTop: 56,
              fontFamily: FONT.mono,
              fontSize: 30,
              color: C.glow,
              border: `1px solid ${C.borderPrimary}`,
              borderRadius: 999,
              padding: "18px 42px",
              backgroundColor: C.glass,
            }}
          >
            shadowtalk-ai.com
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------- root --

export const CampaignShort: React.FC<CampaignShortProps> = ({
  lines,
  url = "shadowtalk-ai.com",
  keyword = "",
}) => {
  const frame = useCurrentFrame();
  // exactly 5 usable lines; pad from the default pack if a bad payload slips through
  const src = Array.isArray(lines) ? lines : [];
  const safeLines = [0, 1, 2, 3, 4].map(
    (i) => src[i] || defaultCampaignProps.lines![i],
  );
  const scene = frame < 135 ? 0 : frame < 270 ? 1 : frame < 405 ? 2 : frame < 540 ? 3 : 4;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Audio src={staticFile("music-bed.mp3")} volume={0.9} />
      <Backdrop />
      <TopBrand url={url} />

      <Sequence from={0} durationInFrames={135}>
        <SceneFade len={135}>
          <HookScene line={safeLines[0]} keyword={keyword} />
        </SceneFade>
      </Sequence>
      {[1, 2, 3].map((i) => (
        <Sequence key={i} from={135 * i} durationInFrames={135}>
          <SceneFade len={135}>
            <InsightScene line={safeLines[i]} index={i} />
          </SceneFade>
        </Sequence>
      ))}
      <Sequence from={540} durationInFrames={DURATION_FRAMES - 540}>
        <CtaScene line={safeLines[4]} />
      </Sequence>

      <ProgressBar scene={scene} />
    </AbsoluteFill>
  );
};
