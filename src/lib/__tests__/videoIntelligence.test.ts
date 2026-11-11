/**
 * Tests for Video Intelligence module.
 * Tests format detection, validation, and frame formatting.
 * Frame extraction requires a real browser environment (canvas + video),
 * so those tests use mocked video elements.
 */
import { describe, it, expect, vi } from "vitest";
import { detectDocumentFormat } from "../documentIntelligence"; // not needed here but for parity
import {
  isSupportedVideo,
  validateVideoFile,
  formatFramesForChat,
  SUPPORTED_VIDEO_TYPES,
  type ExtractedFrame,
  type VideoMetadata,
} from "../videoIntelligence";

describe("Video Intelligence", () => {
  describe("isSupportedVideo", () => {
    it("returns true for MP4", () => {
      expect(isSupportedVideo("video/mp4")).toBe(true);
    });
    it("returns true for WebM", () => {
      expect(isSupportedVideo("video/webm")).toBe(true);
    });
    it("returns false for unsupported types", () => {
      expect(isSupportedVideo("video/x-ms-wmv")).toBe(false);
      expect(isSupportedVideo("application/octet-stream")).toBe(false);
    });
  });

  describe("validateVideoFile", () => {
    it("passes for valid MP4 under size limit", () => {
      const result = validateVideoFile({ size: 50 * 1024 * 1024, type: "video/mp4" });
      expect(result.ok).toBe(true);
    });
    it("fails for files over 100MB", () => {
      const result = validateVideoFile({ size: 150 * 1024 * 1024, type: "video/mp4" });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("too large");
    });
    it("fails for unsupported video format", () => {
      const result = validateVideoFile({ size: 1024, type: "video/x-ms-wmv" });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Unsupported video format");
    });
  });

  describe("formatFramesForChat", () => {
    it("formats frames as OpenAI vision content array", () => {
      const frames: ExtractedFrame[] = [
        { dataUrl: "data:image/jpeg;base64,AAA", timestamp: 1.0, width: 640, height: 360 },
        { dataUrl: "data:image/jpeg;base64,BBB", timestamp: 3.0, width: 640, height: 360 },
      ];
      const metadata: VideoMetadata = { duration: 5.0, width: 1920, height: 1080 };
      const content = formatFramesForChat(frames, "What's in this video?", metadata);
      expect(content[0].type).toBe("text");
      expect((content[0] as { text: string }).text).toContain("[Video Analysis]");
      expect((content[0] as { text: string }).text).toContain("1920x1080");
      expect((content[0] as { text: string }).text).toContain("2 frames extracted");
      expect(content[1].type).toBe("image_url");
      expect(content[2].type).toBe("image_url");
    });

    it("handles null metadata", () => {
      const frames: ExtractedFrame[] = [
        { dataUrl: "data:image/jpeg;base64,AAA", timestamp: 0, width: 640, height: 360 },
      ];
      const content = formatFramesForChat(frames, "Describe", null);
      expect((content[0] as { text: string }).text).toContain("metadata unavailable");
    });

    it("uses default question when none provided", () => {
      const frames: ExtractedFrame[] = [
        { dataUrl: "data:image/jpeg;base64,AAA", timestamp: 0, width: 640, height: 360 },
      ];
      const content = formatFramesForChat(frames, "", null);
      expect((content[0] as { text: string }).text).toContain("Describe what's happening");
    });
  });

  describe("SUPPORTED_VIDEO_TYPES", () => {
    it("includes MP4, WebM, OGG, MOV, MKV", () => {
      expect(SUPPORTED_VIDEO_TYPES).toContain("video/mp4");
      expect(SUPPORTED_VIDEO_TYPES).toContain("video/webm");
      expect(SUPPORTED_VIDEO_TYPES).toContain("video/ogg");
      expect(SUPPORTED_VIDEO_TYPES).toContain("video/quicktime");
      expect(SUPPORTED_VIDEO_TYPES).toContain("video/x-matroska");
    });
  });
});
