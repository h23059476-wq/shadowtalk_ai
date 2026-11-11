import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

function readSrc(relative: string): string {
  return readFileSync(resolve(root, "src", relative), "utf-8");
}

describe("feature wiring verification", () => {
  it("App.tsx mounts global engines", () => {
    const app = readSrc("App.tsx");
    const required = [
      "UpdateNotificationProvider",
      "NetworkTransitionOverlay",
      "PushIntelligencePanel",
      "SelfHealingErrorBoundary",
      "OfflineBootstrapBanner",
      "VoiceCommandSystem",
      "AutonomousAgentEngine",
      "MissionSchedulerEngine",
      "GoalPursuitEngine",
      'path="/enterprise-license"',
    ];
    for (const token of required) {
      expect(app).toContain(token);
    }
  });

  it("ChatbotPage wires chat modals and dispatch", () => {
    const chat = readSrc("pages/ChatbotPage.tsx");
    const modals = [
      "MultiModelOrchestrator",
      "CreativeSynthesis",
      "VisualReasoning",
      "ImageDecoder",
      "DailyPlanner",
      "IntelligenceHub",
      "KnowledgeVault",
      "BrowseActivityPanel",
      "CognitiveLoopPanel",
      "dispatchDetectionAsync",
      "continueFromCritic",
      "selfHealedFetch",
      "upsertGoalsFromMessage",
      "callChatImageEdit",
      "buildVisionUserMessage",
    ];
    for (const token of modals) {
      expect(chat).toContain(token);
    }
    expect(chat).toContain('case "multi-model"');
    expect(chat).toContain('case "cognitive-loop"');
    expect(chat).toContain('navigate("/enterprise")');
  });

  it("OfflineToolsPanel includes offline sub-panels", () => {
    const panel = readSrc("components/chat/OfflineToolsPanel.tsx");
    expect(panel).toContain("OfflineResearchPanel");
    expect(panel).toContain("OfflineStrategyAgent");
    expect(panel).toContain("OfflineKnowledgeExplorer");
    expect(panel).toContain("OfflineAnalyticsPanel");
    expect(panel).toContain("OfflineDocumentUpload");
  });

  it("stub pages replaced with real components", () => {
    expect(readSrc("pages/PersonalLLMPage.tsx")).toContain("ModelFineTuning");
    expect(readSrc("pages/StrategyLabPage.tsx")).toContain("OfflineStrategyAgent");
    expect(readSrc("pages/PersonalLLMPage.tsx")).not.toContain("OfflineDisabledNotice");
  });

  it("settings exposes autonomous mode toggle", () => {
    const settings = readSrc("components/settings/SettingsSectionPanels.tsx");
    const page = readSrc("pages/SettingsPage.tsx");
    expect(settings).toContain("autonomyEnabled");
    expect(settings).toContain("Enable autonomous mode");
    expect(page).toContain("setAutonomousModeEnabled");
  });

  it("ChatToolbar shows offline indicator", () => {
    expect(readSrc("components/chat/ChatToolbar.tsx")).toContain("OfflineModeIndicator");
  });

  it("missioncontrol route renders Mission Control UI", () => {
    const app = readSrc("App.tsx");
    expect(app).toContain('path="/missioncontrol"');
    expect(app).toContain("MissionControlPage");
    expect(readSrc("pages/MissionControlPage.tsx")).toContain("MissionControl");
    expect(readSrc("pages/MissionControlPage.tsx")).toContain("goal");
  });

  it("settings links sessions and self-healing diagnostics", () => {
    const settings = readSrc("components/settings/SettingsSectionPanels.tsx");
    expect(settings).toContain('href: "/sessions"');
    expect(settings).toContain('href: "/self-healing"');
  });

  it("Shadow Heal Engine mounted for 24/7 healing", () => {
    const app = readSrc("App.tsx");
    expect(app).toContain("ShadowHealEngine");
    expect(readSrc("components/shadowHeal/ShadowHealEngine.tsx")).toContain("startShadowHealEngine");
  });

  it("hub pages wire insert-to-chat and script run", () => {
    expect(readSrc("pages/ResearchHubPage.tsx")).toContain("queueChatInsert");
    expect(readSrc("pages/ResearchHubPage.tsx")).toContain("onInsertToChat={handleInsertToChat}");
    expect(readSrc("pages/WorkspaceHubPage.tsx")).toContain("onRunScript={handleRunScript}");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("consumePendingChatInsert");
  });

  it("command routes include computer mode", () => {
    expect(readSrc("lib/chatCommandRoutes.ts")).toContain('computer: "/computer"');
  });

  it("ShadowSpectre model wired in chat, cyber command, and edge config", () => {
    const chat = readSrc("pages/ChatbotPage.tsx");
    expect(chat).toContain('chatMode === "shadowspectre"');
    expect(chat).toContain("streamShadowSpectre");
    expect(chat).toContain("ShadowSpectreScopeBar");
    expect(chat).toContain('case "shadowspectre"');

    expect(readSrc("components/chat/ModeSelector.tsx")).toContain('"shadowspectre"');
    expect(readSrc("components/cyber/CyberAICopilot.tsx")).toContain("streamShadowSpectre");
    expect(readSrc("lib/privacy/cloudEgressGuard.ts")).toContain("/functions/v1/shadowspectre");
    expect(readSrc("components/chat/CommandPalette.tsx")).toContain("shadowspectre");

  });

  it("ShadowScale growth engine and admin Growth Command wired", () => {
    expect(readSrc("App.tsx")).toContain("ShadowScaleEngine");
    expect(readSrc("App.tsx")).toContain("GrowthBanners");
    expect(readSrc("components/GrowthBanners.tsx")).toContain("ShadowScaleGrowthBanner");
    expect(readSrc("components/shadowScale/ShadowScaleEngine.tsx")).toContain("startShadowScaleEngine");
    expect(readSrc("components/admin/GrowthCommandPanel.tsx")).toContain("Growth Command");
    expect(readSrc("components/admin/GrowthCommandPanel.tsx")).toContain("run_worker_only");
    expect(readSrc("components/admin/adminNav.ts")).toContain("growth-command");
    expect(readSrc("App.tsx")).toContain("GrowthBanners");
  });

  it("AEO corpus wired for SEO and answer engines", () => {
    const app = readSrc("App.tsx");
    expect(app).toContain('path="/answers"');
    expect(app).toContain("AnswersPage");
    expect(readSrc("lib/seo.ts")).toContain("https://www.shadowtalk-ai.com/answers");
    expect(readSrc("pages/FAQPage.tsx")).toContain("AEO_ANSWER_CORPUS");
    expect(readSrc("lib/aeo/answerCorpus.ts")).toContain("AEO_ANSWER_CORPUS");

    const llms = readFileSync(resolve(root, "public/llms.txt"), "utf-8");
    expect(llms).toContain("aeo-answers.html");

    const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf-8");
    expect(sitemap).toContain("/answers");
    expect(sitemap).toContain("/aeo-answers.html");
  });

  it("Zain Ahmed founder entity wired for name-search SEO", () => {
    const app = readSrc("App.tsx");
    expect(app).toContain('path="/zain-ahmed-fahad-patel"');
    expect(app).toContain("ZainAhmedPage");
    expect(readSrc("lib/seo.ts")).toContain("Zain Ahmed Fahad Patel");
    expect(readSrc("lib/founderIdentity.ts")).toContain("zain-ahmed-fahad-patel.html");
    expect(readSrc("lib/founderIdentity.ts")).toContain("Zain Ahmed Fahad Patel");

    const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf-8");
    expect(sitemap).toContain("/zain-ahmed-fahad-patel.html");
    expect(sitemap).toMatch(/priority>1\.0+<\/priority>/);

    const llms = readFileSync(resolve(root, "public/llms.txt"), "utf-8");
    expect(llms).toContain("zain-ahmed-fahad-patel.html");
  });

  it("founder social profiles in AEO and identity", () => {
    expect(readSrc("lib/founderIdentity.ts")).toContain("FOUNDER_SOCIAL_PROFILES");
    expect(readSrc("lib/aeo/answerCorpus.ts")).toContain("zain-ahmed-fahad-patel-linkedin");
    expect(readSrc("lib/aeo/answerCorpus.ts")).toContain("zain-ahmed-fahad-patel-instagram");
    expect(readSrc("pages/ZainAhmedPage.tsx")).toContain("FOUNDER_SOCIAL_PROFILES.linkedin");
    expect(readSrc("pages/ZainAhmedPage.tsx")).toContain("FOUNDER_SOCIAL_PROFILES.instagram");
  });

  it("viral autonomous assets wired", () => {
    expect(readSrc("App.tsx")).toContain('path="/discover"');
    expect(readSrc("App.tsx")).toContain('path="/vs/:slug"');
    expect(readSrc("lib/viral/comparisonCorpus.ts")).toContain('"chatgpt"');
    expect(readSrc("lib/viral/syncViralAssets.test.ts")).toContain("discover.html");
    expect(readFileSync(resolve(root, "public/og-image.svg"), "utf-8")).toContain("ShadowTalk AI");
  });

  it("Google SEO+AEO hub wired", () => {
    expect(readSrc("App.tsx")).toContain('path="/google-seo"');
    expect(readSrc("App.tsx")).toContain('path="/learn/:slug"');
    expect(readSrc("lib/googleSeo/topicPages.ts")).toContain("best-agentic-ai-workspace");
    expect(readSrc("lib/aeo/answerCorpus.ts")).toContain('category: "google"');
    expect(readSrc("lib/googleSeo/syncGoogleSeoAssets.test.ts")).toContain("google-seo-hub.html");
  });

  it("homepage and chatbot expose founder text for Google crawl", () => {
    expect(readSrc("pages/Index.tsx")).toContain("FounderSpotlightSection");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("FounderCrawlStrip");
    expect(readSrc("lib/seo.ts")).toContain("FOUNDER_HOME_FAQ");
    expect(readSrc("lib/seo.ts")).toContain("getFounderHomeStructuredData");
    const indexHtml = readFileSync(resolve(root, "index.html"), "utf-8");
    expect(indexHtml).toContain("Zain Ahmed Fahad Patel");
    expect(indexHtml).toContain("zain-ahmed-fahad-patel-shadowtalk");
    expect(indexHtml).toContain('rel="author"');
  });

  it("feature wiring pack — modals, limits, legacy routes", () => {
    expect(readSrc("pages/MissionControlPage.tsx")).toContain("MissionControl");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("PlanetaryActionModal");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("ScreenAgent");
    expect(readSrc("components/chat/ShadowTalkLive.tsx")).toContain("useVoiceSessionLimits");
    expect(readSrc("components/hubs/panels/KnowledgeHubPanel.tsx")).toContain("OfflineAnalyticsPanel");
    expect(readSrc("components/chat/ChatToolbar.tsx")).toContain("HardwareTurboBadge");
    expect(readSrc("lib/chatCommandRoutes.ts")).toContain('"eco"');
    expect(readSrc("App.tsx")).toContain("/deep-research");
    expect(readSrc("components/chat/SovereignDataDashboard.tsx")).toContain("/security?tab=vault");
  });

  it("ShadowTalk strengthen pack wired", () => {
    expect(readSrc("lib/seo/syncPublicSeoAssets.ts")).toContain("renderSitemapXml");
    expect(readSrc("lib/seo/generateSitemap.ts")).toContain("/research");
    expect(readSrc("components/hubs/UnifiedHubShell.tsx")).toContain("PageMeta");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("useDailyLimits");
    // FREE ACCESS TRANSITION: monetization UI must stay unwired.
    expect(readSrc("pages/ChatbotPage.tsx")).not.toContain("UsageLimitBanner");
    expect(readSrc("pages/ChatbotPage.tsx")).not.toContain("ChatUpgradeNudge");
    expect(readSrc("pages/ChatbotPage.tsx")).not.toContain("UpgradePrompt");
    expect(readSrc("pages/ChatbotPage.tsx")).not.toContain("AdBanner");
    expect(readSrc("hooks/useFeatureGating.ts")).toContain("FREE_ACCESS_FOR_EVERYONE");
    expect(readSrc("hooks/useFeatureGating.ts")).toContain("FREE_TIER_DAILY");
    expect(readSrc("contexts/PlatformMetricsContext.tsx")).toContain("get_public_platform_metrics");
    expect(readFileSync(resolve(root, "package.json"), "utf-8")).toContain('"sync:seo"');
    expect(readFileSync(resolve(root, "package.json"), "utf-8")).toContain('"prebuild"');
    expect(readSrc("App.tsx")).toContain('lazy(() => import("./pages/ChatbotPage"))');
  });

  it("feature wiring phase 2 — vision agent, memory hooks, edge limits", () => {
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("VisionAgentModal");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain('case "vision-agent"');
    expect(readSrc("lib/chatCommandRoutes.ts")).toContain('"vision-agent"');
    expect(readSrc("components/chat/VisualKnowledgeGraph.tsx")).toContain("useMemoryGraph");
    expect(readSrc("components/chat/VisualKnowledgeGraph.tsx")).toContain("useKnowledgeSnapshot");
    expect(readSrc("components/chat/ModelFineTuning.tsx")).toContain("usePersonalLLMStore");
  });

  it("full feature wiring — in-chat modals and onboarding", () => {
    const chat = readSrc("pages/ChatbotPage.tsx");
    expect(chat).toContain("AgenticTaskRunner");
    expect(chat).toContain("AIAgentWorkflows");
    expect(chat).toContain("AnalyticsDashboard");
    expect(chat).toContain("GeminiKeyAnalytics");
    expect(chat).toContain("DataOrganizer");
    expect(chat).toContain("UncensoredArena");
    expect(chat).toContain("ShadowCowork");
    expect(chat).toContain("SignInPrompt");
    expect(chat).toContain("InterimCloudConsentDialog");
    expect(chat).toContain('case "agentic"');
    expect(chat).toContain('case "uncensored-arena"');
    expect(readSrc("components/OnboardingFlow.tsx")).toContain("WelcomeDialog");
    expect(readSrc("components/chat/IntelligenceHub.tsx")).toContain("MemoryPanel");
    expect(readSrc("components/chat/ChatToolbar.tsx")).toContain("OfflineAIIndicator");
    expect(readSrc("components/chat/OfflineToolsPanel.tsx")).toContain("OfflineCapabilityIndicator");
    expect(readSrc("lib/chatCommandRoutes.ts")).toContain('"agentic"');
    expect(readSrc("lib/chatCommandRoutes.ts")).not.toContain('agentic: "/execute"');
  });

  it("bounce rate fixes wired", () => {
    expect(readSrc("components/RootRoute.tsx")).toContain("<Index />");
    expect(readSrc("components/RootRoute.tsx")).toContain('to="/chatbot"');
    expect(readSrc("components/RootRoute.tsx")).toContain("shouldSkipLandingForReturnVisitor");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("resolveConversationId");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("handleQuickPrompt");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("recordFunnelEvent");
    expect(readSrc("App.tsx")).toContain("GrowthBanners");
    expect(readSrc("hooks/useOfflineBootstrap.ts")).toContain("getSuccessfulSessionCount");
    expect(readSrc("components/chat/ChatEmptyState.tsx")).toContain("Try ShadowTalk");
  });

  it("marketing growth plan wired — trust strip, wedges, GEO", () => {
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("ChatbotTrustStrip");
    expect(readSrc("components/chat/ChatbotTrustStrip.tsx")).toContain("What is ShadowTalk");
    expect(readSrc("lib/marketing/wedgePages.ts")).toContain("ai-strategy-consultant");
    expect(readSrc("lib/marketing/wedgePages.ts")).toContain("anonymous-ai");
    expect(readSrc("App.tsx")).toContain('path="/ai-strategy-consultant"');
    expect(readSrc("App.tsx")).toContain('path="/partnerships"');
    expect(readSrc("App.tsx")).toContain('path="/case-studies"');
    expect(readSrc("lib/marketing/caseStudies.ts")).toContain("PSOF");
    expect(readSrc("lib/seo/syncPublicSeoAssets.ts")).toContain("renderWedgeHtml");
    expect(readSrc("lib/seo/generateSitemap.ts")).toContain("WEDGE_PAGES");
    expect(readSrc("lib/viral/comparisonCorpus.ts")).toContain("chatgpt-strategy");
    expect(readSrc("lib/aeo/answerCorpus.ts")).toContain("best-ai-strategy-consultant");
    expect(readSrc("components/growth/EmbedTryCTA.tsx")).toContain("product_led");
    expect(readSrc("pages/Index.tsx")).toContain("UseCaseWedgesSection");
    expect(readSrc("components/Footer.tsx")).toContain("AI Strategy Consultant");
    expect(readSrc("components/growth/UseCaseQuickLinks.tsx")).toContain("anonymous-ai");
  });

  it("offline default model brain wired for Tier A SmolLM", () => {
    expect(readSrc("lib/offline/smollmEngine.ts")).toContain("mergeMessagesForTierA");
    expect(readSrc("lib/offline/smollmEngine.ts")).toContain("seedDefaultModelKnowledge");
    expect(readSrc("lib/offline/offlineDefaultBrain.ts")).toContain("retrieveOfflineKnowledge");
    expect(readSrc("lib/offline/seedDefaultModelKnowledge.ts")).toContain("AEO_ANSWER_CORPUS");
  });

  it("personal ShadowTalk model wired to chat inference", () => {
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("prependPersonalModelToMessages");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("learnPersonalExampleFromTurn");
    expect(readSrc("pages/ChatbotPage.tsx")).toContain("ensureDefaultPersonalModel");
    expect(readSrc("lib/personalModel/types.ts")).toContain("My ShadowTalk");
    expect(readSrc("components/chat/ModelFineTuning.tsx")).toContain("Personal ShadowTalk Model");
  });
});
