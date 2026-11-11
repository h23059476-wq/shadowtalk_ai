import { buildWorkspacePrompt } from "@/lib/jules/buildWorkspacePrompt";
import type { JulesWorkspaceFile } from "@/lib/jules/types";
import { turboComplete } from "@/lib/turbo/turboEngine";

export async function runLocalIdeAssist(
  instruction: string,
  files: JulesWorkspaceFile[],
  activeFileName?: string,
  isCodeAction = true,
): Promise<string> {
  const systemPrompt = isCodeAction
    ? "You are a code assistant inside an IDE. Respond ONLY with updated code. No markdown fences, no explanations."
    : "You are a code assistant. Provide a clear, helpful explanation.";

  const userContent =
    files.length > 1
      ? buildWorkspacePrompt(instruction, files, activeFileName)
      : `${instruction}\n\n${files[0]?.content ?? ""}`;

  const result = await turboComplete(systemPrompt, userContent, {
    temperature: 0.2,
    maxTokens: 2048,
    taskComplexity: "medium",
  });
  return result.content;
}
