/**
 * ShadowTalk ProofLoop — Flagship Workspace Component
 *
 * "ShadowTalk doesn't just tell you it completed a task.
 *  It shows you evidence of what it actually accomplished."
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Share2,
  Plus,
  Trash2,
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Table,
  Search,
  Code2,
  Sparkles,
  RefreshCw,
  Eye,
  Send,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  ProofLoopMission,
  MissionCondition,
  ConditionStatus,
  ProofEvidence,
  ApprovalRequest,
} from '@/lib/proofloop/types';
import { useProofLoop } from '@/hooks/useProofLoop';

const PRESET_MISSIONS = [
  {
    title: 'Business Research & Verified Spreadsheet',
    prompt: 'Research 10 AI startups founded in 2024 with verified names, websites, and funding details in a spreadsheet.',
  },
  {
    title: 'Competitor Security Posture Audit',
    prompt: 'Analyze security practices of top 3 LLM providers, verify source citations, and compile an Executive Summary report.',
  },
  {
    title: 'Code Scripting & Sandbox Test Run',
    prompt: 'Write a TypeScript matrix multiplication routine with benchmark unit tests and verify 0 error exit code in sandbox.',
  },
];

export default function ProofLoopWorkspace() {
  const {
    activeMission,
    setActiveMission,
    missionsList,
    isLoading,
    isExecuting,
    activeInferencePath,
    createMission,
    updateConditions,
    startMission,
    approveAction,
    rejectAction,
    cancelMission,
    publishProof,
  } = useProofLoop();

  const [promptInput, setPromptInput] = useState('');
  const [activeTab, setActiveTab] = useState<'conditions' | 'execution' | 'evidence'>('conditions');
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  /** Toggles the deliberately-induced failure mode for demonstration purposes. */
  const [inducedFailureMode, setInducedFailureMode] = useState(false);

  // New condition draft form
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondDesc, setNewCondDesc] = useState('');
  const [newCondType, setNewCondType] = useState<MissionCondition['type']>('data_schema');
  const [newCondCritical, setNewCondCritical] = useState(true);

  const handleCreate = async () => {
    if (!promptInput.trim()) return;
    const mission = await createMission(promptInput);
    if (mission) {
      setPromptInput('');
      setActiveTab('conditions');
    }
  };

  const handleAddCondition = () => {
    if (!activeMission || !newCondDesc.trim()) return;
    const newCond: MissionCondition = {
      id: `cond_user_${Date.now()}`,
      description: newCondDesc.trim(),
      type: newCondType,
      params: {},
      status: 'NOT_CHECKED',
      isCritical: newCondCritical,
      verificationMethod: 'deterministic_check',
      evidenceIds: [],
    };
    updateConditions([...activeMission.conditions, newCond]);
    setNewCondDesc('');
    setShowAddCondition(false);
    toast.success('Condition added to mission plan.');
  };

  const handleDeleteCondition = (id: string) => {
    if (!activeMission) return;
    updateConditions(activeMission.conditions.filter((c) => c.id !== id));
  };

  const handleShare = async () => {
    if (!activeMission) return;
    setIsPublishing(true);
    const url = await publishProof();
    setIsPublishing(false);
    if (url) {
      setPublishedUrl(url);
      setShowShareModal(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07090e] text-slate-100 overflow-hidden select-none">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-white/[0.08] bg-[#090d16]/80 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                ShadowTalk ProofLoop
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Execution Verifier
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic outcome verification. Zero trust on unsupported AI claims.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeMission && (
            <>
              {activeMission.state === 'DRAFT' || activeMission.state === 'READY' ? (
                <div className="flex items-center gap-2">
                  {/* Active inference path badge */}
                  {activeInferencePath && (
                    <span
                      title={activeInferencePath.isAvailable ? `Active: ${activeInferencePath.model}` : activeInferencePath.unavailabilityReason}
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                        activeInferencePath.isAvailable
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/25 text-rose-400',
                      )}
                    >
                      {activeInferencePath.path.toUpperCase()}
                    </span>
                  )}
                  {/* Induced Failure Mode toggle for demo */}
                  <button
                    id="induce-failure-toggle"
                    onClick={() => setInducedFailureMode((v) => !v)}
                    title={inducedFailureMode ? 'Failure mode ON — click to disable' : 'Induce deliberate verification failure (ProofLoop demo)'}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors',
                      inducedFailureMode
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-500 hover:text-slate-300',
                    )}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {inducedFailureMode ? 'Failure ON' : 'Induce Failure'}
                  </button>
                  <Button
                    id="execute-verify-btn"
                    onClick={() => startMission(undefined, { forceFailureMode: inducedFailureMode })}
                    disabled={isExecuting || activeMission.conditions.length === 0}
                    className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(6,182,212,0.25)] border border-cyan-400/30"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-1.5 fill-current" />
                    Execute & Verify
                  </Button>
                </div>
              ) : activeMission.state === 'RUNNING' || activeMission.state === 'VERIFYING' || activeMission.state === 'RECOVERING' ? (
                <Button
                  onClick={() => cancelMission()}
                  variant="destructive"
                  size="sm"
                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Cancel Mission
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => startMission(undefined, { forceFailureMode: false })}
                    variant="outline"
                    size="sm"
                    className="border-white/10 hover:bg-white/[0.05] text-slate-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Re-Verify
                  </Button>
                  {(activeMission.state === 'COMPLETED' || activeMission.state === 'PARTIALLY_COMPLETED') && (
                    <Button
                      onClick={handleShare}
                      disabled={isPublishing}
                      size="sm"
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1.5" />
                      Proof Card
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          <Button
            onClick={() => {
              setActiveMission(null);
              setPromptInput('');
            }}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            New Mission
          </Button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Mission Configuration & History */}
        <div className="w-80 border-r border-white/[0.08] bg-[#080b12] flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-white/[0.08]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Start New Mission
            </h2>
            <div className="space-y-2">
              <Textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="E.g., Research 10 fintech companies and generate a spreadsheet with names, sites, and emails..."
                rows={3}
                className="bg-[#0c101b] border-white/10 text-xs focus:border-cyan-500/50 resize-none"
              />
              <Button
                onClick={handleCreate}
                disabled={isLoading || !promptInput.trim()}
                className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Generate Plan
              </Button>
            </div>

            {/* Presets */}
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                Quick Templates
              </p>
              <div className="space-y-1">
                {PRESET_MISSIONS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPromptInput(p.prompt)}
                    className="w-full text-left p-1.5 rounded-lg text-[11px] text-slate-400 hover:text-cyan-300 hover:bg-white/[0.03] transition-colors truncate block"
                  >
                    • {p.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Past Missions History */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1">
              Mission Ledger ({missionsList.length})
            </h3>
            {missionsList.length === 0 ? (
              <p className="text-xs text-slate-600 px-2 py-4 italic text-center">
                No missions created yet.
              </p>
            ) : (
              missionsList.map((m) => {
                const isActive = activeMission?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveMission(m)}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs cursor-pointer transition-all duration-150',
                      isActive
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-white shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                        : 'bg-[#0d121c] border-white/[0.05] text-slate-400 hover:bg-white/[0.03] hover:text-slate-200',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-medium truncate flex-1">{m.title}</span>
                      <StateBadge state={m.state} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-mono text-cyan-400">{m.verificationSummary.completionScore}% verified</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Mission Board */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#07090e]">
          {!activeMission ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">No Mission Selected</h2>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                Describe a mission in the left sidebar or select a template to generate completion conditions, run verified execution, and receive cryptographic proof.
              </p>
              <Button
                onClick={() => setPromptInput(PRESET_MISSIONS[0].prompt)}
                className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium"
              >
                Load Sample Mission
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mission Header Card */}
              <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-[#0a0e19] via-[#0d1322] to-[#0a0e19]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <StateBadge state={activeMission.state} />
                      <span className="text-[11px] font-mono text-slate-400">ID: {activeMission.id}</span>
                      {activeMission.durationMs && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" /> {(activeMission.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{activeMission.title}</h2>
                    <p className="text-xs text-slate-400 italic">"{activeMission.userRequest}"</p>
                  </div>

                  {/* Completion Score Ring */}
                  <div className="flex items-center gap-3 bg-[#0f1524] p-3 rounded-2xl border border-white/[0.08]">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                        Verification Score
                      </p>
                      <p className="text-xl font-bold font-mono text-cyan-400">
                        {activeMission.verificationSummary.completionScore}%
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 flex items-center justify-center font-bold text-xs text-white">
                      {activeMission.verificationSummary.verified}/{activeMission.verificationSummary.total}
                    </div>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 mt-6 border-b border-white/[0.06] -mb-6">
                  <button
                    onClick={() => setActiveTab('conditions')}
                    className={cn(
                      'px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5',
                      activeTab === 'conditions'
                        ? 'border-cyan-400 text-cyan-300 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-200',
                    )}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Completion Conditions ({activeMission.conditions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('execution')}
                    className={cn(
                      'px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5',
                      activeTab === 'execution'
                        ? 'border-cyan-400 text-cyan-300 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-200',
                    )}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Steps & Logs ({activeMission.steps.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('evidence')}
                    className={cn(
                      'px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5',
                      activeTab === 'evidence'
                        ? 'border-cyan-400 text-cyan-300 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-200',
                    )}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Proof & Evidence ({activeMission.evidence.length})
                  </button>
                </div>
              </div>

              {/* Consequential Action Approval Prompt (Active when WAITING_FOR_APPROVAL) */}
              <AnimatePresence>
                {activeMission.state === 'WAITING_FOR_APPROVAL' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="m-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Lock className="h-5 w-5 text-amber-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Human Approval Required Before Execution
                        </h4>
                        <p className="text-xs text-amber-200/90 mt-0.5">
                          {activeMission.approvals.find((a) => a.status === 'pending')?.reason ||
                            'A consequential action has external side-effects and requires explicit user consent.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Button
                        onClick={() => {
                          const req = activeMission.approvals.find((a) => a.status === 'pending');
                          if (req) approveAction(req.id);
                        }}
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex-1 md:flex-none"
                      >
                        Approve & Proceed
                      </Button>
                      <Button
                        onClick={() => {
                          const req = activeMission.approvals.find((a) => a.status === 'pending');
                          if (req) rejectAction(req.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs flex-1 md:flex-none"
                      >
                        Reject Action
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recovery Banner (Active when in RECOVERING or if recovery attempts were made) */}
              {activeMission.recoveryAttempts.length > 0 && (
                <div className="mx-6 mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={cn('h-4 w-4 text-cyan-400', activeMission.state === 'RECOVERING' && 'animate-spin')} />
                    <span>
                      <strong>Safe Recovery Engine:</strong> {activeMission.recoveryAttempts.length} automated correction cycle executed.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-cyan-300">
                    Strategy: {activeMission.recoveryAttempts[activeMission.recoveryAttempts.length - 1].strategy}
                  </span>
                </div>
              )}

              {/* Tab Content Panels */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                {/* 1. Completion Conditions Tab */}
                {activeTab === 'conditions' && (
                  <div className="space-y-4 max-w-4xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">Explicit Completion Conditions</h3>
                        <p className="text-xs text-slate-400">
                          These conditions define true completion. Every condition must be deterministically inspected.
                        </p>
                      </div>
                      {activeMission.state === 'DRAFT' || activeMission.state === 'READY' ? (
                        <Button
                          onClick={() => setShowAddCondition(!showAddCondition)}
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-xs text-slate-300 hover:bg-white/[0.05]"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Condition
                        </Button>
                      ) : null}
                    </div>

                    {/* Add Condition Inline Form */}
                    {showAddCondition && (
                      <div className="p-4 rounded-xl bg-[#0f1422] border border-cyan-500/30 space-y-3">
                        <h4 className="text-xs font-semibold text-cyan-300">New Testable Condition</h4>
                        <Input
                          value={newCondDesc}
                          onChange={(e) => setNewCondDesc(e.target.value)}
                          placeholder="e.g. Generated CSV contains at least 10 rows with valid website URLs"
                          className="text-xs bg-[#090d16] border-white/10"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Type:</span>
                            <select
                              value={newCondType}
                              onChange={(e) => setNewCondType(e.target.value as any)}
                              className="bg-[#090d16] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                            >
                              <option value="data_schema">Data Schema</option>
                              <option value="row_count">Row Count</option>
                              <option value="file_exists">File Exists</option>
                              <option value="citation_verified">Citations</option>
                              <option value="document_structure">Document Structure</option>
                              <option value="code_execution">Code Execution</option>
                              <option value="custom_check">Custom Check</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newCondCritical}
                                onChange={(e) => setNewCondCritical(e.target.checked)}
                                className="rounded border-white/20"
                              />
                              Critical Condition
                            </label>
                            <Button onClick={handleAddCondition} size="sm" className="bg-cyan-500 text-black text-xs font-medium">
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conditions List */}
                    <div className="space-y-2.5">
                      {activeMission.conditions.map((cond, idx) => (
                        <div
                          key={cond.id}
                          className="p-3.5 rounded-xl bg-[#0d121c] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <ConditionStatusIcon status={cond.status} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                  #{idx + 1} {cond.description}
                                </span>
                                {cond.isCritical && (
                                  <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-300 border-rose-500/20 px-1.5 py-0">
                                    Critical
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                                <span>Type: {cond.type}</span>
                                <span>Method: {cond.verificationMethod}</span>
                              </div>
                              {cond.failureReason && (
                                <p className="text-[11px] text-rose-400 bg-rose-950/20 p-2 rounded-lg border border-rose-500/20">
                                  <strong>Failure:</strong> {cond.failureReason}
                                </p>
                              )}
                            </div>
                          </div>

                          {(activeMission.state === 'DRAFT' || activeMission.state === 'READY') && (
                            <button
                              onClick={() => handleDeleteCondition(cond.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Steps & Logs Tab */}
                {activeTab === 'execution' && (
                  <div className="space-y-4 max-w-4xl">
                    <div>
                      <h3 className="text-sm font-bold text-white">Execution Steps & Live Logs</h3>
                      <p className="text-xs text-slate-400">
                        Tracks sequential subtask progress and approval checkpoints.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {activeMission.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          className="p-4 rounded-xl bg-[#0d121c] border border-white/[0.06] flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white">{step.title}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">{step.action}</p>
                              {step.output && (
                                <p className="text-[11px] font-mono text-cyan-300/90 mt-1">
                                  ➜ {step.output}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={cn(
                                'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border',
                                step.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : step.status === 'running'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                              )}
                            >
                              {step.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Proof of Completion & Evidence Tab */}
                {activeTab === 'evidence' && (
                  <div className="space-y-4 max-w-4xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">Proof of Completion — Evidence Ledger</h3>
                        <p className="text-xs text-slate-400">
                          Deterministic inspection findings for every completion condition.
                        </p>
                      </div>
                      <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-xs">
                        {activeMission.evidence.filter((e) => e.isIndependent).length} Independent Proofs
                      </Badge>
                    </div>

                    {activeMission.evidence.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-[#090d16]">
                        <p className="text-xs text-slate-500 italic">
                          No verification evidence recorded yet. Execute the mission to generate verified proofs.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeMission.evidence.map((ev) => {
                          const isExpanded = expandedEvidenceId === ev.id;
                          return (
                            <div
                              key={ev.id}
                              className="rounded-xl border border-white/[0.08] bg-[#0c101b] overflow-hidden"
                            >
                              <div
                                onClick={() => setExpandedEvidenceId(isExpanded ? null : ev.id)}
                                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {ev.isIndependent ? (
                                    <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                                      <ShieldCheck className="h-4 w-4" />
                                    </div>
                                  ) : (
                                    <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                                      <ShieldQuestion className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-semibold text-white">{ev.summary}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      Source: {ev.source} • {new Date(ev.timestamp).toLocaleTimeString()}
                                      {ev.isIndependent && ' • Independent Verifier'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[9px] font-mono',
                                      ev.isIndependent
                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                                    )}
                                  >
                                    {ev.isIndependent ? 'VERIFIED' : 'INCONCLUSIVE'}
                                  </Badge>
                                  {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="p-4 bg-[#080b12] border-t border-white/[0.06] text-xs font-mono space-y-2 text-slate-300">
                                  <div>
                                    <span className="text-slate-500">Inspected Item:</span>{' '}
                                    <span className="text-cyan-300">{ev.details.inspectedItem}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Expected:</span>{' '}
                                    <span className="text-slate-200">{JSON.stringify(ev.details.expected)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Actual:</span>{' '}
                                    <span className="text-emerald-300">{JSON.stringify(ev.details.actual)}</span>
                                  </div>
                                  {ev.details.rawSample && (
                                    <div className="mt-2">
                                      <span className="text-slate-500 block mb-1">Raw Output Sample:</span>
                                      <pre className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                        {ev.details.rawSample}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shareable Proof Card Modal */}
      {showShareModal && publishedUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] text-white space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Shareable Proof of Completion</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This proof card shares verified execution evidence without revealing private prompts, confidential files, or API credentials.
            </p>

            <div className="p-4 rounded-xl bg-black/50 border border-cyan-500/20 font-mono text-xs space-y-1">
              <p className="text-cyan-400 font-bold">{activeMission?.title}</p>
              <p className="text-slate-400 text-[11px]">
                {activeMission?.verificationSummary.verified}/{activeMission?.verificationSummary.total} Conditions Independently Verified
              </p>
              <p className="text-emerald-400 text-[11px]">
                Score: {activeMission?.verificationSummary.completionScore}% • Issued by ShadowTalk ProofLoop
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}${publishedUrl}`}
                className="bg-[#060911] border-white/10 text-xs font-mono text-cyan-300"
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${publishedUrl}`);
                  toast.success('Proof link copied to clipboard!');
                }}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shrink-0"
              >
                Copy Link
              </Button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setShowShareModal(false)}
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
    DRAFT: { label: 'Draft', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
    READY: { label: 'Ready', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    RUNNING: { label: 'Running', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20 animate-pulse' },
    WAITING_FOR_APPROVAL: { label: 'Approval Required', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    VERIFYING: { label: 'Verifying', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20 animate-pulse' },
    RECOVERING: { label: 'Recovering', bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
    COMPLETED: { label: 'Verified Complete', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    PARTIALLY_COMPLETED: { label: 'Partial Complete', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    FAILED: { label: 'Failed', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/20' },
  };

  const cfg = configs[state] || configs.DRAFT;

  return (
    <span
      className={cn(
        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
        cfg.bg,
        cfg.text,
        cfg.border,
      )}
    >
      {cfg.label}
    </span>
  );
}

function ConditionStatusIcon({ status }: { status: ConditionStatus }) {
  switch (status) {
    case 'VERIFIED':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />;
    case 'INCONCLUSIVE':
      return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />;
    case 'NOT_CHECKED':
    default:
      return <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0 mt-0.5" />;
  }
}
