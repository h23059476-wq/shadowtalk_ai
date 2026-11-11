import { describe, it, expect } from "vitest";
import {
  extractImageMetrics,
  detectDirectFilter,
  synthesizeImageEditPlan,
  editImageSeamlessly,
  analyzeImageInDetail,
} from "./imageEditorEngine";
import { detectChatImageIntent } from "./chatImageIntent";
import { callChatImageEdit, callChatImageAnalyze } from "./chatImageApi";

describe("Image Editor Engine", () => {
  const sampleImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  describe("detectDirectFilter", () => {
    it("detects black and white and grayscale requests", () => {
      expect(detectDirectFilter("make it black and white")).toEqual({
        isDirect: true,
        filter: "grayscale",
      });
      expect(detectDirectFilter("convert to b&w monochrome")).toEqual({
        isDirect: true,
        filter: "grayscale",
      });
    });

    it("detects vintage sepia requests", () => {
      expect(detectDirectFilter("give it a vintage sepia tone")).toEqual({
        isDirect: true,
        filter: "sepia",
      });
    });

    it("detects color inversion requests", () => {
      expect(detectDirectFilter("invert the colors")).toEqual({
        isDirect: true,
        filter: "invert",
      });
    });

    it("detects high contrast requests", () => {
      expect(detectDirectFilter("boost high contrast")).toEqual({
        isDirect: true,
        filter: "high_contrast",
      });
    });

    it("returns false for generative modifications", () => {
      expect(detectDirectFilter("add neon sunglasses to the cat").isDirect).toBe(false);
      expect(detectDirectFilter("change background to a tropical beach").isDirect).toBe(false);
      expect(detectDirectFilter("turn this into a 3D Pixar character").isDirect).toBe(false);
    });
  });

  describe("extractImageMetrics", () => {
    it("returns default metrics gracefully in headless/test environments", async () => {
      const metrics = await extractImageMetrics(sampleImage);
      expect(metrics).toBeDefined();
      expect(metrics.aspectRatio).toBeDefined();
      expect(metrics.width).toBeGreaterThan(0);
      expect(metrics.height).toBeGreaterThan(0);
    });
  });

  describe("synthesizeImageEditPlan", () => {
    it("synthesizes an explanation and diffusion prompt for user edits", async () => {
      const metrics = await extractImageMetrics(sampleImage);
      const plan = await synthesizeImageEditPlan("make it a cyberpunk warrior with glowing neon armor", metrics);
      expect(plan.explanation).toBeTruthy();
      expect(plan.diffusionPrompt).toContain("cyberpunk");
    });
  });

  describe("editImageSeamlessly", () => {
    // Note: editImageSeamlessly makes real network calls to external image
    // generation APIs (pollinations.ai / Supabase Edge Function). These
    // integration tests are skipped in the unit test suite because they
    // require a live backend and cannot pass in CI without network access.
    // To run them manually: remove the .skip and ensure the backend is
    // reachable.
    it.skip("handles generative image edits with high quality Flux URL", async () => {
      const result = await editImageSeamlessly(sampleImage, "add cool sunglasses and a leather jacket");
      expect(result.editedImageUrl).toBeTruthy();
      expect(result.editedImageUrl).toContain("pollinations.ai");
      expect(result.analysis).toBeTruthy();
      expect(result.method).toBe("generative_edit");
    });

    it.skip("handles direct photographic filter requests", async () => {
      const result = await editImageSeamlessly(sampleImage, "make it black and white");
      expect(result.editedImageUrl).toBeTruthy();
      expect(result.analysis).toContain("black and white");
      expect(result.method).toBe("direct_filter");
    });
  });

  describe("analyzeImageInDetail", () => {
    beforeEach(() => {
      provider.getBestProvider.mockResolvedValue({ streamChat: provider.streamChat });
      provider.streamChat.mockResolvedValue({
        content: JSON.stringify({
          summary: "A test image with a single subject.",
          subject: "A centered geometric shape.",
          composition: "Centered, square framing.",
          palette: "Mostly blue.",
          suggestedEdits: ["Increase contrast"],
        }),
      });
    });

    it("produces structured visual reasoning with suggested edits", async () => {
      const analysis = await analyzeImageInDetail(sampleImage);
      expect(analysis.summary).toBeTruthy();
      expect(analysis.subject).toBeTruthy();
      expect(analysis.suggestedEdits.length).toBeGreaterThanOrEqual(1);
    });

    it("surfaces provider failure instead of returning invented visual findings", async () => {
      provider.getBestProvider.mockRejectedValueOnce(new Error("provider unavailable"));
      await expect(analyzeImageInDetail(sampleImage)).rejects.toThrow(/could not analyze this image/i);
    });
  });

  describe("chatImageApi integration", () => {
    // Note: callChatImageEdit makes a real network call to the Supabase
    // Edge Function. This integration test is skipped in the unit test
    // suite because it requires a live backend.
    it.skip("callChatImageEdit returns image URL and conversational content", async () => {
      const resp = await callChatImageEdit(sampleImage, "turn into an oil painting in the style of Van Gogh");
      expect(resp.imageUrl).toBeTruthy();
      expect(resp.content).toBeTruthy();
      expect(resp.type).toBe("image");
    });

    it("callChatImageAnalyze returns visual analysis and suggestions", async () => {
      const resp = await callChatImageAnalyze(sampleImage);
      expect(resp.imageUrl).toBe(sampleImage);
      expect(resp.content).toContain("Visual Analysis Report");
      expect(resp.type).toBe("analysis");
    });
  });

  describe("detectChatImageIntent comprehensive checks", () => {
    it("correctly flags various natural language editing phrases as edit", () => {
      expect(detectChatImageIntent("make him wear sunglasses")).toBe("edit");
      expect(detectChatImageIntent("add a hat to this")).toBe("edit");
      expect(detectChatImageIntent("put sunglasses on the dog")).toBe("edit");
      expect(detectChatImageIntent("remove the background")).toBe("edit");
      expect(detectChatImageIntent("change color to blue")).toBe("edit");
      expect(detectChatImageIntent("cyberpunk version of this")).toBe("edit");
      expect(detectChatImageIntent("turn this into anime")).toBe("edit");
      expect(detectChatImageIntent("make it 3d render")).toBe("edit");
    });

    it("correctly flags questions as analyze or vision", () => {
      expect(detectChatImageIntent("describe this image")).toBe("analyze");
      expect(detectChatImageIntent("what is this?")).toBe("analyze");
      expect(detectChatImageIntent("How many people are in this picture?")).toBe("vision");
    });
  });
});
import { vi } from "vitest";

const provider = vi.hoisted(() => ({
  getBestProvider: vi.fn(),
  streamChat: vi.fn(),
}));

vi.mock("@/ai/AIProviderRouter", () => ({ AIProviderRouter: provider }));
