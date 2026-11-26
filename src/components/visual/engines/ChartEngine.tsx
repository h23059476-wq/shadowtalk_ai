/**
 * ChartEngine — Mode A: Apache ECharts with the locked ShadowTalk theme.
 *
 * The LLM only supplies DATA (titles, labels, series, unit). Every visual
 * decision — palette, gradients, bar radius, dashed splitLines, glass
 * tooltips, typography — is decided here by visualTheme.ts, so the model
 * cannot produce off-brand visuals. Fully offline: ECharts is bundled, no
 * CDN, no web fonts.
 */

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import {
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  ScatterChart,
  SankeyChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  buildEChartsTheme,
  verticalGradient,
  withAlpha,
  VISUAL_PALETTE,
  VISUAL_SURFACE,
} from "../visualTheme";
import type { ShadowChartVisual } from "../visualContract";

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  ScatterChart,
  SankeyChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const THEME_NAME = "shadowtalk-studio";
let themeRegistered = false;

function ensureTheme() {
  if (themeRegistered) return;
  // Axis defaults (categoryAxis/valueAxis keys) live on the theme so
  // per-chart options stay data-only.
  echarts.registerTheme(THEME_NAME, buildEChartsTheme());
  themeRegistered = true;
}

const BAR_RADIUS = [6, 6, 0, 0] as const;

