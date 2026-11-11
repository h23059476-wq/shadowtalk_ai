import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DOC_TAGLINE,
  DOC_OVERVIEW,
  DOC_PRODUCT_PILLARS,
  DOC_QUICK_START,
  DOC_ROUTES,
  DOC_WORKSPACE_GUIDE,
  DOC_FEATURES,
  DOC_TOOLS,
  DOC_MISSION_CONTROL,
  DOC_PRIVACY_SECTIONS,
  DOC_PRICING_TIERS,
  DOC_DESKTOP,
  DOC_GLOSSARY,
  DOC_FAQ,
  DOC_TROUBLESHOOTING,
  docSearchBlob,
  type DocFeatureIconKey,
} from "@/content/productDocs";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, Book, Code, Zap, MessageSquare, Image, Mic, Shield, Brain,
  Palette, Users, Download, Search, ChevronRight, ExternalLink, Sparkles,
  Settings, Lock, Bell, Globe, Keyboard, FileText, HelpCircle, Lightbulb,
  Terminal, Database, Cloud, Smartphone, Monitor, Wifi, WifiOff, Volume2,
  Upload, Share2, History, Star, Crown, Check, Compass, Eye, TrendingUp,
  Link2, Bookmark, Rocket, LayoutDashboard, KeyRound
} from "lucide-react";

const DOC_FEATURE_ICONS: Record<DocFeatureIconKey, LucideIcon> = {
  brain: Brain,
  zap: Zap,
  users: Users,
  code: Code,
  compass: Compass,
  search: Search,
  shield: Shield,
  file: FileText,
  lock: Lock,
  "wifi-off": WifiOff,
  key: KeyRound,
  message: MessageSquare,
};

const QUICK_START_ICONS = [MessageSquare, Zap, LayoutDashboard, Crown] as const;
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { FloatingOrbs } from "@/components/motion/FloatingOrbs";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { delay: i * 0.06, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const DocSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <motion.section
    className="mb-12"
    initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
  >
    <h2 className="text-2xl font-bold mb-5 tracking-tight gradient-text">{title}</h2>
    {children}
  </motion.section>
);

