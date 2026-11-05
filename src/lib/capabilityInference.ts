/**
 * Model-name based capability inference for models that are not in the
 * hand-maintained registry. Every result is marked "api_metadata"-free and
 * explicitly labelled as inferred from the model family, so the UI can show
 * a real, model-specific profile instead of one fixed fallback.
 */
import type { ByokProvider } from "@/lib/byok";
import type { CapabilityDetail, ModelCapabilities } from "./capabilityRegistry";

const inferred = (notes: string): CapabilityDetail => ({ status: "supported", evidence: "inferred_from_adapter", notes });
const no = (notes: string): CapabilityDetail => ({ status: "unsupported", evidence: "inferred_from_adapter", notes });
const maybe = (notes: string): CapabilityDetail => ({ status: "unknown", evidence: "not_tested", notes });

/** Strip provider path prefixes like Gemini's "models/". */
export function normalizeModelId(modelId: string): string {
  return (modelId || "").trim().replace(/^models\//i, "");
}

export type ModelKind = "chat" | "embedding" | "image" | "audio" | "moderation" | "other";

/** Classify a model id so non-chat models can be hidden from the chat picker. */
export function classifyModel(modelId: string): ModelKind {
  const id = normalizeModelId(modelId).toLowerCase();
  if (/embed|embedding|bge-|e5-|gte-/.test(id)) return "embedding";
  if (/moderation|guard/.test(id)) return "moderation";
  if (/^(dall-e|gpt-image|imagen|flux|stable-diffusion|sdxl)|-image-generation/.test(id)) return "image";
  if (/whisper|tts|transcribe|-audio-|realtime|native-audio|speech/.test(id)) return "audio";
  if (/^aqa$|babbage|davinci-00/.test(id)) return "other";
  return "chat";
}

interface Family { test: RegExp; ctx: number; out: number | null; vision: boolean; tools: boolean; audioIn?: boolean; video?: boolean }

// Ordered: first match wins.
const FAMILIES: Family[] = [
  { test: /gemini-(2\.5|3|3\.\d)/, ctx: 1_048_576, out: 65_536, vision: true, tools: true, audioIn: true, video: true },
  { test: /gemini-(2\.0|1\.5)/, ctx: 1_048_576, out: 8_192, vision: true, tools: true, audioIn: true, video: true },
  { test: /gemma-3/, ctx: 131_072, out: 8_192, vision: true, tools: false },
  { test: /gemma/, ctx: 8_192, out: 8_192, vision: false, tools: false },
  { test: /gpt-5|gpt-4\.1/, ctx: 400_000, out: 128_000, vision: true, tools: true },
  { test: /gpt-4o|chatgpt-4o/, ctx: 128_000, out: 16_384, vision: true, tools: true },
  { test: /^o[1-4]/, ctx: 200_000, out: 100_000, vision: true, tools: true },
  { test: /gpt-3\.5/, ctx: 16_385, out: 4_096, vision: false, tools: true },
  { test: /claude-(opus|sonnet|haiku)-[4-9]|claude-[4-9]/, ctx: 200_000, out: 64_000, vision: true, tools: true },
  { test: /claude-3/, ctx: 200_000, out: 8_192, vision: true, tools: true },
  { test: /grok-[2-9].*vision|grok-[3-9]/, ctx: 131_072, out: null, vision: true, tools: true },
  { test: /grok/, ctx: 131_072, out: null, vision: false, tools: true },
  { test: /pixtral|mistral-(medium|large)-(2[5-9]|latest)|mistral-small-(2[5-9]|latest)/, ctx: 128_000, out: null, vision: true, tools: true },
  { test: /mistral|mixtral|codestral|ministral/, ctx: 32_768, out: null, vision: false, tools: true },
  { test: /deepseek-(reasoner|r1)/, ctx: 64_000, out: 8_192, vision: false, tools: false },
  { test: /deepseek/, ctx: 64_000, out: 8_192, vision: false, tools: true },
  { test: /llama-4|llama-3\.2-(11|90)b-vision|llava|vision|-vl\b|qwen.*vl/, ctx: 131_072, out: null, vision: true, tools: true },
  { test: /llama-3\.[1-3]|llama3/, ctx: 131_072, out: null, vision: false, tools: true },
  { test: /qwen|qwq/, ctx: 131_072, out: null, vision: false, tools: true },
  { test: /sonar/, ctx: 127_000, out: null, vision: false, tools: false },
  { test: /command-(a|r)/, ctx: 128_000, out: 4_096, vision: false, tools: true },
];

const WEB_PROVIDERS: ByokProvider[] = ["openrouter", "perplexity"];
const IMAGE_PROVIDERS: ByokProvider[] = ["openai", "openrouter"];

export function inferModelCapabilities(provider: ByokProvider, modelId: string): ModelCapabilities {
  const id = normalizeModelId(modelId).toLowerCase();
  const kind = classifyModel(id);
  const fam = FAMILIES.find((f) => f.test.test(id));
  const label = fam ? "Inferred from the model family" : "Not verified for this model";
  const isChat = kind === "chat";
  const vision = isChat && fam?.vision;
  const ctx = fam?.ctx ?? null;

  const textOk = isChat ? inferred("Chat model") : no(`This is a ${kind} model, not a chat model`);
  const visionCap = vision ? inferred(label) : fam ? no("This model family is text-only") : maybe(label);
  const webSearch = WEB_PROVIDERS.includes(provider) || /sonar|search/.test(id)
    ? inferred("Available through this provider's web tools")
    : no("Web search needs an OpenRouter or Perplexity key");
  const imageGeneration = IMAGE_PROVIDERS.includes(provider)
    ? inferred("ShadowTalk generates images with this provider's image model")
    : no("ShadowTalk generates images only with OpenAI or OpenRouter keys");

  return {
    textInput: textOk,
    textOutput: textOk,
    streaming: isChat ? inferred("ShadowTalk streams replies") : no("Not a chat model"),
    systemInstruction: isChat ? inferred("Sent as the first message") : no("Not a chat model"),
    structuredJsonOutput: isChat && fam?.tools ? inferred(label) : maybe(label),
    toolFunctionCalling: !isChat ? no("Not a chat model") : fam ? (fam.tools ? inferred(label) : no("This model family has no tool calling")) : maybe(label),
    contextWindow: isChat ? ctx : null,
    maxOutputTokens: isChat ? fam?.out ?? null : null,
    imageInput: visionCap,
    multipleImageInput: visionCap,
    documentInput: isChat ? inferred("Documents are extracted to text first") : no("Not a chat model"),
    audioInput: no("ShadowTalk uses your browser's speech recognition, not the model"),
    audioOutput: no("ShadowTalk uses its own voice output, not the model"),
    realTimeVoice: no("ShadowTalk does not use model real-time voice"),
    videoInput: vision ? inferred("Video is sent as image frames") : no("Needs a vision-capable model"),
    codeGeneration: isChat ? inferred("Chat models can write code") : no("Not a chat model"),
    toolExecution: isChat && fam?.tools ? inferred(label) : maybe(label),
    agentWorkflow: isChat && fam?.tools ? inferred(label) : maybe(label),
    longContextSuitability: ctx && ctx >= 100_000 ? inferred(`${Math.round(ctx / 1000)}K context window`) : ctx ? no(`${Math.round(ctx / 1000)}K context window`) : maybe("Context window unknown"),
    imageGeneration: kind === "image" ? inferred("Image model") : imageGeneration,
    webSearch,
    documentGeneration: isChat ? inferred("Chat models can write documents") : no("Not a chat model"),
  };
}
