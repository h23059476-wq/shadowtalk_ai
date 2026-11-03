import React from 'react';
import { AlertTriangle, RefreshCw, Database, FileQuestion } from 'lucide-react';

interface StateViewWrapperProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
}

export const StateViewWrapper: React.FC<StateViewWrapperProps> = ({
  isLoading,
  isError,
  isEmpty = false,
  errorMessage = 'Failed to load telemetry dataset.',
  onRetry,
  emptyTitle = 'No telemetry events recorded for this interval',
  emptyDescription = 'There are no active missions or sessions logged matching the current filter parameters.',
  children
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="h-4 bg-slate-800/80 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-800/80 rounded w-32 mb-2" />
              <div className="h-3 bg-slate-800/80 rounded w-40" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 h-80 flex flex-col justify-between">
            <div className="h-5 bg-slate-800/80 rounded w-48 mb-4" />
            <div className="flex-1 bg-slate-800/30 rounded flex items-center justify-center text-xs text-slate-500 font-mono">
              Synthesizing mission telemetry...
            </div>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 h-80 flex flex-col justify-between">
            <div className="h-5 bg-slate-800/80 rounded w-48 mb-4" />
            <div className="flex-1 bg-slate-800/30 rounded flex items-center justify-center text-xs text-slate-500 font-mono">
              Aggregating latency percentiles...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-rose-500/30 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">Telemetry Pipeline Interrupted</h3>
        <p className="text-xs text-slate-400 font-mono mb-6 max-w-md mx-auto leading-relaxed">
          {errorMessage}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reconnect Telemetry Channel
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-slate-800/60 text-slate-400 mx-auto flex items-center justify-center mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">{emptyTitle}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {emptyDescription}
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800">
          <Database className="w-3.5 h-3.5" />
          <span>Listening for incoming client events on /api/analytics</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
