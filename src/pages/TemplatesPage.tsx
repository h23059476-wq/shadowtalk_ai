/**
 * TemplatesPage — UI theme gallery for ShadowTalk AI.
 *
 * Shows six built-in themes with live color swatches. Clicking a card
 * applies the theme by setting CSS variables on document.documentElement.
 * Includes a custom theme designer section and a "Reset to default" button.
 *
 * Route: /templates
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Droplet,
  Layers,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  bg: string;
  primary: string;
  accent: string;
  vars: Record<string, string>;
}

const PRESETS: ThemePreset[] = [
  {
    id: "shadowtalk-dark",
    name: "ShadowTalk Dark",
    description: "The signature indigo-on-near-black palette.",
    bg: "#030712",
    primary: "#6366f1",
    accent: "#a855f7",
    vars: {
      "--background": "240 10% 4%",
      "--foreground": "0 0% 96%",
      "--primary": "239 84% 67%",
      "--accent": "270 91% 65%",
    },
  },
  {
    id: "midnight-purple",
    name: "Midnight Purple",
    description: "Deep violet canvas with electric magenta accents.",
    bg: "#0f0a1e",
    primary: "#8b5cf6",
    accent: "#ec4899",
    vars: {
      "--background": "262 47% 8%",
      "--foreground": "0 0% 96%",
      "--primary": "258 90% 66%",
      "--accent": "330 81% 60%",
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Calm navy with cyan highlights for long sessions.",
    bg: "#020617",
    primary: "#0ea5e9",
    accent: "#22d3ee",
    vars: {
      "--background": "222 47% 5%",
      "--foreground": "0 0% 96%",
      "--primary": "199 89% 48%",
      "--accent": "187 85% 53%",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    description: "Earthy emerald palette — easy on the eyes.",
    bg: "#0a1410",
    primary: "#10b981",
    accent: "#84cc16",
    vars: {
      "--background": "150 30% 6%",
      "--foreground": "0 0% 96%",
      "--primary": "160 84% 39%",
      "--accent": "83 81% 53%",
    },
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    description: "Warm amber glow against deep umber.",
    bg: "#1a0f0a",
    primary: "#f97316",
    accent: "#facc15",
    vars: {
      "--background": "20 40% 7%",
      "--foreground": "0 0% 96%",
      "--primary": "25 95% 53%",
      "--accent": "48 96% 53%",
    },
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    description: "Soft pink-on-charcoal — premium feel.",
    bg: "#160a10",
    primary: "#f472b6",
    accent: "#fb7185",
    vars: {
      "--background": "330 40% 7%",
      "--foreground": "0 0% 96%",
      "--primary": "330 81% 72%",
      "--accent": "351 83% 67%",
    },
  },
];

const Swatch = ({ color, label }: { color: string; label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="w-7 h-7 rounded-full border border-white/20 shadow-sm"
      style={{ background: color }}
    />
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

export default function TemplatesPage() {
  const [active, setActive] = useState<string>("shadowtalk-dark");
  const [customPrimary, setCustomPrimary] = useState("#6366f1");
  const [customAccent, setCustomAccent] = useState("#a855f7");

  const applyPreset = (preset: ThemePreset) => {
    const root = document.documentElement;
    Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    setActive(preset.id);
    toast.success(`Applied theme: ${preset.name}`);
  };

  const applyCustom = () => {
    const toHsl = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0, s = 0;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
      }
      return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    const root = document.documentElement;
    root.style.setProperty("--primary", toHsl(customPrimary));
    root.style.setProperty("--accent", toHsl(customAccent));
    setActive("custom");
    toast.success("Custom theme applied.");
  };

  const reset = () => {
    const root = document.documentElement;
    ["--background", "--foreground", "--primary", "--accent"].forEach((k) =>
      root.style.removeProperty(k),
    );
    setActive("shadowtalk-dark");
    toast.success("Reset to ShadowTalk Dark.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "UI Templates — ShadowTalk AI",
          description:
            "Customize your ShadowTalk workspace with six built-in themes — ShadowTalk Dark, Midnight Purple, Ocean Blue, Forest Green, Sunset Orange, and Rose Gold — or design your own.",
          canonical: "https://www.shadowtalk-ai.com/templates",
          keywords: ["UI themes", "templates", "custom theme", "dark mode", "workspace customization"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: false,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
                <Palette className="w-3.5 h-3.5" />
                UI Templates
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Customize Your Workspace
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Pick a built-in theme or design your own. Changes apply instantly
                and persist across sessions on this device.
              </p>
            </div>
            <Button
              onClick={reset}
              variant="outline"
              className="border-border/50 bg-transparent hover:bg-white/5"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to default
            </Button>
          </motion.div>

          {/* Theme grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {PRESETS.map((preset, idx) => {
              const isActive = active === preset.id;
              return (
                <motion.button
                  key={preset.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 * idx }}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "ios-glass-card p-5 text-left transition-all hover:-translate-y-0.5",
                    isActive && "ring-2 ring-indigo-500/60",
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {preset.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {preset.description}
                      </p>
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 shrink-0">
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                      </span>
                    )}
                  </div>
                  <div
                    className="rounded-xl p-4 mb-4 border border-white/5"
                    style={{ background: preset.bg }}
                  >
                    <div className="flex items-center justify-between">
                      <Swatch color={preset.bg} label="BG" />
                      <Swatch color={preset.primary} label="Primary" />
                      <Swatch color={preset.accent} label="Accent" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3" />
                    <span>Click to apply</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Custom designer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="ios-glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-foreground">
                Custom Theme Designer
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Pick your own primary and accent colors. The preview updates live.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="custom-primary">Primary color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-12 h-10 rounded-md border border-border/50 bg-transparent cursor-pointer"
                  />
                  <Input
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="bg-white/[0.03] border-border/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-accent">Accent color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-12 h-10 rounded-md border border-border/50 bg-transparent cursor-pointer"
                  />
                  <Input
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="bg-white/[0.03] border-border/50"
                  />
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-5 p-5 rounded-xl border border-border/50 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Droplet className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Live Preview
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow"
                  style={{ background: customPrimary }}
                >
                  Primary button
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow"
                  style={{ background: customAccent }}
                >
                  Accent button
                </button>
                <span
                  className="text-sm font-medium"
                  style={{ color: customPrimary }}
                >
                  Linked text
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                onClick={applyCustom}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply custom theme
              </Button>
            </div>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
