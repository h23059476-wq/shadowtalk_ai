/**
 * DevelopersPage — Developer Portal for ShadowTalk AI.
 *
 * Hero, quick-start cards, an annotated code example, and SDK info.
 * Routes developers to /docs for full reference.
 *
 * Route: /developers
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  KeyRound,
  Plug,
  MessageSquare,
  Image as ImageIcon,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  Cloud,
  Server,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

const QUICK_START = [
  {
    icon: KeyRound,
    title: "Get an API Key",
    body: "Generate a key from Settings → Developer. Keys are scoped per-workspace and rotatable on demand.",
  },
  {
    icon: Plug,
    title: "BYOK Setup",
    body: "Bring your own OpenRouter, Gemini, or Groq key. We never store the plaintext — keys are encrypted at rest.",
  },
  {
    icon: MessageSquare,
    title: "Chat API",
    body: "Stream completions with SSE. OpenAI-compatible request shape so existing SDKs drop right in.",
  },
  {
    icon: ImageIcon,
    title: "Image Generation API",
    body: "Generate, edit, and upscale images. Returns signed URLs valid for 24 hours.",
  },
];

const CODE_SAMPLE = `// ShadowTalk AI — basic chat completion (Node.js)
import fetch from "node-fetch";

const res = await fetch("https://api.shadowtalk-ai.com/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk-shadow-...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "shadowtalk-pro",
    messages: [
      { role: "system", content: "You are a concise research assistant." },
      { role: "user", content: "Summarize the latest GDPR enforcement actions." },
    ],
    stream: true, // SSE streaming supported
  }),
});

for await (const chunk of res.body) {
  console.log(chunk.toString());
}`;

export default function DevelopersPage() {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(CODE_SAMPLE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked — fail silently.
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Developer Portal — ShadowTalk AI",
          description:
            "Build with ShadowTalk AI. REST API, SSE streaming, OpenAI-compatible endpoints, BYOK support, and image generation. Get an API key and ship in minutes.",
          canonical: "https://www.shadowtalk-ai.com/developers",
          keywords: ["ShadowTalk API", "developer portal", "BYOK", "SSE streaming", "OpenAI-compatible"],
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
            transition={{ duration: 0.3 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <Code2 className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Build with ShadowTalk AI</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
              A production-grade API for chat, research, and image generation. OpenAI-compatible,
              SSE-streamed, and BYOK-friendly. Ship your first integration in under five minutes.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button onClick={() => (window.location.href = "/settings")} className="gap-2">
                <KeyRound className="h-4 w-4" />
                Get an API Key
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/docs")}
                className="gap-2 border-border/50 bg-transparent hover:bg-white/5"
              >
                Full Documentation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Quick start cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {QUICK_START.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.04 * i }}
                className="ios-glass-card p-5"
              >
                <div className="inline-flex p-2 rounded-lg bg-white/5 border border-border/50 mb-3">
                  <card.icon className="h-4 w-4 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{card.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Code example */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="ios-glass-card p-6 mb-12"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Example — Chat Completion
                </h2>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-border/50 text-muted-foreground hover:text-foreground hover:border-indigo-500/40 transition"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-[#0a0e1a] border border-border/50 p-4 text-[12px] leading-relaxed text-slate-200">
              <code>{CODE_SAMPLE}</code>
            </pre>
          </motion.div>

          {/* SDK info card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="ios-glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                SDK & Protocol Support
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Code2,
                  title: "REST API",
                  body: "Predictable JSON over HTTPS. Versioned at /v1. Stable, documented, and OpenAPI-described.",
                },
                {
                  icon: Cloud,
                  title: "SSE Streaming",
                  body: "Server-Sent Events for token-by-token streaming. Same shape as OpenAI's stream API.",
                },
                {
                  icon: Plug,
                  title: "OpenAI-compatible",
                  body: "Point any OpenAI SDK at api.shadowtalk-ai.com and it just works. BYOK keys supported.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/50 bg-white/[0.02] p-4"
                >
                  <item.icon className="h-4 w-4 text-indigo-400 mb-2" />
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{item.body}</p>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-5 gap-2 border-border/50 bg-transparent hover:bg-white/5"
              onClick={() => (window.location.href = "/docs")}
            >
              Open Full Documentation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
