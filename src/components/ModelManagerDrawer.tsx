import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  Cpu,
  Download,
  Eraser,
  HardDrive,
  Loader2,
  PauseCircle,
  Power,
  ShieldCheck,
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MODEL_TIERS,
  allTierModelIds,
  getLocalModelDefinition,
  type ModelTier,
} from "@/config/models";
import {
  deleteCachedModel,
  getModelManagerSnapshot,
  hasModelInCache,
  subscribeModelManager,
  switchActiveModel,
  type ModelManagerSnapshot,
} from "@/services/modelManager";
import { getBackgroundInstallSnapshot, subscribeBackgroundInstall } from "@/offline/BackgroundInstall";
import { localInferenceEngine, type LocalEngineState } from "@/offline/LocalInferenceEngine";
import { detectDeviceCapabilities, type DeviceCapabilities } from "@/utils/deviceCapabilities";

interface ModelRow {
  id: string;
  displayName: string;
  role: "primary" | "alternative" | "low-spec-option";
  sizeMB: number;
  vramMB: number;
  cached: boolean;
  active: boolean;
}

interface TierView extends ModelTier {
  rows: ModelRow[];
  incompatibleReason: string | null;
}

interface ModelManagerDrawerProps {
  /**
   * Optional controlled open state — lets other surfaces (chat header's
   * model dropdown) open the drawer. When omitted the drawer manages its
   * own state behind the floating status chip, exactly as before.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function roleLabel(role: ModelRow["role"]): string | null {
  if (role === "alternative") return "alternative";
  if (role === "low-spec-option") return "for lower-spec devices";
  return null;
}

/**
 * Tiered model manager UI: a non-intrusive status chip (bottom-left) that
 * opens a bottom-sheet drawer listing every tier — cached status ("Ready
 * Offline"), download size, hardware compatibility warnings, and
 * Download / Activate / Clear actions. Auto-cache tiers (embeddings,
 * instant chat) show their background bootstrap progress inline.
 */
export function ModelManagerDrawer({ open, onOpenChange }: ModelManagerDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const drawerOpen = isControlled ? open : uncontrolledOpen;
  const handleOpenChange = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  };
  const [snap, setSnap] = useState<ModelManagerSnapshot>(() => getModelManagerSnapshot());
  const [bgSnap, setBgSnap] = useState(() => getBackgroundInstallSnapshot());
  const [engineState, setEngineState] = useState<LocalEngineState>(localInferenceEngine.getState());
  const [activeModelId, setActiveModelId] = useState(localInferenceEngine.getCurrentModelId());
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [caps, setCaps] = useState<DeviceCapabilities | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => subscribeModelManager(setSnap), []);
  useEffect(() => subscribeBackgroundInstall(setBgSnap), []);
  useEffect(() => {
    const unsub = localInferenceEngine.subscribe((s) => {
      setEngineState(s);
      setActiveModelId(localInferenceEngine.getCurrentModelId());
    });
    return unsub;
  }, []);

  const refreshCached = useCallback(() => {
    const ids = allTierModelIds();
    void Promise.all(
      ids.map(async (id) => ({ id, cached: await hasModelInCache(id) })),
    ).then((entries) => {
      const next: Record<string, boolean> = {};
      for (const e of entries) next[e.id] = e.cached;
      setCachedMap(next);
    });
  }, []);

  useEffect(() => {
    refreshCached();
    void detectDeviceCapabilities().then(setCaps).catch(() => setCaps(null));
  }, [refreshCached, snap.phase, bgSnap.phase]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const tiers: TierView[] = useMemo(() => {
    const memory = caps?.deviceMemoryGB;
    return MODEL_TIERS.map((tier) => {
      let incompatibleReason: string | null = null;
      if (tier.requiresWebGPU && caps && !caps.webgpu) {
        incompatibleReason = "Needs WebGPU — not available in this browser";
      } else if (tier.minDeviceMemoryGB && typeof memory === "number" && memory < tier.minDeviceMemoryGB) {
        incompatibleReason = `Needs ≥${tier.minDeviceMemoryGB}GB RAM — this device reports ~${memory}GB`;
      } else if (
        tier.id === "powerhouse" &&
        caps?.adapter?.maxBufferSize != null &&
        caps.adapter.maxBufferSize < 2.0 * 1024 * 1024 * 1024
      ) {
        incompatibleReason = "GPU buffer too small for 3B models on this adapter";
      }
      const rows: ModelRow[] = tier.models.map((entry) => {
        const def = getLocalModelDefinition(entry.id);
        return {
          id: entry.id,
          displayName: def?.displayName ?? entry.id,
          role: entry.role,
          sizeMB: def?.approxStorageRequirementMB ?? 0,
          vramMB: def?.approxVRAMRequirementMB ?? 0,
          cached: cachedMap[entry.id] === true,
          active:
            entry.id === activeModelId && (engineState === "ready" || engineState === "generating"),
        };
      });
      return { ...tier, rows, incompatibleReason };
    });
  }, [cachedMap, caps, activeModelId, engineState]);

  const bootstrapBusy = snap.phase === "bootstrapping" || snap.phase === "waiting-idle";
  const chatDownloading = bgSnap.phase === "downloading" && engineState !== "ready";

  const chipStatus = useMemo(() => {
    if (snap.phase === "unsupported") return null; // chip hidden without WebGPU
    // A failed chat install must never be masked by a busy bootstrap: the
    // failure pill (bottom-right) and a "Caching models…" chip (bottom-left)
    // showing simultaneously read as two different truths. The failure wins
    // until an auto-retry flips the install back to downloading.
    if (bgSnap.phase === "failed") return { icon: "error" as const, label: "Model install failed" };
    if (chatDownloading || bootstrapBusy) {
      const pct = chatDownloading
        ? Math.round(bgSnap.progress * 100)
        : Math.round(snap.progress * 100);
      return { icon: "spinner" as const, label: pct > 0 ? `Caching models ${pct}%` : "Caching models…" };
    }
    if (snap.phase === "paused-offline") return { icon: "paused" as const, label: "Downloads paused (offline)" };
    if (snap.phase === "failed") return { icon: "error" as const, label: "Model download failed" };
    if (engineState === "ready") return { icon: "ready" as const, label: "Private AI ready offline" };
    return { icon: "idle" as const, label: "AI models" };
  }, [snap.phase, snap.progress, bootstrapBusy, chatDownloading, bgSnap.phase, bgSnap.progress, engineState]);

  const handleDownload = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        const ok = await switchActiveModel(id, (report) => {
          setNotice(`${getLocalModelDefinition(id)?.displayName ?? id}: ${Math.round(report.progress * 100)}%`);
        });
        if (ok) {
          flash("Model activated.");
        } else {
          // The engine knows WHY (missing WebGPU, GPU-less adapter, watchdog,
          // cache/mirror retries exhausted) — show that instead of a generic
          // "download failed" that sends users in circles.
          const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
          flash(localInferenceEngine.getLastError() || "Download failed — check your connection and try again.");
        }
        refreshCached();
      } finally {
        setBusyId(null);
      }
    },
    [flash, refreshCached],
  );

  const handleClear = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await deleteCachedModel(id);
        flash("Cache cleared.");
        refreshCached();
      } catch {
        flash("Could not clear this model's cache.");
      } finally {
        setBusyId(null);
      }
    },
    [flash, refreshCached],
  );

  if (!caps || chipStatus === null) return null; // capabilities not resolved yet, or WebGPU missing

  const storageMB = caps.storage;
  const persisted = caps.storagePersisted;

  return (
    <Drawer open={drawerOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <button
          className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs shadow-lg md:left-6"
          aria-label="Open model manager"
        >
          {chipStatus.icon === "spinner" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          {chipStatus.icon === "paused" && <PauseCircle className="h-3.5 w-3.5 text-amber-500" />}
          {chipStatus.icon === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
          {chipStatus.icon === "ready" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {chipStatus.icon === "idle" && <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="font-medium">{chipStatus.label}</span>
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-primary" /> Model manager
          </DrawerTitle>
          <DrawerDescription>
            Tiered on-device AI. Default tiers pre-cache in the background — everything is stored in
            this browser {persisted ? "with persistent storage" : "(eviction possible — persistence not granted)"}.
            {caps.recommendedTier !== "unsupported" && (
              <> Recommended tier for this device: <strong>{caps.recommendedTier}</strong>.</>
            )}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-4 pb-6">
          {notice && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground" role="status">
              {notice}
            </div>
          )}
          {snap.phase === "paused-offline" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
              <PauseCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              Paused while offline — shards resume automatically when you reconnect.
            </div>
          )}
          {snap.embeddingError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              Embeddings: {snap.embeddingError}
            </div>
          )}

          {tiers.map((tier) => (
            <section key={tier.id} className="rounded-xl border bg-card p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-sm font-semibold">{tier.label}</h3>
                    {tier.badge === "auto-cache-now" && <Badge variant="secondary" className="text-[10px]">auto-cache now</Badge>}
                    {tier.badge === "auto-cache-background" && <Badge variant="secondary" className="text-[10px]">auto-cache in background</Badge>}
                    {tier.badge === "on-demand" && <Badge variant="outline" className="text-[10px]">on demand</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tier.description}</p>
                </div>
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">~{tier.approxDownloadMB} MB</span>
              </div>

              {tier.incompatibleReason && (
                <p className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {tier.incompatibleReason}
                </p>
              )}

              <div className="space-y-1.5">
                {tier.rows.map((row) => {
                  const def = getLocalModelDefinition(row.id);
                  const isEmbedding = def?.modelKind === "embedding";
                  const downloadingThis =
                    bootstrapBusy && snap.currentModelId === row.id && !row.cached;
                  const chatProgressHere =
                    tier.id === "instant" && chatDownloading && bgSnap.progress > 0;
                  const label = roleLabel(row.role);
                  return (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs font-medium">{row.displayName}</span>
                          {row.active && (
                            <Badge className="gap-1 bg-success/15 text-[10px] text-success" variant="secondary">
                              <Power className="h-2.5 w-2.5" /> Active
                            </Badge>
                          )}
                          {row.cached && !row.active && (
                            <Badge variant="secondary" className="gap-1 text-[10px] text-success">
                              <ShieldCheck className="h-2.5 w-2.5" /> Ready offline
                            </Badge>
                          )}
                          {label && <span className="text-[10px] text-muted-foreground">· {label}</span>}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          ~{row.sizeMB} MB download · ~{row.vramMB} MB VRAM
                          {downloadingThis && snap.progress > 0 ? ` · ${Math.round(snap.progress * 100)}%` : ""}
                          {chatProgressHere ? ` · ${Math.round(bgSnap.progress * 100)}%` : ""}
                        </p>
                        {(downloadingThis || chatProgressHere) && (
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.round((downloadingThis ? snap.progress : bgSnap.progress) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {busyId === row.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                        {!row.cached && !tier.incompatibleReason && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => void handleDownload(row.id)}
                            disabled={busyId !== null || isEmbedding}
                            title={isEmbedding ? "Embeddings are managed by the background bootstrap" : undefined}
                          >
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        )}
                        {row.cached && !row.active && !isEmbedding && !tier.incompatibleReason && (
                          <Button
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => void handleDownload(row.id)}
                            disabled={busyId !== null}
                          >
                            <Power className="h-3 w-3" /> Activate
                          </Button>
                        )}
                        {row.cached && !row.active && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                            onClick={() => void handleClear(row.id)}
                            disabled={busyId !== null}
                            aria-label={`Clear cache for ${row.displayName}`}
                          >
                            <Eraser className="h-3 w-3" /> Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3 w-3" />
              {(storageMB.usageMB / 1024).toFixed(2)} GB used of {(storageMB.quotaMB / 1024).toFixed(1)} GB
            </span>
            <span>{persisted ? "persistent storage granted" : "persistence not granted"}</span>
          </div>

          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
