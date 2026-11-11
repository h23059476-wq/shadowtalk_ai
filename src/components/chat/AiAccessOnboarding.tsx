import { useEffect, useState, useCallback } from "react";
import {
  KeyRound, Sparkles, Loader2, Check, ArrowRight, ArrowLeft,
  ExternalLink, Eye, EyeOff, ShieldCheck, AlertCircle, Info, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  BYOK_PROVIDERS, getByokConfig, saveByokConfig, streamByokChat,
  type ByokProvider,
} from "@/lib/byok";
import { loadAiAccessMode, saveAiAccessMode, type AiAccessMode } from "@/lib/aiAccessMode";
import { useApiKeyValidation } from "@/hooks/useApiKeyValidation";

interface ProviderMeta {
  description: string;
  setupDifficulty: "easy" | "medium" | "advanced";
  freeTier: string;
  recommendation: string;
}

const PROVIDER_META: Record<ByokProvider, ProviderMeta> = {
  openrouter: { description: "Access 500+ models (GPT-4o, Claude, Gemini, Llama) from one key. Best for trying multiple models.", setupDifficulty: "easy", freeTier: "Some models free; credits start at $5", recommendation: "Recommended for beginners — one key, many models." },
  openai: { description: "Direct access to GPT-4o, GPT-4o-mini, and DALL-E image generation.", setupDifficulty: "easy", freeTier: "Pay-per-use; ~$5 credit to start", recommendation: "Great if you need image generation." },
  groq: { description: "Fastest inference available. Free tier with generous limits.", setupDifficulty: "easy", freeTier: "Free tier available", recommendation: "Best free option — fast, no card required." },
  gemini: { description: "Google's Gemini models with a generous free tier. Long context.", setupDifficulty: "easy", freeTier: "Free tier available", recommendation: "Good free option for documents." },
  anthropic: { description: "Claude models — excellent for writing and reasoning.", setupDifficulty: "medium", freeTier: "Pay-per-use; ~$5 credit", recommendation: "Best for writing-heavy workflows." },
  deepseek: { description: "Extremely cheap model with strong coding performance.", setupDifficulty: "easy", freeTier: "Very low cost", recommendation: "Best value for coding." },
  mistral: { description: "European AI lab. Open-weight models.", setupDifficulty: "medium", freeTier: "Some free models", recommendation: "Good EU-based option." },
  together: { description: "Hosts open-source models with transparent pricing.", setupDifficulty: "medium", freeTier: "$5 free credit", recommendation: "For open-source model access." },
  fireworks: { description: "Fast open-model inference.", setupDifficulty: "medium", freeTier: "$1 free credit", recommendation: "For fast open-model inference." },
  perplexity: { description: "Models with built-in web search. Cited answers.", setupDifficulty: "medium", freeTier: "Pay-per-use", recommendation: "For research with citations." },
  cohere: { description: "Enterprise-focused models.", setupDifficulty: "advanced", freeTier: "Trial keys", recommendation: "For enterprise use cases." },
  xai: { description: "Grok models from xAI.", setupDifficulty: "medium", freeTier: "Pay-per-use", recommendation: "For Grok access." },
  cerebras: { description: "Fastest inference using CS-3 chips.", setupDifficulty: "advanced", freeTier: "Free tier", recommendation: "For maximum speed." },
  hyperbolic: { description: "Cheap GPU inference.", setupDifficulty: "advanced", freeTier: "Pay-per-use", recommendation: "For budget GPU inference." },
  novita: { description: "Cheap open-model hosting.", setupDifficulty: "advanced", freeTier: "Pay-per-use", recommendation: "For budget access." },
  deepinfra: { description: "Cheap open-model hosting.", setupDifficulty: "advanced", freeTier: "Free tier", recommendation: "For budget access." },
};

