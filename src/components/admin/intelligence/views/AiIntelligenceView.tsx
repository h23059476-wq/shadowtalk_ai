import React from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  HelpCircle,
  Cpu,
  Layers,
  Zap,
  Server
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AiIntelligenceData } from '../types';
import { MetricCard } from '../common/MetricCard';

interface AiIntelligenceViewProps {
  data: AiIntelligenceData;
  isLoading?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  'Google Gemini': '#38bdf8',
  'Anthropic': '#ec4899',
  'OpenAI': '#10b981',
  'Groq': '#f59e0b',
  'Mistral': '#8b5cf6',
  'Self-Hosted/Ollama': '#64748b'
};

export const AiIntelligenceView: React.FC<AiIntelligenceViewProps> = ({ data, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Ingested AI Requests"
          metric={data.totalRequests}
          icon={<Cpu className="w-4 h-4 text-indigo-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Overall Success Rate"
          metric={data.overallSuccessRate}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Average Latency"
          metric={data.averageLatencyMs}
          icon={<Clock className="w-4 h-4 text-sky-400" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Unknown / Unmapped Models"
          metric={data.unknownModelCount}
          icon={<HelpCircle className="w-4 h-4 text-amber-400" />}
          subtitle="BYOK custom models awaiting rate card"
          badge="Audit Needed"
          badgeColor="amber"
          isLoading={isLoading}
        />
      </div>

      {/* Row 1: Requests by Model (Successful vs Failed) & Latency Percentiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requests by Model (Successful vs Failed) (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Requests by Model (Successful vs Failed)</h3>
                <p className="text-xs text-slate-400">Reliability and error proportion across primary LLM models</p>
              </div>
              <span className="text-xs font-mono text-emerald-400">98.4% Baseline</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.requestsByModelChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="model" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="success" name="Successful Requests" fill="#10b981" stackId="reqs" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" name="Failed Requests" fill="#ef4444" stackId="reqs" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Latency Percentiles Trend (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Response Latency Percentiles (P50, P95, P99)</h3>
                <p className="text-xs text-slate-400">Real-time latency jitter and tail behavior in milliseconds</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Streaming Engine</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.latencyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="ms" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="p50" name="P50 Median" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p95" name="P95 Tail" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p99" name="P99 Extreme" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Breakdown Cards */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Provider Market Share & SLA Breakdown</h3>
            <p className="text-xs text-slate-400">Total requests, latency & active user BYOK keys per provider</p>
          </div>
          <Server className="w-4 h-4 text-slate-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.providers.map((p) => {
            const color = PROVIDER_COLORS[p.provider] || '#94a3b8';
            return (
              <div
                key={p.provider}
                className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/60"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-semibold text-slate-200">{p.provider}</span>
                  </div>
                  <span className="font-mono text-white font-bold tabular-nums">
                    {p.percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/40">
                  <div>
                    Latency: <span className="text-slate-200">{p.avgLatencyMs}ms</span>
                  </div>
                  <div className="text-center">
                    Success: <span className={p.successRate >= 98 ? 'text-emerald-400' : 'text-amber-400'}>{p.successRate}%</span>
                  </div>
                  <div className="text-right">
                    BYOKs: <span className="text-indigo-400">{p.activeKeys}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Granular Ranking & Telemetry Table */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Model Usage Ranking & Performance Matrix</h3>
            <p className="text-xs text-slate-400">Granular token consumption, latency distribution, and pricing recognition</p>
          </div>
          <span className="text-xs font-mono text-slate-400">8 Models Monitored</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Model Identifier</th>
                <th className="py-2.5 px-3 font-medium">Provider</th>
                <th className="py-2.5 px-3 font-medium text-right">Requests</th>
                <th className="py-2.5 px-3 font-medium text-right">Tokens Processed</th>
                <th className="py-2.5 px-3 font-medium text-right">P50 / P95 Latency</th>
                <th className="py-2.5 px-3 font-medium text-right">Success</th>
                <th className="py-2.5 px-3 font-medium text-right">Pricing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.models.map((m) => (
                <tr key={m.modelId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-200">
                    <span className="text-indigo-300 font-semibold">{m.modelId}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {m.provider}
                  </td>
                  <td className="py-3 px-3 text-right text-white font-semibold tabular-nums">
                    {m.requests.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                    {(m.tokensTotal / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                    {m.latencyP50Ms}ms / <span className="text-slate-400">{m.latencyP95Ms}ms</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className={m.successRate >= 98 ? 'text-emerald-400' : 'text-amber-400'}>
                      {m.successRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {m.isKnownPricing ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Mapped Card
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Unmapped / BYOK
                      </span>
                    )}
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
