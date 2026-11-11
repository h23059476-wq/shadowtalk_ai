import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { backend } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import { ChatMode } from "@/components/chat/ModeSelector";
import { AIProvider } from "@/components/chat/ProviderSelector";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatToolbar } from "@/components/chat/ChatToolbar";
import { EnterpriseWelcomeBanner } from "@/components/chat/EnterpriseWelcomeBanner";
import { EnterpriseEmployeeGate } from "@/components/enterprise/EnterpriseEmployeeGate";
import { EnterpriseOnboarding } from "@/components/enterprise/EnterpriseOnboarding";
import { EnterpriseHelpFab } from "@/components/enterprise/EnterpriseHelpFab";
import { EnterpriseInviteColleagues } from "@/components/enterprise/EnterpriseInviteColleagues";
import { useEnterpriseExperience } from "@/hooks/useEnterpriseExperience";
import { ChatIconRail } from "@/components/chat/ChatIconRail";
import { ChatShadowSidebar } from "@/components/chat/ChatShadowSidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ImageGenerator } from "@/components/chat/ImageGenerator";
import { MusicGenerator } from "@/components/chat/MusicGenerator";
import { WordleGame } from "@/components/chat/WordleGame";
import { GoogleIntegrationPanel } from "@/components/chat/GoogleIntegrationPanel";
import { PerceptionDashboard } from "@/components/chat/PerceptionDashboard";
import { UserContextPanel, type UserContext } from "@/components/chat/UserContextPanel";
import { DeepResearchPanel } from "@/components/chat/DeepResearchPanel";
import { CommandPalette } from "@/components/chat/CommandPalette";

const ShadowTalkLive = lazy(() =>
  import("@/components/chat/ShadowTalkLive").then((m) => ({ default: m.ShadowTalkLive })),
);
const ShadowBrowser = lazy(() =>
  import("@/components/chat/ShadowBrowser").then((m) => ({ default: m.ShadowBrowser })),
);
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useOfflineAuth } from "@/hooks/useOfflineAuth";
import { useOfflineChatHistory } from "@/hooks/useOfflineChatHistory";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useGuestUsage, GUEST_LIMITS } from "@/hooks/useGuestUsage";
import { useDailyLimits } from "@/hooks/useDailyLimits";
import { useToolOrchestrator } from "@/hooks/useToolOrchestrator";
import { useAgenticToolDispatch } from "@/hooks/useAgenticToolDispatch";
import { detectShadowExecutionFromChat } from "@/lib/execution/inferFromChat";
import { ChatAmbientBackground } from "@/components/chat/ChatAmbientBackground";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatbotTrustStrip } from "@/components/chat/ChatbotTrustStrip";
import { ChatMainPanel } from "@/components/chat/ChatMainPanel";
import { SETTINGS_SPRING } from "@/lib/settingsMotion";
import { useChatSidebarCollapse } from "@/hooks/useChatSidebarCollapse";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIosKeyboard } from "@/hooks/useIosKeyboard";
import { ChatMobileNavDrawer } from "@/components/chat/ChatMobileNavDrawer";
import { useShadowMemoryContext } from "@/contexts/ShadowMemoryContext";
import { useIntelligenceHub } from "@/hooks/useIntelligenceHub";
import { useAutoImproveContext } from "@/contexts/AutoImproveContext";
import { useSEEFromChat } from "@/hooks/useSEEFromChat";
import { SEEMissionPanel } from "@/components/chat/SEEMissionPanel";
import { resolveAutonomousRoute } from "@/lib/autonomy/autonomousRouter";
import { trackAgenticEvent } from "@/lib/agenticMetrics";
import { upsertGoalsFromMessage, syncGoalToAiMemories } from "@/lib/autonomy/goalPersistence";
import { selfHealedFetch } from "@/lib/selfHealing/selfHealedFetch";
import { detectChatImageIntent } from "@/lib/chatImageIntent";
import {
  buildVisionUserMessage,
  callChatImageAnalyze,
  callChatImageEdit,
} from "@/lib/chatImageApi";
import { CognitiveLoopPanel } from "@/components/chat/CognitiveLoopPanel";
import { useGemmaOffline } from "@/hooks/useGemmaOffline";
import { useMarketplace } from "@/hooks/useMarketplace";
import { resolveAgentRuntime } from "@/lib/marketplace/resolveAgentConfig";
import { prependAgentSystemPrompt } from "@/lib/marketplace/applyAgentToChat";
import { prependChatKnowledgeContext } from "@/lib/shadowTalkProductKnowledge";
import {
  ensureDefaultPersonalModel,
  getActivePersonalModel,
  getPersonalModelSampling,
  learnPersonalExampleFromTurn,
  prependPersonalModelToMessages,
} from "@/lib/personalModel";
import {
  clearActiveMarketplaceAgent,
  getActiveMarketplaceSession,
  setActiveMarketplaceAgent,
} from "@/lib/marketplace/activeAgentSession";
import { MarketplaceAgentBanner } from "@/components/chat/MarketplaceAgentBanner";
import type { MarketplaceAgent, MarketplaceAgentRuntime } from "@/lib/marketplace/types";
import { runOfflineCompletion } from "@/lib/offline/runOfflineCompletion";
import { prewarmFastestLocalPath, warmHardwareProfile } from "@/lib/hardwareIntelligence";
import { runOllamaChat } from "@/lib/desktop/ollamaInference";
import {
  augmentMessagesWithLocalMemory,
  indexSovereignMemory,
} from "@/lib/desktop/sovereignMemoryRag";
import { isSovereignModeEnabled, shouldPreferOllamaInference } from "@/lib/desktop/sovereignMode";
import {
  canUseCloudAI,
  DEVICE_ONLY_BLOCKED_MESSAGE,
  ensureAutoCloudUntilLocalReady,
  shouldPersistChatToCloud,
  setInterimCloudConsent,
} from "@/lib/privacy/deviceOnlyPledge";
import {
  isLocalInferenceReady,
  LOCAL_MODEL_READY_EVENT,
} from "@/lib/privacy/localInferenceReady";
import { bootstrapCachedLocalModel } from "@/lib/offline/bootstrapLocalModel";
import { bootstrapSeamlessOfflineForLoggedInUser } from "@/lib/offline/seamlessOfflineBootstrap";
import {
  getShadowSpectreScope,
  hasAcceptedShadowSpectreTerms,
  routeShadowSpectreHead,
  streamShadowSpectre,
} from "@/lib/cyber/shadowspectre";
import { ShadowSpectreScopeBar } from "@/components/cyber/ShadowSpectreScopeBar";
import { ShadowSpectrePanel } from "@/components/cyber/ShadowSpectrePanel";
import { ShadowSpectreTermsDialog } from "@/components/cyber/ShadowSpectreTermsDialog";
import { runLocalChat, isAnyLocalModelReady } from "@/lib/offline/localChat";
import type { RouterMessage } from "@/lib/offline/hybridRouter";
import { decideRoute } from "@/lib/offline/hybridRouter";
import { useCustomApiKeys } from "@/hooks/useCustomApiKeys";
import { useUserSettings } from "@/hooks/useUserSettings";
import { stringifyChatBody } from "@/lib/chatRequest";
import { ByokProviderKeyDialog } from "@/components/chat/ByokProviderKeyDialog";
import {
  buildChatProviderPayload,
  hasStoredKeyForProvider,
  resolveActiveUiProvider,
} from "@/lib/chatProviderBridge";
import { loadCustomAiConfig, saveCustomAiConfig } from "@/lib/customApiKeys";
import { turboComplete, resolveTurboKey } from "@/lib/turbo";
import {
  getGuestArchivedIds,
  isConversationArchived,
  setGuestArchivedIds,
} from "@/lib/chatArchive";
import { CHAT_COMMAND_MODAL_ACTIONS, CHAT_COMMAND_NAV_ROUTES } from "@/lib/chatCommandRoutes";
import { consumePendingChatInsert } from "@/lib/pendingChatInsert";
import { useChatSpeech } from "@/hooks/useChatSpeech";
import { OfflineToolsPanel } from "@/components/chat/OfflineToolsPanel";
import { BrowseActivityPanel, useAutoBrowse } from "@/components/chat/BrowseActivityPanel";
import { MultiModelOrchestrator } from "@/components/chat/MultiModelOrchestrator";
import { CreativeSynthesis } from "@/components/chat/CreativeSynthesis";
import { VisualReasoning } from "@/components/chat/VisualReasoning";
import { ImageDecoder } from "@/components/chat/ImageDecoder";
import { DailyPlanner } from "@/components/chat/DailyPlanner";
import { IntelligenceHub } from "@/components/chat/IntelligenceHub";
import { KnowledgeVault } from "@/components/chat/KnowledgeVault";
import { CHAT_LIMIT_TOAST } from "@/lib/conversionCopy";
import { getDailyMessageCount, incrementDailyMessageCount } from "@/lib/dailyMessageCounter";
import { openProjectInIde, saveIdePayload } from "@/lib/idePayloadStorage";
import { detectAppBuilderIntent, generateAppProject } from "@/lib/appBuilder";
import { useShadowTalkModel } from "@/hooks/useShadowTalkModel";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO, getFounderHomeStructuredData, getChatbotFAQSchema, getSpeakableSchema, getWebSiteWithSearchSchema } from "@/lib/seo";
import { FounderCrawlStrip } from "@/components/founder/FounderCrawlStrip";
import { PlanetaryActionModal } from "@/components/chat/PlanetaryActionModal";
import { ScreenAgent } from "@/components/chat/ScreenAgent";
import { VisionAgentModal } from "@/components/chat/VisionAgentModal";
import { AgenticTaskRunner } from "@/components/chat/AgenticTaskRunner";
import { AIAgentWorkflows } from "@/components/chat/AIAgentWorkflows";
import { AnalyticsDashboard } from "@/components/chat/AnalyticsDashboard";
import { GeminiKeyAnalytics } from "@/components/chat/GeminiKeyAnalytics";
import { DataOrganizer } from "@/components/chat/DataOrganizer";
import { UncensoredArena } from "@/components/chat/UncensoredArena";
import { ShadowCowork } from "@/components/chat/ShadowCowork";
import { SignInPrompt } from "@/components/chat/SignInPrompt";
import { InterimCloudConsentDialog } from "@/components/chat/InterimCloudConsentDialog";
import { BRAND } from "@/lib/brand";
import { ReferralNudgeBanner } from "@/components/growth/ReferralNudgeBanner";
import { ShareResultDialog } from "@/components/growth/ShareResultDialog";
import { ShareWinBanner } from "@/components/growth/ShareWinBanner";
import { recordSuccessfulChatSession, getSuccessfulSessionCount } from "@/lib/growth/sessionMilestones";
import { markHasChatted, completeQuickPrompt, hasChattedBefore } from "@/lib/growth/firstVisit";
import { recordFunnelEvent, recordChatbotView } from "@/lib/growth/funnelEvents";
import { isAnonymousAutonomousEnabled } from "@/lib/anonymousAutonomousMode";
import {
  buildChatShareSubtitle,
  buildChatShareTitle,
  isShareWorthyReply,
  recordChatShareBannerShown,
  shouldShowChatShareBanner,
} from "@/lib/growth/selfMarketing";
import { useUserReferralCode } from "@/hooks/useUserReferralCode";
import { useChatSettings } from "@/hooks/useChatSettings";
import { useE2EE } from "@/hooks/useE2EE";
import { useChatPrivateMode } from "@/hooks/useChatPrivateMode";
import { buildMemoryContextForUser } from "@/lib/memory/promptInjector";
import {
  getChatFetchHeaders,
  getChatFunctionUrl,
  isCloudConfigured,
  DESKTOP_ENV_SETUP_HINT,
  formatChatFetchError,
} from "@/lib/cloudEnv";
import { isShadowTalkDesktop } from "@/lib/desktopBridge";
import { desktopChatStream } from "@/lib/desktopChatFetch";
import { reflectOnConversation, shouldReflect, type MemoryReflection } from "@/lib/memory/reflectionEngine";
import { getActiveMemories, maybeReflectAndPersist } from "@/lib/memory/agentMemories";
import { buildMemoryContext } from "@/lib/memory/promptInjector";
// Types
interface Message { 
  id: string; 
  type: "user" | "ai"; 
  content: string; 
  timestamp: Date;
  attachment?: { type: 'image' | 'file'; data: string; name: string; mimeType: string };
  imageUrl?: string;
  toolExecution?: { tool: string; status: string; result?: string; params?: Record<string, string> };
}
type Conversation = {
  id: string;
  title: string;
  created_at: string;
  archived_at?: string | null;
};
type Personality = "friendly" | "sarcastic" | "professional" | "creative" | "meticulous" | "curious" | "diplomatic" | "witty" | "pragmatic" | "inquisitive" | "spicy";

