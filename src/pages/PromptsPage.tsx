import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, MessageSquare, FlaskConical, Code2, Presentation, Bot, Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "@/lib/brand";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "research", label: "Research", icon: FlaskConical },
  { key: "code", label: "Code", icon: Code2 },
  { key: "presentations", label: "Presentations", icon: Presentation },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "privacy", label: "Privacy", icon: Shield },
] as const;

const PROMPTS = [
  {
    id: "chat-clean",
    category: "chat",
    title: "Clean helper",
    prompt:
      "You are a concise assistant. Answer in short numbered steps. If the request needs research or code, say so explicitly.",
  },
  {
    id: "chat-socratic",
    category: "chat",
    title: "Socratic tutor",
    prompt:
      "Teach me by asking one question at a time. Wait for my answer before the next question. Keep the question focused.",
  },
  {
    id: "chat-eli5",
    category: "chat",
    title: "ELI5 explainer",
    prompt:
      "Explain this topic for a 10-year-old. Use one analogy, avoid jargon, and give a 3-sentence summary at the end.",
  },
  {
    id: "research-brief",
    category: "research",
    title: "Research brief",
    prompt:
      "Summarize the topic in 5 bullets, cite sources, and list 3 follow-up questions. Use only the provided context.",
  },
  {
    id: "research-critic",
    category: "research",
    title: "Research critic",
    prompt:
      "Find weaknesses in this argument, question assumptions, and suggest evidence that would strengthen or break it.",
  },
  {
    id: "code-review",
    category: "code",
    title: "Code review",
    prompt:
      "Review the code for bugs, performance, and readability. Report issues as: severity, location, problem, fix.",
  },
  {
    id: "code-tests",
    category: "code",
    title: "Test cases",
    prompt:
      "Write unit tests for this function. Include happy path, edge cases, and failure cases. Use simple assertions.",
  },
  {
    id: "code-refactor",
    category: "code",
    title: "Refactor plan",
    prompt:
      "List 3 refactor improvements: what changes, why it helps, and estimated risk. Keep changes reversible.",
  },
  {
    id: "slide-outline",
    category: "presentations",
    title: "Slide outline",
    prompt:
      "Create a 6-slide deck outline for this topic. Each slide: title, 3 bullets, speaker note. Keep it copy-paste ready.",
  },
  {
    id: "slide-pitch",
    category: "presentations",
    title: "Pitch deck",
    prompt:
      "Create a concise investor pitch: problem, solution, market, traction, team, ask. 5 slides max.",
  },
  {
    id: "agent-mission",
    category: "agents",
    title: "Mission prompt",
    prompt:
      "Mission: finish the requested workflow. Plan 3-6 steps, run each step, pause before sensitive actions, and report outcome.",
  },
  {
    id: "agent-planner",
    category: "agents",
    title: "Agent planner",
    prompt:
      "Break this goal into separate tasks, assign tools to each task, and define success criteria for each.",
  },
  {
    id: "privacy-redact",
    category: "privacy",
    title: "Redact before share",
    prompt:
      "Redact emails, phones, keys, IDs, addresses, exact locations, and credentials. Replace with [REDACTED].",
  },
  {
    id: "privacy-audit",
    category: "privacy",
    title: "Privacy audit",
    prompt:
      "Review this text for data exposure risk. List sensitive items, where they appear, and why they matter.",
  },
];

const SITE_DEFINITION =
  "ShadowTalk AI is a sovereign agentic AI workspace: encrypted chat, Mission Control missions, 30+ tools, voice, code IDE, desktop app, and optional offline models. Free to use — no subscription. Bring your own AI provider API key; your provider may charge separately for API usage.";

const PromptsPage = () => {
  const [active, setActive] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const visible =
    active === "all" ? PROMPTS : PROMPTS.filter((p) => p.category === active);

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Prompt Library
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4">
            {SITE_DEFINITION}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Free, copy-paste prompts for chat, research, code, presentations, agents, and privacy.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/chatbot")} className="btn-glow rounded-xl">
              Open workspace <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/prompts/privacy-checker")} className="rounded-xl">
              Try privacy checker
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const Icon = (c as { icon?: React.ComponentType<{ className?: string }> }).icon;
            return (
              <Button
                key={c.key}
                variant={active === c.key ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setActive(c.key)}
              >
                {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                {c.label}
              </Button>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((item) => (
            <Card key={item.id} className="border-border/60 bg-card/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {item.category}
                    </Badge>
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg"
                    onClick={() => copy(item.id, item.prompt)}
                  >
                    {copiedId === item.id ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                  {item.prompt}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptsPage;
