/**
 * Batch 1 (Research-to-Visualization) — visualization intent detection.
 *
 * Precision-first contract (spec Phase 4): explicit visualization asks are
 * classified (create / refine / explain + type/time-range/comparison hints),
 * while normal questions must NEVER be hijacked into the visualization
 * pipeline. A bare "compare X with Y" stays a normal research question.
 */

import { describe, it, expect } from "vitest";
import { detectVisualizationIntent } from "../intentDetector";

describe("visualization intent — create", () => {
  it("understands 'show me this visually' with no chart terminology", () => {
    const intent = detectVisualizationIntent("Show me this visually.");
    expect(intent?.kind).toBe("create");
    expect(intent?.confidence).toBeGreaterThanOrEqual(0.9);
    expect(intent?.requestedType).toBeUndefined();
  });

  it("understands 'turn your previous research into a chart'", () => {
    const intent = detectVisualizationIntent("Turn your previous research into a chart.");
    expect(intent?.kind).toBe("create");
  });

  it("extracts an explicit chart type from 'show as a bar chart'", () => {
    const intent = detectVisualizationIntent("Show as a bar chart");
    expect(intent?.kind).toBe("create");
    expect(intent?.requestedType).toBe("bar");
  });

  it("understands diagram requests ('turn this into a timeline')", () => {
    const intent = detectVisualizationIntent("Turn this data into a timeline");
    expect(intent?.kind).toBe("create");
    expect(intent?.requestedType).toBe("timeline");
  });

  it("captures comparison targets only with explicit chart context", () => {
    const intent = detectVisualizationIntent("Compare USDT with USDC in a bar chart");
    expect(intent?.kind).toBe("create");
    expect(intent?.compareTarget?.toLowerCase()).toBe("usdc");
    expect(intent?.requestedType).toBe("bar");
  });
});

describe("visualization intent — refine", () => {
  it("understands 'make it a line chart' as a type refinement", () => {
    const intent = detectVisualizationIntent("Make it a line chart.");
    expect(intent?.kind).toBe("refine");
    expect(intent?.requestedType).toBe("line");
  });

  it("understands 'make it interactive'", () => {
    const intent = detectVisualizationIntent("Make it interactive.");
    expect(intent?.kind).toBe("refine");
    expect(intent?.interactive).toBe(true);
  });

  it("understands a follow-up time range ('show the last 30 days')", () => {
    const intent = detectVisualizationIntent("Show the last 30 days");
    expect(intent?.kind).toBe("refine");
    expect(intent?.timeRange).toBe("last 30 days");
  });
});

describe("visualization intent — explain", () => {
  it("understands 'explain this chart'", () => {
    const intent = detectVisualizationIntent("Explain this chart.");
    expect(intent?.kind).toBe("explain");
  });
});

describe("visualization intent — must NOT hijack normal chat", () => {
  it("returns null for ordinary questions", () => {
    expect(detectVisualizationIntent("What is the weather tomorrow?")).toBeNull();
    expect(detectVisualizationIntent("Search the web for cute cats")).toBeNull();
    expect(detectVisualizationIntent("Explain quantum computing")).toBeNull();
    expect(detectVisualizationIntent("Write an email to my landlord")).toBeNull();
  });

  it("returns null for a bare comparison without chart context", () => {
    // Documented Batch-1 limitation: handled by AI-assisted classification in Batch 3.
    expect(detectVisualizationIntent("Compare USDT with USDC")).toBeNull();
  });

  it("returns null for empty or oversized input", () => {
    expect(detectVisualizationIntent("")).toBeNull();
    expect(detectVisualizationIntent("   ")).toBeNull();
    expect(detectVisualizationIntent("chart ".repeat(200))).toBeNull();
  });
});
