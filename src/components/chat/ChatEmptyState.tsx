import { motion } from "framer-motion";
import { Sparkles, Code2, Search, PenLine, Zap, Target } from "lucide-react";
import { ShadowTalkOrb } from "@/components/chat/ShadowTalkOrb";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import { settingsHapticTick } from "@/lib/settingsFeedback";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { resolveEnterpriseTenant } from "@/lib/enterpriseTenants";
import { useAuth } from "@/components/AuthProvider";
import { UseCaseQuickLinks } from "@/components/growth/UseCaseQuickLinks";

const DEFAULT_QUICK_PROMPTS = [
  { label: "Plan my day", prompt: "Plan my day around meetings, writing, and deep work.", icon: Target },
  { label: "Draft an email", prompt: "Draft a short professional email about ", icon: PenLine },
  { label: "Summarize this topic", prompt: "Summarize the key points about ", icon: Search },
  { label: "Build a landing page", prompt: "Give me a clean landing page structure for ", icon: Code2 },
  { label: "Research for me", prompt: "Research the latest on ", icon: Search },
  { label: "Debug this code", prompt: "Debug this code and explain the fix: ", icon: Code2 },
] as const;

interface ChatEmptyStateProps {
  userDisplayName: string;
  onSelectPrompt: (text: string) => void;
  apiConnectedLabel?: string | null;
  composerDockStyle?: React.CSSProperties;
  children: React.ReactNode;
}

export function ChatEmptyState({
  userDisplayName,
  onSelectPrompt,
  apiConnectedLabel,
  composerDockStyle,
  children,
}: ChatEmptyStateProps) {
  const { user } = useAuth();
  const { staggerList, staggerItem, spring, reduced } = useSettingsMotion();
  const tenant = resolveEnterpriseTenant(user?.email);
  const quickPrompts = tenant?.quickPrompts ?? DEFAULT_QUICK_PROMPTS;

  return (
    <motion.div
      variants={staggerList}
      initial="hidden"
      animate="visible"
      className="shadowtalk-chat-empty"
    >
      <motion.div variants={staggerItem}>
        <ShadowTalkOrb />
      </motion.div>

      <motion.h1 variants={staggerItem} className="shadowtalk-chat-greeting">
        Hello, <span className="gradient-text">{userDisplayName}</span>
      </motion.h1>
      <motion.p variants={staggerItem} className="shadowtalk-chat-tagline text-base sm:text-lg font-semibold tracking-tight">
        <span className="gradient-text">{tenant?.welcomeSubtitle ?? BRAND.tagline}</span>
      </motion.p>
      <motion.p variants={staggerItem} className="text-xs text-muted-foreground mt-1">
        Try ShadowTalk — sovereign AI, local-first, and no data stored.
      </motion.p>

      <motion.div
        variants={staggerItem}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400"
        aria-label="Privacy status"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Anonymous · local-first · no data stored
      </motion.div>

      {apiConnectedLabel && (
        <motion.p
          variants={staggerItem}
          className="text-[10px] text-muted-foreground/60 mt-2 tracking-wide"
        >
          {apiConnectedLabel}
        </motion.p>
      )}


      <motion.div
        variants={staggerItem}
        className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg"
      >
        {quickPrompts.map((item, index) => {
          const defaultIcons = [Sparkles, Code2, Search, PenLine, Zap] as const;
          const Icon =
            "icon" in item && item.icon
              ? item.icon
              : defaultIcons[index % defaultIcons.length];
          return (
            <motion.button
              key={item.label}
              type="button"
              whileHover={reduced ? undefined : { y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              onClick={() => {
                settingsHapticTick();
                onSelectPrompt(item.prompt);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border/50",
                "bg-muted/30 px-3.5 py-2 text-xs font-medium text-muted-foreground",
                "hover:border-primary/40 hover:text-foreground hover:bg-primary/10",
                "transition-colors",
              )}
            >
              <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
              {item.label}
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div variants={staggerItem} className="mt-4 max-w-lg px-2">
        <UseCaseQuickLinks source="chat_empty" />
      </motion.div>

      <motion.div
        variants={staggerItem}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {[
          { label: "Free to use — no subscription", href: "/pricing" },
          { label: "Bring your own AI provider key", href: "/settings" },
        ].map((cta) => (
          <motion.a
            key={cta.label}
            href={cta.href}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/15 transition-colors"
          >
            {cta.label}
          </motion.a>
        ))}
      </motion.div>

      <motion.div
        variants={staggerItem}
        className="shadowtalk-chat-input-dock shadowtalk-chat-input-shell shadowtalk-chat-input-shell--empty w-full"
        style={composerDockStyle}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
