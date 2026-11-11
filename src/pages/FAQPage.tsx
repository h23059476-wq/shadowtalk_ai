import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  MessageSquare,
  CreditCard,
  Shield,
  Zap,
  Code,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Bot,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO, getFAQSchema } from "@/lib/seo";
import { AEO_ANSWER_CORPUS } from "@/lib/aeo";
import { motion } from "framer-motion";

interface FAQItem {
  id: string;
  category: "general" | "product" | "pricing" | "security" | "founder";
  question: string;
  answer: string;
}

const STATIC_FAQS: FAQItem[] = [
  {
    id: "faq-what-is",
    category: "general",
    question: "What is ShadowTalk AI?",
    answer: "ShadowTalk AI is an agentic AI workspace that unifies multi-model chat, autonomous multi-step agents, integrated tool orchestration (web search, deep research, code execution, slides), and an on-device cryptographic ledger into one focused interface at shadowtalk-ai.com.",
  },
  {
    id: "faq-how-different-chatgpt",
    category: "product",
    question: "How is ShadowTalk AI different from ChatGPT or simple chat wrappers?",
    answer: "Standard chatbots are reactive single-turn engines. ShadowTalk is an agentic workspace that plans and finishes multi-step tasks across real-world tools, includes a built-in browser IDE, provides Business Memory across sessions, supports , and offers ultra-low latency inference via Groq Llama 3.3 70B (600+ tok/s) and DeepSeek R1 reasoning.",
  },
  {
    id: "faq-free-tier",
    category: "pricing",
    question: "Is ShadowTalk AI free to use?",
    answer: "Yes. ShadowTalk offers a generous free tier with daily message allocations, access to Groq Llama Turbo, tool triggers, and memory slots without requiring a credit card to get started.",
  },
  {
    id: "faq-models-supported",
    category: "product",
    question: "Which AI models can I use on ShadowTalk?",
    answer: "ShadowTalk integrates Groq Llama 3.3 70B (ultra-fast inference), DeepSeek R1 (deep logical reasoning), OpenAI GPT-4o (multimodal intelligence), and client-side WebGPU acceleration for on-device edge execution.",
  },
  {
    id: "faq-security-privacy",
    category: "security",
    question: "How does ShadowTalk protect my confidential data?",
    answer: "ShadowTalk enforces client-side encryption for your private vault, stores local telemetry inside IndexedDB sandboxes, supports where API keys never touch our database, and guarantees that your proprietary business conversations are never used to train foundation models.",
  },
  {
    id: "faq-pricing-tiers",
    category: "pricing",
    question: "What does ShadowTalk AI cost?",
    answer: "Nothing. ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage. There are no paid tiers, no subscriptions, and no feature locks.",
  },
  {
    id: "faq-refund-policy",
    category: "pricing",
    question: "Can I get a refund if I am not satisfied?",
    answer: "There is nothing to refund: ShadowTalk AI does not charge for access and does not collect payments. If you use your own AI provider API key (BYOK), that provider bills you directly — refund questions go to your provider.",
  },
  {
    id: "faq-who-built",
    category: "founder",
    question: "Who built ShadowTalk AI?",
    answer: "ShadowTalk AI was founded and architected by Zain Ahmed Fahad Patel (Zain Ahmed), a 17-year-old AI solutions engineer from Karachi, Pakistan, committed to shipping production-grade agentic tooling worldwide.",
  },
  {
    id: "faq-private-ai",
    category: "security",
    question: "Can ShadowTalk run on-device without internet?",
    answer: "Yes, on supported devices with WebGPU (Chrome 113+, Edge 113+), you can opt in to download compact quantized models (~130MB to larger Gemma models) to execute chat inference directly in your browser with zero network egress.",
  },
  {
    id: "faq-export-data",
    category: "security",
    question: "Can I export my chat history and documents?",
    answer: "Yes. All conversations, code artifacts, research briefs, and session logs can be downloaded as JSON, Markdown, or PDF at any time via the chatbot and settings panels.",
  },
];

const CATEGORY_MAP = [
  { id: "all", label: "All Questions", icon: Sparkles },
  { id: "general", label: "General & Overview", icon: HelpCircle },
  { id: "product", label: "Product & Tools", icon: Zap },
  { id: "pricing", label: "Pricing & Billing", icon: CreditCard },
  { id: "security", label: "Security & Control", icon: Shield },
  { id: "founder", label: "Founder & Team", icon: Code },
];

