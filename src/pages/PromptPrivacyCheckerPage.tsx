import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, MessageSquare, Download } from "lucide-react";
import { BRAND } from "@/lib/brand";

type CategoryKey = "pii" | "credentials" | "safety" | "network" | "payment" | "identity" | "location";

type Finding = {
  category: CategoryKey;
  severity: "high" | "medium" | "low";
  matched: string;
  why: string;
  fix: string;
};

const SITE_DEFINITION =
  "ShadowTalk AI is a sovereign agentic AI workspace: encrypted chat, Mission Control missions, 30+ tools, voice, code IDE, desktop app, and optional offline models. Free to use — no subscription. Bring your own AI provider API key; your provider may charge separately for API usage.";

const PRESETS = [
  {
    label: "Example leaky prompt",
    text: "Hi, my name is Alice and my email is alice@example.com. My API key is sk-1234abcd. Please send the report to my address in Karachi.",
  },
  {
    label: "Example clean prompt",
    text: "Please summarize this article in 5 bullets and suggest a title.",
  },
];

const CATEGORY_META: Record<CategoryKey, { label: string; color: string }> = {
  pii: { label: "PII", color: "bg-red-500/15 text-red-200 border-red-500/30" },
  credentials: { label: "Credentials", color: "bg-orange-500/15 text-orange-200 border-orange-500/30" },
  safety: { label: "Safety", color: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  network: { label: "Network", color: "bg-blue-500/15 text-blue-200 border-blue-500/30" },
  payment: { label: "Payment", color: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" },
  identity: { label: "Identity", color: "bg-purple-500/15 text-purple-200 border-purple-500/30" },
  location: { label: "Location", color: "bg-teal-500/15 text-teal-200 border-teal-500/30" },
};

const RULES: Array<{
  key: CategoryKey;
  severity: Finding["severity"];
  regex: RegExp;
  why: string;
  fix: string;
}> = [
  {
    key: "pii",
    severity: "high",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    why: "Emails are strong identifiers and can link prompts to real users.",
    fix: "Replace with [REDACTED_EMAIL].",
  },
  {
    key: "credentials",
    severity: "high",
    regex: /\b(sk|pk|api|token|secret|key)[-_]?[A-Za-z0-9]{6,}\b/gi,
    why: "API keys and tokens can grant access to accounts and services.",
    fix: "Replace with [REDACTED_KEY].",
  },
  {
    key: "pii",
    severity: "high",
    regex: /\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b/g,
    why: "Phone numbers enable contact, verification, and social engineering.",
    fix: "Replace with [REDACTED_PHONE].",
  },
  {
    key: "safety",
    severity: "medium",
    regex: /ignore (all |previous )?(rules|instructions|guardrails|policy|developer )/gi,
    why: "Prompts that ask for ignored rules may be flagged as unsafe.",
    fix: "Remove override instructions.",
  },
  {
    key: "network",
    severity: "medium",
    regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    why: "IP addresses disclose network position and can reveal location.",
    fix: "Replace with [REDACTED_IP].",
  },
  {
    key: "payment",
    severity: "high",
    regex: /\b(?:\D?)(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})(?:\D?)\b/g,
    why: "Card numbers can enable fraud if shared.",
    fix: "Replace with [REDACTED_CARD].",
  },
  {
    key: "identity",
    severity: "high",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    why: "Government IDs are high-sensitivity identifiers.",
    fix: "Replace with [REDACTED_ID].",
  },
  {
    key: "location",
    severity: "medium",
    regex: /\b(?:karachi|lahore|islamabad|new york|london|dubai|mumbai|delhi)\b/gi,
    why: "Exact city names can narrow location.",
    fix: "Replace with [REDACTED_LOCATION] or a broader region.",
  },
];

const PromptPrivacyCheckerPage = () => {
  const [text, setText] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const analyze = () => {
    const hits: Finding[] = [];
    for (const rule of RULES) {
      const matches = text.matchAll(rule.regex);
      for (const m of matches) {
        hits.push({
          category: rule.key,
          severity: rule.severity,
          matched: m[0],
          why: rule.why,
          fix: rule.fix,
        });
      }
    }
    const penalty = hits.reduce((acc, f) => acc + (f.severity === "high" ? 18 : f.severity === "medium" ? 10 : 5), 0);
    const computed = Math.max(0, Math.min(100, 100 - penalty));
    setFindings(hits);
    setScore(computed);
  };

  const reset = () => {
    setText("");
    setFindings([]);
    setScore(null);
  };

  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});

  const level =
    score === null
      ? { label: "Unknown", cls: "text-muted-foreground", Icon: Shield }
      : score >= 85
        ? { label: "Low risk", cls: "text-success", Icon: ShieldCheck }
        : score >= 55
          ? { label: "Medium risk", cls: "text-warning", Icon: ShieldAlert }
          : { label: "High risk", cls: "text-destructive", Icon: AlertTriangle };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Prompt Privacy Checker
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-2">
            {SITE_DEFINITION}
          </p>
          <p className="text-sm text-muted-foreground">
            Paste your prompt to scan for PII, secrets, unsafe instructions, and location leaks. This tool runs locally in your browser.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto border-border/60 bg-card/60">
          <CardContent className="p-5 sm:p-6">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your prompt here..."
              className="min-h-[160px] mb-4"
            />
            <div className="flex flex-wrap gap-2 mb-6">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setText(preset.text)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={analyze} className="btn-glow">
                <Shield className="mr-2 h-4 w-4" />
                Scan prompt
              </Button>
              <Button variant="outline" onClick={reset}>
                Reset
              </Button>
              <Button variant="ghost" onClick={() => setText("")}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {score !== null && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground mb-1">Risk score</div>
                <div className={`text-3xl font-bold ${level.cls}`}>{score}/100</div>
                <div className={`text-sm font-medium mt-1 ${level.cls}`}>{level.label}</div>
                <level.Icon className="mt-3 h-8 w-8 opacity-80" />
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground mb-1">Findings</div>
                <div className="text-3xl font-bold">{findings.length}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {findings.filter((f) => f.severity === "high").length} high · {findings.filter((f) => f.severity === "medium").length} medium · {findings.filter((f) => f.severity === "low").length} low
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground mb-1">Category hits</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.keys(CATEGORY_META).length === 0 ? (
                    <span className="text-sm text-muted-foreground">None detected</span>
                  ) : (
                    Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <Badge key={key} variant="secondary" className={counts[key] ? meta.color : "opacity-60"}>
                        {meta.label}: {counts[key] || 0}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {findings.length > 0 && (
          <div className="max-w-4xl mx-auto mt-6 space-y-3">
            {findings.map((f, i) => (
              <Card key={i} className="border-border/60 bg-card/60">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="secondary" className={CATEGORY_META[f.category].color}>
                      {CATEGORY_META[f.category].label}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {f.severity}
                    </Badge>
                    <span className="text-sm font-medium">Matched: {f.matched}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{f.why}</p>
                  <p className="text-sm">Fix: {f.fix}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Redact before you share: emails, phones, keys, IDs, cards, addresses.
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Use minimal context: paste only what the model needs to help.
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Prefer clean channels for sensitive data instead of chat when possible.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PromptPrivacyCheckerPage;
