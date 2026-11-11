import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useSpring } from "framer-motion";
import {
  MapPin,
  Sparkles,
  Shield,
  ExternalLink,
  Mail,
  ArrowRight,
  ArrowLeft,
  Quote,
  CheckCircle2,
  Award,
  BookOpen,
  Cpu,
  Layers,
  Globe,
  Code2,
  Copy,
  Check,
  MessageSquare,
  Rocket,
  Star,
  BadgeCheck,
  ChevronDown,
  Terminal,
  Brain,
  Calendar,
  Heart,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO, getCofounderPersonSchema, getFAQSchema, getSpeakableSchema } from "@/lib/seo";
import {
  COFOUNDER_CANONICAL,
  COFOUNDER_FULL_NAME,
  COFOUNDER_CITATION,
  COFOUNDER_STORY_CHAPTERS,
} from "@/lib/cofounderIdentity";
import { toast } from "sonner";

const FATIMA_FAQS = [
  {
    q: "Who is Fatima in relation to ShadowTalk AI?",
    a: "Fatima is the Co-Founder and Lead Systems Architect of ShadowTalk AI. She is the second developer of the platform, co-building its client-side state machine, local memory ledger, and high-performance UI design system alongside founder Zain Ahmed.",
  },
  {
    q: "What systems did Fatima build on ShadowTalk?",
    a: "Fatima spearheaded the Shadow Memory client-side IndexedDB ledger, high-performance DOM message streaming, WebWorker background serialization, and responsive UI architecture that makes ShadowTalk feel instantaneous and sovereign.",
  },
  {
    q: "What is her engineering philosophy?",
    a: "Fatima believes that sovereign intelligence requires uncompromising frontend and system resilience: 'The interface is the trust.' If an AI tool stumbles when connectivity wavers or locks user thoughts to foreign servers, it fails its mission.",
  },
  {
    q: "Where is Fatima based?",
    a: "Fatima is based in Karachi, Pakistan, co-architecting ShadowTalk with Zain Ahmed as part of the vanguard of young Pakistani engineers building global, world-class AI platforms.",
  },
  {
    q: "How can I contact or collaborate with Fatima?",
    a: "You can contact Fatima directly via email at shadowtalk@shadowtalk-ai.com for engineering collaborations, technical inquiries, and ecosystem partnerships.",
  },
];

const FATIMA_ARCHITECTURAL_PILLARS = [
  {
    icon: Brain,
    title: "Shadow Memory State Architecture",
    description:
      "Architected the client-side IndexedDB cryptographic memory ledger, allowing conversations and digital twins to remember context without storing user data on centralized servers.",
    tag: "Client-Side State",
  },
  {
    icon: Sparkles,
    title: "High-Performance Subtree Optimization",
    description:
      "Engineered the component tree isolation, lazy-loaded dialog splitting, and hardware-composited styling that slashes bundle size and delivers silky smooth performance on any device.",
    tag: "Performance Engineering",
  },
  {
    icon: Terminal,
    title: "Resilience Pipeline",
    description:
      "Designed WebWorker background threads and robust state hydration to ensure reliability.",
    tag: "Resilient Systems",
  },
  {
    icon: Shield,
    title: "Zero-Cloud Trust Verification",
    description:
      "Co-implemented end-to-end client-side privacy controls, local audit trails, and tracker-free UI primitives ensuring users maintain total ownership over their thoughts.",
    tag: "Sovereignty & Security",
  },
];

