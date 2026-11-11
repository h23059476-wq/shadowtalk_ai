
"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";




export type PromptAutocompleteOptions = {
  composerEnabled?: boolean;
  localOnly?: boolean;
  maxSuggestionChars?: number;
};

export type PromptAutocompleteResult = {
  suggestion: string;
  isLoading: boolean;
  accept: () => void;
  clear: () => void;
};

const SUGGESTION_SYSTEM = [
  "You write one short inline continuation.",
  "Only output the exact continuation, no quote or prefix.",
  "6 to 22 words, user language, natural tone, no restatement.",
].join(" ");

const DEBOUNCE_MS = 300;
const DEFAULT_MAX_CHARS = 140;

const MSG_CACHE = new Map<string, string>();

function makeLangKey(messages: any[]) {
  return messages
    .map((m) => `${m.role}:${m.content}`)
    .join("|");
}

export function usePromptAutocomplete(
  text: string | undefined,
  onAccept: (value: string) => void,
  opts: PromptAutocompleteOptions = {},
): PromptAutocompleteResult {
  const clear = useCallback(() => {}, []);
  const accept = useCallback(() => {}, []);

  return { suggestion: "", isLoading: false, accept, clear };
}
