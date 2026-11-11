import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageIcon, FileText, Presentation, Search, TrendingUp, Calculator,
  Code, Settings, Brain, BookOpen, Shield, CreditCard, BarChart3,
  Trash2, Plus, HelpCircle, Share2, Download,
} from "lucide-react";
import { filterSlashCommands, SLASH_COMMAND_CATEGORIES, type SlashCommand } from "@/lib/slashCommands";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ImageIcon, FileText, Presentation, Search, TrendingUp, Calculator,
  Code, Settings, Brain, BookOpen, Shield, CreditCard, BarChart3,
  Trash2, Plus, HelpCircle, Share2, Download,
};

interface SlashCommandMenuProps {
  /** The current input value (used to filter commands). */
  query: string;
  /** Called when a command is selected — inserts the command into the input. */
  onSelect: (command: SlashCommand) => void;
  /** Called when the menu should close (Escape, blur, etc.). */
  onClose: () => void;
  /** Whether the menu is visible. */
  open: boolean;
}

export function SlashCommandMenu({ query, onSelect, onClose, open }: SlashCommandMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterSlashCommands(query), [query]);

  // Reset active index when the filtered list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll the active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Keyboard navigation (ArrowUp/Down/Enter/Escape)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filtered[activeIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, filtered, activeIndex, onSelect, onClose]);

  if (!open || filtered.length === 0) return null;

  // Group by category
  const grouped = SLASH_COMMAND_CATEGORIES.map((cat) => ({
    ...cat,
    commands: filtered.filter((c) => c.category === cat.id),
  })).filter((g) => g.commands.length > 0);

  let runningIndex = 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute bottom-full left-0 right-0 mb-2 z-50 max-h-[340px] overflow-y-auto rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-2xl shadow-2xl"
        ref={listRef}
      >
        <div className="px-3 py-2 border-b border-border/40 sticky top-0 bg-popover/95 backdrop-blur-2xl z-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Slash Commands
          </p>
        </div>
        <div className="p-1.5">
          {grouped.map((group) => (
            <div key={group.id} className="mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              {group.commands.map((cmd) => {
                const Icon = ICON_MAP[cmd.icon] || HelpCircle;
                const idx = runningIndex++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={cmd.command}
                    data-idx={idx}
                    type="button"
                    onClick={() => onSelect(cmd)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isActive ? "bg-primary/15 text-foreground" : "text-foreground/90 hover:bg-muted/40"
                    }`}
                  >
                    <div className={`shrink-0 mt-0.5 rounded-md p-1.5 ${isActive ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold font-mono">{cmd.command}</span>
                        <span className="text-xs text-muted-foreground">{cmd.label}</span>
                        {cmd.requiresByok && (
                          <span className="text-[9px] uppercase tracking-wider bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded-full">
                            BYOK
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{cmd.description}</p>
                      {cmd.example && (
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 truncate">{cmd.example}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-3 py-1.5 border-t border-border/40 sticky bottom-0 bg-popover/95 backdrop-blur-2xl flex items-center justify-between text-[10px] text-muted-foreground">
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span>{filtered.length} command{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SlashCommandMenu;
