import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, KeyRound, ExternalLink, X, Loader2, ShieldCheck, Eye, EyeOff, Check, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DeviceCapability } from "@/offline/DeviceCapability";
import { markDeviceInstallConsent } from "@/offline/BackgroundInstall";
import {
  FREE_AI_PRESETS,
  saveVaultKey,
  validateVaultKey,
  type FreeProviderPreset,
} from "@/lib/keyVault";

/**
 * ZeroSetupCard — the recovery UI the chat shows when the free-AI router
 * reports `needsSetup`. Two honest, instant paths:
 *
 *  1. On-device AI: one-time WebGPU model install, private, works offline.
 *     Progress streams from LocalInferenceEngine's init callback.
 *  2. Free cloud key: pick a preset (Google AI Studio / Groq / OpenRouter),
 *     create the free key on the provider's site, paste, save to the
 *     device-local vault. Keys never leave the browser.
 *
 * Dismissal and success both unmount the card via the parent.
 */

interface ZeroSetupCardProps {
  visible: boolean;
  onDismiss: () => void;
  /** Called once the user is set up (model installed or key saved). */
  onReady: () => void;
}

type Mode = "idle" | "local" | "key";

interface LocalInstallState {
  active: boolean;
  progress: number; // 0..1, or -1 = indeterminate
  text: string;
  error: string | null;
}

const LOCAL_INSTALL_IDLE: LocalInstallState = { active: false, progress: 0, text: "", error: null };

/** The three headline free presets (the rest stay reachable in Settings). */
const HEADLINE_PRESET_PROVIDERS = new Set(["gemini", "groq", "openrouter"]);
const HEADLINE_PRESETS = FREE_AI_PRESETS.filter((p) => HEADLINE_PRESET_PROVIDERS.has(p.provider));

export function ZeroSetupCard({ visible, onDismiss, onReady }: ZeroSetupCardProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("idle");
  const [webgpuOk, setWebgpuOk] = useState<boolean | null>(null);
  const [install, setInstall] = useState<LocalInstallState>(LOCAL_INSTALL_IDLE);
  const [preset, setPreset] = useState<FreeProviderPreset | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);

  // Detect WebGPU once while visible — drives whether the on-device path is offered.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      const ok = await DeviceCapability.hasWebGPU();
      if (!cancelled) setWebgpuOk(ok);
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const finish = (title: string, description: string) => {
    toast({ title, description });
    setMode("idle");
    setInstall(LOCAL_INSTALL_IDLE);
    setPreset(null);
    setApiKey("");
    setKeyError(null);
    onReady();
  };

  const startLocalInstall = async () => {
    setMode("local");
    // Explicit user intent (install button) — latch device consent so the
    // background bootstrap may pre-cache tiers from now on.
    markDeviceInstallConsent();
    setInstall({ active: true, progress: 0, text: "Preparing the on-device model…", error: null });
    try {
      const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
      const ok = await localInferenceEngine.initialize((report) => {
        const progress = typeof report?.progress === "number" ? report.progress : -1;
        setInstall((prev) => ({
          ...prev,
          active: true,
          progress,
          text: report?.text || prev.text,
        }));
      });
      if (ok) {
        finish("Private AI is ready", "Your reply now runs on-device — free, private, and offline-capable. Send your message again.");
      } else {
        setInstall({
          active: false,
          progress: 0,
          text: "",
          error: "The on-device model could not be loaded on this device. A free cloud key below works everywhere.",
        });
      }
    } catch (error) {
      setInstall({
        active: false,
        progress: 0,
        text: "",
        error: (error as Error)?.message || "The install failed. Check the connection and retry, or use a free cloud key below.",
      });
    }
  };

  const saveKey = async (chosen: FreeProviderPreset) => {
    setKeyError(null);
    const invalid = validateVaultKey(apiKey);
    if (invalid) {
      setKeyError(invalid);
      return;
    }
    setSavingKey(true);
    try {
      saveVaultKey(chosen.provider, apiKey, chosen.defaultModel);
      finish(
        `${chosen.label} connected`,
        "Your free key is saved on this device only. Send your message again to chat.",
      );
    } catch (error) {
      setKeyError((error as Error)?.message || "Could not save the key.");
    } finally {
      setSavingKey(false);
    }
  };

  const dismiss = () => {
    setMode("idle");
    setInstall(LOCAL_INSTALL_IDLE);
    setPreset(null);
    setApiKey("");
    setKeyError(null);
    onDismiss();
  };

  const showLocalOption = webgpuOk === true;
  const showKeyOption = webgpuOk !== null; // offered always once detection settled

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="mx-2 md:mx-auto w-full max-w-xl mb-3 rounded-2xl border border-border/80 bg-card/80 backdrop-blur p-4 shadow-lg relative"
          role="dialog"
          aria-label="Set up free AI access"
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 rounded-md p-1 text-slate-400 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 mb-1 pr-6">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
            <p className="text-sm font-semibold text-foreground">Chat free — pick your path</p>
          </div>
          <p className="text-xs text-slate-400 mb-3 pr-6">
            No card, no catch. Run a private model on this device, or connect a free cloud key in under a minute.
          </p>

          {/* Option 1 — on-device */}
          {showLocalOption && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 mb-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">Private on-device AI</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    One-time ~880 MB download, then free forever and it works offline. Nothing leaves this browser.
                  </p>
                  {install.active && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: install.progress >= 0 ? `${Math.round(install.progress * 100)}%` : "40%" }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">{install.text || "Working…"}</p>
                    </div>
                  )}
                  {install.error && (
                    <p className="text-[11px] text-destructive mt-1.5">{install.error}</p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                    disabled={install.active}
                    onClick={() => void startLocalInstall()}
                  >
                    {install.active ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Installing…
                      </>
                    ) : install.error ? (
                      "Retry install"
                    ) : (
                      "Install & chat privately"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Option 2 — free cloud key */}
          {showKeyOption && (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">Free cloud key</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Frontier quality, no install. Grab a free key from any of these, paste it below, done.
                  </p>

                  {mode !== "key" ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {HEADLINE_PRESETS.map((p) => (
                        <button
                          key={p.provider}
                          type="button"
                          onClick={() => { setMode("key"); setPreset(p); setKeyError(null); }}
                          className="rounded-full border border-border/80 bg-card/60 px-2.5 py-1 text-[11px] text-foreground hover:border-sky-500/50 hover:bg-sky-500/10 transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  ) : preset && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={preset.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300"
                        >
                          Get a free {preset.label} key <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => { setMode("idle"); setPreset(null); setKeyError(null); }}
                          className="text-[11px] text-slate-400 hover:text-foreground"
                        >
                          Back
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">{preset.freeTier}</p>
                      <div className="relative">
                        <Input
                          type={showKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => { setApiKey(e.target.value); setKeyError(null); }}
                          placeholder={preset.keyHint}
                          className="pr-9 text-xs"
                          autoFocus
                          aria-label={`${preset.label} API key`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                          aria-label={showKey ? "Hide key" : "Show key"}
                        >
                          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {keyError && <p className="text-[11px] text-destructive">{keyError}</p>}
                      <Button
                        type="button"
                        size="sm"
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white"
                        disabled={savingKey}
                        onClick={() => void saveKey(preset)}
                      >
                        {savingKey ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" /> Save key & start chatting
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-slate-500">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Keys and chats stay on this device — ShadowTalk never uploads them.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ZeroSetupCard;
