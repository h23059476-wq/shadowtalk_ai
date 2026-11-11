/**
 * ShadowTalk AI — image watermarking.
 *
 * Every image ShadowTalk generates or edits is stamped with a subtle
 * "ShadowTalk AI" mark before it reaches the user.
 */

export const WATERMARK_TEXT = "ShadowTalk AI";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    const timeout = setTimeout(() => reject(new Error("image load timeout")), 15000);
    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("image load failed"));
    };
    img.src = src;
  });
}

/**
 * Draw the ShadowTalk watermark onto an image and return a new data URL.
 * Falls back to the original source if canvas access isn't possible
 * (SSR, tainted cross-origin canvas, decode failure).
 */
export async function applyImageWatermark(src: string): Promise<string> {
  if (
    !src ||
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof Image === "undefined"
  ) {
    return src;
  }

  try {
    const img = await loadImage(src);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return src;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;

    ctx.drawImage(img, 0, 0, w, h);

    const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.032));
    const pad = Math.round(fontSize * 0.9);

    ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";

    const metrics = ctx.measureText(WATERMARK_TEXT);
    const textW = metrics.width;
    const boxH = Math.round(fontSize * 1.7);
    const boxW = Math.round(textW + fontSize * 1.4);
    const boxX = w - pad - boxW;
    const boxY = h - pad - boxH;

    // Frosted plate behind the mark so it reads on any background
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000000";
    const r = Math.round(boxH / 2);
    ctx.beginPath();
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxW - r, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
    ctx.lineTo(boxX + boxW, boxY + boxH - r);
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
    ctx.lineTo(boxX + r, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
    ctx.lineTo(boxX, boxY + r);
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(WATERMARK_TEXT, w - pad - Math.round(fontSize * 0.7), boxY + boxH - Math.round(fontSize * 0.5));
    ctx.globalAlpha = 1;

    return canvas.toDataURL("image/png");
  } catch {
    return src;
  }
}
