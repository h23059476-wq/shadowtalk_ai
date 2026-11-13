/**
 * ConceptualDiagramRenderer (Batch 3) — trusted spec-driven SVG for the
 * conceptual kinds: mindmap, roadmap, decision-tree, architecture,
 * framework.
 *
 * Security model (identical to FlowchartDiagramRenderer): layout is fully
 * deterministic, every label is rendered as an SVG <text> child (React
 * escapes it) and nothing from the spec is ever interpreted as markup,
 * code or a URL. Zoom/pan/collapse are pure view-state — they never touch
 * the spec.
 *
 * Interactions: wheel/pinch zoom (buttons included), pointer-drag pan,
 * click-to-collapse on mindmap branches and architecture layers.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VisualizationSpec } from "@/lib/visualization/spec";
import { VIZ_GRID_COLOR, VIZ_MUTED, VIZ_SERIES_COLORS } from "./vizTheme";

/* ------------------------------------------------------------------ */
/* Shared geometry + text helpers                                      */
/* ------------------------------------------------------------------ */

const PADDING = 18;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Wrap a label into at most `maxLines` lines of `maxChars` chars. */
function wrapLabel(s: string, maxChars: number, maxLines: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else if (candidate.length > maxChars) {
      // Single word longer than the line — hard-split it.
      lines.push(candidate.slice(0, maxChars));
      current = candidate.slice(maxChars);
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    // Merge the remainder into the last line with an ellipsis.
    const consumed = lines.join(" ").length;
    if (consumed < s.length - 1) lines[maxLines - 1] = truncate(s.slice(s.indexOf(lines[maxLines - 1])), maxChars);
  }
  return lines.length > 0 ? lines : [""];
}

interface ViewportState {
  scale: number;
  tx: number;
  ty: number;
}

/* ------------------------------------------------------------------ */
/* Mindmap layout — mirrored horizontal tree ("radial") or plain tree  */
/* ------------------------------------------------------------------ */

interface MindPlaced {
  id: string;
  label: string;
  note?: string;
  depth: number;
  x: number;
  y: number;
  side: -1 | 1;
  childCount: number;
}

const MIND_NODE_W = 132;
const MIND_NODE_H = 40;
const MIND_GAP_X = 56;
const MIND_GAP_Y = 14;

function layoutMindmap(
  spec: VisualizationSpec,
  collapsed: Set<string>,
): { nodes: MindPlaced[]; links: Array<{ from: MindPlaced; to: MindPlaced }>; width: number; height: number } | null {
  if (spec.encoding.kind !== "mindmap") return null;
  const byId = new Map(spec.encoding.nodes.map((n) => [n.id, n]));
  const root = spec.encoding.nodes.find((n) => !n.parent);
  if (!root) return null;

  const childrenOf = new Map<string, string[]>();
  for (const n of spec.encoding.nodes) {
    if (!n.parent) continue;
    if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
    childrenOf.get(n.parent)!.push(n.id);
  }

  // Subtree leaf counts + depths drive the vertical slot allocation.
  const leafCount = (id: string, depth: number): { leaves: number; depth: number } => {
    if (collapsed.has(id) || depth > 8) return { leaves: 1, depth: 0 };
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return { leaves: 1, depth: 0 };
    let leaves = 0;
    let maxDepth = 0;
    for (const kid of kids) {
      const r = leafCount(kid, depth + 1);
      leaves += r.leaves;
      maxDepth = Math.max(maxDepth, r.depth + 1);
    }
    return { leaves, depth: maxDepth };
  };

  const placed: MindPlaced[] = [];
  const links: Array<{ from: MindPlaced; to: MindPlaced }> = [];
  const sideOf = new Map<string, -1 | 1>();

  // Depth-1 branches alternate right/left; deeper nodes inherit the side.
  (childrenOf.get(root.id) ?? []).forEach((id, i) => sideOf.set(id, i % 2 === 0 ? 1 : -1));
  const sideOfDeep = (id: string): -1 | 1 => {
    let p = byId.get(id)?.parent;
    while (p) {
      if (sideOf.has(p)) return sideOf.get(p)!;
      p = byId.get(p)?.parent;
    }
    return 1;
  };
  const place = (id: string, depth: number, yTop: number, slotHeight: number, side: -1 | 1): MindPlaced | null => {
    if (depth > 8 || slotHeight < MIND_NODE_H * 0.6) return null;
    const node = byId.get(id);
    if (!node) return null;
    const kids = collapsed.has(id) ? [] : childrenOf.get(id) ?? [];
    const totalLeaves = leafCount(id, depth).leaves;
    // The subtree occupies its whole slot; child slots subdivide it
    // proportionally, so the node centers vertically in the slot.
    const nodeY = yTop + slotHeight / 2 - MIND_NODE_H / 2;
    const placedNode: MindPlaced = {
      id,
      label: node.label,
      ...(node.note ? { note: node.note } : {}),
      depth,
      x: 0,
      y: nodeY,
      side: depth === 0 ? 1 : side,
      childCount: kids.length,
    };
    placed.push(placedNode);
    let childCursor = yTop;
    for (const kid of kids) {
      const kidLeaves = leafCount(kid, depth + 1).leaves;
      const kidSlot = slotHeight * (kidLeaves / totalLeaves);
      const placedKid = place(kid, depth + 1, childCursor, kidSlot, side);
      if (placedKid) links.push({ from: placedNode, to: placedKid });
      childCursor += kidSlot;
    }
    return placedNode;
  };

  const rootInfo = leafCount(root.id, 0);
  const height = rootInfo.leaves * (MIND_NODE_H + MIND_GAP_Y) + PADDING * 2;
  const maxDepth = Math.max(rootInfo.depth, 1);
  // Geometry: right-side depth-d nodes start after the root's right edge;
  // left-side mirror it. No overlap with the center column at any depth.
  const halfSpan = MIND_NODE_W / 2 + MIND_GAP_X + (maxDepth - 1) * (MIND_NODE_W + MIND_GAP_X) + MIND_NODE_W;
  const width = 2 * halfSpan + PADDING * 2;
  const center = width / 2;

  const rootPlaced = place(root.id, 0, PADDING, height - PADDING * 2, 1);
  if (!rootPlaced) return null;

  for (const n of placed) {
    if (n.depth === 0) {
      n.x = center - MIND_NODE_W / 2;
      continue;
    }
    const side = n.depth === 1 ? n.side : sideOfDeep(n.id);
    n.side = side;
    const offset = MIND_NODE_W / 2 + MIND_GAP_X + (n.depth - 1) * (MIND_NODE_W + MIND_GAP_X);
    n.x = side >= 0 ? center + offset : center - offset - MIND_NODE_W;
  }

  // Links reference placed node objects by id (resolve for safety).
  const byPlaced = new Map(placed.map((n) => [n.id, n]));
  const resolvedLinks = links.flatMap((l) => {
    const from = byPlaced.get(l.from.id);
    const to = byPlaced.get(l.to.id);
    return from && to ? [{ from, to }] : [];
  });

  return { nodes: placed, links: resolvedLinks, width, height };
}

