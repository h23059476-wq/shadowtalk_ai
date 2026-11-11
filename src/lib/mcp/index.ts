/**
 * ShadowTalk AI — MCP Server Definition
 *
 * Self-contained MCP server for product information tools.
 */

import answerFaqTool from "./tools/answer-faq";
import getChangelogTool from "./tools/get-changelog";
import getProductOverviewTool from "./tools/get-product-overview";
import listFeaturesTool from "./tools/list-features";

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, any>;
  annotations?: Record<string, any>;
  handler: (input: Record<string, any>) => { content: Array<{ type: string; text: string }>; structuredContent?: any };
}

export interface McpServerConfig {
  name: string;
  title: string;
  version: string;
  instructions: string;
  tools: McpTool[];
}

const mcpServer: McpServerConfig = {
  name: "shadowtalk-ai",
  title: "ShadowTalk-AI",
  version: "0.1.0",
  instructions:
    "Public tools that expose ShadowTalk AI's published product information. Use `get_product_overview` for what the product is and how it is priced, `list_features` to explore features and their in-app routes, `get_changelog` for recent releases, and `answer_faq` for common questions. These tools return public marketing/product data only — no user accounts or private data.",
  tools: [getProductOverviewTool, listFeaturesTool, getChangelogTool, answerFaqTool],
};

export default mcpServer;
