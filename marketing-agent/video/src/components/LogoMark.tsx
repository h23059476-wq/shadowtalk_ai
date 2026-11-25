import React from "react";
import { C } from "../theme";

/**
 * ShadowTalk mark — "half-lit message orb": a chat bubble whose left half
 * carries the brand gradient (the lit side) while the right half stays
 * dark with a single message dot (the shadow side). Pure SVG, crisp at
 * any scale.
 */
export const LogoMark: React.FC<{ size: number; glow?: boolean }> = ({
  size,
  glow = false,
}) => {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        overflow: "visible",
        filter: glow
          ? `drop-shadow(0 0 ${size * 0.22}px rgba(26,198,255,0.35))`
          : `drop-shadow(0 0 ${size * 0.1}px rgba(26,198,255,0.18))`,
      }}
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.glow} />
          <stop offset="55%" stopColor={C.primary} />
          <stop offset="100%" stopColor={C.secondary} />
        </linearGradient>
        <clipPath id={`left-${id}`}>
          <path d="M 8 8 L 55 8 L 55 92 L 8 92 Z" />
        </clipPath>
      </defs>

      {/* chat bubble body + tail */}
      <path
        d="M 22 10 L 78 10 Q 90 10 90 22 L 90 62 Q 90 74 78 74 L 44 74 L 26 92 L 26 74 Q 10 74 10 62 L 10 22 Q 10 10 22 10 Z"
        fill="rgba(255,255,255,0.045)"
        stroke="rgba(26,198,255,0.45)"
        strokeWidth={2.5}
      />
      {/* lit half */}
      <path
        d="M 22 10 L 78 10 Q 90 10 90 22 L 90 62 Q 90 74 78 74 L 44 74 L 26 92 L 26 74 Q 10 74 10 62 L 10 22 Q 10 10 22 10 Z"
        fill={`url(#grad-${id})`}
        opacity={0.92}
        clipPath={`url(#left-${id})`}
      />
      {/* message dot on the shadow side */}
      <circle cx={66} cy={42} r={6.5} fill={C.primary} />
    </svg>
  );
};

/** Wordmark shown beside the mark once it docks (mark itself keeps flying). */
export const DockedBrand: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <div
      style={{
        opacity,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "Sora, sans-serif",
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: 4,
          color: C.fgSoft,
          whiteSpace: "nowrap",
        }}
      >
        SHADOW<span style={{ color: C.primary }}>TALK</span>
      </div>
    </div>
  );
};
