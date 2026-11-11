/**
 * Pillar hub: "Private AI Chat, No Login Required"
 * Targets the huge SEO gap vs ChatGPT/Claude/Gemini: users searching for
 * private, anonymous, no-signup AI chat. All roads lead to /chatbot.
 */

import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Globe, Lock, WifiOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import GeoCanonicalSummaries from "@/components/seo/GeoCanonicalSummaries";
import {
  PAGE_SEO,
  getFAQSchema,
  getSpeakableSchema,
  getSoftwareApplicationSchema,
  CHATBOT_FAQ,
} from "@/lib/seo";

const pillars = [
  {
    icon: Lock,
    title: "No signup, no email",
    body: "Start chatting instantly. Guest sessions run entirely in your browser — no phone number, no account, no tracking cookies.",
  },
  {
    icon: WifiOff,
    title: "Runs on your device",
    body: "Opt in to install a compact on-device model (~800MB). Once installed, you can switch to local inference in Settings. Standard chat uses cloud AI providers.",
  },
  {
    icon: Shield,
    title: "Local-first storage",
    body: "Conversations persist in your browser (IndexedDB). ShadowTalk servers keep no chat history and third-party providers get no training data.",
  },
  {
    icon: Zap,
    title: "Agentic tools included",
    body: "Deep Research, autonomous agents, Video Studio, Code IDE, Vault — integrated tools in one workspace, not just chat.",
  },
  {
    icon: Globe,
    title: "11 languages, natively",
    body: "English, Spanish, French, German, Arabic, Hindi, Portuguese, Russian, Japanese, Chinese, Urdu — no translation layer.",
  },
  {
    icon: KeyRound,
    title: "",
    body: "Prefer to route through your own OpenRouter, OpenAI, or Google Gemini endpoint? is a first-class option.",
  },
];

const compareRows: Array<{ feature: string; shadow: string; chatgpt: string; claude: string }> = [
  { feature: "Login required", shadow: "No", chatgpt: "Yes", claude: "Yes" },
  { feature: "Runs on device", shadow: "Yes", chatgpt: "No", claude: "No" },
  { feature: "Stores chats on server", shadow: "No — local only", chatgpt: "Yes", claude: "Yes" },
  { feature: "Uses chats for training", shadow: "Never", chatgpt: "Configurable", claude: "Configurable" },
  { feature: "Autonomous agent missions", shadow: "Built-in", chatgpt: "Limited", claude: "No" },
  { feature: "Free tier without card", shadow: "Yes", chatgpt: "Yes", claude: "Yes" },
];

export default function PrivateAiHubPage() {
  const structuredData = [
    getSoftwareApplicationSchema(),
    getFAQSchema([...CHATBOT_FAQ]),
    getSpeakableSchema(["h1", "[data-speakable]"]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead meta={PAGE_SEO.privateAi} structuredData={structuredData} />
      <Navigation />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/40 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <Shield className="h-3.5 w-3.5" /> Local-first · Zero-knowledge
        </span>
        <h1
          className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight"
          data-speakable
        >
          Private AI Chat. No Login. No Tracking.
        </h1>
        <p
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          data-speakable
        >
          ShadowTalk AI is a free, anonymous alternative to ChatGPT. Chat runs on your
          device once the model finishes downloading — nothing is stored on our
          servers, and your conversations are never used for training.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/chatbot">
              Try it free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/transparency">How privacy works</Link>
          </Button>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold mb-10 text-center">
          What makes ShadowTalk different
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur transition-colors hover:border-primary/40"
            >
              <p.icon className="h-6 w-6 text-primary" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">
          ShadowTalk vs ChatGPT vs Claude
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/40 backdrop-blur">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border/50">
                <th className="p-4 font-medium">Feature</th>
                <th className="p-4 font-medium text-primary">ShadowTalk AI</th>
                <th className="p-4 font-medium">ChatGPT</th>
                <th className="p-4 font-medium">Claude</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.feature} className="border-b border-border/30 last:border-b-0">
                  <td className="p-4 font-medium">{row.feature}</td>
                  <td className="p-4 text-primary">{row.shadow}</td>
                  <td className="p-4 text-muted-foreground">{row.chatgpt}</td>
                  <td className="p-4 text-muted-foreground">{row.claude}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* GEO canonical Q&A block */}
      <GeoCanonicalSummaries heading="Frequently asked about private AI chat" />

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold">Chat privately. Start in one click.</h2>
        <p className="mt-4 text-muted-foreground">
          No signup, no card, no tracking. Free tier available now.
        </p>
        <Button asChild size="lg" className="mt-8 gap-2">
          <Link to="/chatbot">
            Open ShadowTalk AI <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <Footer />
    </div>
  );
}
