/**
 * DataChartRenderer (Batch 2) — Recharts-based renderers for the numeric
 * spec kinds: line, area, bar, bar-grouped, pie, donut, scatter, radar and
 * a custom SVG candlestick.
 *
 * Security: every string from the spec (titles, labels, ticks) is rendered
 * through React text nodes / SVG <text> — never as HTML. ChartConfig keys
 * are fixed series indices (s0…s5) so no spec-controlled string can reach
 * the CSS interpolator inside ui/chart's ChartStyle.
 */

import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartLegendContent, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type { VizDataset, VizField, VisualizationSpec } from "@/lib/visualization/spec";
import {
  VIZ_GRID_COLOR,
  VIZ_MUTED,
  VIZ_SERIES_COLORS,
  VIZ_CANDLE_UP,
  VIZ_CANDLE_DOWN,
  formatCompact,
  formatTickDate,
  formatWithField,
} from "./vizTheme";

const HEIGHT = 280;

function fieldOf(ds: VizDataset, key: string): VizField | undefined {
  return ds.fields.find((f) => f.key === key);
}

function fixedConfig(ds: VizDataset, keys: string[]): ChartConfig {
  const config: ChartConfig = {};
  keys.slice(0, VIZ_SERIES_COLORS.length).forEach((key, i) => {
    const field = fieldOf(ds, key);
    config[`s${i}`] = {
      label: field?.label ?? key,
      color: VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length],
    };
  });
  return config;
}

const tooltipProps = {
  cursor: { stroke: VIZ_GRID_COLOR },
  content: <ChartTooltipContent indicator="line" />,
} as const;

/** Pre-mapped rows: fixed series keys (s0…) + a formatted x label. */
function mapSeriesRows(ds: VizDataset, x: string, xType: "date" | "category", y: string[]): Array<Record<string, string | number>> {
  return ds.rows
    .map((row) => {
      const rawX = row[x];
      const label =
        xType === "date" && typeof rawX === "string"
          ? formatTickDate(rawX)
          : rawX === null || rawX === undefined
            ? "—"
            : String(rawX);
      const out: Record<string, string | number> = { x: label };
      y.forEach((key, i) => {
        const v = row[key];
        out[`s${i}`] = typeof v === "number" && Number.isFinite(v) ? v : 0;
      });
      return out;
    })
    .filter((row) => row.x !== undefined);
}

function yField(ds: VizDataset, key: string): VizField | undefined {
  return fieldOf(ds, key);
}