/* ------------------------------------------------------------------ */
/* Roadmap layout — phase columns                                      */
/* ------------------------------------------------------------------ */

interface RoadCol {
  x: number;
  y: number;
  w: number;
  label: string;
  timeframe?: string;
  items: Array<{ x: number; y: number; w: number; h: number; label: string; status?: string }>;
  h: number;
}

const ROAD_COL_W = 176;
const ROAD_ITEM_H = 40;
const ROAD_ITEM_GAP = 10;
const ROAD_HEADER_H = 56;

function layoutRoadmap(spec: VisualizationSpec): { cols: RoadCol[]; width: number; height: number } | null {
  if (spec.encoding.kind !== "roadmap") return null;
  const cols: RoadCol[] = [];
  let maxBottom = ROAD_HEADER_H;
  spec.encoding.phases.forEach((phase, i) => {
    const x = PADDING + i * (ROAD_COL_W + 24);
    const items: RoadCol["items"] = [];
    let y = PADDING + ROAD_HEADER_H;
    for (const item of phase.items) {
      items.push({ x, y, w: ROAD_COL_W, h: ROAD_ITEM_H, label: item.label, ...(item.status ? { status: item.status } : {}) });
      y += ROAD_ITEM_H + ROAD_ITEM_GAP;
    }
    cols.push({
      x,
      y: PADDING,
      w: ROAD_COL_W,
      label: phase.label,
      ...(phase.timeframe ? { timeframe: phase.timeframe } : {}),
      items,
      h: ROAD_HEADER_H + items.length * (ROAD_ITEM_H + ROAD_ITEM_GAP),
    });
    maxBottom = Math.max(maxBottom, y - ROAD_ITEM_GAP);
  });
  const height = maxBottom + PADDING + 8;
  const width = PADDING + cols.length * (ROAD_COL_W + 24);
  return { cols, width, height };
}

const STATUS_COLOR: Record<string, string> = {
  done: VIZ_SERIES_COLORS[3],
  "in-progress": VIZ_SERIES_COLORS[0],
  "at-risk": VIZ_SERIES_COLORS[4],
  planned: VIZ_MUTED,
};

/* ------------------------------------------------------------------ */
/* Decision tree layout — BFS levels like the flowchart                */
/* ------------------------------------------------------------------ */

interface FlowPlaced {
  id: string;
  label: string;
  kind: "decision" | "option" | "outcome";
  x: number;
  y: number;
}

