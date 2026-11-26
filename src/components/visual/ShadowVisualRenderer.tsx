/**
 * ShadowVisualRenderer — the unified studio frame around every AI visual.
 *
 * Accepts a strict JSON payload (```shadowvisual fence body, or a
 * pre-validated ShadowVisual object) and routes it to one of three bundled,
 * fully-offline engines:
 *   - chart       → Apache ECharts   (badge: "ECharts")
 *   - diagram     → Mermaid          (badge: "Architecture")
 *   - infographic → Bento grid       (badge: "Bento Visual")
 *
 * Studio toolbar: Download PNG (2x Retina, via bundled html-to-image),
 * Copy JSON/Code, Expand Fullscreen.
 *
 * Guardrails: malformed payloads never throw into the chat — they are
 * auto-sanitized (mermaid), caught by an Error Boundary, and can trigger a
 * silent 1-step self-correction retry (onSelfCorrect) with the exact error
 * message so the model can re-emit corrected JSON.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Copy,
  Check,
  Download,
  LayoutGrid,
  Loader2,
  Maximize2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  parseShadowVisual,
  visualFromMermaidFence,
  type ShadowVisual,
} from "./visualContract";
import { VISUAL_SURFACE } from "./visualTheme";

/* Lazy engines — heavy libraries stay out of the chat bundle until used. */
const ChartEngine = React.lazy(() => import("./engines/ChartEngine"));
const DiagramEngine = React.lazy(() => import("./engines/DiagramEngine"));
const InfographicEngine = React.lazy(() => import("./engines/InfographicEngine"));

export type ShadowVisualMode = ShadowVisual["mode"];

const MODE_META: Record<
  ShadowVisualMode,
  { badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  chart: { badge: "ECharts", icon: BarChart3 },
  diagram: { badge: "Architecture", icon: Workflow },
  infographic: { badge: "Bento Visual", icon: LayoutGrid },
};

