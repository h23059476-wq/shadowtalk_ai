/** Detect what to do when the user attaches an image in chat */

export type ChatImageIntent = "edit" | "analyze" | "vision";

const IMAGE_EDIT =
  /\b(edit|change|modify|transform|remove|add|replace|swap|make\s+(?:it|this|the|him|her|them)|turn\s+(?:it|this|him|her|them)|convert|enhance|upscale|fix|crop|retouch|recolor|colorize|erase|inpaint|outpaint|extend|expand|redraw|recreate|reimagine|re-imagine|stylize|filter|background|put|give|wear|wearing|black\s+and\s+white|b&w|grayscale|monochrome|sepia|vintage|polaroid|cartoon|anime|sketch|oil\s+painting|watercolor|cyberpunk|steampunk|synthwave|futuristic|3d\s+render|pixar|gothic|studio\s+lighting|change\s+color|as\s+(?:a|an)\s+(?:cartoon|anime|painting|sketch|cyborg|superhero|warrior|astronaut|robot))\b/i;

const ANALYZE_ONLY =
  /^(?:analyze|describe|decode|explain|inspect)(?:\s+(?:this|the))?(?:\s+image)?\??$|^what(?:'s| is)\s+this\??$|^tell\s+me\s+about\s+this(?:\s+image)?\??$|^what\s+do\s+you\s+see(?:\s+in\s+this\s+image)?\??$/i;

export function detectChatImageIntent(message: string): ChatImageIntent {
  const text = message.trim();
  if (!text || ANALYZE_ONLY.test(text)) return "analyze";
  if (IMAGE_EDIT.test(text)) return "edit";
  return "vision";
}

export function defaultImagePrompt(intent: ChatImageIntent): string {
  if (intent === "edit") return "Enhance this image while keeping the main subject";
  if (intent === "analyze") return "Analyze and describe this image in detail";
  return "What can you tell me about this image?";
}
