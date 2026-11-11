import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { TimeRange } from '../types';

interface DateRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  disabled?: boolean;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const options: { id: TimeRange; label: string; detail: string }[] = [
    { id: '24h', label: '24H', detail: 'Last 24 Hours' },
    { id: '7d', label: '7D', detail: 'Last 7 Days' },
    { id: '30d', label: '30D', detail: 'Last 30 Days' },
    { id: '90d', label: '90D', detail: 'Last Quarter' },
    { id: 'all', label: 'ALL', detail: 'Full Lifecycle' }
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center text-xs text-slate-400 gap-1.5 font-mono mr-1">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span>Range:</span>
      </div>
      <div className="inline-flex p-0.5 rounded-lg bg-slate-900/80 border border-slate-800">
        {options.map((opt) => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600/90 text-white shadow-sm shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={opt.detail}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
