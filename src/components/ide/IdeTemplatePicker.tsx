import { Braces, FileCode2, Image as ImageIcon, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export interface IdeTemplate {
  id: string;
  label: string;
  description: string;
  icon: typeof FileCode2;
  gradient: string;
}

export const IDE_TEMPLATES: IdeTemplate[] = [
  { id: "vanilla", label: "Vanilla JS", description: "HTML + CSS + JavaScript — live preview, no build step.", icon: FileCode2, gradient: "from-sky-400 to-cyan-500" },
  { id: "react", label: "React App", description: "React 18 via CDN UMD — a working counter component.", icon: Braces, gradient: "from-cyan-400 to-violet-500" },
  { id: "svg", label: "SVG Poster", description: "A coded image you can edit and export as PNG/JPG.", icon: ImageIcon, gradient: "from-accent to-primary" },
  { id: "python", label: "Python", description: "A runnable-in-review script — the agent reads it best.", icon: Terminal, gradient: "from-teal-400 to-emerald-500" },
];

interface IdeTemplatePickerProps {
  open: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** Start-a-project modal — brand glass cards on a blurred backdrop. */
export function IdeTemplatePicker({ open, onPick, onClose }: IdeTemplatePickerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a project template"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-px bg-gradient-to-r from-primary/60 via-secondary/60 to-accent/60" aria-hidden />
        <div className="p-5">
          <h2 className="text-base font-bold tracking-tight">Start a new project</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Templates load into the workspace — everything stays on this device.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {IDE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onPick(tpl.id)}
                className="group text-left rounded-xl border border-border bg-background/40 p-3.5 hover:border-primary/50 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={`h-8 w-8 rounded-lg bg-gradient-to-br ${tpl.gradient} p-[6px] flex items-center justify-center mb-2.5 shadow-md`}>
                  <tpl.icon className="h-4 w-4 text-white" aria-hidden />
                </span>
                <span className="block text-sm font-semibold group-hover:text-primary transition-colors">
                  {tpl.label}
                </span>
                <span className="block text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {tpl.description}
                </span>
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={onClose} className="w-full mt-4 text-xs">
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
