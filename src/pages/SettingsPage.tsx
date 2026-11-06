import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import {
  Settings,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Bot,
  Database,
  Link2,
  User,
  LayoutGrid,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsAmbientBackground } from "@/components/settings/SettingsAmbientBackground";
import { SettingsNav, type SettingsNavSection } from "@/components/settings/SettingsNav";
import { SettingsSectionPanels } from "@/components/settings/SettingsSectionPanels";
import { SettingsSearch } from "@/components/settings/SettingsSearch";
import { SettingsHero } from "@/components/settings/SettingsHero";
import { SettingsBreadcrumb } from "@/components/settings/SettingsBreadcrumb";
import { SettingsProgressBar } from "@/components/settings/SettingsProgressBar";
import { SettingsLoading } from "@/components/settings/SettingsLoading";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import { useSettingsSectionNav } from "@/hooks/useSettingsSectionNav";
import { isLearningEnabled, setLearningEnabled } from "@/lib/autoImprove/learningConsent";

import { useState } from "react";
import { settingsHapticTick } from "@/lib/settingsFeedback";
import type { SettingsSectionId } from "@/lib/settingsTypes";

const SECTIONS: readonly SettingsNavSection[] = [
  { id: "home", label: "Overview", icon: LayoutGrid, desc: "Quick access to all areas" },
  { id: "general", label: "General", icon: Settings, desc: "Theme, language, sounds" },
  { id: "personalization", label: "Personalization", icon: Sparkles, desc: "Instructions & tone" },
  { id: "chat", label: "Chat behavior", icon: MessageSquare, desc: "Sending, timestamps, routing" },
  { id: "models", label: "Models & AI", icon: Bot, desc: "Provider, sovereign" },
  // "offline" was previously implemented (SettingsSectionPanels renders
  // LocalModelStatus + OfflineSetup under section === "offline") but missing
  // from this list, so /settings?section=offline silently fell back to
  // "home" and no reachable UI could initialize the local AI engine.
  { id: "offline", label: "Offline AI", icon: WifiOff, desc: "Local model & install" },
  { id: "data", label: "Data controls", icon: Database, desc: "Learning & privacy" },
  { id: "growth", label: "Growth Engine", icon: TrendingUp, desc: "Strategy & Scale AI" },
  { id: "connections", label: "Connections", icon: Link2, desc: "API keys & integrations" },
  { id: "account", label: "Account", icon: User, desc: "Profile, billing, security" },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);
const VALID = new Set(SECTION_IDS);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [learningEnabled, setLearningEnabledState] = useState(isLearningEnabled());
  const { headerReveal, shouldAnimateAmbient, heroCollapse, sectionPanel, spring } =
    useSettingsMotion();
  const mainRef = useRef<HTMLDivElement>(null);

  const section = (() => {
    const s = searchParams.get("section") || "home";
    return VALID.has(s) ? (s as SettingsSectionId) : "home";
  })();

  const sectionMeta = useMemo(
    () => SECTIONS.find((s) => s.id === section) ?? SECTIONS[0],
    [section],
  );

  const selectSection = useCallback(
    (id: string) => {
      setSearchParams({ section: id }, { replace: true });
    },
    [setSearchParams],
  );

  const { direction, progress } = useSettingsSectionNav(SECTION_IDS, section, selectSection);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [section]);

  if (authLoading) {
    return <SettingsLoading />;
  }

  const showHero = section === "home";

  return (
    <div className="min-h-screen relative settings-scroll-smooth">
      <SettingsAmbientBackground enabled={shouldAnimateAmbient} />

      <motion.header
        variants={headerReveal}
        initial="hidden"
        animate="visible"
        className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-2xl"
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="container mx-auto px-4 h-14 flex items-center gap-3 max-w-7xl">
          <motion.div
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={spring}
            onClick={() => {
              settingsHapticTick();
              // Hard redirect — guarantees navigation regardless of React
              // Router state (same pattern as the auth redirect fix).
              window.location.assign("/chatbot");
            }}
            className="cursor-pointer"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                settingsHapticTick();
                window.location.assign("/chatbot");
              }}
              aria-label="Back to chat"
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/30"
              animate={
                shouldAnimateAmbient
                  ? {
                      boxShadow: [
                        "0 0 0px hsl(var(--primary)/0)",
                        "0 0 28px hsl(var(--primary)/0.3)",
                        "0 0 0px hsl(var(--primary)/0)",
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Settings className="h-4 w-4 text-primary" />
            </motion.span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight truncate">
                <span className="gradient-text">Settings</span>
              </h1>
            </div>
          </div>
          <div className="hidden md:flex flex-1 max-w-sm ml-4">
            <SettingsSearch
              onNavigate={(s) => {
                settingsHapticTick();
                selectSection(s);
              }}
            />
          </div>
        </div>
      </motion.header>

      <LayoutGroup>
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl relative">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <aside className="md:w-[240px] lg:w-[292px] shrink-0 space-y-4">
              <div className="md:hidden">
                <SettingsSearch
                  onNavigate={(s) => {
                    settingsHapticTick();
                    selectSection(s);
                  }}
                />
              </div>
              <motion.div
                layout
                className="hidden md:block rounded-2xl border border-border/50 glass-strong p-4 shadow-elevated"
                transition={spring}
              >
                <SettingsSearch
                  onNavigate={(s) => {
                    settingsHapticTick();
                    selectSection(s);
                  }}
                  className="mb-4"
                />
                <SettingsNav sections={SECTIONS} activeId={section} onSelect={selectSection} />
              </motion.div>
              <div className="md:hidden">
                <SettingsNav sections={SECTIONS} activeId={section} onSelect={selectSection} />
              </div>
            </aside>

            <main ref={mainRef} className="flex-1 min-w-0 pb-20 scroll-mt-24">
              <motion.div
                layout
                className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-4 sm:p-6 lg:p-8 shadow-card settings-panel-shine overflow-hidden"
                transition={spring}
              >
                <SettingsProgressBar progress={progress} sectionLabel={sectionMeta.label} />

                <AnimatePresence initial={false} mode="popLayout">
                  {showHero ? (
                    <motion.div
                      key="hero"
                      initial={{ opacity: 0, height: 0 }}
                      animate="expanded"
                      exit="collapsed"
                      variants={heroCollapse}
                    >
                      <SettingsHero />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {section !== "home" && (
                  <SettingsBreadcrumb
                    sectionLabel={sectionMeta.label}
                    onHome={() => selectSection("home")}
                  />
                )}

                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={section}
                    custom={direction}
                    variants={sectionPanel}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <SettingsSectionPanels
                      section={section}
                      sections={SECTIONS}
                      onSelectSection={selectSection}
                      learningEnabled={learningEnabled}
                      onLearningChange={(v) => {
                        setLearningEnabled(v);
                        setLearningEnabledState(v);
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </main>
          </div>
        </div>
      </LayoutGroup>

      <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-border/30 bg-background/85 backdrop-blur-2xl py-2.5 pointer-events-none">
        <p className="text-center text-[11px] text-muted-foreground tracking-wide">
          <kbd className="font-mono px-1.5 py-0.5 rounded border border-border/50 bg-muted/30">⌘K</kbd>{" "}
          search ·{" "}
          <kbd className="font-mono px-1.5 py-0.5 rounded border border-border/50 bg-muted/30">↑↓</kbd>{" "}
          sections ·{" "}
          <kbd className="font-mono px-1.5 py-0.5 rounded border border-border/50 bg-muted/30">1–8</kbd>{" "}
          jump
        </p>
      </footer>
    </div>
  );
}