/** Build the ECharts option for a validated chart visual. Data in, style locked. */
export function buildChartOption(visual: ShadowChartVisual): echarts.EChartsCoreOption {
  const { chartType, labels, series, unit } = visual;
  const theme = buildEChartsTheme();
  const showLegend = series.length > 1 && chartType !== "sankey" && chartType !== "pie" && chartType !== "donut";
  const manyPoints = series.some((s) => Array.isArray(s.data) && s.data.length > 40);

  // The title is rendered by the studio frame, not inside the plot.
  const base: echarts.EChartsCoreOption = {
    backgroundColor: "transparent",
    legend: showLegend
      ? { ...theme.legend, bottom: 0, left: "center", padding: [4, 0, 0, 0] }
      : { show: false },
    tooltip: { ...theme.tooltip, trigger: chartType === "pie" || chartType === "donut" ? "item" : "axis" },
    textStyle: theme.textStyle,
    animationDuration: theme.animationDuration,
  };

  if (chartType === "pie" || chartType === "donut") {
    const data = labels.map((name, i) => ({
      name,
      value: (series[0]?.data as Array<number | null>)?.[i] ?? 0,
      itemStyle: { color: VISUAL_PALETTE[i % VISUAL_PALETTE.length] },
    }));
    return {
      ...base,
      series: [
        {
          type: "pie",
          radius: chartType === "donut" ? ["52%", "78%"] : ["0%", "78%"],
          center: ["50%", "48%"],
          data,
          itemStyle: {
            borderRadius: 8,
            borderColor: VISUAL_SURFACE.background,
            borderWidth: 2,
          },
          label: {
            color: VISUAL_SURFACE.textMuted,
            fontSize: 11,
            fontFamily: VISUAL_SURFACE.fontFamily,
            formatter: "{b}\n{d}%",
          },
          labelLine: { lineStyle: { color: "rgba(255,255,255,0.16)" } },
        },
      ],
    };
  }

  if (chartType === "radar") {
    const maxByAxis = labels.map((_, i) => {
      let max = 0;
      for (const s of series) {
        const v = (s.data as Array<number | null>)?.[i];
        if (typeof v === "number" && Number.isFinite(v)) max = Math.max(max, v);
      }
      return max > 0 ? Math.ceil(max * 1.15) : 1;
    });
    return {
      ...base,
      radar: {
        indicator: labels.map((name, i) => ({ name, max: maxByAxis[i] })),
        radius: "62%",
        center: ["50%", "50%"],
        axisName: { color: VISUAL_SURFACE.textMuted, fontSize: 11 },
        splitLine: { lineStyle: { color: VISUAL_SURFACE.divider } },
        splitArea: {
          areaStyle: { color: ["rgba(255,255,255,0.015)", "rgba(255,255,255,0.03)"] },
        },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.10)" } },
      },
      series: [
        {
          type: "radar",
          data: series.map((s, i) => ({
            name: s.name,
            value: s.data as Array<number | null>,
            lineStyle: { width: 2.5, color: VISUAL_PALETTE[i % VISUAL_PALETTE.length] },
            itemStyle: { color: VISUAL_PALETTE[i % VISUAL_PALETTE.length] },
            areaStyle: { color: withAlpha(VISUAL_PALETTE[i % VISUAL_PALETTE.length], 0.14) },
            symbolSize: 5,
          })),
        },
      ],
    };
  }

  if (chartType === "sankey") {
    const nodeSet = new Map<string, void>();
    const links: Array<{ source: string; target: string; value: number }> = [];
    for (const s of series) {
      if (Array.isArray(s.data) && s.data.length > 0 && typeof s.data[0] === "object") {
        for (const link of s.data as Array<{ source: string; target: string; value: number }>) {
          nodeSet.set(link.source);
          nodeSet.set(link.target);
          links.push(link);
        }
      }
    }
    const nodes = [...nodeSet.keys()].map((name, i) => ({
      name,
      itemStyle: { color: VISUAL_PALETTE[i % VISUAL_PALETTE.length] },
    }));
    return {
      ...base,
      series: [
        {
          type: "sankey",
          left: 12,
          right: 90,
          top: 12,
          bottom: 12,
          data: nodes,
          links,
          nodeWidth: 14,
          nodeGap: 10,
          emphasis: { focus: "adjacency" },
          lineStyle: { color: "gradient", opacity: 0.28, curveness: 0.5 },
          itemStyle: { borderColor: "rgba(255,255,255,0.10)", borderWidth: 1 },
          label: { color: VISUAL_SURFACE.text, fontSize: 11 },
        },
      ],
    };
  }

  // line | area | bar | scatter — cartesian charts
  type CartesianSeries = Record<string, unknown> & { name: string };
  const cartesianSeries: CartesianSeries[] = series.map((s, i) => {
    const color = VISUAL_PALETTE[i % VISUAL_PALETTE.length];
    const data = s.data as Array<number | null>;
    if (chartType === "bar") {
      return {
        name: s.name,
        type: "bar",
        data,
        barMaxWidth: 30,
        itemStyle: {
          borderRadius: BAR_RADIUS,
          color: verticalGradient(color, 0.92, 0.55),
        },
        emphasis: { itemStyle: { color } },
      };
    }
    if (chartType === "scatter") {
      return {
        name: s.name,
        type: "scatter",
        data,
        symbolSize: 11,
        itemStyle: { color, opacity: 0.85, borderColor: withAlpha(color, 0.4), borderWidth: 1 },
      };
    }
    // line | area
    return {
      name: s.name,
      type: "line",
      data,
      smooth: true,
      smoothMonotone: "x",
      showSymbol: !manyPoints,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2.5, color },
      itemStyle: { color },
      ...(chartType === "area"
        ? { areaStyle: { color: verticalGradient(color, 0.34, 0.02) } }
        : {}),
    };
  });

  const valueAxisExtra: Record<string, unknown> = {};
  if (unit) valueAxisExtra.name = unit;

  return {
    ...base,
    grid: { ...theme.grid, ...(showLegend ? { bottom: 42 } : {}) },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: chartType === "bar",
      ...(theme.categoryAxis as object),
    },
    yAxis: {
      type: "value",
      axisLabel: { ...(theme.valueAxis as { axisLabel: object }).axisLabel, formatter: (v: number) => compactNumber(v) },
      splitLine: (theme.valueAxis as { splitLine: object }).splitLine,
      scale: chartType !== "bar",
      ...valueAxisExtra,
    },
    series: cartesianSeries,
    ...(manyPoints && (chartType === "line" || chartType === "area")
      ? { dataZoom: [{ type: "inside" }] }
      : {}),
  };
}

/** Compact axis numbers: 1.2k, 3.4M — keeps the studio look clean. */
function compactNumber(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${v}`;
}

export interface ChartEngineProps {
  visual: ShadowChartVisual;
  /** Pixel height of the plot area. */
  height?: number;
}

/** The chart surface only — the studio frame lives in ShadowVisualRenderer. */
const ChartEngine: React.FC<ChartEngineProps> = ({ visual, height = 320 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const option = useMemo(() => buildChartOption(visual), [visual]);

  useEffect(() => {
    ensureTheme();
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, THEME_NAME, { renderer: "canvas" });
    chartRef.current = chart;
    chart.setOption(option);

    // Auto-responsive — charts never clip or overflow.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height: h } = entry.contentRect;
        if (width > 0 && h > 0) chart.resize({ width, height: h, animation: { duration: 160 } });
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [option]);

  return (
    <div
      ref={containerRef}
      data-testid="shadow-chart-engine"
      style={{ width: "100%", height, minHeight: 200 }}
      role="img"
      aria-label={visual.title}
    />
  );
};

export default ChartEngine;
