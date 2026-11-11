import React from 'react';
import {
  LayoutDashboard,
  Users,
  Compass,
  Cpu,
  Coins,
  TrendingUp,
  Activity,
  ShieldCheck,
  FileSpreadsheet,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  Database,
  Radio,
  PlusCircle
} from 'lucide-react';
import { DashboardView } from '../types';

interface SidebarProps {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenIngestModal: () => void;
  totalEventsCount: number;
}

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'violet' | 'amber' | 'emerald';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  onOpenIngestModal,
  totalEventsCount
}) => {
  const navItems: NavItem[] = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
    { id: 'user-intelligence', label: 'User Intelligence', icon: Users },
    { id: 'mission-analytics', label: 'Mission Analytics', icon: Layers, badge: 'Core' },
    { id: 'ai-intelligence', label: 'AI Intelligence', icon: Cpu },
    { id: 'cost-intelligence', label: 'Cost Intelligence', icon: Coins, badge: 'Ledger', badgeColor: 'amber' },
    { id: 'growth-intelligence', label: 'Growth Intelligence', icon: TrendingUp },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'privacy-security', label: 'Privacy & Security', icon: ShieldCheck, badge: 'Zero-PII', badgeColor: 'emerald' },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet }
  ];

  const handleNavClick = (id: DashboardView) => {
    onSelectView(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0d1017] border-r border-slate-800/80 flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 w-64' : isCollapsed ? 'w-20' : 'w-64'
        } ${!isOpenMobile && '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Lockup & Collapse Trigger */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold tracking-tight text-white leading-none truncate">
                  ShadowTalk
                </span>
                <span className="text-[10px] font-mono text-slate-400 mt-1 leading-none truncate">
                  Intelligence Center
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Ingestion / Telemetry Health Status */}
        {(!isCollapsed || isOpenMobile) && (
          <div className="p-3">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Ingestion Pipeline:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                <span>Events Processed:</span>
                <span className="text-slate-300 font-semibold">{totalEventsCount.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Action: Ingest Live Telemetry Event */}
            <button
              type="button"
              onClick={onOpenIngestModal}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Live Mission Event</span>
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {(!isCollapsed || isOpenMobile) && (
            <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
              Core Analytics
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed && !isOpenMobile ? item.label : undefined}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                } ${isCollapsed && !isOpenMobile ? 'justify-center px-2' : ''}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  {(!isCollapsed || isOpenMobile) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {(!isCollapsed || isOpenMobile) && item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      item.badgeColor === 'amber'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : item.badgeColor === 'emerald'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Workspace Security Guarantee */}
        {(!isCollapsed || isOpenMobile) ? (
          <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/30 shrink-0">
            <div className="flex items-start gap-2.5">
              <Database className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-slate-400 leading-tight">
                <span className="text-slate-300 font-medium block">
                  Zero-Content Invariant
                </span>
                Prompts, LLM text, and API keys are strictly excluded from event ingestion.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-800/80 flex justify-center shrink-0" title="Zero-Content Policy Active">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </aside>
    </>
  );
};
