/**
 * DEV-ONLY visualization demo (Batch 2 screenshots / manual QA).
 *
 * Renders the REAL chat stack (ChatMessages → MessageBubble →
 * VisualizationCard → renderers) with the exact Batch 2 E2E scenario as
 * canned messages. Specs are produced by the real planner from the real
 * research fixture — nothing is hand-drawn.
 *
 * Guarded by import.meta.env.DEV: production builds redirect to /chatbot.
 */

import React, { useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { extractResearchDataBlocks, SHADOWDATA_LANGUAGE } from "@/lib/visualization/dataDoc";
import { detectVisualizationIntent } from "@/lib/visualization/intentDetector";
import { planVisualization, planComparison, transformKind, type ComparisonAsset } from "@/lib/visualization/planner";
import type { ResearchContext, ResearchDataBlock, ShadowDataset } from "@/lib/visualization/types";
import type { VisualizationSpec } from "@/lib/visualization/spec";

const RESEARCH_CONTENT = `### USDT market research

**Tether (USDT)** continues to trade at its dollar peg. Key figures from the sources consulted:

- Price: **$1.0001** (24h change +0.02%)
- Market capitalization: **~$180.5B**
- 24h volume: **~$90.0B**
- Circulating supply is reported at roughly 180.4B USDT.

Confidence is high for the price/market-cap pair (two independent sources agree); volume figures vary by exchange aggregation, so treat them as indicative.

\`\`\`${SHADOWDATA_LANGUAGE}
{
  "datasets": [{
    "title": "USDT market overview",
    "description": "Snapshot from cited sources",
    "columns": [
      {"key": "date", "type": "date"},
      {"key": "price_usd", "type": "currency", "unit": "USD"},
      {"key": "market_cap_usd", "type": "currency", "unit": "USD"},
      {"key": "volume_24h_usd", "type": "currency", "unit": "USD"}
    ],
    "rows": [
      {"date": "2026-11-09T00:00:00Z", "price_usd": 1.0001, "market_cap_usd": 180500000000, "volume_24h_usd": 90000000000},
      {"date": "2026-11-08T00:00:00Z", "price_usd": 1.0000, "market_cap_usd": 180100000000, "volume_24h_usd": 88000000000},
      {"date": "2026-11-07T00:00:00Z", "price_usd": 0.9999, "market_cap_usd": 179800000000, "volume_24h_usd": 85000000000},
      {"date": "2026-11-06T00:00:00Z", "price_usd": 0.9998, "market_cap_usd": 179400000000, "volume_24h_usd": 84000000000},
      {"date": "2026-11-05T00:00:00Z", "price_usd": 0.9997, "market_cap_usd": 179000000000, "volume_24h_usd": 83000000000}
    ],
    "asOf": "2026-11-09T00:00:00Z"
  }],
  "sources": [
    {"url": "https://www.coingecko.com/en/coins/tether", "name": "CoinGecko — Tether", "retrievedAt": "2026-11-09T12:00:00Z", "dataTimestamp": "2026-11-09T00:00:00Z"},
    {"url": "https://coinmarketcap.com/currencies/tether/", "name": "CoinMarketCap — Tether", "retrievedAt": "2026-11-09T12:00:00Z"}
  ],
  "gaps": ["30-day historical volume unavailable from the cited sources."]
}
\`\`\``;

const USDC_COMPARISON: ComparisonAsset[] = [
  { symbol: "USDT", metrics: { price_usd: 1.0001, market_cap_usd: 180.5e9, volume_24h_usd: 90e9 }, asOf: "2026-11-09T12:00:00Z" },
  { symbol: "USDC", metrics: { price_usd: 0.9999, market_cap_usd: 75.2e9, volume_24h_usd: 12e9 }, asOf: "2026-11-09T12:00:00Z" },
];

const NOW = new Date("2026-11-09T12:30:00Z");

function buildSpecs(): { context: ResearchContext; line: VisualizationSpec; dashboard: VisualizationSpec; matrix: VisualizationSpec } {
  const blocks: ResearchDataBlock[] = extractResearchDataBlocks(RESEARCH_CONTENT).blocks;
  const dataset: ShadowDataset = blocks[0].datasets[0];
  const context: ResearchContext = {
    datasets: [dataset],
    citations: blocks[0].sources.map((s) => ({ url: s.url, ...(s.name ? { title: s.name } : {}) })),
    evidence: [{ messageId: "a1", excerpt: RESEARCH_CONTENT.slice(0, 200), priority: "research-data" }],
    provenance: "source-verified",
    gaps: blocks[0].gaps,
    hasNumericData: true,
    primaryMessageId: "a1",
  };
  const lineResult = planVisualization({ context, intent: detectVisualizationIntent("Show me this visually.")!, now: NOW });
  if (lineResult.status !== "ok") throw new Error("demo: line plan failed");
  const dashResult = transformKind(lineResult.spec, "kpi-dashboard", NOW);
  if (dashResult.status !== "ok") throw new Error("demo: dashboard transform failed");
  const matrixResult = planComparison(USDC_COMPARISON, {
    title: "USDT vs USDC — live market comparison",
    provenance: "source-verified",
    sources: [
      { url: "https://www.coingecko.com/en/api", name: "Data powered by CoinGecko", retrievedAt: "2026-11-09T12:05:00Z", dataTimestamp: "2026-11-09T12:00:00Z" },
      { url: "https://developers.binance.com/docs/binance-spot-api-docs", name: "Data from Binance public API", retrievedAt: "2026-11-09T12:05:30Z", dataTimestamp: "2026-11-09T12:05:00Z" },
    ],
    gaps: [],
    now: NOW,
  });
  if (matrixResult.status !== "ok") throw new Error("demo: matrix plan failed");
  return { context, line: lineResult.spec, dashboard: dashResult.spec, matrix: matrixResult.spec };
}

const VizDemoPage: React.FC = () => {
  const specs = useMemo(buildSpecs, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => [
      { id: "u1", type: "user" as const, content: "Research the current USDT market.", timestamp: new Date("2026-11-09T12:00:00Z") },
      {
        id: "a1",
        type: "ai" as const,
        content: RESEARCH_CONTENT,
        timestamp: new Date("2026-11-09T12:02:00Z"),
        toolExecution: { tool: "deep_research", status: "completed" },
        citations: specs.context.citations,
        researchData: extractResearchDataBlocks(RESEARCH_CONTENT).blocks,
      },
      { id: "u2", type: "user" as const, content: "Show me this visually.", timestamp: new Date("2026-11-09T12:10:00Z") },
      {
        id: "a2",
        type: "ai" as const,
        content: `Here is **${specs.line.title}** rendered from source-verified research data.\n\nData as of **2026-11-09T00:00:00Z** · 2 sources attached.\n\nAsk follow-ups like **"explain this chart"**, **"make it a line chart"** or **"compare USDT with USDC"**.`,
        timestamp: new Date("2026-11-09T12:10:02Z"),
        visualization: specs.line,
        citations: specs.context.citations,
      },
      { id: "u3", type: "user" as const, content: "Make it a dashboard.", timestamp: new Date("2026-11-09T12:15:00Z") },
      {
        id: "a3",
        type: "ai" as const,
        content: `Here is **${specs.dashboard.title}** as a KPI dashboard.\n\nSwitched from line to kpi dashboard.`,
        timestamp: new Date("2026-11-09T12:15:02Z"),
        visualization: specs.dashboard,
        citations: specs.context.citations,
      },
      { id: "u4", type: "user" as const, content: "Compare USDT with USDC.", timestamp: new Date("2026-11-09T12:20:00Z") },
      {
        id: "a4",
        type: "ai" as const,
        content: `Here is **${specs.matrix.title}** built from live public market data.\n\nLive retrieval: USDT \\$1.0001 (as of 2026-11-09T12:00:00Z, CoinGecko) · USDC \\$0.9999 (as of 2026-11-09T12:00:00Z, CoinGecko).`,
        timestamp: new Date("2026-11-09T12:20:02Z"),
        visualization: specs.matrix,
        citations: specs.matrix.sources.map((s) => ({ url: s.url, ...(s.name ? { title: s.name } : {}) })),
      },
    ],
    [specs],
  );

  if (!import.meta.env.DEV) {
    return <Navigate to="/chatbot" replace />;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="border-b border-border/40 px-6 py-3 flex items-center gap-3">
        <p className="text-sm font-semibold">ShadowTalk — Visualization demo (dev only)</p>
        <p className="text-xs text-muted-foreground">Real ChatMessages → MessageBubble → VisualizationCard stack; specs built by the real planner.</p>
      </header>
      <div className="flex-1 min-h-0 flex flex-col pt-4">
        <ChatMessages
          messages={messages}
          isLoading={false}
          showSuggestions={false}
          personality="default"
          userPlan="pro"
          speakingMessageId={null}
          isSpeaking={false}
          onSelectPrompt={() => {}}
          onEdit={() => {}}
          onRegenerate={() => {}}
          onTextToSpeech={() => {}}
          onOpenCodeCanvas={() => {}}
          messagesEndRef={messagesEndRef}
          layout="gemini"
        />
      </div>
    </div>
  );
};

export default VizDemoPage;