const KEY_URLS: Record<ByokProvider, string> = {
  openai: "https://platform.openai.com/api-keys",
  groq: "https://console.groq.com/keys",
  openrouter: "https://openrouter.ai/keys",
  gemini: "https://aistudio.google.com/app/apikey",
  anthropic: "https://console.anthropic.com/settings/keys",
  mistral: "https://console.mistral.ai/api-keys",
  deepseek: "https://platform.deepseek.com/api_keys",
  together: "https://api.together.xyz/settings/api-keys",
  fireworks: "https://fireworks.ai/account/api-keys",
  perplexity: "https://www.perplexity.ai/settings/api",
  cohere: "https://dashboard.cohere.com/api-keys",
  xai: "https://console.x.ai",
  cerebras: "https://cloud.cerebras.ai",
  hyperbolic: "https://app.hyperbolic.xyz/settings",
  novita: "https://novita.ai/getKey",
  deepinfra: "https://deepinfra.com/dash/api_keys",
};

type WizardStep = "welcome" | "provider" | "getkey" | "enter" | "testing" | "success";

interface AiAccessOnboardingProps { userId: string; }

export function AiAccessOnboarding({ userId }: AiAccessOnboardingProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<AiAccessMode | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<WizardStep>("welcome");
  const [provider, setProvider] = useState<ByokProvider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(BYOK_PROVIDERS.openrouter.defaultModel);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("shadowtalk_onboarding_dismissed") === "1"; } catch { return false; }
  });
  const validation = useApiKeyValidation();

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadAiAccessMode(userId).then((savedMode) => {
      if (!active) return;
      const existingKey = getByokConfig();
      setMode(savedMode);
      if (savedMode === "byok" && !existingKey?.apiKey) {
        setProvider(existingKey?.provider ?? "openrouter");
        setModel(existingKey?.model ?? BYOK_PROVIDERS.openrouter.defaultModel);
        setStep("welcome");
      } else if (!savedMode) { setStep("welcome"); }
    }).catch(() => { if (active) setError("Could not load your AI setup."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const existingKey = getByokConfig();
  const open = !loading && !dismissed && (!mode || (mode === "byok" && !existingKey?.apiKey));

  const handleDismiss = useCallback(() => {
    try { sessionStorage.setItem("shadowtalk_onboarding_dismissed", "1"); } catch {}
    setDismissed(true);
  }, []);

  const handleProviderSelect = (next: ByokProvider) => {
    setProvider(next); setModel(BYOK_PROVIDERS[next].defaultModel); setStep("getkey");
  };

  const handleKeyChange = (value: string) => {
    setApiKey(value);
    if (value.length > 10) validation.validate(provider, value); else validation.reset();
    setError("");
  };

  const testAndSave = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) { setError("Enter your API key to continue."); return; }
    setSaving(true); setError(""); setStep("testing");
    const config = { provider, apiKey: trimmedKey, model: model.trim() || BYOK_PROVIDERS[provider].defaultModel, mode: "always" as const };
    try {
      const result = await streamByokChat(config, [{ role: "user", content: "Reply with: OK" }]);
      if (result.error || !result.content) {
        const err = result.error || "The provider returned an empty response.";
        if (err.includes("401") || err.toLowerCase().includes("rejected")) {
          setError("Your API key was rejected. Double-check you copied the full key — it should start with " + BYOK_PROVIDERS[provider].keyHint);
        } else if (err.includes("429") || err.toLowerCase().includes("rate limit")) {
          setError("Rate limit reached on your key. Wait a moment or check your provider dashboard.");
        } else if (err.includes("402") || err.toLowerCase().includes("insufficient") || err.toLowerCase().includes("billing")) {
          setError("Insufficient credits. Add credits at " + KEY_URLS[provider] + " and try again.");
        } else if (err.toLowerCase().includes("network") || err.toLowerCase().includes("reach")) {
          setError("Could not reach " + BYOK_PROVIDERS[provider].label + ". Check your connection.");
        } else { setError(err); }
        setStep("enter"); return;
      }
      saveByokConfig(config); await saveAiAccessMode(userId, "byok"); setMode("byok"); setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify this API key."); setStep("enter");
    } finally { setSaving(false); }
  };

  const maskedKey = apiKey.length > 8 ? apiKey.slice(0, 4) + "\u2022".repeat(Math.max(0, apiKey.length - 8)) + apiKey.slice(-4) : "\u2022".repeat(apiKey.length);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleDismiss(); }}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => { e.preventDefault(); handleDismiss(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "welcome" && <><Sparkles className="h-5 w-5 text-primary" /> Welcome to ShadowTalk AI</>}
            {step === "provider" && <><KeyRound className="h-5 w-5 text-primary" /> Choose your AI provider</>}
            {step === "getkey" && <><ExternalLink className="h-5 w-5 text-primary" /> Get your API key</>}
            {step === "enter" && <><KeyRound className="h-5 w-5 text-primary" /> Enter your API key</>}
            {step === "testing" && <><Loader2 className="h-5 w-5 text-primary animate-spin" /> Testing connection\u2026</>}
            {step === "success" && <><Check className="h-5 w-5 text-success" /> You&apos;re all set!</>}
          </DialogTitle>
        </DialogHeader>

        {step === "welcome" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm text-foreground leading-relaxed">ShadowTalk AI is a <strong>BYOK (Bring Your Own Key)</strong> workspace. You use your own AI provider account and API key \u2014 you pay your provider directly.</p>
              <p className="text-xs text-muted-foreground">No subscription, no markup. You&apos;re in full control of costs and data.</p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" /><span>Your key is stored in your browser only \u2014 never sent to ShadowTalk servers.</span></div>
              <div className="flex items-start gap-2"><Info className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Provider charges apply separately. Review your provider&apos;s pricing.</span></div>
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 text-warning shrink-0 mt-0.5" /><span>Setup takes ~2 minutes. Change providers anytime in Settings.</span></div>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={handleDismiss} size="sm">Skip for now</Button>
              <Button onClick={() => setStep("provider")} className="gap-1.5" size="sm">Get started <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {step === "provider" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Pick a provider. You can change this later in Settings.</p>
            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {(["openrouter", "groq", "gemini", "openai"] as ByokProvider[]).map((id) => <ProviderCard key={id} id={id} onSelect={handleProviderSelect} />)}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1 pt-2 pb-1">More providers</div>
              {(Object.keys(BYOK_PROVIDERS) as ByokProvider[]).filter((id) => !["openrouter", "groq", "gemini", "openai"].includes(id)).map((id) => <ProviderCard key={id} id={id} onSelect={handleProviderSelect} compact />)}
            </div>
            <Button variant="ghost" onClick={() => setStep("welcome")} size="sm" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </div>
        )}

        {step === "getkey" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{BYOK_PROVIDERS[provider].label}</Badge><span className="text-xs text-muted-foreground">{PROVIDER_META[provider].freeTier}</span></div>
              <p className="text-sm text-foreground leading-relaxed">{PROVIDER_META[provider].description}</p>
              <p className="text-xs text-muted-foreground">An API key is different from a chat subscription. You need a <em>developer API key</em>.</p>
            </div>
            <a href={KEY_URLS[provider]} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"><ExternalLink className="h-4 w-4" /> Open {BYOK_PROVIDERS[provider].label} dashboard</a>
            <p className="text-[11px] text-muted-foreground/80 text-center">Create a new key, copy it, then paste it in the next step.</p>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("provider")} size="sm" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep("enter")} className="gap-1.5" size="sm">I have my key <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {step === "enter" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-api-key" className="flex items-center justify-between">
                <span>Your {BYOK_PROVIDERS[provider].label} API key</span>
                <button type="button" onClick={() => setShowKey((v) => !v)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">{showKey ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}</button>
              </Label>
              <Input id="wizard-api-key" type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => handleKeyChange(e.target.value)} placeholder={BYOK_PROVIDERS[provider].keyHint} autoComplete="new-password" className={validation.status === "valid" ? "border-success/50" : validation.status === "invalid" ? "border-destructive/50" : ""} />
              {validation.status === "validating" && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Verifying\u2026</p>}
              {validation.status === "valid" && <p className="text-[11px] text-success flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Key valid{validation.detail ? ` \u00b7 ${validation.detail}` : ""}</p>}
              {validation.status === "invalid" && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Invalid key</p>}
              {validation.status === "error" && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> {validation.detail || "Can't verify (CORS) \u2014 click Test to confirm"}</p>}
            </div>
            <details className="text-xs"><summary className="cursor-pointer text-muted-foreground hover:text-foreground">Advanced: change model (default: {BYOK_PROVIDERS[provider].defaultModel})</summary><div className="mt-2 space-y-1">{validation.status === "valid" && validation.models.length > 0 ? (<Select value={model} onValueChange={setModel}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent className="max-h-48">{validation.models.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent></Select>) : (<Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={BYOK_PROVIDERS[provider].defaultModel} className="h-8 text-xs" autoComplete="off" />)}</div></details>
            {error && <p role="alert" className="text-sm text-destructive flex items-start gap-1.5"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}</p>}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("getkey")} size="sm" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => void testAndSave()} disabled={saving || !apiKey.trim()} className="gap-1.5" size="sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Test & save</Button>
            </div>
          </div>
        )}

        {step === "testing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <div><p className="text-sm font-semibold">Testing your {BYOK_PROVIDERS[provider].label} key\u2026</p><p className="text-xs text-muted-foreground mt-1">Sending a test request to verify your key works.</p></div>
            <p className="text-[11px] text-muted-foreground/60">Key: {maskedKey} \u00b7 Model: {model}</p>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 py-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/15 border border-success/30 mx-auto"><Check className="h-8 w-8 text-success" /></div>
            <div><p className="text-lg font-bold">You&apos;re all set!</p><p className="text-sm text-muted-foreground mt-1">Your {BYOK_PROVIDERS[provider].label} key is saved and working.</p></div>
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground text-left">
              <div className="flex items-center justify-between"><span>Provider:</span><span className="text-foreground font-medium">{BYOK_PROVIDERS[provider].label}</span></div>
              <div className="flex items-center justify-between mt-1"><span>Model:</span><span className="text-foreground font-mono text-[11px]">{model}</span></div>
              <div className="flex items-center justify-between mt-1"><span>Key:</span><span className="text-foreground font-mono text-[11px]">{maskedKey}</span></div>
            </div>
            <Button onClick={() => { handleDismiss(); window.location.assign("/chatbot"); }} className="w-full gap-1.5">Start chatting <ArrowRight className="h-4 w-4" /></Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProviderCard({ id, onSelect, compact = false }: { id: ByokProvider; onSelect: (id: ByokProvider) => void; compact?: boolean }) {
  const meta = PROVIDER_META[id]; const provider = BYOK_PROVIDERS[id];
  return (
    <button type="button" onClick={() => onSelect(id)} className={`w-full text-left rounded-xl border border-border/60 ${compact ? "p-3" : "p-4"} hover:border-primary/50 hover:bg-muted/30 transition-colors`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm">{provider.label}</span>
            {meta.setupDifficulty === "easy" && <Badge variant="outline" className="text-[9px] h-4 px-1 text-success border-success/30">Easy</Badge>}
            {meta.setupDifficulty === "medium" && <Badge variant="outline" className="text-[9px] h-4 px-1 text-warning border-warning/30">Medium</Badge>}
            {meta.setupDifficulty === "advanced" && <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">Advanced</Badge>}
          </div>
          {!compact && <p className="text-xs text-muted-foreground leading-snug">{meta.description}</p>}
          <p className="text-[10px] text-muted-foreground/70 mt-1">{meta.freeTier}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      {!compact && meta.recommendation && <p className="text-[10px] text-primary mt-2 italic">{meta.recommendation}</p>}
    </button>
  );
}

export default AiAccessOnboarding;
