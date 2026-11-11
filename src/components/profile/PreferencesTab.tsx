import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Globe, Palette, Monitor, Moon, Sun, Volume2 } from "lucide-react";
import { useTheme } from "next-themes";
import { DesktopAppSettings } from "@/components/desktop/DesktopAppSettings";
import { AutoImproveInsights } from "@/components/autoImprove/AutoImproveInsights";
import { isLearningEnabled, setLearningEnabled } from "@/lib/autoImprove/learningConsent";
import {
  getUiCompactMode,
  setUiCompactMode,
  getUiSoundEnabled,
  setUiSoundEnabled,
  getUiLanguage,
  setUiLanguage,
} from "@/lib/profilePreferences";

import { SettingsStagger } from "@/components/settings/SettingsStagger";

export const PreferencesTab = () => {
  const { theme, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(() => getUiSoundEnabled());
  const [compactMode, setCompactMode] = useState(() => getUiCompactMode());
  const [language, setLanguage] = useState(() => getUiLanguage());
  const [learningEnabled, setLearningEnabledState] = useState(isLearningEnabled());

  useEffect(() => {
    setUiCompactMode(compactMode);
  }, [compactMode]);

  return (
    <SettingsStagger className="space-y-6">
      <AutoImproveInsights />

      <Card className="card-glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Adaptive learning
          </CardTitle>
          <CardDescription>On-device behavior learning (separate from analytics cookies)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
            <div>
              <p className="font-medium text-sm">Enable adaptive learning</p>
              <p className="text-xs text-muted-foreground">Tune chat defaults from how you use ShadowTalk</p>
            </div>
            <Switch
              checked={learningEnabled}
              onCheckedChange={(v) => {
                setLearningEnabled(v);
                setLearningEnabledState(v);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="card-glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              </div>
              <div>
                <p className="font-medium text-sm">Theme</p>
                <p className="text-xs text-muted-foreground">ShadowTalk uses the sovereign dark brand theme</p>
              </div>
            </div>
            <Select
              value="dark"
              onValueChange={() => setTheme("dark")}
            >
              <SelectTrigger className="w-28 bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">ShadowTalk Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Compact Mode</p>
                <p className="text-xs text-muted-foreground">Reduce spacing for more content density</p>
              </div>
            </div>
            <Switch
              checked={compactMode}
              onCheckedChange={(v) => {
                setCompactMode(v);
                setUiCompactMode(v);
              }}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Volume2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Sound Effects</p>
                <p className="text-xs text-muted-foreground">Play sounds for notifications and actions</p>
              </div>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(v) => {
                setSoundEnabled(v);
                setUiSoundEnabled(v);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card className="card-glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Language & Region
          </CardTitle>
          <CardDescription>Set your preferred language and regional settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Language</p>
                <p className="text-xs text-muted-foreground">Select your preferred language</p>
              </div>
            </div>
            <Select
              value={language}
              onValueChange={(code) => {
                setLanguage(code);
                setUiLanguage(code);
              }}
            >
              <SelectTrigger className="w-32 bg-muted/30">
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
          </div>
        </CardContent>
      </Card>

      <DesktopAppSettings />
    </SettingsStagger>
  );
};
