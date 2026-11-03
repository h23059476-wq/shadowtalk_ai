import React from 'react';
import { GitCompare } from 'lucide-react';
import { ComparisonPeriod } from '../types';

interface ComparisonSelectorProps {
  value: ComparisonPeriod;
  onChange: (val: ComparisonPeriod) => void;
  disabled?: boolean;
}

export const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const options: { id: ComparisonPeriod; label: string }[] = [
    { id: 'previous_period', label: 'vs Prior Period' },
    { id: 'previous_year', label: 'vs Prior Year' },
    { id: 'none', label: 'Off' }
  ];

  return (
    <div className="hidden xl:flex items-center gap-1.5 text-xs">
      <div className="flex items-center text-slate-400 gap-1 font-mono text-[11px] mr-0.5">
        <GitCompare className="w-3.5 h-3.5 text-slate-500" />
        <span>Compare:</span>
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
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-indigo-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
