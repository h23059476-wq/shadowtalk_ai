import { useState, useEffect, lazy, Suspense, createContext } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import FeedbackAutoPrompt from "@/components/FeedbackAutoPrompt";
import MobileViewportFix from "@/components/MobileViewportFix";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { PageLoader } from "@/components/PageLoader";
import { SiteMotionProvider } from "@/components/motion/SiteMotionProvider";
import SitePageShell from "@/components/motion/SitePageShell";
import GlobalScrollReveal from "@/components/motion/GlobalScrollReveal";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { SecurityProvider } from "@/components/SecurityProvider";
import { ShadowMemoryProvider } from "@/contexts/ShadowMemoryContext";
import { AutoImproveProvider } from "@/contexts/AutoImproveContext";
import { ThemeTemplateProvider } from "@/contexts/ThemeTemplateContext";
import { StealthKillSwitchProvider } from "@/contexts/StealthKillSwitchContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import BootScreen from "@/components/BootScreen";
import { shouldSkipBootScreen } from "@/lib/skipBootScreen";
import { ensureDeviceOnlyPledgeDefaults } from "@/lib/privacy/deviceOnlyPledge";

ensureDeviceOnlyPledgeDefaults();
import CommandPalette from "@/components/CommandPalette";
import { BackToHomeButton } from "@/components/BackToHomeButton";
import { useReferralCapture } from "./hooks/useReferralTracking";
import PersistedAuthRedirect from "@/components/PersistedAuthRedirect";
import WorkspacePathRemember from "@/components/WorkspacePathRemember";
import { GrowthBanners } from "@/components/GrowthBanners";
import { OAuthReturnHandler } from "@/components/OAuthReturnHandler";
import { OAuthRedirectHandler } from "@/components/OAuthRedirectHandler";


export const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} });
 // Critical path pages - loaded immediately
 import Index from "./pages/Index";
 import RootRoute from "@/components/RootRoute";
 import AuthPage from "./pages/AuthPage";
 import AuthDesignGalleryPage from "./pages/AuthDesignGalleryPage";
 import AuthDesignPreviewPage from "./pages/AuthDesignPreviewPage";
 const BackendFlowsPage = lazy(() => import("./pages/BackendFlowsPage"));
 const NotFound = lazy(() => import("./pages/NotFound"));
 const SharedAnswerPage = lazy(() => import("./pages/SharedAnswerPage"));
const SharedMissionPage = lazy(() => import("./pages/SharedMissionPage"));
 import SessionsPage from "./pages/SessionsPage";
 import SelfHealingPage from "./pages/SelfHealingPage";
 import { SelfHealingProvider } from "./components/selfHealing/SelfHealingProvider";
