import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download, Link as LinkIcon, Check, Image as ImageIcon, FileText, Github } from "lucide-react";
import { buildConsensusSharePayload } from "@/lib/viralShare";

/**
 * "Share Consensus Result" button — viral loop for the 7-minute session.
 *
 * Lets the user export the current multi-model comparison as:
 *   1. A shareable URL (with the prompt + responses embedded as base64)
 *   2. A PNG image (rendered client-side via SVG-to-canvas, no backend)
 *
 * The exported image always includes a "Powered by ShadowTalk AI
 * (Zero-Knowledge BYOK Canvas)" footer — see the SVG template below.
 *
 * The button is designed to sit in the multi-model canvas toolbar.
 */

export interface ModelResponse {
  model: string;
  provider: "openai" | "anthropic" | "google" | "groq" | "openrouter" | "local";
  response: string;
  /** Latency in ms, optional (shown in the export). */
  latencyMs?: number;
}

export interface ConsensusPayload {
  prompt: string;
  responses: ModelResponse[];
  /** ISO timestamp of the comparison run. */
  timestamp: string;
}

interface ShareConsensusResultProps {
  payload: ConsensusPayload;
  /** Optional className override. */
  className?: string;
  /** Compact mode (icon-only button). */
  compact?: boolean;
}

/**
 * Render the consensus comparison as an SVG, then convert to PNG via canvas.
 * This avoids needing html-to-image or dom-to-image libraries.
 */
function buildConsensusSvg(payload: ConsensusPayload): string {
  const { prompt, responses, timestamp } = payload;
  const W = 1200;
  const HEADER_H = 140;
  const CARD_H = 320;
  const FOOTER_H = 60;
  const PAD = 24;
  const cardW = (W - PAD * (responses.length + 1)) / responses.length;
  const H = HEADER_H + CARD_H + FOOTER_H;

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + "\u2026" : s);

  const promptShort = escape(truncate(prompt, 180));
  const ts = new Date(timestamp).toLocaleString();

  const cards = responses
    .map((r, i) => {
      const x = PAD + i * (cardW + PAD);
      const y = HEADER_H;
      const bodyText = escape(truncate(r.response, 600));
      const lines = bodyText.split(/(?<=\.\s|\n)/).slice(0, 14);
      const tspans = lines
        .map((line, idx) => `<tspan x="${x + 16}" dy="${idx === 0 ? 0 : 18}">${escape(truncate(line, 70))}</tspan>`)
        .join("");
      const latency = r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "";
      return `
    <rect x="${x}" y="${y}" width="${cardW}" height="${CARD_H - 16}" rx="12" fill="#14141c" stroke="#2a2a36" stroke-width="1"/>
    <text x="${x + 16}" y="${y + 28}" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#e8e8ef">${escape(r.model)}</text>
    <text x="${x + 16}" y="${y + 46}" font-family="system-ui, sans-serif" font-size="11" fill="#7c9cff">${escape(r.provider)}${latency ? " · " + latency : ""}</text>
    <line x1="${x + 16}" y1="${y + 56}" x2="${x + cardW - 16}" y2="${y + 56}" stroke="#2a2a36" stroke-width="1"/>
    <text x="${x + 16}" y="${y + 76}" font-family="system-ui, sans-serif" font-size="11" fill="#a8a8b8">${tspans}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0f"/>
  <rect x="0" y="0" width="${W}" height="4" fill="#3b82f6"/>
  <text x="${PAD}" y="44" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#ffffff">ShadowTalk AI — Multi-Model Consensus</text>
  <text x="${PAD}" y="72" font-family="system-ui, sans-serif" font-size="13" fill="#9ca3af">Prompt:</text>
  <text x="${PAD}" y="94" font-family="system-ui, sans-serif" font-size="13" fill="#e8e8ef" font-weight="500">${promptShort}</text>
  <text x="${PAD}" y="118" font-family="system-ui, sans-serif" font-size="11" fill="#6b7280">${ts} · ${responses.length} models compared</text>
  ${cards}
  <text x="${W / 2}" y="${H - 22}" font-family="system-ui, sans-serif" font-size="12" fill="#7c9cff" text-anchor="middle" font-weight="500">
    Powered by ShadowTalk AI (Zero-Knowledge BYOK Canvas) · shadowtalk-ai.com
  </text>
</svg>`;
}

async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.width || 1200;
      const h = img.height || 520;
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob returned null"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG image load failed"));
    };
    img.src = url;
  });
}