const DT_NODE_W = 158;
const DT_NODE_H = 46;
const DT_GAP_X = 40;
const DT_GAP_Y = 76;

function layoutDecisionTree(spec: VisualizationSpec): {
  nodes: FlowPlaced[];
  edges: Array<{ x1: number; y1: number; x2: number; y2: number; label?: string; lx: number; ly: number }>;
  /** Zero-edge nodes (acknowledged via gaps) — rendered in their own band. */
  unlinked: FlowPlaced[];
  entryId: string;
  width: number;
  height: number;
} | null {
  if (spec.encoding.kind !== "decision-tree") return null;
  const enc = spec.encoding;
  const byId = new Map(enc.nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  for (const e of enc.edges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    adjacency.get(e.from)!.push(e.to);
  }
  const linked = new Set<string>();
  for (const e of enc.edges) {
    linked.add(e.from);
    linked.add(e.to);
  }
  const entry = enc.nodes.find((n) => n.kind === "decision") ?? enc.nodes[0];
  const start = entry;
  const levelOf = new Map<string, number>([[start.id, 0]]);
  const queue: string[] = [start.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    // P2-1: adjacency preserves spec edge order and the node loop follows
    // spec node order — the layout is fully deterministic across renders.
    for (const next of adjacency.get(id) ?? []) {
      if (!levelOf.has(next)) {
        levelOf.set(next, (levelOf.get(id) ?? 0) + 1);
        queue.push(next);
      }
    }
  }
  const levels = new Map<number, string[]>();
  for (const n of enc.nodes) {
    if (!linked.has(n.id)) continue; // unlinked nodes get their own band below
    const lvl = levelOf.get(n.id) ?? 0;
    if (!levels.has(lvl)) levels.set(lvl, []);
    levels.get(lvl)!.push(n.id);
  }
  const placed: FlowPlaced[] = [];
  let width = 0;
  for (const [lvl, ids] of [...levels.entries()].sort((a, b) => a[0] - b[0])) {
    ids.forEach((id, i) => {
      const node = byId.get(id)!;
      placed.push({
        id,
        label: node.label,
        kind: node.kind ?? "option",
        x: PADDING + i * (DT_NODE_W + DT_GAP_X),
        y: PADDING + lvl * (DT_NODE_H + DT_GAP_Y),
      });
      width = Math.max(width, PADDING + (i + 1) * (DT_NODE_W + DT_GAP_X));
    });
  }
  const byPlaced = new Map(placed.map((n) => [n.id, n]));
  // P1-2 (SD-1): edge labels move from the bare midpoint (where a long
  // diagonal's label landed next to an unrelated node in the viz-8
  // screenshot) to a point near the source edge, staggered per sibling
  // branch so labels from one decision never stack on top of each other.
  const outTotal = new Map<string, number>();
  for (const e of enc.edges) outTotal.set(e.from, (outTotal.get(e.from) ?? 0) + 1);
  const outSeen = new Map<string, number>();
  const at = (t: number, a: number, b: number, c: number, d: number): number =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  const edges = enc.edges.flatMap((e) => {
    const from = byPlaced.get(e.from);
    const to = byPlaced.get(e.to);
    if (!from || !to) return [];
    const x1 = from.x + DT_NODE_W / 2;
    const y1 = from.y + DT_NODE_H;
    const x2 = to.x + DT_NODE_W / 2;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    const t = 0.32;
    const idx = outSeen.get(e.from) ?? 0;
    outSeen.set(e.from, idx + 1);
    const stagger = (idx - (outTotal.get(e.from)! - 1) / 2) * 12;
    const lx = Math.max(14, Math.min(width - 14, at(t, x1, x1, x2, x2)));
    const ly = at(t, y1, midY, midY, y2) + stagger;
    return [{ x1, y1, x2, y2, ...(e.label ? { label: e.label } : {}), lx, ly }];
  });
  const mainBottom = PADDING * 2 + (Math.max(...placed.map((n) => n.y), 0) + DT_NODE_H);
  // P1-2 (CD-2): acknowledged unlinked nodes are no longer camouflaged in
  // the root row — they render in a separate captioned band with a dashed
  // border, visually distinct from connected option nodes.
  const unlinked = enc.nodes
    .filter((n) => !linked.has(n.id))
    .map((n, i) => ({
      id: n.id,
      label: n.label,
      kind: n.kind ?? "option",
      x: PADDING + i * (DT_NODE_W + DT_GAP_X),
      y: 0, // y assigned below once the band origin is known
    }));
  let height = mainBottom;
  if (unlinked.length > 0) {
    const bandY = mainBottom + 26;
    for (const n of unlinked) n.y = bandY;
    width = Math.max(width, PADDING + unlinked.length * (DT_NODE_W + DT_GAP_X));
    height = bandY + DT_NODE_H + PADDING;
  }
  return { nodes: placed, edges, unlinked, entryId: entry.id, width, height };
}

/* ------------------------------------------------------------------ */
/* Architecture layout — stacked layer bands                           */
/* ------------------------------------------------------------------ */

interface ArchBand {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  collapsed: boolean;
  /** Total components in the layer (even when collapsed). */
  totalCount: number;
  components: Array<{ id: string; x: number; y: number; w: number; h: number; label: string }>;
}

const ARCH_COMP_W = 148;
const ARCH_COMP_H = 40;
const ARCH_LABEL_W = 120;

function layoutArchitecture(spec: VisualizationSpec, collapsed: Set<string>): { bands: ArchBand[]; comps: Map<string, { x: number; y: number; w: number; h: number }>; width: number; height: number } | null {
  if (spec.encoding.kind !== "architecture") return null;
  const bands: ArchBand[] = [];
  const comps = new Map<string, { x: number; y: number; w: number; h: number }>();
  let y = PADDING;
  const innerW = Math.max(...spec.encoding.layers.map((l) => l.components.length), 1) * (ARCH_COMP_W + 14) + 14;
  const bandW = ARCH_LABEL_W + innerW;
  for (const layer of spec.encoding.layers) {
    const isCollapsed = collapsed.has(layer.id);
    const rows = isCollapsed ? 0 : Math.ceil(layer.components.length / Math.max(Math.floor((bandW - ARCH_LABEL_W - 14) / (ARCH_COMP_W + 14)), 1));
    const h = isCollapsed ? 40 : Math.max(ARCH_COMP_H + 24, 12 + rows * (ARCH_COMP_H + 12) + 12);
    const band: ArchBand = {
      id: layer.id,
      x: PADDING,
      y,
      w: bandW,
      h,
      label: layer.label,
      collapsed: isCollapsed,
      totalCount: layer.components.length,
      components: [],
    };
    if (!isCollapsed) {
      const perRow = Math.max(Math.floor((bandW - ARCH_LABEL_W - 14) / (ARCH_COMP_W + 14)), 1);
      layer.components.forEach((comp, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const cx = PADDING + ARCH_LABEL_W + 14 + col * (ARCH_COMP_W + 14);
        const cy = y + 16 + row * (ARCH_COMP_H + 12);
        band.components.push({ id: comp.id, x: cx, y: cy, w: ARCH_COMP_W, h: ARCH_COMP_H, label: comp.label });
        comps.set(comp.id, { x: cx, y: cy, w: ARCH_COMP_W, h: ARCH_COMP_H });
      });
    }
    bands.push(band);
    y += h + 18;
  }
  return { bands, comps, width: bandW + PADDING * 2, height: y + PADDING };
}

/* ------------------------------------------------------------------ */
/* Framework layout — quadrant grid / pillars                          */
/* ------------------------------------------------------------------ */

interface FramePanel {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone?: string;
  items: string[];
}

const FRAME_PANEL_MIN_W = 250;

function layoutFramework(spec: VisualizationSpec): { panels: FramePanel[]; width: number; height: number } | null {
  if (spec.encoding.kind !== "framework") return null;
  const layout = spec.encoding.layout ?? "quadrant";
  const sections = spec.encoding.sections;
  const panels: FramePanel[] = [];
  if (layout === "quadrant") {
    const cols = sections.length <= 2 ? sections.length : 2;
    const rows = Math.ceil(sections.length / cols);
    const panelW = Math.max(FRAME_PANEL_MIN_W, 300);
    const panelH = Math.max(150, 46 + Math.max(...sections.map((s) => s.items.length), 1) * 26);
    sections.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      panels.push({
        x: PADDING + col * (panelW + 24),
        y: PADDING + row * (panelH + 24),
        w: panelW,
        h: panelH,
        label: s.label,
        ...(s.tone ? { tone: s.tone } : {}),
        items: s.items,
      });
    });
    const width = PADDING + cols * (panelW + 24);
    const height = PADDING + rows * (panelH + 24);
    return { panels, width, height };
  }
  // pillars — vertical columns per section
  const panelW = Math.max(190, Math.min(300, 640 / sections.length));
  const maxItems = Math.max(...sections.map((s) => s.items.length), 1);
  const panelH = 56 + maxItems * 26 + 16;
  sections.forEach((s, i) => {
    panels.push({
      x: PADDING + i * (panelW + 18),
      y: PADDING,
      w: panelW,
      h: panelH,
      label: s.label,
      ...(s.tone ? { tone: s.tone } : {}),
      items: s.items,
    });
  });
  return { panels, width: PADDING + sections.length * (panelW + 18), height: panelH + PADDING * 2 };
}

