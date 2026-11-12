import { backend } from "@/integrations/local/client";
import type { ToolType } from "@/hooks/useToolOrchestrator";
import { chatAuthHeaders } from "./chatAuthHeaders";
import type { ExecuteShadowToolContext, ShadowToolResult } from "./types";
import { streamCloudChat } from "@/lib/cloudChat";
import { WEB_SEARCH_SYSTEM_PROMPT, DEEP_RESEARCH_SYSTEM_PROMPT } from "./researchPrompts";

const UI_ROUTES: Partial<Record<ToolType, { path: string; label: string }>> = {

  workspace: { path: "/workspace", label: "AI Workspace" },
  ide: { path: "/ide", label: "Code IDE" },
  computer_mode: { path: "/computer", label: "Computer Mode" },
  marketplace: { path: "/marketplace", label: "Marketplace" },
  presentation_builder: { path: "/forge?mode=slides", label: "Content Forge" },
  knowledge_vault: { path: "/research?tab=knowledge", label: "Shadow Research" },
  privacy_score: { path: "/security?tab=score", label: "Security Center" },
  referral: { path: "/referral", label: "Referral Program" },
  analytics: { path: "/insights?tab=usage", label: "Shadow Insights" },
  stealth_vault: { path: "/security?tab=vault", label: "Security Center" },
  api_marketplace: { path: "/developers", label: "Developers" },
  sovereign_models: { path: "/personal-llm", label: "Personal LLM" },
  eco_actions: { path: "/chatbot", label: "Eco Actions (switch mode to PPAG)" },
};

