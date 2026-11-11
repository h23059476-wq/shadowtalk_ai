/**
 * MissionControlPage — Autonomous Task Execution hub for ShadowTalk AI.
 *
 * Lets the user give ShadowTalk a high-level goal and have the agent break
 * it down into steps, execute each one with real tools, and deliver a
 * finished result. Showcases how-it-works, mission launcher, recent
 * missions, and capability list.
 *
 * Route: /mission-control
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Brain,
  Workflow,
  Rocket,
  Search,
  Code2,
  FileText,
  Microscope,
  FileSearch,
  Clock,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Step {
  icon: typeof Target;
  title: string;
  description: string;
  step: number;
}

const STEPS: Step[] = [
  {
    icon: Target,
    title: "Define Goal",
    description:
      "Describe what you want done in plain English. No prompt engineering required — ShadowTalk extracts the objective and constraints.",
    step: 1,
  },
  {
    icon: Brain,
    title: "AI Plans Steps",
    description:
      "The agent breaks your goal into a sequence of executable subtasks, picks the right tools for each, and shows you the plan before running.",
    step: 2,
  },
  {
    icon: Workflow,
    title: "Auto-Execute",
    description:
      "ShadowTalk runs each step — searching, coding, generating documents — and reports progress live. You approve sensitive actions.",
    step: 3,
  },
];

const CAPABILITIES = [
  { icon: Search, label: "Web Search", description: "Live web queries with source citations" },
  { icon: Code2, label: "Code Execution", description: "Run Python & JS in an isolated sandbox" },
  { icon: FileText, label: "Document Generation", description: "PDFs, DOCX, slide decks, spreadsheets" },
  { icon: Microscope, label: "Research", description: "Multi-step deep research with synthesis" },
  { icon: FileSearch, label: "File Analysis", description: "Parse, summarize, and extract from uploads" },
];

export default function MissionControlPage() {
  const [goal, setGoal] = useState("");

  const launchMission = () => {
    if (!goal.trim()) {
      toast.error("Describe your goal first.");
      return;
    }
    toast.success("Opening ProofLoop Verification Workspace…");
    setTimeout(() => {
      window.location.href = "/proofloop";
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Mission Control — ShadowTalk AI",
          description:
            "Give ShadowTalk a goal and it breaks it down into steps, executes each one with real tools, and delivers the result. Autonomous task execution for AI work.",
          canonical: "https://www.shadowtalk-ai.com/mission-control",
          keywords: ["mission control", "autonomous AI", "agentic tasks", "AI workflow", "task automation"],
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
              <Sparkles className="w-3.5 h-3.5" />
              Mission Control
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Mission Control — Autonomous Task Execution
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
              Give ShadowTalk a goal, and it will break it down into steps,
              execute each one, and deliver the result.
            </p>
          </motion.div>

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * idx }}
                className="ios-glass-card p-6 relative"
              >
                <span className="absolute top-4 right-4 text-5xl font-bold text-white/5 tabular-nums">
                  {step.step}
                </span>
                <div className="inline-flex p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                  <step.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Mission input + recent missions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="ios-glass-card p-6 lg:col-span-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-semibold text-foreground">
                  Launch a New Mission
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Describe the outcome you want. Be specific about deliverables.
              </p>
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Research the top 5 AI note-taking tools, compare their pricing and features, and produce a one-page PDF summary."
                className="min-h-[120px] resize-y bg-white/[0.03] border-border/50"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <span className="text-xs text-muted-foreground">
                  {goal.length}/1000 characters
                </span>
                <Button
                  onClick={launchMission}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Launch Mission
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="ios-glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-semibold text-foreground">
                  Recent Missions
                </h2>
              </div>
              <div className="flex flex-col items-center justify-center text-center py-8 px-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-border/50 flex items-center justify-center mb-3">
                  <Target className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No missions yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Your completed and in-progress missions will appear here.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Capabilities */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="ios-glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Workflow className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-foreground">
                Capabilities
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.label}
                  className={cn(
                    "p-4 rounded-xl border border-border/50 bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <cap.icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-foreground">
                      {cap.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{cap.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 text-center">
              <Button asChild variant="link" className="text-indigo-400">
                <Link to="/docs">Read the Mission Control guide →</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
