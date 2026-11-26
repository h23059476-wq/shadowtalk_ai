import { useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck, ShieldAlert, Loader2, ExternalLink, Copy, Image as ImageIcon } from "lucide-react";
import { isImageCapableProvider } from "@/lib/cloudImage";
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
import { classifyModel, normalizeModelId } from "@/lib/capabilityInference";

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
  const [model, setModel] = useState(normalizeModelId(existing?.model ?? BYOK_PROVIDERS.openai.defaultModel));
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(Boolean(existing));
  const validation = useApiKeyValidation();

  // Tier 2 — Hugging Face account connection (OAuth + PKCE). The stored token
  // feeds BOTH the Inference Router (chat) and the free ZeroGPU image path.
  const [hfState, setHfState] = useState<{ connected: boolean; username?: string; oauthConfigured: boolean }>({
    connected: false,
    oauthConfigured: false,
  });
  useEffect(() => {
    void (async () => {
      const [{ isHfAccountConnected, getHfCredentials }, { isHfOAuthConfigured }] = await Promise.all([
        import("@/lib/auth/hfCredentials"),
        import("@/lib/auth/hfOAuth"),
      ]);
      const creds = await getHfCredentials();
      setHfState({ connected: await isHfAccountConnected(), username: creds?.username, oauthConfigured: isHfOAuthConfigured() });
    })();
  }, []);

  const connectHf = async () => {
    const { startHfSignIn, isHfOAuthConfigured } = await import("@/lib/auth/hfOAuth");
    if (!isHfOAuthConfigured()) {
      toast.error("This deployment has no Hugging Face OAuth client configured (missing VITE_HF_CLIENT_ID).");
      return;
    }
    try {
      window.location.href = await startHfSignIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the Hugging Face sign-in.");
    }
  };

  const disconnectHf = async () => {
    const { disconnectHfAccount } = await import("@/lib/auth/hfOAuth");
    await disconnectHfAccount();
    setHfState((s) => ({ ...s, connected: false, username: undefined }));
    toast.success("Hugging Face account disconnected — the token was removed from this device.");
  };

  // Re-check a saved key when the window opens so its model list loads again.
  useEffect(() => {
    if (existing?.apiKey) validation.validate(existing.provider, existing.apiKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only chat models belong in the chat model picker; strip "models/" prefixes.
  const chatModels = useMemo(
    () => Array.from(new Set(validation.models.map(normalizeModelId).filter((m) => classifyModel(m) === "chat"))).sort(),
    [validation.models],
  );

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

  const cfg = () => ({ provider, apiKey: apiKey.trim(), model: normalizeModelId(model) || BYOK_PROVIDERS[provider].defaultModel, mode: "always" as const });

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
            <Label>
              Provider
              {isImageCapableProvider(provider) && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-success font-normal" title="This key can also generate images in chat (e.g. “draw a …”)">
                  <ImageIcon className="h-3 w-3" />
                  Image generation supported
                </span>
              )}
            </Label>
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
              {validation.status === "valid" && chatModels.length > 0 && (
                <span className="ml-2 text-[10px] text-success font-normal">{chatModels.length} chat models available</span>
              )}
            </Label>
            {validation.status === "valid" && chatModels.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {/* Default model first, then alphabetical */}
                  {!chatModels.includes(BYOK_PROVIDERS[provider].defaultModel) && (
                    <SelectItem value={BYOK_PROVIDERS[provider].defaultModel}>
                      {BYOK_PROVIDERS[provider].defaultModel} (default)
                    </SelectItem>
                  )}
                  {!chatModels.includes(model) && model !== BYOK_PROVIDERS[provider].defaultModel && model && (
                    <SelectItem value={model}>{model}</SelectItem>
                  )}
                  {chatModels.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={BYOK_PROVIDERS[provider].defaultModel} />
            )}
            {validation.status === "valid" && chatModels.length === 0 && (
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
        {(saved || apiKey.trim()) && <CapabilityProfileCard provider={provider} model={normalizeModelId(model) || BYOK_PROVIDERS[provider].defaultModel} />}
        <div className="flex flex-wrap gap-2">
          <Button onClick={save}>Save</Button>
          <Button variant="outline" onClick={test} disabled={testing}>{testing ? "Testing..." : "Test key"}</Button>
          {saved && <Button variant="ghost" onClick={remove}>Remove</Button>}
        </div>

        {/* Tier 2 — Sign in with Hugging Face (OAuth + PKCE). Token stored in the
            encrypted SecureStore; feeds the Inference Router + ZeroGPU image path. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
            Hugging Face account
            {hfState.connected && (
              <span className="text-[10px] rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-2 py-0.5">
                connected{hfState.username ? `: @${hfState.username}` : ""}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {hfState.connected
              ? "Chat can run on the Hugging Face Inference Router (your account's free monthly inference credits), and free image generation rides your personal ZeroGPU quota with queue priority. The token stays in this device's encrypted store."
              : "Sign in to run chat on Hugging Face's Inference Router with your account's free monthly inference credits, and give free image generation your personal ZeroGPU quota with queue priority. The token never touches localStorage."}
          </p>
          {hfState.connected ? (
            <Button variant="outline" size="sm" onClick={disconnectHf}>Disconnect Hugging Face</Button>
          ) : (
            <Button size="sm" onClick={connectHf} disabled={!hfState.oauthConfigured}>
              Connect Hugging Face
            </Button>
          )}
          {!hfState.oauthConfigured && (
            <p className="text-[10px] text-muted-foreground/70">
              Deployment config: set VITE_HF_CLIENT_ID (OAuth client at huggingface.co/settings/connected-applications, redirect URI “{window.location.origin}/auth/hf/callback”).
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
