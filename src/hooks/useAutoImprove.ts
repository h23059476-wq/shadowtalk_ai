import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useUsageTracking, type QueryCategory } from "@/hooks/useUsageTracking";
import { useShadowMemoryContext } from "@/contexts/ShadowMemoryContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  analyzeBehavior,
  getBehaviorEvents,
  hasAnalyticsConsent,
  inferQueryCategory,
  publishAutoImproveEvent,
  isLearningEnabled,
  syncProfileToMemories,
  bumpMetric,
  PROFILE_SETTING_KEY,
  isThemeUiUxSuggestion,
  type BehaviorEventType,
  type LearnedProfile,
  type ImprovementApplied,
  EMPTY_PROFILE,
} from "@/lib/autoImprove";

const ANALYZE_EVERY_N_EVENTS = 8;
const SESSION_APPLIED_KEY = "shadowtalk_auto_improve_applied_session";

export interface ChatDefaults {
  mode?: string;
  personality?: string;
  systemHintAddon?: string;
}

export function useAutoImprove() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shadowMemory = useShadowMemoryContext();
  const { trackUsage, trackChatMessage, trackModeSwitch } = useUsageTracking();
  const { value: profile, save: saveProfile, isLoading } = useUserSettings<LearnedProfile>(
    PROFILE_SETTING_KEY,
    EMPTY_PROFILE
  );

  const [pendingImprovements, setPendingImprovements] = useState<ImprovementApplied[]>([]);
  const eventCountRef = useRef(0);
  const analyzingRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (analyzingRef.current || !isLearningEnabled() || !user) return;
    analyzingRef.current = true;
    try {
      const events = await getBehaviorEvents();
      const { profile: next, newImprovements } = analyzeBehavior(events, profile || EMPTY_PROFILE);
      await saveProfile(next);
      bumpMetric("analysesRun");
      bumpMetric("lastAnalysisAt", 0);

      if (user?.id && hasAnalyticsConsent()) {
        await syncProfileToMemories(user.id, next);
      }

      if (newImprovements.length > 0) {
        setPendingImprovements((prev) => [...prev, ...newImprovements].slice(-5));
      }
    } finally {
      analyzingRef.current = false;
    }
  }, [profile, saveProfile, user?.id]);

  const capture = useCallback(
    async (type: BehaviorEventType, payload?: Record<string, string | number | boolean>) => {
      if (!isLearningEnabled()) return;

      await publishAutoImproveEvent(type, payload);
      eventCountRef.current += 1;
      bumpMetric("eventsCaptured");

      shadowMemory.log(
        "feature",
        `auto_improve:${type}`,
        payload ? JSON.stringify(payload).slice(0, 120) : undefined,
        payload as Record<string, unknown> | undefined
      );

      if (user && hasAnalyticsConsent()) {
        if (type === "chat_send") {
          await trackChatMessage(
            (payload?.category as QueryCategory) || "general",
            String(payload?.personality || "friendly"),
            Number(payload?.messageLength || 0),
            Boolean(payload?.hasAttachment)
          );
        } else if (type === "mode_change" && payload?.mode) {
          await trackModeSwitch(String(payload.mode));
        } else {
          await trackUsage(
            "chat_message",
            undefined,
            `auto_improve_${type}`,
            undefined,
            payload as Record<string, string>
          );
        }
      }

      if (eventCountRef.current % ANALYZE_EVERY_N_EVENTS === 0) {
        await runAnalysis();
      }
    },
    [runAnalysis, shadowMemory, trackChatMessage, trackModeSwitch, trackUsage, user]
  );

  const captureChatSend = useCallback(
    (message: string, mode: string, personality: string, hasAttachment: boolean) => {
      const category = inferQueryCategory(message);
      return capture("chat_send", {
        mode,
        personality,
        category,
        inferredCategory: category,
        messageLength: message.length,
        hasAttachment,
      });
    },
    [capture]
  );

  const getChatDefaults = useCallback((): ChatDefaults | null => {
    const p = profile || EMPTY_PROFILE;
    if (p.confidence < 0.45) return null;
    return {
      mode: p.preferredMode,
      personality: p.preferredPersonality,
      systemHintAddon: p.systemHintAddon,
    };
  }, [profile]);

  const applyChatDefaultsOnce = useCallback(
    (apply: (defaults: ChatDefaults) => void) => {
      const sessionKey = SESSION_APPLIED_KEY;
      if (sessionStorage.getItem(sessionKey)) return null;

      const defaults = getChatDefaults();
      if (!defaults || (!defaults.mode && !defaults.personality)) return null;

      apply(defaults);
      sessionStorage.setItem(sessionKey, "1");
      bumpMetric("defaultsApplied");

      const labels: string[] = [];
      if (defaults.mode) labels.push(`${defaults.mode} mode`);
      if (defaults.personality) labels.push(`${defaults.personality} tone`);

      toast({
        title: "ShadowTalk adapted to you",
        description: `Applied your learned preferences: ${labels.join(", ")}.`,
      });

      return defaults;
    },
    [getChatDefaults, toast]
  );

  const dismissImprovementNotice = useCallback((id: string) => {
    setPendingImprovements((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const capturePageView = useCallback(
    (path: string) => capture("page_view", { path }),
    [capture],
  );

  const uiUxSuggestions = profile?.uiUxSuggestions ?? [];

  const dismissUiUxSuggestion = useCallback(
    async (id: string) => {
      const current = profile?.uiUxSuggestions || [];
      const dismissed = current.find((s) => s.id === id);
      const markThemeDone = dismissed && isThemeUiUxSuggestion(dismissed);
      const next: LearnedProfile = {
        ...(profile || EMPTY_PROFILE),
        uiUxSuggestions: current
          .filter((s) => s.id !== id)
          .filter((s) => !(markThemeDone && isThemeUiUxSuggestion(s))),
        ...(markThemeDone
          ? {
              themeSuggestionCompleted: true,
              offeredThemeTemplateId:
                dismissed?.suggestedTemplateId ?? profile?.offeredThemeTemplateId,
            }
          : {}),
      };
      await saveProfile(next);
      void capture("ui_suggestion_dismiss", { suggestionId: id });
    },
    [capture, profile, saveProfile],
  );

  const clearLearning = useCallback(async () => {
    const { clearBehaviorEvents } = await import("@/lib/autoImprove/eventStore");
    await clearBehaviorEvents();
    await saveProfile(EMPTY_PROFILE);
    sessionStorage.removeItem(SESSION_APPLIED_KEY);
    setPendingImprovements([]);
    toast({
      title: "Learning reset",
      description: "Behavior profile cleared. ShadowTalk will relearn from new activity.",
    });
  }, [saveProfile, toast]);

  useEffect(() => {
    if (!isLoading && profile && profile.eventCount === 0) {
      getBehaviorEvents().then((events) => {
        if (events.length >= 5) runAnalysis();
      });
    }
  }, [isLoading, profile, runAnalysis]);

  return {
    profile: profile || EMPTY_PROFILE,
    isLoading,
    capture,
    captureChatSend,
    runAnalysis,
    getChatDefaults,
    applyChatDefaultsOnce,
    pendingImprovements,
    dismissImprovementNotice,
    clearLearning,
    capturePageView,
    uiUxSuggestions,
    dismissUiUxSuggestion,
    preferSeeRouting: (profile || EMPTY_PROFILE).preferSeeRouting === true,
    learningEnabled: isLearningEnabled(),
    pageVisitCounts: profile?.pageVisitCounts ?? {},
  };
}
