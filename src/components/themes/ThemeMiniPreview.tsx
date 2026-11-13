import { memo } from "react";
import { cn } from "@/lib/utils";
import type { ResolvedTheme } from "@/lib/themes/types";
import { themeCssVars } from "./themeVars";
import { Bot, PanelLeft, Send, User } from "lucide-react";

interface ThemeMiniPreviewProps {
  theme: ResolvedTheme;
  /** "card" fits the discovery grid; "full" is the designer/preview dialog view. */
  size?: "card" | "full";
  className?: string;
}

/**
 * A realistic miniature of the ShadowTalk workspace rendered entirely with
 * the theme's semantic tokens (scoped via inline CSS variables).
 */
export const ThemeMiniPreview = memo(function ThemeMiniPreview({
  theme,
  size = "card",
  className,
}: ThemeMiniPreviewProps) {
  const full = size === "full";
  return (
    <div
      aria-hidden="true"
      style={themeCssVars(theme)}
      className={cn(
        "relative w-full overflow-hidden border border-border bg-background text-foreground select-none",
        full ? "rounded-xl" : "rounded-lg",
        className,
      )}
    >
      <div className="flex" style={{ height: full ? "320px" : "128px" }}>
        {/* Sidebar */}
        <div
          className="flex flex-col gap-1.5 border-r p-2"
          style={{
            width: full ? "76px" : "24%",
            background: "hsl(var(--sidebar-background))",
            color: "hsl(var(--sidebar-foreground))",
            borderColor: "hsl(var(--sidebar-border))",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: "hsl(var(--sidebar-primary))" }}
            />
            {!full && <span className="h-1.5 w-8 rounded-full bg-current opacity-40" />}
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 rounded",
                i === 0 && "border",
                i === 0 ? "py-1" : "py-1",
              )}
              style={{
                borderColor: i === 0 ? "hsl(var(--sidebar-border))" : undefined,
                background: i === 0 ? "hsl(var(--sidebar-accent))" : undefined,
                paddingLeft: "4px",
              }}
            >
              <PanelLeft className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--sidebar-primary))" }} />
              {!full && <span className="h-1 w-full rounded-full bg-current opacity-30" />}
            </div>
          ))}
          <div className="mt-auto rounded border" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
            <div className="h-4" />
          </div>
        </div>

        {/* Main panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header bar */}
          <div
            className="flex items-center justify-between border-b px-2 py-1.5"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
          >
            <span className="h-2 w-12 rounded-full" style={{ background: "hsl(var(--foreground))", opacity: 0.75 }} />
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full" style={{ background: "hsl(var(--accent))" }} />
              <span className="h-3 w-3 rounded-full" style={{ background: "hsl(var(--secondary))" }} />
            </div>
          </div>

          {/* Messages */}
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-1.5 p-2">
            <div className="flex items-start gap-1.5">
              <span
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                <Bot className="h-2 w-2" />
              </span>
              <div
                className="max-w-[80%] rounded-lg border px-2 py-1"
                style={{
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <span className="block h-1 w-20 rounded-full bg-current opacity-50" />
                <span className="mt-0.5 block h-1 w-14 rounded-full bg-current opacity-30" />
              </div>
            </div>
            <div className="flex items-start justify-end gap-1.5">
              <div
                className="max-w-[70%] rounded-lg px-2 py-1"
                style={{
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                <span className="block h-1 w-16 rounded-full bg-current opacity-70" />
              </div>
              <span
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "hsl(var(--secondary))", color: "hsl(var(--secondary-foreground))" }}
              >
                <User className="h-2 w-2" />
              </span>
            </div>

            {full && (
              <>
                {/* Code block — uses the theme's code tokens */}
                <div
                  className="rounded-lg border px-2 py-1.5"
                  style={{
                    background: "hsl(var(--code-background))",
                    color: "hsl(var(--code-foreground))",
                    borderColor: "hsl(var(--border))",
                  }}
                >
                  <span className="block font-mono text-[9px] leading-tight">
                    const stream = await ai.chat(prompt);
                  </span>
                  <span className="mt-1 block h-1 w-24 rounded-full bg-current opacity-40" />
                </div>
                {/* Mini chart — uses the theme's chart palette */}
                <div className="flex items-end gap-1 px-1" style={{ height: "36px" }}>
                  {[70, 45, 90, 60, 80].map((h, i) => (
                    <div
                      key={i}
                      className="w-full rounded-t"
                      style={{
                        height: `${h}%`,
                        background: `hsl(var(--chart-${i + 1}))`,
                      }}
                    />
                  ))}
                </div>
                {/* Button row */}
                <div className="flex gap-1.5">
                  <span
                    className="rounded px-2 py-1 text-[9px] font-medium"
                    style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                  >
                    Primary
                  </span>
                  <span
                    className="rounded border px-2 py-1 text-[9px]"
                    style={{
                      background: "hsl(var(--secondary))",
                      color: "hsl(var(--secondary-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    Secondary
                  </span>
                  <span
                    className="rounded border px-2 py-1 text-[9px]"
                    style={{
                      background: "hsl(var(--muted))",
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    Muted
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Composer */}
          <div className="border-t p-1.5" style={{ borderColor: "hsl(var(--border))" }}>
            <div
              className="flex items-center gap-1.5 rounded-lg border px-2 py-1"
              style={{
                background: "hsl(var(--input))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
            >
              <span className="h-1 w-full rounded-full bg-current opacity-35" />
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                <Send className="h-2 w-2" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
