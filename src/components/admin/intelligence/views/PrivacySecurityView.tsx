import React from 'react';
import {
  ShieldCheck,
  Lock,
  FileCheck,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { PrivacySecurityData } from '../types';
import { MetricCard } from '../common/MetricCard';

interface PrivacySecurityViewProps {
  data: PrivacySecurityData;
  isLoading?: boolean;
}

export const PrivacySecurityView: React.FC<PrivacySecurityViewProps> = ({ data, isLoading }) => {
  return (
    <div className="space-y-6">
      {/* Strict Zero-Content Guarantee Callout */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Zero-Content Telemetry Policy (Constitutional Privacy Invariant)
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
              ShadowTalk Intelligence strictly enforces that user prompts, model outputs, private workspace files, and BYOK credentials never touch the analytics datastore. All events are scrubbed before ingress.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>STATUS: {data.analyticsCollectionStatus}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Consent Status Overview"
          metric={data.consentStatusOverview}
          icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          subtitle="Opt-in telemetry participants"
          isLoading={isLoading}
        />
        <MetricCard
          title="Data Minimization Indicators"
          metric={data.dataMinimizationScore}
          icon={<EyeOff className="w-4 h-4 text-indigo-400" />}
          subtitle="Zero raw payload violations"
          badge="100% Pass"
          badgeColor="emerald"
          isLoading={isLoading}
        />
        <MetricCard
          title="Event Validation Status"
          metric={data.eventValidationStatus}
          icon={<FileCheck className="w-4 h-4 text-sky-400" />}
          subtitle="Strict schema validation filter"
          isLoading={isLoading}
        />
        <MetricCard
          title="Admin Access Status"
          metric={data.adminAccessStatus}
          icon={<KeyRound className="w-4 h-4 text-violet-400" />}
          subtitle="Audited founder access"
          badge="MFA Verified"
          badgeColor="indigo"
          isLoading={isLoading}
        />
      </div>

      {/* Two Column Grid: User Consent Breakdown & Continuous Governance Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Consent Distribution (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Analytics Collection & Consent Breakdown</h3>
                <p className="text-xs text-slate-400">Opt-in telemetry preferences across registered workspaces</p>
              </div>
              <span className="text-xs font-mono text-slate-400">GDPR Compliant</span>
            </div>

            <div className="space-y-3">
              {data.consentBreakdown.map((item) => (
                <div
                  key={item.tier}
                  className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/60"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">{item.tier}</span>
                    <span className="font-mono text-white font-bold tabular-nums">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 text-right">
                    {item.userCount.toLocaleString()} workspaces
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800/60 leading-snug">
            Users who opt out have all client telemetry beacons fully neutralized in browser storage.
          </p>
        </div>

        {/* Continuous Governance Audits (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Continuous Security & Governance Invariants</h3>
              <p className="text-xs text-slate-400">Automated cryptographic proofs & access controls</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-2.5">
            {data.governanceChecks.map((chk) => (
              <div
                key={chk.checkName}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200">
                      {chk.checkName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug pl-5.5">
                    {chk.description}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {chk.lastAudited}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Access Audit Log */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Admin Intelligence Access Log</h3>
            <p className="text-xs text-slate-400">Immutable trail of founder and auditor access to product metrics</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Append-Only Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Session ID</th>
                <th className="py-2.5 px-3 font-medium">Actor</th>
                <th className="py-2.5 px-3 font-medium">Action Performed</th>
                <th className="py-2.5 px-3 font-medium">IP Salt Digest</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.adminAuditLog.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 text-slate-400">
                    {log.id}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-200">
                    {log.actor}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {log.action}
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {log.ipHash}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {log.status}
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
