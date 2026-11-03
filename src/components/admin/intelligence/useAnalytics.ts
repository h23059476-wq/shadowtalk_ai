import { useState, useEffect, useCallback } from 'react';
import {
  DashboardView,
  TimeRange,
  ComparisonPeriod,
  IntelligenceDataset,
  TelemetryIngestEvent
} from './types';
import { analyticsService } from './analyticsService';

export function useAnalytics() {
  const [activeView, setActiveView] = useState<DashboardView>('command-center');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [comparison, setComparison] = useState<ComparisonPeriod>('previous_period');
  const [dataset, setDataset] = useState<IntelligenceDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with browser URL / hash for /admin/intelligence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as DashboardView;
      const validViews: DashboardView[] = [
        'command-center',
        'user-intelligence',
        'mission-analytics',
        'ai-intelligence',
        'cost-intelligence',
        'growth-intelligence',
        'performance',
        'privacy-security',
        'reports'
      ];
      if (validViews.includes(hash)) {
        setActiveView(hash);
      }
    }
  }, []);

  const selectView = (view: DashboardView) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view;
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadData = useCallback(
    async (silent: boolean = false) => {
      try {
        if (!silent) setIsRefreshing(true);
        setError(null);
        const data = await analyticsService.fetchDataset(timeRange, comparison);
        setDataset(data);
        setIsLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to query telemetry dataset');
        setIsLoading(false);
      } finally {
        setIsRefreshing(false);
      }
    },
    [timeRange, comparison]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData(false);
    triggerToast('Telemetry aggregations updated');
  };

  const handleIngestLiveEvent = async (event: TelemetryIngestEvent) => {
    await analyticsService.ingestEvent(event);
    await loadData(true);
    triggerToast(`Recorded live event: ${event.eventType} via ${event.provider}`);
    setIsIngestModalOpen(false);
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (!dataset) return;
    try {
      const content = analyticsService.exportDataset(dataset, format);
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shadowtalk-intelligence-${activeView}-${timeRange}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerToast(`Exported sanitized ${format.toUpperCase()} report`);
    } catch (e) {
      triggerToast('Export failed');
    }
  };

  const handleCreateReport = async (
    name: string,
    range: TimeRange,
    comp: ComparisonPeriod,
    format: 'csv' | 'json',
    metrics: string[]
  ) => {
    const report = await analyticsService.generateReport(name, range, comp, format, metrics);
    await loadData(true);
    triggerToast(`Generated report: ${report.name}`);
    return report;
  };

  return {
    activeView,
    selectView,
    timeRange,
    setTimeRange,
    comparison,
    setComparison,
    dataset,
    isLoading,
    isRefreshing,
    error,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isIngestModalOpen,
    setIsIngestModalOpen,
    toastMessage,
    triggerToast,
    handleRefresh,
    handleExport,
    handleIngestLiveEvent,
    handleCreateReport,
    loadData
  };
}
