/**
 * Shared handoff between the Prompt Library page and the Chatbot composer.
 *
 * "Use in Chat" stages the chosen prompt under this key, then navigates to
 * /chatbot, where ChatbotPage reads, prefills, and clears it. Kept in lib so
 * both lazy pages can reference it without importing each other.
 */

export const PROMPT_PREFILL_KEY = "shadowtalk.prompt-library.prefill";

export function stagePromptPrefill(text: string): void {
  try {
    localStorage.setItem(PROMPT_PREFILL_KEY, text);
  } catch {
    // storage unavailable — navigation still proceeds without prefill
  }
}

export function consumePromptPrefill(): string | null {
  try {
    const staged = localStorage.getItem(PROMPT_PREFILL_KEY);
    if (staged) localStorage.removeItem(PROMPT_PREFILL_KEY);
    return staged;
  } catch {
    return null;
  }
}
