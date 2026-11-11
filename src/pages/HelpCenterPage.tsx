import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  BookOpen,
  Zap,
  Target,
  Sparkles,
  CreditCard,
  Settings,
  Code,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Bot,
  Cpu,
  Layers,
  FileText,
  Activity,
  MessageSquare,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  readTime: string;
  tags: string[];
  content: string;
}

const HELP_ARTICLES: HelpArticle[] = [
  // Category: Getting Started
  {
    id: "getting-started-quickstart",
    title: "ShadowTalk AI Quickstart: First Prompts to Missions",
    category: "getting-started",
    summary: "Set up your workspace, choose an inference engine, and run your first multi-step agent flow in seconds.",
    readTime: "3 min read",
    tags: ["Basics", "Quickstart", "Setup"],
    content: `
### Welcome to ShadowTalk AI
ShadowTalk is a sovereign agentic AI workspace engineered for developers, builders, researchers, and enterprises. Unlike simple chat wrappers, ShadowTalk chains tools, executes scripts, and coordinates multi-step missions autonomously.

#### Step 1: Navigating the Interface
1. **Chat Workspace (\`/chatbot\`)**: The primary conversational surface where you interact with frontier models, execute code snippets, and invoke tools.
2. **AI Workspace (\`/workspace\`)**: Manage your long-term business memory, custom instructions, and project parameters.
3. **Telemetry & Analytics (\`/analytics\`)**: Track message velocity, token synthesis rates, and model distributions in real time.
4. **Shadow Memory (\`/shadow-memory\`)**: Inspect the on-device cryptographic ledger stored directly in your browser.

#### Step 2: Selecting Your Engine
ShadowTalk provides dynamic multi-model routing:
- **Groq Llama 3.3 70B**: Delivers blistering speeds (600+ tokens/sec) for code, synthesis, and rapid ideation.
- **DeepSeek R1 Reasoning**: High-depth chain-of-thought analysis for complex mathematical, architectural, and logical challenges.
- **OpenAI GPT-4o**: Multimodal vision, file analysis, and frontier general intelligence.
- **WebGPU Edge Engine**: Run compact AI models directly on your graphics hardware with zero cloud egress.
    `,
  },
  {
    id: "getting-started-navigation",
    title: "Command Palette & Keyboard Shortcuts",
    category: "getting-started",
    summary: "Master keyboard shortcuts and the Ctrl+K Command Palette to navigate across all 35+ pages instantly.",
    readTime: "2 min read",
    tags: ["Productivity", "Navigation", "Shortcuts"],
    content: `
### Power Navigation with Command Palette
ShadowTalk includes a system-wide Command Palette accessible from anywhere in the application.

#### Core Shortcuts
- **Ctrl + K** (or **Cmd + K** on macOS): Open the global Command Palette to search all product pages, tools, and developer resources.
- **Enter**: Submit message in chat.
- **Shift + Enter**: Insert new line without sending.
- **Esc**: Close open modals, drawers, or command palette.

#### Page Search & Quick Jumps
Type any page name, such as "Analytics", "Workspace", "Settings", "Changelog", or "Docs" into the Command Palette to navigate instantly without touching your mouse.
    `,
  },

  // Category: Model Routing & Execution
  {
    id: "models-groq-deepseek-routing",
    title: "Optimizing Multi-Model Routing: Groq vs DeepSeek vs OpenAI",
    category: "models",
    summary: "When to use ultra-low latency Groq Llama, DeepSeek reasoning chains, or multimodal GPT-4o.",
    readTime: "4 min read",
    tags: ["Models", "Latency", "Reasoning"],
    content: `
### Engine Selection Guide
Choosing the right model for the task ensures optimal response times and token efficiency:

1. **Groq Llama 3.3 70B (Default Turbo)**:
   - *Best for*: Real-time chat, coding assistance, summarization, and rapid tool chaining.
   - *Speed*: 600+ tokens per second, < 100ms time-to-first-token.
2. **DeepSeek R1 Reasoning**:
   - *Best for*: Mathematical proofs, complex algorithm design, legal synthesis, and system debugging.
   - *Behavior*: Emits full reasoning traces before delivering final conclusions.
3. **OpenAI GPT-4o**:
   - *Best for*: Multimodal image analysis, nuanced creative writing, and cross-lingual translation.
    `,
  },

  // Category: Billing & Subscriptions
  {
    id: "billing-plans-explained",
    title: "Free Access: What You Get and How BYOK Works",
    category: "billing",
    summary: "ShadowTalk AI is free to use — every feature, no subscriptions. How the BYOK model and provider costs work.",
    readTime: "2 min read",
    tags: ["Free Access", "BYOK", "Providers"],
    content: `
### One Plan: Free Access
ShadowTalk AI is free to use. ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage.

- **Every feature included**: agentic chat, Mission Control missions, research and visualization, document analysis, themes, desktop app — nothing is gated behind a tier.
- **Bring your own AI provider API key (BYOK)**: you choose the provider and the models; switch any time from Settings.
- **Provider costs and limits**: your provider bills you directly for API usage and may apply its own rate limits. ShadowTalk never resells inference and never sits between you and your provider's bill.

#### Nothing to Refund
ShadowTalk does not collect payments, so there are no subscriptions or invoices here. Provider-side API charges are between you and your provider.
    `,
  },

  // Category: Developer API & 
  {
    id: "developer--guide",
    title: ": Configuring Custom API Providers",
    category: "developer",
    summary: "Store your personal Groq, OpenAI, or Anthropic keys in your browser sandbox with zero markup.",
    readTime: "4 min read",
    tags: ["", "API Keys", "Security"],
    content: `
### Client-Side Architecture
ShadowTalk supports  for power users:

1. Navigate to **/settings** or **/developers**.
2. Select your provider: **Groq**, **OpenAI**, **Anthropic**, or **OpenRouter**.
3. Enter your API key. Keys are encrypted using AES-GCM and stored only inside your browser's secure \`localStorage\` sandbox.
4. When active, requests route directly using your key with zero markup on token pricing.
    `,
  },

  // Category: Troubleshooting & Performance
  {
    id: "troubleshooting-webgpu",
    title: "Troubleshooting WebGPU In-Browser Model Acceleration",
    category: "troubleshooting",
    summary: "Hardware requirements, browser flags, and memory management for edge AI execution.",
    readTime: "3 min read",
    tags: ["WebGPU", "Hardware", "Edge AI"],
    content: `
### WebGPU Diagnostics
If on-device edge execution fails to initialize:

1. **Browser Compatibility**: Ensure you are running Chrome 113+, Edge 113+, or modern Chromium browsers with hardware acceleration enabled.
2. **VRAM Requirements**: WebGPU models require a minimum of 4GB allocated system or dedicated GPU memory.
3. **Driver Updates**: Ensure your GPU drivers (Nvidia, AMD, or Apple Silicon Metal) are up to date.
4. **Fallback Mode**: If WebGPU is unavailable on your device, ShadowTalk automatically falls back to low-latency cloud inference without interrupting your session.
    `,
  },
];

