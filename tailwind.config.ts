import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import tailwindPalette from "tailwindcss/colors";
import { hexToHsl, hslToTriplet } from "./src/lib/themes/contrast";

/**
 * Theme-driven palette remap (Appearance Studio).
 *
 * Every Tailwind palette family is re-pointed at an `--st-*` CSS variable
 * ramp that `applyTheme` derives from the active theme (see
 * src/lib/themes/palette.ts). Each utility keeps the family's original
 * Tailwind color as a var() fallback, so before any theme is applied the
 * site renders exactly as before. `<alpha-value>` keeps bg-white/10-style
 * opacity modifiers working.
 */
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const fallbackTriplet = (family: Record<string, string | undefined>, shade: number): string => {
  const hex = family[shade] ?? family[900] ?? "#0f172a";
  const hsl = hexToHsl(hex);
  return hsl ? hslToTriplet(hsl) : "240 6% 12%";
};

const ramp = (anchor: string, family: Record<string, string | undefined>) =>
  Object.fromEntries(
    SHADES.map((shade) => [
      String(shade),
      `hsl(var(--st-${anchor}-${shade}, ${fallbackTriplet(family, shade)}) / <alpha-value>)`,
    ]),
  );

const themedPalette: Record<string, Record<string, string>> = (() => {
  const familyToAnchor: Record<string, string> = {
    slate: "neutral", gray: "neutral", zinc: "neutral", neutral: "neutral", stone: "neutral",
    purple: "primary", violet: "primary", fuchsia: "primary", pink: "primary",
    indigo: "glow", blue: "glow", sky: "glow", cyan: "glow",
    teal: "success", emerald: "success", green: "success", lime: "success",
    yellow: "warning", amber: "warning", orange: "warning",
    red: "destructive", rose: "destructive",
  };
  const palette: Record<string, Record<string, string>> = {};
  for (const [family, anchor] of Object.entries(familyToAnchor)) {
    palette[family] = ramp(anchor, tailwindPalette[family] as unknown as Record<string, string>);
  }
  palette.white = { DEFAULT: "hsl(var(--st-white, 0 0% 100%) / <alpha-value>)" };
  palette.black = { DEFAULT: "hsl(var(--st-black, 0 0% 0%) / <alpha-value>)" };
  return palette;
})();

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      xs: "475px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1400px",
    },
    extend: {
      fontFamily: {
        sans: ['var(--app-font-sans)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--app-font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ...themedPalette,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.6s ease-out forwards",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
