/**
 * Offline Model Manager (Tier 1 — zero-cost client-side inference).
 *
 * Settings → Offline AI. Explicit, honest control over the three
 * @huggingface/transformers pipelines that run in the dedicated worker:
 *
 *   - Embeddings   (mxbai-embed-xsmall-v1) — neural on-device RAG vectors
 *   - Speech-to-text (whisper-tiny.en)     — offline dictation
 *   - Compact chat  (Qwen2.5 0.5B/1.5B q4) — offline fallback chat,
 *     the ONLY chat path on WebGPU-less devices (WASM)
 *
 * Shows cached models + disk size, download progress bars, and Delete Cache.
 * Everything downloads directly from the Hugging Face Hub on first use and is
 * served from the browser Cache API afterwards — 100% offline after install.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fbAuth } from "@/integrations/firebase/app";
import {
  AlertTriangle,
  Cpu,
  Download,
  FileText,
  HardDrive,
  Loader2,
  MessageSquare,
  Mic,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import {
  getHfCacheInventory,
  deleteHfModelCache,
  deleteAllHfCache,
  formatCacheBytes,
  type HfCacheInventory,
} from "@/lib/localInference/hfCacheManager";
import {
  HF_MODELS,
  taskLabel,
  type HfModelDefinition,
} from "@/lib/localInference/hfModels";
import { getLocalInferenceClient, type LocalEngineStatus } from "@/lib/localInference/localEngineClient";
import {
  getLocalTranscriptionPref,
  setLocalTranscriptionPref,
} from "@/hooks/useChatSpeech";
import { getEmbeddingPreference, setEmbeddingPreference } from "@/lib/rag/embeddings";

const TASK_ORDER = ["feature-extraction", "automatic-speech-recognition", "text-generation"] as const;

function statusBadge(status: LocalEngineStatus): { label: string; className: string; icon: React.ReactNode } {
  switch (status.state) {
    case "ready":
      return {
        label: status.device === "webgpu" ? "WebGPU ready" : "CPU (WASM) ready",
        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        icon: <ShieldCheck className="h-3 w-3" />,
      };
    case "loading":
      return {
        label: status.device === "wasm" ? "Loading on CPU (WASM)" : "Loading",
        className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
      };
    case "recovering":
      return {
        label: "Recovering after GPU crash",
        className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    case "dead":
      return {
        label: "Engine stopped (crashed)",
        className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    default:
      return {
        label: "Idle",
        className: "bg-white/5 text-muted-foreground border-white/10",
        icon: <Cpu className="h-3 w-3" />,
      };
  }
}

function taskIcon(task: HfModelDefinition["task"]): React.ReactNode {
  switch (task) {
    case "feature-extraction":
      return <FileText className="h-4 w-4 text-indigo-400" />;
    case "automatic-speech-recognition":
      return <Mic className="h-4 w-4 text-cyan-400" />;
    case "text-generation":
      return <MessageSquare className="h-4 w-4 text-emerald-400" />;
  }
}

export const OfflineModelManager: React.FC = () => {
  const [inventory, setInventory] = useState<HfCacheInventory | null>(null);
  const [progress, setProgress] = useState<Record<string, { progress: number; status: string }>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LocalEngineStatus>(() => getLocalInferenceClient().getStatus());
  const [asrPref, setAsrPref] = useState<"auto" | "prefer" | "off">(() => getLocalTranscriptionPref());
  const [neuralEmbeddings, setNeuralEmbeddings] = useState<boolean>(() => {
    const user = fbAuth().currentUser;
    return user ? getEmbeddingPreference(user.uid).kind === "local-hf" : false;
  });

  const refreshInventory = useCallback(async () => {
    const next = await getHfCacheInventory();
    setInventory(next);
  }, []);

  useEffect(() => {
    void refreshInventory();
    const unsubscribe = getLocalInferenceClient().subscribeStatus(setStatus);
    return unsubscribe;
  }, [refreshInventory]);

  const cachedByRepo = useMemo(() => {
    const map = new Map<string, { bytes: number; files: number; hasWeights: boolean }>();
    for (const model of inventory?.models ?? []) {
      map.set(model.repoId, { bytes: model.bytes, files: model.files, hasWeights: model.hasWeights });
    }
    return map;
  }, [inventory]);

  const badge = statusBadge(status);

  const download = async (model: HfModelDefinition) => {
    const client = getLocalInferenceClient();
    setError(null);
    setBusy((b) => ({ ...b, [model.repoId]: true }));
    setProgress((p) => ({ ...p, [model.repoId]: { progress: 0, status: "initiate" } }));
    try {
      const result = await client.downloadModel(model, (progressValue, progressStatus) => {
        setProgress((p) => ({ ...p, [model.repoId]: { progress: progressValue, status: progressStatus } }));
      });
      setProgress((p) => ({ ...p, [model.repoId]: { progress: 1, status: `ready on ${result.device}` } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The model download failed.");
      setProgress((p) => {
        const next = { ...p };
        delete next[model.repoId];
        return next;
      });
    } finally {
      setBusy((b) => ({ ...b, [model.repoId]: false }));
      void refreshInventory();
    }
  };

  const removeModel = async (repoId: string) => {
    setBusy((b) => ({ ...b, [repoId]: true }));
    try {
      await deleteHfModelCache(repoId);
      await refreshInventory();
    } catch {
      setError("Could not delete the cached model.");
    } finally {
      setBusy((b) => ({ ...b, [repoId]: false }));
    }
  };

  const removeAll = async () => {
    setBusy((b) => ({ ...b, __all: true }));
    try {
      await deleteAllHfCache();
      await refreshInventory();
    } catch {
      setError("Could not delete the offline model cache.");
    } finally {
      setBusy((b) => ({ ...b, __all: false }));
    }
  };

  const toggleNeuralEmbeddings = (enabled: boolean) => {
    const user = fbAuth().currentUser;
    if (!user) {
      setError("Sign in to persist the neural embeddings preference across sessions.");
      return;
    }
    setNeuralEmbeddings(enabled);
    setEmbeddingPreference(
      user.uid,
      enabled
        ? { kind: "local-hf", consentedAt: new Date().toISOString() }
        : { kind: "local" },
    );
  };

  const grouped = useMemo(() => {
    const groups = new Map<string, HfModelDefinition[]>();
    for (const model of HF_MODELS) {
      const list = groups.get(model.task) ?? [];
      list.push(model);
      groups.set(model.task, list);
    }
    return TASK_ORDER.map((task) => ({ task, models: groups.get(task) ?? [] }));
  }, []);

  return (
    <Card className="glass border-border/50 card-glass">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <CardTitle className="text-base">Offline Model Manager</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant="outline" className={`gap-1.5 ${badge.className}`}>
                {badge.icon}
                {badge.label}
              </Badge>
            )}
            {status.respawns > 0 && (
              <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground">
                {status.respawns} crash recover{status.respawns === 1 ? "y" : "ies"}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Zero-cost, on-device AI via WebGPU (automatic WASM fallback). Models download from the
          Hugging Face Hub once, then run fully offline. All inference runs in a dedicated worker —
          the chat thread never blocks.
        </p>
        {status.detail && (
          <p className="text-xs text-muted-foreground/80 mt-1 italic">{status.detail}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {grouped.map(({ task, models }) => (
          <div key={task} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {taskIcon(task)}
              {taskLabel(task)}
            </div>
            {models.map((model) => {
              const cached = cachedByRepo.get(model.repoId);
              const downloadState = progress[model.repoId];
              const isBusy = !!busy[model.repoId];
              return (
                <div
                  key={model.repoId}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {model.displayName}
                        {model.englishOnly && (
                          <span className="ml-2 text-[10px] text-muted-foreground font-normal">EN</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cached
                          ? `${formatCacheBytes(cached.bytes)} on disk · ${cached.files} file${cached.files === 1 ? "" : "s"}`
                          : `~${model.approxDownloadMB} MB download`}
                        {" · "}
                        {model.purpose}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cached?.hasWeights && (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          cached
                        </Badge>
                      )}
                      {!cached?.hasWeights && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 text-xs"
                          disabled={isBusy || !!downloadState}
                          onClick={() => void download(model)}
                        >
                          {isBusy || downloadState ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          {downloadState ? "Downloading" : "Download"}
                        </Button>
                      )}
                      {cached && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                          disabled={isBusy}
                          title="Delete cached model"
                          onClick={() => void removeModel(model.repoId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {downloadState && (
                    <div className="space-y-1">
                      <Progress value={Math.round(downloadState.progress * 100)} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground">
                        {downloadState.status}
                        {downloadState.progress > 0 && ` · ${Math.round(downloadState.progress * 100)}%`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Behavior toggles */}
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => toggleNeuralEmbeddings(!neuralEmbeddings)}
            className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
              neuralEmbeddings
                ? "border-indigo-500/40 bg-indigo-500/10"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            <p className="text-sm font-medium">Neural document embeddings</p>
            <p className="text-xs text-muted-foreground">
              {neuralEmbeddings
                ? "On — RAG vectors come from the on-device neural model."
                : "Off — RAG uses the fast lexical embedder (default)."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = asrPref === "prefer" ? "auto" : "prefer";
              setAsrPref(next);
              setLocalTranscriptionPref(next);
            }}
            className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
              asrPref === "prefer"
                ? "border-cyan-500/40 bg-cyan-500/10"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            <p className="text-sm font-medium">Prefer offline dictation</p>
            <p className="text-xs text-muted-foreground">
              {asrPref === "prefer"
                ? "On — dictation always uses on-device Whisper (nothing leaves the device)."
                : "Auto — whisper runs when the cloud speech API is unavailable or you are offline."}
            </p>
          </button>
        </div>

        {/* Total + delete all */}
        {inventory && inventory.models.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="h-3.5 w-3.5" />
              <span>
                {formatCacheBytes(inventory.totalBytes)} cached across {inventory.models.length} model
                {inventory.models.length === 1 ? "" : "s"}
                {inventory.originUsageBytes !== null &&
                  ` · origin storage ${formatCacheBytes(inventory.originUsageBytes)}`}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-rose-400"
              disabled={!!busy.__all}
              onClick={() => void removeAll()}
            >
              {busy.__all ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Delete all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineModelManager;
