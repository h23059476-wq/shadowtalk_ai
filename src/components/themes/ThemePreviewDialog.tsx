import { Palette, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCollectionLabel } from "@/lib/themes/collections";
import type { ResolvedTheme } from "@/lib/themes/types";
import { ThemeMiniPreview } from "./ThemeMiniPreview";
import { cn } from "@/lib/utils";

interface ThemePreviewDialogProps {
  theme: ResolvedTheme | null;
  open: boolean;
  active: boolean;
  favorite: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (theme: ResolvedTheme) => void;
  onToggleFavorite: (id: string) => void;
}

/** Larger preview with identity and quick actions. */
export function ThemePreviewDialog({
  theme,
  open,
  active,
  favorite,
  onOpenChange,
  onApply,
  onToggleFavorite,
}: ThemePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" data-testid="theme-preview-dialog">
        {theme && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {theme.name}
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {getCollectionLabel(theme.collection)}
                </span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                  {theme.mode}
                </span>
              </DialogTitle>
              <DialogDescription>{theme.description}</DialogDescription>
            </DialogHeader>
            <ThemeMiniPreview theme={theme} size="full" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {theme.preview.map((hex, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded-md border border-border"
                    style={{ background: hex }}
                    title={hex}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={favorite}
                  onClick={() => onToggleFavorite(theme.id)}
                  data-testid={`dialog-favorite-${theme.id}`}
                >
                  <Star className={cn("mr-1.5 h-4 w-4", favorite && "fill-yellow-400 text-yellow-400")} />
                  {favorite ? "Favorited" : "Favorite"}
                </Button>
                <Button
                  size="sm"
                  disabled={active}
                  onClick={() => onApply(theme)}
                  data-testid={`dialog-apply-${theme.id}`}
                >
                  <Palette className="mr-1.5 h-4 w-4" />
                  {active ? "Active theme" : "Apply theme"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