const TONE_COLOR: Record<string, string> = {
  positive: VIZ_SERIES_COLORS[3],
  negative: VIZ_SERIES_COLORS[5],
  neutral: VIZ_SERIES_COLORS[1],
};

/* ------------------------------------------------------------------ */
/* Viewport (zoom / pan) — shared by every layout                      */
/* ------------------------------------------------------------------ */

function useViewport(width: number, height: number, displayHeight: number, containerWidth: number) {
  // Fit the whole diagram into the visible area initially (never upscale,
  // floor at 0.25); pan/zoom serve detail reading. Reset returns to fit.
  const fitScale = Math.min(
    1,
    Math.max(0.25, Math.min(displayHeight / Math.max(height, 1), containerWidth > 0 ? containerWidth / Math.max(width, 1) : 1)),
  );
  const [view, setView] = useState<ViewportState>({ scale: fitScale, tx: 0, ty: 0 });
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const fit = useCallback(() => {
    setView({ scale: fitScale, tx: 0, ty: 0 });
  }, [fitScale]);

  const zoomBy = useCallback((factor: number) => {
    setView((v) => ({ ...v, scale: Math.min(3, Math.max(0.25, v.scale * factor)) }));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    setView((v) => ({ ...v, tx: drag.tx + dx, ty: drag.ty + dy }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  const dragMoved = () => dragRef.current?.moved ?? false;

  // Reset view when the diagram content changes size.
  useEffect(() => {
    fit();
  }, [width, height, fit]);

  return { view, setView, zoomBy, fit, onPointerDown, onPointerMove, onPointerUp, dragMoved, displayHeight };
}

/* ------------------------------------------------------------------ */
/* The renderer                                                        */
/* ------------------------------------------------------------------ */

export function ConceptualDiagramRenderer({ spec, height }: { spec: VisualizationSpec; height?: number }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track the container width so the initial view can fit both dimensions.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver !== "function") return;
    try {
      const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
      ro.observe(el);
      setContainerWidth(el.clientWidth);
      return () => ro.disconnect();
    } catch {
      return undefined; // environments without ResizeObserver keep the height-fit fallback
    }
  }, []);

  const layout = useMemo(() => {
    switch (spec.encoding.kind) {
      case "mindmap": return layoutMindmap(spec, collapsed);
      case "roadmap": return layoutRoadmap(spec);
      case "decision-tree": return layoutDecisionTree(spec);
      case "architecture": return layoutArchitecture(spec, collapsed);
      case "framework": return layoutFramework(spec);
      default: return null;
    }
  }, [spec, collapsed]);

  const dims = layout ?? { width: 320, height: 160 };
  const displayHeight = height ?? 300;
  const viewport = useViewport(dims.width, dims.height, displayHeight, containerWidth);

  // Wheel zoom (non-passive, attached imperatively).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      viewport.setView((v) => ({ ...v, scale: Math.min(3, Math.max(0.25, v.scale * (e.deltaY > 0 ? 0.92 : 1.08))) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.setView]);

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!layout) {
    return (
      <p className="text-xs text-muted-foreground">This diagram could not be laid out.</p>
    );
  }

  return (
    <div className="relative w-full" data-testid="conceptual-diagram">
      {/* Toolbar */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-border/40 bg-background/70 p-1 backdrop-blur">
        <button
          type="button"
          aria-label="Zoom out"
          className="h-6 w-6 rounded text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          onClick={() => viewport.zoomBy(0.85)}
        >
          −
        </button>
        <span className="w-9 text-center text-[10px] tabular-nums text-muted-foreground">{Math.round(viewport.view.scale * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          className="h-6 w-6 rounded text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          onClick={() => viewport.zoomBy(1.15)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Reset view"
          className="h-6 rounded px-1.5 text-[10px] text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          onClick={viewport.fit}
        >
          Reset
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex cursor-grab touch-none select-none items-center justify-center overflow-hidden rounded-xl border border-border/30 bg-[hsl(240_8%_5_/_0.4)] active:cursor-grabbing"
        style={{ height: displayHeight }}
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerLeave={viewport.onPointerUp}
      >
        <svg
          viewBox={`0 0 ${dims.width} ${dims.height}`}
          width={dims.width}
          height={dims.height}
          className="block"
          style={{ transform: `translate(${viewport.view.tx}px, ${viewport.view.ty}px) scale(${viewport.view.scale})`, transformOrigin: "center center", maxWidth: "none" }}
        >
          {spec.encoding.kind === "mindmap" && <MindmapSvg spec={spec} layout={layout as NonNullable<ReturnType<typeof layoutMindmap>>} collapsed={collapsed} onToggle={toggleCollapsed} dragMoved={viewport.dragMoved} />}
          {spec.encoding.kind === "roadmap" && <RoadmapSvg spec={spec} layout={layout as NonNullable<ReturnType<typeof layoutRoadmap>>} />}
          {spec.encoding.kind === "decision-tree" && <DecisionTreeSvg spec={spec} layout={layout as NonNullable<ReturnType<typeof layoutDecisionTree>>} specId={spec.id} />}
          {spec.encoding.kind === "architecture" && <ArchitectureSvg spec={spec} layout={layout as NonNullable<ReturnType<typeof layoutArchitecture>>} onToggle={toggleCollapsed} dragMoved={viewport.dragMoved} />}
          {spec.encoding.kind === "framework" && <FrameworkSvg layout={layout as NonNullable<ReturnType<typeof layoutFramework>>} />}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground/50">
        Scroll to zoom · drag to pan{spec.encoding.kind === "mindmap" || spec.encoding.kind === "architecture" ? " · click a node to collapse/expand" : ""}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kind-specific SVG subtrees                                          */
/* ------------------------------------------------------------------ */

function MindmapSvg({
  spec,
  layout,
  collapsed,
  onToggle,
  dragMoved,
}: {
  spec: VisualizationSpec;
  layout: NonNullable<ReturnType<typeof layoutMindmap>>;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  dragMoved: () => boolean;
}) {
  if (spec.encoding.kind !== "mindmap") return null;
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  return (
    <g role="img" aria-label={spec.title}>
      {layout.links.map((link, i) => {
        const from = byId.get(link.from.id);
        const to = byId.get(link.to.id);
        if (!from || !to) return null;
        // Attach at the edges FACING each other (works for both sides).
        const fromRight = to.x + MIND_NODE_W / 2 > from.x + MIND_NODE_W / 2;
        const x1 = fromRight ? from.x + MIND_NODE_W : from.x;
        const x2 = fromRight ? to.x : to.x + MIND_NODE_W;
        const y1 = from.y + MIND_NODE_H / 2;
        const y2 = to.y + MIND_NODE_H / 2;
        const midX = (x1 + x2) / 2;
        const color = to.depth === 1 ? VIZ_SERIES_COLORS[(i + 1) % VIZ_SERIES_COLORS.length] : VIZ_MUTED;
        return (
          <path
            key={`l${i}`}
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={to.depth === 1 ? 1.6 : 1.1}
            opacity={to.depth === 1 ? 0.8 : 0.5}
          />
        );
      })}
      {layout.nodes.map((n) => {
        const isRoot = n.depth === 0;
        const hasKids = n.childCount > 0;
        const isCollapsed = collapsed.has(n.id);
        const lines = wrapLabel(n.label, 20, 2);
        const color = isRoot ? VIZ_SERIES_COLORS[0] : n.depth === 1 ? VIZ_SERIES_COLORS[(layout.nodes.findIndex((x) => x.id === n.id) + 2) % VIZ_SERIES_COLORS.length] : VIZ_MUTED;
        return (
          <g
            key={n.id}
            style={{ cursor: hasKids ? "pointer" : "default" }}
            onClick={() => {
              if (!dragMoved() && hasKids) onToggle(n.id);
            }}
          >
            <rect
              x={n.x}
              y={n.y}
              width={MIND_NODE_W}
              height={MIND_NODE_H}
              rx={isRoot ? 20 : 9}
              fill={isRoot ? "hsl(195 85% 48% / 0.16)" : "hsl(240 6% 10%)"}
              stroke={isRoot ? VIZ_SERIES_COLORS[0] : n.depth === 1 ? color : "hsl(240 6% 22%)"}
              strokeWidth={isRoot ? 1.6 : 1.1}
            />
            {lines.map((line, li) => (
              <text
                key={li}
                x={n.x + MIND_NODE_W / 2}
                y={n.y + MIND_NODE_H / 2 + 4 + (li - (lines.length - 1) / 2) * 13}
                fontSize={isRoot ? 12.5 : 11}
                fontWeight={isRoot || n.depth === 1 ? 600 : 400}
                fill={isRoot ? "hsl(195 85% 75%)" : n.depth === 1 ? "hsl(0 0% 90%)" : "hsl(0 0% 78%)"}
                textAnchor="middle"
              >
                {line}
              </text>
            ))}
            {hasKids && (
              <text x={n.x + (n.side >= 0 ? MIND_NODE_W - 10 : 10)} y={n.y + MIND_NODE_H - 6} fontSize={9} fill={VIZ_MUTED} textAnchor={n.side >= 0 ? "end" : "start"}>
                {isCollapsed ? `+${n.childCount}` : "–"}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function RoadmapSvg({ spec, layout }: { spec: VisualizationSpec; layout: NonNullable<ReturnType<typeof layoutRoadmap>> }) {
  if (spec.encoding.kind !== "roadmap") return null;
  return (
    <g role="img" aria-label={spec.title}>
      {layout.cols.map((col, i) => (
        <g key={`c${i}`}>
          <rect x={col.x} y={col.y} width={col.w} height={ROAD_HEADER_H} rx={10} fill="hsl(195 85% 48% / 0.10)" stroke={VIZ_SERIES_COLORS[0]} strokeWidth={1.1} />
          <text x={col.x + col.w / 2} y={col.y + 22} fontSize={12} fontWeight={700} fill="hsl(195 85% 75%)" textAnchor="middle">
            {truncate(col.label, 24)}
          </text>
          {col.timeframe && (
            <text x={col.x + col.w / 2} y={col.y + 40} fontSize={10} fill={VIZ_MUTED} textAnchor="middle">
              {truncate(col.timeframe, 26)}
            </text>
          )}
          {col.items.map((item, j) => (
            <g key={`i${i}-${j}`}>
              <rect x={item.x} y={item.y} width={item.w} height={item.h} rx={8} fill="hsl(240 6% 10%)" stroke="hsl(240 6% 20%)" strokeWidth={1} />
              <circle cx={item.x + 14} cy={item.y + item.h / 2} r={4} fill={STATUS_COLOR[item.status ?? "planned"] ?? VIZ_MUTED} />
              {wrapLabel(item.label, 24, 2).map((line, li) => (
                <text
                  key={li}
                  x={item.x + 26}
                  y={item.y + item.h / 2 + 4 + (li - 0.5) * 12}
                  fontSize={10.5}
                  fill="hsl(0 0% 84%)"
                >
                  {truncate(line, 24)}
                </text>
              ))}
            </g>
          ))}
          {i < layout.cols.length - 1 && (
            <path
              d={`M ${col.x + col.w + 4} ${PADDING + ROAD_HEADER_H / 2} L ${col.x + col.w + 20} ${PADDING + ROAD_HEADER_H / 2}`}
              stroke={VIZ_MUTED}
              strokeWidth={1.2}
              markerEnd="none"
            />
          )}
        </g>
      ))}
    </g>
  );
}

function DecisionTreeSvg({ spec, layout, specId }: { spec: VisualizationSpec; layout: NonNullable<ReturnType<typeof layoutDecisionTree>>; specId: string }) {
  if (spec.encoding.kind !== "decision-tree") return null;
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const entry = byId.get(layout.entryId);
  return (
    <g role="img" aria-label={spec.title}>
      <defs>
        <marker id={`dt-arrow-${specId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={VIZ_MUTED} />
        </marker>
      </defs>
      {layout.edges.map((edge, i) => {
        const midY = (edge.y1 + edge.y2) / 2;
        const d = `M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`;
        return (
          <g key={`e${i}`}>
            <path d={d} fill="none" stroke={VIZ_MUTED} strokeWidth={1.3} markerEnd={`url(#dt-arrow-${specId})`} />
            {edge.label && (
              <text x={edge.lx} y={edge.ly - 4} fontSize={10} fill={VIZ_MUTED} textAnchor="middle">
                {truncate(edge.label, 22)}
              </text>
            )}
          </g>
        );
      })}
      {layout.nodes.map((n) => {
        const isDecision = n.kind === "decision";
        const isOutcome = n.kind === "outcome";
        const lines = wrapLabel(n.label, 24, 2);
        return (
          <g key={n.id}>
            {entry && n.id === layout.entryId && (
              <text
                x={n.x + DT_NODE_W / 2}
                y={n.y - 6}
                fontSize={9}
                fill={VIZ_SERIES_COLORS[4]}
                textAnchor="middle"
                fontWeight={700}
                letterSpacing={1.5}
              >
                START
              </text>
            )}
            <rect
              x={n.x}
              y={n.y}
              width={DT_NODE_W}
              height={DT_NODE_H}
              rx={isDecision ? 14 : isOutcome ? 18 : 9}
              fill={isDecision ? "hsl(38 92% 55% / 0.12)" : isOutcome ? "hsl(160 60% 46% / 0.10)" : "hsl(240 6% 10%)"}
              stroke={isDecision ? VIZ_SERIES_COLORS[4] : isOutcome ? VIZ_SERIES_COLORS[3] : "hsl(240 6% 22%)"}
              strokeWidth={isDecision || isOutcome ? 1.3 : 1.1}
            />
            {lines.map((line, li) => (
              <text
                key={li}
                x={n.x + DT_NODE_W / 2}
                y={n.y + DT_NODE_H / 2 + 4 + (li - (lines.length - 1) / 2) * 13}
                fontSize={11}
                fill={isDecision ? "hsl(38 92% 72%)" : isOutcome ? "hsl(160 60% 70%)" : "hsl(0 0% 86%)"}
                textAnchor="middle"
                fontWeight={isDecision ? 600 : 400}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
      {layout.unlinked.length > 0 && (
        <g>
          <text x={PADDING} y={layout.unlinked[0].y - 8} fontSize={10} fill={VIZ_MUTED} textAnchor="start" fontStyle="italic">
            Unlinked — intentionally outside the decision flow
          </text>
          {layout.unlinked.map((n) => {
            const lines = wrapLabel(n.label, 24, 2);
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={DT_NODE_W}
                  height={DT_NODE_H}
                  rx={9}
                  fill="hsl(240 6% 10%)"
                  stroke="hsl(240 6% 30%)"
                  strokeWidth={1.1}
                  strokeDasharray="4 3"
                />
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={n.x + DT_NODE_W / 2}
                    y={n.y + DT_NODE_H / 2 + 4 + (li - (lines.length - 1) / 2) * 13}
                    fontSize={11}
                    fill="hsl(0 0% 72%)"
                    textAnchor="middle"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
}

function ArchitectureSvg({
  spec,
  layout,
  onToggle,
  dragMoved,
}: {
  spec: VisualizationSpec;
  layout: NonNullable<ReturnType<typeof layoutArchitecture>>;
  onToggle: (id: string) => void;
  dragMoved: () => boolean;
}) {
  if (spec.encoding.kind !== "architecture") return null;
  return (
    <g role="img" aria-label={spec.title}>
      {layout.bands.map((band) => (
        <g key={band.label}>
          <rect x={band.x} y={band.y} width={band.w} height={band.h} rx={12} fill="hsl(240 6% 8% / 0.7)" stroke="hsl(240 6% 18%)" strokeWidth={1} />
          <g
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (!dragMoved()) onToggle(band.id);
            }}
          >
            <text x={band.x + 12} y={band.y + (band.collapsed ? 24 : 22)} fontSize={12} fontWeight={700} fill="hsl(270 60% 74%)">
              {truncate(band.label, 18)}
            </text>
            <text x={band.x + 12} y={band.y + (band.collapsed ? 34 : 36)} fontSize={9} fill={VIZ_MUTED}>
              {band.collapsed ? `+${band.totalCount} hidden` : `${band.components.length} component${band.components.length === 1 ? "" : "s"}`}
            </text>
          </g>
          {band.components.map((comp) => (
            <g key={comp.id}>
              <rect x={comp.x} y={comp.y} width={comp.w} height={comp.h} rx={8} fill="hsl(240 6% 12%)" stroke={VIZ_SERIES_COLORS[1]} strokeWidth={1} opacity={0.95} />
              {wrapLabel(comp.label, 22, 2).map((line, li) => (
                <text
                  key={li}
                  x={comp.x + comp.w / 2}
                  y={comp.y + comp.h / 2 + 4 + (li - 0.5) * 12}
                  fontSize={10.5}
                  fill="hsl(0 0% 86%)"
                  textAnchor="middle"
                >
                  {truncate(line, 22)}
                </text>
              ))}
            </g>
          ))}
        </g>
      ))}
      {(spec.encoding.connections ?? []).map((conn, i) => {
        const from = layout.comps.get(conn.from);
        const to = layout.comps.get(conn.to);
        if (!from || !to) return null;
        const x1 = from.x + from.w / 2;
        const y1 = from.y + from.h;
        const x2 = to.x + to.w / 2;
        const y2 = to.y;
        return (
          <path
            key={`conn${i}`}
            d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
            fill="none"
            stroke={VIZ_GRID_COLOR}
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
        );
      })}
    </g>
  );
}

function FrameworkSvg({ layout }: { layout: NonNullable<ReturnType<typeof layoutFramework>> }) {
  return (
    <g role="img" aria-label="framework">
      {layout.panels.map((panel, i) => {
        const toneColor = TONE_COLOR[panel.tone ?? "neutral"] ?? VIZ_SERIES_COLORS[1];
        return (
          <g key={`p${i}`}>
            <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx={12} fill="hsl(240 6% 8% / 0.7)" stroke={toneColor} strokeWidth={1.2} opacity={0.95} />
            <rect x={panel.x} y={panel.y} width={panel.w} height={4} rx={2} fill={toneColor} opacity={0.8} />
            <text x={panel.x + 14} y={panel.y + 26} fontSize={12.5} fontWeight={700} fill="hsl(0 0% 92%)">
              {truncate(panel.label, Math.floor(panel.w / 7.5))}
            </text>
            {panel.items.slice(0, 12).map((item, j) =>
              wrapLabel(item, Math.floor(panel.w / 6.4), 1).map((line, li) => (
                <text key={`${j}-${li}`} x={panel.x + 22} y={panel.y + 48 + j * 26 + li * 12} fontSize={10.5} fill="hsl(0 0% 80%)">
                  • {truncate(line, Math.floor(panel.w / 6.4))}
                </text>
              )),
            )}
          </g>
        );
      })}
    </g>
  );
}

export default ConceptualDiagramRenderer;
