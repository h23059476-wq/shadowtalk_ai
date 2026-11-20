/**
 * Traffic & Funnel — Intelligence Center view (Batch 4).
 *
 * Renders the first-party analytics aggregates: visits, page views, message
 * sends, the Visit → First message → Day-7 return funnel, attribution
 * (top pages / referrers / UTM campaigns) and D1/D7/D30 retention chips.
 *
 * Self-contained: fetches its own snapshot via useTrafficAnalytics() instead
 * of riding on the IntelligenceDataset schema, because the traffic pipeline
 * has its own (smaller, counter-based) storage model.
 *
 * Honest-data guarantee (same as the rest of this dashboard): when the
 * collections are empty, this view shows an explicit empty state — never
 * fabricated numbers.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Globe,
  RefreshCw,
  MousePointerClick,
  MessageSquare,
  Users,
  FileText,
  Repeat,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  fetchTrafficSnapshot,
  type TrafficSnapshot,
} from '../trafficService';

const RANGE_OPTIONS = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

function useTrafficAnalytics(rangeDays: number) {
  const [snapshot, setSnapshot] = useState<TrafficSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTrafficSnapshot(rangeDays);
      setSnapshot(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Firestore error';
      setError(message);
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    void load();
  }, [load]);

  return { snapshot, isLoading, error, reload: load };
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v}%`);
const num = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString());

interface KpiCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, sub, icon, accent }) => (
  <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs text-slate-400 font-medium">{title}</span>
      {icon}
    </div>
    <div className={`text-2xl font-bold ${accent}`}>{value}</div>
    <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
  </div>
);

interface TopListProps {
  title: string;
  rows: Array<{ label: string; count: number }>;
  emptyText: string;
  mono?: boolean;
}

const TopList: React.FC<TopListProps> = ({ title, rows, emptyText, mono }) => {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="relative">
              <div className="flex items-center justify-between text-xs relative z-10 py-1">
                <span className={`text-slate-300 truncate max-w-[70%] ${mono ? 'font-mono text-[11px]' : ''}`}>{row.label}</span>
                <span className="text-slate-400 font-mono">{row.count.toLocaleString()}</span>
              </div>
              <div
                className="absolute left-0 top-0 bottom-0 rounded bg-indigo-500/15 border border-indigo-500/20"
                style={{ width: `${Math.max(6, (row.count / max) * 100)}%` }}
                aria-hidden
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FUNNEL_COLORS = ['#6366f1', '#10b981', '#38bdf8'];

export const TrafficFunnelView: React.FC = () => {
  const [rangeDays, setRangeDays] = useState(7);
  const { snapshot, isLoading, error, reload } = useTrafficAnalytics(rangeDays);

  return (
    <div className="space-y-6">
      {/* Header: range selector + zero-PII badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                rangeDays === opt.days
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => void reload()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" />
          FIRST-PARTY · ZERO-PII · ANONYMOUS IDS
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-800 rounded w-20 mb-2" />
              <div className="h-3 bg-slate-800 rounded w-32" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
          Firestore query failed: {error}. Traffic data is admin-readable only — make sure you are signed in with an admin role.
        </div>
      ) : !snapshot || snapshot.kpis.events === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center">
          <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">No analytics events yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The first-party pipeline starts writing the moment the deploy lands: page views, sessions and
            chat sends queue on-device and sync to Firestore in batches. Give it a day of traffic, then refresh.
          </p>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Visits"
              value={num(snapshot.kpis.visits)}
              sub={`${snapshot.totalDaysObserved} day(s) observed in range`}
              icon={<Globe className="w-4 h-4 text-indigo-400" />}
              accent="text-white"
            />
            <KpiCard
              title="New anonymous visitors"
              value={num(snapshot.kpis.newClients)}
              sub={`Returning sessions: ${num(snapshot.kpis.returningSessions)}`}
              icon={<Users className="w-4 h-4 text-violet-400" />}
              accent="text-white"
            />
            <KpiCard
              title="Messages sent"
              value={num(snapshot.kpis.messages)}
              sub={`${num(snapshot.kpis.pageViews)} page views · ${num(snapshot.kpis.ctas)} CTA clicks`}
              icon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
              accent="text-white"
            />
            <KpiCard
              title="Activation rate"
              value={pct(snapshot.kpis.activationRate)}
              sub="Share of new visitors who sent a first message"
              icon={<MousePointerClick className="w-4 h-4 text-sky-400" />}
              accent="text-white"
            />
          </div>

          {/* Funnel */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-semibold text-white">Acquisition Funnel</h3>
                <p className="text-xs text-slate-400">Visit → First message → Day-7 return, over the selected range cohort</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">D7 cohort: {num(snapshot.funnel.d7Cohort)}</span>
            </div>
            <div className="mt-4 space-y-4">
              {snapshot.funnel.stages.map((stage, idx) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">{stage.label}</span>
                    <span className="text-slate-400 font-mono">
                      {num(stage.value)}
                      {idx > 0 && <span className="text-slate-500"> · {pct(stage.rate)}</span>}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(stage.value > 0 ? 3 : 0, stage.rate ?? 0)}%`,
                        backgroundColor: FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-1 rounded">
                D1 return: <span className="text-emerald-400">{pct(snapshot.cohortRates.d1)}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-1 rounded">
                D7 return: <span className="text-emerald-400">{pct(snapshot.cohortRates.d7)}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-1 rounded">
                D30 return: <span className="text-emerald-400">{pct(snapshot.cohortRates.d30)}</span>
              </span>
              <span className="text-[11px] text-slate-500 ml-auto inline-flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                Flags computed on-device, pinned by Firestore rules
              </span>
            </div>
          </div>

          {/* Daily trend */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Daily Traffic Trend</h3>
                <p className="text-xs text-slate-400">Visits, page views and chat messages per day</p>
              </div>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Last {rangeDays}d
              </span>
            </div>
            <div className="h-64 w-full">
              {snapshot.trend.length === 0 ? (
                <p className="text-xs text-slate-500 pt-8 text-center">No daily counters in this range yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshot.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="visits" name="Visits" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#visitGrad)" />
                    <Area type="monotone" dataKey="pageViews" name="Page views" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#pvGrad)" />
                    <Area type="monotone" dataKey="messages" name="Messages" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#msgGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Attribution lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TopList
              title="Top Pages"
              rows={snapshot.topPages}
              emptyText="No page views recorded in this range yet."
              mono
            />
            <TopList
              title="Traffic Sources (referrer host)"
              rows={snapshot.referrers}
              emptyText="No referrer attribution yet — first visit may have been direct."
            />
            <TopList
              title="UTM Campaigns"
              rows={snapshot.campaigns}
              emptyText="No utm_campaign tagged visits yet. Tag launch links with ?utm_source=…&utm_campaign=…"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TrafficFunnelView;
