/**
 * Video Intelligence — frame extraction + analysis pipeline.
 *
 * Extracts frames from a video file entirely in the browser using the HTML5
 * <video> element + canvas. Frames are sent to the user's configured BYOK
 * provider as image inputs (via the existing cloudChat image_url format).
 *
 * No video content is uploaded to any external service for frame extraction.
 * The extracted frames (as JPEG data URLs) are sent to the vision-capable
 * model through the existing BYOK routing layer.
 *
 * Limits:
 *   - Max file size: 100 MB
 *   - Max video duration: 30 minutes
 *   - Max frames extracted: 8 (configurable)
 *   - Frame dimensions: max 1024px on the longest side
 *   - Frame format: JPEG at 0.7 quality
 *
 * Audio transcription is NOT implemented in this module — it would require
 * either a Whisper-compatible API (user's BYOK key) or a local Whisper model
 * (WASM). That's a separate explicit stage.
 */

export interface ExtractedFrame {
  /** The frame as a JPEG data URL. */
  dataUrl: string;
  /** The timestamp in seconds. */
  timestamp: number;
  /** The frame width in pixels. */
  width: number;
  /** The frame height in pixels. */
  height: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface VideoExtractionResult {
  /** The extracted frames. */
  frames: ExtractedFrame[];
  /** Video metadata. */
  metadata: VideoMetadata | null;
  /** Whether extraction was truncated due to limits. */
  truncated: boolean;
  /** A human-readable notice. */
  notice?: string;
  /** Error message if extraction failed. */
  error?: string;
}

export interface VideoExtractionOptions {
  /** Max file size in bytes (default 100MB). */
  maxFileSize?: number;
  /** Max video duration in seconds (default 1800 = 30 min). */
  maxDuration?: number;
  /** Max number of frames to extract (default 8). */
  maxFrames?: number;
  /** Max frame dimension in pixels (default 1024). */
  maxFrameDimension?: number;
  /** JPEG quality 0-1 (default 0.7). */
  frameQuality?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

const DEFAULTS: Required<Omit<VideoExtractionOptions, "signal">> = {
  maxFileSize: 100 * 1024 * 1024,
  maxDuration: 1800,
  maxFrames: 8,
  maxFrameDimension: 1024,
  frameQuality: 0.7,
};

/** Supported video MIME types. */
export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
];

/** Check if a file is a supported video format. */
export function isSupportedVideo(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType);
}

/** Validate video file before processing. */
export function validateVideoFile(file: { size: number; type: string }, opts: VideoExtractionOptions = {}): { ok: boolean; error?: string } {
  const maxFileSize = opts.maxFileSize ?? DEFAULTS.maxFileSize;
  if (file.size > maxFileSize) {
    return { ok: false, error: `Video is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${maxFileSize / 1024 / 1024} MB.` };
  }
  if (!isSupportedVideo(file.type)) {
    return { ok: false, error: `Unsupported video format: ${file.type}. Supported: MP4, WebM, OGG, MOV, MKV.` };
  }
  return { ok: true };
}

/**
 * Load video metadata (duration, dimensions) by creating a temporary video element.
 */
function loadVideoMetadata(videoUrl: string, signal?: AbortSignal): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = videoUrl;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });
    }

    video.onloadedmetadata = () => {
      const metadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      if (signal) signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve(metadata);
    };

    video.onerror = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
      cleanup();
      reject(new Error("Could not load video metadata. The file may be corrupted or use an unsupported codec."));
    };
  });
}

/**
 * Seek the video to a specific timestamp and capture a frame.
 */
function captureFrameAt(
  video: HTMLVideoElement,
  timestamp: number,
  maxDimension: number,
  quality: number,
): Promise<ExtractedFrame> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        let { videoWidth: w, videoHeight: h } = video;
        // Scale down if exceeds max dimension
        if (Math.max(w, h) > maxDimension) {
          const scale = maxDimension / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context for frame extraction."));
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        video.removeEventListener("seeked", onSeeked);
        resolve({ dataUrl, timestamp, width: w, height: h });
      } catch (err) {
        video.removeEventListener("seeked", onSeeked);
        reject(err);
      }
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = timestamp;
  });
}

