import { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from "react";
import { Loader2, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
// Removed broken imports
import { useAuth } from "@/components/AuthProvider";
import { backend } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import { ChatMode, getModePrompt } from "@/components/chat/ModeSelector";
type AIProvider = "turbo" | string;
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AiAccessOnboarding } from "@/components/chat/AiAccessOnboarding";
const LiveVoiceMode = lazy(() => import("@/components/chat/LiveVoiceMode").then(m => ({ default: m.LiveVoiceMode })));
const SettingsByokCard = lazy(() => import("@/components/settings/SettingsByokCard").then(m => ({ default: m.SettingsByokCard })));
import { ChatToolbar } from "@/components/chat/ChatToolbar";
import { EnterpriseWelcomeBanner } from "@/components/chat/EnterpriseWelcomeBanner";
import { ChatShadowSidebar } from "@/components/chat/ChatShadowSidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ShareWinBanner } from "@/components/growth/ShareWinBanner";
import { ShareResultDialog } from "@/components/growth/ShareResultDialog";
import { ChatMessages } from "@/components/chat/ChatMessages";
import type { UserContext } from "@/components/chat/UserContextPanel";
import { inferDocumentTypeFromMessage } from "@/lib/kimiDocumentGeneration";






import { streamCloudChat, isCloudChatConfigured, type CloudChatMessage } from "@/lib/cloudChat";
import { buildChatSystemPrompt } from "@/lib/shadowTalkPersona";
import { loadAiAccessMode, saveAiAccessMode } from "@/lib/aiAccessMode";

import { ChatAmbientBackground } from "@/components/chat/ChatAmbientBackground";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatMainPanel } from "@/components/chat/ChatMainPanel";
import { SETTINGS_SPRING } from "@/lib/settingsMotion";
import { useChatSidebarCollapse } from "@/hooks/useChatSidebarCollapse";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIosKeyboard } from "@/hooks/useIosKeyboard";
import { ChatMobileNavDrawer } from "@/components/chat/ChatMobileNavDrawer";
import { useShadowMemoryContext } from "@/contexts/ShadowMemoryContext";
import { useIntelligenceHub } from "@/hooks/useIntelligenceHub";
import { useAutoImproveContext } from "@/contexts/AutoImproveContext";




import { prewarmFastestLocalPath, warmHardwareProfile } from "@/lib/hardwareIntelligence";
import { useTokenCostTracker } from "@/hooks/useTokenCostTracker";
import { useSessionActivation } from "@/hooks/useSessionActivation";
import { useGlobalHotkeys } from "@/hooks/useGlobalHotkeys";
import { useToolOrchestrator } from "@/hooks/useToolOrchestrator";
import { executeShadowTool } from "@/lib/shadowTools/executeShadowTool";
import { generateCloudImage } from "@/lib/cloudImage";
// Lazy-load document + video intelligence (saves ~800KB from initial chat load)
// These are only needed when a user attaches a file, not on every page visit.
const lazyDocIntel = () => import("@/lib/documentIntelligence");
const lazyVidIntel = () => import("@/lib/videoIntelligence");
import { TokenCostBadge } from "@/components/chat/TokenCostBadge";


// Removed broken imports
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  getGuestArchivedIds,
  isConversationArchived,
  setGuestArchivedIds,
} from "@/lib/chatArchive";
import { CHAT_COMMAND_MODAL_ACTIONS, CHAT_COMMAND_NAV_ROUTES } from "@/lib/chatCommandRoutes";
import { consumePendingChatInsert } from "@/lib/pendingChatInsert";
import { useChatSpeech } from "@/hooks/useChatSpeech";

const IntelligenceHub = lazy(() =>
  import("@/components/chat/IntelligenceHub").then((m) => ({ default: m.IntelligenceHub })),
);


import { useSubscriptionNudge } from "@/hooks/useSubscriptionNudge";
import { CHAT_LIMIT_TOAST } from "@/lib/conversionCopy";
import { openProjectInIde, saveIdePayload } from "@/lib/idePayloadStorage";
import { detectAppBuilderIntent, generateAppProject } from "@/lib/appBuilder";
import { useShadowTalkModel } from "@/hooks/useShadowTalkModel";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO, getFounderHomeStructuredData, getChatbotFAQSchema, getSpeakableSchema, getWebSiteWithSearchSchema } from "@/lib/seo";