const DocCard = ({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: any;
  title: string;
  description: string;
  badge?: string;
}) => (
  <SpotlightCard className="h-full">
    <Card className="card-glass h-full group overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="relative z-10">
        <div className="flex items-start justify-between">
          <motion.div
            className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors"
            whileHover={{ rotate: 6, scale: 1.03 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <Icon className="h-5 w-5 text-primary" />
          </motion.div>
          {badge && (
            <Badge variant="outline" className="glass-subtle border-primary/20 text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg group-hover:text-primary transition-colors">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  </SpotlightCard>
);

const CodeExample = ({ title, code, language = "bash" }: { title: string; code: string; language?: string }) => (
  <div className="rounded-xl overflow-hidden mb-4 card-glass">
    <div className="glass-subtle px-4 py-2.5 text-sm font-medium border-b border-border/30 flex items-center justify-between">
      <span className="text-foreground/80">{title}</span>
      <Badge variant="outline" className="text-xs border-border/30 font-mono">{language}</Badge>
    </div>
    <pre className="p-4 overflow-x-auto text-sm">
      <code className="text-muted-foreground">{code}</code>
    </pre>
  </div>
);

const FeatureComparison = () => (
  <div className="space-y-3 text-sm">
    <p className="text-muted-foreground">
      ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage.
    </p>
    {[
      "Every feature included for every account — no plans, no tiers, no checkout",
      "BYOK: connect your preferred AI provider and switch any time",
      "Provider rate limits and API billing apply directly from your provider",
      "Account security, encrypted storage, and abuse protections unchanged",
    ].map((line) => (
      <div key={line} className="flex items-start gap-2">
        <Check className="h-4 w-4 mt-0.5 text-primary" />
        <span className="text-foreground/90">{line}</span>
      </div>
    ))}
  </div>
);

const DocsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const features = useMemo(() => DOC_FEATURES.filter(
    (f) => matches(f.title) || matches(f.description) || matches(f.badge ?? ""),
  ).map((f) => ({
    icon: DOC_FEATURE_ICONS[f.icon],
    title: f.title,
    description: f.description,
    badge: f.badge,
  })), [q]);

  const quickStartSteps = useMemo(() => DOC_QUICK_START.filter((s) => matches(s.title) || matches(s.description)), [q]);

  const docRoutes = useMemo(() => DOC_ROUTES.filter((r) => matches(r.path) || matches(r.label) || matches(r.desc)), [q]);

  const workspaceGuide = useMemo(() => DOC_WORKSPACE_GUIDE.filter(
    (w) => matches(w.title) || w.items.some((item) => matches(item)),
  ), [q]);

  const faqItems = useMemo(() => DOC_FAQ.filter((f) => matches(f.q) || matches(f.a)), [q]);

  const troubleshooting = useMemo(() => DOC_TROUBLESHOOTING.filter((t) => matches(t.issue) || t.solutions.some(matches)), [q]);

  const tools = useMemo(() => DOC_TOOLS.filter((t) => matches(t.name) || matches(t.trigger) || matches(t.description) || matches(t.plan ?? "")), [q]);

  const overviewSections = useMemo(() => DOC_OVERVIEW.filter((o) => matches(o.title) || o.paragraphs.some(matches)), [q]);

  const privacySections = useMemo(() => DOC_PRIVACY_SECTIONS.filter((p) => matches(p.title) || p.items.some(matches)), [q]);

  const pricingTiers = useMemo(() => DOC_PRICING_TIERS.filter((p) => matches(p.name) || matches(p.tagline) || p.highlights.some(matches)), [q]);

  const glossary = useMemo(() => DOC_GLOSSARY.filter((g) => matches(g.term) || matches(g.definition)), [q]);

  const missionSteps = useMemo(() => DOC_MISSION_CONTROL.filter((m) => matches(m.title) || matches(m.description)), [q]);

  const desktopSections = useMemo(() => DOC_DESKTOP.filter((d) => matches(d.title) || d.items.some(matches)), [q]);

  const routeGroups = useMemo(() => {
    const groups = new Map<string, typeof docRoutes>();
    for (const route of docRoutes) {
      const group = route.group ?? "Other";
      const list = groups.get(group) ?? [];
      list.push(route);
      groups.set(group, list);
    }
    return [...groups.entries()];
  }, [docRoutes]);

  const activeTab = q
    ? {
        overview: overviewSections.length > 0 || DOC_PRODUCT_PILLARS.some((p) => matches(p.title)),
        "getting-started": quickStartSteps.length > 0 || docRoutes.length > 0 || desktopSections.length > 0,
        workspace: workspaceGuide.length > 0,
        features: features.length > 0,
        missions: missionSteps.length > 0,
        tools: tools.length > 0,
        privacy: privacySections.length > 0,
        pricing: pricingTiers.length > 0,
        api: matches("api") || matches("endpoint") || matches("authentication"),
        help: troubleshooting.length > 0,
        faq: faqItems.length > 0 || glossary.length > 0,
      }
    : null;

  const hasSearchResults = useMemo(() => {
      if (!q) return true;
      if (activeTab && Object.values(activeTab).some(Boolean)) return true;
      return docSearchBlob({
        features: DOC_FEATURES,
        faq: DOC_FAQ,
        troubleshooting: DOC_TROUBLESHOOTING,
        workspace: DOC_WORKSPACE_GUIDE,
      }).includes(q);
    }, [q, activeTab]);

  const apiEndpoints = [
    {
      method: "POST",
      endpoint: "/api/v1/chat/completions",
      description: "Dispatches a chat completion prompt to the Turbo Engine with low-latency streaming response.",
      example: JSON.stringify(
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are ShadowTalk AI with Business Memory active." },
            { role: "user", content: "Synthesize our quarterly strategy roadmap." },
          ],
          stream: true,
          temperature: 0.7,
        },
        null,
        2
      ),
    },
    {
      method: "GET",
      endpoint: "/api/v1/workspace/memories",
      description: "Retrieves active business context memory items for the authenticated user or organization.",
      example: null,
    },
    {
      method: "POST",
      endpoint: "/api/v1/workspace/memories",
      description: "Creates or updates an active business memory item in your organization context.",
      example: JSON.stringify(
        {
          category: "voice",
          title: "Executive Tone Guardrails",
          content: "Be concise, authoritative, deeply technical, and avoid boilerplate filler.",
          priority: 9,
          is_active: true,
        },
        null,
        2
      ),
    },
    {
      method: "GET",
      endpoint: "/api/v1/analytics/usage",
      description: "Returns aggregated message volumes, token metrics, and response latencies.",
      example: null,
    },
    {
      method: "GET",
      endpoint: "/api/v1/shadow-twin/:username",
      description: "Fetches public metadata and knowledge parameters for a published Shadow Twin.",
      example: null,
    },
    {
      method: "POST",
      endpoint: "/api/v1/tools/search",
      description: "Executes a private web intelligence search query with scrubbed referrers.",
      example: JSON.stringify(
        {
          query: "zero trust confidential LLM execution 2026",
          limit: 5,
        },
        null,
        2
      ),
    },
  ];

  const chatModes = [
    { name: "General", icon: MessageSquare, description: "All-purpose assistant for any topic.", color: "from-primary to-primary/60" },
    { name: "Code", icon: Code, description: "Programming and debugging assistance.", color: "from-secondary to-secondary/60" },
    { name: "Creative", icon: Sparkles, description: "Writing, storytelling, and content creation.", color: "from-accent to-accent/60" },
    { name: "Translate", icon: Globe, description: "Multi-language translation support.", color: "from-primary to-secondary" },
    { name: "Summarize", icon: FileText, description: "Condense long texts into key points.", color: "from-secondary to-accent" },
    { name: "Image", icon: Image, description: "Generate images from descriptions.", color: "from-accent to-primary" },
    { name: "Debug", icon: Terminal, description: "Find and fix bugs in your code.", color: "from-primary to-primary/60" },
    { name: "Brainstorm", icon: Lightbulb, description: "Generate ideas and explore concepts.", color: "from-secondary to-secondary/60" },
    { name: "Explain", icon: HelpCircle, description: "Break down complex topics simply.", color: "from-primary to-secondary" },
    { name: "Music", icon: Volume2, description: "Get music recommendations.", color: "from-accent to-accent/60" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <FloatingOrbs className="absolute inset-0" />
        <div className="absolute inset-0 bg-grid opacity-[0.10]" />
      </div>
      
      <main className="pt-20 relative z-10">
        {/* Hero Section */}
        <section className="py-16 px-4 border-b border-border/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-[0.12]" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <Badge variant="outline" className="mb-4 glass-subtle border-primary/20">
                <Book className="h-3 w-3 mr-1" /> Documentation
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold mb-4 tracking-tight"
            >
              ShadowTalk AI <span className="gradient-text">Documentation</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              {DOC_TAGLINE}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <motion.div
                  className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-md opacity-0"
                  animate={searchQuery ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documentation (e.g., workspace, analytics, API, memory)..."
                  className="relative pl-10 rounded-xl glass-subtle border-border/30 focus:border-primary/50"
                />
              </div>
            </motion.div>
            
            {/* Quick Links */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" className="rounded-full glass-subtle border-border/30 hover:border-primary/40 text-xs" onClick={() => navigate('/chatbot')}>
                <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-primary" /> Chatbot
              </Button>
              <Button variant="outline" size="sm" className="rounded-full glass-subtle border-border/30 hover:border-primary/40 text-xs" onClick={() => navigate('/workspace')}>
                <Brain className="h-3.5 w-3.5 mr-1.5 text-secondary" /> Business Memory
              </Button>
              <Button variant="outline" size="sm" className="rounded-full glass-subtle border-border/30 hover:border-primary/40 text-xs" onClick={() => navigate('/analytics')}>
                <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> Analytics
              </Button>
              <Button variant="outline" size="sm" className="rounded-full glass-subtle border-border/30 hover:border-primary/40 text-xs" onClick={() => navigate('/shadow-memory')}>
                <Shield className="h-3.5 w-3.5 mr-1.5 text-amber-400" /> Shadow Memory
              </Button>
              <Button variant="outline" size="sm" className="rounded-full glass-subtle border-border/30 hover:border-primary/40 text-xs" onClick={() => navigate('/developers')}>
                <Code className="h-3.5 w-3.5 mr-1.5 text-violet-400" /> Developers API
              </Button>
              <Button variant="outline" size="sm" className="rounded-full glass-subtle border-border/30 hover:border-primary/40 text-xs" onClick={() => navigate('/pricing')}>
                <Crown className="h-3.5 w-3.5 mr-1.5 text-pink-400" /> Pricing
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Tabs defaultValue="overview" className="space-y-8">
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <TabsList className="inline-flex w-max min-w-full md:min-w-0 h-auto flex-wrap gap-1 glass-subtle border-border/30 p-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="getting-started">Get Started</TabsTrigger>
                <TabsTrigger value="workspace">Workspace</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
                <TabsTrigger value="help">Help</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>
            </div>

            {q && !hasSearchResults && (
              <p className="text-center text-muted-foreground py-8 glass-subtle rounded-xl">
                No results for &ldquo;{searchQuery}&rdquo;. Try &ldquo;chatbot&rdquo;, &ldquo;&rdquo;, or &ldquo;privacy&rdquo;.
              </p>
            )}

            {/* Overview */}
            <TabsContent value="overview" className="space-y-8">
              {overviewSections.map((section) => (
                <DocSection key={section.title} title={section.title}>
                  <div className="space-y-4">
                    {section.paragraphs.map((paragraph, i) => (
                      <p key={i} className="text-muted-foreground leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                </DocSection>
              ))}

              <DocSection title="Product pillars">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {DOC_PRODUCT_PILLARS.map((pillar, i) => (
                    <motion.div key={pillar.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <DocCard
                        icon={DOC_FEATURE_ICONS[pillar.icon]}
                        title={pillar.title}
                        description={pillar.description}
                        badge={pillar.badge}
                      />
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <DocSection title="Tech stack (summary)">
                <Card className="card-glass">
                  <CardContent className="pt-6 grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Frontend:</strong> React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Recharts</p>
                    <p><strong className="text-foreground">AI Intelligence:</strong> Multi-Model Turbo Engine (Groq Llama-3.3 70B, DeepSeek R1, OpenAI GPT-4o)</p>
                    <p><strong className="text-foreground">Edge & Offline:</strong> In-browser WebGPU runtime + Transformers.js zero-network execution</p>
                    
                    <p><strong className="text-foreground">Telemetry & Audit:</strong> On-device tamper-evident cryptographic ledger + downloadable JSON reports</p>
                    <p><strong className="text-foreground">Platform:</strong> Desktop PWA, mobile-responsive layout, and developer REST APIs</p>
                  </CardContent>
                </Card>
              </DocSection>
            </TabsContent>

            {/* Getting Started */}
            <TabsContent value="getting-started" className="space-y-8">
              <DocSection title="Quick Start Guide">
                <p className="text-muted-foreground mb-6">
                  Get up and running in minutes. New visitors explore <strong className="text-foreground">/</strong> (marketing home);
                  returning users and signed-in accounts go straight to <strong className="text-foreground">/chatbot</strong> — no boot screen on the workspace.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  {quickStartSteps.map((item, i) => {
                    const StepIcon = QUICK_START_ICONS[i] ?? MessageSquare;
                    return (
                    <motion.div
                      key={item.step}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
                    >
                      <SpotlightCard className="h-full">
                      <Card className="card-glass h-full group overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <StepIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <Badge variant="outline" className="mb-1 glass-subtle border-primary/20 text-xs">Step {item.step}</Badge>
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.title}</CardTitle>
                            </div>
                          </div>
                          <CardDescription className="mt-2">{item.description}</CardDescription>
                        </CardHeader>
                      </Card>
                      </SpotlightCard>
                    </motion.div>
                  );})}
                </div>
              </DocSection>

              <DocSection title="URLs & navigation">
                {routeGroups.map(([group, routes]) => (
                  <div key={group} className="mb-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {routes.map((row) => (
                        <SpotlightCard key={row.path} className="h-full">
                          <Card className="card-glass">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-mono text-primary">{row.path}</CardTitle>
                              <CardDescription className="font-medium text-foreground">{row.label}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{row.desc}</p>
                              <Button variant="link" className="px-0 mt-2 h-auto" onClick={() => navigate(row.path)}>
                                Open <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </CardContent>
                          </Card>
                        </SpotlightCard>
                      ))}
                    </div>
                  </div>
                ))}
              </DocSection>

              <DocSection title="System Requirements">
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    { icon: Monitor, title: "Desktop", items: ["Chrome 80+, Firefox 75+, Safari 14+, Edge 80+", "4GB RAM minimum, 8GB recommended", "Stable internet connection (5+ Mbps)", "JavaScript enabled"] },
                    { icon: Smartphone, title: "Mobile", items: ["iOS 14+ (Safari), Android 8+ (Chrome)", "PWA installation supported", "4G/5G or WiFi connection", "Microphone for voice features"] },
                  ].map((platform, idx) => (
                    <motion.div key={idx} custom={idx} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                      <Card className="card-glass h-full overflow-hidden">
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                              <platform.icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle>{platform.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <ul className="space-y-2">
                            {platform.items.map((item, j) => (
                              <li key={j} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <DocSection title="Install & platforms">
                <p className="text-muted-foreground mb-6">
                  ShadowTalk ships as a web app (PWA), native desktop builds, and mobile-friendly layouts.
                </p>
                <div className="grid gap-5 md:grid-cols-3">
                  {desktopSections.map((section, idx) => (
                    <motion.div key={section.title} custom={idx} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                        <Card className="card-glass h-full overflow-hidden">
                          <CardHeader className="relative z-10">
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="relative z-10">
                            <ul className="space-y-2 text-sm">
                              {section.items.map((item, j) => (
                                <li key={j} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => navigate("/chatbot")}>
                    <Rocket className="h-4 w-4 mr-2" /> Launch Web App
                  </Button>
                </div>
              </DocSection>

              <DocSection title="How to Get Your API Key (BYOK Setup)">
                <p className="text-muted-foreground mb-4">
                  ShadowTalk's Power User (BYOK) mode lets you bring your own API key for unlimited
                  messages and direct provider access. Here's how to get a free key in 60 seconds.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  {/* OpenRouter Guide */}
                  <Card className="card-glass overflow-hidden">
                    <CardHeader className="relative z-10 pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="text-lg">🔑</span> OpenRouter (Recommended)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-3 text-sm text-muted-foreground">
                      <p>OpenRouter gives you access to GPT-4, Claude, Gemini, and 100+ models with one key. Free tier available.</p>
                      <ol className="space-y-2 text-xs">
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">1.</span> Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">openrouter.ai/keys</a></li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">2.</span> Sign up with Google or GitHub (free, no credit card)</li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">3.</span> Click <strong className="text-foreground">"Create Key"</strong></li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">4.</span> Name it "ShadowTalk" and copy the key (<code className="text-[10px] bg-muted/30 px-1 rounded">sk-or-v1-...</code>)</li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">5.</span> Paste it into ShadowTalk's onboarding or Settings → BYOK</li>
                      </ol>
                      <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300">
                        ✅ Free models available (Gemini, Llama) — no payment required for basic use.
                      </div>
                    </CardContent>
                  </Card>

                  {/* Google Gemini Guide */}
                  <Card className="card-glass overflow-hidden">
                    <CardHeader className="relative z-10 pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="text-lg">✨</span> Google Gemini API
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-3 text-sm text-muted-foreground">
                      <p>Google AI Studio offers free Gemini API access (generous free tier, no credit card needed).</p>
                      <ol className="space-y-2 text-xs">
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">1.</span> Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">aistudio.google.com/apikey</a></li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">2.</span> Sign in with your Google account</li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">3.</span> Click <strong className="text-foreground">"Create API Key"</strong></li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">4.</span> Select a project (or create a new one — free)</li>
                        <li className="flex gap-2"><span className="font-bold text-indigo-400">5.</span> Copy the key (<code className="text-[10px] bg-muted/30 px-1 rounded">AIza...</code>) and paste into ShadowTalk</li>
                      </ol>
                      <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300">
                        ✅ Free tier: 15 requests/min, 1,500/day — perfect for personal use.
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-sm text-slate-300">
                  <p className="font-semibold text-indigo-300 mb-1">💡 Which should I choose?</p>
                  <p className="text-xs text-muted-foreground">OpenRouter is recommended — it gives you access to all major models (GPT-4, Claude, Gemini, Llama) with a single key and has a free tier. Gemini is great if you only need Google models and want the highest free-tier limits.</p>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Your API key is stored <strong className="text-foreground">locally in your browser only</strong> — it never touches ShadowTalk's servers. See our <a href="/security" className="text-indigo-400 hover:underline">Security & Trust Center</a> for details.
                </p>
              </DocSection>
            </TabsContent>

            {/* Workspace */}
            <TabsContent value="workspace" className="space-y-8">
              <DocSection title="Enterprise Workspace & Business Intelligence">
                <p className="text-muted-foreground mb-6">
                  ShadowTalk provides a complete four-part workspace ecosystem: AI Chatbot, persistent Business Memory, production Analytics, and zero-cloud on-device Shadow Memory.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  {workspaceGuide.map((section, idx) => (
                    <motion.div key={section.title} custom={idx} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                      <Card className="card-glass h-full overflow-hidden">
                        <CardHeader className="relative z-10">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <LayoutDashboard className="h-5 w-5 text-primary" />
                            {section.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <ul className="space-y-2 text-sm">
                            {section.items.map((item, j) => (
                              <li key={j} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <DocSection title="Composer controls">
                <SpotlightCard>
                <Card className="card-glass">
                  <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">+ Attach</strong> — Attach documents, code snippets, or images prior to dispatch.</p>
                    <p><strong className="text-foreground">Provider chip</strong> — Displays active Turbo Engine routing (Groq, DeepSeek, or OpenAI).</p>
                    <p><strong className="text-foreground">Mic</strong> — Instant voice input transcription powered by Whisper.</p>
                    <p><strong className="text-foreground">Send</strong> — Gradient action button; press Enter to send, Shift+Enter for newline.</p>
                    <p className="text-xs pt-2 text-muted-foreground/70">Hardware speed routing dynamically balances latency and reasoning depth.</p>
                  </CardContent>
                </Card>
                </SpotlightCard>
              </DocSection>

              <div className="flex flex-wrap gap-3">
                <Button className="btn-glow rounded-xl" onClick={() => navigate("/chatbot")}>
                  <MessageSquare className="h-4 w-4 mr-2" /> Open Chatbot
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/workspace")}>
                  <Brain className="h-4 w-4 mr-2" /> Business Memory
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/analytics")}>
                  <TrendingUp className="h-4 w-4 mr-2" /> Analytics Dashboard
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/shadow-memory")}>
                  <Shield className="h-4 w-4 mr-2" /> Shadow Memory Journal
                </Button>
              </div>
            </TabsContent>

            {/* Features */}
            <TabsContent value="features" className="space-y-8">
              <DocSection title="Core Features">
                <p className="text-muted-foreground mb-6">Agentic workspace capabilities — chat, code, missions, security, and security.</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {features.map((feature, i) => (
                    <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                      whileHover={{ y: -6, transition: { type: "spring", stiffness: 400 } }}
                    >
                      <DocCard {...feature} />
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <DocSection title="AI Personalities">
                <p className="text-muted-foreground mb-6">Choose from four distinct AI personalities.</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { title: "Friendly", description: "Warm, approachable, and conversational.", badge: "Default" },
                    { title: "Professional", description: "Formal, precise, and business-oriented.", badge: "Work" },
                    { title: "Creative", description: "Imaginative, playful, and expressive.", badge: "Writing" },
                    { title: "Sarcastic", description: "Witty, humorous, and playfully sarcastic.", badge: "Spicy" },
                  ].map((p, i) => (
                    <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                      whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
                    >
                      <SpotlightCard className="h-full">
                      <Card className="card-glass h-full group overflow-hidden">
                        <CardHeader className="relative z-10">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">{p.title}</CardTitle>
                            <Badge variant="outline" className="glass-subtle border-primary/20 text-[10px]">{p.badge}</Badge>
                          </div>
                          <CardDescription>{p.description}</CardDescription>
                        </CardHeader>
                      </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <DocSection title="Keyboard Shortcuts">
                <Card className="card-glass overflow-hidden">
                  <CardContent className="pt-6 relative z-10">
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {[
                        { action: "Send message", shortcut: "Enter" },
                        { action: "New line", shortcut: "Shift + Enter" },
                        { action: "Voice input", shortcut: "Ctrl + M" },
                        { action: "Toggle sidebar", shortcut: "Ctrl + B" },
                        { action: "New conversation", shortcut: "Ctrl + N" },
                        { action: "Search messages", shortcut: "Ctrl + F" },
                        { action: "Open ShadowBrowser", shortcut: "Ctrl + Shift + B" },
                        { action: "Shadow Cowork", shortcut: "Shift + W" },
                        { action: "ShadowTalk Live", shortcut: "Shift + L" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl glass-subtle">
                          <span className="text-sm text-foreground/80">{item.action}</span>
                          <Badge variant="outline" className="font-mono text-xs border-border/30">{item.shortcut}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </DocSection>

              <DocSection title="ShadowBrowser">
                <p className="text-muted-foreground mb-6">Built-in AI-powered web browser with real-time assistance.</p>
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    { icon: Compass, title: "Browser Features", items: ["Multi-tab browsing with smart tab management", "Bookmarks and browsing history", "AI-powered web search", "One-click page analysis", "Send content to main chat"] },
                    { icon: Eye, title: "Browse Together Mode", items: ["AI automatically analyzes pages you visit", "Get key insights and summaries", "Ask questions about any webpage", "Related content suggestions", "Quick actions: Summarize, Key Points, Find Similar"] },
                  ].map((section, idx) => (
                    <motion.div key={idx} custom={idx} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                      <Card className="card-glass h-full overflow-hidden">
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                              <section.icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle>{section.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <ul className="space-y-2 text-sm">
                            {section.items.map((item, j) => (
                              <li key={j} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <DocSection title="Proactive AI Intelligence">
                <p className="text-muted-foreground mb-6">Real AI-powered behavioral intelligence — no mock or hardcoded responses.</p>
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    { icon: Brain, title: "How It Works", items: ["29+ behavioral triggers monitor your activity in real-time", "Contextual data (page, mood, scroll depth, visit count) sent to AI", "Gemini Flash Lite generates personalized, relevant suggestions", "Smart 2-minute cache prevents redundant AI calls"] },
                    { icon: TrendingUp, title: "Trigger Examples", items: ["Idle detection — AI suggests actions when you pause", "Deep scroll — contextual tips as you explore content", "Cognitive load estimation — simplifies when overwhelmed", "Return visitor — personalized welcome based on history"] },
                  ].map((section, idx) => (
                    <motion.div key={idx} custom={idx} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                      <Card className="card-glass h-full overflow-hidden">
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                              <section.icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle>{section.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <ul className="space-y-2 text-sm">
                            {section.items.map((item, j) => (
                              <li key={j} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>
            </TabsContent>

            {/* Tools & modes */}
            <TabsContent value="tools" className="space-y-8">
              <DocSection title="Chat tools reference">
                <p className="text-muted-foreground mb-6">
                  Invoke tools from natural language, the Tools menu (⊞), or ⌘K command palette.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left p-3">Tool</th>
                        <th className="text-left p-3">How to trigger</th>
                        <th className="text-left p-3 hidden md:table-cell">Description</th>
                        <th className="text-left p-3">Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.map((tool) => (
                        <tr key={tool.name} className="border-b border-border/20 hover:bg-primary/5">
                          <td className="p-3 font-medium">{tool.name}</td>
                          <td className="p-3 font-mono text-xs text-primary">{tool.trigger}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{tool.description}</td>
                          <td className="p-3 text-muted-foreground">{tool.plan ?? "Core"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DocSection>

              <DocSection title="Specialized chat modes">
                <p className="text-muted-foreground mb-6">10 specialized modes, each optimized for specific tasks.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {chatModes.map((mode, i) => (
                    <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                      whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
                    >
                      <Card className="card-glass overflow-hidden group">
                        <div className={`h-1 bg-gradient-to-r ${mode.color}`} />
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center`}>
                              <mode.icon className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">{mode.name}</CardTitle>
                          </div>
                          <CardDescription className="mt-2">{mode.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <DocSection title="Mode best practices">
                <Accordion type="single" collapsible className="space-y-3">
                  {[
                    { value: "code", title: "Code Mode Tips", tips: ["Specify the programming language for better results", "Include context about your project structure", "Use the Code Canvas for interactive editing", "Ask for explanations along with code solutions", "Request unit tests for generated code"] },
                    { value: "image", title: "Image Generation Tips", tips: ["Be specific about style (photorealistic, cartoon, watercolor, etc.)", "Include details about lighting and mood", "Mention aspect ratio if important", "Use negative prompts to exclude unwanted elements"] },
                    { value: "translate", title: "Translation Tips", tips: ["Specify source and target languages", "Provide context for better accuracy", "Ask for formal or informal translations", "Request pronunciation guides when needed", "Supports 100+ languages"] },
                    { value: "summarize", title: "Summarization Tips", tips: ["Specify desired length (bullet points, paragraph, one-liner)", "Ask for key takeaways or action items", "Upload documents for longer content", "Request summaries for specific audiences", "Great for meeting notes and articles"] },
                  ].map((section) => (
                    <AccordionItem key={section.value} value={section.value} className="card-glass px-5 border-border/30">
                      <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors">{section.title}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 text-sm">
                          {section.tips.map((tip, j) => (
                            <li key={j} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-muted-foreground">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </DocSection>
            </TabsContent>

            {/* Privacy */}
            <TabsContent value="privacy" className="space-y-8">
              <DocSection title="Privacy & security">
                <p className="text-muted-foreground mb-6">
                  ShadowTalk is privacy-native: choose cloud routing, client-side vault, or on-device inference per task.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  {privacySections.map((section, idx) => (
                    <motion.div key={section.title} custom={idx} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                        <Card className="card-glass h-full">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Shield className="h-5 w-5 text-primary" />
                              {section.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm">
                              {section.items.map((item, j) => (
                                <li key={j} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/private-ai")}>Private AI Hub</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/shadow-memory")}>Shadow Memory Journal</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/about")}>Ethics & Privacy</Button>
              </div>
            </TabsContent>

            {/* Pricing */}
            <TabsContent value="pricing" className="space-y-8">
              <DocSection title="Plans & limits">
                <p className="text-muted-foreground mb-6">
                  ShadowTalk AI is free to use — every feature included, no subscription, no credit card. Bring your own AI provider API key; your provider may charge separately for API usage.
                  The former <button type="button" className="text-primary underline" onClick={() => navigate("/founder-access")}>/founder-access</button> checkout page now explains free access.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  {pricingTiers.map((tier, i) => (
                    <motion.div key={tier.name} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                        <Card className="card-glass h-full">
                          <CardHeader>
                            <div className="flex items-baseline justify-between gap-2">
                              <CardTitle>{tier.name}</CardTitle>
                              <span className="text-2xl font-bold text-primary">{tier.price}</span>
                            </div>
                            <CardDescription>{tier.tagline}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm">
                              {tier.highlights.map((h, j) => (
                                <li key={j} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">{h}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>
              <DocSection title="Feature comparison table">
                <Card className="card-glass overflow-hidden">
                  <CardContent className="pt-6">
                    <FeatureComparison />
                  </CardContent>
                </Card>
                <div className="mt-4">
                  <Button className="btn-glow rounded-xl" onClick={() => navigate("/pricing")}>
                    <Crown className="h-4 w-4 mr-2" /> View free access details
                  </Button>
                </div>
              </DocSection>
            </TabsContent>

            {/* API Reference */}
            <TabsContent value="api" className="space-y-8">
              <DocSection title="API Reference">
                <div className="flex items-center gap-2 mb-6">
                  <Badge className="bg-secondary/10 text-secondary border-secondary/20">Free — BYOK required</Badge>
                </div>
                <p className="text-muted-foreground mb-6">
                  Access ShadowTalk AI programmatically through our REST API.
                </p>
                
                <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <Card className="card-glass mb-6 overflow-hidden">
                    <CardHeader className="relative z-10">
                      <CardTitle>Authentication</CardTitle>
                      <CardDescription>All API requests require a Bearer token</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <CodeExample title="Request Headers" language="http" code={`Authorization: Bearer YOUR_API_KEY\nContent-Type: application/json`} />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <Card className="card-glass mb-6 overflow-hidden">
                    <CardHeader className="relative z-10"><CardTitle>Base URL</CardTitle></CardHeader>
                    <CardContent className="relative z-10">
                      <code className="px-4 py-2.5 rounded-xl glass-subtle text-primary text-sm font-mono inline-block">https://{'{project-id}'}.backend.co</code>
                      <p className="text-xs text-muted-foreground mt-2">Contact support for API key provisioning (Elite plan)</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <div className="space-y-4">
                  {apiEndpoints.map((endpoint, i) => (
                    <motion.div key={i} custom={i + 2} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <Card className="card-glass overflow-hidden">
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-3">
                            <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'} className="font-mono">{endpoint.method}</Badge>
                            <code className="text-sm font-mono text-primary">{endpoint.endpoint}</code>
                          </div>
                          <CardDescription>{endpoint.description}</CardDescription>
                        </CardHeader>
                        {endpoint.example && (
                          <CardContent className="relative z-10">
                            <CodeExample title="Request Body" language="json" code={endpoint.example} />
                          </CardContent>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </DocSection>
            </TabsContent>

            {/* Help */}
            <TabsContent value="help" className="space-y-8">
              <DocSection title="Troubleshooting Guide">
                <p className="text-muted-foreground mb-6">Having issues? Find solutions to common problems below.</p>
                <Accordion type="single" collapsible className="space-y-3">
                  {troubleshooting.map((item, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="card-glass px-5 border-border/30">
                      <AccordionTrigger className="text-left hover:no-underline hover:text-primary transition-colors">{item.issue}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {item.solutions.map((solution, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{solution}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </DocSection>

              <DocSection title="Network Requirements">
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    { icon: Wifi, title: "Online Mode", color: "text-primary", items: ["Minimum 5 Mbps connection", "WebSocket support required", "Ports 443 (HTTPS) must be open", "Low latency recommended for voice"] },
                    { icon: WifiOff, title: "Mode (Elite)", color: "text-secondary", items: ["Full login with cached credentials", "In-browser AI (WebLLM) for responses", "Cached conversations available", "Auto-sync when back online", "PWA installation required"] },
                  ].map((section, idx) => (
                    <motion.div key={idx} custom={idx} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                      <SpotlightCard className="h-full">
                      <Card className="card-glass h-full overflow-hidden">
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                              <section.icon className={`h-5 w-5 ${section.color}`} />
                            </div>
                            <CardTitle>{section.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <ul className="space-y-2 text-sm">
                            {section.items.map((item, j) => (
                              <li key={j} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              </DocSection>

              <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }}>
                <SpotlightCard>
                <div className="glass-subtle rounded-2xl p-10 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 w-fit mx-auto mb-4">
                    <HelpCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 tracking-tight">Still Need Help?</h3>
                  <p className="text-muted-foreground mb-6">Our support team is available to assist you</p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <Button variant="outline" className="rounded-xl glass-subtle border-border/30 hover:border-primary/40" onClick={() => navigate('/chatbot')}>
                      <MessageSquare className="h-4 w-4 mr-2" /> Open workspace
                    </Button>
                    <Button variant="outline" className="rounded-xl glass-subtle border-border/30 hover:border-primary/40" onClick={() => navigate('/about')}>
                      <Users className="h-4 w-4 mr-2" /> About & Contact
                    </Button>
                  </div>
                </div>
                </SpotlightCard>
              </motion.div>
            </TabsContent>

            {/* FAQ */}
            <TabsContent value="faq" className="space-y-8">
              <DocSection title="Frequently Asked Questions">
                <Accordion type="single" collapsible className="space-y-3">
                  {faqItems.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="card-glass px-5 border-border/30">
                      <AccordionTrigger className="text-left hover:no-underline hover:text-primary transition-colors font-medium">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </DocSection>

              <DocSection title="Glossary">
                <div className="grid gap-3 md:grid-cols-2">
                  {glossary.map((item) => (
                    <Card key={item.term} className="card-glass">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{item.term}</CardTitle>
                        <CardDescription>{item.definition}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </DocSection>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DocsPage;
