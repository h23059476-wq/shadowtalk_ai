import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useSpring } from "framer-motion";
import {
  MapPin,
  ExternalLink,
  Mail,
  ArrowRight,
  ArrowLeft,
  Quote,
  CheckCircle2,
  Award,
  BookOpen,
  Copy,
  Check,
  MessageSquare,
  Rocket,
  Linkedin,
  Instagram,
  Star,
  Terminal,
  Calendar,
  ChevronDown,
  Wrench,
  Zap,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO, getPersonSchema, getFAQSchema, getSpeakableSchema } from "@/lib/seo";
import {
  FOUNDER_CANONICAL,
  FOUNDER_FULL_NAME,
  FOUNDER_CITATION,
  FOUNDER_SOCIAL_PROFILES,
  FOUNDER_NOT_THE_SAME_AS,
} from "@/lib/founderIdentity";
import { FOUNDER_STORY_CHAPTERS } from "@/lib/aboutFounderStory";
import zainImage from "@/assets/zain-ahmed.png";
import { toast } from "sonner";

// Adjusted FAQ tailored for a personal tone
const FOUNDER_FAQS = [
  {
    q: "Are you really building this alone?",
    a: "Yes. I'm 17 and I write all the code for ShadowTalk AI myself from my room in Karachi. My co-founder Fatima helps with the architecture of the client-side ledger and UI state, but we don't have a massive engineering team. Just a lot of late nights.",
  },
  {
    q: "How did you learn to build an AI OS?",
    a: "I'm a first-year computing student. I was mentored under the Governor Sindh IT Initiative (GIAIC) by Sir Zia Khan in Generative and Agentic AI, but most of what I do is just reading documentation, breaking things, and fixing them until they work.",
  },
  {
    q: "Why focus so much on privacy?",
    a: "I got tired of big tech companies hoarding my thoughts. When you use a cloud AI, you are their product. I wanted an AI that ran locally in my browser, where my data never actually left my machine. Since nobody else was building it exactly how I wanted it, I built it myself.",
  },
  {
    q: "What's the best way to reach you?",
    a: "You can DM me on LinkedIn or Instagram. I read every message. Whether you're an early user, another builder, or just want to say hi, my DMs are open.",
  },
];

const BUILDERS_LOG = [
  {
    week: "Last Week",
    title: "Mission System v2",
    whatBroke: "The autonomous agents were too slow when chaining tasks. The UI would freeze.",
    whatChanged: "I ripped out the old polling system and replaced it with an optimistic UI and WebSockets.",
    result: "Instant visual feedback and much faster multi-agent chaining.",
    status: "Shipped",
    icon: Zap
  },
  {
    week: "2 Weeks Ago",
    title: "Memory Architecture",
    whatBroke: "Long conversations were causing context issues and dropping facts.",
    whatChanged: "Reworked the memory and context pipeline. Built a localized ledger system.",
    result: "Faster responses. Better continuity. Fewer failures.",
    status: "Rebuilt",
    icon: Wrench
  },
  {
    week: "3 Weeks Ago",
    title: "Agent Loop",
    whatBroke: "The browser's memory limits were crashing when different agents handed off context.",
    whatChanged: "Optimized the multi-agent dispatcher to use a lightweight state machine.",
    result: "Agents can hand off context seamlessly for hours.",
    status: "Optimized",
    icon: Activity
  },
  {
    week: "Last Month",
    title: "Desktop Runtime",
    whatBroke: "The browser sandbox was limiting what ShadowTalk could execute locally.",
    whatChanged: "Packaged the entire workspace into a standalone desktop application using Tauri.",
    result: "Agents now have direct, secure access to the filesystem.",
    status: "Shipping",
    icon: Rocket
  }
];

