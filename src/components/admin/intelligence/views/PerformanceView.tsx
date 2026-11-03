import React from 'react';
import {
  Activity,
  AlertTriangle,
  Zap,
  Server,
  ShieldAlert,
  Clock,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { PerformanceData } from '../types';
import { MetricCard } from '../common/MetricCard';

interface PerformanceViewProps {
  data: PerformanceData;
  isLoading?: boolean;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ data, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="API Error Rate"
          metric={data.errorRate}
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          subtitle="Provider & gateway HTTP 4xx/5xx"
          isLoading={isLoading}
        />
        <MetricCard
          title="Event Delivery Failures"
          metric={data.eventDeliveryFailureRate}
          icon={<Radio className="w-4 h-4 text-indigo-400" />}
          subtitle="Beacon packet drop rate"
          isLoading={isLoading}
        />
        <MetricCard
          title="Response Latency (P50 / P99)"
          metric={data.p99ResponseLatencyMs}
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          subtitle={`P50 Median: ${data.medianResponseLatencyMs.formatted}`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Analytics Data Quality"
          metric={data.analyticsDataQualityScore}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          subtitle="Strict schema adherence score"
          isLoading={isLoading}
        />
      </div>

      {/* Mission Failure Trends Chart & Subsystem Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mission Failure Trends Chart (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Mission Failure Trends & Root Cause Velocity</h3>
                <p className="text-xs text-slate-400">Time-series breakdown of rate limits, timeouts and context overflows</p>
              </div>
              <span className="text-xs font-mono text-rose-400">Real-Time Anomaly Log</span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.missionFailureTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="rateLimits" name="429 Rate Limits" fill="#ef4444" stackId="fail" />
                  <Bar dataKey="timeouts" name="Gateway Timeouts" fill="#f59e0b" stackId="fail" />
                  <Bar dataKey="contextOverflow" name="Context Overflow" fill="#8b5cf6" stackId="fail" />
                  <Bar dataKey="aborts" name="User Aborts" fill="#64748b" stackId="fail" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Subsystem Health Grid (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Service Infrastructure Health</h3>
                <p className="text-xs text-slate-400">Gateway, orchestrator, and telemetry uptime</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                5 Active
              </span>
            </div>

            <div className="space-y-2.5">
              {data.serviceHealth.map((svc) => (
                <div
                  key={svc.service}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-200 truncate">{svc.service}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {svc.latencyMs}ms · {svc.uptimePct}% uptime
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded shrink-0 ${
                      svc.status === 'healthy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upstream Error Log Categories Table */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Categorized Error Signatures & Ingress Anomalies</h3>
            <p className="text-xs text-slate-400">Ranked by frequency, target module, and incident severity</p>
          </div>
          <ShieldAlert className="w-4 h-4 text-slate-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Error Code</th>
                <th className="py-2.5 px-3 font-medium">Subsystem / Module</th>
                <th className="py-2.5 px-3 font-medium text-right">Occurrences</th>
                <th className="py-2.5 px-3 font-medium text-right">Last Observed</th>
                <th className="py-2.5 px-3 font-medium text-right">Impact Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.errorLogCategories.map((err) => (
                <tr key={err.code} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-rose-300">
                    {err.code}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {err.module}
                  </td>
                  <td className="py-3 px-3 text-right text-white font-semibold tabular-nums">
                    {err.occurrences.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                    {err.lastSeen}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        err.impact === 'high'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : err.impact === 'medium'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {err.impact}
                    </span>
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
