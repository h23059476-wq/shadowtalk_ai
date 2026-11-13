import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Monitor, Moon, Palette, Paintbrush, Settings, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  getUiCompactMode,
  getUiLanguage,
  getUiSoundEnabled,
  setUiCompactMode,
  setUiLanguage,
  setUiSoundEnabled,
} from "@/lib/profilePreferences";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { SettingsStagger, SettingsStaggerItem } from "@/components/settings/SettingsStagger";
import { SettingsShellCard } from "@/components/settings/SettingsShellCard";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import { cn } from "@/lib/utils";

function SettingRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { reduced } = useSettingsMotion();

  return (
    <motion.div
      className={className}
      whileHover={reduced ? undefined : { backgroundColor: "hsl(var(--muted) / 0.35)" }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export function SettingsGeneralSection() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(() => getUiSoundEnabled());
  const [compactMode, setCompactMode] = useState(() => getUiCompactMode());
  const [language, setLanguage] = useState(() => getUiLanguage());

  useEffect(() => {
    setUiCompactMode(compactMode);
  }, [compactMode]);

  return (
    <SettingsStagger className="space-y-6">
      <SettingsSectionHeader
        icon={Settings}
        title="General"
        description="Appearance and interface — theme, language, and feedback"
      />

      <SettingsStaggerItem>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsShellCard
            title="ShadowTalk Dark"
            description="Sovereign neural theme optimized for long sessions"
            icon={Palette}
            highlight
            className="md:row-span-2"
            contentClassName="space-y-4"
          >
            <div
              className={cn(
                "relative h-28 rounded-xl overflow-hidden border border-primary/30",
                "bg-gradient-to-br from-primary/30 via-background to-secondary/20",
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.4),transparent_50%)]" />
              <Moon className="absolute bottom-3 right-3 h-8 w-8 text-primary/80" />
            </div>
            <SettingRow className="flex items-center justify-between gap-3 rounded-xl p-3 -mx-1">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Active theme</span>
              </div>
              <Select value="dark" onValueChange={() => setTheme("dark")}>
                <SelectTrigger className="w-36 bg-muted/30 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">ShadowTalk Dark</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              onClick={() => navigate("/themes?design=new")}
            >
              <Paintbrush className="h-4 w-4" />
              Open custom theme designer
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate("/themes")}
            >
              <Palette className="h-4 w-4" />
              Browse 100+ themes
            </Button>
          </SettingsShellCard>

          <SettingsShellCard title="Compact mode" description="Tighter spacing" icon={Monitor}>
            <SettingRow className="flex items-center justify-between p-3 rounded-xl">
              <p className="text-sm">Enable compact UI</p>
              <Switch
                checked={compactMode}
                onCheckedChange={(v) => {
                  setCompactMode(v);
                  setUiCompactMode(v);
                }}
              />
            </SettingRow>
          </SettingsShellCard>

          <SettingsShellCard title="Sound effects" description="UI feedback" icon={Volume2}>
            <SettingRow className="flex items-center justify-between p-3 rounded-xl">
              <p className="text-sm">Play sounds</p>
              <Switch
                checked={soundEnabled}
                onCheckedChange={(v) => {
                  setSoundEnabled(v);
                  setUiSoundEnabled(v);
                }}
              />
            </SettingRow>
          </SettingsShellCard>
        </div>
      </SettingsStaggerItem>

      <SettingsStaggerItem>
        <SettingsShellCard title="Language" description="Display language (stored on device)" icon={Globe}>
          <SettingRow className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl">
            <div>
              <Label>Display language</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Applies to UI labels</p>
            </div>
            <Select
              value={language}
              onValueChange={(code) => {
                setLanguage(code);
                setUiLanguage(code);
              }}
            >
              <SelectTrigger className="w-full sm:w-36 bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingsShellCard>
      </SettingsStaggerItem>
    </SettingsStagger>
  );
}
