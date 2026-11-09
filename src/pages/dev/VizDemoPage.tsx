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
import { validateVisualizationSpec, vizSpecId } from "@/lib/visualization/spec";
import { explainConceptual } from "@/lib/visualization/conceptual/conceptExplain";

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

/**
 * Batch 3 — conceptual demo specs. These are the exact shapes the
 * AI-assisted pipeline emits after normalization + validation (the demo
 * page is DEV-only and cannot call a BYOK model, so the candidates are
 * authored here and pushed through the SAME validateVisualizationSpec
 * gate the pipeline uses).
 */
function buildConceptSpecs(): {
  mindmap: VisualizationSpec;
  roadmap: VisualizationSpec;
  decisionTree: VisualizationSpec;
  architecture: VisualizationSpec;
  framework: VisualizationSpec;
  explanation: string;
} {
  const sources = [{ url: "https://www.coingecko.com/en/coins/tether", name: "CoinGecko — Tether" }];
  const generatedAt = "2026-11-09T12:25:00Z";
  const gaps = ["Diagram structure synthesized by the model from the research context — verify labels against the attached sources."];

  const mindmap: VisualizationSpec = {
    version: 1,
    id: vizSpecId("mind"),
    kind: "mindmap",
    title: "USDT market — concept map",
    datasets: [],
    encoding: {
      kind: "mindmap",
      layout: "radial",
      nodes: [
        { id: "root", label: "USDT market" },
        { id: "peg", label: "Dollar peg", parent: "root", note: "Trading at $1.0001" },
        { id: "cap", label: "Market cap ~$180.5B", parent: "root" },
        { id: "vol", label: "Volume", parent: "root" },
        { id: "vol24", label: "24h ~$90B", parent: "vol" },
        { id: "risk", label: "Risks", parent: "root" },
        { id: "risk-reg", label: "Regulatory pressure", parent: "risk" },
        { id: "risk-vol", label: "Volume variance by exchange", parent: "risk" },
      ],
    },
    provenance: "ai-extracted",
    sources,
    generatedAt,
    gaps,
  };

  const roadmap: VisualizationSpec = {
    version: 1,
    id: vizSpecId("road"),
    kind: "roadmap",
    title: "USDT market — business roadmap",
    datasets: [],
    encoding: {
      kind: "roadmap",
      phases: [
        {
          id: "p1",
          label: "Phase 1 — Monitor",
          timeframe: "Now",
          items: [
            { id: "p1i1", label: "Track peg stability", status: "in-progress" },
            { id: "p1i2", label: "Verify market-cap figures", status: "done" },
          ],
        },
        {
          id: "p2",
          label: "Phase 2 — Assess",
          timeframe: "Next",
          items: [
            { id: "p2i1", label: "Evaluate regulatory risk", status: "planned" },
            { id: "p2i2", label: "Compare with USDC reserves", status: "planned" },
          ],
        },
        {
          id: "p3",
          label: "Phase 3 — Act",
          items: [{ id: "p3i1", label: "Set allocation strategy", status: "at-risk" }],
        },
      ],
    },
    provenance: "ai-extracted",
    sources,
    generatedAt,
    gaps,
  };

  const decisionTree: VisualizationSpec = {
    version: 1,
    id: vizSpecId("dec"),
    kind: "decision-tree",
    title: "USDT exposure decision tree",
    datasets: [],
    encoding: {
      kind: "decision-tree",
      nodes: [
        { id: "d1", label: "Peg under $0.99?", kind: "decision" },
        { id: "o1", label: "Review reserve reports", kind: "option" },
        { id: "o2", label: "Hold allocation", kind: "outcome" },
        { id: "o3", label: "Reduce exposure", kind: "outcome" },
        { id: "d2", label: "Reserves verified?", kind: "decision" },
      ],
      edges: [
        { from: "d1", to: "d2", label: "yes" },
        { from: "d1", to: "o2", label: "no" },
        { from: "d2", to: "o2", label: "yes" },
        { from: "d2", to: "o3", label: "no" },
      ],
    },
    provenance: "ai-extracted",
    sources,
    generatedAt,
    gaps,
  };

  const architecture: VisualizationSpec = {
    version: 1,
    id: vizSpecId("arch"),
    kind: "architecture",
    title: "Stablecoin data platform",
    datasets: [],
    encoding: {
      kind: "architecture",
      layers: [
        { id: "l1", label: "Chat UI", components: [{ id: "c1", label: "MessageBubble + viz card" }, { id: "c2", label: "Conceptual renderer" }] },
        { id: "l2", label: "Pipeline", components: [{ id: "c3", label: "Context resolver" }, { id: "c4", label: "Spec planner" }, { id: "c5", label: "Zod validation gate" }] },
        { id: "l3", label: "Data", components: [{ id: "c6", label: "Encrypted Firestore" }, { id: "c7", label: "Market-data adapter" }] },
      ],
      connections: [
        { from: "c1", to: "c3", label: "research context" },
        { from: "c3", to: "c4" },
        { from: "c4", to: "c5" },
        { from: "c7", to: "c4", label: "quotes" },
      ],
    },
    provenance: "ai-extracted",
    sources,
    generatedAt,
    gaps,
  };

  const framework: VisualizationSpec = {
    version: 1,
    id: vizSpecId("frame"),
    kind: "framework",
    title: "USDT — SWOT",
    datasets: [],
    encoding: {
      kind: "framework",
      layout: "quadrant",
      sections: [
        { id: "s", label: "Strengths", tone: "positive", items: ["Deep liquidity", "Wide listing coverage", "Peg holding at $1.0001"] },
        { id: "w", label: "Weaknesses", tone: "negative", items: ["Centralized reserve custody", "Volume figures vary by aggregation"] },
        { id: "o", label: "Opportunities", tone: "neutral", items: ["Growing settlement volume", "Transparency reporting"] },
        { id: "t", label: "Threats", tone: "negative", items: ["Regulatory pressure", "Competing stablecoins (USDC)"] },
      ],
    },
    provenance: "ai-extracted",
    sources,
    generatedAt,
    gaps,
  };

  // Every demo spec must pass the SAME gate the pipeline enforces.
  for (const spec of [mindmap, roadmap, decisionTree, architecture, framework]) {
    const result = validateVisualizationSpec(spec);
    if (!result.ok) throw new Error(`demo: invalid conceptual spec (${result.errors[0]})`);
  }
  return {
    mindmap,
    roadmap,
    decisionTree,
    architecture,
    framework,
    explanation: explainConceptual(framework),
  };
}

