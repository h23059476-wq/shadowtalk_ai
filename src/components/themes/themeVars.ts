/**
 * ShadowTalk AI — theme CSS variable helpers for React previews.
 *
 * A preview container gets the theme's full token set as inline CSS
 * variables; because CSS variables cascade, every semantic utility class
 * inside (bg-background, text-foreground, bg-primary, …) renders with the
 * theme's colors. Previews are therefore true miniatures of the real app.
 */
import type { CSSProperties } from "react";
import type { ResolvedTheme } from "@/lib/themes/types";
import { TOKEN_MAP } from "@/lib/themes/applyTheme";
import { getMonoFont, getSansFont } from "@/lib/themes/fonts";

export function themeCssVars(theme: ResolvedTheme): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(TOKEN_MAP)) {
    const value = (theme.tokens as unknown as Record<string, string>)[key];
    if (typeof value === "string") vars[cssVar] = value;
  }
  vars["--radius"] = `${theme.radiusRem}rem`;
  vars["--app-font-sans"] = getSansFont(theme.fontSans).stack;
  vars["--app-font-mono"] = getMonoFont(theme.fontMono).stack;
  theme.chartColors.forEach((color, i) => {
    vars[`--chart-${i + 1}`] = color;
  });
  vars["--code-background"] = theme.codeColors.background;
  vars["--code-foreground"] = theme.codeColors.foreground;
  return vars as CSSProperties;
}
