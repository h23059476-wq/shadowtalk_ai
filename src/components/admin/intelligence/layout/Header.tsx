import React, { useState } from 'react';
import {
  Menu,
  RefreshCw,
  Download,
  FileText,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { DashboardView, TimeRange, ComparisonPeriod } from '../types';
import { DateRangeSelector } from '../common/DateRangeSelector';
import { ComparisonSelector } from '../common/ComparisonSelector';

interface HeaderProps {
  activeView: DashboardView;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  comparison: ComparisonPeriod;
  onComparisonChange: (comp: ComparisonPeriod) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExport: (format: 'json' | 'csv') => void;
  onToggleMobileMenu: () => void;
}

const VIEW_TITLES: Record<DashboardView, { title: string; category: string }> = {
  'command-center': { title: 'Command Center', category: 'Executive Overview' },
  'user-intelligence': { title: 'User Intelligence', category: 'Retention & Cohorts' },
  'mission-analytics': { title: 'Mission Analytics', category: 'Workflow Execution' },
  'ai-intelligence': { title: 'AI Intelligence', category: 'Model & Provider Telemetry' },
  'cost-intelligence': { title: 'Cost Intelligence', category: 'Financial Ledger & Estimation' },
  'growth-intelligence': { title: 'Growth Intelligence', category: 'Acquisition & Conversion' },
  'performance': { title: 'Performance', category: 'System Health & Latency' },
  'privacy-security': { title: 'Privacy & Security', category: 'Governance & Zero-PII Audit' },
  'reports': { title: 'Reports & Exports', category: 'Executive Intelligence' }
};

export const Header: React.FC<HeaderProps> = ({
  activeView,
  timeRange,
  onTimeRangeChange,
  comparison,
  onComparisonChange,
  onRefresh,
  isRefreshing,
  onExport,
  onToggleMobileMenu
}) => {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const current = VIEW_TITLES[activeView] || { title: 'Command Center', category: 'Executive Overview' };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#090b10]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Zone 1: Brand title & Mobile Trigger */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-white font-semibold tracking-tight whitespace-nowrap">
            ShadowTalk
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 font-mono text-xs hidden sm:inline whitespace-nowrap">
            {current.category}
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-indigo-400 font-medium text-xs whitespace-nowrap">
            {current.title}
          </span>
        </div>
      </div>

      {/* Zone 2: Date Range Selector & Comparison Selector */}
      <div className="flex items-center gap-3">
        <DateRangeSelector
          value={timeRange}
          onChange={onTimeRangeChange}
          disabled={isRefreshing}
        />
        <ComparisonSelector
          value={comparison}
          onChange={onComparisonChange}
          disabled={isRefreshing}
        />
      </div>

      {/* Zone 3: Primary Action & Profile Menu Placeholder */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh telemetry cache"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        {/* Quick Export Trigger */}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>

          <div className="absolute right-0 top-full mt-1 w-44 py-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
            <button
              type="button"
              onClick={() => onExport('json')}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export JSON Snapshot</span>
            </button>
            <button
              type="button"
              onClick={() => onExport('csv')}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV Metrics</span>
            </button>
          </div>
        </div>

        {/* Profile/Admin Menu Placeholder */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
            className="flex items-center gap-2 p-1.5 pl-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold">
              FA
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-none">Founder Admin</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">shadowtalk.ai</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isAdminMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 py-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black/80 z-50"
              onMouseLeave={() => setIsAdminMenuOpen(false)}
            >
              <div className="px-3 py-2 border-b border-slate-800 text-xs">
                <div className="font-semibold text-white">Founder Console</div>
                <div className="text-[11px] text-slate-400 font-mono">zaim98269@gmail.com</div>
              </div>
              <div className="py-1 text-xs text-slate-300">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-semibold">
                  Session Permissions
                </div>
                <div className="px-3 py-1 flex items-center justify-between text-[11px]">
                  <span>Telemetry Audit:</span>
                  <span className="text-emerald-400 font-mono">GRANTED</span>
                </div>
                <div className="px-3 py-1 flex items-center justify-between text-[11px]">
                  <span>Cost Ledger:</span>
                  <span className="text-emerald-400 font-mono">AUTHORIZED</span>
                </div>
                <div className="px-3 py-1 flex items-center justify-between text-[11px]">
                  <span>BYOK Storage:</span>
                  <span className="text-indigo-400 font-mono">LOCAL ENCRYPTED</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
