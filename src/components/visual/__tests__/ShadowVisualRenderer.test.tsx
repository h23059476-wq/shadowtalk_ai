/**
 * ShadowVisualRenderer smoke tests — frame, guardrails, engines mounting.
 *
 * echarts and mermaid are mocked (jsdom cannot run their layout/canvas
 * internals); the contract, frame, toolbar and error paths are what these
 * tests pin.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";

/* ---- Mock the heavy engines before importing the renderer ---- */
vi.mock("../engines/ChartEngine", () => ({
  default: ({ visual }: { visual: { title: string } }) => (
    <div data-testid="mock-chart-engine">{visual.title}</div>
  ),
}));
vi.mock("../engines/DiagramEngine", () => ({
  default: ({ visual }: { visual: { title: string } }) => (
    <div data-testid="mock-diagram-engine">{visual.title}</div>
  ),
}));
vi.mock("../engines/InfographicEngine", () => ({
  default: ({ visual }: { visual: { header: string } }) => (
    <div data-testid="mock-infographic-engine">{visual.header}</div>
  ),
}));

import ShadowVisualRenderer from "../ShadowVisualRenderer";

const CHART_JSON = JSON.stringify({
  mode: "chart",
  title: "Weekly actives",
  chartType: "line",
  labels: ["W1", "W2"],
  series: [{ name: "Users", data: [1, 2] }],
});

const DIAGRAM_JSON = JSON.stringify({
  mode: "diagram",
  title: "Lifecycle",
  diagramType: "flowchart",
  code: "flowchart TD\n  A --> B",
});

const INFO_JSON = JSON.stringify({
  mode: "infographic",
  header: "Why sovereign",
  layout: "grid-2",
  cards: [{ iconName: "wifi-off", title: "Offline", description: "Zero network." }],
});

describe("ShadowVisualRenderer — mode routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes a chart payload to the chart engine with the ECharts badge", async () => {
    render(<ShadowVisualRenderer payload={CHART_JSON} />);
    await waitFor(() => expect(screen.getByTestId("mock-chart-engine")).toBeTruthy());
    expect(screen.getByText("ECharts")).toBeTruthy();
    expect(screen.getByTestId("mock-chart-engine").textContent).toContain("Weekly actives");
  });

  it("routes a diagram payload to the diagram engine with the Architecture badge", async () => {
    render(<ShadowVisualRenderer payload={DIAGRAM_JSON} />);
    await waitFor(() => expect(screen.getByTestId("mock-diagram-engine")).toBeTruthy());
    expect(screen.getByText("Architecture")).toBeTruthy();
  });

  it("routes an infographic payload to the bento engine with the Bento Visual badge", async () => {
    render(<ShadowVisualRenderer payload={INFO_JSON} />);
    await waitFor(() => expect(screen.getByTestId("mock-infographic-engine")).toBeTruthy());
    expect(screen.getByText("Bento Visual")).toBeTruthy();
    expect(screen.getByTestId("mock-infographic-engine").textContent).toContain("Why sovereign");
  });

  it("accepts a pre-validated object payload", async () => {
    const visual = {
      mode: "chart" as const,
      title: "Object payload",
      chartType: "bar" as const,
      labels: ["A"],
      series: [{ name: "S", data: [1] }],
    };
    render(<ShadowVisualRenderer payload={visual} />);
    await waitFor(() => expect(screen.getByTestId("mock-chart-engine")).toBeTruthy());
    expect(screen.getByTestId("mock-chart-engine").textContent).toContain("Object payload");
  });
});

