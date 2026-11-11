/**
 * Flowchart renderer (Batch 2) — custom specification-driven SVG.
 * Layout is deterministic: nodes are layered by breadth-first distance
 * from start nodes; edges are drawn as rounded orthogonal connectors with
 * arrowheads. All labels are rendered as SVG <text> (React-escaped — no
 * HTML injection surface).
 */

import React from "react";
import type { VisualizationSpec } from "@/lib/visualization/spec";
import { VIZ_GRID_COLOR, VIZ_MUTED, VIZ_SERIES_COLORS } from "./vizTheme";

const NODE_W = 168;
const NODE_H = 46;
const GAP_X = 64;
const GAP_Y = 84;
const PADDING = 16;

interface PlacedNode {
  id: string;
  label: string;
  kind: "start" | "process" | "decision" | "end";
  level: number;
  x: number;
  y: number;
}

function layout(spec: VisualizationSpec): { nodes: PlacedNode[]; width: number; height: number } | null {
  const enc = spec.encoding;
  if (enc.kind !== "flowchart") return null;
  const flowNodes = enc.nodes;
  const flowEdges = enc.edges;
  const byId = new Map(flowNodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  for (const e of flowEdges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    adjacency.get(e.from)!.push(e.to);
  }

  // BFS level assignment (cycles safe via visited set).
  const levelOf = new Map<string, number>();
  const roots = flowNodes.filter((n) => n.kind === "start");
  const queue: Array<{ id: string; level: number }> = (
    roots.length > 0 ? roots.map((n) => n.id) : flowNodes.slice(0, 1).map((n) => n.id)
  ).map((id) => ({ id, level: 0 }));
  for (const n of flowNodes) levelOf.set(n.id, Number.POSITIVE_INFINITY);
  for (const { id, level } of queue) if ((levelOf.get(id) ?? Infinity) > level) levelOf.set(id, level);
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    for (const next of adjacency.get(id) ?? []) {
      if ((levelOf.get(next) ?? Infinity) > level + 1) {
        levelOf.set(next, level + 1);
        queue.push({ id: next, level: level + 1 });
      }
    }
  }
  // Any node unreachable from the roots gets its own trailing level.
  let maxLevel = Math.max(0, ...flowNodes.map((n) => (Number.isFinite(levelOf.get(n.id)) ? levelOf.get(n.id)! : 0)));
  for (const n of flowNodes) {
    if (!Number.isFinite(levelOf.get(n.id))) {
      maxLevel += 1;
      levelOf.set(n.id, maxLevel);
    }
  }

  // Group by level, order within level stable.
  const levels = new Map<number, string[]>();
  for (const n of flowNodes) {
    const lvl = Math.max(0, levelOf.get(n.id)!);
    if (!levels.has(lvl)) levels.set(lvl, []);
    levels.get(lvl)!.push(n.id);
  }

  const placed: PlacedNode[] = [];
  let width = 0;
  for (const [lvl, ids] of [...levels.entries()].sort((a, b) => a[0] - b[0])) {
    ids.forEach((id, i) => {
      const node = byId.get(id)!;
      placed.push({
        id,
        label: node.label,
        kind: node.kind ?? "process",
        level: lvl,
        x: PADDING + i * (NODE_W + GAP_X),
        y: PADDING + lvl * (NODE_H + GAP_Y),
      });
    });
    width = Math.max(width, PADDING + ids.length * (NODE_W + GAP_X));
  }
  const height = PADDING * 2 + (Math.max(...placed.map((n) => n.level)) + 1) * (NODE_H + GAP_Y);
  return { nodes: placed, width, height };
}

function nodeStyle(kind: PlacedNode["kind"]): { fill: string; stroke: string; text: string } {
  switch (kind) {
    case "start":
      return { fill: "hsl(195 85% 48% / 0.12)", stroke: VIZ_SERIES_COLORS[0], text: "hsl(195 85% 70%)" };
    case "end":
      return { fill: "hsl(160 60% 46% / 0.10)", stroke: "hsl(160 60% 46%)", text: "hsl(160 60% 70%)" };
    case "decision":
      return { fill: "hsl(38 92% 55% / 0.10)", stroke: "hsl(38 92% 55%)", text: "hsl(38 92% 70%)" };
    default:
      return { fill: "hsl(240 6% 10%)", stroke: "hsl(240 6% 22%)", text: "hsl(0 0% 88%)" };
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function FlowchartDiagramRenderer({ spec }: { spec: VisualizationSpec }) {
  const layouted = layout(spec);
  if (!layouted) return null;
  const enc = spec.encoding;
  if (enc.kind !== "flowchart") return null;
  const byId = new Map(layouted.nodes.map((n) => [n.id, n]));
  const edgeLabels = new Map(enc.edges.map((e) => [`${e.from}->${e.to}`, e.label]));

  return (
    <div className="w-full overflow-x-auto" role="img" aria-label={spec.title}>
      <svg
        viewBox={`0 0 ${layouted.width} ${layouted.height}`}
        width={layouted.width}
        height={layouted.height}
        style={{ maxWidth: "100%", height: "auto", minWidth: Math.min(layouted.width, 640) }}
      >
        <defs>
          <marker id={`viz-arrow-${spec.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={VIZ_MUTED} />
          </marker>
        </defs>

        {enc.edges.map((edge, i) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x + NODE_W / 2;
          const y1 = from.y + NODE_H;
          const x2 = to.x + NODE_W / 2;
          const y2 = to.y;
          const midY = (y1 + y2) / 2;
          const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          const label = edgeLabels.get(`${edge.from}->${edge.to}`);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={VIZ_MUTED} strokeWidth={1.4} markerEnd={`url(#viz-arrow-${spec.id})`} />
              {label && (
                <text x={(x1 + x2) / 2} y={midY - 4} fontSize={10} fill={VIZ_MUTED} textAnchor="middle">
                  {truncate(label, 24)}
                </text>
              )}
            </g>
          );
        })}

        {layouted.nodes.map((n) => {
          const style = nodeStyle(n.kind);
          const cx = n.x + NODE_W / 2;
          return (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx={n.kind === "decision" ? 14 : 9}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={1.2}
              />
              <text x={cx} y={n.y + NODE_H / 2 + 4} fontSize={12} fill={style.text} textAnchor="middle">
                {truncate(n.label, 24)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