export function ShareConsensusResult({ payload, className = "", compact = false }: ShareConsensusResultProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = useCallback(async () => {
    const share = buildConsensusSharePayload(payload);
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: open the URL in a new tab
      window.open(share.url, "_blank");
    }
  }, [payload]);

  const handleDownloadPng = useCallback(async () => {
    setExporting(true);
    try {
      const svg = buildConsensusSvg(payload);
      const blob = await svgToPng(svg, 2);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shadowtalk-consensus-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Consensus PNG export failed:", e);
    } finally {
      setExporting(false);
    }
  }, [payload]);

  const [copiedMd, setCopiedMd] = useState(false);

  const buildMarkdown = useCallback((p: ConsensusPayload): string => {
    const lines: string[] = [];
    lines.push(`# Multi-Model Consensus`);
    lines.push(``);
    lines.push(`> _Powered by [ShadowTalk AI](https://www.shadowtalk-ai.com) (Zero-Knowledge BYOK Canvas)_`);
    lines.push(``);
    lines.push(`## Prompt`);
    lines.push(``);
    lines.push(p.prompt);
    lines.push(``);
    lines.push(`## Responses`);
    lines.push(``);
    for (const r of p.responses) {
      lines.push(`### ${r.model} (${r.provider})${r.latencyMs ? ` · ${(r.latencyMs / 1000).toFixed(1)}s` : ""}`);
      lines.push(``);
      lines.push(r.response);
      lines.push(``);
    }
    lines.push(`---`);
    lines.push(``);
    lines.push(`_Compared with [ShadowTalk AI](https://www.shadowtalk-ai.com/chatbot?demo=true&utm_source=consensus-md) — 100% BYOK, WebGPU local inference, zero data leaves your device._`);
    return lines.join("\n");
  }, []);

  const handleCopyMarkdown = useCallback(async () => {
    const md = buildMarkdown(payload);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      window.setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      // Fallback: open a data: URL
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, [payload, buildMarkdown]);

  const handleExportGist = useCallback(() => {
    const md = buildMarkdown(payload);
    // Open GitHub Gist's "new gist" page with the markdown pre-filled via query param.
    // GitHub doesn't support pre-filling via URL directly, so we open the new-gist
    // page and copy the markdown to the clipboard so the user can paste it.
    navigator.clipboard.writeText(md).catch(() => {});
    window.open("https://gist.github.com/", "_blank");
    // Brief toast-like feedback via the parent's existing UI
    setCopiedMd(true);
    window.setTimeout(() => setCopiedMd(false), 2500);
  }, [payload, buildMarkdown]);

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <Button
        variant="outline"
        size={compact ? "sm" : "sm"}
        className="gap-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" />
        {!compact && <span>Share Consensus</span>}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-2"
            role="menu"
          >
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={exporting}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors disabled:opacity-50"
            >
              <ImageIcon className="h-4 w-4 text-primary" />
              <span>{exporting ? "Exporting..." : "Export as PNG"}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
            >
              {copiedMd ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              <span>{copiedMd ? "Copied!" : "Copy as Markdown"}</span>
            </button>
            <button
              type="button"
              onClick={handleExportGist}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
            >
              <Github className="h-4 w-4 text-primary" />
              <span>Open as GitHub Gist</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <LinkIcon className="h-4 w-4 text-primary" />
              )}
              <span>{copied ? "Copied!" : "Copy shareable link"}</span>
            </button>
            <div className="px-3 py-2 mt-1 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                PNG / Markdown / Gist exports all include a &quot;Powered by ShadowTalk AI&quot; footer.
                Links are anonymous — your API key never leaves your browser.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ShareConsensusResult;