export async function executeShadowTool(
  tool: ToolType,
  params: Record<string, string> | undefined,
  message: string,
  ctx: ExecuteShadowToolContext
): Promise<ShadowToolResult> {
  const p = params || {};

  switch (tool) {
    case "web_search": {
      const query = (p.query as string) || message;
      const response = await streamCloudChat([
        { role: "system", content: WEB_SEARCH_SYSTEM_PROMPT },
        { role: "user", content: query },
      ], { webSearch: true, maxTokens: 3000 });
      if (response.error) throw new Error(response.error);
      return {
        kind: "inline",
        tool,
        content: `### Web search: ${query}\n\n${response.content || "The provider returned no search results."}`,
        // Batch 1: preserve provider citations so visualizations can carry provenance.
        ...(response.citations?.length ? { citations: response.citations } : {}),
      };
    }

    case "deep_research": {
      const query = (p.query as string) || message;
      const reportResp = await streamCloudChat([
        { role: "system", content: DEEP_RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: query },
      ], { webSearch: true, maxTokens: 6000 });
      if (reportResp.error) throw new Error(reportResp.error);
      const report = reportResp.content;
      return {
        kind: "inline",
        tool,
        content: report || "Research returned no content.",
        ...(reportResp.citations?.length ? { citations: reportResp.citations } : {}),
      };
    }

    case "image_generator": {
      const imgPrompt = (p.prompt as string) || message;
      const { generateCloudImage } = await import("@/lib/cloudImage");
      const imageUrl = await generateCloudImage(imgPrompt, { watermark: true });
      return {
        kind: "inline",
        tool,
        content: `Generated image for: *${imgPrompt}*`,
        imageUrl,
      };
    }

    case "image_editor" as any:
    case "image_edit" as any: {
      const imgData =
        (p.image as string) ||
        (ctx.attachment?.type === "image" && ctx.attachment.data
          ? `data:${ctx.attachment.mimeType};base64,${ctx.attachment.data}`
          : null);
      if (imgData) {
        const { callChatImageEdit } = await import("@/lib/chatImageApi");
        const editResp = await callChatImageEdit(
          imgData,
          message || (p.prompt as string) || "Enhance and stylize this image",
        );
        return {
          kind: "inline",
          tool,
          content: editResp.content,
          imageUrl: editResp.imageUrl,
        };
      }
      return {
        kind: "ui",
        tool,
        message: "Please attach an image to edit.",
        path: "/chatbot",
      };
    }

    case "image_decoder":
    case "visual_reasoning": {
      if (ctx.attachment?.type === "image" && ctx.attachment.data) {
        const { callChatImageAnalyze } = await import("@/lib/chatImageApi");
        const decodeResp = await callChatImageAnalyze(
          `data:${ctx.attachment.mimeType};base64,${ctx.attachment.data}`,
        );
        return {
          kind: "inline",
          tool,
          content: decodeResp.content,
          imageUrl: `data:${ctx.attachment.mimeType};base64,${ctx.attachment.data}`,
        };
      }
      return {
        kind: "ui",
        tool,
        message: "Attach an image to your message, or open Camera Analysis mode.",
        path: "/chatbot",
      };
    }

    case "security_audit": {
      const urlMatch = message.match(/https?:\/\/[^\s]+/i);
      const url = p.url || urlMatch?.[0];
      const response = await streamCloudChat([
        { role: "system", content: "Perform a defensive security review of the supplied source or page content. Report evidence, severity, impact, and actionable mitigations. Do not claim that you executed tests, exploited the target, or verified runtime behavior." },
        { role: "user", content: url ? `Review the security posture visible on this URL: ${url}` : message },
      ], { webFetch: Boolean(url), maxTokens: 5000 });
      if (response.error) throw new Error(response.error);
      return { kind: "inline", tool, content: `### Security review${url ? `: ${url}` : ""}\n\n${response.content}` };
    }

    case "shadow_browser": {
      const url = p.url || message.match(/https?:\/\/[^\s]+/i)?.[0];
      if (url) {
        const response = await streamCloudChat([
          { role: "system", content: "Read the requested web page using the available URL-fetch tool. Summarize its key points and cite the URL. If you cannot access it, say so plainly." },
          { role: "user", content: url },
        ], { webFetch: true, maxTokens: 4000 });
        if (response.error) throw new Error(response.error);
        return {
          kind: "inline",
          tool,
          content: `### Page summary: ${url}\n\n${response.content || "The provider returned no page content."}`,
        };
      }
      return {
        kind: "ui",
        tool,
        message: "Provide a URL to scrape.",
        path: "/browser",
      };
    }

    case "code_executor": {
      // The `code-runner` Cloud Function is not currently exported by
      // functions/src/index.ts. Until it is added, fall back to the
      // WebContainer sandbox (`useCodeSandbox`) if available, otherwise
      // return an honest "not yet available" message. Previously this
      // branch silently failed with HTTP 404 from the missing Function.
      const code = p.code || message;
      return {
        kind: "inline",
        tool,
        content: `### Code execution not yet available\n\nThe \`code-runner\` Cloud Function is not yet deployed. To run code today, open the Agentic IDE at /ide which uses the in-browser WebContainer sandbox.\n\nYour code was:\n\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\``,
      };
    }

    case "file_manager": {
      // The `file-manager` Cloud Function is not currently exported.
      // See docs/audit/CLAIMS_REALITY_REPORT.md P0-9. Until the backend
      // is wired, return an honest message instead of failing with HTTP 404.
      return {
        kind: "inline",
        tool,
        content: `### File manager not yet available\n\nThe \`file-manager\` Cloud Function is not yet deployed. File uploads in chat still work; persistent file management is on the roadmap.`,
      };
    }

    case "presentation_builder": {
      const topic = p.topic || message;
      const response = await streamCloudChat([
        { role: "system", content: "Create a useful presentation outline as Markdown. Include a title, audience and objective, followed by 6 to 10 numbered slides with a headline, key points, and suggested visual for each. Do not claim to have generated a PowerPoint file." },
        { role: "user", content: topic },
      ], { maxTokens: 5000 });
      if (response.error) throw new Error(response.error);
      return { kind: "inline", tool, content: response.content };
    }


    case "database_query":
    case "analytics_agent": {
      // The `postgres-query` Cloud Function is not currently exported.
      // See docs/audit/CLAIMS_REALITY_REPORT.md P0-9. Return an honest
      // message rather than silently failing with HTTP 404.
      return {
        kind: "inline",
        tool,
        content: `### Database queries not yet available\n\nThe \`postgres-query\` Cloud Function is not yet deployed. To analyse data today, upload a CSV or paste rows into the chat and ask the AI to summarise.`,
      };
    }

    case "api_integrator":
    case "workflow_automation": {
      // The `api-gateway` Cloud Function is not currently exported.
      // See docs/audit/CLAIMS_REALITY_REPORT.md P0-9.
      const endpoint = p.endpoint || p.url || "";
      const method = (p.method as string) || "POST";
      return {
        kind: "inline",
        tool,
        content: `### API gateway not yet available\n\nThe \`api-gateway\` Cloud Function is not yet deployed, so I can't execute \`${method} ${endpoint || "<endpoint>"}\` on your behalf from the server. To call an API today, write the request in JavaScript and run it in the Agentic IDE at /ide.`,
      };
    }



    default:
      return {
        kind: "inline",
        tool: "executor",
        content: `Shadow tool “${tool}” is not implemented yet.`,
      };
  }
}

export type { ExecuteShadowToolContext } from "./types";
