/**
 * DiagramEngine — Mode B: styled Mermaid with the locked ShadowTalk theme.
 *
 * The LLM supplies declarative Mermaid syntax only; theming (dark slate
 * nodes, #6366F1 accent edges, curved basis connectors, system fonts) is
 * locked in visualTheme.ts. Includes interactive pan & zoom so complex
 * architecture diagrams stay readable. Fully offline — mermaid and dagre
 * are bundled, no CDN.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react";
import mermaid from "mermaid";
import { MERMAID_CONFIG, MERMAID_THEME_VARIABLES } from "../visualTheme";
import type { ShadowDiagramVisual } from "../visualContract";

let mermaidInitialized = false;

function ensureMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    ...MERMAID_CONFIG,
    themeVariables: { ...MERMAID_THEME_VARIABLES },
  });
  mermaidInitialized = true;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

export interface DiagramEngineProps {
  visual: ShadowDiagramVisual;
  height?: number;
}

/** The diagram surface with pan & zoom — the studio frame lives in ShadowVisualRenderer. */
const DiagramEngine: React.FC<DiagramEngineProps> = ({ visual, height = 360 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const renderId = useMemo(() => `sv-diagram-${Math.random().toString(36).slice(2, 10)}`, []);

  const code = useMemo(() => visual.code, [visual.code]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    ensureMermaid();

    const render = async () => {
      const surface = surfaceRef.current;
      if (!surface) return;
      try {
        const { svg } = await mermaid.render(renderId, code);
        if (cancelled) return;
        // securityLevel:"strict" has sanitized the markup; mount it directly.
        surface.innerHTML = svg;
        const el = surface.querySelector("svg");
        if (el) {
          el.style.maxWidth = "none";
          el.style.display = "block";
          el.style.margin = "0 auto";
        }
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Mermaid render failed.");
      }
    };
    void render();

    return () => {
      cancelled = true;
    };
  }, [code, renderId]);

  /* ---- Pan & zoom ---- */
  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // plain scroll keeps page scroll natural
    e.preventDefault();
    setZoom((z) => clampScale(z * (e.deltaY < 0 ? 1.12 : 0.89)));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    setPan({ x: drag.originX + (e.clientX - drag.startX), y: drag.originY + (e.clientY - drag.startY) });
  };

  const endDrag = () => {
    dragState.current = null;
  };

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative" data-testid="shadow-diagram-engine">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl"
        style={{ height, cursor: dragState.current ? "grabbing" : "grab", touchAction: "none" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        <div
          ref={surfaceRef}
          className="flex min-h-full min-w-full items-center justify-center transition-transform duration-100"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#0B0D12]">
          <p className="max-w-[80%] text-center text-xs text-rose-300/80">{error}</p>
        </div>
      )}

      {/* Zoom controls — bottom-right glass cluster */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#131620]/85 p-1 backdrop-blur-md">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => clampScale(z * 0.85))}
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[2.6rem] select-none text-center text-[10px] font-medium tabular-nums text-white/45">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => clampScale(z * 1.18))}
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-white/[0.08]" />
        <button
          type="button"
          aria-label="Reset view"
          onClick={reset}
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Pan hint — only while idle at 100% */}
      {zoom === 1 && pan.x === 0 && pan.y === 0 && !error && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-[#131620]/70 px-2 py-1 text-[10px] text-white/35 backdrop-blur-sm">
          <Move className="h-3 w-3" />
          Drag to pan · Ctrl+scroll to zoom
        </div>
      )}
    </div>
  );
};

export default DiagramEngine;
