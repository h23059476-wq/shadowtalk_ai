/**
 * Research-to-Visualization Batch 3 — deterministic conceptual explainer.
 *
 * Narrates a conceptual spec FROM ITS OWN STRUCTURE (no model in the
 * loop): counts, root, branches, phases, statuses, layers, sections and
 * every stage on request. Because the narration is computed from the
 * validated spec, "Explain every stage" can never describe a node that
 * is not actually displayed — the same honesty contract as Batch 2's
 * explainVisualization.
 */

import { isConceptualKind, type VisualizationSpec } from "../spec";

function header(spec: VisualizationSpec): string {
  const parts: string[] = [`**${spec.title}** is a ${spec.kind.replace("-", " ")} diagram`];
  switch (spec.encoding.kind) {
    case "mindmap": {
      const nodes = spec.encoding.nodes;
      const root = nodes.find((n) => !n.parent);
      const depth1 = root ? nodes.filter((n) => n.parent === root.id) : [];
      parts.push(`with ${nodes.length} nodes — root “${root?.label ?? "—"}” and ${depth1.length} main branch${depth1.length === 1 ? "" : "es"}.`);
      break;
    }
    case "roadmap": {
      const phases = spec.encoding.phases;
      const items = phases.reduce((acc, p) => acc + p.items.length, 0);
      parts.push(`with ${phases.length} phase${phases.length === 1 ? "" : "s"} and ${items} item${items === 1 ? "" : "s"}.`);
      break;
    }
    case "decision-tree": {
      const nodes = spec.encoding.nodes;
      const decisions = nodes.filter((n) => n.kind === "decision").length;
      const outcomes = nodes.filter((n) => n.kind === "outcome").length;
      parts.push(`with ${nodes.length} nodes (${decisions} decision${decisions === 1 ? "" : "s"}, ${outcomes} outcome${outcomes === 1 ? "" : "s"}) and ${spec.encoding.edges.length} condition${spec.encoding.edges.length === 1 ? "" : "s"}.`);
      break;
    }
    case "architecture": {
      const layers = spec.encoding.layers;
      const comps = layers.reduce((acc, l) => acc + l.components.length, 0);
      parts.push(`with ${layers.length} layer${layers.length === 1 ? "" : "s"}, ${comps} component${comps === 1 ? "" : "s"}${spec.encoding.connections?.length ? ` and ${spec.encoding.connections.length} connection${spec.encoding.connections.length === 1 ? "" : "s"}` : ""}.`);
      break;
    }
    case "framework": {
      const sections = spec.encoding.sections;
      const items = sections.reduce((acc, s) => acc + s.items.length, 0);
      parts.push(`with ${sections.length} section${sections.length === 1 ? "" : "s"} and ${items} item${items === 1 ? "" : "s"}.`);
      break;
    }
    default:
      break;
  }
  return parts.join(" ");
}

/** Deterministic stage-by-stage narration of a conceptual spec. */
export function explainConceptual(spec: VisualizationSpec): string {
  if (!isConceptualKind(spec.kind)) {
    // Not a conceptual kind — caller should fall back to the data-chart
    // explainer. Return the generic opener only.
    return `**${spec.title}** is a ${spec.kind.replace("-", " ")} data chart — ask "explain this chart" and I'll narrate the displayed dataset.`;
  }

  const lines: string[] = [];
  lines.push(header(spec));

  // Capture into a const: property narrowing does not survive into arrow
  // callbacks (the connections mapper below), but narrowing of a const does.
  const enc = spec.encoding;
  switch (enc.kind) {
    case "mindmap": {
      const nodes = enc.nodes;
      const root = nodes.find((n) => !n.parent);
      if (root) lines.push(`\n**Root — ${root.label}**${root.note ? `: ${root.note}` : ""}`);
      const childrenOf = new Map<string, typeof nodes>();
      for (const n of nodes) {
        const key = n.parent ?? "";
        if (!childrenOf.has(key)) childrenOf.set(key, []);
        childrenOf.get(key)!.push(n);
      }
      const branches = root ? childrenOf.get(root.id) ?? [] : [];
      for (const branch of branches) {
        const children = childrenOf.get(branch.id) ?? [];
        lines.push(`\n- **${branch.label}**${branch.note ? ` — ${branch.note}` : ""}${children.length ? ` (${children.length} sub-branch${children.length === 1 ? "" : "es"}: ${children.map((c) => c.label).join(", ")})` : ""}`);
      }
      break;
    }
    case "roadmap": {
      for (const phase of enc.phases) {
        const statuses = phase.items.map((i) => i.status).filter(Boolean);
        const statusNote = statuses.length
          ? ` — ${statuses.filter((s) => s === "done").length} done, ${statuses.filter((s) => s === "in-progress").length} in progress, ${statuses.filter((s) => s === "at-risk").length} at risk`
          : "";
        lines.push(`\n**${phase.label}**${phase.timeframe ? ` (${phase.timeframe})` : ""}${statusNote}`);
        for (const item of phase.items) {
          lines.push(`- ${item.label}${item.status ? ` *(${item.status.replace("-", " ")})*` : ""}${item.note ? ` — ${item.note}` : ""}`);
        }
      }
      break;
    }
    case "decision-tree": {
      const byId = new Map(enc.nodes.map((n) => [n.id, n]));
      const outgoing = new Map<string, typeof enc.edges>();
      for (const e of enc.edges) {
        if (!outgoing.has(e.from)) outgoing.set(e.from, []);
        outgoing.get(e.from)!.push(e);
      }
      const start = enc.nodes.find((n) => n.kind === "decision") ?? enc.nodes[0];
      const visited = new Set<string>();
      const walk = (id: string, indent: string) => {
        if (visited.has(id)) return;
        visited.add(id);
        const node = byId.get(id);
        if (!node) return;
        const edges = outgoing.get(id) ?? [];
        if (edges.length === 0) {
          lines.push(`${indent}- **${node.label}** → outcome`);
          return;
        }
        for (const edge of edges) {
          const cond = edge.label ? ` (if ${edge.label})` : "";
          lines.push(`${indent}- **${node.label}**${cond}`);
          walk(edge.to, `${indent}  `);
        }
      };
      walk(start.id, "");
      break;
    }
    case "architecture": {
      const allComponents = enc.layers.flatMap((l) => l.components);
      for (const layer of enc.layers) {
        lines.push(`\n**${layer.label}** — ${layer.components.map((c) => c.label).join(", ")}`);
      }
      if (enc.connections?.length) {
        lines.push(`\n**Connections:** ${enc.connections.map((c) => {
          const from = allComponents.find((x) => x.id === c.from)?.label ?? c.from;
          const to = allComponents.find((x) => x.id === c.to)?.label ?? c.to;
          return `${from} → ${to}${c.label ? ` (${c.label})` : ""}`;
        }).join("; ")}`);
      }
      break;
    }
    case "framework": {
      for (const section of enc.sections) {
        lines.push(`\n**${section.label}**${section.tone ? ` *(${section.tone})*` : ""}`);
        for (const item of section.items) lines.push(`- ${item}`);
      }
      break;
    }
    default:
      break;
  }

  if (spec.gaps.length > 0) {
    lines.push(`\n**Known gaps:** ${spec.gaps.slice(0, 4).join(" ")}`);
  }
  lines.push(`\nAsk **"make it more detailed"**, **"add another branch"** or **"simplify this for beginners"** to refine it.`);
  return lines.join("\n");
}