const VizDemoPage: React.FC = () => {
  const specs = useMemo(buildSpecs, []);
  const conceptSpecs = useMemo(buildConceptSpecs, []);
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
      // ======== Batch 3 — AI-assisted conceptual diagrams ========
      { id: "u5", type: "user" as const, content: "Turn this into a mind map of the USDT market.", timestamp: new Date("2026-11-09T12:25:00Z") },
      {
        id: "a5",
        type: "ai" as const,
        content: `Here is **${conceptSpecs.mindmap.title}** — a mind map diagram.\n\nProvenance: synthesized by the model from the attached sources (labelled ai-extracted).\n\n> Diagram structure synthesized by the model from the research context — verify labels against the attached sources.\n\nAsk follow-ups like **"make it more detailed"**, **"add another branch"**, **"turn this into a decision tree"** or **"simplify this for beginners"**.`,
        timestamp: new Date("2026-11-09T12:25:02Z"),
        visualization: conceptSpecs.mindmap,
        citations: conceptSpecs.mindmap.sources.map((s) => ({ url: s.url, ...(s.name ? { title: s.name } : {}) })),
      },
      { id: "u6", type: "user" as const, content: "Make it a professional business roadmap.", timestamp: new Date("2026-11-09T12:30:00Z") },
      {
        id: "a6",
        type: "ai" as const,
        content: `Here is **${conceptSpecs.roadmap.title}** — a roadmap diagram.\n\nProvenance: synthesized by the model from the attached sources (labelled ai-extracted).\n\n> Converted to a roadmap.`,
        timestamp: new Date("2026-11-09T12:30:02Z"),
        visualization: conceptSpecs.roadmap,
      },
      { id: "u7", type: "user" as const, content: "Show dependencies between these steps.", timestamp: new Date("2026-11-09T12:35:00Z") },
      {
        id: "a7",
        type: "ai" as const,
        content: `Here is **${conceptSpecs.decisionTree.title}** — a decision tree diagram with condition labels.\n\nProvenance: synthesized by the model from the attached sources (labelled ai-extracted).`,
        timestamp: new Date("2026-11-09T12:35:02Z"),
        visualization: conceptSpecs.decisionTree,
      },
      { id: "u8", type: "user" as const, content: "Draw the architecture of a stablecoin data platform.", timestamp: new Date("2026-11-09T12:40:00Z") },
      {
        id: "a8",
        type: "ai" as const,
        content: `Here is **${conceptSpecs.architecture.title}** — an architecture diagram. Layers are collapsible; scroll to zoom, drag to pan.`,
        timestamp: new Date("2026-11-09T12:40:02Z"),
        visualization: conceptSpecs.architecture,
      },
      { id: "u9", type: "user" as const, content: "Give me a SWOT framework.", timestamp: new Date("2026-11-09T12:45:00Z") },
      {
        id: "a9",
        type: "ai" as const,
        content: `Here is **${conceptSpecs.framework.title}** — a strategic framework.\n\n${conceptSpecs.explanation.split("\n")[0]}`,
        timestamp: new Date("2026-11-09T12:45:02Z"),
        visualization: conceptSpecs.framework,
      },
    ],
    [specs, conceptSpecs],
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
