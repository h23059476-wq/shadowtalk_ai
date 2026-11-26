/**
 * IDE SVG file preview — local helpers for rendering/exporting .svg FILES
 * that already exist in the IDE workspace (e.g. via `path=poster.svg`).
 *
 * This is a developer file-preview utility, NOT the AI visual generator:
 * chat/agent visuals are rendered exclusively by the JSON-to-Engine
 * pipeline in src/components/visual (ECharts / Mermaid / Bento). The
 * validator/rasterizer below was moved here from the retired
 * lib/codedImages chat generator so the IDE can still preview and export
 * SVG files on-device, with the same offline-safety guarantees:
 *
 * Security model: SVGs render through <img src=data:…>, where scripts never
 * execute. validateSvg() rejects anything that could taint the canvas or
 * phone home when rasterized (scripts, event handlers, external resources),
 * so canvas exports stay reliable and offline-safe.
 */

/** Dimensions of a validated SVG drawing. */
export interface SvgDims {
  width: number;
  height: number;
}

export type SvgValidation =
  | { ok: true; svg: string; width: number; height: number }
  | { ok: false; reason: string };

/** Fallback canvas size when the SVG declares neither size nor viewBox. */
const DEFAULT_DIMS: SvgDims = { width: 1024, height: 1024 };

/** Hard ceiling for the rasterized canvas (browser limits, memory safety). */
const MAX_RASTER_EDGE = 8192;
export const DEFAULT_RASTER_SCALE = 2;

/** Extract width/height/viewBox attributes from the `<svg …>` root tag. */
function readRootAttrs(svg: string): string {
  const open = svg.match(/<svg\b[^>]*>/i);
  return open ? open[0] : "";
}

function readNumericAttr(rootTag: string, attr: "width" | "height"): number | null {
  const m = rootTag.match(new RegExp(`\\b${attr}\\s*=\\s*["']\\s*([\\d.]+)(?:px)?\\s*["']`, "i"));
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readViewBox(rootTag: string): SvgDims | null {
  const m = rootTag.match(
    /\bviewBox\s*=\s*["']\s*([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)\s*["']/i,
  );
  if (!m) return null;
  const w = Number.parseFloat(m[3]);
  const h = Number.parseFloat(m[4]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { width: w, height: h };
}

function injectRootAttrs(svg: string, dims: SvgDims): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    let injected = attrs;
    if (!/\swidth\s*=/i.test(attrs)) injected += ` width="${dims.width}"`;
    if (!/\sheight\s*=/i.test(attrs)) injected += ` height="${dims.height}"`;
    return `<svg${injected}>`;
  });
}

/**
 * Validate (and normalize) an SVG file for preview/rasterization.
 * Rejects scripts, event-handler attributes and any reference that would
 * fetch from the network. On success the svg string is trimmed to the
 * single root `<svg>…</svg>` element and guaranteed to carry explicit
 * width/height so rasterization and layout are deterministic.
 */
export function validateSvg(code: string): SvgValidation {
  const start = code.search(/<svg\b/i);
  if (start === -1) return { ok: false, reason: "no <svg> element found" };
  const openEnd = code.indexOf(">", start);
  if (openEnd === -1) return { ok: false, reason: "malformed <svg> root tag" };
  const close = code.indexOf("</svg>", openEnd);
  if (close === -1) return { ok: false, reason: "unterminated <svg> element" };

  let svg = code.slice(start, close + "</svg>".length).trim();

  if (/<script[\s>]/i.test(svg)) {
    return { ok: false, reason: "scripts are not allowed in SVG previews" };
  }
  if (/\son[a-z]+\s*=/i.test(svg)) {
    return { ok: false, reason: "event handler attributes are not allowed" };
  }

  // Namespace declarations legitimately contain w3.org URLs — remove them
  // before scanning for anything that would actually fetch.
  const scan = svg.replace(/\sxmlns(?::[a-z]+)?\s*=\s*["'][^"']*["']/gi, " ");
  if (/https?:\/\//i.test(scan)) {
    return { ok: false, reason: "external URLs are not allowed — inline everything" };
  }
  if (/=\s*["']\s*\/\//.test(scan)) {
    return { ok: false, reason: "protocol-relative URLs are not allowed" };
  }
  // href / xlink:href / src must be data: URIs or #internal refs.
  const refBad = /\b(?:xlink:href|href|src)\s*=\s*["']\s*(?!data:|#)([^"']*)["']/gi;
  if (refBad.test(scan)) {
    return { ok: false, reason: "external references are not allowed — use data: URIs or #refs" };
  }
  // url(...) inside style attributes / <style> blocks: data: and # only.
  const urlBad = /url\(\s*['"]?\s*(?!data:|#)([^)'"]*)/gi;
  if (urlBad.test(scan)) {
    return { ok: false, reason: "url() must reference data: URIs or #refs" };
  }

  const rootTag = readRootAttrs(svg);
  let width = readNumericAttr(rootTag, "width");
  let height = readNumericAttr(rootTag, "height");
  if (width === null || height === null) {
    const vb = readViewBox(rootTag);
    if (vb) {
      width = width ?? vb.width;
      height = height ?? vb.height;
    }
  }
  if (width === null || height === null) {
    width = DEFAULT_DIMS.width;
    height = DEFAULT_DIMS.height;
  }
  svg = injectRootAttrs(svg, { width, height });

  return { ok: true, svg, width, height };
}

/**
 * Rasterize an SVG string to a PNG or JPEG blob via the native canvas APIs.
 *
 * JPEG is flattened onto `background` (default white) because JPEG has no
 * alpha channel. `scale` upsamples the drawing for crisp exports; it is
 * clamped so no canvas edge exceeds MAX_RASTER_EDGE.
 */
export async function svgToRasterBlob(
  svg: string,
  opts: {
    format: "png" | "jpeg";
    scale?: number;
    quality?: number;
    background?: string;
  },
): Promise<Blob> {
  const { format, background } = opts;
  const quality = opts.quality ?? 0.92;
  let scale = opts.scale ?? DEFAULT_RASTER_SCALE;
  if (!Number.isFinite(scale) || scale <= 0) scale = 1;

  const rootTag = readRootAttrs(svg);
  let width = readNumericAttr(rootTag, "width");
  let height = readNumericAttr(rootTag, "height");
  if (width === null || height === null) {
    const vb = readViewBox(rootTag);
    width = width ?? vb?.width ?? DEFAULT_DIMS.width;
    height = height ?? vb?.height ?? DEFAULT_DIMS.height;
  }

  const maxSide = Math.max(width, height);
  if (maxSide * scale > MAX_RASTER_EDGE) {
    scale = Math.max(1, MAX_RASTER_EDGE / maxSide);
  }

  // Explicit pixel size on the root keeps Firefox/Chromium drawImage
  // deterministic (an <img> without intrinsic size defaults to 300×150).
  const sized = injectRootAttrs(svg, { width, height });

  const svgBlob = new Blob([sized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable in this environment.");
    }
    if (format === "jpeg" || background) {
      ctx.fillStyle = background || "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Rasterization produced no output."))),
        `image/${format}`,
        quality,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The SVG could not be rendered as an image."));
    img.src = src;
  });
}

/** Trigger a browser download for a blob (object URL is revoked after). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** shadowtalk-ide-svg-20261126-143205.png */
export function codedImageFileName(ext: "png" | "jpg", now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `shadowtalk-ide-svg-${stamp}.${ext}`;
}