import { BRAND } from "@/lib/brand";
import { recordSuccessfulChatSession, getSuccessfulSessionCount } from "@/lib/growth/sessionMilestones";
import { markHasChatted, completeQuickPrompt, hasChattedBefore } from "@/lib/growth/firstVisit";
import { recordFunnelEvent, recordChatbotView } from "@/lib/growth/funnelEvents";
import { trackShadowTalkEvent } from "@/lib/analyticsEventTracker";

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
  const { user, userPlan, signOut, checkSubscription, isAnonymous, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Hooks
  const {
    captureChatSend,
    capture: captureAutoImprove,
    applyChatDefaultsOnce,
    preferSeeRouting,
    getChatDefaults,
  } = useAutoImproveContext();
  const { extractMemories, extractKnowledge, getMemoryContext } = useIntelligenceHub();
  
  // Mocks for removed enterprise and self-healing features
  const enterprise = {
    isEnterpriseUser: false,
    hideMonetization: false,
    hideReferralNudges: false,
    includeReferralInShare: false,
    allowProductSharing: true,
    needsWorkEmailSignIn: false,
    tenant: null,
    displayOrgName: null,
    showInviteColleagues: false,
    showOnboarding: false,
    showHelpFab: false
  };

  const chatMission = { mission: null };
  const activeMission = null;
  const isMissionExecuting = false;
  const pendingApproval = false;
  const approveChatMissionStep = async () => {};
  const rejectPendingStep = async () => {};
  const cancelExecution = async () => {};
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [personality, setPersonality] = useState<Personality>("friendly");
  const [chatMode, setChatMode] = useState<ChatMode>("general");
  const { preferences: chatPreferences, isLoading: chatPrefsLoading } = useChatSettings();
  const [localModelReady, setLocalModelReady] = useState(false);
  const hasLocalDesktop = typeof window !== 'undefined' && (window as any).__TAURI__ && localModelReady;
  const e2ee = useE2EE();
  const chatPrivate = useChatPrivateMode(e2ee);
  const appliedChatDefaults = useRef(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar, width: sidebarWidth } =
    useChatSidebarCollapse();
  const isMobile = useIsMobile();
  const keyboardOffset = useIosKeyboard();
  const inputDockStyle =
    keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : undefined;
  const historyPanelLeft = isMobile ? 0 : sidebarWidth;
  const { isListening, toggleDictation, isSpeaking, speakingMessageId, speakMessage } = useChatSpeech();
  const [selectedFile, setSelectedFile] = useState<{ type: 'image' | 'file'; data: string; name: string; mimeType: string } | null>(null);
  
  // Modals
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [showByok, setShowByok] = useState(false);
  const [showMusicGenerator, setShowMusicGenerator] = useState(false);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicAutoGenerate, setMusicAutoGenerate] = useState(false);
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);
  const [documentTopic, setDocumentTopic] = useState("");
  const [showWordle, setShowWordle] = useState(false);
  const [showGoogleIntegration, setShowGoogleIntegration] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showShadowTalkLive, setShowShadowTalkLive] = useState(false);
  const [showShadowBrowser, setShowShadowBrowser] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [chatShareOffer, setChatShareOffer] = useState<{ title: string; subtitle?: string; prompt?: string; answer?: string } | null>(null);
  const [chatShareDialogOpen, setChatShareDialogOpen] = useState(false);
  const [chatShareCustomLink, setChatShareCustomLink] = useState<string | null>(null);
  const [showMultiModel, setShowMultiModel] = useState(false);
  const [showVisualReasoning, setShowVisualReasoning] = useState(false);
  const [showImageDecoder, setShowImageDecoder] = useState(false);
  const [showDailyPlanner, setShowDailyPlanner] = useState(false);
  const [showPlanetaryActions, setShowPlanetaryActions] = useState(false);
  const [showScreenAgent, setShowScreenAgent] = useState(false);
  const [showIntelligenceHub, setShowIntelligenceHub] = useState(false);

  const [showAgenticRunner, setShowAgenticRunner] = useState(false);
  const [showAgentWorkflows, setShowAgentWorkflows] = useState(false);
  const [showGeminiAnalytics, setShowGeminiAnalytics] = useState(false);
  const [showDataOrganizer, setShowDataOrganizer] = useState(false);
  const [showUncensoredArena, setShowUncensoredArena] = useState(false);
  const [showShadowCowork, setShowShadowCowork] = useState(false);
  const [showSwarmMode, setShowSwarmMode] = useState(false);
  const [swarmPrompt, setSwarmPrompt] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [signInPromptReason, setSignInPromptReason] = useState<"chats" | "images" | "deepResearch" | "general">("chats");
  const [showBrowseActivity, setShowBrowseActivity] = useState(false);
  const [shadowTwinActive, setShadowTwinActive] = useState(false);

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
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    warmHardwareProfile();
    prewarmFastestLocalPath();
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

  }, [user, isAnonymous]);

  useEffect(() => {
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
    if (chatPrefsLoading || appliedChatDefaults.current) return;
    appliedChatDefaults.current = true;

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
    if (user) {
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
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("[chat] loadConversations FAILED:", error?.message || error);
    }
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
      .eq('user_id', user?.id ?? '')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("[chat] loadConversation FAILED:", error?.message || error);
    }
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

    // Try deleting messages first. If that fails (permission issue on a
    // legacy doc), fall back to deleting the whole conversation.
    const { error: msgError } = await backend
      .from("messages")
      .delete()
      .eq("conversation_id", convId)
      .eq("user_id", user.id);

    if (msgError) {
      // Messages delete failed — try removing the whole conversation instead.
      const { error: convError } = await backend
        .from("conversations")
        .delete()
        .eq("id", convId)
        .eq("user_id", user.id);
      if (convError) {
        // Both failed — clear local state so the user isn't stuck. The server
        // docs may persist but the user's intent (clear the current chat view)
        // is honored.
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        resetToNewChat();
        setMessages([welcomeMessage()]);
        toast({
          title: "Chat cleared locally",
          description: "Server delete failed (permission issue). Your view is cleared; the chat may reappear on refresh.",
        });
        setShowSidebar(false);
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      resetToNewChat();
    } else {
      // Messages deleted — keep the conversation row but reset its title.
      await backend
        .from("conversations")
        .update({ title: "New Chat", updated_at: new Date().toISOString() })
        .eq("id", convId)
        .eq("user_id", user.id)
        .catch(() => {}); // non-fatal — title update isn't critical
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

    // Delete messages first (orphaned messages are useless without conversations).
    // Errors here are non-fatal — we still want to delete the conversations.
    await backend.from("messages").delete().eq("user_id", user.id).catch(() => {});

    // Try the batch delete. If it fails (often due to legacy docs with missing
    // user_id failing the Firestore delete rule), fall back to per-doc delete
    // and skip the failures so the user gets a partial-success result.
    const { error } = await backend.from("conversations").delete().eq("user_id", user.id);

    if (error) {
      // Fallback: fetch conversation IDs, delete each one individually.
      const { data: convs } = await backend
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .catch(() => ({ data: null, error: null }));

      const convList = Array.isArray(convs) ? convs : [];
      if (convList.length > 0) {
        let deleted = 0;
        let failed = 0;
        for (const c of convList) {
          const { error: docErr } = await backend
            .from("conversations")
            .delete()
            .eq("id", c.id)
            .eq("user_id", user.id);
          if (docErr) failed++;
          else deleted++;
        }

        // Always clear local state — the user asked to delete all chats, so
        // the UI should reflect that intent even if some server docs remain.
        setConversations([]);
        resetToNewChat();
        setShowSidebar(false);

        if (deleted > 0 && failed === 0) {
          toast({ title: "All chats deleted", description: "Your conversation history was cleared." });
        } else if (deleted > 0 && failed > 0) {
          toast({
            title: `Deleted ${deleted} of ${convList.length} chats`,
            description: `${failed} chat(s) could not be deleted due to a permission issue. They may reappear on refresh.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Could not delete chats",
            description: "Permission denied. Try refreshing the page and signing in again — your session may have expired.",
            variant: "destructive",
          });
        }
        return;
      }

      // No conversations to fetch (maybe a read permission issue too) — clear
      // local state anyway so the user isn't stuck looking at chats they can't delete.
      setConversations([]);
      resetToNewChat();
      setShowSidebar(false);
      toast({
        title: "Could not delete chats from server",
        description: "Your local chat list has been cleared. Refresh the page to reload server state.",
        variant: "default",
      });
      return;
    }

    setConversations([]);
    resetToNewChat();
    setShowSidebar(false);
    toast({ title: "All chats deleted", description: "Your conversation history was cleared." });
  };

  const ensureConversation = async (): Promise<string | null> => {
    if (currentConversationId) return currentConversationId;

    if (!user || isAnonymous) {
      const localId = `local-${(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }))}`;
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

    try {
      const { data, error } = await backend
        .from('conversations')
        .insert({ user_id: user.id, title: titleToSave })
        .select()
        .single();

      if (!error && data?.id) {
        setCurrentConversationId(data.id);
        const displayTitle = chatPrivate.active
          ? "Private Chat"
          : (await chatPrivate.resolveDisplayText(data.title || "New Chat")) || "New Chat";
        setConversations((prev) => [
          { id: data.id, title: displayTitle, created_at: data.created_at },
          ...prev,
        ]);
        return data.id;
      }
      if (error) {
        console.error("[chat] remote conversation insert FAILED:", error?.message || error);
        // Show the user what went wrong so they can report it
        toast({
          title: "Could not create conversation",
          description: "Your chat will work but may not be saved. Check your connection and try refreshing.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("[chat] exception creating remote conversation:", err);
      toast({
        title: "Connection error",
        description: "Could not reach the database. Your chat will work locally but may not persist.",
        variant: "destructive",
      });
    }

    // NO FALLBACK: return null so the caller knows the conversation was NOT created.
    // Messages will NOT be saved against a fake ID (prevents orphaned messages).
    // The user can still chat in the current session — messages are shown in the UI
    // but flagged as unsaved. They can retry sending to persist.
    return null;
  };

  const resolveConversationId = async (): Promise<string | null> => {
    if (currentConversationId) {
      // Don't reuse a guest/local/fallback ID for saving
      if (isGuestConversationId(currentConversationId) || currentConversationId.startsWith('local-') || currentConversationId.startsWith('conv-')) {
        // Try to create a real conversation if we now have a user
        if (user && !isAnonymous) {
          const id = await ensureConversation();
          if (id) return id;
        }
        return currentConversationId; // Return the guest ID — messages won't be saved
      }
      return currentConversationId;
    }
    const hasRealUser = user && !isAnonymous;
    if (hasRealUser) {
      const id = await ensureConversation();
      if (id) return id;
      // Conversation creation failed — return null to signal "don't save"
      return null;
    }
    const guestConvId = `guest-${Date.now()}`;
    setCurrentConversationId(guestConvId);
    setConversations((prev) => [
      { id: guestConvId, title: "Guest Conversation", created_at: new Date().toISOString() },
      ...prev,
    ]);
    return guestConvId;
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant', conversationId: string) => {
    if (!user || !conversationId) return null;
    // Don't save against fake/guest/local conversation IDs — prevents orphaned messages
    if (isGuestConversationId(conversationId) || conversationId.startsWith('local-') || conversationId.startsWith('conv-')) {
      console.warn('[chat] saveMessage skipped — conversation ID is not a real Firestore ID:', conversationId);
      return null;
    }

    try {
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
    } catch (err: any) {
      console.error("[chat] saveMessage FAILED:", err?.message || err);
      // Don't show a toast here — it would spam the user on every message.
      // The conversation-creation toast above is sufficient.
      return null;
    }
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

      let augmented = chatMessages;
      const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === "user");
      const lastUser =
        typeof lastUserMsg?.content === "string"
          ? lastUserMsg.content.trim()
          : Array.isArray(lastUserMsg?.content)
            ? (lastUserMsg.content.find((p) => p.type === "text") as { text?: string } | undefined)?.text?.trim() ?? ""
            : "";

      const userMemoryContext = await buildMemoryContextForUser(user);
      if (userMemoryContext) {
        augmented = [{ role: "system", content: userMemoryContext }, ...augmented];
      }

      // Document generation — ONLY on explicit slash command (/doc, /draft,
      // /write, /document). Removed the auto-detection that matched casual
      // mentions of "report", "email", "memo", "article" etc. — that caused
      // unwanted document generation (audit fix, see commit ea8e98f).
      const isExplicitDocCommand = /^\/(doc|draft|write|document)\b/i.test(lastUser);

      if (isExplicitDocCommand) {
        const docTypeMatch = inferDocumentTypeFromMessage(lastUser);
        const inferredType = docTypeMatch || "report";
        const docDirective = `[PUBLICATION-QUALITY DOCUMENT STANDARDS]
You are generating a world-class, publication-grade ${inferredType}.
Structure and Content Guidelines:
- Line 1: '# Title' (descriptive, authoritative)
- Line 2: '*Subtitle with key scope or date*'
- Include an '## Executive Summary' or '## Abstract'
- Where relevant, include key metrics using [STAT: value | label] syntax (e.g. [STAT: 99.9% | Availability SLA] or [STAT: +45% | Projected ROI])
- Use clean Markdown tables with aligned headers for data or comparisons
- Use structured headings: ## for major sections, ### for subsections
- Include concrete recommendations or next steps
- Include a '## References' section if data or research is cited
- NO throat-clearing opening (e.g. 'Sure!', 'Here is your document', 'Below is...'). Begin immediately with '# Title'.
- Output ONLY the finished Markdown document.`;
        augmented = [{ role: "system", content: docDirective }, ...augmented];
      }



      const routerMessages = augmented.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      const shadowMatchInitial = lastUser.match(/@([a-zA-Z0-9_-]+)-shadow/i);
      if (shadowMatchInitial || shadowTwinActive) {
        const shadowName = shadowMatchInitial ? shadowMatchInitial[1] : "User";
        routerMessages.unshift({
          role: "system",
          content: `You are acting as the Shadow Twin for ${shadowName}. You must speak and act entirely on their behalf based on their specific context, tone, and knowledge. Do not break character. Do not say you are an AI.`
        });
        augmented.unshift({
          role: "system",
          content: `You are acting as the Shadow Twin for ${shadowName}. You must speak and act entirely on their behalf based on their specific context, tone, and knowledge. Do not break character. Do not say you are an AI.`
        });
      }

      const hasMultimodalImage = chatMessages.some((m) => Array.isArray(m.content));

      if (!isCloudChatConfigured()) {
        throw new Error(
          `Chat is not configured for this build. ${DESKTOP_ENV_SETUP_HINT}`,
        );
      }

      const learnedHint = getChatDefaults()?.systemHintAddon;
      const memoryContext = getMemoryContext();
      const businessMemory = [learnedHint, memoryContext].filter(Boolean).join("\n").trim();


      const raiseChatHttpError = async (status: number, rawBody: string) => {
        let detail = "Chat request failed";
        try {
          const errJson = JSON.parse(rawBody);
          detail = typeof errJson.error === "string" ? errJson.error : detail;
        } catch {
          detail = rawBody || detail;
        }
        if (status === 402) {
          throw new Error("Platform credits exhausted. Please upgrade your plan.");
        }
        throw new Error(detail);
      };

      const aiMessageId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));
      let assistantContent = "";

      // SPEED: coalesce setMessages calls to one per frame so streaming
      // doesn't trigger a full React reconcile on every SSE chunk.
      let pendingContent: string | null = null;
      let rafId: number | null = null;
      const shadowMatch = lastUser.match(/@([a-zA-Z0-9_-]+)-shadow/i);
      const isShadowTwin = !!shadowMatch || shadowTwinActive;
      const shadowTwinName = shadowMatch ? `${shadowMatch[1]}-shadow` : undefined;

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
            { id: aiMessageId, type: "ai", content, timestamp: new Date(), isShadowTwin, shadowTwinName },
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

      // SPEED: only the recent turns are sent — long histories slow the model's
      // first token dramatically without improving answers.
      const trimmedRouterMessages = routerMessages.slice(-14);

      const cloudMessages: CloudChatMessage[] = [
        {
          role: 'system',
          content: `${buildChatSystemPrompt({
            personality,
            businessMemory,
          })}\n\n${getModePrompt(chatMode)}`,
        },
        ...trimmedRouterMessages.map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as CloudChatMessage['role'],
          content: m.content as CloudChatMessage['content'],
        })),
      ];

      const { content: streamedContent, error: cloudError } = await streamCloudChat(cloudMessages, {
        signal: controller.signal,
        temperature: 0.7,
        maxTokens: 8192,
        onDelta: (accumulated) => {
          pushAssistant(accumulated);
          // Fire token-cost tracker — one call per delta chunk
          costTracker.onToken("gpt-4o-mini");
        },
      });

      if (cloudError && !streamedContent) {
        throw new Error(cloudError);
      }
      if (streamedContent) {
        pushAssistant(streamedContent);
      }

      finalizeAssistant();
      // === Session monetization: record this model call + project cost ===
      const _outputTokens = Math.ceil((streamedContent || assistantContent || "").length / 4);
      const _inputTokens = Math.ceil(cloudMessages.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0) / 4);
      costTracker.onRequestComplete("gpt-4o-mini", _inputTokens, _outputTokens);
      session.recordModelCall();
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
    [chatMode, personality, user, getChatDefaults, getMemoryContext],
  );

  // === Session monetization + cost tracking (roadmap batch integration) ===
  const costTracker = useTokenCostTracker();
  const session = useSessionActivation();

  // Wire global hotkeys — Cmd+Enter is already handled by ChatInput, but we
  // expose the others via custom events the host can listen for.
  useGlobalHotkeys({
    onSynthesizeConsensus: () => {
      window.dispatchEvent(new CustomEvent("shadowtalk:synthesize-consensus"));
    },
    onToggleSplitView: () => {
      window.dispatchEvent(new CustomEvent("shadowtalk:toggle-split-view"));
    },
  });

  // Tool detection — intercepts messages like "/image <prompt>" or
  // "generate an image of..." and routes them to the right executor
  // (image generation, web search, calculator, etc.) instead of sending
  // them to the text completion API.
  const { detectTool, executeCalculator } = useToolOrchestrator();

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
    if (!conversationId) {
      toast({
        title: "Could not start chat",
        description: "Failed to create a conversation. Your message is preserved — try sending again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setMessages(prior);
    setIsLoading(true);

    try {
      const startTime = performance.now();
      trackShadowTalkEvent("mission_started", { mission_id: conversationId, user_id: user?.id, model: "turbo", tool_name: "core_chat" });
      await runChatCompletion(chatMessages, conversationId);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      trackShadowTalkEvent("mission_completed", { 
        mission_id: conversationId, 
        user_id: user?.id, 
        duration_ms: totalDuration, 
        success: true 
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      trackShadowTalkEvent("mission_failed", { mission_id: conversationId, user_id: user?.id, error_type: err instanceof Error ? err.message : "unknown", success: false });
      const msg = err instanceof Error ? err.message : "Regeneration failed.";
      toast({ title: "Regeneration failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const msgContent = (overrideText ?? message).trim();
    if ((!msgContent && !selectedFile) || isLoading) return;

    if (authLoading) {
      toast({ title: "Restoring your session", description: "Wait a moment, then send your message again." });
      return;
    }
    if (!user) {
      toast({
        title: "Sign in to use ShadowTalk AI",
        description: "Your AI access choice and daily usage are tied to your account.",
        variant: "destructive",
      });
      navigate(`/auth?q=${encodeURIComponent(msgContent)}`);
      return;
    }

    try {
      let accessMode = await loadAiAccessMode(user.id);
      // ShadowTalk is BYOK-only. Default to 'byok' mode when no mode is set.
      // If the user has no API key, the cloudChat layer will prompt them to
      // add one in Settings — we don't fall back to the shared tier.
      if (!accessMode) {
        try {
          await saveAiAccessMode(user.id, "byok");
        } catch {
          // saveAiAccessMode is resilient (localStorage-first)
        }
      }
    } catch (error) {
      toast({
        title: "Could not load AI setup",
        description: error instanceof Error ? error.message : "Check your connection and try again.",
        variant: "destructive",
      });
      return;
    }



    recordFunnelEvent("first_send_attempt");
    markHasChatted();

    const userMessage: Message = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
      type: "user",
      content: msgContent,
      timestamp: new Date(),
      attachment: selectedFile || undefined,
    };
    const cachedFile = selectedFile;
    
    // OPTIMISTIC UI: Update state synchronously before any network requests
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) {
      setMessage("");
    }
    setSelectedFile(null);
    setIsLoading(true);

    // Yield briefly to allow the browser to paint the optimistic updates
    await new Promise(resolve => requestAnimationFrame(resolve));

    // === Tool interception ===
    // Check if the message triggers a tool (image generation, web search, etc.)
    // before sending it to the text completion API. Strip slash-command prefixes
    // like "/image " so the tool detector sees the actual prompt.
    const explicitImageCommand = /^\/(image|img|draw|picture)\s+/i.test(msgContent);
    const strippedForTools = msgContent.replace(/^\/(image|img|draw|picture)\s+/i, "").trim();
    const toolResult = chatMode === "image" || explicitImageCommand
      ? { tool: "image_generator" as const, autoExecute: true, params: { prompt: strippedForTools } }
      : detectTool(strippedForTools);

    if (toolResult.tool && toolResult.autoExecute) {
      const conversationId = await resolveConversationId();
      if (!conversationId) {
        setIsLoading(false);
        throw new Error("Could not open a conversation for this tool request.");
      }
      const toolMessageId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ai-${Date.now()}`);
      const toolAiMessage: Message = {
        id: toolMessageId,
        type: "ai",
        content: "",
        timestamp: new Date(),
        toolExecution: { tool: toolResult.tool, status: "running", params: toolResult.params },
      };
      setMessages((prev) => [...prev, toolAiMessage]);
      setIsLoading(true);

      try {
        let finalToolContent = "";
        // Image generation — BYOK only. Uses the user's own OpenAI or OpenRouter
        // key. No fallback to free services. If the key is missing or fails,
        // the error is shown to the user so they can fix their setup.
        if (toolResult.tool === "image_generator") {
          const imgPrompt = toolResult.params?.prompt || strippedForTools;
          const imageUrl = await generateCloudImage(imgPrompt, { watermark: true });
          finalToolContent = `Generated image for: *${imgPrompt}*`;
          setMessages((prev) => prev.map((m) => m.id === toolMessageId ? {
            ...m,
            content: finalToolContent,
            imageUrl,
            toolExecution: { tool: toolResult.tool, status: "completed", params: toolResult.params },
          } : m));
          // The image provider does not return usage metadata here, so do not
          // attribute this request to a chat model or report fabricated cost.
          session.recordModelCall();
        } else {
          // Other auto-execute tools (calculator, web_search, deep_research, etc.)
          const result = toolResult.tool === "calculator"
            ? { kind: "inline" as const, tool: toolResult.tool, content: executeCalculator(strippedForTools) }
            : await executeShadowTool(
            toolResult.tool,
            toolResult.params,
            strippedForTools,
            { personality, mode: chatMode, attachment: selectedFile || undefined },
          );
          if (result.kind === "inline") {
            finalToolContent = result.content;
            setMessages((prev) => prev.map((m) => m.id === toolMessageId ? {
              ...m,
              content: result.content,
              imageUrl: result.imageUrl,
              toolExecution: { tool: toolResult.tool, status: "completed", params: toolResult.params },
            } : m));
          } else if (result.kind === "ui" && result.path) {
            finalToolContent = result.message || `Opening ${result.path}...`;
            setMessages((prev) => prev.map((m) => m.id === toolMessageId ? {
              ...m,
              content: result.message || `Opening ${result.path}...`,
              toolExecution: { tool: toolResult.tool, status: "completed", params: toolResult.params },
            } : m));
            navigate(result.path);
          } else {
            // chat_flags or none — render a generic confirmation
            finalToolContent = `Tool ${toolResult.tool} completed.`;
            setMessages((prev) => prev.map((m) => m.id === toolMessageId ? {
              ...m,
              content: finalToolContent,
              toolExecution: { tool: toolResult.tool, status: "completed", params: toolResult.params },
            } : m));
          }
          session.recordModelCall();
        }

        // Save the tool execution as an assistant message
        if (user) void saveMessage(finalToolContent, "assistant", conversationId).catch(() => {});
        recordSuccessfulChatSession();
        recordFunnelEvent("first_reply");
        markHasChatted();
        setIsLoading(false);
        return; // Don't proceed to streamCloudChat — tool handled it
      } catch (toolErr) {
        const errMsg = toolErr instanceof Error ? toolErr.message : "Tool execution failed.";
        setMessages((prev) => prev.map((m) => m.id === toolMessageId ? {
          ...m,
          content: `⚠️ ${errMsg}`,
          toolExecution: { tool: toolResult.tool, status: "failed", params: toolResult.params },
        } : m));
        setIsLoading(false);
        return;
      }
    }
    // === End tool interception — if no tool matched, fall through to streamCloudChat ===

    const conversationId = await resolveConversationId();
    if (!conversationId) {
      // Revert optimistic update on critical failure
      setMessages((prev) => prev.filter(m => m.id !== userMessage.id));
      if (!overrideText) setMessage(msgContent);
      setSelectedFile(cachedFile);
      setIsLoading(false);
      recordFunnelEvent("send_blocked", "no_conversation_id");
      return;
    }

    // SPEED: persist user message in the background; don't block the AI call on a DB write.
    // Only save if we have a real (non-guest) conversation ID
    if (user && conversationId && !isGuestConversationId(conversationId) && !conversationId.startsWith('local-') && !conversationId.startsWith('conv-')) {
      void saveMessage(msgContent, "user", conversationId).catch((e) =>
        console.error("[chat] saveMessage(user) failed:", e?.message || e),
      );
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

    // === Document Intelligence — extract text from PDF/DOCX/TXT/etc. ===
    if (userMessage.attachment?.type === "file") {
      const { name, mimeType, data } = userMessage.attachment;
      // Lightweight format detection (inline — no import needed)
      const ext = name.split(".").pop()?.toLowerCase() || "";
      const isVideo = ["mp4", "webm", "ogg", "mov", "mkv"].includes(ext) || mimeType.startsWith("video/");
      const isDoc = ["pdf", "docx", "pptx", "xlsx", "odt", "txt", "md", "csv", "json", "js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "css", "html", "xml", "yml", "yaml", "sh", "sql"].includes(ext);

      // Check if it's a video file
      if (isVideo) {
        // Lazy-load the video intelligence module only when needed
        const { extractVideoFrames, formatFramesForChat } = await lazyVidIntel();
        // Video analysis — extract frames + send as image array
        // Wrapped in try/finally to guarantee setIsLoading(false) runs
        // even if an unexpected error occurs (prevents stuck loading state)
        try {
          // Convert data URL back to a File for the video extractor
          // NOTE: This creates a temporary copy of the video in memory.
          // The video extractor creates an object URL from this File,
          // then revokes it in its finally block. Memory is freed after
          // extraction completes.
          const base64 = data.split(",")[1] || "";
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const videoFile = new File([bytes], name, { type: mimeType });

          toast({ title: "Processing video…", description: "Extracting frames for analysis. This may take a moment." });
          const result = await extractVideoFrames(videoFile, { maxFrames: 6 });
          if (result.error) {
            toast({ title: "Video analysis failed", description: result.error, variant: "destructive" });
            setIsLoading(false);
            return;
          }
          if (result.frames.length > 0) {
            chatMessages[chatMessages.length - 1].content = formatFramesForChat(
              result.frames,
              msgContent || "Describe what's happening in this video.",
              result.metadata,
            );
            if (result.notice) {
              toast({ title: "Video processed", description: result.notice });
            }
          }
        } catch (err) {
          toast({
            title: "Video analysis failed",
            description: err instanceof Error ? err.message : "Could not process the video.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      } else if (isDoc) {
        // Document analysis — extract text locally, then use retrieval for large docs
        // Lazy-load the document intelligence module
        const { extractDocument, formatDocumentForChat, chunkDocument, selectRelevantChunks, formatRetrievedChunksForChat, validateFileSize, estimateFileSize, renderScannedPdfPages } = await lazyDocIntel();
        try {
          const sizeCheck = validateFileSize({ size: estimateFileSize(data) }, 25 * 1024 * 1024);
          if (!sizeCheck.ok) {
            toast({ title: "File too large", description: sizeCheck.error, variant: "destructive" });
            setIsLoading(false);
            return;
          }
          toast({ title: "Processing document…", description: `Extracting text from ${name}.` });
          const doc = await extractDocument(data, name, mimeType);
          const scannedPages = doc.empty && doc.format === "pdf" ? await renderScannedPdfPages(data, 5) : [];
          if (doc.empty) {
            toast({
              title: scannedPages.length ? "Scanned PDF ready for visual analysis" : "No text extracted",
              description: scannedPages.length ? `Sending ${scannedPages.length} rendered pages to your vision model.` : doc.notice || "The document appears to be empty or scanned.",
              variant: "default",
            });
          }

          if (scannedPages.length) {
            chatMessages[chatMessages.length - 1].content = [
              { type: "text", text: `${msgContent || "Analyze this scanned PDF."}\n\nPages rendered locally for visual analysis: ${scannedPages.map((page) => page.page).join(", ")}.` },
              ...scannedPages.map((page) => ({ type: "image_url" as const, image_url: { url: page.dataUrl } })),
            ];
          } else {

          // Chunk the document, then select relevant chunks for the question
          const chunks = chunkDocument(doc.text, 30_000, doc.format);
          const retrieval = selectRelevantChunks(chunks, msgContent || "summarize");

          if (retrieval.fullDocument) {
            // Small document — send everything
            const docContext = formatDocumentForChat(doc);
            chatMessages[chatMessages.length - 1].content = `${docContext}\n\n--- User Question ---\n${msgContent || "Summarize this document."}`;
          } else {
            // Large document — send only retrieved chunks + disclosure
            const retrievedContext = formatRetrievedChunksForChat(retrieval, name, doc.format);
            chatMessages[chatMessages.length - 1].content = `${retrievedContext}\n\n--- User Question ---\n${msgContent || "Summarize the analyzed portions of this document."}`;
          }

          if (doc.notice) {
            toast({ title: "Document processed", description: doc.notice });
          }
          if (!retrieval.fullDocument) {
            toast({ title: "Partial analysis", description: retrieval.disclosure });
          }
          }
        } catch (err) {
          toast({
            title: "Document analysis failed",
            description: err instanceof Error ? err.message : "Could not process the document.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      } else {
        // Unsupported file type
        toast({
          title: "Unsupported file",
          description: `${name}: supported formats are PDF, DOCX, TXT, MD, CSV, JSON, code files, and common video formats (MP4, WebM, MOV, MKV).`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    } else if (userMessage.attachment?.type === "image") {
      const imageData = userMessage.attachment.data;
      const { detectChatImageIntent } = await import("@/lib/chatImageIntent");
      if (detectChatImageIntent(msgContent) === "edit") {
        try {
          const editedImage = await generateCloudImage(msgContent, { referenceImage: imageData, watermark: true });
          const reply = `Edited your image: ${msgContent}`;
          const editedMessage: Message = { id: crypto.randomUUID(), type: "ai", content: reply, imageUrl: editedImage, timestamp: new Date() };
          setMessages((prev) => [...prev, editedMessage]);
          if (user) {
            void saveMessage(msgContent, "user", conversationId).catch(() => {});
            void saveMessage(reply, "assistant", conversationId).catch(() => {});
          }
          setIsLoading(false);
          return;
        } catch (error) {
          toast({ title: "Image edit failed", description: error instanceof Error ? error.message : "Could not edit this image with the selected provider.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }
      chatMessages[chatMessages.length - 1].content = [
        { type: "text", text: msgContent || "Analyze this image." },
        { type: "image_url", image_url: { url: imageData } },
      ];
    }


    void captureChatSend(msgContent, chatMode, personality, Boolean(userMessage.attachment));

    const imageAttachment =
      userMessage.attachment?.type === "image" ? userMessage.attachment : null;

    try {
      const assistantReply = await runChatCompletion(chatMessages, conversationId);
      learnFromTurn(msgContent, assistantReply ?? "", conversationId);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        const errMsg = formatChatFetchError(err);
        toast({ title: "Message failed", description: errMsg, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
    return;
    // The following was ripped out:
    /*
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


        } catch (err) {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            const msg = formatChatFetchError(err);
            toast({ title: "Message failed", description: msg, variant: "destructive" });
          }
              | "web"
              | "mobile",
            confidence: toolDetection.confidence,
          }
        : null);

    // Document generator — only opens on explicit slash command (/doc, /draft)
    // or explicit "open document studio" phrasing. Casual mentions of
    // "document" or "report" no longer trigger this (autoExecute is now false).
    if (
      toolDetection.tool === "document_generator" &&
      (/^\/(doc|draft|write|document)\b/i.test(msgContent) ||
       /\b(open|launch|show)\s+(the\s+)?(document\s+(studio|generator|creator)|doc\s+(studio|generator))\b/i.test(msgContent))
    ) {
      if (toolDetection.params?.topic) {
        setDocumentTopic(String(toolDetection.params.topic));
      }
      setShowDocumentGenerator(true);
      return;
    }

    if (appIntent && appIntent.confidence >= 50) {
      const platform = appIntent.platform;
      const statusId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));
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
          providerPayload: {},
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
      const startTime = performance.now();
      trackShadowTalkEvent("mission_started", { mission_id: conversationId, user_id: user?.id, model: "turbo", tool_name: "core_chat" });
      
      const assistantReply = await runChatCompletion(chatMessages, conversationId);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      // In a real streaming implementation, TTFV would be tracked on the first chunk.
      trackShadowTalkEvent("mission_completed", { 
        mission_id: conversationId, 
        user_id: user?.id, 
        duration_ms: totalDuration, 
        success: true 
      });

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
      trackShadowTalkEvent("mission_failed", { mission_id: conversationId, user_id: user?.id, error_type: err instanceof Error ? err.message : "unknown", success: false });
      const msg = formatChatFetchError(err);

      recordFunnelEvent("send_error", msg.slice(0, 80));
      toast({ title: "Message failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
    */
  };


  const handleSwarmComplete = async (finalAnswer: string) => {
    setShowSwarmMode(false);
    if (!finalAnswer) return;

    const userMessage = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
      type: "user" as const,
      content: swarmPrompt,
      timestamp: new Date(),
    };
    
    const aiMessage = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
      type: "ai" as const,
      content: finalAnswer,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage, aiMessage]);
    
    const conversationId = await resolveConversationId();
    if (conversationId && user) {
      await saveMessage(swarmPrompt, "user", conversationId).catch(console.error);
      await saveMessage(finalAnswer, "assistant", conversationId).catch(console.error);
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

  const goToExecute = useCallback(
    (goal: string, deliverable?: string) => {
      const params = new URLSearchParams({ goal });
      if (deliverable) params.set("deliverable", deliverable);
      navigate(`/mission-control?${params.toString()}`);
    },
    [navigate],
  );

  const handleConfirmTool = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      const te = msg?.toolExecution;
      if (!te?.params?.goal) return;
      const mode = (te.params.mode as "general" | "strategy_report" | "research_brief" | "content_pack") || "general";
      goToExecute(te.params.goal);
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


  const handleExport = async () => {
    try {
      const { exportChatToPdf } = await import("@/lib/exportToPdf");
      const pdfMessages = messages.map(m => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
      }));
      await exportChatToPdf(pdfMessages, currentConversationId ? `Conversation ${currentConversationId.slice(0, 6)}` : "ShadowTalk Chat");
      toast({
        title: "Export Successful",
        description: "Your chat log has been saved as a PDF.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "An error occurred while generating the PDF.",
      });
    }
  };

  const insertAssistantToChat = useCallback(
    (content: string) => {
      setMessages((prev) => [
        ...prev,
        { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })), type: "ai", content, timestamp: new Date() },
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

  const [promptSuggestion, setPromptSuggestion] = useState("");

  const handleInputSend = useCallback(() => {
    void handleSendMessage();
  }, [handleSendMessage]);

  const handleInputKeyPress = useCallback((_e: React.KeyboardEvent) => {}, []);

  const handleToggleLiveVoice = useCallback(() => {
    setShowShadowTalkLive(true);
  }, []);

  const handleOpenImageGen = useCallback(() => {
    setChatMode("image");
    setMessage((current) => current ? `${current} ` : "/image ");
  }, []);

  const handlePromptClear = useCallback(() => {
    setPromptSuggestion("");
  }, []);

  const chatInputProps = useMemo(() => ({
    message,
    onMessageChange: setMessage,
    onSend: handleInputSend,
    onKeyPress: handleInputKeyPress,
    onToggleVoice: () => toggleDictation(setMessage),
    onOpenImageGenerator: handleOpenImageGen,
    isLoading,
    isListening,
    onStopGeneration: handleStopGeneration,
    selectedFile,
    onFileSelect: setSelectedFile,
    shadowTwinActive,
    onToggleShadowTwin: () => setShadowTwinActive(v => !v),
    chatMode,
    onModeChange: setChatMode,
    personality,
    layout: "composer" as const,

    promptSuggestion,
    onPromptAccept: setMessage,
    onPromptClear: handlePromptClear,
  }), [
    message,
    handleInputSend,
    handleInputKeyPress,
    toggleDictation,
    handleOpenImageGen,
    isLoading,
    isListening,
    handleStopGeneration,
    selectedFile,
    chatMode,
    personality,

    promptSuggestion,
    handlePromptClear,
  ]);




  return (
    <div className="shadowtalk-chat-shell neural-bg settings-scroll-smooth flex h-full min-h-0 flex-col overflow-hidden">
      <SEOHead meta={PAGE_SEO.chatbot} structuredData={[getChatbotFAQSchema(), getSpeakableSchema(["h1", "[data-speakable]"]), getWebSiteWithSearchSchema()]} />
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
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          conversations={conversations}
          currentConversationId={currentConversationId}
          isArchived={conversationIsArchived}
          onSelect={(id) => {
            void loadConversation(id);
          }}
          onDelete={handleDeleteConversation}
          onArchive={handleArchiveConversation}
          onUnarchive={handleUnarchiveConversation}
          onOpenSettings={() => navigate("/settings")}
        />
        <ChatMobileNavDrawer
          open={showMobileNav}
          onClose={() => setShowMobileNav(false)}
          userInitials={userInitials}
          userDisplayName={userDisplayName}
          onNewChat={handleNewChat}
          conversations={conversations}
          currentConversationId={currentConversationId}
          isArchived={conversationIsArchived}
          onSelect={(id) => {
            void loadConversation(id);
          }}
          onDelete={handleDeleteConversation}
          onArchive={handleArchiveConversation}
          onUnarchive={handleUnarchiveConversation}
          onOpenSettings={() => navigate("/settings")}
        />
        <ChatMainPanel>
          <div className="sticky top-0 z-30 shrink-0 ios-glass-nav border-b border-white/[0.06]">
            <ChatHeader
              variant="minimal"
              userPlan={userPlan}
              personality={personality}
              onPersonalityChange={setPersonality}
              onToggleSidebar={() => {
                if (isMobile) setShowMobileNav(!showMobileNav);
                else toggleSidebar();
              }}
              onSignOut={signOut}
              onOpenCanvas={(type) => navigate("/ide")}

              maxChats="∞"
              dailyChats={messages.length}
              toolsMenuOpen={toolsMenuOpen}
              onToolsMenuOpenChange={setToolsMenuOpen}
              onOpenByok={() => setShowByok(true)}
            />
          </div>
          {hasActiveChat && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ...SETTINGS_SPRING }}
              className="shadowtalk-chat-top-label hidden md:block"
            >
              {BRAND.tagline}
            </motion.p>
          )}
          <EnterpriseWelcomeBanner email={user?.email} displayName={userDisplayName} />

          <ChatToolbar
            hasActiveChat={hasActiveChat}
            conversationCount={conversations.length}
            onNewChat={handleNewChat}
            onOpenHistory={() => {
              if (isMobile) setShowMobileNav(true);
              else if (sidebarCollapsed) toggleSidebar();
            }}
            onClearChat={handleClearCurrentChat}
            onDeleteAllChats={handleClearAllChats}
            encryptionActive={chatPrivate.active}
            encryptionBusy={chatPrivate.busy}
            onEnableEncryption={handleEnableChatEncryption}
            onDisableEncryption={chatPrivate.disablePrivateMode}
            onToggleLiveVoice={handleToggleLiveVoice}
          />


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
                  
                  <ChatEmptyState
                    userDisplayName={userDisplayName}
                    onSelectPrompt={handleQuickPrompt}
                    apiConnectedLabel={null}
                    composerDockStyle={inputDockStyle}
                    onOpenAppIde={() => navigate("/ide")}
                    isDemo={searchParams.get("demo") === "true"}
                    onExecuteDemo={(promptStr: string) => {
                      setMessage(promptStr);
                      setTimeout(() => handleSendMessage(promptStr), 100);
                    }}
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

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SETTINGS_SPRING}
                className="shadowtalk-chat-input-dock shrink-0"
                style={inputDockStyle}
              >
                {costTracker.requestCount > 0 && (
                  <div className="flex justify-center px-4 pb-1.5">
                    <TokenCostBadge
                      tokensPerSecond={costTracker.tokensPerSecond}
                      lastRequestCost={costTracker.lastRequestCost}
                      monthSpendUsd={costTracker.monthSpendUsd}
                      savingsVsChatGptPlus={costTracker.savingsVsChatGptPlus}
                      compact
                    />
                  </div>
                )}
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

        <Dialog open={showByok} onOpenChange={setShowByok}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Your own API key (BYOK)</DialogTitle>
              <DialogDescription>
                Use your own AI provider key when ShadowTalk's built-in AI is down or out of credits.
              </DialogDescription>
            </DialogHeader>
            <SettingsByokCard />
          </DialogContent>
        </Dialog>

        {user && <AiAccessOnboarding userId={user.id} />}

        {/* Floating Live Voice button — visible on ALL screen sizes */}
        <button
          type="button"
          onClick={handleToggleLiveVoice}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_4px_24px_rgba(99,102,241,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          aria-label="Start live voice conversation"
        >
          <Phone className="w-6 h-6" />
        </button>

        {/* Live Voice Mode overlay */}
        <LiveVoiceMode
          open={showShadowTalkLive}
          onClose={() => setShowShadowTalkLive(false)}
          personality={personality}
        />

      

      </motion.div>
      
    </div>
  );
};
export default ChatbotPage;