export interface ShadowVisualRendererProps {
  /** Raw ```shadowvisual JSON string, or an already-validated visual. */
  payload: string | ShadowVisual;
  /** Optional title override for the studio header. */
  title?: string;
  subtitle?: string;
  /** Plot height for chart/diagram modes. */
  height?: number;
  /**
   * Silent 1-step self-correction: called ONCE per payload with the raw
   * payload and the exact render/parse error. The chat layer asks the model
   * to re-emit corrected JSON. When absent, errors render as a graceful card.
   */
  onSelfCorrect?: (rawPayload: string, error: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Error boundary — nothing a visual does may crash the chat           */
/* ------------------------------------------------------------------ */

interface BoundaryState {
  error: Error | null;
}

class ShadowVisualErrorBoundary extends React.Component<
  { resetKey: string; onError: (message: string) => void; children: React.ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-200/90">This visual could not be rendered</p>
            <p className="mt-1 break-words text-xs text-white/55">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

const ShadowVisualRenderer: React.FC<ShadowVisualRendererProps> = ({
  payload,
  title,
  subtitle,
  height,
  onSelfCorrect,
  className,
}) => {
  const isRawString = typeof payload === "string";

  /* --- Parse (string payloads only; objects arrive pre-validated) --- */
  const parsed = useMemo(() => {
    if (!isRawString) return { ok: true as const, visual: payload as ShadowVisual, sanitized: false };
    return parseShadowVisual(payload);
  }, [payload, isRawString]);

  const [invalidError, setInvalidError] = useState<string | null>(
    parsed.ok === false ? parsed.error : null,
  );
  const [correcting, setCorrecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const selfCorrectedFor = useRef<string>("");

  useEffect(() => {
    setInvalidError(parsed.ok === false ? parsed.error : null);
    setCorrecting(false);
  }, [parsed]);

  /* --- Self-correction escalation (once per payload) --- */
  const rawSource = isRawString ? (payload as string) : JSON.stringify(parsed.ok === true ? parsed.visual : {});
  const requestSelfCorrect = useCallback(
    (error: string) => {
      if (!onSelfCorrect) return false;
      if (selfCorrectedFor.current === rawSource) return false; // one retry per payload
      selfCorrectedFor.current = rawSource;
      setCorrecting(true);
      onSelfCorrect(rawSource, error);
      return true;
    },
    [onSelfCorrect, rawSource],
  );

  useEffect(() => {
    // Parse failures escalate immediately (silent retry, then graceful card).
    if (parsed.ok === false) requestSelfCorrect(parsed.error);
  }, [parsed, requestSelfCorrect]);

  /* --- Toolbar actions --- */
  const handleCopy = useCallback(async () => {
    let text: string;
    if (parsed.ok === false) text = rawSource;
    else if (parsed.visual.mode === "diagram") text = parsed.visual.code;
    else text = JSON.stringify(parsed.visual, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be unavailable (http, older webviews) — fall back.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [parsed, rawSource]);

  /** 2x Retina PNG export — bundled html-to-image, zero network, fonts skipped. */
  const handleDownload = useCallback(async () => {
    const node = cardRef.current;
    if (!node || downloading) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        skipFonts: true, // never fetch webfonts — system stack only
        backgroundColor: VISUAL_SURFACE.background,
        cacheBust: false,
      });
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = dataUrl;
      a.download = `shadowtalk-visual-${stamp}.png`;
      a.click();
    } catch {
      // Export is best-effort; keep the UI silent on failure.
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  /* --- Derived display data --- */
  const visual = parsed.ok === true ? parsed.visual : null;
  const mode = visual?.mode ?? null;
  const displayTitle =
    title ?? (visual ? (visual.mode === "infographic" ? visual.header : visual.title) : "Visual");
  const displaySubtitle =
    subtitle ?? (visual && visual.mode !== "infographic" ? visual.subtitle : undefined);

  const engineBody = (plotHeight: number) => {
    if (visual === null) return null;
    if (visual.mode === "chart") return <ChartEngine visual={visual} height={plotHeight} />;
    if (visual.mode === "diagram") return <DiagramEngine visual={visual} height={plotHeight} />;
    return <InfographicEngine visual={visual} />;
  };

  const inlineHeight = height ?? (mode === "diagram" ? 380 : 320);

  /* --- Invalid payload card (after self-correction attempt or without hook) --- */
  if (parsed.ok === false) {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] ${className ?? ""}`}
        data-testid="shadow-visual-invalid"
      >
        <div className="flex items-start gap-3 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-200/90">Visual payload rejected</p>
            <p className="mt-1 break-words text-xs leading-relaxed text-white/55">{parsed.error}</p>
            {correcting && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-200/70">
                <Loader2 className="h-3 w-3 animate-spin" /> Asking the model to self-correct…
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1.5 px-2.5 text-[11px] text-white/50 hover:text-white"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            Copy JSON
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={cardRef}
        data-testid="shadow-visual-renderer"
        data-visual-mode={mode}
        className={`w-full overflow-hidden rounded-2xl ${className ?? ""}`}
        style={{
          background: VISUAL_SURFACE.background,
          border: `1px solid ${VISUAL_SURFACE.border}`,
          borderRadius: VISUAL_SURFACE.radius,
        }}
      >
        {/* Header — title + mode badge */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-white/[0.06] px-4 pb-2.5 pt-3">
          {mode && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
              {React.createElement(MODE_META[mode].icon, { className: "h-3.5 w-3.5" })}
            </span>
          )}
          <div className="mr-auto min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white/92" title={displayTitle}>
              {displayTitle}
            </p>
            {displaySubtitle && (
              <p className="truncate text-[11px] text-white/45" title={displaySubtitle}>
                {displaySubtitle}
              </p>
            )}
          </div>
          {mode && (
            <span className="rounded-full border border-indigo-400/25 bg-indigo-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300/90">
              {MODE_META[mode].badge}
            </span>
          )}
        </div>

        {/* Auto-correction strip */}
        {correcting && (
          <div className="flex items-center gap-2 border-b border-amber-400/15 bg-amber-400/[0.05] px-4 py-1.5 text-[11px] font-medium text-amber-200/75">
            <Loader2 className="h-3 w-3 animate-spin" />
            Auto-correcting this visual…
          </div>
        )}

        {/* Engine body — guarded */}
        <div className="px-4 py-3.5">
          <ShadowVisualErrorBoundary
            resetKey={rawSource}
            onError={(message) => requestSelfCorrect(message)}
          >
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{ height: inlineHeight, background: VISUAL_SURFACE.panel }}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-white/35" />
                </div>
              }
            >
              {engineBody(inlineHeight)}
            </Suspense>
          </ShadowVisualErrorBoundary>
        </div>

        {/* Studio toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-t border-white/[0.06] px-2.5 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="h-7 gap-1.5 px-2.5 text-[11px] text-white/55 hover:bg-white/[0.05] hover:text-white"
            aria-label="Download PNG at 2x resolution"
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            PNG (2x)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1.5 px-2.5 text-[11px] text-white/55 hover:bg-white/[0.05] hover:text-white"
            aria-label={visual?.mode === "diagram" ? "Copy Mermaid code" : "Copy JSON"}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {visual?.mode === "diagram" ? "Copy Code" : "Copy JSON"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(true)}
            className="h-7 gap-1.5 px-2.5 text-[11px] text-white/55 hover:bg-white/[0.05] hover:text-white"
            aria-label="Expand fullscreen"
          >
            <Maximize2 className="h-3 w-3" />
            Expand
          </Button>
          <span className="ml-auto pr-1.5 text-[10px] text-white/30">Rendered on-device</span>
        </div>
      </div>

      {/* Fullscreen viewer */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-y-auto rounded-none border-white/[0.08] bg-[#0B0D12] p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-2xl sm:border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6 text-base text-white/92">
              {mode && React.createElement(MODE_META[mode].icon, { className: "h-4 w-4 text-indigo-300" })}
              <span className="min-w-0">{displayTitle}</span>
              {mode && (
                <span className="ml-1 rounded-full border border-indigo-400/25 bg-indigo-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300/90">
                  {MODE_META[mode].badge}
                </span>
              )}
            </DialogTitle>
            {displaySubtitle && <DialogDescription className="text-xs text-white/45">{displaySubtitle}</DialogDescription>}
          </DialogHeader>
          <ShadowVisualErrorBoundary resetKey={`${rawSource}-full`} onError={(message) => requestSelfCorrect(message)}>
            <Suspense
              fallback={
                <div className="flex h-[420px] items-center justify-center rounded-xl bg-white/[0.03]">
                  <Loader2 className="h-4 w-4 animate-spin text-white/35" />
                </div>
              }
            >
              {engineBody(Math.max(460, inlineHeight))}
            </Suspense>
          </ShadowVisualErrorBoundary>
          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 gap-1.5 px-2.5 text-[11px] text-white/55 hover:text-white"
            >
              <Download className="h-3 w-3" /> PNG (2x)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Parse a bare ```mermaid fence into a diagram visual (fallback path). */
export function tryParseMermaidFence(code: string): ShadowVisual | null {
  const result = visualFromMermaidFence(code);
  return result.ok ? result.visual : null;
}

export default ShadowVisualRenderer;
