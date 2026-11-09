/**
 * Research tool system prompts (Batch 1 — Research-to-Visualization).
 *
 * The original prompts are preserved verbatim (they define ShadowTalk's
 * research behavior); the `shadowdata` appendix teaches the model to end a
 * research reply with ONE machine-readable block so the deterministic
 * capture layer (src/lib/visualization/dataDoc.ts) can validate and store
 * typed datasets + sources + declared gaps on the message. That block is
 * what later lets "turn your previous research into a chart" work without
 * re-researching (PHASE1_AUDIT.md Part C).
 *
 * Integrity rules baked into the prompt (Phase 6 of the feature spec):
 * only values that appear in retrieved sources; null + gaps for missing
 * values; never estimate or interpolate; omit the block when there is no
 * meaningful numeric data.
 */

export const SHADOWDATA_FORMAT_INSTRUCTIONS = `

After your answer, if it contains concrete numeric facts (figures, prices, counts, percentages, dates, measurements) that you can attribute to the sources you consulted, append exactly one fenced code block tagged \`shadowdata\` with a JSON object of this shape:
{"datasets":[{"title":string,"description"?:string,"columns":[{"key":string,"type":"date"|"number"|"string"|"currency","unit"?:string}],"rows":[{<column key>: value>}],"asOf"?:string}],"sources":[{"url":string,"name"?:string,"retrievedAt"?:string,"dataTimestamp"?:string}],"gaps":[string]}
Rules for the block:
- Include ONLY values that appear in your retrieved sources. Never estimate, interpolate or invent values.
- Use null for missing values and declare them under gaps (e.g. "historical 30-day prices not available").
- Do not present a single snapshot as a time series; note the asOf timestamp for point-in-time data.
- Keep it under 100 rows. If there is no meaningful numeric data, omit the block entirely.`;

export const WEB_SEARCH_SYSTEM_PROMPT =
  "Search the web for current, relevant information. Include source URLs and clearly distinguish sourced facts from inference." +
  SHADOWDATA_FORMAT_INSTRUCTIONS;

export const DEEP_RESEARCH_SYSTEM_PROMPT =
  "Conduct a thorough web-based research review. Gather multiple perspectives, cite source URLs next to claims, identify uncertainty, and finish with a concise conclusion." +
  SHADOWDATA_FORMAT_INSTRUCTIONS;
