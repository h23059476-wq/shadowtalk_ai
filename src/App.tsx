import { useState, useEffect, lazy, Suspense, createContext } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import MobileViewportFix from "@/components/MobileViewportFix";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { AppError } from "@/lib/AppError";
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
import { AIKeyProvider } from "@/contexts/AIKeyContext";
import { StealthKillSwitchProvider } from "@/contexts/StealthKillSwitchContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import BootScreen from "@/components/BootScreen";
import { shouldSkipBootScreen } from "@/lib/skipBootScreen";
import CommandPalette from "@/components/CommandPalette";
import { BackToHomeButton } from "@/components/BackToHomeButton";
import PersistedAuthRedirect from "@/components/PersistedAuthRedirect";
import { OAuthReturnHandler } from "@/components/OAuthReturnHandler";
import { OAuthRedirectHandler } from "@/components/OAuthRedirectHandler";
import EmailVerificationNotice from "@/components/auth/EmailVerificationNotice";

export const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} });
// Critical path pages - loaded immediately
const RootRoute = lazy(() => import("@/components/RootRoute"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthActionPage = lazy(() => import("./pages/AuthActionPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { NetworkTransitionOverlay } from "@/components/chat/NetworkTransitionOverlay";
 
// Lazy loaded core pages
const ChatbotPage = lazy(() => import("./pages/ChatbotPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AuthDesignGalleryPage = lazy(() => import("./pages/AuthDesignGalleryPage"));
const AuthDesignPreviewPage = lazy(() => import("./pages/AuthDesignPreviewPage"));
const SharedAnswerPage = lazy(() => import("./pages/SharedAnswerPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
// Batch 2 — dev-only visualization demo (redirects to /chatbot in prod builds).
const VizDemoPage = lazy(() => import("./pages/dev/VizDemoPage"));
const AppearanceStudioPage = lazy(() => import("./pages/AppearanceStudioPage"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
const PrivateAiHubPage = lazy(() => import("./pages/PrivateAiHubPage"));
const FounderPage = lazy(() => import("./pages/FounderPage"));
const ZainAhmedBioPage = lazy(() => import("./pages/ZainAhmedBioPage"));
const FatimaPage = lazy(() => import("./pages/FatimaPage"));
const ShadowTwinSettingsPage = lazy(() => import("./pages/ShadowTwinSettingsPage"));
const PublicShadowTwinChat = lazy(() => import("./pages/PublicShadowTwinChat"));
const ShadowMemoryPage = lazy(() => import("./pages/ShadowMemoryPage"));
const TrustPage = lazy(() => import("./pages/TrustPage"));
const KnowledgeGraphPage = lazy(() => import("./pages/KnowledgeGraphPage"));
const AgenticAIWorkspacePage = lazy(() => import("./pages/AgenticAIWorkspacePage"));
const FounderAccessPage = lazy(() => import("./pages/FounderAccessPage"));
const ProofLoopPage = lazy(() => import("./pages/ProofLoopPage"));
const PublicProofCardPage = lazy(() => import("./pages/PublicProofCardPage"));

// Production Company, Support & Legal Pages
const ContactPage = lazy(() => import("./pages/ContactPage"));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const CaseStudiesPage = lazy(() => import("./pages/CaseStudiesPage"));
const BenchmarksPage = lazy(() => import("./pages/BenchmarksPage"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoonPage"));
const AgenticIdePage = lazy(() => import("./pages/AgenticIdePage"));
const GDPRPage = lazy(() => import("./pages/GDPRPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const ComputerPage = lazy(() => import("./pages/ComputerPage"));
const MissionControlPage = lazy(() => import("./pages/MissionControlPage"));
const PersonalLlmPage = lazy(() => import("./pages/PersonalLlmPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const IntelligenceCenterPage = lazy(() => import("./pages/IntelligenceCenterPage"));
const ResearchPage = lazy(() => import("./pages/ResearchPage"));
const DevelopersPage = lazy(() => import("./pages/DevelopersPage"));
const EnterprisePage = lazy(() => import("./pages/EnterprisePage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const SessionsPage = lazy(() => import("./pages/SessionsPage"));

const AutoImproveEngine = lazy(() => import("@/components/autoImprove/AutoImproveEngine"));
const CustomerSupportWidget = lazy(() => import("./components/CustomerSupportWidget"));
const ShadowMemoryTracker = lazy(() => import("./components/ShadowMemoryTracker"));
const JourneyTracker = lazy(() => import("./components/JourneyTracker").then(m => ({ default: m.JourneyTracker })));

  // Configure React Query with production-ready settings
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        const appErr = AppError.fromUnknown(error, 'Failed to fetch data');
        if (appErr.isOperational) {
          import('sonner').then(({ toast }) => toast.error(appErr.message));
        }
      }
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        const appErr = AppError.fromUnknown(error, 'Action failed');
        if (appErr.isOperational) {
          import('sonner').then(({ toast }) => toast.error(appErr.message));
        }
      }
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
        retry: (failureCount, error: unknown) => {
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
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Suspense fallback={<PageLoader />}><PageTransition><RootRoute /></PageTransition></Suspense>} />
          <Route path="/auth" element={<Suspense fallback={<PageLoader />}><PageTransition><AuthPage /></PageTransition></Suspense>} />
          <Route path="/auth/action" element={<Suspense fallback={<PageLoader />}><AuthActionPage /></Suspense>} />
          
          {/* Core App Routes */}
          <Route path="/chatbot" element={<Suspense fallback={<PageLoader />}><ChatbotPage /></Suspense>} />
          <Route path="/themes" element={<Suspense fallback={<PageLoader />}><PageTransition><AppearanceStudioPage /></PageTransition></Suspense>} />
          <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="/shadow-twin" element={<PageTransition><ShadowTwinSettingsPage /></PageTransition>} />
          <Route path="/t/:username" element={<Suspense fallback={<PageLoader />}><PublicShadowTwinChat /></Suspense>} />
          
          <Route path="/auth/designs" element={<Navigate to="/auth" replace />} />
          <Route path="/auth/preview/:designId" element={<Navigate to="/auth" replace />} />
          <Route path="/docs" element={<PageTransition><DocsPage /></PageTransition>} />
          <Route path="/dev/viz-demo" element={<Suspense fallback={<PageLoader />}><PageTransition><VizDemoPage /></PageTransition></Suspense>} />
          <Route path="/s/:slug" element={<Suspense fallback={<PageLoader />}><SharedAnswerPage /></Suspense>} />
          <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><PricingPage /></PageTransition>} />
          <Route path="/security" element={<Suspense fallback={<PageLoader />}><PageTransition><TrustPage /></PageTransition></Suspense>} />
          <Route path="/status" element={<PageTransition><StatusPage /></PageTransition>} />
          <Route path="/founder" element={<PageTransition><FounderPage /></PageTransition>} />
          <Route path="/zain-ahmed" element={<PageTransition><ZainAhmedBioPage /></PageTransition>} />
          <Route path="/zain-ahmed-biography" element={<Navigate to="/zain-ahmed" replace />} />
          <Route path="/zain-ahmed-fahad-patel" element={<Navigate to="/zain-ahmed" replace />} />
          <Route path="/fatima" element={<Navigate to="/about" replace />} />
          <Route path="/co-founder" element={<Navigate to="/about" replace />} />
          <Route path="/sadaf-tayyaba" element={<Navigate to="/about" replace />} />
          <Route path="/changelog" element={<PageTransition><ChangelogPage /></PageTransition>} />
          <Route path="/shadow-memory" element={<Navigate to="/chatbot" replace />} />
          <Route path="/private-ai" element={<Navigate to="/chatbot" replace />} />
          <Route path="/founder-access" element={<Navigate to="/chatbot" replace />} />
          <Route path="/knowledge-graph" element={<Navigate to="/chatbot" replace />} />
          <Route path="/agentic-ai-workspace" element={<Navigate to="/chatbot" replace />} />
          <Route path="/downloads" element={<Suspense fallback={<PageLoader />}><PageTransition><DownloadPage /></PageTransition></Suspense>} />
          <Route path="/google-seo" element={<Navigate to="/home" replace />} />
          <Route path="/press" element={<Navigate to="/home" replace />} />
          <Route path="/ide" element={<Suspense fallback={<PageLoader />}><PageTransition><AgenticIdePage /></PageTransition></Suspense>} />
          <Route path="/missioncontrol" element={<Navigate to="/chatbot" replace />} />
          <Route path="/workspace" element={<Navigate to="/chatbot" replace />} />
          <Route path="/marketplace" element={<Navigate to="/chatbot" replace />} />
          
          {/* Company, Support, Legal & Status Pages */}
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/help" element={<Navigate to="/docs" replace />} />
          <Route path="/faq" element={<PageTransition><FAQPage /></PageTransition>} />
          <Route path="/blog" element={<PageTransition><BlogPage /></PageTransition>} />
          <Route path="/benchmarks" element={<Suspense fallback={<PageLoader />}><PageTransition><BenchmarksPage /></PageTransition></Suspense>} />
          <Route path="/case-studies" element={<Navigate to="/home" replace />} />
          <Route path="/gdpr" element={<PageTransition><GDPRPage /></PageTransition>} />
          <Route path="/cookies" element={<PageTransition><CookiePolicyPage /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfServicePage /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicyPage /></PageTransition>} />

          {/* Feature Pages */}
          <Route path="/proofloop" element={<PageTransition><ProofLoopPage /></PageTransition>} />
          <Route path="/missions" element={<Navigate to="/proofloop" replace />} />
          <Route path="/mission-control" element={<Navigate to="/proofloop" replace />} />
          <Route path="/missioncontrol" element={<Navigate to="/proofloop" replace />} />
          <Route path="/proof/:proofId" element={<PageTransition><PublicProofCardPage /></PageTransition>} />
          <Route path="/mission/:id" element={<PageTransition><PublicProofCardPage /></PageTransition>} />
          <Route path="/analytics" element={<Navigate to="/chatbot" replace />} />
          <Route path="/computer" element={<Navigate to="/chatbot" replace />} />
          <Route path="/personal-llm" element={<Navigate to="/chatbot" replace />} />
          <Route path="/templates" element={<Navigate to="/chatbot" replace />} />
          <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
          <Route path="/admin/intelligence" element={<Suspense fallback={<PageLoader />}><IntelligenceCenterPage /></Suspense>} />
          <Route path="/research" element={<Navigate to="/chatbot" replace />} />
          <Route path="/developers" element={<Navigate to="/chatbot" replace />} />
          <Route path="/enterprise" element={<Navigate to="/chatbot" replace />} />
          <Route path="/referral" element={<Navigate to="/chatbot" replace />} />
          <Route path="/sessions" element={<Navigate to="/chatbot" replace />} />

                    {/* Coming-soon fallbacks for features in active development */}
          <Route path="/ai-strategy-consultant" element={<Navigate to="/chatbot" replace />} />
          <Route path="/anonymous-ai" element={<Navigate to="/chatbot" replace />} />
          <Route path="/answers" element={<Navigate to="/chatbot" replace />} />
          <Route path="/deep-research" element={<Navigate to="/chatbot" replace />} />
          <Route path="/discover" element={<Navigate to="/chatbot" replace />} />
          <Route path="/partnerships" element={<Navigate to="/chatbot" replace />} />
          <Route path="/privacy-score" element={<Navigate to="/chatbot" replace />} />
          <Route path="/security-audit" element={<Navigate to="/chatbot" replace />} />
          <Route path="/studio" element={<Navigate to="/chatbot" replace />} />
          <Route path="/transparency" element={<Navigate to="/chatbot" replace />} />
          <Route path="/trust" element={<Navigate to="/chatbot" replace />} />
          <Route path="/video-studio" element={<Navigate to="/chatbot" replace />} />

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
    
    const hasSeenBoot = sessionStorage.getItem('shadowtalk-booted');
    if (hasSeenBoot || shouldSkipBootScreen()) {
      setShowBootScreen(false);
      setHasBooted(true);
    }

    const enableChrome = () => setDeferredChrome(true);
    if (typeof window.requestIdleCallback === "function") {
      const chromeId = window.requestIdleCallback(enableChrome, { timeout: 4000 });
      const cleanupChrome = () => window.cancelIdleCallback(chromeId);

      return () => {
        cleanupChrome();
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
              <ShadowMemoryProvider>
              <AutoImproveProvider>
              <ThemeTemplateProvider>
              <AIKeyProvider>
              <CommandPaletteContext.Provider value={{ open: () => setCmdOpen(true) }}>
              {showBootScreen && !hasBooted && (
                <BootScreen onComplete={handleBootComplete} />
              )}
              <Toaster />
              <Sonner />
               <BrowserRouter>
                  <MobileViewportFix />
                  <EmailVerificationNotice />
                  <NetworkTransitionOverlay />
                  <SiteMotionProvider>
                    <SitePageShell>
                      <GlobalScrollReveal />
                      <PersistedAuthRedirect />
                      <OAuthRedirectHandler />
                      <OAuthReturnHandler />
                      <AnimatedRoutes />
                      <BackToHomeButton />
                    </SitePageShell>
                  </SiteMotionProvider>
                  <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
                   {deferredChrome && (
                     <Suspense fallback={null}>
                       <ShadowMemoryTracker />
                       <JourneyTracker />
                       <AutoImproveEngine />
                       <CustomerSupportWidget />
                     </Suspense>
                   )}
                </BrowserRouter>
              </CommandPaletteContext.Provider>
              </AIKeyProvider>
              </ThemeTemplateProvider>
              </AutoImproveProvider>
              </ShadowMemoryProvider>
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