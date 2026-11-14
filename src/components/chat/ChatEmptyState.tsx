import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Code,
  Lightbulb,
  FileText,
} from "lucide-react";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import { settingsHapticTick } from "@/lib/settingsFeedback";

/** Formats display name cleanly, removing trailing user-id numbers (e.g. zaim98269 -> Zaim) */
function formatGreetingName(rawName: string): string {
  if (!rawName || rawName.trim() === "" || rawName.toLowerCase() === "there") {
    return "friend";
  }
  const firstPart = rawName.trim().split(" ")[0].split("@")[0];
  // Strip trailing database digits if present (e.g. zaim98269 -> zaim)
  const cleaned = firstPart.replace(/\d+$/, "");
  const target = cleaned.length >= 2 ? cleaned : firstPart;
  return target.charAt(0).toUpperCase() + target.slice(1);
}

/** Determines local time greeting */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Welcome";
}

/** Clean, minimal suggestion cards */
const SUGGESTIONS = [
  {
    id: "market",
    title: "Analyze market landscape",
    subtitle: "Synthesize trends & competitive edge",
    icon: TrendingUp,
    iconBg: "bg-sky-500/10 text-sky-400",
    prompt: "Analyze the competitive landscape, market drivers, and TAM for ",
  },
  {
    id: "code",
    title: "Code a Python script",
    subtitle: "Data pipeline with async workers",
    icon: Code,
    iconBg: "bg-amber-500/10 text-amber-400",
    prompt: "Write a Python script that builds a data pipeline with async workers: ",
  },
  {
    id: "brainstorm",
    title: "Brainstorm product ideas",
    subtitle: "SaaS hook angles & positioning",
    icon: Lightbulb,
    iconBg: "bg-purple-500/10 text-purple-400",
    prompt: "Brainstorm product ideas with SaaS hook angles and positioning for ",
  },
  {
    id: "summarize",
    title: "Summarize complex PDF",
    subtitle: "Extract key takeaways & decisions",
    icon: FileText,
    iconBg: "bg-emerald-500/10 text-emerald-400",
    prompt: "Summarize this document, extracting the key takeaways and decisions: ",
  },
] as const;

interface ChatEmptyStateProps {
  userDisplayName: string;
  onSelectPrompt: (text: string) => void;
  apiConnectedLabel?: string | null;
  composerDockStyle?: React.CSSProperties;
  children: React.ReactNode;
  onOpenDocumentStudio?: () => void;
  onOpenImageStudio?: () => void;
  onOpenDeepResearch?: () => void;
  onOpenAppIde?: () => void;
  onOpenLiveVoice?: () => void;
  isDemo?: boolean;
  onExecuteDemo?: (prompt: string) => void;
}

function ChatEmptyStateInner({
  userDisplayName,
  onSelectPrompt,
  composerDockStyle,
  children,
  isDemo,
  onExecuteDemo,
}: ChatEmptyStateProps) {
  const { staggerList, staggerItem } = useSettingsMotion();

  const formattedName = useMemo(() => formatGreetingName(userDisplayName), [userDisplayName]);
  const timeGreeting = useMemo(() => getTimeGreeting(), []);

  return (
    <motion.div
      variants={staggerList}
      initial="hidden"
      animate="visible"
      className="relative w-full max-w-2xl mx-auto flex-1 flex flex-col items-center px-4 min-h-0"
    >
      <div className="flex-1 flex flex-col justify-center items-center w-full -mt-8">
        {/* Hero Greeting */}
        <motion.div variants={staggerItem} className="text-center space-y-2 mb-8 select-none">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            <span className="gemini-gradient">
              {timeGreeting}, {formattedName}
            </span>
          </h1>
          <p className="text-base text-slate-400 font-normal">
            Where would you like to start today?
          </p>
        </motion.div>

        {/* Composer dock */}
        <motion.div
          variants={staggerItem}
          className="w-full mb-7"
          style={composerDockStyle}
        >
          <div className="relative">
            {children}
          </div>
        </motion.div>

        {/* Suggestion cards / Demo missions */}
        {isDemo ? (
          <motion.div variants={staggerItem} className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                title: "Research AI trends",
                subtitle: "Summarize key developments",
                icon: TrendingUp,
                iconBg: "bg-emerald-500/10 text-emerald-400",
                prompt: "Research the latest developments in AI agents and summarize the key trends.",
              },
              {
                title: "Code a Python script",
                subtitle: "CSV analysis tool",
                icon: Code,
                iconBg: "bg-amber-500/10 text-amber-400",
                prompt: "Create a Python tool that analyzes a CSV and generates insights.",
              },
              {
                title: "Analyze a dataset",
                subtitle: "Explain key patterns",
                icon: Lightbulb,
                iconBg: "bg-purple-500/10 text-purple-400",
                prompt: "Analyze this sample dataset and explain the most important patterns.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    settingsHapticTick();
                    if (onExecuteDemo) onExecuteDemo(item.prompt);
                  }}
                  className="flex items-center space-x-3 p-3 rounded-2xl bg-card/60 hover:bg-muted border border-border/80 hover:border-border transition-all text-left group"
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground group-hover:text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div variants={staggerItem} className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl">
            {SUGGESTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    settingsHapticTick();
                    onSelectPrompt(item.prompt);
                  }}
                  className="flex items-center space-x-3 p-3 rounded-2xl bg-card/60 hover:bg-muted border border-border/80 hover:border-border transition-all text-left group"
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground group-hover:text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Minimal Unobtrusive Disclaimer Footer */}
      <footer className="w-full text-center pb-2 pt-4">
        <p className="text-[11px] text-slate-500 font-normal select-none">
          ShadowTalk can make mistakes. Verify important info.
        </p>
      </footer>
    </motion.div>
  );
}

export const ChatEmptyState = React.memo(ChatEmptyStateInner);
