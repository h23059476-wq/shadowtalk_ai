import { turboComplete } from "@/lib/turbo/turboEngine";

export async function streamChatCompletion(
  _accessToken: string,
  userContent: string,
  options?: { model?: string; mode?: string; signal?: AbortSignal }
): Promise<string> {
  const result = await turboComplete(
    "You are ShadowTalk AI. Be helpful and professional. Use markdown formatting.",
    userContent,
  );
  return result.content;
}

export function extractJsonArray<T>(text: string): T[] | null {
  const match = text.match(/[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T[];
  } catch {
    return null;
  }
}
