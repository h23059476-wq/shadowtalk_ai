import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Sliders, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";

interface CustomInstructions {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  streamResponses: boolean;
  includeCitations: boolean;
}

const defaultInstructions: CustomInstructions = {
  systemPrompt: "",
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  streamResponses: true,
  includeCitations: true,
};

export function CustomInstructionsProfileCard() {
  const { toast } = useToast();
  const { value: saved, save, isLoading } = useUserSettings<CustomInstructions>(
    "custom_instructions",
    defaultInstructions,
  );
  const [instructions, setInstructions] = useState<CustomInstructions>(defaultInstructions);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isLoading && saved) {
      setInstructions(saved);
      setDirty(false);
    }
  }, [isLoading, saved]);

  const update = <K extends keyof CustomInstructions>(key: K, value: CustomInstructions[K]) => {
    setInstructions((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const onSave = async () => {
    await save(instructions);
    setDirty(false);
    toast({ title: "AI instructions saved", description: "Applied to new chats on this account." });
  };

  const onReset = () => {
    setInstructions(defaultInstructions);
    setDirty(true);
  };

  return (
    <Card className="card-glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sliders className="h-5 w-5 text-primary" />
          Custom AI instructions
        </CardTitle>
        <CardDescription>Default system prompt and generation settings for every chat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>System prompt</Label>
          <Textarea
            value={instructions.systemPrompt}
            onChange={(e) => update("systemPrompt", e.target.value)}
            placeholder="e.g. You are a concise technical assistant…"
            rows={4}
            className="bg-muted/30 resize-none"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <Label>Temperature</Label>
            <span className="text-muted-foreground font-mono">{instructions.temperature.toFixed(1)}</span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[instructions.temperature]}
            onValueChange={([v]) => update("temperature", v)}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
          <div>
            <p className="text-sm font-medium">Stream responses</p>
            <p className="text-xs text-muted-foreground">Show tokens as they generate</p>
          </div>
          <Switch
            checked={instructions.streamResponses}
            onCheckedChange={(v) => update("streamResponses", v)}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
          <div>
            <p className="text-sm font-medium">Include citations</p>
            <p className="text-xs text-muted-foreground">When the model supports source references</p>
          </div>
          <Switch
            checked={instructions.includeCitations}
            onCheckedChange={(v) => update("includeCitations", v)}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => void onSave()} disabled={!dirty || isLoading}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Save instructions
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
