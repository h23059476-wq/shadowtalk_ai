import { useAnalytics } from "@/components/admin/intelligence/useAnalytics";
import { useFounderCheck } from "@/hooks/useFounderCheck";
import { useAuth } from "@/components/AuthProvider";
import { Sidebar } from "@/components/admin/intelligence/layout/Sidebar";
import { Header } from "@/components/admin/intelligence/layout/Header";
import { StateViewWrapper } from "@/components/admin/intelligence/common/StateViewWrapper";
import { CommandCenterView } from "@/components/admin/intelligence/views/CommandCenterView";
import { UserIntelligenceView } from "@/components/admin/intelligence/views/UserIntelligenceView";
import { MissionAnalyticsView } from "@/components/admin/intelligence/views/MissionAnalyticsView";
import { AiIntelligenceView } from "@/components/admin/intelligence/views/AiIntelligenceView";
import { CostIntelligenceView } from "@/components/admin/intelligence/views/CostIntelligenceView";
import { GrowthIntelligenceView } from "@/components/admin/intelligence/views/GrowthIntelligenceView";
import { PerformanceView } from "@/components/admin/intelligence/views/PerformanceView";
import { PrivacySecurityView } from "@/components/admin/intelligence/views/PrivacySecurityView";
import { ReportsView } from "@/components/admin/intelligence/views/ReportsView";
import { EventIngestionModal } from "@/components/admin/intelligence/modals/EventIngestionModal";
import { Check } from "lucide-react";

export default function IntelligenceCenterPage() {
  const { user, loading: authLoading } = useAuth();
  const { isFounder, loading: roleLoading } = useFounderCheck();
  const accessGranted = Boolean(user && isFounder);
  const accessLoading = authLoading || roleLoading;
  const { activeView, selectView, timeRange, setTimeRange, comparison, setComparison, dataset, isLoading, isRefreshing, error, isSidebarCollapsed, setIsSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, isIngestModalOpen, setIsIngestModalOpen, toastMessage, handleRefresh, handleExport, handleIngestLiveEvent, handleCreateReport, loadData } = useAnalytics();

  if (accessLoading) return (<div className="min-h-screen bg-[#090b10] text-slate-100 flex items-center justify-center"><div className="text-sm text-slate-400 font-mono animate-pulse">Verifying founder access…</div></div>);
  if (!accessGranted) return (<div className="min-h-screen bg-[#090b10] text-slate-100 flex items-center justify-center"><div className="text-center space-y-3"><div className="text-2xl font-bold text-slate-200">Access Denied</div><div className="text-sm text-slate-400">The Intelligence Center is restricted to the founder account.</div><a href="/admin" className="inline-block text-xs text-indigo-400 hover:text-indigo-300 font-mono">← Back to Admin</a></div></div>);

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans">
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-1.5 text-xs font-mono text-slate-400 flex items-center justify-between z-40">
        <div className="flex items-center gap-2"><span className="text-indigo-400 font-semibold">Route:</span><span className="text-slate-200 font-medium">/admin/intelligence</span></div>
        <div className="flex items-center gap-3 text-[11px]"><span className="text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />Zero-PII Active</span></div>
      </div>
      <div className="flex flex-1 relative">
        <Sidebar activeView={activeView} onSelectView={selectView} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isOpenMobile={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} onOpenIngestModal={() => setIsIngestModalOpen(true)} totalEventsCount={dataset?.meta.totalIngestedEvents || 0} />
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
          <Header activeView={activeView} timeRange={timeRange} onTimeRangeChange={setTimeRange} comparison={comparison} onComparisonChange={setComparison} onRefresh={handleRefresh} isRefreshing={isRefreshing} onExport={handleExport} onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <StateViewWrapper isLoading={isLoading} isError={!!error} errorMessage={error || "Failed to query telemetry dataset"} onRetry={() => loadData(false)}>
              {dataset && (<>
                {activeView === "command-center" && <CommandCenterView data={dataset.overview} isLoading={isRefreshing} />}
                {activeView === "user-intelligence" && <UserIntelligenceView data={dataset.userIntelligence} isLoading={isRefreshing} />}
                {activeView === "mission-analytics" && <MissionAnalyticsView data={dataset.missionAnalytics} isLoading={isRefreshing} />}
                {activeView === "ai-intelligence" && <AiIntelligenceView data={dataset.aiIntelligence} isLoading={isRefreshing} />}
                {activeView === "cost-intelligence" && <CostIntelligenceView data={dataset.costIntelligence} isLoading={isRefreshing} />}
                {activeView === "growth-intelligence" && <GrowthIntelligenceView data={dataset.growthIntelligence} isLoading={isRefreshing} />}
                {activeView === "performance" && <PerformanceView data={dataset.performance} isLoading={isRefreshing} />}
                {activeView === "privacy-security" && <PrivacySecurityView data={dataset.privacySecurity} isLoading={isRefreshing} />}
                {activeView === "reports" && <ReportsView data={dataset.reports} timeRange={timeRange} comparison={comparison} onExport={handleExport} onCreateReport={handleCreateReport} isLoading={isRefreshing} />}
              </>)}
            </StateViewWrapper>
          </main>
          <footer className="border-t border-slate-800/80 px-6 py-4 text-xs text-slate-500 font-mono flex items-center justify-between mt-auto"><div>ShadowTalk-AI · First-Party Intelligence Platform</div></footer>
        </div>
      </div>
      <EventIngestionModal isOpen={isIngestModalOpen} onClose={() => setIsIngestModalOpen(false)} onIngest={handleIngestLiveEvent} />
      {toastMessage && (<div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-indigo-500/40 text-slate-200 text-xs shadow-2xl font-mono"><Check className="w-4 h-4 text-emerald-400" /><span>{toastMessage}</span></div>)}
    </div>
  );
}