function SeriesChart({ spec, height = HEIGHT }: { spec: VisualizationSpec; height?: number }) {
  const enc = spec.encoding;
  if (enc.kind === "scatter") return <ScatterView spec={spec} height={height} />;
  if (!("x" in enc) || !("y" in enc) || !Array.isArray(enc.y)) return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;
  const y = enc.y.slice(0, 4);
  const rows = mapSeriesRows(ds, enc.x, enc.xType, y);
  const config = fixedConfig(ds, y);
  const valueFields = y.map((k) => yField(ds, k));
  const showLegend = y.length > 1;
  const tickFormatter = (v: number) => formatCompact(v);

  const axes = (
    <>
      <CartesianGrid stroke={VIZ_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="x"
        tick={{ fill: VIZ_MUTED, fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: VIZ_GRID_COLOR }}
        minTickGap={24}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fill: VIZ_MUTED, fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={56}
        tickFormatter={tickFormatter}
        domain={["auto", "auto"]}
      />
      <Tooltip {...tooltipProps} />
      {showLegend && <Legend content={<ChartLegendContent />} />}
    </>
  );

  if (spec.kind === "line") {
    return (
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            {axes}
            {y.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={`s${i}`}
                name={valueFields[i]?.label ?? key}
                stroke={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]}
                strokeWidth={2}
                dot={rows.length <= 24 ? { r: 2.5, strokeWidth: 0, fill: VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length] } : false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  if (spec.kind === "area") {
    return (
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              {y.map((_, i) => (
                <linearGradient key={i} id={`viz-area-${spec.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {y.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={`s${i}`}
                name={valueFields[i]?.label ?? key}
                stroke={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]}
                strokeWidth={2}
                fill={`url(#viz-area-${spec.id}-${i})`}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  // bar / bar-grouped
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          {axes}
          {y.map((key, i) => (
            <Bar
              key={key}
              dataKey={`s${i}`}
              name={valueFields[i]?.label ?? key}
              fill={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={42}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function ScatterView({ spec, height = HEIGHT }: { spec: VisualizationSpec; height?: number }) {
  const enc = spec.encoding;
  if (enc.kind !== "scatter") return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;
  const xField = fieldOf(ds, enc.x);
  const yFieldDef = fieldOf(ds, enc.y);
  const rows = ds.rows
    .filter((r) => typeof r[enc.x] === "number" && typeof r[enc.y] === "number")
    .map((r) => ({
      x: r[enc.x] as number,
      y: r[enc.y] as number,
      label: enc.label && typeof r[enc.label] === "string" ? (r[enc.label] as string) : "",
    }));
  const config: ChartConfig = { s0: { label: yFieldDef?.label ?? enc.y, color: VIZ_SERIES_COLORS[0] } };
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={VIZ_GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={xField?.label ?? enc.x}
            tick={{ fill: VIZ_MUTED, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: VIZ_GRID_COLOR }}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yFieldDef?.label ?? enc.y}
            tick={{ fill: VIZ_MUTED, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: VIZ_GRID_COLOR }}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Scatter data={rows} fill={VIZ_SERIES_COLORS[0]} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function ShareChart({ spec, height = HEIGHT }: { spec: VisualizationSpec; height?: number }) {
  const enc = spec.encoding;
  if (enc.kind !== "pie" && enc.kind !== "donut") return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;
  const valueField = fieldOf(ds, enc.value);
  const rows = ds.rows
    .filter((r) => typeof r[enc.value] === "number")
    .map((r) => ({
      name: String(r[enc.label] ?? "—").slice(0, 60),
      value: r[enc.value] as number,
    }));
  const config: ChartConfig = {};
  rows.slice(0, VIZ_SERIES_COLORS.length).forEach((row, i) => {
    config[`s${i}`] = { label: row.name, color: VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length] };
  });
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltipContent indicator="dot" />} />
          <Legend content={<ChartLegendContent />} />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={spec.kind === "donut" ? "52%" : 0}
            outerRadius="80%"
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive={false}
            label={({ percent }) => (typeof percent === "number" && percent >= 0.05 ? `${Math.round(percent * 100)}%` : undefined)}
          >
            {rows.map((row, i) => (
              <Cell key={i} fill={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function RadarView({ spec, height = HEIGHT }: { spec: VisualizationSpec; height?: number }) {
  const enc = spec.encoding;
  if (enc.kind !== "radar") return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;
  const rows = ds.rows.map((row) => {
    const out: Record<string, string | number> = { axis: String(row[enc.label] ?? "—").slice(0, 40) };
    enc.value.forEach((key, i) => {
      const v = row[key];
      out[`s${i}`] = typeof v === "number" ? v : 0;
    });
    return out;
  });
  const config = fixedConfig(ds, enc.value);
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke={VIZ_GRID_COLOR} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: VIZ_MUTED, fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: VIZ_MUTED, fontSize: 10 }} tickFormatter={(v: number) => formatCompact(v)} stroke={VIZ_GRID_COLOR} />
          <Tooltip content={<ChartTooltipContent indicator="dot" />} />
          {enc.value.map((key, i) => (
            <Radar
              key={key}
              dataKey={`s${i}`}
              name={fieldOf(ds, key)?.label ?? key}
              stroke={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]}
              fill={VIZ_SERIES_COLORS[i % VIZ_SERIES_COLORS.length]}
              fillOpacity={0.22}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

/**
 * Candlestick — custom specification-driven SVG. Rendered only for specs
 * whose dataset passed the strict OHLC validation (see spec.ts).
 */
export function CandlestickChart({ spec, height = HEIGHT }: { spec: VisualizationSpec; height?: number }) {
  const enc = spec.encoding;
  if (enc.kind !== "candlestick") return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;
  const candles = ds.rows
    .filter(
      (r) =>
        typeof r[enc.open] === "number" &&
        typeof r[enc.high] === "number" &&
        typeof r[enc.low] === "number" &&
        typeof r[enc.close] === "number",
    )
    .map((r) => ({
      time: typeof r[enc.time] === "string" ? (r[enc.time] as string) : "",
      open: r[enc.open] as number,
      high: r[enc.high] as number,
      low: r[enc.low] as number,
      close: r[enc.close] as number,
    }))
    .slice(0, 120);
  if (candles.length === 0) return null;

  const W = 720;
  const H = 300;
  const pad = { top: 12, right: 8, bottom: 26, left: 8 };
  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const span = hi - lo || 1;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const slot = innerW / candles.length;
  const bodyW = Math.max(Math.min(slot * 0.62, 18), 2);
  const y = (v: number) => pad.top + (1 - (v - lo) / span) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: lo + f * span, y: y(lo + f * span) }));

  return (
    <div className="w-full" role="img" aria-label={`${spec.title} candlestick chart`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet">
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={g.y} y2={g.y} stroke={VIZ_GRID_COLOR} strokeDasharray="3 3" />
            <text x={pad.left + 2} y={g.y - 3} fontSize={10} fill={VIZ_MUTED}>
              {formatCompact(g.v)}
            </text>
          </g>
        ))}
        {candles.map((c, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const up = c.close >= c.open;
          const color = up ? VIZ_CANDLE_UP : VIZ_CANDLE_DOWN;
          const bodyTop = y(Math.max(c.open, c.close));
          const bodyBottom = y(Math.min(c.open, c.close));
          const label = c.time ? formatTickDate(c.time) : "";
          const showLabel = candles.length <= 16 || i % Math.ceil(candles.length / 12) === 0;
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
              <rect
                x={cx - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={Math.max(bodyBottom - bodyTop, 1)}
                fill={up ? "transparent" : color}
                stroke={color}
                strokeWidth={1.2}
                rx={1}
              />
              {showLabel && (
                <text x={cx} y={H - 8} fontSize={10} fill={VIZ_MUTED} textAnchor="middle">
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] border" style={{ borderColor: VIZ_CANDLE_UP }} /> up
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: VIZ_CANDLE_DOWN }} /> down
        </span>
      </div>
    </div>
  );
}

/**
 * Dispatch a numeric spec to the right Recharts view.
 * Unknown/mismatched encodings render nothing (the container never passes
 * unvalidated specs anyway).
 */
export function DataChartRenderer({ spec, height = HEIGHT }: { spec: VisualizationSpec; height?: number }) {
  switch (spec.encoding.kind) {
    case "line":
    case "area":
    case "bar":
    case "bar-grouped":
    case "scatter":
      return <SeriesChart spec={spec} height={height} />;
    case "pie":
    case "donut":
      return <ShareChart spec={spec} height={height} />;
    case "radar":
      return <RadarView spec={spec} height={height} />;
    case "candlestick":
      return <CandlestickChart spec={spec} height={height} />;
    default:
      return null;
  }
}

export function formatSeriesValue(spec: VisualizationSpec, value: number): string {
  const enc = spec.encoding;
  if ("y" in enc && Array.isArray(enc.y) && enc.y.length === 1) {
    const ds = spec.datasets.find((d) => d.id === enc.datasetId);
    const field = ds ? yField(ds, enc.y[0]) : undefined;
    return formatWithField(value, field);
  }
  return formatCompact(value);
}
