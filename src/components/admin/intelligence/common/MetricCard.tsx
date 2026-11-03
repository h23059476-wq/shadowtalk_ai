import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Sparkles } from 'lucide-react';
import { MetricValue } from '../types';

interface MetricCardProps {
  title: string;
  metric?: MetricValue;
  subtitle?: string;
  isLoading?: boolean;
  isUnavailable?: boolean;
  unavailableReason?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  costType?: 'verified' | 'estimated';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  metric,
  subtitle,
  isLoading = false,
  isUnavailable = false,
  unavailableReason = 'Data telemetry unavailable for selected window',
  icon,
  badge,
  badgeColor = 'slate',
  costType,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-slate-800 rounded w-28"></div>
          <div className="h-5 w-5 bg-slate-800 rounded"></div>
        </div>
        <div className="h-8 bg-slate-800 rounded w-36 mb-2"></div>
        <div className="h-3 bg-slate-800 rounded w-44"></div>
      </div>
    );
  }

  if (isUnavailable || !metric) {
    return (
      <div className={`p-5 rounded-xl bg-slate-900/30 border border-slate-800/60 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">{title}</span>
          <AlertCircle className="w-4 h-4 text-slate-500" />
        </div>
        <div className="text-xl font-mono text-slate-500 py-1">—</div>
        <p className="text-xs text-slate-500 mt-1">{unavailableReason}</p>
      </div>
    );
  }

  const { formatted, delta, benchmark, isEstimated } = metric;

  return (
    <div className={`group relative p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-150 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-400 truncate">{title}</span>
          {costType === 'verified' && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified
            </span>
          )}
          {costType === 'estimated' && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Estimated
            </span>
          )}
        </div>
        {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
          {formatted}
        </span>
        {badge && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
            badgeColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            badgeColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            badgeColor === 'rose' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
            badgeColor === 'indigo' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
            'bg-slate-800 text-slate-300'
          }`}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        {delta ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`inline-flex items-center font-mono tabular-nums text-xs font-medium ${
                delta.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {delta.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
              )}
              {delta.percentage > 0 ? `+${delta.percentage}%` : `${delta.percentage}%`}
            </span>
            <span className="text-slate-500 truncate">{delta.periodLabel}</span>
          </div>
        ) : benchmark ? (
          <span className="text-slate-500 font-mono text-[11px]">{benchmark}</span>
        ) : subtitle ? (
          <span className="text-slate-500 truncate">{subtitle}</span>
        ) : (
          <span className="text-slate-600 font-mono text-[11px]">Zero PII Telemetry</span>
        )}
      </div>
    </div>
  );
};
