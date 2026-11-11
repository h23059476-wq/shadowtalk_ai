/**
 * Non-streaming chat edge calls for image edit / analyze.
 * Integrates directly with imageEditorEngine for seamless image editing & visual analysis.
 */

import {
  editImageSeamlessly,
  analyzeImageInDetail,
  type ImageEditResult,
  type ImageAnalysisResult,
} from "@/lib/imageEditorEngine";

export interface ChatImageResult {
  content: string;
  imageUrl?: string;
  type: "image" | "analysis" | "text";
  editDetails?: ImageEditResult;
  analysisDetails?: ImageAnalysisResult;
}

/**
 * Edit an uploaded image according to the user's natural language instructions.
 * Analyzes the image, applies direct or generative transformations, and returns the new image.
 */
export async function callChatImageEdit(
  originalImage: string,
  editPrompt: string,
  signal?: AbortSignal,
): Promise<ChatImageResult> {
  try {
    const editResult = await editImageSeamlessly(originalImage, editPrompt, signal);

    return {
      content: editResult.analysis,
      imageUrl: editResult.editedImageUrl,
      type: "image",
      editDetails: editResult,
    };
  } catch (error) {
    console.error("[callChatImageEdit] Error editing image:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to edit the image. Please try again.",
    );
  }
}

/**
 * Analyze an uploaded image in detail and return a structured visual breakdown with suggested edits.
 */
export async function callChatImageAnalyze(
  imageToAnalyze: string,
  signal?: AbortSignal,
): Promise<ChatImageResult> {
  try {
    const analysis = await analyzeImageInDetail(imageToAnalyze, signal);

    const formattedContent = [
      `### 🔍 Visual Analysis Report`,
      ``,
      `**Overview**: ${analysis.summary}`,
      ``,
      `- **Subject & Focal Points**: ${analysis.subject}`,
      `- **Composition & Perspective**: ${analysis.composition}`,
      `- **Color Palette & Lighting**: ${analysis.palette}`,
      ``,
      `---`,
      `#### 💡 Creative Editing Ideas`,
      `Ask ShadowTalk to edit this image by typing any of the following:`,
      analysis.suggestedEdits.map((e, idx) => `${idx + 1}. *"Edit this: ${e}"*`).join("\n"),
    ].join("\n");

    return {
      content: formattedContent,
      imageUrl: imageToAnalyze,
      type: "analysis",
      analysisDetails: analysis,
    };
  } catch (error) {
    console.error("[callChatImageAnalyze] Error analyzing image:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze image.",
    );
  }
}

/** Build multimodal user content for vision Q&A in streaming chat */
export function buildVisionUserMessage(
  text: string,
  imageDataUrl: string,
): { role: "user"; content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> } {
  return {
    role: "user",
    content: [
      { type: "text", text: text.trim() || "What can you tell me about this image?" },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ],
  };
}
