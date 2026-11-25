/**
 * Deterministic typewriter. Progress is purely (frame - startFrame) * cps —
 * no randomness. The cursor is a 2px block that blinks via frame parity.
 */
import { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

export const Typewriter: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
  cursorColor?: string;
  /** keep blinking cursor after text finished */
  keepCursor?: boolean;
}> = ({
  text,
  startFrame,
  charsPerFrame = 1.2,
  style,
  cursorColor = COLORS.cyan,
  keepCursor = false,
}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor((frame - startFrame) * charsPerFrame));
  const shown = text.slice(0, Math.min(text.length, n));
  const done = n >= text.length;
  const cursorOn = keepCursor || !done ? frame % 14 < 7 : false;

  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {shown}
      {cursorOn ? (
        <span
          style={{
            display: "inline-block",
            width: 3,
            height: "1.05em",
            marginLeft: 2,
            verticalAlign: "-0.18em",
            backgroundColor: cursorColor,
            borderRadius: 1,
          }}
        />
      ) : null}
    </span>
  );
};

/** Frame at which a Typewriter finishes — used to time follow-up chips. */
export function typeDoneAt(text: string, startFrame: number, charsPerFrame: number): number {
  return Math.ceil(startFrame + text.length / charsPerFrame);
}

export const Cursor: React.FC<{ color?: string }> = ({ color = COLORS.cyan }) => {
  const frame = useCurrentFrame();
  const on = frame % 14 < 7;
  return (
    <span
      style={{
        display: on ? "inline-block" : "none",
        width: 10,
        height: "1.1em",
        marginLeft: 2,
        verticalAlign: "-0.2em",
        backgroundColor: color,
        borderRadius: 2,
      }}
    />
  );
};

export function mono(children: ReactNode, extra?: React.CSSProperties): React.CSSProperties {
  return { fontFamily: '"JetBrains Mono", ui-monospace, monospace', ...extra };
}
