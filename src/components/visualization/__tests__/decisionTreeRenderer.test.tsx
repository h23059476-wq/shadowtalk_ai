/**
 * Permanent regression tests — P2-2 promotion of the investigation harness
 * (case E at the rendering layer) plus the P1-2/P2-1 renderer fixes.
 * References: docs/investigation/…Report.docx, Tables 2–3.
 *
 *  - E2 (CD-2 fixed, inverted): an acknowledged unlinked node is NO LONGER
 *    drawn in the root row — it renders in a separate captioned band with a
 *    dashed border, below the connected graph;
 *  - P2-1: the entry decision carries a START cue; condition labels are
 *    drawn near their source edge (no longer at the bare midpoint of long
 *    diagonals).
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { ConceptualDiagramRenderer } from "../ConceptualDiagramRenderer";
import type { VisualizationSpec } from "../../../lib/visualization/spec";

const SPEC: VisualizationSpec = {
  version: 1,
  id: "dt-render-test",
  kind: "decision-tree",
  title: "USDT exposure decision tree",
  datasets: [],
  encoding: {
    kind: "decision-tree",
    nodes: [
      { id: "peg", label: "Peg under $0.99?", kind: "decision" },
      { id: "reserves", label: "Reserves verified?", kind: "decision" },
      { id: "hold", label: "Hold allocation", kind: "outcome" },
      { id: "reduce", label: "Reduce exposure", kind: "outcome" },
      { id: "maintain", label: "Maintain with alerts", kind: "outcome" },
      { id: "notes", label: "Review reserve reports", kind: "option" },
    ],
    edges: [
      { from: "peg", to: "reserves", label: "yes" },
      { from: "peg", to: "hold", label: "no" },
      { from: "reserves", to: "reduce", label: "no" },
      { from: "reserves", to: "maintain", label: "yes" },
    ],
  },
  provenance: "ai-extracted",
  sources: [],
  generatedAt: "2026-11-13T00:00:00Z",
  gaps: ["Includes an unlinked side note 'Review reserve reports' (unlinked) — intentionally outside the flow."],
};

function rects(container: HTMLElement): Array<{ x: number; y: number; dashed: boolean }> {
  return Array.from(container.querySelectorAll("rect")).map((r) => ({
    x: Number(r.getAttribute("x")),
    y: Number(r.getAttribute("y")),
    dashed: (r.getAttribute("stroke-dasharray") ?? "").length > 0,
  }));
}

describe("E2 / CD-2 fixed — unlinked nodes render in a distinct band", () => {
  it("places the acknowledged unlinked node below the graph with a dashed border and caption", () => {
    const { container, getByText } = render(<ConceptualDiagramRenderer spec={SPEC} height={420} />);
    const all = rects(container);
    expect(all.length).toBe(6); // 5 connected + 1 unlinked
    const dashed = all.filter((r) => r.dashed);
    expect(dashed).toHaveLength(1);
    const connectedMaxY = Math.max(...all.filter((r) => !r.dashed).map((r) => r.y));
    expect(dashed[0].y).toBeGreaterThan(connectedMaxY + 20); // separate band, NOT the root row
    expect(getByText("Unlinked — intentionally outside the decision flow")).toBeTruthy();
    expect(getByText("Review reserve reports")).toBeTruthy();
  });

  it("renders the START cue on the entry decision", () => {
    const { getByText } = render(<ConceptualDiagramRenderer spec={SPEC} height={420} />);
    expect(getByText("START")).toBeTruthy();
  });

  it("renders every decision branch condition label exactly once", () => {
    const { container } = render(<ConceptualDiagramRenderer spec={SPEC} height={420} />);
    const labels = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .filter((t) => t === "yes" || t === "no");
    expect(labels.filter((l) => l === "yes")).toHaveLength(2);
    expect(labels.filter((l) => l === "no")).toHaveLength(2);
  });
});
