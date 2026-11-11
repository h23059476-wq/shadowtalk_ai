import { getApiBaseUrl } from "@/lib/cloudEnv";

export type ShareKind = "mission" | "presentation" | "chat";

const SITE_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://www.shadowtalk-ai.com";

const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;

export type ShareUtm = {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
};

export function buildAppShareUrl(opts: {
  path?: string;
  ref?: string | null;
  utm: ShareUtm;
}): string {
  const url = new URL(opts.path ?? "/chatbot", SITE_ORIGIN);
  url.searchParams.set("utm_source", opts.utm.source);
  url.searchParams.set("utm_medium", opts.utm.medium);
  url.searchParams.set("utm_campaign", opts.utm.campaign);
  if (opts.utm.content) url.searchParams.set("utm_content", opts.utm.content);
  if (opts.ref) url.searchParams.set("ref", opts.ref);
  return url.toString();
}

/** Public share link — falls back to redirect when no cloud base. */
export function buildShareOgLink(opts: {
  title: string;
  subtitle?: string;
  ref?: string | null;
  kind: ShareKind;
  redirectPath?: string;
  utm: ShareUtm;
}): string {
  const redirect = buildAppShareUrl({
    path: opts.redirectPath ?? "/chatbot",
    ref: opts.ref,
    utm: opts.utm,
  });

  const base = getApiBaseUrl();
  if (!base) {
    return redirect;
  }

  const url = new URL(`""`);
  url.searchParams.set("title", opts.title.slice(0, 120));
  if (opts.subtitle) url.searchParams.set("subtitle", opts.subtitle.slice(0, 200));
  if (opts.ref) url.searchParams.set("ref", opts.ref);
  url.searchParams.set("kind", opts.kind);
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

export function getShareSocialUrls(opts: {
  title: string;
  subtitle?: string;
  ref?: string | null;
  kind: ShareKind;
}) {
  const utm = {
    source: "share",
    medium: "social",
    campaign: `shadowtalk_${opts.kind}`,
  } as const;

  const link = buildShareOgLink({
    title: opts.title,
    subtitle: opts.subtitle,
    ref: opts.ref,
    kind: opts.kind,
    utm,
  });

  const text = encodeURIComponent(
    `${opts.title}${opts.subtitle ? ` — ${opts.subtitle}` : ""} · Built with ShadowTalk AI`,
  );

  return {
    link,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(link)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(link)}`,
    email: `mailto:?subject=${encodeURIComponent(opts.title)}&body=${text}%20${encodeURIComponent(link)}`,
  };
}

/** Branded 1200×630 PNG for manual upload / stories */
export async function renderShareCardPng(title: string, subtitle?: string): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 1200, 630);
  grad.addColorStop(0, "#050508");
  grad.addColorStop(0.5, "#0f172a");
  grad.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
  ctx.beginPath();
  ctx.arc(1000, 120, 200, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText("ShadowTalk AI", 72, 88);

  ctx.fillStyle = "#f8fafc";
  const titleFontSize = 52;
  const titleLineHeight = 62;
  ctx.font = `bold ${titleFontSize}px system-ui, sans-serif`;
  const titleStartY = 160;
  const subtitleFontSize = 32;
  const subtitleLineHeight = 42;
  const subtitleGapY = 28;
  // Keep some breathing room so text doesn't collide with the watermark.
  const contentBottomY = 520;

  const titleLines = wrapCanvasText(ctx, title, 1056);

  // Draw as many title lines as possible while keeping enough room for subtitle (if any).
  let titleDrawnCount = titleLines.length;
  if (subtitle) {
    // Try to fit subtitle too (subtitle is capped at 3 lines by design).
    const desiredSubtitleLines = 3;
    titleDrawnCount = Math.min(titleDrawnCount, 6);
    for (let c = titleDrawnCount; c >= 1; c--) {
      const subtitleStartY = titleStartY + c * titleLineHeight + subtitleGapY;
      const maxSubtitleLinesThatFit = Math.floor((contentBottomY - subtitleStartY) / subtitleLineHeight);
      if (maxSubtitleLinesThatFit >= 1) {
        // If we can fit all desired subtitle lines, stop early.
        if (maxSubtitleLinesThatFit >= desiredSubtitleLines) {
          titleDrawnCount = c;
          break;
        }
        titleDrawnCount = c;
        break;
      }
    }
  } else {
    titleDrawnCount = Math.min(titleDrawnCount, Math.floor((contentBottomY - titleStartY) / titleLineHeight));
  }

  titleLines.slice(0, titleDrawnCount).forEach((line, i) => {
    ctx.fillText(line, 72, titleStartY + i * titleLineHeight);
  });

  if (subtitle) {
    const subtitleStartY = titleStartY + titleDrawnCount * titleLineHeight + subtitleGapY;
    ctx.fillStyle = "#94a3b8";
    ctx.font = `bold ${subtitleFontSize}px system-ui, sans-serif`;
    const subLines = wrapCanvasText(ctx, subtitle, 1056);
    const maxSubtitleLines = Math.min(
      subLines.length,
      Math.floor((contentBottomY - subtitleStartY) / subtitleLineHeight),
    );
    subLines.slice(0, maxSubtitleLines).forEach((line, i) => {
      ctx.fillText(line, 72, subtitleStartY + i * subtitleLineHeight);
    });
  }

  ctx.fillStyle = "#64748b";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText("Think AI. Think ShadowTalk. · shadowtalk-ai.com", 72, 560);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text.slice(0, 80)];
}

export function getDefaultOgImageUrl(): string {
  return DEFAULT_OG_IMAGE;
}
