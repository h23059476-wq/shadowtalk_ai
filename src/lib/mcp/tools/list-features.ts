/**
 * MCP Tool: list_features
 * List ShadowTalk AI features with their category and in-app route.
 */
import { FEATURES, PRODUCT } from "../data";
import type { McpTool } from "../index";

const tool: McpTool = {
  name: "list_features",
  title: "List features",
  description:
    "List ShadowTalk AI features with their category, in-app route and a short description. Optionally filter by keyword or category.",
  inputSchema: {
    query: { type: "string", optional: true, description: "Free-text keyword to filter features by name or description." },
    category: { type: "string", optional: true, description: "Filter by category, e.g. chat, research, security, code, privacy, platform." },
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, category }) => {
    const q = query?.trim().toLowerCase();
    const cat = category?.trim().toLowerCase();

    const matches = FEATURES.filter((feature: any) => {
      const inCategory = !cat || feature.category.toLowerCase() === cat;
      const inQuery =
        !q ||
        feature.name.toLowerCase().includes(q) ||
        feature.description.toLowerCase().includes(q);
      return inCategory && inQuery;
    });

    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No features matched. Available categories: ${[...new Set(FEATURES.map((f: any) => f.category))].join(", ")}`,
          },
        ],
        structuredContent: { features: [] },
      };
    }

    const text = matches
      .map((f: any) => `- **${f.name}** (${f.category}) — ${f.description}\n  ${PRODUCT.website}${f.route}`)
      .join("\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: { features: matches },
    };
  },
};

export default tool;
