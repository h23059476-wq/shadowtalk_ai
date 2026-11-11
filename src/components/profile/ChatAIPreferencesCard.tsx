import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Cpu, Gauge, Moon, Send, Clock, HardDrive } from "lucide-react";
import {
  getAccelerationPreference,
  setAccelerationPreference,
  type AccelerationMode,
  ACCELERATION_CHANGE_EVENT,
} from "@/lib/webgpuRuntime";

import { getShadowModeEnabled, setShadowModeEnabled } from "@/lib/shadowMode";
import {
  getChatEnterToSend,
  setChatEnterToSend,
  getChatShowTimestamps,
  setChatShowTimestamps,
} from "@/lib/profilePreferences";
import { getPreferLocal, setPreferLocal } from "@/lib/aiAccessMode";
import { useAuth } from "@/components/AuthProvider";

export function ChatAIPreferencesCard() {
  const { user } = useAuth();
  const [acceleration, setAcceleration] = useState<AccelerationMode>(() => getAccelerationPreference());
  const [shadowMode, setShadowMode] = useState(() => getShadowModeEnabled());
  const [enterToSend, setEnterToSend] = useState(() => getChatEnterToSend());
  const [showTimestamps, setShowTimestamps] = useState(() => getChatShowTimestamps());
  const [preferLocal, setPreferLocalState] = useState<boolean>(() => getPreferLocal(user?.id));

  useEffect(() => {
    const onAccel = (e: Event) => {
      const mode = (e as CustomEvent<AccelerationMode>).detail;
      if (mode) setAcceleration(mode);
    };
    window.addEventListener(ACCELERATION_CHANGE_EVENT, onAccel);
    return () => window.removeEventListener(ACCELERATION_CHANGE_EVENT, onAccel);
  }, []);

  return (
    <Card className="card-glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          Chat & AI
        </CardTitle>
        <CardDescription>How ShadowTalk routes messages and uses your hardware</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <Label className="text-sm font-medium">Hardware acceleration</Label>
              <p className="text-xs text-muted-foreground">WebGPU / NPU / CPU preference for on-device models</p>
            </div>
          </div>
          <Select
            value={acceleration}
            onValueChange={(v) => {
              const mode = v as AccelerationMode;
              setAcceleration(mode);
              setAccelerationPreference(mode);
            }}
          >
            <SelectTrigger className="w-[120px] shrink-0 bg-muted/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="webgpu">WebGPU</SelectItem>
              <SelectItem value="npu">NPU</SelectItem>
              <SelectItem value="cpu">CPU only</SelectItem>
            </SelectContent>
          </Select>
        </div>



        <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Moon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Shadow UI mode</p>
              <p className="text-xs text-muted-foreground">Softer contrast and reduced visual noise in chat</p>
            </div>
          </div>
          <Switch
            checked={shadowMode}
            onCheckedChange={(v) => {
              setShadowMode(v);
              setShadowModeEnabled(v);
            }}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Enter to send</p>
              <p className="text-xs text-muted-foreground">Send messages with Enter; Shift+Enter for new line</p>
            </div>
          </div>
          <Switch
            checked={enterToSend}
            onCheckedChange={(v) => {
              setEnterToSend(v);
              setChatEnterToSend(v);
            }}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Message timestamps</p>
              <p className="text-xs text-muted-foreground">Show time on each message in chat</p>
            </div>
          </div>
          <Switch
            checked={showTimestamps}
            onCheckedChange={(v) => {
              setShowTimestamps(v);
              setChatShowTimestamps(v);
            }}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Prefer on-device AI</p>
              <p className="text-xs text-muted-foreground">
                Use the locally installed model first; falls back to cloud if the local model isn't loaded.
              </p>
            </div>
          </div>
          <Switch
            checked={preferLocal}
            onCheckedChange={(v) => {
              setPreferLocalState(v);
              if (user?.id) setPreferLocal(user.id, v);
            }}
          />
        </div>

      </CardContent>
    </Card>
  );
}
