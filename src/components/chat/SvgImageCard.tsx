import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Code2, Copy, Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  codedImageFileName,
  downloadBlob,
  svgToRasterBlob,
} from "@/lib/codedImages";

interface SvgImageCardProps {
  /** Validated, self-contained SVG markup (from validateSvg). */
  svg: string;
  width?: number;
  height?: number;
  /** Opens the source code in the side-docked Canvas, like any code block. */
  onOpenCanvas?: (code: string, language: string) => void;
}

type ExportState = "idle" | "working" | "error";

/**
 * Coded-image card: the model wrote the picture as SVG, so show the picture.
 *
 * Preview renders through a blob URL in an <img> (scripts never execute in
 * that context). Exports run through the native canvas — PNG keeps alpha,
 * JPG flattens onto white — so the whole feature is offline and zero-egress.
 */
export function SvgImageCard({ svg, width, height, onOpenCanvas }: SvgImageCardProps) {
  const { toast } = useToast();
  const [pngState, setPngState] = useState<ExportState>("idle");
  const [jpgState, setJpgState] = useState<ExportState>("idle");
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  const previewUrl = useMemo(
    () => URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" })),
    [svg],
  );
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
  }, []);

  const exportAs = useCallback(
    async (format: "png" | "jpeg") => {
      const setState = format === "png" ? setPngState : setJpgState;
      setState("working");
      try {
        const blob = await svgToRasterBlob(svg, {
          format,
          scale: 2,
          background: format === "jpeg" ? "#ffffff" : undefined,
        });
        downloadBlob(blob, codedImageFileName(format === "png" ? "png" : "jpg"));
        setState("idle");
      } catch (err) {
        setState("error");
        toast({
          title: "Export failed",
          description: err instanceof Error ? err.message : "The image could not be exported.",
          variant: "destructive",
        });
      }
    },
    [svg, toast],
  );

  const copySvg = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(svg);
      setCopied(true);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access was denied.", variant: "destructive" });
    }
  }, [svg, toast]);

  const dims = width && height ? `${Math.round(width)}×${Math.round(height)}` : null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-border/10 shadow-lg max-w-xl mb-3 my-2 bg-background/60"
      data-testid="svg-image-card"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/10 bg-muted/20">
        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
          coded image · svg{dims ? ` · ${dims}` : ""}
        </span>
        <button
          type="button"
          onClick={() => onOpenCanvas?.(svg, "svg")}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          aria-label="Open SVG code in Canvas"
        >
          <Code2 className="h-3.5 w-3.5" aria-hidden />
          Code
        </button>
      </div>

      <div className="flex items-center justify-center p-4 bg-background">
        <img
          src={previewUrl}
          alt="AI-generated image rendered from SVG code"
          className="max-h-[420px] w-auto max-w-full object-contain"
          draggable={false}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-border/10 bg-muted/20">
        <button
          type="button"
          onClick={() => exportAs("png")}
          disabled={pngState === "working"}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-medium px-3.5 py-1.5 hover:bg-primary/20 transition-colors disabled:opacity-60"
          aria-label="Download image as PNG"
        >
          {pngState === "working" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          PNG
        </button>
        <button
          type="button"
          onClick={() => exportAs("jpeg")}
          disabled={jpgState === "working"}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-medium px-3.5 py-1.5 hover:bg-primary/20 transition-colors disabled:opacity-60"
          aria-label="Download image as JPG"
        >
          {jpgState === "working" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          JPG
        </button>
        <button
          type="button"
          onClick={copySvg}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/40 text-muted-foreground text-[12px] font-medium px-3.5 py-1.5 hover:text-foreground hover:border-border transition-colors"
          aria-label="Copy SVG code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy SVG"}
        </button>
        <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto hidden sm:inline">
          rendered on-device · nothing uploaded
        </span>
      </div>
    </div>
  );
}

export default SvgImageCard;