/**
 * Main entry point — extract frames from a video file.
 * @param file The video File object
 * @param opts Extraction options
 */
export async function extractVideoFrames(
  file: File,
  opts: VideoExtractionOptions = {},
): Promise<VideoExtractionResult> {
  const fullOpts = { ...DEFAULTS, ...opts };
  const signal = opts.signal;

  // Validate
  const validation = validateVideoFile(file, fullOpts);
  if (!validation.ok) {
    return { frames: [], metadata: null, truncated: false, error: validation.error };
  }

  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";

  try {
    // Load metadata
    let metadata: VideoMetadata;
    try {
      metadata = await loadVideoMetadata(videoUrl, signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { frames: [], metadata: null, truncated: false, error: "Extraction cancelled." };
      }
      return { frames: [], metadata: null, truncated: false, error: err instanceof Error ? err.message : "Could not load video." };
    }

    // Check duration limit
    let truncated = false;
    let notice: string | undefined;
    let effectiveDuration = metadata.duration;
    if (effectiveDuration > fullOpts.maxDuration) {
      truncated = true;
      notice = `Video duration (${Math.round(effectiveDuration)}s) exceeds the ${fullOpts.maxDuration}s limit. Only the first ${fullOpts.maxDuration}s will be analyzed.`;
      effectiveDuration = fullOpts.maxDuration;
    }

    // Check if browser can decode the video
    video.src = videoUrl;
    await new Promise<void>((resolve, reject) => {
      const onCanPlay = () => { resolve(); };
      const onError = () => { reject(new Error("Browser cannot decode this video codec. Try MP4 (H.264) or WebM.")); };
      video.addEventListener("canplay", onCanPlay, { once: true });
      video.addEventListener("error", onError, { once: true });
      if (signal) {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      }
    });

    // Calculate frame timestamps — evenly distributed across the duration
    const frameCount = Math.min(fullOpts.maxFrames, 8);
    const timestamps: number[] = [];
    for (let i = 0; i < frameCount; i++) {
      // Skip the very first frame (often black) — start at 10% and end at 90%
      const pct = frameCount === 1 ? 0.5 : (i / (frameCount - 1)) * 0.8 + 0.1;
      timestamps.push(effectiveDuration * pct);
    }

    const frames: ExtractedFrame[] = [];
    for (const ts of timestamps) {
      if (signal?.aborted) {
        return { frames, metadata, truncated, notice: "Extraction cancelled.", error: "Cancelled" };
      }
      try {
        const frame = await captureFrameAt(video, ts, fullOpts.maxFrameDimension, fullOpts.frameQuality);
        frames.push(frame);
      } catch (err) {
        // Skip individual frame failures — continue with other frames
        console.warn(`[video] Failed to capture frame at ${ts}s:`, err);
      }
    }

    if (frames.length === 0) {
      return { frames: [], metadata, truncated, error: "Could not extract any frames from the video. The codec may be unsupported." };
    }

    return { frames, metadata, truncated, notice };
  } finally {
    // Cleanup
    URL.revokeObjectURL(videoUrl);
    video.removeAttribute("src");
    video.load();
  }
}

/**
 * Format extracted frames as a chat message content array (OpenAI vision format).
 * Returns the content array to be used as the `content` field of a user message.
 */
export function formatFramesForChat(
  frames: ExtractedFrame[],
  userQuestion: string,
  metadata: VideoMetadata | null,
): Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> {
  const metaText = metadata
    ? `Video metadata: ${metadata.width}x${metadata.height}, ${metadata.duration.toFixed(1)}s duration.`
    : "Video metadata unavailable.";

  const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    {
      type: "text",
      text: `[Video Analysis] ${metaText} ${frames.length} frames extracted at timestamps: ${frames.map(f => `${f.timestamp.toFixed(1)}s`).join(", ")}.\n\nUser question: ${userQuestion || "Describe what's happening in this video."}`,
    },
  ];

  for (const frame of frames) {
    content.push({
      type: "image_url",
      image_url: { url: frame.dataUrl },
    });
  }

  return content;
}
