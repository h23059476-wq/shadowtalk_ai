/**
 * VisualDemoPage (dev-only) — live gallery of the JSON-to-Engine pipeline.
 *
 * Renders one production payload per mode through ShadowVisualRenderer so
 * designers/QA can verify the locked theme without prompting the model:
 *   - chart       → Apache ECharts (area gradient + rounded bars)
 *   - diagram     → Mermaid (dark theme, pan & zoom)
 *   - infographic → Bento grid (grid-3 + timeline layouts)
 * Plus the guardrail states: raw-SVG rejection and malformed JSON.
 *
 * Redirects to /chatbot in production builds.
 */

import React from "react";
import { Navigate } from "react-router-dom";
import ShadowVisualRenderer from "@/components/visual/ShadowVisualRenderer";

const IS_PROD = import.meta.env.PROD;

const CHART_PAYLOAD = `{
  "mode": "chart",
  "title": "On-device AI weekly active users",
  "subtitle": "first 8 weeks after launch",
  "chartType": "area",
  "unit": "k users",
  "labels": ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
  "series": [
    { "name": "Guest sessions", "data": [1.2, 2.9, 4.1, 6.8, 9.5, 12.4, 15.9, 19.8] },
    { "name": "Signed-in", "data": [0.8, 1.1, 2.0, 3.3, 5.1, 7.2, 9.6, 12.1] }
  ]
}`;

const BARS_PAYLOAD = `{
  "mode": "chart",
  "title": "Model routing share by provider",
  "chartType": "bar",
  "unit": "%",
  "labels": ["Groq", "Gemini", "OpenAI", "OpenRouter", "On-device"],
  "series": [{ "name": "Share", "data": [34, 24, 18, 15, 9] }]
}`;

const DIAGRAM_PAYLOAD = `{
  "mode": "diagram",
  "title": "ShadowTalk request lifecycle",
  "diagramType": "flowchart",
  "code": "flowchart TD\\n  U[User prompt] --> R{Local model available?}\\n  R -->|yes| L[On-device WebGPU inference]\\n  R -->|no| B{BYOK key set?}\\n  B -->|yes| P[Direct provider call]\\n  B -->|no| S[Shared AI Function]\\n  L --> E[Encrypted history]\\n  P --> E\\n  S --> E"
}`;

const INFO_PAYLOAD = `{
  "mode": "infographic",
  "header": "Why ShadowTalk stays sovereign",
  "badge": "Architecture",
  "layout": "grid-3",
  "cards": [
    { "iconName": "wifi-off", "title": "Offline-first", "metric": "100%", "metricLabel": "local rendering", "description": "Charts, diagrams and bento cards render on-device — zero CDN, zero external fonts.", "accent": "indigo", "tags": ["WebGPU", "bundled engines"] },
    { "iconName": "lock", "title": "Private by default", "metric": "0", "metricLabel": "servers touched", "description": "Visual JSON never leaves the browser; exports rasterize through the native canvas.", "accent": "emerald", "tags": ["E2EE", "local export"] },
    { "iconName": "shield-check", "title": "Locked design system", "metric": "5", "metricLabel": "safe accents", "description": "A colorblind-safe palette and glass surfaces are enforced by the engine — not the model.", "accent": "cyan", "tags": ["ECharts", "Mermaid", "Bento"] },
    { "iconName": "download", "title": "Retina exports", "metric": "2x", "metricLabel": "PNG", "description": "Every visual ships with one-click 2x PNG export through bundled html-to-image.", "accent": "amber" },
    { "iconName": "shield", "title": "Schema-guarded", "metric": "1", "metricLabel": "retry", "description": "Payloads are validated, sanitized, and self-corrected once before an honest error card.", "accent": "rose" },
    { "iconName": "rocket", "title": "Studio toolbar", "metric": "3", "metricLabel": "actions", "description": "Download, copy JSON/mermaid and expand fullscreen ship with every render.", "accent": "indigo" }
  ]
}`;

const TIMELINE_PAYLOAD = `{
  "mode": "infographic",
  "header": "Rollout plan — JSON engines",
  "layout": "timeline",
  "cards": [
    { "iconName": "package", "title": "Phase 1 — bundle engines", "description": "echarts, mermaid, html-to-image installed locally; lucide icons replace drawn art.", "accent": "indigo" },
    { "iconName": "layers", "title": "Phase 2 — strict contract", "description": "Model prompt switches to the shadowvisual JSON schema; raw SVG parser deleted.", "accent": "emerald" },
    { "iconName": "refresh-cw", "title": "Phase 3 — auto-recovery", "description": "Sanitize + one silent model retry with the exact render error.", "accent": "cyan" }
  ]
}`;

const SVG_REJECTION_PAYLOAD = `<svg width="200" height="200"><circle cx="100" cy="100" r="80" fill="purple"/></svg>`;

const BROKEN_JSON_PAYLOAD = `{ "mode": "chart", "title": "Broken", "chartType": "pie" }`;

const Card: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="space-y-2">
    <div>
      <h2 className="text-sm font-semibold text-foreground/90">{title}</h2>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
    {children}
  </section>
);

const VisualDemoPage: React.FC = () => {
  if (IS_PROD) return <Navigate to="/chatbot" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
        <header className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">dev preview</p>
          <h1 className="text-2xl font-bold tracking-tight">Shadow Visual Engine — JSON-to-Engine gallery</h1>
          <p className="text-sm text-muted-foreground">
            Every card below is a raw <code className="rounded bg-muted/40 px-1 py-0.5 text-[11px]">{"```shadowvisual"}</code> payload rendered by
            <code className="mx-1 rounded bg-muted/40 px-1 py-0.5 text-[11px]">ShadowVisualRenderer</code> with the locked theme. No model call involved.
          </p>
        </header>

        <Card title="Mode A — chart · area gradient + smooth curves">
          <ShadowVisualRenderer payload={CHART_PAYLOAD} height={300} />
        </Card>

        <Card title="Mode A — chart · rounded bars">
          <ShadowVisualRenderer payload={BARS_PAYLOAD} height={300} />
        </Card>

        <Card title="Mode B — diagram · mermaid flowchart (drag to pan, ctrl+scroll to zoom)">
          <ShadowVisualRenderer payload={DIAGRAM_PAYLOAD} height={360} />
        </Card>

        <Card title="Mode C — infographic · bento grid-3">
          <ShadowVisualRenderer payload={INFO_PAYLOAD} />
        </Card>

        <Card title="Mode C — infographic · timeline">
          <ShadowVisualRenderer payload={TIMELINE_PAYLOAD} />
        </Card>

        <Card
          title="Guardrail — raw SVG is rejected outright"
          note="The old generator's output format can no longer render; the exact reason is surfaced."
        >
          <ShadowVisualRenderer payload={SVG_REJECTION_PAYLOAD} />
        </Card>

        <Card
          title="Guardrail — malformed JSON shows the validation error"
          note="With the chat wiring, this triggers one silent self-correction retry first."
        >
          <ShadowVisualRenderer payload={BROKEN_JSON_PAYLOAD} />
        </Card>
      </div>
    </div>
  );
};

export default VisualDemoPage;
