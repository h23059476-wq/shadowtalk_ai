/**
 * Stubbed text embedding generator (prevents importing `@huggingface/transformers`).
 */
export async function embedText(_text: string): Promise<number[]> {
  // Stubbed to avoid importing heavy local transformers pipeline
  return new Array(384).fill(0);
}