const FounderPage = () => {
  const navigate = useNavigate();
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [showDisambiguation, setShowDisambiguation] = useState(false);

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
    navigator.clipboard.writeText(FOUNDER_CITATION);
    setCopiedCitation(true);
    toast.success("Citation copied to clipboard!");
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  const structuredData = [
    getPersonSchema(),
    getFAQSchema(FOUNDER_FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    getSpeakableSchema(["#founder-headline", "#founder-bio", "[data-speakable]"]),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 selection:text-primary-foreground">
      <SEOHead meta={PAGE_SEO.founder} structuredData={structuredData} />
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
          Back to App
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-4 overflow-hidden border-b border-border/40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(100%,800px)] h-[400px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-accent/8 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />

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
                  className="gap-1.5 py-1 px-3 bg-primary/10 border-primary/30 text-primary text-xs font-semibold rounded-full shadow-sm"
                >
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                  Building in Public
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3 text-muted-foreground text-xs rounded-full border border-border/50"
                >
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  Karachi, Pakistan 🇵🇰
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3 text-muted-foreground text-xs rounded-full border border-border/50"
                >
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Age 17
                </Badge>
              </div>

              {/* Main Headline */}
              <h1
                id="founder-headline"
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-foreground"
              >
                I'm Zain. I'm 17. And I'm building the AI I wished existed.
              </h1>

              <div
                id="founder-bio"
                className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 space-y-4"
              >
                <p>
                  I started ShadowTalk because I didn't want another AI that simply answered questions. I wanted an AI that could actually work alongside me — think, create, code, research, and get things done.
                </p>
                <p>
                  Since nobody else was building it exactly how I wanted it, I opened my laptop and started coding. This is <strong className="text-foreground">ShadowTalk AI</strong>.
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
                  Try What I've Built
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 border-border/70 hover:border-primary/50 hover:bg-muted/40 font-medium"
                  asChild
                >
                  <a
                    href={FOUNDER_SOCIAL_PROFILES.linkedin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-4 w-4 text-[#0077b5]" />
                    LinkedIn
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 border-border/70 hover:border-primary/50 hover:bg-muted/40 font-medium"
                  asChild
                >
                  <a
                    href={FOUNDER_SOCIAL_PROFILES.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="h-4 w-4 text-[#e1306c]" />
                    Instagram
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Right Column: Interactive 3D Founder Portrait */}
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
                className="relative w-full max-w-[390px] aspect-[4/5] rounded-3xl p-1 group"
              >
                <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

                <motion.div
                  style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                  className="relative w-full h-full rounded-2xl overflow-hidden border border-primary/30 bg-card shadow-2xl"
                >
                  <img
                    src={zainImage}
                    alt={`${FOUNDER_FULL_NAME} — Founder of ShadowTalk AI`}
                    className="w-full h-full object-cover object-top scale-[1.02] group-hover:scale-105 transition-transform duration-700 ease-out"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />

                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                    <span className="glass-strong border border-white/10 rounded-full px-3 py-1 text-xs font-medium text-white flex items-center gap-1.5 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Actively Shipping
                    </span>
                    <span className="glass-strong border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                      Solo Dev
                    </span>
                  </div>

                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-5 left-5 right-5 glass-strong border border-border/50 rounded-xl p-4 shadow-xl backdrop-blur-xl"
                  >
                    <p className="text-sm font-bold text-foreground">
                      &ldquo;The shadow founder doesn&apos;t wait for permission.&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Building AI that puts you in control.
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* The Builder's Log */}
      <section className="py-20 px-4 border-b border-border/40 bg-muted/10">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-14">
            <Badge variant="outline" className="mb-3 px-3.5 py-1 border-primary/30 text-primary text-xs font-semibold rounded-full">
              <Terminal className="h-3.5 w-3.5 mr-1.5" />
              Builder's Log
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              What I broke (and fixed) recently
            </h2>
            <p className="text-muted-foreground max-w-xl text-sm sm:text-base">
              A transparent look at the reality of building a complex Agentic system solo. It's not always pretty, but it's shipping.
            </p>
          </div>

          <div className="space-y-6">
            {BUILDERS_LOG.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-subtle border border-border/50 hover:border-primary/40 rounded-2xl p-6 transition-all group flex flex-col md:flex-row gap-6"
              >
                <div className="flex flex-col items-start min-w-[140px]">
                  <span className="text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">
                    BUILDER'S LOG #{String(7 - i).padStart(2, '0')}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono text-muted-foreground mt-2">
                    {log.week}
                  </Badge>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <log.icon className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-bold text-foreground transition-colors">
                      I rebuilt ShadowTalk's {log.title}.
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <strong className="text-xs text-foreground uppercase tracking-wider block mb-1">What broke:</strong>
                      <p className="text-sm text-muted-foreground">{log.whatBroke}</p>
                    </div>
                    <div>
                      <strong className="text-xs text-foreground uppercase tracking-wider block mb-1">What I changed:</strong>
                      <p className="text-sm text-muted-foreground">{log.whatChanged}</p>
                    </div>
                    <div>
                      <strong className="text-xs text-foreground uppercase tracking-wider block mb-1">Result:</strong>
                      <p className="text-sm text-muted-foreground">{log.result}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/30 flex items-center">
                    <strong className="text-xs text-foreground uppercase tracking-wider mr-2">Status:</strong>
                    <span className="flex items-center text-xs font-mono font-medium text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                      {log.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Founder's Journey — 6 Chronological Chapters */}
      <section className="py-24 px-4 relative overflow-hidden" id="story">
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 border-primary/30 text-primary text-xs font-semibold rounded-full">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              The Story
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              How it started
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Writing thousands of lines of TypeScript and WebAssembly alone at night while the tech world said to wait.
            </p>
          </div>

          <div className="space-y-12 md:space-y-16">
            {FOUNDER_STORY_CHAPTERS.map((chapter, index) => (
              <motion.article
                key={chapter.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="relative"
              >
                <div className="flex gap-5 sm:gap-7">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-primary/10 text-sm sm:text-base font-bold text-primary border border-primary/30 shadow-md">
                      0{index + 1}
                    </span>
                    {index < FOUNDER_STORY_CHAPTERS.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[4rem] my-2 bg-gradient-to-b from-primary/40 to-transparent" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pb-4">
                    <div className="glass-subtle border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-primary/30 transition-colors">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 text-foreground">
                        {chapter.title}
                      </h3>
                      <div className="space-y-3.5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                        {chapter.body.map((paragraph, pIdx) => (
                          <p key={pIdx}>{paragraph}</p>
                        ))}
                      </div>

                      {chapter.pullQuote && (
                        <blockquote className="mt-5 p-4 sm:p-5 rounded-xl bg-primary/5 border-l-4 border-primary text-foreground font-medium text-base sm:text-lg italic not-italic relative">
                          <Quote className="h-4 w-4 text-primary mb-1.5 opacity-80" />
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

      {/* Founder FAQ Accordion */}
      <section className="py-20 px-4 border-t border-border/40">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Questions I get asked a lot
            </h2>
          </div>

          <div className="space-y-4">
            {FOUNDER_FAQS.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-border/50 glass-subtle overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-semibold text-base sm:text-lg text-foreground hover:text-primary transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-primary" : ""
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

          {/* Hidden SEO Disambiguation Toggle */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => setShowDisambiguation(!showDisambiguation)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              Search Disambiguation Notice
            </button>
            
            {showDisambiguation && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 text-left glass-subtle border border-border/40 rounded-xl p-5 text-sm"
              >
                <p className="mb-3 text-muted-foreground">
                  For press and search engines: I am {FOUNDER_FULL_NAME}, the AI engineer and founder of ShadowTalk. I am completely distinct from:
                </p>
                <ul className="space-y-2">
                  {FOUNDER_NOT_THE_SAME_AS.map((item) => (
                    <li key={item.name} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                      <span className="font-semibold text-foreground">{item.name}</span>
                      <span className="text-muted-foreground text-xs">{item.note}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Final Call to Action Card */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-primary/30 bg-gradient-to-b from-primary/10 via-background to-background text-center shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_70%)] pointer-events-none" />

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-foreground">
              Follow the journey
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              I post updates, breaking changes, and my raw unfiltered thoughts on LinkedIn. Follow along as I scale this to the first 5,000 users.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-border/70 hover:border-primary/50 font-medium bg-background"
                asChild
              >
                <a
                  href={FOUNDER_SOCIAL_PROFILES.linkedin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="h-4 w-4 text-[#0077b5]" />
                  Connect on LinkedIn
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-border/70 hover:border-primary/50 font-medium"
                asChild
              >
                <a href={`mailto:${FOUNDER_CANONICAL.email}`}>
                  <Mail className="h-4 w-4 text-primary" />
                  Email Me
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FounderPage;
