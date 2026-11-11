import React from 'react';
import {
  Users,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Layers,
  Repeat,
  ShieldCheck,
  Server
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { CommandOverviewData } from '../types';
import { MetricCard } from '../common/MetricCard';

interface CommandCenterViewProps {
  data: CommandOverviewData;
  isLoading?: boolean;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({ data, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* Primary KPI Grid (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Daily Active Users"
          metric={data.dailyActiveUsers}
          icon={<Users className="w-4 h-4 text-indigo-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Weekly Active Users"
          metric={data.weeklyActiveUsers}
          icon={<Users className="w-4 h-4 text-sky-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Monthly Active Users"
          metric={data.monthlyActiveUsers}
          icon={<Users className="w-4 h-4 text-violet-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="New Users"
          metric={data.newUsers}
          icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Sessions"
          metric={data.totalSessions}
          icon={<Activity className="w-4 h-4 text-amber-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Activation Rate"
          metric={data.activationRate}
          icon={<Zap className="w-4 h-4 text-indigo-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Mission Completion Rate"
          metric={data.missionCompletionRate}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Median TTFV (Time to Value)"
          metric={data.medianTimeToFirstValueSec}
          icon={<Clock className="w-4 h-4 text-rose-400" />}
          isLoading={isLoading}
        />
      </div>

      {/* Row 1 Charts: User Activity Over Time & New vs Returning Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: User Activity Over Time */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">User Activity Velocity</h3>
              <p className="text-xs text-slate-400">Daily and weekly active workspace telemetry</p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Active Cohorts
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.userActivityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cmdDauGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="dau" name="Daily Active Users" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#cmdDauGrad)" />
                <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#38bdf8" strokeWidth={2} fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: New vs Returning Users */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">New vs Returning Users</h3>
              <p className="text-xs text-slate-400">Acquisition balance against returning user retention</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Retention Ratio
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.newVsReturningTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="returningUsers" name="Returning Users" fill="#6366f1" stackId="users" radius={[0, 0, 0, 0]} />
                <Bar dataKey="newUsers" name="New Signups" fill="#10b981" stackId="users" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Mission Completion Trends & Provider Usage Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 3: Mission Completion Trends (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Mission Completion Trends</h3>
                <p className="text-xs text-slate-400">Daily autonomous agent missions completed vs failures</p>
              </div>
              <span className="text-xs font-mono text-slate-400">94.6% Avg Yield</span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.missionCompletionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="completed" name="Completed Missions" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Failed Missions" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 5: Provider Usage Distribution (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Provider Usage Distribution</h3>
                <p className="text-xs text-slate-400">Total requests routed across AI providers</p>
              </div>
              <Server className="w-4 h-4 text-slate-500" />
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.providerDistribution}
                    dataKey="share"
                    nameKey="provider"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {data.providerDistribution.map((entry) => (
                      <Cell key={entry.provider} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/60">
              {data.providerDistribution.map((p) => (
                <div key={p.provider} className="flex items-center justify-between p-1 rounded bg-slate-900/40">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-300 truncate">{p.provider}</span>
                  </div>
                  <span className="text-white font-bold ml-1">{p.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Activation Funnel & Recent System Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 4: Activation Funnel (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Activation Funnel</h3>
              <p className="text-xs text-slate-400">Progression from discovery to second mission habituation</p>
            </div>
            <span className="text-xs font-mono text-slate-400">41.3% Habituated</span>
          </div>

          <div className="space-y-3.5">
            {data.activationFunnel.map((step, idx) => (
              <div key={step.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {idx + 1}. {step.stage}
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-white font-semibold tabular-nums">
                      {step.users.toLocaleString()}
                    </span>
                    <span className="text-indigo-400 text-[11px] tabular-nums">
                      {step.conversionRate}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${step.conversionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent System Events Log (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent System Events</h3>
                <p className="text-xs text-slate-400">Autonomous workflow logs, schema audits and load balancing</p>
              </div>
              <span className="text-xs font-mono text-emerald-400">Live Telemetry</span>
            </div>

            <div className="space-y-2.5">
              {data.recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          evt.severity === 'critical'
                            ? 'bg-rose-500'
                            : evt.severity === 'warning'
                            ? 'bg-amber-500'
                            : evt.severity === 'info'
                            ? 'bg-sky-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {evt.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {evt.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono pl-3.5 leading-relaxed">
                    {evt.meta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
