import React from 'react';
import {
  Coins,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  TrendingDown,
  Info
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
import { CostIntelligenceData } from '../types';
import { MetricCard } from '../common/MetricCard';

interface CostIntelligenceViewProps {
  data: CostIntelligenceData;
  isLoading?: boolean;
}

export const CostIntelligenceView: React.FC<CostIntelligenceViewProps> = ({ data, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* Strict Cost Integrity Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-slate-200">
            Strict Accounting Separation Enforced: Verified Invoices vs Token Projections
          </div>
          <p className="text-slate-400 leading-relaxed">
            ShadowTalk Intelligence never presents estimated costs as verified costs. Verified costs reflect reconciled monthly billing ledgers. Estimated costs reflect raw token math against standard list rate cards.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Verified API Costs"
          metric={data.verifiedCost}
          costType="verified"
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          subtitle="Direct invoice reconciliation"
          isLoading={isLoading}
        />
        <MetricCard
          title="Estimated API Costs"
          metric={data.estimatedCost}
          costType="estimated"
          icon={<Coins className="w-4 h-4 text-amber-400" />}
          subtitle="Token list rate projection"
          isLoading={isLoading}
        />
        <MetricCard
          title="Pricing Coverage Rate"
          metric={data.pricingCoverageRate}
          icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />}
          subtitle="Tokens with verified rate cards"
          isLoading={isLoading}
        />
        <MetricCard
          title="Unavailable Pricing Models"
          metric={data.unavailablePricing}
          icon={<HelpCircle className="w-4 h-4 text-slate-400" />}
          subtitle="Private BYOK or local fine-tunes"
          badge="3 Models"
          badgeColor="amber"
          isLoading={isLoading}
        />
      </div>

      {/* Daily Cost Comparison Chart */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Verified vs Estimated Daily Spend Comparison</h3>
            <p className="text-xs text-slate-400">Evaluating discrepancy delta between token estimates and actual billing</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              Verified Invoiced
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              Estimated Rate Card
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dailyCostTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="$" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                formatter={(val: any) => [`$${Number(val ?? 0).toFixed(2)}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="verifiedCost" name="Verified Ledger Cost ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="estimatedCost" name="Estimated List Cost ($)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Granular Model & Provider Cost Ledger */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Granular Model Cost & Pricing Status Ledger</h3>
            <p className="text-xs text-slate-400">Individual unit pricing status, verified charges and token usage</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{data.unitCostPerMission.formatted}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Model</th>
                <th className="py-2.5 px-3 font-medium">Provider</th>
                <th className="py-2.5 px-3 font-medium text-right">Tokens Processed</th>
                <th className="py-2.5 px-3 font-medium text-right">Verified Cost</th>
                <th className="py-2.5 px-3 font-medium text-right">Estimated Cost</th>
                <th className="py-2.5 px-3 font-medium text-right">Accounting Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.breakdown.map((row) => (
                <tr key={`${row.provider}-${row.model}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-200">
                    <span className="text-indigo-300 font-semibold">{row.model}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {row.provider}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                    {(row.tokensProcessed / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {row.verifiedCost > 0 ? (
                      <span className="text-emerald-400 font-semibold">
                        ${row.verifiedCost.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-amber-300/90">
                    ${row.estimatedCost.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {row.pricingStatus === 'verified_card' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        Verified Card
                      </span>
                    ) : row.pricingStatus === 'community_estimate' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                        Community Estimate
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        Unpriced
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
