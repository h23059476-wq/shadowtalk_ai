import React from 'react';
import {
  Layers,
  CheckCircle2,
  XCircle,
  Percent,
  Clock,
  Timer,
  AlertTriangle,
  FileCode,
  BrainCircuit,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { MissionAnalyticsData, FailureCategory } from '../types';
import { MetricCard } from '../common/MetricCard';

interface MissionAnalyticsViewProps {
  data: MissionAnalyticsData;
  isLoading?: boolean;
}

const RESPONSE_TYPE_COLORS = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899'];

export const MissionAnalyticsView: React.FC<MissionAnalyticsViewProps> = ({ data, isLoading }) => {
  const failureList = data.failureCategories || data.failureBreakdown || [];
  const durationList = data.durationBuckets || data.durationDistribution || [];
  const completionMetric = data.completionPercentage || data.completionRate;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Missions Started"
          metric={data.missionsStarted}
          icon={<Layers className="w-4 h-4 text-indigo-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Missions Completed"
          metric={data.missionsCompleted}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Missions Failed"
          metric={data.missionsFailed}
          icon={<XCircle className="w-4 h-4 text-rose-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Completion Percentage"
          metric={completionMetric}
          icon={<Percent className="w-4 h-4 text-emerald-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Median TTFV"
          metric={data.medianTTFVSec}
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Average TTFV"
          metric={data.averageTTFVSec}
          icon={<Timer className="w-4 h-4 text-sky-400" />}
          isLoading={isLoading}
        />
      </div>

      {/* Two Column Section: Failure Breakdown & Duration Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Failure Breakdown */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Mission Failure Categories</h3>
                <p className="text-xs text-slate-400">Classified by upstream provider, client abort, or token boundaries</p>
              </div>
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Audit Log
              </span>
            </div>

            <div className="space-y-3">
              {failureList.map((item: FailureCategory) => (
                <div key={item.reason} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-sm">
                      {item.reason}
                    </span>
                    <div className="flex items-center gap-3 font-mono shrink-0">
                      <span className="text-white font-semibold tabular-nums">
                        {item.count.toLocaleString()}
                      </span>
                      <span className="text-rose-400 text-[11px] tabular-nums">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Failover router automatically reroutes 429/529 errors</span>
            <span className="font-mono text-indigo-400">Recovery SLA: 98.2%</span>
          </div>
        </div>

        {/* Execution Duration Distribution */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Execution Duration Buckets</h3>
                <p className="text-xs text-slate-400">Total elapsed time per completed mission</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Latency spread</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="bucket" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" name="Missions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono text-center pt-2 border-t border-slate-800/60">
            65% of missions yield complete results in &lt; 5 seconds
          </div>
        </div>
      </div>

      {/* Response Type & Mission Workload Breakdown */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Workload Distribution by Response Archetype</h3>
            <p className="text-xs text-slate-400">Token density, average duration, and popularity across agent tasks</p>
          </div>
          <span className="text-xs font-mono text-slate-400">5 Categorical Workloads</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Workload Archetype</th>
                <th className="py-2.5 px-3 font-medium text-right">Volume</th>
                <th className="py-2.5 px-3 font-medium text-right">Share</th>
                <th className="py-2.5 px-3 font-medium text-right">Avg Duration</th>
                <th className="py-2.5 px-3 font-medium text-right">Median Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.responseTypes.map((type, idx) => (
                <tr key={type.type} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-200 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: RESPONSE_TYPE_COLORS[idx % RESPONSE_TYPE_COLORS.length] }}
                    />
                    <span>{type.type}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-white font-semibold tabular-nums">
                    {type.count.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-400 tabular-nums">
                    {type.percentage}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                    {type.avgDurationSec}s
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                    {type.medianTokens.toLocaleString()} tokens
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