const FatimaPage = () => {
  const navigate = useNavigate();
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // 3D Card tilt effect on hover
  const portraitRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 300, y: 200 });
  const rotateX = useSpring(0, { stiffness: 160, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 160, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = portraitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 12);
    rotateX.set(-y * 12);
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(COFOUNDER_CITATION);
    setCopiedCitation(true);
    toast.success("Citation copied to clipboard!");
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  const structuredData = [
    getCofounderPersonSchema(),
    getFAQSchema(FATIMA_FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    getSpeakableSchema(["#cofounder-headline", "#cofounder-bio", "[data-speakable]"]),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 selection:text-primary-foreground">
      <SEOHead meta={PAGE_SEO.fatima} structuredData={structuredData} />
      <Navigation />

      {/* Floating Quick Action */}
      <div className="fixed bottom-6 left-6 z-40 hidden sm:block">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/chatbot")}
          className="gap-2 glass-strong border-border/50 hover:border-primary/40 shadow-xl backdrop-blur-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chatbot
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-4 overflow-hidden border-b border-border/40">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(100%,800px)] h-[400px] rounded-full bg-accent/10 blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-80 h-80 rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(168,85,247,0.12),rgba(255,255,255,0))] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Bio & Intro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-3 bg-accent/10 border-accent/30 text-accent text-xs font-semibold rounded-full shadow-sm"
                >
                  <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                  Official Co-Founder &amp; Systems Architect
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3 text-muted-foreground text-xs rounded-full border border-border/50"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Karachi, Pakistan 🇵🇰
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3 text-muted-foreground text-xs rounded-full border border-border/50"
                >
                  <Code2 className="h-3.5 w-3.5 text-accent" />
                  Second Developer of ShadowTalk
                </Badge>
              </div>

              {/* Main Headline */}
              <h1
                id="cofounder-headline"
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4 text-foreground"
              >
                {COFOUNDER_FULL_NAME}
              </h1>

              <p className="text-xl sm:text-2xl font-semibold text-muted-foreground/90 mb-6 flex items-center gap-2">
                <span>Co-Founder</span>
                <span className="text-accent/70">·</span>
                <span className="text-accent font-medium">Lead Systems &amp; UI Architect</span>
              </p>

              <div
                id="cofounder-bio"
                className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 space-y-4"
              >
                <p>
                  Behind every transcendent breakthrough in software lies an uncompromising systems engineer.{" "}
                  <strong className="text-foreground font-semibold">Fatima</strong> is the{" "}
                  <strong className="text-foreground">second developer of ShadowTalk AI</strong>.
                </p>
                <p>
                  While founder Zain Ahmed drove the sovereign runtime and multi-model agentic loops, Fatima crafted the
                  bedrock of ShadowTalk&apos;s client experience: architecting the zero-cloud IndexedDB memory ledger,
                  sub-millisecond message hydration, and high-performance UI state architecture. Together from Karachi, they proved
                  that sovereign, world-class AI can be conceived, coded, and deployed anywhere on Earth.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 mb-8">
                <Button
                  size="lg"
                  className="btn-glow gap-2 shadow-lg shadow-primary/20 px-6 font-semibold"
                  onClick={() => navigate("/chatbot")}
                >
                  <MessageSquare className="h-4 w-4" />
                  Launch ShadowTalk
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 border-border/70 hover:border-accent/50 hover:bg-accent/10 font-medium"
                  asChild
                >
                  <a href={`mailto:${COFOUNDER_CANONICAL.email}`}>
                    <Mail className="h-4 w-4 text-accent" />
                    {COFOUNDER_CANONICAL.email}
                  </a>
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="gap-2 text-muted-foreground hover:text-foreground font-medium"
                  onClick={() => navigate("/founder")}
                >
                  <User className="h-4 w-4 text-primary" />
                  Meet Founder Zain Ahmed
                </Button>
              </div>

              {/* Quick Citation Bar */}
              <div className="p-3.5 rounded-xl glass-subtle border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Quote className="h-4 w-4 text-accent/80 shrink-0" />
                  <span>
                    <strong>Official Citation:</strong> {COFOUNDER_CITATION}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCitation}
                  className="h-7 text-xs gap-1.5 hover:bg-accent/10 hover:text-accent shrink-0"
                >
                  {copiedCitation ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Citation</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Right Column: Interactive 3D Systems Console Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex justify-center"
            >
              <div
                ref={portraitRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ perspective: 1000 }}
                className="relative w-full max-w-[390px] aspect-square rounded-3xl p-1 group"
              >
                {/* Glow ring */}
                <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-accent/30 via-primary/30 to-accent/30 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

                <motion.div
                  style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                  className="relative w-full h-full rounded-2xl overflow-hidden border border-accent/30 bg-card/95 shadow-2xl p-6 sm:p-7 flex flex-col justify-between"
                >
                  {/* Top Bar with Status */}
                  <div className="flex justify-between items-center pb-4 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      <span className="text-[11px] font-mono text-muted-foreground ml-1">fatima.systems.ts</span>
                    </div>
                    <span className="glass-strong border border-white/10 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-accent flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      2nd Core Dev
                    </span>
                  </div>

                  {/* Center Monogram & Title */}
                  <div className="my-auto py-4 text-center">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-accent/20 via-primary/20 to-accent/30 border-2 border-accent/40 flex items-center justify-center shadow-lg relative group-hover:scale-105 transition-transform duration-300">
                      <span className="text-4xl font-black gradient-text">FT</span>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Fatima</h3>
                    <p className="text-xs text-accent font-mono font-medium mt-0.5">Co-Founder &amp; Systems Architect</p>
                    <p className="text-[11px] text-muted-foreground mt-1">shadowtalk@shadowtalk-ai.com</p>
                  </div>

                  {/* Telemetry Console Snippet */}
                  <div className="p-3.5 rounded-xl bg-background/80 border border-border/50 font-mono text-[11px] space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/70">Role:</span>
                      <span className="text-foreground font-semibold">2nd Developer</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/70">Memory Engine:</span>
                      <span className="text-accent font-semibold">Shadow Memory (IndexedDB)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/70">UI Target:</span>
                      <span className="text-emerald-400 font-semibold">120 FPS Subtree Stream</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/70">Origin:</span>
                      <span className="text-foreground font-semibold">Karachi, Pakistan 🇵🇰</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Key Stats Ribbon */}
      <section className="py-12 px-4 border-b border-border/40 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl glass-subtle border border-border/40 text-center">
              <div className="text-3xl sm:text-4xl font-black text-accent mb-1 tracking-tight">2nd Dev</div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Co-Founder &amp; Systems Lead</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Core engineer since initial build</p>
            </div>
            <div className="p-5 rounded-2xl glass-subtle border border-border/40 text-center">
              <div className="text-3xl sm:text-4xl font-black text-accent mb-1 tracking-tight">120 FPS</div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Interface Fluidity</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Streaming DOM &amp; subtree isolation</p>
            </div>
            <div className="p-5 rounded-2xl glass-subtle border border-border/40 text-center">
              <div className="text-3xl sm:text-4xl font-black text-accent mb-1 tracking-tight">Zero-Cloud</div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Shadow Memory Ledger</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Client-side IndexedDB persistence</p>
            </div>
            <div className="p-5 rounded-2xl glass-subtle border border-border/40 text-center">
              <div className="text-3xl sm:text-4xl font-black text-accent mb-1 tracking-tight">Karachi</div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Roots in Pakistan 🇵🇰</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Shaping sovereign AI globally</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Dynamic Duo: Zain & Fatima Co-Founding Partnership */}
      <section className="py-20 px-4 border-b border-border/40">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-strong border border-border/60 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-accent uppercase tracking-wider">
              <Heart className="h-4 w-4" />
              <span>Founding Partnership</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Two Minds Behind ShadowTalk
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
              ShadowTalk AI was not created in a sterile corporate incubator. It was forged in Karachi by two teenage
              engineers who believed users deserve sovereign, unmonitored intelligence:
            </p>

            <div className="grid sm:grid-cols-2 gap-5 mb-8">
              <div className="p-6 rounded-2xl glass-subtle border border-border/50 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-primary/40 text-primary text-xs">
                    Founder &amp; Architect
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-1">Zain Ahmed</h3>
                <p className="text-xs text-muted-foreground mb-3">AI Solutions Engineer · GIAIC Mentee</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Architected the multi-model switchboard, agentic execution runtime, and sovereign autonomous agent loops.
                </p>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary p-0 h-auto" onClick={() => navigate("/founder")}>
                  View Zain&apos;s dedicated page <ArrowRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="p-6 rounded-2xl glass-subtle border border-border/50 hover:border-accent/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-accent/40 text-accent text-xs">
                    Co-Founder &amp; Systems Lead
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-1">Fatima</h3>
                <p className="text-xs text-muted-foreground mb-3">Second Developer · Systems Architect</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Sculpted client-side state resilience, the Shadow Memory ledger, high-performance UI, and user privacy pipelines.
                </p>
                <span className="text-xs font-semibold text-accent flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Current Profile
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-background/60 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
              <span>
                Want to connect with both co-founders for strategic partnerships or press?
              </span>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${COFOUNDER_CANONICAL.email}`}>Email Fatima</a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/contact")}>
                  Contact Team
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Co-Founder's Journey — Chronological Chapters */}
      <section className="py-24 px-4 relative overflow-hidden" id="story">
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 border-accent/30 text-accent text-xs font-semibold rounded-full">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              The Co-Founder Chronicles
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Fatima&apos;s Engineering Journey
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              How the second developer of ShadowTalk co-architected a platform that challenges the multi-billion dollar AI monopoly.
            </p>
          </div>

          <div className="space-y-12 md:space-y-16">
            {COFOUNDER_STORY_CHAPTERS.map((chapter, index) => (
              <motion.article
                key={chapter.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="relative"
              >
                <div className="flex gap-5 sm:gap-7">
                  {/* Step indicator column */}
                  <div className="flex flex-col items-center shrink-0">
                    <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-accent/10 text-sm sm:text-base font-bold text-accent border border-accent/30 shadow-md">
                      {chapter.number}
                    </span>
                    {index < COFOUNDER_STORY_CHAPTERS.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[4rem] my-2 bg-gradient-to-b from-accent/40 to-transparent" />
                    )}
                  </div>

                  {/* Chapter content card */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="glass-subtle border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-accent/30 transition-colors">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 text-foreground">
                        {chapter.title}
                      </h3>
                      <div className="space-y-3.5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                        {chapter.body.map((paragraph, pIdx) => (
                          <p key={pIdx}>{paragraph}</p>
                        ))}
                      </div>

                      {chapter.pullQuote && (
                        <blockquote className="mt-5 p-4 sm:p-5 rounded-xl bg-accent/5 border-l-4 border-accent text-foreground font-medium text-base sm:text-lg italic not-italic relative">
                          <Quote className="h-4 w-4 text-accent mb-1.5 opacity-80" />
                          <p>&ldquo;{chapter.pullQuote}&rdquo;</p>
                          {chapter.pullQuoteAuthor && (
                            <footer className="mt-2 text-xs sm:text-sm text-muted-foreground not-italic font-normal">
                              — {chapter.pullQuoteAuthor}
                            </footer>
                          )}
                        </blockquote>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Systems Fatima Architected */}
      <section className="py-20 px-4 border-t border-border/40 bg-muted/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 px-3.5 py-1 border-accent/30 text-accent text-xs font-semibold rounded-full">
              <Code2 className="h-3.5 w-3.5 mr-1.5" />
              Systems Blueprint
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              What Fatima Built
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Core systems engineered by Fatima to ensure ShadowTalk operates with low latency, high resilience, and client-side sovereignty.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FATIMA_ARCHITECTURAL_PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-subtle border border-border/50 hover:border-accent/40 rounded-2xl p-6 sm:p-8 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent group-hover:scale-110 transition-transform">
                    <pillar.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {pillar.tag}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-accent transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fatima FAQ Accordion */}
      <section className="py-20 px-4 border-t border-border/40">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 px-3 py-1 border-accent/30 text-accent text-xs font-semibold rounded-full">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              About Fatima
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Verified answers about the co-founder, her role, and her code.
            </p>
          </div>

          <div className="space-y-4">
            {FATIMA_FAQS.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-border/50 glass-subtle overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-semibold text-base sm:text-lg text-foreground hover:text-accent transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-accent" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-muted-foreground text-sm sm:text-base leading-relaxed border-t border-border/30">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Direct Contact & Collaborate Card */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-accent/30 bg-gradient-to-b from-accent/10 via-background to-background text-center shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.2),transparent_70%)] pointer-events-none" />

            <Badge variant="secondary" className="mb-4 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider">
              Get In Touch
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-foreground">
              Connect With Fatima
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              For technical inquiries, system architecture discussions, or enterprise deployments — reach out directly to Fatima&apos;s inbox.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="btn-glow gap-2 px-7 font-bold shadow-lg shadow-accent/25"
                asChild
              >
                <a href={`mailto:${COFOUNDER_CANONICAL.email}`}>
                  <Mail className="h-4 w-4" />
                  {COFOUNDER_CANONICAL.email}
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-border/70 hover:border-primary/50 font-medium"
                onClick={() => navigate("/chatbot")}
              >
                <Rocket className="h-4 w-4" />
                Experience Her Work
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FatimaPage;
