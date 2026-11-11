/**
 * ComputerPage — Landing page for ShadowTalk's Computer Mode.
 *
 * Computer Mode is an isolated WebContainer sandbox that lets the agent
 * run code, browse the web, access a virtual file system, and use a
 * terminal — all inside the user's browser.
 *
 * Route: /computer
 */

import { motion } from "framer-motion";
import {
  Terminal,
  Code2,
  Globe,
  HardDrive,
  Cpu,
  Rocket,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Feature {
  icon: typeof Terminal;
  title: string;
  description: string;
  accent: string;
}

const FEATURES: Feature[] = [
  {
    icon: Code2,
    title: "Live Code Execution",
    description:
      "Run Python, JavaScript, and shell scripts in real time. The agent writes, tests, and iterates on code inside an isolated container.",
    accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    icon: Globe,
    title: "Web Browsing",
    description:
      "Fetch live pages, extract content, and reason over real-time data. The agent can open URLs and pull structured information.",
    accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: HardDrive,
    title: "File System Access",
    description:
      "Read and write files in a virtual workspace. Persist scripts, notes, and generated assets across the session.",
    accent: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: Terminal,
    title: "Terminal Access",
    description:
      "A real shell — install packages, run build commands, and inspect output. The agent has the same tools a developer does.",
    accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
];

const REQUIREMENTS = [
  "Chrome 113+ or Edge 113+ (WebGPU support required)",
  "At least 4 GB of available RAM",
  "Hardware-accelerated GPU enabled in browser flags",
  "Cross-origin isolation headers (auto-configured on shadowtalk-ai.com)",
];

export default function ComputerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Computer Mode — ShadowTalk AI",
          description:
            "Computer Mode gives ShadowTalk a full browser sandbox: run code, browse the web, access a file system, and use a terminal — all inside an isolated WebContainer.",
          canonical: "https://www.shadowtalk-ai.com/computer",
          keywords: ["computer mode", "webcontainer", "code execution", "browser sandbox", "agentic AI"],
          ogType: "website",
          twitterCard: "summary_large_image",
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
              <Cpu className="w-3.5 h-3.5" />
              Computer Mode
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Computer Mode — Full Browser Sandbox
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
              Run code, browse the web, and execute tasks in an isolated
              WebContainer environment. ShadowTalk becomes a real operator — not
              just a conversationalist.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button
                asChild
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Link to="/chatbot">
                  <Rocket className="w-4 h-4 mr-2" />
                  Launch Computer Mode
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-border/50 bg-transparent hover:bg-white/5"
              >
                <Link to="/docs">Read the docs</Link>
              </Button>
            </div>
          </motion.div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * idx }}
                className="ios-glass-card p-6"
              >
                <div
                  className={cn(
                    "inline-flex p-2.5 rounded-xl border mb-4",
                    feature.accent,
                  )}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Requirements + note */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="ios-glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-foreground">
                  Requirements
                </h2>
              </div>
              <ul className="space-y-3">
                {REQUIREMENTS.map((req) => (
                  <li key={req} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="ios-glass-card p-6 border-amber-500/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-foreground">
                  Browser Compatibility
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Computer Mode requires a WebGPU-compatible browser
                (Chrome 113+, Edge 113+). Firefox and Safari are not yet
                supported. On unsupported browsers, the agent will fall back
                to standard chat-only mode automatically.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-200/90">
                  Tip: enable <code className="text-amber-300">#enable-unsafe-webgpu</code> in
                  chrome://flags if you're on an older Chrome build.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