describe("ShadowVisualRenderer — studio toolbar", () => {
  it("renders the toolbar actions and offline note", async () => {
    render(<ShadowVisualRenderer payload={CHART_JSON} />);
    await waitFor(() => expect(screen.getByTestId("mock-chart-engine")).toBeTruthy());
    expect(screen.getByText("PNG (2x)")).toBeTruthy();
    expect(screen.getByText("Copy JSON")).toBeTruthy();
    expect(screen.getByText("Expand")).toBeTruthy();
    expect(screen.getByText("Rendered on-device")).toBeTruthy();
  });

  it("labels the copy action Copy Code for diagrams", async () => {
    render(<ShadowVisualRenderer payload={DIAGRAM_JSON} />);
    await waitFor(() => expect(screen.getByTestId("mock-diagram-engine")).toBeTruthy());
    expect(screen.getByText("Copy Code")).toBeTruthy();
  });
});

describe("ShadowVisualRenderer — guardrails", () => {
  it("shows a graceful rejection card for raw SVG (never renders it)", () => {
    render(<ShadowVisualRenderer payload='<svg width="10" height="10"><circle cx="5" cy="5" r="4"/></svg>' />);
    expect(screen.getByTestId("shadow-visual-invalid")).toBeTruthy();
    expect(screen.getByText(/no longer supported/)).toBeTruthy();
    expect(screen.queryByTestId("mock-chart-engine")).toBeNull();
    // The drawing itself is never mounted anywhere in the document.
    expect(document.querySelector("circle")).toBeNull();
  });

  it("shows a graceful card with the exact error for malformed JSON", () => {
    render(<ShadowVisualRenderer payload='{"mode":"chart", broken: }' />);
    expect(screen.getByTestId("shadow-visual-invalid")).toBeTruthy();
    expect(screen.getByText(/Invalid JSON/)).toBeTruthy();
  });

  it("calls onSelfCorrect ONCE with the raw payload and exact error", () => {
    const onSelfCorrect = vi.fn();
    const broken = '{"mode":"chart", broken: }';
    const { rerender } = render(
      <ShadowVisualRenderer payload={broken} onSelfCorrect={onSelfCorrect} />,
    );
    expect(onSelfCorrect).toHaveBeenCalledTimes(1);
    expect(onSelfCorrect).toHaveBeenCalledWith(broken, expect.stringContaining("Invalid JSON"));
    // Re-render with the SAME payload must not retry (loop guard).
    rerender(<ShadowVisualRenderer payload={broken} onSelfCorrect={onSelfCorrect} />);
    expect(onSelfCorrect).toHaveBeenCalledTimes(1);
  });

  it("shows an auto-correcting strip while the retry is in flight", () => {
    const onSelfCorrect = vi.fn();
    render(<ShadowVisualRenderer payload='{ "bad": json }' onSelfCorrect={onSelfCorrect} />);
    expect(screen.getByText(/Asking the model to self-correct/)).toBeTruthy();
  });

  it("does not call onSelfCorrect for valid payloads", () => {
    const onSelfCorrect = vi.fn();
    render(<ShadowVisualRenderer payload={CHART_JSON} onSelfCorrect={onSelfCorrect} />);
    expect(onSelfCorrect).not.toHaveBeenCalled();
  });
});

describe("ShadowVisualRenderer — copy fallback", () => {
  it("falls back to execCommand when the clipboard API is missing", async () => {
    const originalClipboard = navigator.clipboard;
    // Simulate an environment without clipboard permissions.
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    const execCopy = vi.fn();
    Object.defineProperty(document, "execCommand", { value: execCopy, configurable: true });

    const { default: React } = await import("react");
    const { fireEvent } = await import("@testing-library/react");
    const el: ReactElement = React.createElement(ShadowVisualRenderer, { payload: CHART_JSON });
    const { container } = render(el);
    await waitFor(() => expect(screen.getByTestId("mock-chart-engine")).toBeTruthy());

    const copyBtn = screen.getByText("Copy JSON").closest("button") as HTMLButtonElement;
    fireEvent.click(copyBtn);
    await waitFor(() => expect(execCopy).toHaveBeenCalledWith("copy"));
    expect(container).toBeTruthy();

    Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
  });
});
