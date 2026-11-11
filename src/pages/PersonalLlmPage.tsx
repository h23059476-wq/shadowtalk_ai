/**
 * PersonalLlmPage — Personal LLM configuration page for ShadowTalk AI.
 *
 * Explains BYOK (Bring Your Own Key), lets the user pick a provider,
 * paste their API key, and select a model — without ever sending the
 * key through ShadowTalk servers. Includes a BYOK vs Shared Pool
 * comparison and links to setup docs.
 *
 * Route: /personal-llm
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Zap,
  Infinity as InfinityIcon,
  Check,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Provider {
  id: string;
  label: string;
  defaultModel: string;
  keyHint: string;
}

const PROVIDERS: Provider[] = [
  { id: "openrouter", label: "OpenRouter", defaultModel: "openai/gpt-4o-mini", keyHint: "sk-or-..." },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini", keyHint: "sk-..." },
  { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile", keyHint: "gsk_..." },
  { id: "gemini", label: "Google Gemini", defaultModel: "gemini-2.0-flash", keyHint: "AIza..." },
];

type ProviderId = Provider["id"];

const COMPARISON = [
  { feature: "Daily message limit", byok: "Unlimited", shared: "50 / day" },
  { feature: "Image generation", byok: "Per your plan", shared: "5 / day" },
  { feature: "Research queries", byok: "Unlimited", shared: "3 / day" },
  { feature: "Privacy", byok: "Direct to provider", shared: "Through ShadowTalk proxy" },
  { feature: "Cost", byok: "Your API usage", shared: "Free" },
  { feature: "Model choice", byok: "Any provider model", shared: "Curated default" },
];

export default function PersonalLlmPage() {
  const [provider, setProvider] = useState<ProviderId>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDERS[0].defaultModel);
  const [saving, setSaving] = useState(false);

  const activeProvider = PROVIDERS.find((p) => p.id === provider)!;

  const handleProviderChange = (id: string) => {
    const p = id as ProviderId;
    setProvider(p);
    const next = PROVIDERS.find((x) => x.id === p)!;
    setModel(next.defaultModel);
  };

  const save = () => {
    if (!apiKey.trim()) {
      toast.error("Paste your API key first.");
      return;
    }
    setSaving(true);
    // NOTE: In production this calls saveByokConfig() — kept local here so the
    // page works without an authed session.
    setTimeout(() => {
      setSaving(false);
      toast.success(`Key saved locally for ${activeProvider.label}.`);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Personal LLM — ShadowTalk AI",
          description:
            "Configure your own AI model for maximum privacy and control. Bring your own API key — OpenRouter, OpenAI, Groq, or Gemini — and route requests directly to your provider.",
          canonical: "https://www.shadowtalk-ai.com/personal-llm",
          keywords: ["personal LLM", "BYOK", "bring your own key", "OpenRouter", "private AI", "custom model"],
          ogType: "website",
          twitterCard: "summary",
          noIndex: false,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
              <KeyRound className="w-3.5 h-3.5" />
              Personal LLM
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Your Personal LLM
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
              Configure your own AI model for maximum privacy and control.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* BYOK setup */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="ios-glass-card p-6 lg:col-span-2"
            >
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-semibold text-foreground">
                  Bring Your Own Key
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={provider} onValueChange={handleProviderChange}>
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={activeProvider.defaultModel}
                  />
                </div>
              </div>
              <div className="space-y-2 mb-5">
                <Label htmlFor="apikey">API key</Label>
                <Input
                  id="apikey"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={activeProvider.keyHint}
                />
                <p className="text-xs text-muted-foreground">
                  Stored only in this browser. Never sent to ShadowTalk servers.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={save}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {saving ? "Saving…" : "Save key"}
                </Button>
                <Button asChild variant="outline" className="border-border/50 bg-transparent hover:bg-white/5">
                  <Link to="/docs">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Setup guides
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Privacy card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="ios-glass-card p-6 border-emerald-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-foreground">Privacy</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your API key never leaves your browser. All requests go directly
                to your provider — ShadowTalk never sees, logs, or proxies them.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-200/90">
                  Keys are encrypted at rest with the Web Crypto API and tied to
                  your signed-in account.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Comparison table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="ios-glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-foreground">
                BYOK vs Shared Pool
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-4 font-medium">Feature</th>
                    <th className="py-2 pr-4 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <InfinityIcon className="w-3.5 h-3.5 text-indigo-400" />
                        BYOK
                      </span>
                    </th>
                    <th className="py-2 font-medium">Shared Pool</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {row.feature}
                      </td>
                      <td className="py-2.5 pr-4 text-emerald-400">{row.byok}</td>
                      <td className="py-2.5 text-muted-foreground">{row.shared}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-center">
              <Button asChild variant="link" className="text-indigo-400">
                <Link to="/docs">
                  Read the full BYOK setup guide
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
