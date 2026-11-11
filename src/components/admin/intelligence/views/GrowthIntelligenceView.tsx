import React from 'react';
import {
  TrendingUp,
  Share2,
  Compass,
  Briefcase,
  ExternalLink,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { GrowthIntelligenceData } from '../types';
import { MetricCard } from '../common/MetricCard';

interface GrowthIntelligenceViewProps {
  data: GrowthIntelligenceData;
  isLoading?: boolean;
}

export const GrowthIntelligenceView: React.FC<GrowthIntelligenceViewProps> = ({ data, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Organic Traffic Share"
          metric={data.organicTrafficRate}
          icon={<Compass className="w-4 h-4 text-indigo-400" />}
          subtitle="Non-paid discovery channels"
          isLoading={isLoading}
        />
        <MetricCard
          title="Referral Traffic Share"
          metric={data.referralTrafficRate}
          icon={<Share2 className="w-4 h-4 text-emerald-400" />}
          subtitle="Developer community & GitHub"
          isLoading={isLoading}
        />
        <MetricCard
          title="Signup Conversion Yield"
          metric={data.overallSignupConversion}
          icon={<TrendingUp className="w-4 h-4 text-sky-400" />}
          subtitle="Visitor to authenticated user"
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Workspaces Created"
          metric={data.activeWorkspacesCreated}
          icon={<Briefcase className="w-4 h-4 text-violet-400" />}
          subtitle="Dedicated AI mission teams"
          isLoading={isLoading}
        />
      </div>

      {/* Acquisition & Signup Conversion Trends Chart */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Multi-Channel Acquisition & Signup Conversion Trends</h3>
            <p className="text-xs text-slate-400">Weekly growth velocity across Organic, Referral & Direct channels</p>
          </div>
          <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Rolling 6 Weeks
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.signupConversionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="dirGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="week" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="organic" name="Organic Search" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#orgGrad)" />
              <Area type="monotone" dataKey="referral" name="Community Referral" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#refGrad)" />
              <Area type="monotone" dataKey="direct" name="Direct Navigation" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#dirGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid: Top Landing Pages & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Landing Pages (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Landing-Page Performance</h3>
                <p className="text-xs text-slate-400">High-converting workflow templates & documentation</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </div>

            <div className="space-y-3">
              {data.topLandingPages.map((page) => (
                <div
                  key={page.path}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-indigo-300 font-medium truncate">
                      {page.path}
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {page.impressions.toLocaleString()} views
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/40">
                    <span>Workspaces: <strong className="text-white">{page.workspacesCreated.toLocaleString()}</strong></span>
                    <span className="text-emerald-400 font-semibold">{page.activationPct}% Activation</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Traffic Channels Table (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Acquisition Channel Breakdown</h3>
              <p className="text-xs text-slate-400">Volume, signup conversion and bounce rate per discovery vector</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Privacy-safe attribution</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Channel</th>
                  <th className="py-2.5 px-3 font-medium text-right">Visitors</th>
                  <th className="py-2.5 px-3 font-medium text-right">Signups</th>
                  <th className="py-2.5 px-3 font-medium text-right">Conv. Rate</th>
                  <th className="py-2.5 px-3 font-medium text-right">Bounce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.trafficChannels.map((c) => (
                  <tr key={c.channel} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">
                      {c.channel}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                      {c.visitors.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-white font-semibold tabular-nums">
                      {c.signups.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-semibold tabular-nums">
                      {c.conversionRate}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                      {c.bounceRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