function parseSseContentLines(
  lines: string[],
  assistantContent: string,
): string {
  let content = assistantContent;
  for (const line of lines) {
    if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
    try {
      const data = JSON.parse(line.slice(6));
      const delta = data.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch {
      /* ignore malformed SSE chunk */
    }
  }
  return content;
}

const ChatbotPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userPlan, signOut, checkSubscription, isOffline, isAnonymous } = useAuth();
  const guestUsage = useGuestUsage();
  const dailyLimits = useDailyLimits();
  const enterprise = useEnterpriseExperience();
  const { toast } = useToast();
  
  // Hooks
  const { checkAccess, isElite, isProOrHigher } = useFeatureGating();
  const { requestPermission } = usePushNotifications();
  const { trackChatMessage, trackConversationCreated } = useUsageTracking();
  const { getOfflineSession } = useOfflineAuth();
  const toolOrchestrator = useToolOrchestrator();
  const { dispatchDetectionAsync, continueFromCritic, goToExecute } = useAgenticToolDispatch();
  const {
    captureChatSend,
    capture: captureAutoImprove,
    applyChatDefaultsOnce,
    preferSeeRouting,
    getChatDefaults,
  } = useAutoImproveContext();
  const { extractMemories, extractKnowledge, getMemoryContext } = useIntelligenceHub();
  const {
    chatMission,
    activeMission,
    isExecuting: isMissionExecuting,
    pendingApproval,
    launchMissionFromChat,
    approveChatMissionStep,
    rejectPendingStep,
    cancelExecution,
    dismissChatMission,
  } = useSEEFromChat();
  const gemmaOffline = useGemmaOffline();
  const sovereignModel = useShadowTalkModel();
  const { getAgentById, agents: marketplaceAgents, loading: marketplaceCatalogLoading } = useMarketplace();
  const [activeMarketplaceAgent, setActiveMarketplaceAgentState] = useState<MarketplaceAgent | null>(null);
  const marketplaceRuntimeRef = useRef<MarketplaceAgentRuntime | null>(null);
  const { aiConfig, hasVerifiedKey, keys, switchToPlatformDefault, setDefault, refresh: refreshApiKeys } =
    useCustomApiKeys();
  
  // State
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyChats, setDailyChats] = useState(() => getDailyMessageCount());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messageCount =
    user && dailyLimits.isLoaded ? dailyLimits.usage.messages : dailyChats;
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [personality, setPersonality] = useState<Personality>("friendly");
  const [chatMode, setChatMode] = useState<ChatMode>("general");
  const [aiProvider, setAiProvider] = useState<AIProvider>('turbo');
  const { preferences: chatPreferences, isLoading: chatPrefsLoading } = useChatSettings();
  const hasOllamaDesktop = typeof window !== 'undefined' && (window as any).__TAURI__ && isAnyLocalModelReady();
  const e2ee = useE2EE();
  const chatPrivate = useChatPrivateMode(e2ee);
  const appliedChatDefaults = useRef(false);
  const [byokDialogOpen, setByokDialogOpen] = useState(false);
  const [pendingByokProvider, setPendingByokProvider] = useState<AIProvider | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar, width: sidebarWidth } =
    useChatSidebarCollapse();
  const isMobile = useIsMobile();
  const keyboardOffset = useIosKeyboard();
  const inputDockStyle =
    keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : undefined;
  const historyPanelLeft = isMobile ? 0 : sidebarWidth;
  const [isListening, setIsListening] = useState(false);
  const { isSpeaking, speakingMessageId, speakMessage } = useChatSpeech();
  const [selectedFile, setSelectedFile] = useState<{ type: 'image' | 'file'; data: string; name: string; mimeType: string } | null>(null);
  
  // Modals
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [showMusicGenerator, setShowMusicGenerator] = useState(false);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicAutoGenerate, setMusicAutoGenerate] = useState(false);
  const [showWordle, setShowWordle] = useState(false);
  const [showGoogleIntegration, setShowGoogleIntegration] = useState(false);
  const [showShadowSpectrePanel, setShowShadowSpectrePanel] = useState(false);
  const [showShadowSpectreTerms, setShowShadowSpectreTerms] = useState(false);
  const [shadowSpectreHead, setShadowSpectreHead] = useState<string>("general");
  const [localModelReady, setLocalModelReady] = useState(() => isLocalInferenceReady());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDeepResearch, setShowDeepResearch] = useState(false);
  const [showShadowTalkLive, setShowShadowTalkLive] = useState(false);
  const [showShadowBrowser, setShowShadowBrowser] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showOfflineTools, setShowOfflineTools] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [chatShareOffer, setChatShareOffer] = useState<{ title: string; subtitle?: string; prompt?: string; answer?: string } | null>(null);
  const [chatShareDialogOpen, setChatShareDialogOpen] = useState(false);
  const [chatShareCustomLink, setChatShareCustomLink] = useState<string | null>(null);
  const [showCognitiveLoop, setShowCognitiveLoop] = useState(false);
  const [cognitiveQuery, setCognitiveQuery] = useState("");
  const [showMultiModel, setShowMultiModel] = useState(false);
  const [showCreativeSynthesis, setShowCreativeSynthesis] = useState(false);
  const [showVisualReasoning, setShowVisualReasoning] = useState(false);
  const [showImageDecoder, setShowImageDecoder] = useState(false);
  const [showDailyPlanner, setShowDailyPlanner] = useState(false);
  const [showPlanetaryActions, setShowPlanetaryActions] = useState(false);
  const [showScreenAgent, setShowScreenAgent] = useState(false);
  const [showVisionAgent, setShowVisionAgent] = useState(false);
  const [showIntelligenceHub, setShowIntelligenceHub] = useState(false);
  const [showKnowledgeVault, setShowKnowledgeVault] = useState(false);
  const [showAgenticRunner, setShowAgenticRunner] = useState(false);
  const [showAgentWorkflows, setShowAgentWorkflows] = useState(false);
  const [showGeminiAnalytics, setShowGeminiAnalytics] = useState(false);
  const [showDataOrganizer, setShowDataOrganizer] = useState(false);
  const [showUncensoredArena, setShowUncensoredArena] = useState(false);
  const [showShadowCowork, setShowShadowCowork] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [signInPromptReason, setSignInPromptReason] = useState<"chats" | "images" | "deepResearch" | "general">("chats");
  const [showInterimCloudConsent, setShowInterimCloudConsent] = useState(false);
  const [showBrowseActivity, setShowBrowseActivity] = useState(false);
  const { browseSession, startBrowseSession, closeBrowseSession } = useAutoBrowse();
  const pushPermissionAskedRef = useRef(false);
  const referralCode = useUserReferralCode();
  const [guestArchivedIds, setGuestArchivedIdsState] = useState<Set<string>>(() =>
    getGuestArchivedIds(),
  );
  const DEFAULT_USER_CONTEXT: UserContext = {
    country: "",
    city: "",
    incomeRange: "",
    employmentStatus: "",
    familyStatus: "",
    interests: [],
    recentLifeEvents: [],
  };
  const {
    value: savedUserContext,
    save: saveUserContext,
    isLoading: userContextLoading,
  } = useUserSettings<UserContext>("user_context_profile", DEFAULT_USER_CONTEXT);
  const [userContext, setUserContext] = useState<UserContext>(DEFAULT_USER_CONTEXT);

  useEffect(() => {
    if (!userContextLoading) setUserContext(savedUserContext);
  }, [savedUserContext, userContextLoading]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useGeoLocation();

  useEffect(() => {
    warmHardwareProfile();
    prewarmFastestLocalPath();
    ensureDefaultPersonalModel();
    void bootstrapCachedLocalModel().then((ok) => {
      if (ok) setLocalModelReady(true);
    });
  }, []);

  useEffect(() => {
    const onReady = () => setLocalModelReady(true);
    window.addEventListener(LOCAL_MODEL_READY_EVENT, onReady);
    return () => window.removeEventListener(LOCAL_MODEL_READY_EVENT, onReady);
  }, []);

  useEffect(() => {
    recordChatbotView();
  }, []);

  useEffect(() => {
    if (currentConversationId || user) return;
    const guestConvId = `guest-${Date.now()}`;
    setCurrentConversationId(guestConvId);
    setConversations([
      { id: guestConvId, title: "Guest Conversation", created_at: new Date().toISOString() },
    ]);
  }, [currentConversationId, user]);

  useEffect(() => {
    // Every visitor on the chat page kicks off the silent on-device model
    // download. Cloud is used until the model is ready, then routing flips
    // to local automatically (see tierAInstall → onLocalModelReady).
    bootstrapSeamlessOfflineForLoggedInUser();
  }, [user, isAnonymous]);

  useEffect(() => {
    if (chatMode === "shadowspectre" && !hasAcceptedShadowSpectreTerms()) {
      setShowShadowSpectreTerms(true);
    }
  }, [chatMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    if (keys.length === 0 && !aiConfig.useCustomKey && loadCustomAiConfig().usePlatformDefault) return;
    setAiProvider(resolveActiveUiProvider(keys, aiConfig));
  }, [keys, aiConfig.useCustomKey, aiConfig.preferredProvider]);

  const hasKeyForProvider = useCallback(
    (p: AIProvider) => hasStoredKeyForProvider(p, keys),
    [keys],
  );

  const handleProviderChange = useCallback(
    async (next: AIProvider) => {
      if (next === "shadowtalk") {
        setAiProvider("shadowtalk");
        return;
      }

      if (next === "lovable") {
        await switchToPlatformDefault();
        saveCustomAiConfig({ ...loadCustomAiConfig(), usePlatformDefault: true, apiKey: "" });
        setAiProvider("lovable");
        return;
      }

      if (!hasStoredKeyForProvider(next, keys)) {
        setPendingByokProvider(next);
        setByokDialogOpen(true);
        return;
      }

      setAiProvider(next);
      const serverId = next === "gemini" ? "google" : null;
      if (serverId && keys.some((k) => k.provider === serverId && k.verified_at)) {
        await setDefault(serverId);
      }
    },
    [keys, setDefault, switchToPlatformDefault],
  );

  const handleByokSaved = useCallback(
    async (saved: AIProvider) => {
      setAiProvider(saved);
      await refreshApiKeys();
      setPendingByokProvider(null);
    },
    [refreshApiKeys],
  );

  useEffect(() => {
    if (chatPrefsLoading || appliedChatDefaults.current) return;
    appliedChatDefaults.current = true;
    setAiProvider(chatPreferences.defaultProvider);
    setPersonality(chatPreferences.defaultPersonality as Personality);
    setChatMode(chatPreferences.defaultMode);
    applyChatDefaultsOnce((defaults) => {
      if (defaults.mode) setChatMode(defaults.mode as ChatMode);
      if (defaults.personality) setPersonality(defaults.personality as Personality);
    });
  }, [chatPrefsLoading, chatPreferences, applyChatDefaultsOnce]);

  const learnFromTurn = useCallback(
    (userMsg: string, assistantReply: string | undefined, conversationId: string) => {
      if (!assistantReply?.trim()) return;
      if (user) {
        void extractMemories(userMsg, assistantReply);
        void extractKnowledge(userMsg, assistantReply, conversationId);
      }
      learnPersonalExampleFromTurn(userMsg, assistantReply);
    },
    [extractMemories, extractKnowledge, user],
  );

  useEffect(() => {
    const prompt = searchParams.get("q");
    if (prompt?.trim()) {
      setMessage(prompt.trim());
    }
  }, [searchParams]);

  useEffect(() => {
    const convId = searchParams.get("conversation");
    if (convId) {
      void loadConversation(convId);
    }
  }, [searchParams]);

  const activateMarketplaceAgent = useCallback((agent: MarketplaceAgent) => {
    const runtime = resolveAgentRuntime(agent);
    if (!runtime) return;
    setActiveMarketplaceAgent(agent);
    setActiveMarketplaceAgentState(agent);
    marketplaceRuntimeRef.current = runtime;
    if (runtime.chatMode) setChatMode(runtime.chatMode);
    if (runtime.personality) setPersonality(runtime.personality);
    setCurrentConversationId(null);
    setMessages([
      {
        id: "agent-welcome",
        type: "ai",
        content: runtime.welcomeMessage ?? `**${agent.name}** is now active. Ask anything in this specialty.`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    const agentId = searchParams.get("agent") ?? getActiveMarketplaceSession()?.agentId;
    if (!agentId) {
      setActiveMarketplaceAgentState(null);
      marketplaceRuntimeRef.current = null;
      return;
    }

    const fromCatalog = getAgentById(agentId);
    if (fromCatalog) {
      activateMarketplaceAgent(fromCatalog);
      return;
    }

    if (marketplaceCatalogLoading) return;

    void backend
      .from("marketplace_agents")
      .select("*")
      .eq("id", agentId)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) activateMarketplaceAgent(data as MarketplaceAgent);
      });
  }, [searchParams, marketplaceAgents, marketplaceCatalogLoading, getAgentById, activateMarketplaceAgent]);

  const clearMarketplaceAgentSession = useCallback(() => {
    setActiveMarketplaceAgentState(null);
    marketplaceRuntimeRef.current = null;
    clearActiveMarketplaceAgent();
  }, []);

  useEffect(() => {
    const offlineSession = getOfflineSession();
    if (user || offlineSession) {
      loadConversations();
      checkSubscription();
    }
  }, [user]);

  const conversationIsArchived = (conv: Conversation) =>
    isConversationArchived(conv.id, conv.archived_at, guestArchivedIds);

  const loadConversations = async () => {
    if (!user) return;
    const { data, error } = await backend
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (data && !error) {
      const rows = await Promise.all(
        data.map(async (c) => ({
          ...c,
          title: await chatPrivate.resolveDisplayText(c.title || "Untitled"),
          archived_at: (c as Conversation).archived_at ?? null,
        })),
      );
      setConversations(rows);
      const active = rows.filter(
        (c) => !isConversationArchived(c.id, c.archived_at, guestArchivedIds),
      );
      if (active.length > 0 && !currentConversationId) {
        loadConversation(active[0].id);
      } else if (active.length === 0) {
        setMessages([{ id: 'welcome', type: 'ai', content: getWelcomeMessage(), timestamp: new Date() }]);
      }
    }
  };

  const loadConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    const { data, error } = await backend
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (data && !error) {
      const loadedMessages: Message[] = await Promise.all(
        data.map(async (m) => ({
          id: m.id,
          type: m.role === "user" ? "user" : "ai",
          content: await chatPrivate.resolveDisplayText(m.content),
          timestamp: new Date(m.created_at),
        })),
      );
      setMessages(
        loadedMessages.length === 0
          ? [{ id: "welcome", type: "ai", content: getWelcomeMessage(), timestamp: new Date() }]
          : loadedMessages,
      );
    }
  };

  const getWelcomeMessage = () => {
    if (!hasChattedBefore() && getSuccessfulSessionCount() === 0) {
      return "👋 Welcome to ShadowTalk! Tap a prompt below or type a message — I'll reply in seconds.";
    }
    return "👋 Welcome back! Your neural workspace is ready.";
  };

  const welcomeMessage = (): Message => ({
    id: "welcome",
    type: "ai",
    content: getWelcomeMessage(),
    timestamp: new Date(),
  });

  const isGuestConversationId = (id: string | null) =>
    !!id && (id.startsWith("guest-") || !user);

  const resetToNewChat = () => {
    setCurrentConversationId(null);
    setMessages([welcomeMessage()]);
    setMessage("");
    setSelectedFile(null);
    clearMarketplaceAgentSession();
  };

  const handleNewChat = () => {
    resetToNewChat();
    setShowSidebar(false);
    toast({ title: "New chat", description: "Started a fresh conversation." });
  };

  const handleClearCurrentChat = async () => {
    const convId = currentConversationId;
    if (!convId) {
      resetToNewChat();
      return;
    }

    if (isGuestConversationId(convId)) {
      resetToNewChat();
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      const guestConvId = `guest-${Date.now()}`;
      setCurrentConversationId(guestConvId);
      setConversations([{ id: guestConvId, title: "Guest Conversation", created_at: new Date().toISOString() }]);
      toast({ title: "Chat cleared" });
      return;
    }

    if (!user) return;

    const { error: msgError } = await backend
      .from("messages")
      .delete()
      .eq("conversation_id", convId)
      .eq("user_id", user.id);

    if (msgError) {
      const { error: convError } = await backend
        .from("conversations")
        .delete()
        .eq("id", convId)
        .eq("user_id", user.id);
      if (convError) {
        toast({ title: "Could not clear chat", description: convError.message, variant: "destructive" });
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      resetToNewChat();
    } else {
      await backend
        .from("conversations")
        .update({ title: "New Chat", updated_at: new Date().toISOString() })
        .eq("id", convId)
        .eq("user_id", user.id);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: "New Chat" } : c)),
      );
      setMessages([welcomeMessage()]);
    }

    toast({ title: "Chat cleared", description: "Messages in this conversation were removed." });
    setShowSidebar(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (isGuestConversationId(conversationId)) {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (currentConversationId === conversationId) resetToNewChat();
      return;
    }

    if (!user) return;

    const { error } = await backend
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

    const wasActive = currentConversationId === conversationId;
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== conversationId);
      if (wasActive) {
        if (next.length > 0) {
          void loadConversation(next[0].id);
        } else {
          resetToNewChat();
        }
      }
      return next;
    });
    toast({ title: "Conversation deleted" });
  };

  const switchAfterArchive = (archivedId: string, guestArchiveSet = guestArchivedIds) => {
    if (currentConversationId !== archivedId) return;
    const active = conversations.filter(
      (c) =>
        c.id !== archivedId &&
        !isConversationArchived(c.id, c.archived_at, guestArchiveSet),
    );
    if (active.length > 0) {
      void loadConversation(active[0].id);
    } else {
      resetToNewChat();
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    const archivedAt = new Date().toISOString();

    if (isGuestConversationId(conversationId)) {
      const next = new Set(guestArchivedIds);
      next.add(conversationId);
      setGuestArchivedIdsState(next);
      setGuestArchivedIds(next);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, archived_at: archivedAt } : c)),
      );
      switchAfterArchive(conversationId, next);
      toast({ title: "Chat archived", description: "Find it under Archived in history." });
      return;
    }

    if (!user) return;

    const { error } = await backend
      .from("conversations")
      .update({ archived_at: archivedAt } as never)
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Could not archive", description: error.message, variant: "destructive" });
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, archived_at: archivedAt } : c)),
    );
    switchAfterArchive(conversationId);
    toast({ title: "Chat archived", description: "Find it under Archived in history." });
  };

  const handleUnarchiveConversation = async (conversationId: string) => {
    if (isGuestConversationId(conversationId)) {
      const next = new Set(guestArchivedIds);
      next.delete(conversationId);
      setGuestArchivedIdsState(next);
      setGuestArchivedIds(next);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, archived_at: null } : c)),
      );
      toast({ title: "Chat restored", description: "Moved back to your active chats." });
      return;
    }

    if (!user) return;

    const { error } = await backend
      .from("conversations")
      .update({ archived_at: null } as never)
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Could not restore", description: error.message, variant: "destructive" });
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, archived_at: null } : c)),
    );
    toast({ title: "Chat restored", description: "Moved back to your active chats." });
  };

  const handleClearAllChats = async () => {
    if (!user) {
      const guestConvId = `guest-${Date.now()}`;
      setConversations([{ id: guestConvId, title: "Guest Conversation", created_at: new Date().toISOString() }]);
      setCurrentConversationId(guestConvId);
      setMessages([
        {
          id: "welcome",
          type: "ai",
          content: "👋 Welcome to ShadowTalk AI! Your neural workspace is ready for guest access.",
          timestamp: new Date(),
        },
      ]);
      setShowSidebar(false);
      toast({ title: "All chats cleared" });
      return;
    }

    const { error } = await backend.from("conversations").delete().eq("user_id", user.id);

    if (error) {
      toast({ title: "Could not delete chats", description: error.message, variant: "destructive" });
      return;
    }

    setConversations([]);
    resetToNewChat();
    setShowSidebar(false);
    toast({ title: "All chats deleted", description: "Your conversation history was cleared." });
  };

  const ensureConversation = async (): Promise<string | null> => {
    if (!user) return currentConversationId;
    if (currentConversationId) return currentConversationId;

  if (!user || isAnonymous) {
    const localId = `local-${crypto.randomUUID()}`;
    setCurrentConversationId(localId);
    setConversations((prev) => [
      { id: localId, title: "Private Chat", created_at: new Date().toISOString() },
      ...prev,
    ]);
    return localId;
  }

    const titleToSave = chatPrivate.active
      ? await chatPrivate.wrapForStorage("New Chat")
      : "New Chat";
    const { data, error } = await backend
      .from('conversations')
      .insert({ user_id: user.id, title: titleToSave })
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Could not start chat", description: "Try again in a moment.", variant: "destructive" });
      return null;
    }

    setCurrentConversationId(data.id);
    const displayTitle = chatPrivate.active
      ? "Private Chat"
      : (await chatPrivate.resolveDisplayText(data.title || "New Chat")) || "New Chat";
    setConversations((prev) => [
      { id: data.id, title: displayTitle, created_at: data.created_at },
      ...prev,
    ]);
    return data.id;
  };

  const resolveConversationId = async (): Promise<string | null> => {
    const hasRealUser = user && !isAnonymous;
    if (hasRealUser) {
      const id = await ensureConversation();
      if (!id) {
        toast({
          title: "Could not start chat",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
        recordFunnelEvent("send_blocked", "ensure_conversation_failed");
      }
      return id;
    }
    if (currentConversationId) return currentConversationId;
    const guestConvId = `guest-${Date.now()}`;
    setCurrentConversationId(guestConvId);
    setConversations((prev) => [
      { id: guestConvId, title: "Guest Conversation", created_at: new Date().toISOString() },
      ...prev,
    ]);
    return guestConvId;
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant', conversationId: string) => {
    if (!user || !conversationId || !shouldPersistChatToCloud()) return null;

    const contentToSave = await chatPrivate.wrapForStorage(content);
    const { data } = await backend
      .from('messages')
      .insert({ conversation_id: conversationId, user_id: user.id, content: contentToSave, role, personality })
      .select().single();
    
    if (role === 'user' && messages.length <= 1) {
      const titlePlain = content.trim().split(/\s+/).slice(0, 3).join(' ').slice(0, 25) || 'New Chat';
      const title = await chatPrivate.wrapForStorage(titlePlain);
      await backend.from('conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', conversationId);
      const displayTitle = chatPrivate.active
        ? "Private Chat"
        : titlePlain;
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: displayTitle } : c));
    }
    return data;
  };

  const handleEnableChatEncryption = async () => {
    let conversationId = currentConversationId;
    if (user && !conversationId) {
      conversationId = await ensureConversation();
    }
    if (!conversationId && !user) {
      const guestConvId = `guest-${Date.now()}`;
      setCurrentConversationId(guestConvId);
      setConversations((prev) => [
        { id: guestConvId, title: "Private Chat", created_at: new Date().toISOString() },
        ...prev,
      ]);
      conversationId = guestConvId;
    }
    if (!conversationId) return;

    const ok = await chatPrivate.enablePrivateMode({
      conversationId,
      messages: messages.filter((m) => m.id !== "welcome"),
      isGuest: isGuestConversationId(conversationId),
    });
    if (!ok) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, title: "Private Chat" } : c,
      ),
    );
    if (user && !isGuestConversationId(conversationId)) {
      await loadConversation(conversationId);
    }
  };

  type ChatCompletionMessage = {
    role: string;
    content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
  };

  const runChatCompletion = useCallback(
    async (
      chatMessages: ChatCompletionMessage[],
      conversationId: string,
      chatFlags?: {
        webSearch?: boolean;
        searchQuery?: string;
        deepResearch?: boolean;
        researchQuery?: string;
      },
    ): Promise<string | undefined> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let augmented = prependAgentSystemPrompt(chatMessages, marketplaceRuntimeRef.current);
      augmented = prependChatKnowledgeContext(
        augmented,
        user?.email,
        user?.user_metadata?.full_name as string | undefined,
      );
      const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === "user");
      const lastUser =
        typeof lastUserMsg?.content === "string"
          ? lastUserMsg.content.trim()
          : Array.isArray(lastUserMsg?.content)
            ? (lastUserMsg.content.find((p) => p.type === "text") as { text?: string } | undefined)?.text?.trim() ?? ""
            : "";

      augmented = prependPersonalModelToMessages(
        augmented,
        getActivePersonalModel(),
        lastUser,
      );

      const userMemoryContext = await buildMemoryContextForUser(user);
      if (userMemoryContext) {
        augmented = [{ role: "system", content: userMemoryContext }, ...augmented];
      }

      if (aiProvider === "shadowtalk" && sovereignModel.enabled && lastUser) {
        const learned = await sovereignModel.getLearnedSystemPrompt(lastUser);
        if (learned) {
          augmented = [{ role: "system", content: learned }, ...augmented];
        }
      }

      const routerMessages: RouterMessage[] = augmented.map((m) => ({
        role: m.role as RouterMessage["role"],
        content: typeof m.content === "string"
          ? m.content
          : (m.content.find((p) => p.type === "text") as { text?: string } | undefined)?.text ?? "",
      }));

      if (chatMode === "shadowspectre") {
        if (!user || isAnonymous) {
          throw new Error("Sign in required to use ShadowSpectre.");
        }
        if (!hasAcceptedShadowSpectreTerms()) {
          setShowShadowSpectreTerms(true);
          throw new Error("Accept ShadowSpectre authorized-use terms to continue.");
        }
        if (!canUseCloudAI()) {
          throw new Error(DEVICE_ONLY_BLOCKED_MESSAGE);
        }

        const head = routeShadowSpectreHead(lastUser);
        setShadowSpectreHead(head);
        const aiMessageId = crypto.randomUUID();
        let assistantContent = "";
        const streamToken = (token: string) => {
          assistantContent += token;
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === aiMessageId);
            if (exists) {
              return prev.map((m) =>
                m.id === aiMessageId ? { ...m, content: assistantContent } : m,
              );
            }
            return [
              ...prev,
              { id: aiMessageId, type: "ai", content: assistantContent, timestamp: new Date() },
            ];
          });
        };

        const spectre = await streamShadowSpectre({
          messages: routerMessages,
          head,
          authorization: getShadowSpectreScope(),
          onToken: streamToken,
          signal: controller.signal,
        });
        setShadowSpectreHead(spectre.head);
        if (lastUser) {
          void indexSovereignMemory(lastUser, { category: "chat", source: "user" });
        }
        void indexSovereignMemory(spectre.content, { category: "chat", source: "assistant" });
        if (user) {
          void saveMessage(spectre.content, "assistant", conversationId);
        }
        return spectre.content;
      }

      const hasMultimodalImage = chatMessages.some((m) => Array.isArray(m.content));
      if (user && !isAnonymous) {
        ensureAutoCloudUntilLocalReady();
      }

      const route = decideRoute(routerMessages, navigator.onLine);
      const useLocal =
        !hasMultimodalImage &&
        (route.target === "local" ||
          route.backend === "ollama" ||
          (aiProvider === "shadowtalk" && isAnyLocalModelReady()));
      if (useLocal) {
        if (!isAnyLocalModelReady() && route.backend !== "ollama") {
          prewarmFastestLocalPath();
        }

        const localMessages = await augmentMessagesWithLocalMemory(routerMessages);
        const lastUserText =
          [...routerMessages].reverse().find((m) => m.role === "user")?.content ?? "";

        const aiMessageId = crypto.randomUUID();
        let assistantContent = "";

        const streamToken = (token: string) => {
          assistantContent += token;
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === aiMessageId);
            if (exists) {
              return prev.map((m) =>
                m.id === aiMessageId ? { ...m, content: assistantContent } : m,
              );
            }
            return [
              ...prev,
              { id: aiMessageId, type: "ai", content: assistantContent, timestamp: new Date() },
            ];
          });
        };

        if (route.backend === "ollama") {
          try {
            const ollama = await runOllamaChat(localMessages, streamToken);
            if (ollama.ok && (assistantContent || ollama.content)) {
              const final = assistantContent || ollama.content;
              if (lastUserText) {
                void indexSovereignMemory(lastUserText, { category: "chat", source: "user" });
              }
              void indexSovereignMemory(final, { category: "chat", source: "assistant" });
              if (user) {
                void saveMessage(final, "assistant", conversationId);
              }
              void maybeReflectAndPersist({ user }, messages.map((m) => ({ role: m.type === "ai" ? "assistant" : "user", content: m.content })));
              return final;
            }
            if (isSovereignModeEnabled() || !canUseCloudAI()) {
              throw new Error(ollama.error ?? "Ollama chat failed on-device");
            }
            console.warn("[Chat] Ollama path failed, trying browser/cloud:", ollama.error);
          } catch (e) {
            if (isSovereignModeEnabled() || !canUseCloudAI()) {
              throw e instanceof Error ? e : new Error("Ollama unavailable on-device");
            }
            console.warn("[Chat] Ollama path failed:", e);
          }
        }

        const offline = await runOfflineCompletion({
          messages: localMessages,
          personality,
          isOnline: navigator.onLine,
          onToken: streamToken,
        });

        if (offline?.content) {
          const useCloudInstead =
            offline.source === "fallback" && canUseCloudAI() && navigator.onLine;
          if (!useCloudInstead) {
            if (!assistantContent) {
              streamToken(offline.content);
            }
            if (lastUserText) {
              void indexSovereignMemory(lastUserText, { category: "chat", source: "user" });
            }
            void indexSovereignMemory(offline.content, { category: "chat", source: "assistant" });
            if (user) {
              void saveMessage(offline.content, "assistant", conversationId);
            }
            return assistantContent || offline.content;
          }
        }

        if (isAnyLocalModelReady()) {
          try {
            const { content } = await runLocalChat(localMessages, streamToken);
            if (content) {
              if (lastUserText) {
                void indexSovereignMemory(lastUserText, { category: "chat", source: "user" });
              }
              void indexSovereignMemory(content, { category: "chat", source: "assistant" });
            }
            if (content && user) {
              void saveMessage(content, "assistant", conversationId);
            }
            const reply = assistantContent || content;
            if (reply) {
              void maybeReflectAndPersist({ user }, messages.map((m) => ({ role: m.type === "ai" ? "assistant" : "user", content: m.content })));
            }
            return reply;
          } catch (e) {
            if (isSovereignModeEnabled() || !canUseCloudAI()) {
              throw e instanceof Error ? e : new Error("Local chat failed on-device");
            }
            console.warn("[Chat] Local turbo path failed, using cloud:", e);
          }
        }

        if (isSovereignModeEnabled() || !canUseCloudAI()) {
          throw new Error(
            canUseCloudAI()
              ? "Sovereign mode is on but no local model responded. Install Ollama, pull a model in Settings → Offline AI, then retry."
              : DEVICE_ONLY_BLOCKED_MESSAGE,
          );
        }
      }

      if (!canUseCloudAI()) {
        throw new Error(DEVICE_ONLY_BLOCKED_MESSAGE);
      }

      // Ollama default provider — last chance before cloud for non-complex chat
      if (!hasMultimodalImage && shouldPreferOllamaInference()) {
        const aiMessageId = crypto.randomUUID();
        let assistantContent = "";
        const streamToken = (token: string) => {
          assistantContent += token;
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === aiMessageId);
            if (exists) {
              return prev.map((m) =>
                m.id === aiMessageId ? { ...m, content: assistantContent } : m,
              );
            }
            return [
              ...prev,
              { id: aiMessageId, type: "ai", content: assistantContent, timestamp: new Date() },
            ];
          });
        };
        try {
          const ollama = await runOllamaChat(routerMessages, streamToken, controller.signal);
          if (ollama.ok && (assistantContent || ollama.content)) {
            const final = assistantContent || ollama.content;
            const lastUserText =
              [...routerMessages].reverse().find((m) => m.role === "user")?.content ?? "";
            if (lastUserText) {
              void indexSovereignMemory(lastUserText, { category: "chat", source: "user" });
            }
            void indexSovereignMemory(final, { category: "chat", source: "assistant" });
            if (user) {
              void saveMessage(final, "assistant", conversationId);
            }
            void maybeReflectAndPersist({ user }, messages.map((m) => ({ role: m.type === "ai" ? "assistant" : "user", content: m.content })));
            return final;
          }
        } catch (e) {
          console.warn("[Chat] Ollama default provider unavailable, using cloud:", e);
        }
      }

      const chatUrl = getChatFunctionUrl();
      if (!chatUrl || !isCloudConfigured()) {
        throw new Error(
          `Chat is not configured for this build. ${DESKTOP_ENV_SETUP_HINT}`,
        );
      }

      const { data: { session } } = await backend.auth.getSession();
      const learnedHint = getChatDefaults()?.systemHintAddon;
      const memoryContext = getMemoryContext();
      const businessMemory = [learnedHint, memoryContext].filter(Boolean).join("\n").trim();
      const hasUserContext = Boolean(
        userContext.country ||
          userContext.city ||
          userContext.incomeRange ||
          userContext.employmentStatus ||
          userContext.familyStatus ||
          userContext.recentLifeEvents.length,
      );

      const requestBody = stringifyChatBody({
        messages: augmented,
        personality,
        mode: chatMode,
        ...buildChatProviderPayload(aiProvider, aiConfig, keys),
        ...(businessMemory ? { businessMemory } : {}),
        ...(hasUserContext
          ? {
              userContext: {
                country: userContext.country || undefined,
                city: userContext.city || undefined,
                incomeRange: userContext.incomeRange || undefined,
                employmentStatus: userContext.employmentStatus || undefined,
                familyStatus: userContext.familyStatus || undefined,
                recentLifeEvents: userContext.recentLifeEvents.length
                  ? userContext.recentLifeEvents
                  : undefined,
              },
            }
          : {}),
        ...(chatFlags?.webSearch
          ? { webSearch: true, searchQuery: chatFlags.searchQuery }
          : {}),
        ...(chatFlags?.deepResearch
          ? { deepResearch: true, researchQuery: chatFlags.researchQuery }
          : {}),
      });

      const raiseChatHttpError = async (status: number, rawBody: string) => {
        let detail = "Chat request failed";
        let needsByok = false;
        try {
          const errJson = JSON.parse(rawBody);
          detail = typeof errJson.error === "string" ? errJson.error : detail;
          needsByok = errJson?.needsByok === true || errJson?.code === "PLATFORM_CREDITS_EXHAUSTED";
        } catch {
          detail = rawBody || detail;
        }
        if (status === 402 && needsByok) {
          saveCustomAiConfig({ ...loadCustomAiConfig(), usePlatformDefault: false, provider: '' as const, apiKey: '' });
          setAiProvider('shadowtalk');
          toast({
            title: 'Switching to local AI',
            description: 'Platform credits are exhausted. Continuing on-device with Ollama/local ShadowTalk.',
          });
          const offline = await runOfflineCompletion({
            messages: chatMessages.map((m) => ({ role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as 'assistant' | 'system' | 'user', content: typeof m.content === 'string' ? m.content : '' })),
            personality,
            isOnline: navigator.onLine,
            onToken: (token) => pushAssistant(token),
          });
          if (offline?.content.trim()) {
            finalizeAssistant();
            return assistantContent;
          }
        }
        throw new Error(detail);
      };

      const aiMessageId = crypto.randomUUID();
      let assistantContent = "";

      // SPEED: coalesce setMessages calls to one per frame so streaming
      // doesn't trigger a full React reconcile on every SSE chunk.
      let pendingContent: string | null = null;
      let rafId: number | null = null;
      const flushAssistant = () => {
        rafId = null;
        if (pendingContent === null) return;
        const content = pendingContent;
        pendingContent = null;
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === aiMessageId);
          if (exists) {
            return prev.map((m) =>
              m.id === aiMessageId ? { ...m, content } : m,
            );
          }
          return [
            ...prev,
            { id: aiMessageId, type: "ai", content, timestamp: new Date() },
          ];
        });
      };
      const pushAssistant = (content: string) => {
        assistantContent = content;
        pendingContent = content;
        if (rafId === null) {
          rafId = typeof requestAnimationFrame !== "undefined"
            ? requestAnimationFrame(flushAssistant)
            : (setTimeout(flushAssistant, 16) as unknown as number);
        }
      };
      const finalizeAssistant = () => {
        if (rafId !== null) {
          if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(rafId);
          else clearTimeout(rafId as unknown as number);
          rafId = null;
        }
        if (pendingContent !== null) flushAssistant();
      };

      // ---- SHADOWTALK-TURBO FAST PATH ----
      // Try direct Groq streaming first (bypasses edge function, ~5x faster TTFB).
      // Falls through to standard path if no Groq key or if Turbo fails.
      const turboKey = resolveTurboKey();
      const turboUserText =
        [...routerMessages].reverse().find((m) => m.role === "user")?.content ?? "";
      if (
        turboKey &&
        !hasMultimodalImage &&
        !chatFlags?.webSearch &&
        !chatFlags?.deepResearch &&
        typeof turboUserText === "string" &&
        turboUserText.trim().length > 0
      ) {
        try {
          const turboResult = await turboComplete(
            `You are ShadowTalk AI. Be ${personality || 'friendly'} and helpful. Use markdown formatting. Current date: ${new Date().toISOString().split('T')[0]}.`,
            turboUserText,
            {
              signal: controller.signal,
              onDelta: (accumulated) => pushAssistant(accumulated),
            },
          );
          if (turboResult.source !== 'fallback' && turboResult.content.trim()) {
            finalizeAssistant();
            return assistantContent;
          }
          // Turbo returned empty/fallback — fall through to standard path
        } catch (turboErr) {
          console.warn('[Chat] Turbo fast-path failed, using standard:', turboErr);
        }
      }

      if (isShadowTalkDesktop()) {
        let lineBuffer = "";
        const end = await desktopChatStream(
          chatUrl,
          requestBody,
          session?.access_token,
          controller.signal,
          (chunk) => {
            lineBuffer += chunk;
            const lines = lineBuffer.split("\n");
            lineBuffer = lines.pop() ?? "";
            const next = parseSseContentLines(lines, assistantContent);
            if (next !== assistantContent) pushAssistant(next);
          },
        );
        if (!end.ok) {
          await raiseChatHttpError((end as unknown as { status?: number }).status ?? 500, (end as unknown as { body?: string }).body);
        }
      } else {
        const resp = await selfHealedFetch(chatUrl, {
          method: "POST",
          headers: getChatFetchHeaders(session?.access_token),
          signal: controller.signal,
          body: requestBody,
        });

        if (!resp.ok) {
          const cloudFailed = new Error((await resp.text().catch(() => "")) || "Cloud chat failed");
          const localCandidates = runOfflineCompletion({
            messages: chatMessages.map((m) => ({ role: (m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user") as "assistant" | "system" | "user", content: typeof m.content === "string" ? m.content : "" })),
            personality,
            isOnline: navigator.onLine,
            onToken: (token) => pushAssistant(token),
          });
          const local = await localCandidates;
          if (local && local.content.trim()) {
            finalizeAssistant();
            return assistantContent;
          }
          await raiseChatHttpError(resp.status, cloudFailed.message);
        }

        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("text/event-stream")) {
          await raiseChatHttpError(resp.status, await resp.text().catch(() => ""));
        }

        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";
          const next = parseSseContentLines(lines, assistantContent);
          if (next !== assistantContent) pushAssistant(next);
        }
      }

      finalizeAssistant();
      // SPEED: don't block UI on DB write — fire and forget.
      if (assistantContent && user) {
        void saveMessage(assistantContent, "assistant", conversationId).catch((e) =>
          console.warn("[chat] saveMessage(assistant) failed", e),
        );
      }
      if (assistantContent.trim().length > 0) {
        recordSuccessfulChatSession();
        recordFunnelEvent("first_reply");
        markHasChatted();
      }
      return assistantContent || undefined;
    },
    [aiProvider, aiConfig, keys, chatMode, personality, user, gemmaOffline.chatLocal, sovereignModel, getChatDefaults, getMemoryContext],
  );

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    toast({ title: "Stopped", description: "Generation cancelled." });
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    const target = messages[index];
    if (!target || target.type !== "user") return;

    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, content: trimmed } : m)),
    );

    if (user && currentConversationId && !isGuestConversationId(currentConversationId)) {
      await backend
        .from("messages")
        .update({ content: trimmed })
        .eq("id", target.id)
        .eq("user_id", user.id);
    }
    toast({ title: "Message updated" });
  };

  const handleRegenerateMessage = async (index: number) => {
    const target = messages[index];
    if (!target || target.type !== "ai" || isLoading) return;

    const prior = messages.slice(0, index);
    const chatMessages = prior
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }));

    if (chatMessages.length === 0) return;

    const conversationId = await resolveConversationId();
    if (!conversationId) return;

    setMessages(prior);
    setIsLoading(true);

    try {
      await runChatCompletion(chatMessages, conversationId);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Regeneration failed.";
      toast({ title: "Regeneration failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const msgContent = (overrideText ?? message).trim();
    if ((!msgContent && !selectedFile) || isLoading) return;

    const isGuestLike = !user || isAnonymous;
    if (isGuestLike && !isAnonymousAutonomousEnabled()) {
      if (guestUsage.isLoaded && !guestUsage.canPerform("chats")) {
        toast({ title: "Guest chat limit", description: "Sign in later to lift limits; continuing now." });
      }
      if (guestUsage.isLoaded) {
        guestUsage.trackGuestAction("chats");
      }
    }

    if (!isProOrHigher && dailyLimits.isLoaded && !dailyLimits.canPerform("messages") && !isAnonymousAutonomousEnabled()) {
      // Soft downgrade: keep chat flowing for anonymous users.
    }

    recordFunnelEvent("first_send_attempt");
    markHasChatted();

    const conversationId = await resolveConversationId();
    if (!conversationId) {
      recordFunnelEvent("send_blocked", "no_conversation_id");
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: "user",
      content: msgContent,
      timestamp: new Date(),
      attachment: selectedFile || undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) {
      setMessage("");
    }
    setSelectedFile(null);
    setIsLoading(true);
    // SPEED: persist user message in the background; don't block the AI call on a DB write.
    if (user) void saveMessage(msgContent, "user", conversationId).catch((e) =>
      console.warn("[chat] saveMessage(user) failed", e),
    );

    if (!isProOrHigher) {
      if (user && dailyLimits.isLoaded) {
        dailyLimits.trackUsage("messages");
      } else {
        setDailyChats(incrementDailyMessageCount());
      }
    }

    const chatMessages: Array<{
      role: string;
      content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    }> = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }));
    chatMessages.push({ role: "user", content: msgContent });


    void captureChatSend(msgContent, chatMode, personality, Boolean(userMessage.attachment));

    if (user) {
      for (const g of upsertGoalsFromMessage(msgContent)) {
        void syncGoalToAiMemories(user.id, g);
      }
    }

    const imageAttachment =
      userMessage.attachment?.type === "image" ? userMessage.attachment : null;

    if (imageAttachment) {
      const imageIntent = detectChatImageIntent(msgContent);

      if (imageIntent === "edit" || imageIntent === "analyze") {
        const statusId = crypto.randomUUID();
        const isEdit = imageIntent === "edit";
        setMessages((prev) => [
          ...prev,
          {
            id: statusId,
            type: "ai",
            content: isEdit ? "✏️ Editing your image…" : "🔍 Analyzing your image…",
            timestamp: new Date(),
            toolExecution: {
              tool: isEdit ? "image_edit" : "image_decoder",
              status: "running",
            },
          },
        ]);

        try {
          const result = isEdit
            ? await callChatImageEdit(
                imageAttachment.data,
                msgContent.trim() || "Enhance this image",
              )
            : await callChatImageAnalyze(imageAttachment.data);

          const reply =
            result.content ||
            (isEdit ? "Here is your edited image." : "Analysis complete.");

          setMessages((prev) =>
            prev.map((m) =>
              m.id === statusId
                ? {
                    ...m,
                    content: reply,
                    imageUrl: result.imageUrl,
                    toolExecution: {
                      tool: isEdit ? "image_edit" : "image_decoder",
                      status: "complete",
                      result: isEdit ? "Edited" : "Analyzed",
                    },
                  }
                : m,
            ),
          );
          if (user) void saveMessage(reply, "assistant", conversationId).catch(() => {});
          learnFromTurn(msgContent || "[image]", reply, conversationId);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Image processing failed.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === statusId
                ? {
                    ...m,
                    content: `Could not process the image: ${errMsg}`,
                    toolExecution: {
                      tool: isEdit ? "image_edit" : "image_decoder",
                      status: "error",
                    },
                  }
                : m,
            ),
          );
          toast({ title: "Image failed", description: errMsg, variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
        return;
      }

      chatMessages[chatMessages.length - 1] = buildVisionUserMessage(
        msgContent,
        imageAttachment.data,
      );

      try {
        const assistantReply = await runChatCompletion(chatMessages, conversationId);
        if (aiProvider === "shadowtalk" && sovereignModel.enabled) {
          void sovereignModel.learnFromTurn(msgContent, assistantReply);
        }
        learnFromTurn(msgContent || "[image]", assistantReply ?? "", conversationId);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const errMsg = formatChatFetchError(err);
          toast({ title: "Message failed", description: errMsg, variant: "destructive" });
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const execHint = detectShadowExecutionFromChat(msgContent);
    const route = resolveAutonomousRoute(msgContent, execHint, { preferSeeRouting });

    if (route.launchInChat) {
      try {
        trackAgenticEvent("mission_start", { source: "chat_autonomous", goal: msgContent.slice(0, 120) });
        void captureAutoImprove("see_launch", { goal: msgContent.slice(0, 80) });
        const state = await launchMissionFromChat(msgContent);
        if (state) {
          const intro =
            state.status === "completed" && state.result
              ? `**Autonomous mission complete.**\n\n${state.result}`
              : state.status === "paused"
                ? `**Mission paused** — approve the next step in the panel below, or open full execution.`
                : state.status === "failed"
                  ? `**Mission could not finish.** Open Shadow Execution to adjust the plan or retry.`
                  : `**Autonomous mission running** — multi-step plan in progress for: *${state.goal.slice(0, 100)}${state.goal.length > 100 ? "…" : ""}*`;
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "ai",
              content: intro,
              timestamp: new Date(),
              toolExecution: {
                tool: "shadow_execution",
                status: state.status === "completed" ? "complete" : "running",
                params: { goal: msgContent, mode: execHint.deliverableType },
                result: state.result ?? "In progress",
              },
            },
          ]);
          if (user) void saveMessage(intro, "assistant", conversationId).catch(() => {});
          if (state.result) learnFromTurn(msgContent, state.result, conversationId);
          trackAgenticEvent("mission_complete", { source: "chat_autonomous" });
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("[Autonomy] In-chat mission failed, falling back:", err);
      }
    }

    if (route.redirectToExecute) {
      goToExecute(msgContent, execHint.deliverableType);
      const label =
        execHint.deliverableType === "strategy_report"
          ? "Strategy report"
          : execHint.deliverableType === "research_brief"
            ? "Research brief"
            : "Shadow Execution";
      const routeMsg = `**${label}** fits this request better than a single chat reply — opening the execution workspace with your goal pre-filled. I'll run a visible plan with live web research and a saved deliverable.`;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "ai",
          content: routeMsg,
          timestamp: new Date(),
          toolExecution: {
            tool: "shadow_execution",
            status: "complete",
            params: { goal: msgContent, mode: execHint.deliverableType },
            result: label,
          },
        },
      ]);
      if (user) void saveMessage(routeMsg, "assistant", conversationId).catch(() => {});
      setIsLoading(false);
      return;
    }

    const toolDispatchUi = {
      openDeepResearch: (q?: string) => {
        setShowDeepResearch(true);
        if (q) setMessage(q);
      },
      openImageGenerator: () => setShowImageGenerator(true),
      openMusicGenerator: (prompt?: string) => {
        setMusicPrompt(prompt ?? "");
        setMusicAutoGenerate(Boolean(prompt));
        setShowMusicGenerator(true);
      },
      openAgenticRunner: (g: string) => goToExecute(g, "general"),
      openBrowser: () => setShowShadowBrowser(true),
      openShadowLive: () => setShowShadowTalkLive(true),
      openMissionControl: () => goToExecute(msgContent, "general"),
      openShadowExecution: (g: string, mode?: import("@/lib/execution/types").DeliverableType) =>
        goToExecute(g, mode),
      setPendingMessage: (text: string) => setMessage(text),
      appendAssistantMessage: (
        content: string,
        toolExecution?: {
          tool: string;
          status: "complete" | "confirm" | "running";
          params?: Record<string, string>;
          result?: string;
        },
      ) => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "ai",
            content,
            timestamp: new Date(),
            toolExecution,
          },
        ]);
        if (user) void saveMessage(content, "assistant", conversationId).catch(() => {});
      },
    };

    const { outcome: toolOutcome, executedStep } = await dispatchDetectionAsync(
      msgContent,
      toolDispatchUi,
    );

    if (toolOutcome.handled && toolOutcome.cognitiveLoop) {
      setCognitiveQuery(toolOutcome.query ?? msgContent);
      setShowCognitiveLoop(true);
      setIsLoading(false);
      return;
    }

    if (toolOutcome.handled) {
      const flags = toolOutcome.chatFlags;
      if (flags?.webSearch || flags?.deepResearch) {
        try {
          if (flags.webSearch) {
            void startBrowseSession(flags.searchQuery ?? msgContent).then(() =>
              setShowBrowseActivity(true),
            );
          }
          const assistantReply = await runChatCompletion(
            chatMessages,
            conversationId,
            flags,
          );
          learnFromTurn(msgContent, assistantReply, conversationId);
          if (user && !pushPermissionAskedRef.current && typeof Notification !== "undefined") {
            pushPermissionAskedRef.current = true;
            if (Notification.permission === "default") {
              void requestPermission().catch(() => {});
            }
          }
          if (assistantReply && isShareWorthyReply(assistantReply) && shouldShowChatShareBanner()) {
            setChatShareOffer({
              title: buildChatShareTitle(msgContent, assistantReply),
              subtitle: buildChatShareSubtitle(msgContent),
            });
            recordChatShareBannerShown();
          }

          if (executedStep && assistantReply) {
            const criticFollowUp = await continueFromCritic(
              msgContent,
              executedStep,
              assistantReply,
              toolDispatchUi,
            );
            if (criticFollowUp?.outcome.handled && criticFollowUp.outcome.cognitiveLoop) {
              setCognitiveQuery(criticFollowUp.outcome.query ?? msgContent);
              setShowCognitiveLoop(true);
              setIsLoading(false);
              return;
            }
            const followFlags =
              criticFollowUp && !criticFollowUp.outcome.handled
                ? criticFollowUp.outcome.chatFlags
                : undefined;
            if (followFlags?.webSearch || followFlags?.deepResearch) {
              const followReply = await runChatCompletion(chatMessages, conversationId, followFlags);
              learnFromTurn(msgContent, followReply, conversationId);
            }
          }
        } catch (err) {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            const msg = formatChatFetchError(err);
            toast({ title: "Message failed", description: msg, variant: "destructive" });
          }
        }
      }
      setIsLoading(false);
      return;
    }

    const toolDetection = toolOrchestrator.detectTool(msgContent);
    const appIntent =
      detectAppBuilderIntent(msgContent) ??
      (toolDetection.tool === "app_builder"
        ? {
            platform: (toolDetection.params?.platform === "mobile" ? "mobile" : "web") as
              | "web"
              | "mobile",
            confidence: toolDetection.confidence,
          }
        : null);

    if (appIntent && appIntent.confidence >= 50) {
      const platform = appIntent.platform;
      const statusId = crypto.randomUUID();
      const platformLabel = platform === "mobile" ? "mobile" : "web";
      setMessages((prev) => [
        ...prev,
        {
          id: statusId,
          type: "ai",
          content: `Building your **${platformLabel} app** in the Code IDE — generating HTML, CSS, and JavaScript…`,
          timestamp: new Date(),
          toolExecution: { tool: "app_builder", status: "running" },
        },
      ]);

      try {
        const { data: { session } } = await backend.auth.getSession();
        const project = await generateAppProject({
          prompt: msgContent,
          platform,
          accessToken: session?.access_token,
          personality,
          mode: "code",
          providerPayload: buildChatProviderPayload(aiProvider, aiConfig, keys),
        });

        openProjectInIde(
          {
            title: project.title,
            platform: project.platform,
            files: project.files,
          },
          { openPreview: true },
        );

        const summary =
          `**${project.title}** is ready in the Code IDE (${project.files.length} files).\n\n` +
          `${project.description || `A ${platformLabel} app based on your request.`}\n\n` +
          `Use **Preview** to run it live` +
          (platform === "mobile" ? " — switch to the **Mobile** viewport (375px) for the best view." : ".") +
          `\n\nAsk me to add features, new screens, or connect a backend anytime.`;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === statusId
              ? {
                  ...m,
                  content: summary,
                  toolExecution: { tool: "app_builder", status: "complete", result: project.title },
                }
              : m,
          ),
        );
        if (user) void saveMessage(summary, "assistant", conversationId);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "App generation failed.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === statusId
              ? {
                  ...m,
                  content: `Could not generate the app: ${errMsg}. Try again or open the IDE to start from a template.`,
                  toolExecution: { tool: "app_builder", status: "error" },
                }
              : m,
          ),
        );
        toast({ title: "App builder failed", description: errMsg, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const assistantReply = await runChatCompletion(chatMessages, conversationId);
      if (aiProvider === "shadowtalk" && sovereignModel.enabled) {
        void sovereignModel.learnFromTurn(msgContent, assistantReply);
      }
      learnFromTurn(msgContent, assistantReply, conversationId);
      if (assistantReply && isShareWorthyReply(assistantReply) && shouldShowChatShareBanner()) {
        setChatShareOffer({
          title: buildChatShareTitle(msgContent, assistantReply),
          subtitle: buildChatShareSubtitle(msgContent),
        });
        recordChatShareBannerShown();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = formatChatFetchError(err);
      if (msg.includes("Device-only mode") || msg.includes("Stay device-only")) {
        setShowInterimCloudConsent(true);
      }
      recordFunnelEvent("send_error", msg.slice(0, 80));
      toast({ title: "Message failed", description: msg, variant: "destructive" });
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: "ai", content: msg, timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isEmptyChat = messages.filter((m) => m.id !== "welcome").length === 0;
  const hasActiveChat = messages.some((m) => m.id !== "welcome");
  const userDisplayName = chatPrivate.anonymousUi
    ? "Anonymous"
    : user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const userInitials = chatPrivate.anonymousUi
    ? "?"
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : "G";

  const handleConfirmTool = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      const te = msg?.toolExecution;
      if (!te?.params?.goal) return;
      const mode = (te.params.mode as "general" | "strategy_report" | "research_brief" | "content_pack") || "general";
      goToExecute(te.params.goal, mode);
    },
    [messages, goToExecute],
  );

  const openChatShare = useCallback(
    (assistantContent: string, userPrompt?: string) => {
      const lastUser =
        userPrompt ??
        [...messages].reverse().find((m) => m.type === "user" && m.id !== "welcome")?.content ??
        "";
      const title = buildChatShareTitle(lastUser, assistantContent);
      setChatShareOffer({
        title,
        subtitle: buildChatShareSubtitle(lastUser),
        prompt: lastUser,
        answer: assistantContent,
      });
      setChatShareCustomLink(null);
      setChatShareDialogOpen(true);

      // Publish a public /s/:slug URL in the background so the dialog can
      // upgrade the copy-link and social buttons to point to the shareable page.
      void (async () => {
        try {
          const mod = await import("@/lib/growth/publishSharedAnswer");
          const published = await mod.publishSharedAnswer({
            prompt: lastUser || "AI conversation",
            answer: assistantContent,
            title,
            source: "chat",
          });
          setChatShareCustomLink(published.url);
        } catch {
          // silent: dialog falls back to default share link
        }
      })();
    },
    [messages],
  );


  const handleExport = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        conversationId: currentConversationId,
        personality,
        mode: chatMode,
        sharedVia: BRAND.fullName,
        inviteUrl: "https://www.shadowtalk-ai.com/chatbot?utm_source=export&utm_medium=json&utm_campaign=chat_export",
        messages: messages.map((m) => ({
          role: m.type,
          content: m.content,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shadowtalk-history-${currentConversationId || "chat"}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Downloaded chat history JSON." });
    } catch {
      toast({ title: "Export failed", description: "Could not export chat history.", variant: "destructive" });
    }
  };

  const insertAssistantToChat = useCallback(
    (content: string) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: "ai", content, timestamp: new Date() },
      ]);
      if (user && currentConversationId) {
        void saveMessage(content, "assistant", currentConversationId).catch(() => {});
      }
    },
    [user, currentConversationId],
  );

  useEffect(() => {
    const pending = consumePendingChatInsert();
    if (!pending) return;
    if (pending.startsWith("Execute this workspace")) {
      setMessage(pending);
      toast({ title: "Script loaded", description: "Review and send to run in chat." });
    } else {
      insertAssistantToChat(pending);
      toast({ title: "Inserted into chat", description: "Content added from Research or Browser." });
    }
  }, [insertAssistantToChat, toast]);

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      const text = completeQuickPrompt(prompt);
      recordFunnelEvent("quick_prompt", text.slice(0, 48));
      void handleSendMessage(text);
    },
    [handleSendMessage],
  );

  const handleCommandAction = (action: string) => {
    setShowCommandPalette(false);

    if (!CHAT_COMMAND_MODAL_ACTIONS.has(action)) {
      const navPath = CHAT_COMMAND_NAV_ROUTES[action];
      if (navPath) {
        navigate(navPath);
        return;
      }
    }

    switch (action) {
      case "new-chat":
        handleNewChat();
        return;
      case "deep-research":
        setShowDeepResearch(true);
        return;
      case "image":
        setShowImageGenerator(true);
        return;
      case "music":
        setMusicPrompt(message.trim());
        setMusicAutoGenerate(false);
        setShowMusicGenerator(true);
        return;
      case "google":
        setShowGoogleIntegration(true);
        return;
      case "shadowspectre":
        setChatMode("shadowspectre");
        setShowShadowSpectrePanel(true);
        return;
      case "voice":
        setShowShadowTalkLive(true);
        return;
      case "browser":
        setShowShadowBrowser(true);
        return;
      case "missions":
        navigate("/execute");
        return;
      case "agentic":
        setShowAgenticRunner(true);
        return;
      case "agent-workflows":
        setShowAgentWorkflows(true);
        return;
      case "analytics":
        setShowAnalytics(true);
        return;
      case "gemini-analytics":
        setShowGeminiAnalytics(true);
        return;
      case "organize":
        setShowDataOrganizer(true);
        return;
      case "knowledge-vault":
      case "knowledge-vault-modal":
        setShowKnowledgeVault(true);
        return;
      case "uncensored-arena":
        setShowUncensoredArena(true);
        return;
      case "shadow-cowork":
        setShowShadowCowork(true);
        return;
      case "offline-tools":
      case "offline":
        setShowOfflineTools(true);
        return;
      case "multi-model":
        setShowMultiModel(true);
        return;
      case "creative":
        setShowCreativeSynthesis(true);
        return;
      case "vision":
      case "camera":
        setShowVisualReasoning(true);
        return;
      case "image-decoder":
        setShowImageDecoder(true);
        return;
      case "planner":
        setShowDailyPlanner(true);
        return;
      case "eco":
        setShowPlanetaryActions(true);
        return;
      case "screen-agent":
        setShowScreenAgent(true);
        return;
      case "vision-agent":
        setShowVisionAgent(true);
        return;
      case "cognitive-loop":
        setCognitiveQuery(message.trim() || "Analyze this decision from multiple expert perspectives.");
        setShowCognitiveLoop(true);
        return;
      case "memory":
      case "memory-panel":
      case "intelligence-hub":
        setShowIntelligenceHub(true);
        return;
      case "bunker": {
        const enabled = localStorage.getItem("shadowtalk_bunker_mode") === "true";
        localStorage.setItem("shadowtalk_bunker_mode", enabled ? "false" : "true");
        window.dispatchEvent(
          new CustomEvent("shadowtalk-bunker-changed", { detail: { enabled: !enabled } }),
        );
        toast({
          title: !enabled ? "Bunker mode enabled" : "Bunker mode disabled",
          description: !enabled
            ? "Background model downloads can run when configured in Profile."
            : "Background downloads paused.",
        });
        return;
      }
      case "wordle":
        setShowWordle(true);
        return;
      case "branching":
        handleNewChat();
        toast({
          title: "New conversation branch",
          description: "Started a fresh thread — explore an alternate path from here.",
        });
        return;
      default:
        toast({
          title: "Try the chat tools menu",
          description: "Open Tools (⊞) in the header for more actions.",
        });
    }
  };

  const [promptSuggestion, setPromptSuggestion] = useState("");
  const chatInputProps = {
    message,
    onMessageChange: setMessage,
    onSend: () => void handleSendMessage(),
    onKeyPress: (e: React.KeyboardEvent) => e.key === "Enter" && void handleSendMessage(),
    isLoading,
    isListening,
    onToggleVoice: () => setShowShadowTalkLive(true),
    onOpenImageGenerator: () => setShowImageGenerator(true),
    onStopGeneration: handleStopGeneration,
    selectedFile,
    onFileSelect: setSelectedFile,
    chatMode,
    onModeChange: setChatMode,
    personality,
    layout: "composer" as const,
    aiProvider,
    onProviderChange: handleProviderChange,
    hasKeyForProvider,
    promptSuggestion,
    onPromptAccept: setMessage,
    onPromptClear: () => setPromptSuggestion(""),
  };

  if (enterprise.needsWorkEmailSignIn) {
    return (
      <div className="shadowtalk-chat-shell neural-bg flex flex-col" style={{ height: "var(--vvh, 100dvh)" }}>
        <SEOHead meta={PAGE_SEO.chatbot} structuredData={[...getFounderHomeStructuredData(), getChatbotFAQSchema(), getSpeakableSchema(["h1", "[data-speakable]"]), getWebSiteWithSearchSchema()]} />
        <ChatAmbientBackground />
        <EnterpriseEmployeeGate
          tenant={enterprise.tenant}
          orgName={enterprise.displayOrgName ?? "Your organization"}
        />
      </div>
    );
  }

  return (
    <div className="shadowtalk-chat-shell neural-bg settings-scroll-smooth flex h-full min-h-0 flex-col overflow-hidden">
      <SEOHead meta={PAGE_SEO.chatbot} structuredData={[...getFounderHomeStructuredData(), getChatbotFAQSchema(), getSpeakableSchema(["h1", "[data-speakable]"]), getWebSiteWithSearchSchema()]} />
      <ChatAmbientBackground />
      <motion.div
        className="shadowtalk-chat-main flex w-full min-h-0 flex-1 relative overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SETTINGS_SPRING}
      >
        <ChatShadowSidebar
          userInitials={userInitials}
          userDisplayName={userDisplayName}
          onNewChat={handleNewChat}
          onOpenHistory={() => setShowSidebar(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <ChatIconRail
          userInitials={userInitials}
          onNewChat={handleNewChat}
          onOpenHistory={() => setShowSidebar(true)}
          onOpenTools={() => setToolsMenuOpen(true)}
          onOpenSettings={() => navigate("/settings")}
          onOpenNav={() => setShowMobileNav(true)}
        />
        <ChatMobileNavDrawer
          open={showMobileNav}
          onClose={() => setShowMobileNav(false)}
          userInitials={userInitials}
          userDisplayName={userDisplayName}
          onNewChat={handleNewChat}
          onOpenHistory={() => setShowSidebar(true)}
        />
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.button
                type="button"
                aria-label="Close history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed top-0 right-0 bottom-0 z-40 bg-background/75 backdrop-blur-md"
                style={{ left: historyPanelLeft }}
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                initial={{ x: -320, opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                transition={SETTINGS_SPRING}
                className="fixed top-0 bottom-0 z-50 shadow-elevated"
                style={{ left: historyPanelLeft }}
              >
                <ConversationSidebar
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  isArchived={conversationIsArchived}
                  onCreateNew={handleNewChat}
                  onSelect={(id) => {
                    loadConversation(id);
                    setShowSidebar(false);
                  }}
                  onDelete={handleDeleteConversation}
                  onArchive={handleArchiveConversation}
                  onUnarchive={handleUnarchiveConversation}
                  onClearAll={handleClearAllChats}
                  onClearCurrent={handleClearCurrentChat}
                  onOpenSettings={() => {
                    setShowSidebar(false);
                    navigate("/settings");
                  }}
                  onOpenWorkspace={() => {
                    setShowSidebar(false);
                    navigate("/workspace");
                  }}
                  onClose={() => setShowSidebar(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <ChatMainPanel>
          <div className="sticky top-0 z-30 shrink-0 bg-background/85 backdrop-blur-md border-b border-border/30">
            <ChatHeader
              variant="minimal"
              userPlan={userPlan}
              personality={personality}
              onPersonalityChange={setPersonality}
              onToggleSidebar={() => setShowSidebar(!showSidebar)}
              onExport={handleExport}
              onManageSubscription={() => navigate("/billing")}
              onSignOut={signOut}
              onOpenAnalytics={() => setShowAnalytics(true)}
              onOpenScriptAutomation={() => navigate("/workspace?tab=automate")}
              onOpenStealthVault={() => navigate("/security?tab=vault")}
              onOpenAgentWorkflows={() => setShowAgentWorkflows(true)}
              onOpenModelFineTuning={() => navigate("/personal-llm")}
              onOpenWhiteLabelBranding={() => navigate("/enterprise")}
              onOpenGeminiAnalytics={() => setShowGeminiAnalytics(true)}
              onOpenCanvas={() => navigate("/ide")}
              onOpenDeepResearch={() => setShowDeepResearch(true)}
              onOpenGoogleIntegration={() => setShowGoogleIntegration(true)}
              onOpenAgenticRunner={() => setShowAgenticRunner(true)}
              onOpenVisualReasoning={() => setShowVisualReasoning(true)}
              onOpenCreativeSynthesis={() => setShowCreativeSynthesis(true)}
              onOpenImageGenerator={() => setShowImageGenerator(true)}
              onOpenMusicGenerator={() => {
                setMusicPrompt(message.trim());
                setMusicAutoGenerate(false);
                setShowMusicGenerator(true);
              }}
              onOpenShadowTalkLive={() => setShowShadowTalkLive(true)}
              onOpenBrowser={() => setShowShadowBrowser(true)}
              aiProvider={aiProvider}
              onProviderChange={handleProviderChange}
              hasKeyForProvider={hasKeyForProvider}
              maxChats="∞"
              dailyChats={messageCount}
              toolsMenuOpen={toolsMenuOpen}
              onToolsMenuOpenChange={setToolsMenuOpen}
            />
            {chatMode === "shadowspectre" && (
              <div className="px-3 pb-2">
                <ShadowSpectreScopeBar activeHead={shadowSpectreHead} />
              </div>
            )}
          </div>
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...SETTINGS_SPRING }}
            className="shadowtalk-chat-top-label hidden md:block"
          >
            {BRAND.tagline}
          </motion.p>
          <EnterpriseWelcomeBanner email={user?.email} displayName={userDisplayName} />
          {enterprise.showInviteColleagues && enterprise.tenant && (
            <EnterpriseInviteColleagues tenant={enterprise.tenant} />
          )}
          <ChatToolbar
            hasActiveChat={hasActiveChat}
            conversationCount={conversations.length}
            onNewChat={handleNewChat}
            onOpenHistory={() => setShowSidebar(true)}
            onClearChat={handleClearCurrentChat}
            onDeleteAllChats={handleClearAllChats}
            encryptionActive={chatPrivate.active}
            encryptionBusy={chatPrivate.busy}
            onEnableEncryption={handleEnableChatEncryption}
            onDisableEncryption={chatPrivate.disablePrivateMode}
          />
          <div className="hidden md:flex items-center justify-between gap-3 px-4 md:px-6 py-2 border-b border-border/20">
            {!userContextLoading && (
              <UserContextPanel
                context={userContext}
                onContextChange={setUserContext}
                onSave={() => void saveUserContext(userContext)}
              />
            )}
            <PerceptionDashboard onProactiveSuggestion={(suggestion) => setMessage(suggestion)} />
          </div>
          {chatPrivate.active && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 md:mx-6 mb-2 flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              End-to-end encrypted · Anonymous session
            </motion.div>
          )}
          {!enterprise.hideReferralNudges && <ReferralNudgeBanner />}
          <div className={`flex-1 min-h-0 relative flex flex-col ${isEmptyChat ? "overflow-y-auto" : "overflow-hidden"}`}>
            <AnimatePresence mode="wait">
              {isEmptyChat ? (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, scale: 0.98, filter: isMobile ? "blur(0px)" : "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.99, filter: isMobile ? "blur(0px)" : "blur(4px)" }}
                  transition={SETTINGS_SPRING}
                  className="flex-1 flex flex-col justify-center min-h-0"
                >
                  <ChatbotTrustStrip />
                  <ChatEmptyState
                    userDisplayName={userDisplayName}
                    onSelectPrompt={handleQuickPrompt}
                    apiConnectedLabel={
                      hasVerifiedKey && aiConfig.useCustomKey
                        ? `${aiConfig.preferredProvider} API connected`
                        : null
                    }
                    composerDockStyle={inputDockStyle}
                  >
                    <ChatInput {...chatInputProps} isEmptyState />
                  </ChatEmptyState>
                </motion.div>
              ) : (
                <motion.div
                  key="thread"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={SETTINGS_SPRING}
                  className="h-full flex flex-col overflow-hidden"
                >
                  {activeMarketplaceAgent && marketplaceRuntimeRef.current && (
                    <MarketplaceAgentBanner
                      agentName={activeMarketplaceAgent.name}
                      runtime={marketplaceRuntimeRef.current}
                      onClear={clearMarketplaceAgentSession}
                      onStarterSelect={(p) => setMessage(p)}
                    />
                  )}
                  <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    showSuggestions={false}
                    personality={personality}
                    userPlan={userPlan}
                    speakingMessageId={speakingMessageId}
                    isSpeaking={isSpeaking}
                    onSelectPrompt={handleQuickPrompt}
                    onEdit={handleEditMessage}
                    onRegenerate={handleRegenerateMessage}
                    onTextToSpeech={speakMessage}
                    onOpenCodeCanvas={(code, language) => {
                      saveIdePayload({ code, language: language || "javascript" });
                      navigate("/ide");
                    }}
                    onOpenIDE={(code, language) => {
                      saveIdePayload({ code, language });
                      navigate("/ide");
                    }}
                    onLaunchWebsite={(code) => {
                      saveIdePayload({ code, language: "html", openPreview: true });
                      navigate("/ide");
                    }}
                    onOpenInBrowser={(url) => {
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                      else setShowShadowBrowser(true);
                    }}
                    onShareReply={(content) => openChatShare(content)}
                    enterpriseShare={enterprise.isEnterpriseUser}
                    includeReferralInShare={enterprise.includeReferralInShare}
                    onConfirmTool={handleConfirmTool}
                    messagesEndRef={messagesEndRef}
                    layout="gemini"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!isEmptyChat && (
            <>
              {enterprise.allowProductSharing && (
                <ShareWinBanner
                  visible={Boolean(chatShareOffer && !chatShareDialogOpen)}
                  title={chatShareOffer?.title ?? ""}
                  subtitle={chatShareOffer?.subtitle}
                  referralCode={enterprise.includeReferralInShare ? referralCode : null}
                  colleagueMode={enterprise.isEnterpriseUser}
                  orgName={enterprise.tenant?.name ?? enterprise.displayOrgName ?? undefined}
                  onOpenShareDialog={() => setChatShareDialogOpen(true)}
                  onDismiss={() => setChatShareOffer(null)}
                />
              )}
              {(chatMission.mission || activeMission || isMissionExecuting) && (
                <div className="px-4 md:px-6 pb-2 max-w-4xl mx-auto w-full">
                  <SEEMissionPanel
                    mission={chatMission.mission || activeMission}
                    isExecuting={isMissionExecuting}
                    pendingApproval={pendingApproval}
                    onApprove={() => void approveChatMissionStep()}
                    onReject={() => void rejectPendingStep()}
                    onCancel={() => void cancelExecution()}
                    onOpenFullControl={() => navigate("/execute")}
                    compact
                  />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SETTINGS_SPRING}
                className="shadowtalk-chat-input-dock shrink-0"
                style={inputDockStyle}
              >
                <div className="shadowtalk-chat-input-shell w-full">
                  <ChatInput {...chatInputProps} />
                </div>
              </motion.div>
            </>
          )}
          <ShareResultDialog
            open={chatShareDialogOpen}
            onOpenChange={(open) => {
              setChatShareDialogOpen(open);
              if (!open) {
                setChatShareOffer(null);
                setChatShareCustomLink(null);
              }
            }}
            kind="chat"
            title={chatShareOffer?.title ?? "Built with ShadowTalk AI"}
            subtitle={chatShareOffer?.subtitle}
            referralCode={enterprise.includeReferralInShare ? referralCode : null}
            colleagueMode={enterprise.isEnterpriseUser}
            orgName={enterprise.tenant?.name ?? enterprise.displayOrgName ?? undefined}
            customLink={chatShareCustomLink ?? undefined}
          />
        </ChatMainPanel>
      {showImageGenerator && <ImageGenerator onClose={() => setShowImageGenerator(false)} onImageGenerated={(url) => setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'ai', content: '🎨 Generated image', timestamp: new Date(), imageUrl: url }])} />}
      <MusicGenerator
        isOpen={showMusicGenerator}
        onClose={() => {
          setShowMusicGenerator(false);
          setMusicAutoGenerate(false);
        }}
        initialPrompt={musicPrompt}
        autoGenerate={musicAutoGenerate}
        onInsertToChat={(content) => {
          insertAssistantToChat(content);
          setShowMusicGenerator(false);
        }}
      />
      <WordleGame isOpen={showWordle} onClose={() => setShowWordle(false)} />
      <GoogleIntegrationPanel
        isOpen={showGoogleIntegration}
        onClose={() => setShowGoogleIntegration(false)}
        onImportContent={(content, source) => {
          insertAssistantToChat(`**Imported from ${source}**\n\n${content}`);
          setShowGoogleIntegration(false);
        }}
      />
      {showDeepResearch && <DeepResearchPanel isOpen={showDeepResearch} onClose={() => setShowDeepResearch(false)} onInsertToChat={(c) => setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'ai', content: c, timestamp: new Date() }])} />}
      {showCognitiveLoop && (
        <CognitiveLoopPanel
          isOpen={showCognitiveLoop}
          onClose={() => setShowCognitiveLoop(false)}
          initialQuery={cognitiveQuery}
          onResult={(result) => {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: "ai",
                content: result,
                timestamp: new Date(),
                toolExecution: {
                  tool: "cognitive_loop",
                  status: "complete",
                  result: "Multi-agent synthesis",
                },
              },
            ]);
            if (user && currentConversationId) {
              void saveMessage(result, "assistant", currentConversationId).catch(() => {});
            }
            learnFromTurn(cognitiveQuery, result, currentConversationId ?? "");
            setShowCognitiveLoop(false);
          }}
        />
      )}
      {showOfflineTools && (
        <OfflineToolsPanel
          isOpen={showOfflineTools}
          onClose={() => setShowOfflineTools(false)}
          onInsertToChat={(text) => {
            setMessage(text);
            setShowOfflineTools(false);
            toast({ title: "Inserted into chat", description: "Edit the prompt and send when ready." });
          }}
        />
      )}
      {showMultiModel && (
        <MultiModelOrchestrator
          isOpen={showMultiModel}
          onClose={() => setShowMultiModel(false)}
          onResult={(result) => {
            insertAssistantToChat(result);
            setShowMultiModel(false);
          }}
          initialPrompt={message}
        />
      )}
      {showCreativeSynthesis && (
        <CreativeSynthesis
          isOpen={showCreativeSynthesis}
          onClose={() => setShowCreativeSynthesis(false)}
          onInsertToChat={(c) => {
            insertAssistantToChat(c);
            setShowCreativeSynthesis(false);
          }}
          initialPrompt={message}
        />
      )}
      {showVisualReasoning && (
        <VisualReasoning
          isOpen={showVisualReasoning}
          onClose={() => setShowVisualReasoning(false)}
          onInsertToChat={(c) => {
            insertAssistantToChat(c);
            setShowVisualReasoning(false);
          }}
        />
      )}
      {showImageDecoder && (
        <ImageDecoder
          onClose={() => setShowImageDecoder(false)}
          onDecoded={(analysis) => {
            insertAssistantToChat(analysis);
            setShowImageDecoder(false);
          }}
          initialImage={selectedFile?.type === "image" ? selectedFile.data : undefined}
          autoAnalyze={Boolean(selectedFile?.type === "image")}
        />
      )}
      {showDailyPlanner && (
        <DailyPlanner
          isOpen={showDailyPlanner}
          onClose={() => setShowDailyPlanner(false)}
          onPlanGenerated={(plan) => {
            insertAssistantToChat(plan);
            setShowDailyPlanner(false);
          }}
        />
      )}
      <PlanetaryActionModal
        isOpen={showPlanetaryActions}
        onClose={() => setShowPlanetaryActions(false)}
      />
      <ScreenAgent
        isOpen={showScreenAgent}
        onClose={() => setShowScreenAgent(false)}
        onSendToChat={(text) => {
          setMessage(text);
          setShowScreenAgent(false);
        }}
      />
      <VisionAgentModal
        isOpen={showVisionAgent}
        onClose={() => setShowVisionAgent(false)}
        onMessage={(text, isProactive) => {
          if (isProactive) {
            insertAssistantToChat(text);
          } else {
            setMessage(text);
          }
        }}
      />
      {showIntelligenceHub && (
        <IntelligenceHub isOpen={showIntelligenceHub} onClose={() => setShowIntelligenceHub(false)} />
      )}
      {showKnowledgeVault && (
        <KnowledgeVault isOpen={showKnowledgeVault} onClose={() => setShowKnowledgeVault(false)} />
      )}
      {showBrowseActivity && browseSession && (
        <BrowseActivityPanel
          isOpen={showBrowseActivity}
          onClose={() => {
            setShowBrowseActivity(false);
            closeBrowseSession();
          }}
          session={browseSession}
          onResultReady={(result) => {
            insertAssistantToChat(result);
            setShowBrowseActivity(false);
            closeBrowseSession();
          }}
        />
      )}
      <CommandPalette open={showCommandPalette} onOpenChange={setShowCommandPalette} onAction={handleCommandAction} />
      {showShadowTalkLive && (
        <Suspense fallback={null}>
          <ShadowTalkLive
            isOpen={showShadowTalkLive}
            onClose={() => setShowShadowTalkLive(false)}
            onInsertToChat={(content) => setMessage(content)}
          />
        </Suspense>
      )}
      {showShadowBrowser && (
        <Suspense fallback={null}>
          <ShadowBrowser
            isOpen={showShadowBrowser}
            onClose={() => setShowShadowBrowser(false)}
            onInsertToChat={(content) => setMessage(content)}
          />
        </Suspense>
      )}
      <ByokProviderKeyDialog
        open={byokDialogOpen}
        onOpenChange={setByokDialogOpen}
        provider={pendingByokProvider}
        onSaved={handleByokSaved}
      />
      {enterprise.showOnboarding && enterprise.tenant && (
        <EnterpriseOnboarding tenant={enterprise.tenant} />
      )}
      {enterprise.showHelpFab && enterprise.tenant && (
        <EnterpriseHelpFab tenant={enterprise.tenant} />
      )}
      <ShadowSpectrePanel
        open={showShadowSpectrePanel}
        onClose={() => setShowShadowSpectrePanel(false)}
      />
      <ShadowSpectreTermsDialog
        open={showShadowSpectreTerms}
        onAccepted={() => setShowShadowSpectreTerms(false)}
        onDecline={() => {
          setShowShadowSpectreTerms(false);
          if (chatMode === "shadowspectre") setChatMode("general");
        }}
      />
      <AgenticTaskRunner
        isOpen={showAgenticRunner}
        onClose={() => setShowAgenticRunner(false)}
        onTaskComplete={(result) => {
          insertAssistantToChat(result);
          setShowAgenticRunner(false);
        }}
      />
      <AIAgentWorkflows
        isOpen={showAgentWorkflows}
        onClose={() => setShowAgentWorkflows(false)}
        onResult={(result) => {
          insertAssistantToChat(result);
          setShowAgentWorkflows(false);
        }}
      />
      {showAnalytics && (
        <AnalyticsDashboard
          onClose={() => setShowAnalytics(false)}
          messageCount={messages.length}
          conversationCount={conversations.length}
        />
      )}
      {showGeminiAnalytics && (
        <GeminiKeyAnalytics onClose={() => setShowGeminiAnalytics(false)} />
      )}
      <DataOrganizer
        isOpen={showDataOrganizer}
        onClose={() => setShowDataOrganizer(false)}
        onOrganize={(input, output) => {
          insertAssistantToChat(`**Organized data**\n\n${output}`);
          setShowDataOrganizer(false);
        }}
      />
      <UncensoredArena
        open={showUncensoredArena}
        onClose={() => setShowUncensoredArena(false)}
      />
      <ShadowCowork
        isOpen={showShadowCowork}
        onClose={() => setShowShadowCowork(false)}
        onInsertToChat={(content) => {
          setMessage(content);
          setShowShadowCowork(false);
        }}
      />
      <SignInPrompt
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        reason={signInPromptReason}
        usedCount={guestUsage.usage?.chats}
        limitCount={GUEST_LIMITS.chats}
      />
      <InterimCloudConsentDialog
        open={showInterimCloudConsent}
        onOpenChange={setShowInterimCloudConsent}
        isDownloading={!localModelReady}
        onUseCloudUntilReady={() => {
          setInterimCloudConsent(true);
          setShowInterimCloudConsent(false);
          toast({ title: "Cloud AI enabled", description: "Temporary until your on-device model is ready." });
        }}
        onGoToDownload={() => {
          setShowInterimCloudConsent(false);
          navigate("/settings?section=offline");
        }}
        onStayDeviceOnly={() => setShowInterimCloudConsent(false)}
      />
      </motion.div>
      <FounderCrawlStrip />
    </div>
  );
};
export default ChatbotPage;
