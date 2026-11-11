import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  MessageSquare,
  Bot,
  Database,
  Link2,
  User,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SettingsGeneralSection } from "@/components/settings/SettingsGeneralSection";
import { SettingsDefaultModelsCard } from "@/components/settings/SettingsDefaultModelsCard";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { SettingsStagger, SettingsStaggerItem } from "@/components/settings/SettingsStagger";
import { CustomInstructionsProfileCard } from "@/components/profile/CustomInstructionsProfileCard";
import { ChatAIPreferencesCard } from "@/components/profile/ChatAIPreferencesCard";
import { OfflineAISettings } from "@/components/profile/OfflineAISettings";
import { ShadowTalkModelPanel } from "@/components/profile/ShadowTalkModelPanel";
import { AutoImproveInsights } from "@/components/autoImprove/AutoImproveInsights";
import { PrivacyDataCard } from "@/components/profile/PrivacyDataCard";
import { CustomApiKeysPanel } from "@/components/profile/CustomApiKeysPanel";
import { DesktopAppSettings } from "@/components/desktop/DesktopAppSettings";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import { SettingsHomeGrid } from "@/components/settings/SettingsHomeGrid";
import { SettingsShellCard } from "@/components/settings/SettingsShellCard";
import type { SettingsNavSection } from "@/components/settings/SettingsNav";
import type { SettingsSectionId } from "@/lib/settingsTypes";
import { Brain } from "lucide-react";

export type { SettingsSectionId } from "@/lib/settingsTypes";

interface SettingsSectionPanelsProps {
  section: SettingsSectionId;
  sections: readonly SettingsNavSection[];
  onSelectSection: (id: string) => void;
  learningEnabled: boolean;
  onLearningChange: (enabled: boolean) => void;
  autonomyEnabled: boolean;
  onAutonomyChange: (enabled: boolean) => void;
  anonymousAutonomous: boolean;
  onAnonymousAutonomousChange: (enabled: boolean) => void;
  autoApproveMissions: boolean;
  onAutoApproveMissionsChange: (enabled: boolean) => void;
}

const ACCOUNT_LINKS = [
  { label: "Profile & avatar", href: "/profile?tab=profile", desc: "Name, bio, photo" },
  { label: "Notifications", href: "/profile?tab=notifications", desc: "Email & alerts" },
  { label: "Security & 2FA", href: "/profile?tab=security", desc: "Password, API vault" },
  { label: "Active sessions", href: "/sessions", desc: "Signed-in devices & revoke" },
  { label: "Billing", href: "/profile?tab=billing", desc: "Everything is free" },
  { label: "Activity history", href: "/profile?tab=activity", desc: "Past conversations" },
  { label: "Self-healing diagnostics", href: "/self-healing", desc: "Captured errors & auto-fix proposals" },
] as const;

function AnimatedCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { reduced } = useSettingsMotion();

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SettingsSectionPanels({
  section,
  sections,
  onSelectSection,
  learningEnabled,
  onLearningChange,
  autonomyEnabled,
  onAutonomyChange,
  anonymousAutonomous,
  onAnonymousAutonomousChange,
  autoApproveMissions,
  onAutoApproveMissionsChange,
}: SettingsSectionPanelsProps) {
  if (section === "home") {
    return <SettingsHomeGrid sections={sections} onSelect={onSelectSection} />;
  }

  if (section === "general") {
    return <SettingsGeneralSection />;
  }

  if (section === "personalization") {
    return (
      <SettingsStagger className="space-y-6">
        <SettingsSectionHeader
          icon={Sparkles}
          title="Personalization"
          description="Custom instructions and default style for every conversation"
        />
        <SettingsStaggerItem>
          <AnimatedCard>
            <SettingsDefaultModelsCard />
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <CustomInstructionsProfileCard />
          </AnimatedCard>
        </SettingsStaggerItem>
      </SettingsStagger>
    );
  }

  if (section === "chat") {
    return (
      <SettingsStagger className="space-y-6">
        <SettingsSectionHeader
          icon={MessageSquare}
          title="Chat behavior"
          description="Keyboard, display, and how messages are routed"
        />
        <SettingsStaggerItem>
          <AnimatedCard>
            <ChatAIPreferencesCard />
          </AnimatedCard>
        </SettingsStaggerItem>
      </SettingsStagger>
    );
  }

  if (section === "models") {
    return (
      <SettingsStagger className="space-y-6">
        <SettingsSectionHeader
          icon={Bot}
          title="Models & AI"
          description="On-device models, hardware acceleration, and sovereign learning"
        />
        <SettingsStaggerItem>
          <AnimatedCard>
            <SettingsDefaultModelsCard />
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <OfflineAISettings />
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <ShadowTalkModelPanel />
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <DesktopAppSettings />
          </AnimatedCard>
        </SettingsStaggerItem>
      </SettingsStagger>
    );
  }

  if (section === "data") {
    return (
      <SettingsStagger className="space-y-6">
        <SettingsSectionHeader
          icon={Database}
          title="Data controls"
          description="Learning, analytics consent, and local data"
        />
        <SettingsStaggerItem>
          <AnimatedCard>
            <AutoImproveInsights />
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <SettingsShellCard
              title="Adaptive learning"
              description="On-device behavior learning (separate from analytics cookies)"
              icon={Brain}
            >
              <motion.div
                className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40"
                whileTap={{ scale: 0.995 }}
              >
                <p className="text-sm font-medium">Enable adaptive learning</p>
                <Switch checked={learningEnabled} onCheckedChange={onLearningChange} />
              </motion.div>
            </SettingsShellCard>
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <SettingsShellCard
              title="Autonomous agent"
              description="In-chat missions, scheduled runs, goal pursuit, and proactive signals"
              icon={Sparkles}
            >
              <motion.div
                className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40"
                whileTap={{ scale: 0.995 }}
              >
                <p className="text-sm font-medium">Enable autonomous mode</p>
                <Switch checked={autonomyEnabled} onCheckedChange={onAutonomyChange} />
              </motion.div>
              <motion.div
                className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40"
                whileTap={{ scale: 0.995 }}
              >
                <div>
                  <p className="text-sm font-medium">Anonymous & autonomous</p>
                  <p className="text-xs text-muted-foreground">No sign-in required; missions stay on-device</p>
                </div>
                <Switch checked={anonymousAutonomous} onCheckedChange={onAnonymousAutonomousChange} />
              </motion.div>
              <motion.div
                className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40"
                whileTap={{ scale: 0.995 }}
              >
                <div>
                  <p className="text-sm font-medium">Auto-run missions</p>
                  <p className="text-xs text-muted-foreground">Skip approval prompts for agent steps</p>
                </div>
                <Switch checked={autoApproveMissions} onCheckedChange={onAutoApproveMissionsChange} />
              </motion.div>
            </SettingsShellCard>
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <PrivacyDataCard />
          </AnimatedCard>
        </SettingsStaggerItem>
      </SettingsStagger>
    );
  }

  if (section === "connections") {
    return (
      <SettingsStagger className="space-y-6">
        <SettingsSectionHeader
          icon={Link2}
          title="Connections"
          description="API keys and linked services (Google, GitHub, Slack, WhatsApp)"
        />
        <SettingsStaggerItem>
          <AnimatedCard>
            <CustomApiKeysPanel />
          </AnimatedCard>
        </SettingsStaggerItem>
        <SettingsStaggerItem>
          <AnimatedCard>
            <Card className="glass border-border/50 card-glass">
              <CardContent className="pt-6 flex flex-wrap gap-3">
                <Button asChild variant="secondary" className="btn-glow">
                  <Link to="/profile?tab=linked">Manage linked accounts</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/developers">Developer integrations</Link>
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>
        </SettingsStaggerItem>
      </SettingsStagger>
    );
  }

  return (
    <SettingsStagger className="space-y-6">
      <SettingsSectionHeader
        icon={User}
        title="Account"
        description="Profile, billing (free), security, and notifications"
      />
      <SettingsStaggerItem>
        <Card className="glass border-border/50 card-glass divide-y divide-border/40 overflow-hidden">
          {ACCOUNT_LINKS.map((row, i) => (
            <motion.div
              key={row.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
            >
              <Link
                to={row.href}
                className="group flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {row.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            </motion.div>
          ))}
        </Card>
      </SettingsStaggerItem>
    </SettingsStagger>
  );
}
