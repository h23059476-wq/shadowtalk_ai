import { useState } from "react";
import { KeyRound, ShieldCheck, ShieldAlert, Loader2, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CapabilityProfileCard } from "./CapabilityProfileCard";
import {
  BYOK_PROVIDERS, type ByokProvider, clearByokConfig, getByokConfig, saveByokConfig, streamByokChat,
} from "@/lib/byok";
import { useApiKeyValidation } from "@/hooks/useApiKeyValidation";

/** Direct deep-links to each provider's API key console. */
const KEY_QUICK_LINKS: Record<ByokProvider, { label: string; url: string }> = {
  openai: { label: "Get OpenAI Key", url: "https://platform.openai.com/api-keys" },
  groq: { label: "Get Groq Key", url: "https://console.groq.com/keys" },
  openrouter: { label: "Get OpenRouter Key", url: "https://openrouter.ai/keys" },
  gemini: { label: "Get Gemini Key", url: "https://aistudio.google.com/app/apikey" },
  anthropic: { label: "Get Anthropic Key", url: "https://console.anthropic.com/settings/keys" },
  mistral: { label: "Get Mistral Key", url: "https://console.mistral.ai/api-keys" },
  deepseek: { label: "Get DeepSeek Key", url: "https://platform.deepseek.com/api_keys" },
  together: { label: "Get Together Key", url: "https://api.together.xyz/settings/api-keys" },
  fireworks: { label: "Get Fireworks Key", url: "https://fireworks.ai/account/api-keys" },
  perplexity: { label: "Get Perplexity Key", url: "https://www.perplexity.ai/settings/api" },
  cohere: { label: "Get Cohere Key", url: "https://dashboard.cohere.com/api-keys" },
  xai: { label: "Get xAI Key", url: "https://console.x.ai" },
  cerebras: { label: "Get Cerebras Key", url: "https://cloud.cerebras.ai" },
  hyperbolic: { label: "Get Hyperbolic Key", url: "https://app.hyperbolic.xyz/settings" },
  novita: { label: "Get Novita Key", url: "https://novita.ai/getKey" },
  deepinfra: { label: "Get DeepInfra Key", url: "https://deepinfra.com/dash/api_keys" },
};

export function SettingsByokCard() {
  const existing = getByokConfig();
  const [provider, setProvider] = useState<ByokProvider>(existing?.provider ?? "openai");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [model, setModel] = useState(existing?.model ?? BYOK_PROVIDERS.openai.defaultModel);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(Boolean(existing));
  const validation = useApiKeyValidation();

  // Trigger validation whenever the key or provider changes
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    validation.validate(provider, e.target.value);
  };

  const handleProviderChange = (v: string) => {
    const p = v as ByokProvider;
    setProvider(p);
    setModel(BYOK_PROVIDERS[p].defaultModel);
    if (apiKey) validation.validate(p, apiKey);
  };

  const cfg = () => ({ provider, apiKey: apiKey.trim(), model: model.trim() || BYOK_PROVIDERS[provider].defaultModel, mode: "always" as const });

  const save = () => {
    if (!apiKey.trim()) return toast.error("Paste your API key first.");
    saveByokConfig(cfg());
    setSaved(true);
    toast.success("Your API key is saved on this device.");
  };

  const test = async () => {
    if (!apiKey.trim()) return toast.error("Paste your API key first.");
    setTesting(true);
    const r = await streamByokChat(cfg(), [{ role: "user", content: "Reply with: OK" }]);
    setTesting(false);
    if (r.error || !r.content) toast.error(r.error || "No reply from provider.");
    else toast.success(`Key works — ${BYOK_PROVIDERS[provider].label} replied.`);
  };

  const remove = () => {
    clearByokConfig();
    setApiKey("");
    setSaved(false);
    validation.reset();
    toast.success("Your API key was removed.");
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" /> Your own API key</CardTitle>
        <CardDescription>
          In Tech-User mode, AI requests use this provider key directly. The key is stored in this browser only and is not sent to ShadowTalk servers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BYOK_PROVIDERS).map(([id, p]) => <SelectItem key={id} value={id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Model
              {validation.status === "validating" && (
                <span className="ml-2 text-[10px] text-muted-foreground font-normal">Loading available models…</span>
              )}
              {validation.status === "valid" && validation.models.length > 0 && (
                <span className="ml-2 text-[10px] text-success font-normal">{validation.models.length} models available</span>
              )}
            </Label>
            {validation.status === "valid" && validation.models.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {/* Default model first, then alphabetical */}
                  {!validation.models.includes(BYOK_PROVIDERS[provider].defaultModel) && (
                    <SelectItem value={BYOK_PROVIDERS[provider].defaultModel}>
                      {BYOK_PROVIDERS[provider].defaultModel} (default)
                    </SelectItem>
                  )}
                  {validation.models.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={BYOK_PROVIDERS[provider].defaultModel} />
            )}
            {validation.status === "valid" && validation.models.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Couldn&apos;t load the model list (CORS). Type the model ID manually.</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>API key</Label>
            {/* Validation badge — appears as user types */}
            {validation.status === "validating" && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verifying...
              </span>
            )}
            {validation.status === "valid" && (
              <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium" title={validation.detail}>
                <ShieldCheck className="h-3 w-3" />
                Validated {validation.detail ? `· ${validation.detail}` : ""}
              </span>
            )}
            {validation.status === "invalid" && (
              <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-medium" title={validation.detail}>
                <ShieldAlert className="h-3 w-3" />
                Invalid key
              </span>
            )}
            {validation.status === "error" && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground" title={validation.detail}>
                <ShieldAlert className="h-3 w-3" />
                {validation.detail || "Can't verify"}
              </span>
            )}
          </div>
          <Input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={handleKeyChange}
            placeholder={BYOK_PROVIDERS[provider].keyHint}
            className={validation.status === "valid" ? "border-success/50" : validation.status === "invalid" ? "border-destructive/50" : ""}
          />
          {/* Quick-link to provider's key console */}
          <div className="flex items-center justify-between">
            <a
              href={KEY_QUICK_LINKS[provider].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {KEY_QUICK_LINKS[provider].label}
            </a>
            {validation.lastChecked && (
              <span className="text-[10px] text-muted-foreground/60">
                Last checked {new Date(validation.lastChecked).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        {/* Capability Profile — shows what the configured model can do */}
        {saved && <CapabilityProfileCard />}
        <div className="flex flex-wrap gap-2">
          <Button onClick={save}>Save</Button>
          <Button variant="outline" onClick={test} disabled={testing}>{testing ? "Testing..." : "Test key"}</Button>
          {saved && <Button variant="ghost" onClick={remove}>Remove</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
