import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Calendar,
  CheckCircle2,
  FileText,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  Layers
} from 'lucide-react';
import { ReportsData, TimeRange, ComparisonPeriod, GeneratedReport } from '../types';

interface ReportsViewProps {
  data: ReportsData;
  timeRange: TimeRange;
  comparison: ComparisonPeriod;
  onExport: (format: 'json' | 'csv') => void;
  onCreateReport: (
    name: string,
    range: TimeRange,
    comp: ComparisonPeriod,
    format: 'csv' | 'json',
    metrics: string[]
  ) => Promise<GeneratedReport>;
  isLoading?: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  data,
  timeRange,
  comparison,
  onExport,
  onCreateReport,
  isLoading
}) => {
  const [reportTitle, setReportTitle] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [selectedRange, setSelectedRange] = useState<TimeRange>(timeRange);
  const [selectedComparison, setSelectedComparison] = useState<ComparisonPeriod>(comparison);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Daily Active Users',
    'Mission Completion Rate',
    'Model Cost Ledger',
    'Latency Percentiles'
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableMetrics = [
    'Daily Active Users',
    'Weekly / Monthly Active Users',
    'Mission Completion Rate',
    'Median TTFV',
    'Model Cost Ledger (Verified & Estimated)',
    'Pricing Coverage Rate',
    'Provider Market Share',
    'Latency Percentiles (P50/P95/P99)',
    'API Error Rate & Event Delivery',
    'User Journey Activation Funnel',
    'Cohort Retention Matrix'
  ];

  const toggleMetric = (m: string) => {
    if (selectedMetrics.includes(m)) {
      setSelectedMetrics(selectedMetrics.filter((x) => x !== m));
    } else {
      setSelectedMetrics([...selectedMetrics, m]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    await onCreateReport(
      reportTitle || `Intelligence Report (${selectedRange.toUpperCase()})`,
      selectedRange,
      selectedComparison,
      selectedFormat,
      selectedMetrics
    );
    setIsGenerating(false);
    setReportTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Export Action Bar */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Executive Reports & Data Export Center</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate verifiable intelligence digests with period comparisons and export raw telemetry CSVs
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Current CSV</span>
          </button>
          <button
            type="button"
            onClick={() => onExport('json')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Full JSON</span>
          </button>
        </div>
      </div>

      {/* Metric Summaries & Date-Based Comparisons Table */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Period-over-Period Metric Summary</h4>
            <p className="text-xs text-slate-400">Current observation window compared against prior interval</p>
          </div>
          <span className="text-xs font-mono text-indigo-400">8 Core Invariants</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Domain Category</th>
                <th className="py-2.5 px-3 font-medium">Metric</th>
                <th className="py-2.5 px-3 font-medium text-right">Current Window</th>
                <th className="py-2.5 px-3 font-medium text-right">Comparison Period</th>
                <th className="py-2.5 px-3 font-medium text-right">Variance Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.metricSummaries.map((item) => (
                <tr key={`${item.category}-${item.metric}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 text-slate-400">
                    {item.category}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-200">
                    {item.metric}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-white tabular-nums">
                    {item.currentValue}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                    {item.previousValue}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        item.direction === 'up'
                          ? 'text-emerald-400'
                          : item.direction === 'down'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.deltaPercentage > 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {item.deltaPercentage > 0 ? `+${item.deltaPercentage}%` : `${item.deltaPercentage}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Report Generation Interface & Saved Reports List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Report Generator Form (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-white">Generate Custom Report Digest</h4>
              <p className="text-xs text-slate-400">Configure parameters, metric bundles, and target export schema</p>
            </div>
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Report Title
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 Executive Board AI Telemetry Audit"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Time Range
                </label>
                <select
                  value={selectedRange}
                  onChange={(e) => setSelectedRange(e.target.value as TimeRange)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last Quarter (90d)</option>
                  <option value="all">Full Lifecycle (All)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Format
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as 'csv' | 'json')}
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="csv">CSV Spreadsheet</option>
                  <option value="json">Structured JSON Payload</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Metrics Included ({selectedMetrics.length} selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono">
                {availableMetrics.map((m) => {
                  const isChecked = selectedMetrics.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMetric(m)}
                      className={`text-left p-1.5 rounded flex items-center gap-2 cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded border flex items-center justify-center text-[9px] ${
                        isChecked ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-700'
                      }`}>
                        {isChecked && '✓'}
                      </span>
                      <span className="truncate text-[11px]">{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Compiling Report...' : 'Build & Save Report'}</span>
            </button>
          </form>
        </div>

        {/* Saved Reports Archive (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Generated Reports Archive</h4>
                <p className="text-xs text-slate-400">Available downloadable digests with tamper-evident digests</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{data.savedReports.length} Available</span>
            </div>

            <div className="space-y-3">
              {data.savedReports.map((report) => (
                <div
                  key={report.id}
                  className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/60 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate mb-1">
                      {report.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span className="text-indigo-400 uppercase">{report.format}</span>
                      <span>·</span>
                      <span>{report.dateRange.toUpperCase()}</span>
                      <span>·</span>
                      <span>{report.fileSize}</span>
                      <span>·</span>
                      <span>{report.createdAt}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onExport(report.format === 'json' ? 'json' : 'csv')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Download Report"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
            All reports cryptographically sanitized against prompts, responses and credentials.
          </div>
        </div>
      </div>
    </div>
  );
};