import { NotificationPermissionRequester } from "@/components/notifications/NotificationPermissionRequester";
import { UpdateNotificationProvider } from "@/components/notifications/UpdateNotificationProvider";
import { AutonomousAgentEngine } from "@/components/autonomy/AutonomousAgentEngine";
import { MissionSchedulerEngine } from "@/components/autonomy/MissionSchedulerEngine";
import { ScriptSchedulerEngine } from "@/components/autonomy/ScriptSchedulerEngine";
import { GoalPursuitEngine } from "@/components/autonomy/GoalPursuitEngine";
import { SelfHealingErrorBoundary } from "@/components/selfHealing/SelfHealingErrorBoundary";
import { NetworkTransitionOverlay } from "@/components/chat/NetworkTransitionOverlay";
import { PushIntelligencePanel } from "@/components/chat/PushIntelligencePanel";
import GlobalMaintenanceNotice from "@/components/GlobalMaintenanceNotice";
 
 // Lazy loaded pages - code splitting for better performance
 const PricingPage = lazy(() => import("./pages/PricingPage"));
 const ChatbotPage = lazy(() => import("./pages/ChatbotPage"));
 const AdminPage = lazy(() => import("./pages/AdminPage"));
 const DocsPage = lazy(() => import("./pages/DocsPage"));
 const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
 const ChatRoomsPage = lazy(() => import("./pages/ChatRoomsPage"));
 const CollaborativeRoom = lazy(() => import("./pages/CollaborativeRoom"));
 const ProfilePage = lazy(() => import("./pages/ProfilePage"));
 const SettingsPage = lazy(() => import("./pages/SettingsPage"));
 const APIPage = lazy(() => import("./pages/APIPage"));
 const EnterpriseSettingsPage = lazy(() => import("./pages/EnterpriseSettingsPage"));
 const LocalModelsPage = lazy(() => import("./pages/LocalModelsPage"));
 const PrivateAiHubPage = lazy(() => import("./pages/PrivateAiHubPage"));
 const AboutPage = lazy(() => import("./pages/AboutPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const AbdulRaufPage = lazy(() => import("./pages/AbdulRaufPage"));
const MuhammadUmarPage = lazy(() => import("./pages/MuhammadUmarPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const RolloutPlanPage = lazy(() => import("./pages/RolloutPlanPage"));
const StockScenariosPage = lazy(() => import("./pages/StockScenariosPage"));
 const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage"));
 const FAQPage = lazy(() => import("./pages/FAQPage"));
 const ContactPage = lazy(() => import("./pages/ContactPage"));
 const StatusPage = lazy(() => import("./pages/StatusPage"));
 const BlogPage = lazy(() => import("./pages/BlogPage"));
 const CareersPage = lazy(() => import("./pages/CareersPage"));
 const PressPage = lazy(() => import("./pages/PressPage"));
 const FactsPage = lazy(() => import("./pages/FactsPage"));
const AnswersPage = lazy(() => import("./pages/AnswersPage"));
const ZainAhmedPage = lazy(() => import("./pages/ZainAhmedPage"));
const VsPage = lazy(() => import("./pages/VsPage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const LearnTopicPage = lazy(() => import("./pages/LearnTopicPage"));
const GoogleSeoHubPage = lazy(() => import("./pages/GoogleSeoHubPage"));
const WedgeLandingPage = lazy(() => import("./pages/WedgeLandingPage"));
const CaseStudiesPage = lazy(() => import("./pages/CaseStudiesPage"));
const PartnershipsPage = lazy(() => import("./pages/PartnershipsPage"));
 const ComputerModePage = lazy(() => import("./pages/ComputerModePage"));
 const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
 const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
 const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
 const GDPRPage = lazy(() => import("./pages/GDPRPage"));
 const MonetizationPage = lazy(() => import("./pages/MonetizationPage"));
 const FounderAccessPage = lazy(() => import("./pages/FounderAccessPage"));
 const StrategyAgentPage = lazy(() => import("./pages/StrategyAgentPage"));
  const IdePage = lazy(() => import("./pages/IdePage"));
  const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
  const DevelopersPage = lazy(() => import("./pages/DevelopersPage"));
  const ContentForgePage = lazy(() => import("./pages/ContentForgePage"));
  const VideoStudioPage = lazy(() => import("./pages/VideoStudioPage"));
  const WorkspaceHubPage = lazy(() => import("./pages/WorkspaceHubPage"));
  const ResearchHubPage = lazy(() => import("./pages/ResearchHubPage"));
  const InsightsHubPage = lazy(() => import("./pages/InsightsHubPage"));
  const MemoryPage = lazy(() => import("./pages/MemoryPage"));
  const ShadowMemoryPage = lazy(() => import("./pages/ShadowMemoryPage"));
  const BusinessMemoryPage = lazy(() => import("./pages/BusinessMemoryPage"));
  const MemoryDashboard = lazy(() => import("@/components/memory/MemoryDashboard"));
  const SecurityHubPage = lazy(() => import("./pages/SecurityHubPage"));
   const MissionControlPage = lazy(() => import("./pages/MissionControlPage"));
 const ExecutePage = lazy(() => import("./pages/ExecutePage"));
   const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const StrategyLabPage = lazy(() => import("./pages/StrategyLabPage"));
const SovereignDataPage = lazy(() => import("./pages/SovereignDataPage"));
const SovereignWalletPage = lazy(() => import("./pages/SovereignWalletPage"));
const GhostAdsPage = lazy(() => import("./pages/GhostAdsPage"));
const TransparencyPage = lazy(() => import("./pages/TransparencyPage"));
const CommandCenterPage = lazy(() => import("./pages/CommandCenterPage"));
const CompetitivePage = lazy(() => import("./pages/CompetitivePage"));
const ComparisonDetailPage = lazy(() => import("./pages/ComparisonDetailPage"));
const AgentArchitecturePage = lazy(() => import("./pages/AgentArchitecturePage"));
const ComplianceDashboardPage = lazy(() => import("./pages/ComplianceDashboardPage"));
const AutoImproveEngine = lazy(() => import("@/components/autoImprove/AutoImproveEngine"));
const PersonalLLMPage = lazy(() => import("./pages/PersonalLLMPage"));
const PromptsPage = lazy(() => import("./pages/PromptsPage"));
const PrivacyCheckerPage = lazy(() => import("./pages/PromptPrivacyCheckerPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const WhatsAppContactsPage = lazy(() => import("./pages/WhatsAppContactsPage"));
const PWABanner = lazy(() => import("./components/PWABanner"));
const CookieConsent = lazy(() => import("./components/CookieConsent"));
const CustomerSupportWidget = lazy(() => import("./components/CustomerSupportWidget"));
const ShadowMemoryTracker = lazy(() => import("./components/ShadowMemoryTracker"));
const JourneyTracker = lazy(() => import("./components/JourneyTracker").then(m => ({ default: m.JourneyTracker })));
const VoiceCommandSystem = lazy(() => import("./components/VoiceCommandSystem"));
const ShadowHealEngine = lazy(() =>
  import("./components/shadowHeal/ShadowHealEngine").then((m) => ({ default: m.ShadowHealEngine })),
);
const ShadowScaleEngine = lazy(() =>
  import("./components/shadowScale/ShadowScaleEngine").then((m) => ({ default: m.ShadowScaleEngine })),
);
const OfflineBootstrapBanner = lazy(() =>
  import("./components/offline/OfflineBootstrapBanner").then((m) => ({ default: m.OfflineBootstrapBanner })),
);
const OnboardingFlow = lazy(() => import("./components/OnboardingFlow"));
// ElevenLabs Agent ID is now configured via the backend secret ELEVENLABS_AGENT_ID

 // Configure React Query with production-ready settings
 const queryClient = new QueryClient({
   defaultOptions: {
     queries: {
       staleTime: 1000 * 60 * 5, // 5 minutes
       gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
       retry: (failureCount, error: unknown) => {
         // Don't retry on 4xx errors except 429
         if (error && typeof error === 'object' && 'status' in error) {
           const status = (error as { status: number }).status;
           if (status >= 400 && status < 500 && status !== 429) {
             return false;
           }
         }
         return failureCount < 3;
       },
       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
     },
     mutations: {
       retry: false,
     },
   },
 });
 

const AnimatedRoutes = () => {
  const location = useLocation();
  useReferralCapture();
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<PageTransition><RootRoute /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/auth/designs" element={<PageTransition><AuthDesignGalleryPage /></PageTransition>} />
          <Route path="/auth/preview/:designId" element={<PageTransition><AuthDesignPreviewPage /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><PricingPage /></PageTransition>} />
          {/* Chat workspace: no PageTransition — avoids opacity-0 flash and flex height collapse */}
          <Route path="/chatbot" element={<Suspense fallback={<PageLoader />}><ChatbotPage /></Suspense>} />
          <Route path="/s/:slug" element={<Suspense fallback={<PageLoader />}><SharedAnswerPage /></Suspense>} />
          <Route path="/mission/:id" element={<PageTransition><SharedMissionPage /></PageTransition>} />
          <Route path="/flows" element={<PageTransition><BackendFlowsPage /></PageTransition>} />
          <Route path="/whatsapp" element={<PageTransition><WhatsAppContactsPage /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
          <Route path="/docs" element={<PageTransition><DocsPage /></PageTransition>} />
          <Route path="/changelog" element={<PageTransition><ChangelogPage /></PageTransition>} />
          <Route path="/rooms" element={<PageTransition><ChatRoomsPage /></PageTransition>} />
          <Route path="/rooms/:roomId" element={<PageTransition><CollaborativeRoom /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="/api" element={<PageTransition><APIPage /></PageTransition>} />
          <Route path="/insights" element={<PageTransition><InsightsHubPage /></PageTransition>} />
          <Route path="/analytics" element={<Navigate to="/insights?tab=usage" replace />} />
          <Route path="/data-insights" element={<Navigate to="/insights?tab=behavior" replace />} />
          <Route path="/shadow-memory" element={<Navigate to="/insights?tab=activity" replace />} />
          <Route path="/memory" element={<PageTransition><MemoryPage /></PageTransition>} />
          <Route path="/enterprise" element={<PageTransition><EnterpriseSettingsPage /></PageTransition>} />
          <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
          <Route path="/team" element={<PageTransition><TeamPage /></PageTransition>} />
          <Route path="/help" element={<PageTransition><HelpCenterPage /></PageTransition>} />
          <Route path="/faq" element={<PageTransition><FAQPage /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/status" element={<PageTransition><StatusPage /></PageTransition>} />
          <Route path="/blog" element={<PageTransition><BlogPage /></PageTransition>} />
          <Route path="/careers" element={<PageTransition><CareersPage /></PageTransition>} />
          <Route path="/press" element={<PageTransition><PressPage /></PageTransition>} />
          <Route path="/facts" element={<PageTransition><FactsPage /></PageTransition>} />
          <Route path="/answers" element={<PageTransition><AnswersPage /></PageTransition>} />
          <Route path="/zain-ahmed-fahad-patel" element={<PageTransition><ZainAhmedPage /></PageTransition>} />
          <Route path="/zain-ahmed" element={<Navigate to="/zain-ahmed-fahad-patel" replace />} />
          <Route path="/founder" element={<Navigate to="/zain-ahmed-fahad-patel" replace />} />
          <Route path="/discover" element={<PageTransition><DiscoverPage /></PageTransition>} />
          <Route path="/google-seo" element={<PageTransition><GoogleSeoHubPage /></PageTransition>} />
          <Route path="/learn/:slug" element={<PageTransition><LearnTopicPage /></PageTransition>} />
          <Route path="/vs/:slug" element={<PageTransition><VsPage /></PageTransition>} />
          <Route path="/ai-strategy-consultant" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/ai-business-planner" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/ai-marketing-planner" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/anonymous-ai" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/private-ai-no-training" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/no-login-ai-chat" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/multilingual-ai" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/best-ai-non-english" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/ai-translation-chat" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/support/20-languages" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/translator/ai-chat-translator" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/case-study-ai-strategy-psf" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/zain-ahmed-fahad-patel-founder" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/pricing/team-enterprise" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/pricing/co-marketing" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/partnerships/notion-integration" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/partnerships/slack-bot" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/partnerships/complementary-tools" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/docs/geos" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/resources/strategy-planner" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/resources/code-snippets" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/resources/meme-pack" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/resources/privacy-checklist" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/review-platforms/g2-listing" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/review-platforms/capterra-listing" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/review-platforms/producthunt-listing" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/review-platforms/review-ask-email" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/referral/activation-guide" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/referral/social-share-templates" element={<PageTransition><WedgeLandingPage /></PageTransition>} />
          <Route path="/case-studies" element={<PageTransition><CaseStudiesPage /></PageTransition>} />
          <Route path="/partnerships" element={<PageTransition><PartnershipsPage /></PageTransition>} />
          <Route path="/computer" element={<PageTransition><ComputerModePage /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicyPage /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfServicePage /></PageTransition>} />
          <Route path="/cookies" element={<PageTransition><CookiePolicyPage /></PageTransition>} />
          <Route path="/gdpr" element={<PageTransition><GDPRPage /></PageTransition>} />
          <Route path="/billing" element={<PageTransition><MonetizationPage /></PageTransition>} />
          <Route path="/founder-access" element={<PageTransition><FounderAccessPage /></PageTransition>} />
          <Route path="/lifetime-deal" element={<Navigate to="/pricing" replace />} />
          <Route path="/execute" element={<PageTransition><ExecutePage /></PageTransition>} />
          <Route path="/strategy" element={<PageTransition><StrategyAgentPage /></PageTransition>} />
          <Route path="/workspace" element={<PageTransition><WorkspaceHubPage /></PageTransition>} />
          <Route path="/business-memory" element={<Navigate to="/workspace?tab=explore" replace />} />
          <Route path="/ide" element={<PageTransition><IdePage /></PageTransition>} />
          <Route path="/marketplace" element={<PageTransition><MarketplacePage /></PageTransition>} />
          <Route path="/developers" element={<PageTransition><DevelopersPage /></PageTransition>} />
          <Route path="/prompts" element={<PageTransition><PromptsPage /></PageTransition>} />
          <Route path="/prompts/privacy-checker" element={<PageTransition><PrivacyCheckerPage /></PageTransition>} />
          <Route path="/security" element={<PageTransition><SecurityHubPage /></PageTransition>} />
          <Route path="/vault" element={<Navigate to="/security?tab=vault" replace />} />
          <Route path="/privacy-score" element={<Navigate to="/security?tab=score" replace />} />
          <Route path="/security-audit" element={<Navigate to="/security?tab=audit" replace />} />
          <Route path="/trust" element={<Navigate to="/security?tab=trust" replace />} />
          <Route path="/cyber" element={<Navigate to="/security?tab=cyber" replace />} />
          <Route path="/forge" element={<PageTransition><ContentForgePage /></PageTransition>} />
          <Route path="/video-studio" element={<PageTransition><VideoStudioPage /></PageTransition>} />
          <Route path="/presentations" element={<Navigate to="/forge?mode=slides" replace />} />
          <Route path="/missioncontrol" element={<PageTransition><MissionControlPage /></PageTransition>} />
          <Route path="/referral" element={<PageTransition><ReferralPage /></PageTransition>} />
          <Route path="/research" element={<PageTransition><ResearchHubPage /></PageTransition>} />
          <Route path="/knowledge" element={<Navigate to="/research?tab=knowledge" replace />} />
          <Route path="/deep-research" element={<Navigate to="/research?tab=investigate" replace />} />
          <Route path="/knowledge-graph" element={<Navigate to="/research?tab=knowledge" replace />} />
          <Route path="/strategy-lab" element={<PageTransition><StrategyLabPage /></PageTransition>} />
          <Route path="/sovereign-data" element={<PageTransition><SovereignDataPage /></PageTransition>} />
          <Route path="/wallet" element={<PageTransition><SovereignWalletPage /></PageTransition>} />
          <Route path="/ghost-ads" element={<PageTransition><GhostAdsPage /></PageTransition>} />
          <Route path="/offline-license" element={<PageTransition><LocalModelsPage /></PageTransition>} />
          <Route path="/enterprise-license" element={<Navigate to="/offline-license" replace />} />
          <Route path="/transparency" element={<PageTransition><TransparencyPage /></PageTransition>} />
          <Route path="/studio" element={<Navigate to="/forge?mode=studio" replace />} />
          <Route path="/command-center" element={<PageTransition><CommandCenterPage /></PageTransition>} />
          <Route path="/competitive" element={<PageTransition><CompetitivePage /></PageTransition>} />
          <Route path="/compare/:slug" element={<PageTransition><ComparisonDetailPage /></PageTransition>} />
          <Route path="/agents" element={<PageTransition><MarketplacePage /></PageTransition>} />
          <Route path="/compliance" element={<PageTransition><ComplianceDashboardPage /></PageTransition>} />
          <Route path="/personal-llm" element={<PageTransition><PersonalLLMPage /></PageTransition>} />
          <Route path="/templates" element={<PageTransition><TemplatesPage /></PageTransition>} />
          <Route path="/theme" element={<Navigate to="/templates?tab=custom" replace />} />
          <Route path="/themes" element={<Navigate to="/templates" replace />} />
          <Route path="/downloads" element={<PageTransition><DownloadsPage /></PageTransition>} />
          <Route path="/download" element={<Navigate to="/downloads" replace />} />
          <Route path="/sessions" element={<PageTransition><SessionsPage /></PageTransition>} />
          <Route path="/self-healing" element={<PageTransition><SelfHealingPage /></PageTransition>} />
          <Route path="/local-models" element={<PageTransition><LocalModelsPage /></PageTransition>} />
          <Route path="/settings/local-models" element={<Navigate to="/local-models" replace />} />
          <Route path="/abdul-rauf-ceo" element={<PageTransition><AbdulRaufPage /></PageTransition>} />
          <Route path="/muhammad-umar-cfo" element={<PageTransition><MuhammadUmarPage /></PageTransition>} />
          <Route path="/leaderboard" element={<PageTransition><LeaderboardPage /></PageTransition>} />
          <Route path="/rollout-plan" element={<PageTransition><RolloutPlanPage /></PageTransition>} />
          <Route path="/stock-scenarios" element={<PageTransition><StockScenariosPage /></PageTransition>} />
          <Route path="/private-ai" element={<PageTransition><PrivateAiHubPage /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

const App = () => {
  const skipBoot = shouldSkipBootScreen();
  const [showBootScreen, setShowBootScreen] = useState(() => !skipBoot);
  const [hasBooted, setHasBooted] = useState(() => skipBoot);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [deferredChrome, setDeferredChrome] = useState(false);

  useEffect(() => {
    import("@/lib/shadowMode").then(({ initShadowMode }) => initShadowMode());
    import("@/lib/profilePreferences").then(({ initProfileUiPreferences }) => initProfileUiPreferences());
    import("@/lib/themes/applyTheme").then(({ restoreStoredTheme }) => restoreStoredTheme());

    const hasSeenBoot = sessionStorage.getItem('shadowtalk-booted');
    if (hasSeenBoot || shouldSkipBootScreen()) {
      setShowBootScreen(false);
      setHasBooted(true);
    }

    const enableChrome = () => setDeferredChrome(true);
    if (typeof window.requestIdleCallback === "function") {
      const chromeId = window.requestIdleCallback(enableChrome, { timeout: 4000 });
      const cleanupChrome = () => window.cancelIdleCallback(chromeId);

      const resumeOffline = () => {
        void import('@/lib/offline/bootstrapLocalModel').then(({ bootstrapCachedLocalModel }) =>
          bootstrapCachedLocalModel().catch((e) => console.warn('[Offline] bootstrap failed', e)),
        );
      };

      const offlineId = window.requestIdleCallback(resumeOffline, { timeout: 12000 });
      return () => {
        cleanupChrome();
        window.cancelIdleCallback(offlineId);
      };
    }

    const t = window.setTimeout(enableChrome, 1500);
    return () => window.clearTimeout(t);
  }, []);

  const handleBootComplete = () => {
    sessionStorage.setItem('shadowtalk-booted', 'true');
    setShowBootScreen(false);
    setHasBooted(true);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false} storageKey="shadowtalk-ui-theme">
          <TooltipProvider>
            <AuthProvider>
              <StealthKillSwitchProvider>
              <SecurityProvider>
              <SelfHealingProvider>
              <ShadowMemoryProvider>
              <AutoImproveProvider>
              <ThemeTemplateProvider>
              <CommandPaletteContext.Provider value={{ open: () => setCmdOpen(true) }}>
              {showBootScreen && !hasBooted && (
                <BootScreen onComplete={handleBootComplete} />
              )}
              <Toaster />
              <Sonner />
              <GlobalMaintenanceNotice />
              <FeedbackAutoPrompt />
               <BrowserRouter>
                 <MobileViewportFix />
                 <UpdateNotificationProvider />
                 <NetworkTransitionOverlay />
                 <PushIntelligencePanel />
                 <SelfHealingErrorBoundary>
                 <SiteMotionProvider>
                   <SitePageShell>
                     <GlobalScrollReveal />
                     <PersistedAuthRedirect />
                     <OAuthRedirectHandler />
                     <OAuthReturnHandler />
                     <WorkspacePathRemember />
                      <NotificationPermissionRequester />
                     <GrowthBanners />
                     <AnimatedRoutes />
                     <BackToHomeButton />
                   </SitePageShell>
                 </SiteMotionProvider>
                 </SelfHealingErrorBoundary>
                 <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
                  {deferredChrome && (
                    <Suspense fallback={null}>
                      <OfflineBootstrapBanner />
                      <OnboardingFlow />
                      <ShadowMemoryTracker />
                      <JourneyTracker />
                      <AutoImproveEngine />
                      <ShadowHealEngine />
                      <ShadowScaleEngine />
                      <AutonomousAgentEngine />
                      <MissionSchedulerEngine />
                      <ScriptSchedulerEngine />
                      <GoalPursuitEngine />
                      <VoiceCommandSystem />
                      <PWABanner />
                      <CookieConsent />
                      <CustomerSupportWidget />
                    </Suspense>
                  )}
               </BrowserRouter>
              </CommandPaletteContext.Provider>
              </ThemeTemplateProvider>
              </AutoImproveProvider>
              </ShadowMemoryProvider>
              </SelfHealingProvider>
              </SecurityProvider>
              </StealthKillSwitchProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
