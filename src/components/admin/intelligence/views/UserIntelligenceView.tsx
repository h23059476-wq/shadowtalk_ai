import React from 'react';
import { UserCheck, Zap, Repeat, Target, Users, ArrowUpRight, TrendingUp } from 'lucide-react';
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
import { UserIntelligenceData } from '../types';
import { MetricCard } from '../common/MetricCard';

interface UserIntelligenceViewProps {
  data: UserIntelligenceData;
  isLoading?: boolean;
}

export const UserIntelligenceView: React.FC<UserIntelligenceViewProps> = ({ data, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Signup Conversion Rate"
          metric={data.signupConversionRate}
          icon={<UserCheck className="w-4 h-4 text-indigo-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Activation Rate (Mission 1)"
          metric={data.activationRate}
          icon={<Zap className="w-4 h-4 text-emerald-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Returning Active Users"
          metric={data.returningUsersCount}
          icon={<Repeat className="w-4 h-4 text-sky-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Second Mission Conversion"
          metric={data.secondMissionConversionRate}
          icon={<Target className="w-4 h-4 text-violet-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Signup-to-First-Value Rate"
          metric={data.signupToFirstValueRate}
          icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
          isLoading={isLoading}
        />
      </div>

      {/* Returning User Trends Chart & User Journey Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Returning User Trends Chart (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Returning-User Trends</h3>
                <p className="text-xs text-slate-400">Daily and weekly returning workspace frequency</p>
              </div>
              <span className="text-xs font-mono text-indigo-400">Weekly Velocity</span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.returningUserTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="weeklyReturning" name="Weekly Returning" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#retGrad)" />
                  <Area type="monotone" dataKey="dailyReturning" name="Daily Returning" stroke="#10b981" strokeWidth={2} fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* User Journey Funnel Deep Dive (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">User Acquisition & Journey Funnel</h3>
              <p className="text-xs text-slate-400">Conversion across primary product milestones</p>
            </div>
            <span className="text-xs font-mono text-slate-400">6 Stages</span>
          </div>

          <div className="space-y-3">
            {data.userJourneyFunnel.map((step) => (
              <div key={step.step} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium truncate">
                    {step.step}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold tabular-nums">
                      {step.count.toLocaleString()}
                    </span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      {step.rate}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-300"
                    style={{ width: `${step.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Retention Cohort Heatmap Table */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Weekly Retention Cohorts</h3>
            <p className="text-xs text-slate-400">Percentage of active signups returning in subsequent rolling weeks</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Retention scale:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-indigo-500/20" />
              <span className="text-[10px] text-slate-500">&lt;40%</span>
              <span className="w-3 h-3 rounded bg-indigo-500/50" />
              <span className="text-[10px] text-slate-500">40-55%</span>
              <span className="w-3 h-3 rounded bg-indigo-600" />
              <span className="text-[10px] text-slate-500">&gt;55%</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Cohort Window</th>
                <th className="py-2.5 px-3 font-medium">Size</th>
                {data.cohortRetention.weeks.map((w) => (
                  <th key={w} className="py-2.5 px-3 font-medium text-center">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.cohortRetention.rows.map((row) => (
                <tr key={row.cohortDate} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-300">
                    {row.cohortDate}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                    {row.cohortSize.toLocaleString()}
                  </td>
                  {row.retention.map((pct, i) => {
                    if (pct === null) {
                      return (
                        <td key={i} className="py-2.5 px-3 text-center text-slate-700">
                          —
                        </td>
                      );
                    }

                    const bgStyle =
                      pct >= 90
                        ? 'bg-indigo-600 text-white font-semibold'
                        : pct >= 55
                        ? 'bg-indigo-600/60 text-indigo-100 font-medium'
                        : pct >= 45
                        ? 'bg-indigo-600/35 text-indigo-200'
                        : pct >= 30
                        ? 'bg-indigo-600/20 text-slate-300'
                        : 'bg-indigo-950/40 text-slate-400';

                    return (
                      <td key={i} className="py-2 px-1 text-center">
                        <span className={`inline-block w-12 py-1 rounded text-[11px] tabular-nums ${bgStyle}`}>
                          {pct}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Archetype Breakdown */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Active User Archetype Breakdown</h3>
            <p className="text-xs text-slate-400">Classified by workflow frequency, agent orchestration & session volume</p>
          </div>
          <Users className="w-4 h-4 text-slate-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.userSegments.map((seg) => (
            <div
              key={seg.segment}
              className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/60"
            >
              <div className="text-xs font-semibold text-slate-200 mb-1">{seg.segment}</div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xl font-bold text-white font-mono tabular-nums">
                  {seg.count.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-indigo-400 tabular-nums">
                  ({seg.percentage}%)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Avg missions: <span className="text-slate-200 font-semibold">{seg.avgMissionsPerWeek} / wk</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
