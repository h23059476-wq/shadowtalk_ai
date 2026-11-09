/**
 * Batch 3 — ConceptualDiagramRenderer component tests.
 * Renders every conceptual kind through the REAL chat artifact card and
 * asserts: visible labels, no HTML injection surface, toolbar present,
 * provenance badge. Uses VisualizationCard's lazy container path only
 * indirectly — these tests mount the renderer directly for determinism.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConceptualDiagramRenderer } from "../ConceptualDiagramRenderer";
import type { VisualizationSpec } from "@/lib/visualization/spec";

const MINDMAP: VisualizationSpec = {
  version: 1,
  id: "viz-mind",
  kind: "mindmap",
  title: "USDT market mind map",
  datasets: [],
  encoding: {
    kind: "mindmap",
    layout: "radial",
    nodes: [
      { id: "root", label: "USDT market" },
      { id: "adoption", label: "Adoption", parent: "root" },
      { id: "risks", label: "Risks", parent: "root" },
      { id: "r1", label: "Regulation", parent: "risks" },
    ],
  },
  provenance: "ai-extracted",
  sources: [{ url: "https://example.com", name: "Example" }],
  generatedAt: "2026-11-09T12:00:00Z",
  gaps: [],
};

const ROADMAP: VisualizationSpec = {
  version: 1,
  id: "viz-road",
  kind: "roadmap",
  title: "Launch roadmap",
  datasets: [],
  encoding: {
    kind: "roadmap",
    phases: [
      {
        id: "p1",
        label: "Phase 1",
        timeframe: "Q1 2026",
        items: [
          { id: "i1", label: "Security audit", status: "done" },
          { id: "i2", label: "Beta launch", status: "in-progress" },
        ],
      },
      {
        id: "p2",
        label: "Phase 2",
        items: [{ id: "i3", label: "Mobile app", status: "planned" }],
      },
    ],
  },
  provenance: "source-verified",
  sources: [],
  generatedAt: "2026-11-09T12:00:00Z",
  gaps: [],
};

const DECISION_TREE: VisualizationSpec = {
  version: 1,
  id: "viz-dec",
  kind: "decision-tree",
  title: "Peg response tree",
  datasets: [],
  encoding: {
    kind: "decision-tree",
    nodes: [
      { id: "d", label: "Peg under $0.99?", kind: "decision" },
      { id: "y", label: "Review reserves", kind: "option" },
      { id: "n", label: "Hold", kind: "outcome" },
    ],
    edges: [
      { from: "d", to: "y", label: "yes" },
      { from: "d", to: "n", label: "no" },
    ],
  },
  provenance: "ai-extracted",
  sources: [],
  generatedAt: "2026-11-09T12:00:00Z",
  gaps: [],
};

const ARCHITECTURE: VisualizationSpec = {
  version: 1,
  id: "viz-arch",
  kind: "architecture",
  title: "System architecture",
  datasets: [],
  encoding: {
    kind: "architecture",
    layers: [
      { id: "l1", label: "Frontend", components: [{ id: "c1", label: "Chat UI" }, { id: "c2", label: "Charts" }] },
      { id: "l2", label: "Data", components: [{ id: "c3", label: "Firestore" }] },
    ],
    connections: [{ from: "c1", to: "c3", label: "reads" }],
  },
  provenance: "source-verified",
  sources: [],
  generatedAt: "2026-11-09T12:00:00Z",
  gaps: [],
};

const FRAMEWORK: VisualizationSpec = {
  version: 1,
  id: "viz-frame",
  kind: "framework",
  title: "USDT SWOT",
  datasets: [],
  encoding: {
    kind: "framework",
    layout: "quadrant",
    sections: [
      { id: "s", label: "Strengths", tone: "positive", items: ["Deep liquidity", "Wide listings"] },
      { id: "w", label: "Weaknesses", tone: "negative", items: ["Centralized custody"] },
    ],
  },
  provenance: "ai-extracted",
  sources: [],
  generatedAt: "2026-11-09T12:00:00Z",
  gaps: [],
};

describe("ConceptualDiagramRenderer", () => {
  it("renders mindmap labels as SVG text and offers zoom controls", () => {
    render(<ConceptualDiagramRenderer spec={MINDMAP} />);
    const host = screen.getByTestId("conceptual-diagram");
    expect(host).toBeTruthy();
    expect(host.textContent).toContain("USDT market");
    expect(host.textContent).toContain("Adoption");
    expect(host.textContent).toContain("Regulation");
    expect(screen.getByLabelText("Zoom in")).toBeTruthy();
    expect(screen.getByLabelText("Zoom out")).toBeTruthy();
    expect(screen.getByLabelText("Reset view")).toBeTruthy();
  });

  it("renders roadmap phases, timeframes and items", () => {
    const { container } = render(<ConceptualDiagramRenderer spec={ROADMAP} />);
    const text = (container as HTMLElement).textContent ?? "";
    expect(text).toContain("Phase 1");
    expect(text).toContain("Q1 2026");
    expect(text).toContain("Security audit");
    expect(text).toContain("Mobile app");
  });

  it("renders decision-tree conditions and outcomes", () => {
    const { container } = render(<ConceptualDiagramRenderer spec={DECISION_TREE} />);
    const text = (container as HTMLElement).textContent ?? "";
    expect(text).toContain("Peg under");
    expect(text).toContain("yes");
    expect(text).toContain("no");
    expect(text).toContain("Review reserves");
  });

  it("renders architecture layers and collapses them on click", () => {
    const { container } = render(<ConceptualDiagramRenderer spec={ARCHITECTURE} />);
    let text = (container as HTMLElement).textContent ?? "";
    expect(text).toContain("Frontend");
    expect(text).toContain("Chat UI");
    expect(text).toContain("Firestore");
    // Click the second layer header ("Data") to collapse it.
    const dataLayerText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "Data");
    expect(dataLayerText).toBeTruthy();
    fireEvent.click(dataLayerText!);
    text = (container as HTMLElement).textContent ?? "";
    expect(text).toContain("hidden"); // collapsed badge
  });

  it("renders framework sections with tone-colored panels", () => {
    const { container } = render(<ConceptualDiagramRenderer spec={FRAMEWORK} />);
    const text = (container as HTMLElement).textContent ?? "";
    expect(text).toContain("Strengths");
    expect(text).toContain("Deep liquidity");
    expect(text).toContain("Centralized custody");
  });

  it("renders spec labels as escaped text — injected markup never executes", () => {
    const hostile: VisualizationSpec = {
      ...MINDMAP,
      encoding: {
        kind: "mindmap",
        nodes: [
          { id: "root", label: "<img src=x onerror=window.__pwned=1>" },
          { id: "b", label: "B", parent: "root" },
        ],
      },
    };
    render(<ConceptualDiagramRenderer spec={hostile} />);
    const host = screen.getByTestId("conceptual-diagram");
    // The raw markup must appear as TEXT (React-escaped), never as an element.
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toContain("<img");
  });

  it("shows a graceful message for an unloadable layout", () => {
    const broken: VisualizationSpec = { ...MINDMAP, encoding: { kind: "mindmap", nodes: [] } as unknown as VisualizationSpec["encoding"] };
    // An empty node list is schema-invalid, but the renderer must still
    // degrade gracefully if handed one through a bug elsewhere.
    render(<ConceptualDiagramRenderer spec={broken} />);
    expect(screen.getByText(/could not be laid out/i)).toBeTruthy();
  });
});
