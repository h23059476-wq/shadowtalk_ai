/**
 * visualSystemPrompt.ts — the exact schema instructions injected into the
 * chat system prompt so the model produces deterministic, engine-rendered
 * visuals. Replaces the retired raw-SVG "coded images" contract.
 *
 * Rules enforced here (and validated again client-side in visualContract.ts):
 *  1. NEVER emit raw <svg>, <canvas>, or hand-written CSS colors for visuals.
 *  2. Emit exactly ONE fenced block tagged `shadowvisual` containing pure JSON.
 *  3. Choose one of three modes: chart | diagram | infographic.
 *  4. All styling (colors, fonts, margins, grid) is applied by the locked
 *     ShadowTalk engines — the JSON carries DATA ONLY.
 */

export { SHADOW_VISUAL_FENCE } from "./visualContract";

export const SHADOW_VISUAL_PROMPT = `## Visuals — JSON-to-Engine contract (MANDATORY)

When the user asks for a chart, graph, diagram, flowchart, mind map, comparison, roadmap, timeline, summary card, cheat sheet, KPI snapshot, or any conceptual illustration, you MUST reply with ONE fenced code block tagged \`shadowvisual\` containing PURE JSON — no markdown inside the fence, no explanation inside the fence. A short lead-in sentence before the fence is fine. Never draw raw <svg>, never write <canvas> scripts, never invent colors — the ShadowTalk render engines (ECharts, Mermaid, Bento grid) style everything.

Pick exactly ONE mode by intent:
- Numeric/analytic data over categories or time → \`chart\`
- Process, architecture, hierarchy, sequence, schedule → \`diagram\`
- Comparison, roadmap, feature summary, cheat sheet, concept cards → \`infographic\`

### Mode A — chart (JSON schema)
\`\`\`shadowvisual
{"mode":"chart","title":"...","subtitle":"optional","chartType":"line|bar|area|pie|donut|radar|scatter|sankey","labels":["Jan","Feb"],"series":[{"name":"...","data":[1,2]}],"unit":"%"}
\`\`\`
- labels: x-axis categories (pie/donut labels are the slices). Max 60.
- series: 1-12 named arrays; values are numbers or null (missing = null, never invent).
- For sankey: data is a link list [{"source":"A","target":"B","value":3}] and labels may be [].
- Keep titles under 120 chars; unit is a short suffix like "%", "USD", "ms".

### Mode B — diagram (JSON schema)
\`\`\`shadowvisual
{"mode":"diagram","title":"...","subtitle":"optional","diagramType":"flowchart|sequence|mindmap|er|gantt","code":"flowchart TD\\n  A[Entry] --> B{Check}\\n  B -->|yes| C[Done]"}
\`\`\`
- code: clean declarative Mermaid syntax with \\\\n line breaks. Keep every node label short (2-4 words). Max 30 nodes.
- Wrap node labels containing parentheses, brackets or commas in double quotes: A["Core (v2)"].
- Do not use HTML tags, style classes, or theme directives in the code.

### Mode C — infographic (JSON schema)
\`\`\`shadowvisual
{"mode":"infographic","header":"...","badge":"optional eyebrow","layout":"grid-2|grid-3|timeline|comparison","cards":[{"iconName":"zap","title":"...","metric":"99.9%","metricLabel":"uptime","description":"1-2 sentences","accent":"indigo|emerald|cyan|amber|rose","tags":["tag"]}]}
\`\`\`
- 2-12 cards. iconName must be a simple lucide icon word: zap, shield, rocket, lock, globe, cpu, gauge, trending-up, layers, database, cloud, wifi-off, code-2, users, target, leaf, wallet, clock, check-circle-2, lightbulb and similar.
- accent is a NAMED color only (indigo | emerald | cyan | amber | rose) — never hex codes.
- layout: grid-2/grid-3 for feature or summary sets, timeline for chronological phases, comparison for versus tables.

### Hard rules (all modes)
- Output DATA ONLY in the JSON — no colors, no font sizes, no margins, no CSS, no SVG paths.
- All display text (titles, labels, card text) in the user's language.
- One visual per reply. If the user asks for a change ("make it a pie", "add 2024 data"), emit the FULL corrected JSON again — not a diff.
- If the data is unknown or estimated, mark it in the subtitle ("estimates") — never fabricate precision.
- For photorealistic or artistic imagery use the /image command instead — the shadowvisual engines render information, not art.`;

/** Append the visual contract to any base system prompt. */
export function withVisualContract(basePrompt: string): string {
  if (basePrompt.includes("Visuals — JSON-to-Engine contract")) return basePrompt;
  return `${basePrompt}\n\n${SHADOW_VISUAL_PROMPT}`;
}
