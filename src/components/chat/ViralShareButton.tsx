import { useState, useMemo } from "react";
import { Copy, Share2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { buildInAppSharePayload, getViralShareLinks } from "@/lib/viralShare";

export const ViralShareButton = ({ className }: { className?: string }) => {
  const [copied, setCopied] = useState(false);
  const payload = useMemo(() => buildInAppSharePayload(), []);
  const links = useMemo(() => getViralShareLinks(payload), [payload]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(links.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      return;
    } catch {}
    const ta = document.createElement("textarea");
    ta.value = links.copy;
    Object.assign(ta.style, {
      position: "fixed",
      left: "-9999px",
      opacity: "0",
    });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={share}
            size="icon"
            variant="ghost"
            className={className ?? "h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30"}
            aria-label="Share ShadowTalk"
          >
            {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {copied ? "Copied" : "Share ShadowTalk"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