const CATEGORIES = [
  { id: "all", label: "All Topics", icon: Layers },
  { id: "getting-started", label: "Getting Started", icon: BookOpen },
  { id: "models", label: "Model Engines", icon: Cpu },
  { id: "billing", label: "Billing & Plans", icon: CreditCard },
  { id: "developer", label: "Developer & ", icon: Code },
  { id: "troubleshooting", label: "Troubleshooting", icon: HelpCircle },
];

export const HelpCenterPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const filteredArticles = useMemo(() => {
    return HELP_ARTICLES.filter((article) => {
      const matchesCat = activeCategory === "all" || article.category === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        article.title.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query) ||
        article.tags.some((t) => t.toLowerCase().includes(query));
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.help} />
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

      {/* Hero with Search Bar */}
      <section className="pt-28 pb-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dense opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[300px] bg-secondary/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 glass-subtle border-primary/30 text-primary py-1 px-3">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              ShadowTalk Knowledge & Documentation Hub
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              How can we <span className="gradient-text">help you?</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Explore step-by-step guides, architectural overviews, tool triggers, and troubleshooting steps for the entire workspace.
            </p>

            {/* Interactive Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search articles, tools, models, error codes, shortcuts..."
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

      {/* Category Filter Pills */}
      <section className="py-4 px-4 border-y border-border/40 bg-muted/5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none justify-start sm:justify-center flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "glass-subtle text-muted-foreground hover:text-foreground border-border/50 hover:border-border"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {activeCategory === "all" ? "All Guides & Articles" : CATEGORIES.find((c) => c.id === activeCategory)?.label}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Showing {filteredArticles.length} {filteredArticles.length === 1 ? "article" : "articles"}
            </span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 glass-subtle rounded-2xl border border-border/50 p-8 max-w-md mx-auto">
              <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">No articles found</h3>
              <p className="text-xs text-muted-foreground mb-4">
                We couldn't find matching articles for "{searchQuery}". Try searching for terms like "Groq", "Missions", "API", or "".
              </p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, idx) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                >
                  <Card
                    onClick={() => setSelectedArticle(article)}
                    className="glass-subtle border-border/50 hover:border-primary/40 cursor-pointer transition-all duration-300 h-full flex flex-col justify-between p-5 group hover:shadow-elevated"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-primary border-primary/20">
                          {article.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{article.readTime}</span>
                      </div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                        {article.summary}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {article.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-muted/40 text-muted-foreground font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-primary font-medium pt-2 border-t border-border/30">
                        <span>Read Full Guide</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Access Tiles to Support & Status */}
      <section className="py-12 px-4 bg-muted/5 border-t border-border/40">
        <div className="container mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-subtle border-border/50 p-5">
              <Activity className="h-5 w-5 text-emerald-400 mb-2" />
              <h4 className="font-bold text-sm mb-1">System Health</h4>
              <p className="text-xs text-muted-foreground mb-3">Monitor live API latency and operational uptimes.</p>
              <Button asChild variant="ghost" size="sm" className="text-xs text-primary p-0 h-auto justify-start">
                <Link to="/status">Check Status &rarr;</Link>
              </Button>
            </Card>

            <Card className="glass-subtle border-border/50 p-5">
              <FileText className="h-5 w-5 text-cyan-400 mb-2" />
              <h4 className="font-bold text-sm mb-1">Product Docs</h4>
              <p className="text-xs text-muted-foreground mb-3">Complete architectural specs and API reference.</p>
              <Button asChild variant="ghost" size="sm" className="text-xs text-primary p-0 h-auto justify-start">
                <Link to="/docs">View Specs &rarr;</Link>
              </Button>
            </Card>

            <Card className="glass-subtle border-border/50 p-5">
              <HelpCircle className="h-5 w-5 text-amber-400 mb-2" />
              <h4 className="font-bold text-sm mb-1">FAQ Center</h4>
              <p className="text-xs text-muted-foreground mb-3">Quick answers to common questions about features.</p>
              <Button asChild variant="ghost" size="sm" className="text-xs text-primary p-0 h-auto justify-start">
                <Link to="/faq">Browse FAQs &rarr;</Link>
              </Button>
            </Card>

            <Card className="glass-subtle border-border/50 p-5">
              <MessageSquare className="h-5 w-5 text-purple-400 mb-2" />
              <h4 className="font-bold text-sm mb-1">Contact Support</h4>
              <p className="text-xs text-muted-foreground mb-3">Direct assistance from our Karachi engineering team.</p>
              <Button asChild variant="ghost" size="sm" className="text-xs text-primary p-0 h-auto justify-start">
                <Link to="/contact">Send Inquiry &rarr;</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Article Reader Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden bg-popover border-border/60">
          {selectedArticle && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <DialogHeader className="p-6 pb-4 border-b border-border/40">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono text-primary border-primary/30">
                    {selectedArticle.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{selectedArticle.readTime}</span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-bold leading-snug">
                  {selectedArticle.title}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {selectedArticle.summary}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="p-6 pt-4 flex-1">
                <div className="prose prose-invert prose-sm max-w-none space-y-4 text-foreground/90 leading-relaxed font-sans">
                  {selectedArticle.content.split("\n\n").map((block, i) => {
                    const trimmed = block.trim();
                    if (trimmed.startsWith("### ")) {
                      return <h3 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{trimmed.replace("### ", "")}</h3>;
                    }
                    if (trimmed.startsWith("#### ")) {
                      return <h4 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{trimmed.replace("#### ", "")}</h4>;
                    }
                    if (trimmed.startsWith("- ")) {
                      return (
                        <ul key={i} className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-muted-foreground">
                          {trimmed.split("\n- ").map((item, j) => (
                            <li key={j}>{item.replace(/^- /, "")}</li>
                          ))}
                        </ul>
                      );
                    }
                    if (/^\d+\.\s/.test(trimmed)) {
                      return (
                        <ol key={i} className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-muted-foreground">
                          {trimmed.split(/\n\d+\.\s/).map((item, j) => (
                            <li key={j}>{item.replace(/^\d+\.\s/, "")}</li>
                          ))}
                        </ol>
                      );
                    }
                    return <p key={i} className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{trimmed}</p>;
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-border/40 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Tags:</span>
                    {selectedArticle.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] font-mono">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" className="bg-primary text-primary-foreground text-xs">
                      <Link to="/chatbot">Try In Chatbot &rarr;</Link>
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default HelpCenterPage;
