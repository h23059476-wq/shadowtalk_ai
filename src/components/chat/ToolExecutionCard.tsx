import React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Image, Play, Wand2, Globe, Shield, FileText, Music, 
  Brain, Camera, Table, Calculator, Mic, Eye, Zap, CheckCircle2, 
  Loader2, AlertCircle, ExternalLink, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolType } from '@/hooks/useToolOrchestrator';

// ToolExecutionCard extended props (stable UI surface)
export interface ToolExecutionCardProps {
  tool: ToolType;
  status: 'pending' | 'running' | 'complete' | 'error' | 'confirm';
  params?: Record<string, string>;
  result?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onViewFull?: () => void;
  alert?: string;
  smartMode?: string;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  deep_research: { label: 'Deep Research', icon: Search, color: 'text-blue-400' },
  agentic_runner: { label: 'Task Runner', icon: Play, color: 'text-green-400' },
  shadow_browser: { label: 'Web Browser', icon: Globe, color: 'text-cyan-400' },
  security_audit: { label: 'Security Scan', icon: Shield, color: 'text-red-400' },
  document_generator: { label: 'Document Generator', icon: FileText, color: 'text-amber-400' },
  visual_reasoning: { label: 'Visual Reasoning', icon: Brain, color: 'text-indigo-400' },
  camera_capture: { label: 'Camera', icon: Camera, color: 'text-teal-400' },
  data_organizer: { label: 'Data Organizer', icon: Table, color: 'text-orange-400' },
  calculator: { label: 'Calculator', icon: Calculator, color: 'text-emerald-400' },
  shadow_live: { label: 'Voice Chat', icon: Mic, color: 'text-violet-400' },
  code_canvas: { label: 'Code Editor', icon: Zap, color: 'text-yellow-400' },
  app_builder: { label: 'App Builder', icon: Layout, color: 'text-indigo-400' },
  daily_planner: { label: 'Daily Planner', icon: FileText, color: 'text-sky-400' },
  presentation_builder: { label: 'Presentations', icon: FileText, color: 'text-orange-400' },
  eco_actions: { label: 'Eco Actions', icon: Globe, color: 'text-green-400' },
  web_search: { label: 'Web Search', icon: Search, color: 'text-blue-400' },
  vision_agent: { label: 'Vision Agent', icon: Eye, color: 'text-purple-400' },
  knowledge_vault: { label: 'Knowledge Vault', icon: Brain, color: 'text-indigo-400' },
  mission_control: { label: 'Mission Control', icon: Play, color: 'text-orange-400' },
  stealth_vault: { label: 'Stealth Vault', icon: Shield, color: 'text-red-400' },
  script_automation: { label: 'Script Automation', icon: Zap, color: 'text-amber-400' },
  agent_workflows: { label: 'AI Workflows', icon: Play, color: 'text-green-400' },
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    case 'complete':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case 'error':
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    default:
      return <Loader2 className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  tool,
  status,
  params,
  result,
  onConfirm,
  onCancel,
  onViewFull,
  alert,
  smartMode,
}) => {
  const meta = TOOL_META[tool] || { label: tool, icon: Zap, color: 'text-muted-foreground' };
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/15">
        <div className={`w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center ${meta.color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground/90">{meta.label}</span>
            {status === 'confirm' && (
              <span className="text-[10px] text-amber-400 font-mono">Awaiting confirmation</span>
            )}
            {alert && (
              <span className="text-[10px] text-destructive/80 font-mono">{alert}</span>
            )}
            {smartMode && (
              <span className="text-[10px] text-primary/80 font-mono">Mode: {smartMode}</span>
            )}
            <StatusIcon status={status} />
          </div>
          {params && Object.keys(params).length > 0 && (
            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
              {Object.values(params)[0]?.slice(0, 60)}
              {(Object.values(params)[0]?.length || 0) > 60 ? '...' : ''}
            </p>
          )}
        </div>
        {status === 'running' && (
          <span className="text-[10px] text-primary font-mono">Running...</span>
        )}
      </div>

      {/* Confirmation prompt */}
      {status === 'confirm' && (
        <div className="px-3.5 py-3 space-y-2.5">
          <p className="text-xs text-muted-foreground">
            Ready to run <strong>{meta.label}</strong>?
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onConfirm} className="h-7 text-xs px-3 rounded-lg">
              Run
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs px-3 rounded-lg">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Result preview */}
      {status === 'complete' && result && (
        <div className="px-3.5 py-2.5">
          <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">{result}</p>
          {onViewFull && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewFull}
              className="h-6 px-2 text-[10px] text-primary hover:text-primary/80 mt-1.5 -ml-1 gap-1"
            >
              View full result <ExternalLink className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="px-3.5 py-2.5">
          <p className="text-xs text-destructive/80">Failed to execute. Please try again.</p>
        </div>
      )}
    </motion.div>
  );
};