export const FAQPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [accordionValues, setAccordionValues] = useState<string[]>([]);

  // Merge static FAQs with AEO answer corpus for complete coverage
  const allFaqs = useMemo(() => {
    const combined = [...STATIC_FAQS];
    AEO_ANSWER_CORPUS.forEach((aeo, idx) => {
      // Map category
      const aeoCat = aeo.category as string;
      let cat: FAQItem["category"] = "general";
      if (aeoCat === "product") cat = "product";
      else if (aeoCat === "pricing" || aeoCat === "comparison") cat = "pricing";
      else if (aeoCat === "founder") cat = "founder";
      else if (aeoCat === "privacy" || aeoCat === "security") cat = "security";

      // Prevent duplicate questions
      if (!combined.some((item) => item.question.toLowerCase === aeo.question.toLowerCase)) {
        combined.push({
          id: `aeo-${idx}`,
          category: cat,
          question: aeo.question,
          answer: aeo.answer,
        });
      }
    });
    return combined;
  }, []);

  const filteredFaqs = useMemo(() => {
    return allFaqs.filter((item) => {
      const matchesCat = activeCategory === "all" || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [allFaqs, activeCategory, searchQuery]);

  const handleExpandAll = () => {
    setAccordionValues(filteredFaqs.map((f) => f.id));
  };

  const handleCollapseAll = () => {
    setAccordionValues([]);
  };

  const faqSchema = useMemo(() => {
    return getFAQSchema(
      filteredFaqs.slice(0, 25).map((f) => ({
        question: f.question,
        answer: f.answer,
      }))
    );
  }, [filteredFaqs]);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.faq} structuredData={faqSchema} />
      <Navigation />

      {/* Floating Back to Chatbot */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/chatbot")}
          className="gap-2 glass-strong border-border/50 hover:border-primary/40 shadow-lg backdrop-blur-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chatbot
        </Button>
      </div>

      {/* Hero Section */}
      <section className="pt-28 pb-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dense opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[300px] bg-accent/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 glass-subtle border-accent/30 text-accent py-1 px-3">
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              Frequently Asked Questions
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Answers to <span className="gradient-text">Common Questions</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Find transparent, accurate answers regarding model capabilities, billing policies, 
              autonomous agents, security architecture, and system limits.
            </p>

            {/* Interactive Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search questions (e.g. 'refunds', 'Groq speed', '', 'security')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-base bg-background/80 border-border/60 rounded-xl shadow-lg focus-visible:ring-primary/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-mono"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Pills & Action Bar */}
      <section className="py-4 px-4 border-y border-border/40 bg-muted/5">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none justify-start flex-wrap">
              {CATEGORY_MAP.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "glass-subtle text-muted-foreground hover:text-foreground border-border/50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0">
              <button
                onClick={handleExpandAll}
                className="hover:text-foreground underline underline-offset-4"
              >
                Expand All
              </button>
              <span>·</span>
              <button
                onClick={handleCollapseAll}
                className="hover:text-foreground underline underline-offset-4"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ List */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-mono text-muted-foreground">
              Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? "question" : "questions"}
            </span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 glass-subtle rounded-2xl border border-border/50 p-8 max-w-md mx-auto">
              <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">No matching questions</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Couldn't find any questions matching "{searchQuery}". You can submit a direct question to our engineers.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={accordionValues}
              onValueChange={setAccordionValues}
              className="space-y-4"
            >
              {filteredFaqs.map((faq, idx) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.4), duration: 0.3 }}
                >
                  <AccordionItem
                    value={faq.id}
                    className="glass-subtle border border-border/50 rounded-xl px-5 py-1 transition-colors hover:border-primary/40 data-[state=open]:border-primary/50 data-[state=open]:shadow-md"
                  >
                    <AccordionTrigger className="text-left font-semibold text-base sm:text-lg text-foreground hover:text-primary transition-colors py-4">
                      <div className="flex items-start gap-3 pr-4">
                        <span className="text-xs font-mono text-primary/70 mt-1">
                          {(idx + 1).toString().padStart(2, "0")}.
                        </span>
                        <span>{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-1 pb-5 pl-7 border-t border-border/30 mt-1">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          )}
        </div>
      </section>

      {/* Still Have Questions Banner */}
      <section className="py-14 px-4 bg-muted/5 border-t border-border/40">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="glass-subtle border-primary/30 p-8 relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
            <div className="max-w-xl mx-auto space-y-4">
              <h3 className="text-2xl font-bold">Still have questions?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Can’t find what you’re looking for? Reach out to our team directly or start chatting with ShadowTalk AI to test the responses.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="bg-primary text-primary-foreground font-medium shadow-md">
                  <Link to="/chatbot">
                    Try ShadowTalk Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/contact">Contact Support</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/help">Help Center & Docs</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQPage;
