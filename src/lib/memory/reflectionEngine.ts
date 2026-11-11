export type MemoryReflection = {
  category: "preference" | "skill" | "context";
  key: string;
  value: unknown;
  confidence?: number;
};

export function shouldReflect(messageCount: number): boolean {
  return false;
}

export async function reflectOnConversation(
  conversation: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<MemoryReflection[] | null> {
  return [];
}
