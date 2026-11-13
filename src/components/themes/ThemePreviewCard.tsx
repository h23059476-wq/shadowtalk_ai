import { memo } from "react";
import { Check, Copy, Download, Eye, MoreVertical, Palette, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getCollectionLabel } from "@/lib/themes/collections";
import type { ResolvedTheme } from "@/lib/themes/types";
import { ThemeMiniPreview } from "./ThemeMiniPreview";

interface ThemePreviewCardProps {
  theme: ResolvedTheme;
  active: boolean;
  favorite: boolean;
  onApply: (theme: ResolvedTheme) => void;
  onPreview: (theme: ResolvedTheme) => void;
  onToggleFavorite: (id: string) => void;
  onEdit?: (theme: ResolvedTheme) => void;
  onDuplicate?: (theme: ResolvedTheme) => void;
  onRename?: (theme: ResolvedTheme) => void;
  onDelete?: (theme: ResolvedTheme) => void;
  onExport?: (theme: ResolvedTheme) => void;
}

/**
 * Discovery card: realistic mini preview + identity, actions and active state.
 */
export const ThemePreviewCard = memo(function ThemePreviewCard({
  theme,
  active,
  favorite,
  onApply,
  onPreview,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onRename,
  onDelete,
  onExport,
}: ThemePreviewCardProps) {
  const collectionLabel = getCollectionLabel(theme.collection);
  const isCustom = theme.collection === "custom" || theme.source === "custom" || theme.source === "imported";

  return (
    <div
      data-testid="theme-card"
      data-theme-id={theme.id}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-all",
        "hover:shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        active && "border-primary ring-2 ring-primary/60",
      )}
    >
      <button
        type="button"
        className="relative cursor-pointer text-left focus-visible:outline-none"
        onClick={() => onPreview(theme)}
        aria-label={`Preview ${theme.name}`}
        data-testid={`preview-${theme.id}`}
      >
        <ThemeMiniPreview theme={theme} size="card" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg">
            <Eye className="h-3.5 w-3.5" /> Preview
          </span>
        </span>
        {active && (
          <span
            className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            data-testid={`active-badge-${theme.id}`}
          >
            <Check className="h-3 w-3" /> Active
          </span>
        )}
      </button>

      <div className="flex min-h-[86px] flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold" title={theme.name}>{theme.name}</h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground" title={theme.description}>
              {theme.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleFavorite(theme.id)}
            aria-pressed={favorite}
            aria-label={favorite ? `Remove ${theme.name} from favorites` : `Add ${theme.name} to favorites`}
            data-testid={`favorite-${theme.id}`}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className={cn("h-4 w-4", favorite && "fill-yellow-400 text-yellow-400")} />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {collectionLabel}
            </span>
            <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
              {theme.mode}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isCustom && onEdit && (
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(theme)}>
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => onApply(theme)}
              disabled={active}
              data-testid={`apply-${theme.id}`}
            >
              <Palette className="mr-1 h-3 w-3" />
              {active ? "Applied" : "Apply"}
            </Button>
            {(isCustom || theme.source === "builtin") && (onDuplicate || onDelete || onExport || onRename) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label={`More actions for ${theme.name}`}
                    data-testid={`actions-${theme.id}`}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {onRename && (
                    <DropdownMenuItem onClick={() => onRename(theme)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={() => onDuplicate(theme)}>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={() => onExport(theme)}>
                      <Download className="mr-2 h-3.5 w-3.5" /> Export JSON
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(theme)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
