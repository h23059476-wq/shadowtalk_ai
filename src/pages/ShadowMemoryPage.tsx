import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PrivacyBanner } from "@/components/transparency/PrivacyBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Download, Trash2, Search, Filter, FileJson, FileText, FileSpreadsheet,
  MessageSquare, Navigation2, Sparkles, Lock, Globe, Mic, Code, Settings, Shield,
  Monitor, Clock, BarChart3, Activity, HardDrive, Eye, ChevronDown, PlusCircle,
  Code2, CheckCircle2, ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useShadowMemoryContext } from "@/contexts/ShadowMemoryContext";
import type { ActivityCategory, ShadowActivity } from "@/hooks/useShadowMemory";
import { toast } from "sonner";

const CATEGORY_META: Record<ActivityCategory, { label: string; icon: typeof Brain; color: string; bg: string }> = {
  chat: { label: "Chat", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  navigation: { label: "Navigation", icon: Navigation2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  feature: { label: "Feature", icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  vault: { label: "Vault", icon: Lock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  search: { label: "Search", icon: Globe, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  upload: { label: "Upload", icon: Download, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
  voice: { label: "Voice", icon: Mic, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  code: { label: "Code", icon: Code, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  settings: { label: "Settings", icon: Settings, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  auth: { label: "Auth", icon: Shield, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  system: { label: "System", icon: Monitor, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
};

const ALL_CATEGORIES: ActivityCategory[] = Object.keys(CATEGORY_META) as ActivityCategory[];

const ShadowMemoryPage = ({ embedded = false }: { embedded?: boolean }) => {
  const {
    isReady,
    getActivities,
    getStats,
    deleteActivity,
    clearAll,
    log,
    seedDemoActivities,
    exportJSON,
    exportCSV,
    exportLogs,
  } = useShadowMemoryContext();

  const [activities, setActivities] = useState<ShadowActivity[]>([]);
  const [stats, setStats] = useState<{ total: number; categories: Record<string, number> }>({ total: 0, categories: {} });
  const [filter, setFilter] = useState<ActivityCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [expandedMetaId, setExpandedMetaId] = useState<string | null>(null);

  // New manual activity modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<ActivityCategory>("feature");
  const [newAction, setNewAction] = useState("");
  const [newDetail, setNewDetail] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [acts, st] = await Promise.all([
        getActivities({ category: filter === "all" ? undefined : filter, limit: 500 }),
        getStats(),
      ]);
      setActivities(acts);
      setStats(st);
    } catch (e) {
      console.error("Failed to refresh shadow memory:", e);
    } finally {
      setLoading(false);
    }
  }, [getActivities, getStats, filter]);

  useEffect(() => {
    if (isReady) refresh();
  }, [isReady, refresh]);

  const filtered = searchQuery
    ? activities.filter((a) => {
        const query = searchQuery.toLowerCase();
        const inAction = a.action.toLowerCase().includes(query);
        const inDetail = (a.detail || "").toLowerCase().includes(query);
        const inMeta = a.metadata ? JSON.stringify(a.metadata).toLowerCase().includes(query) : false;
        return inAction || inDetail || inMeta;
      })
    : activities;

  const visible = filtered.slice(0, visibleCount);

  const handleDelete = async (id: string) => {
    await deleteActivity(id);
    toast.success("Activity entry deleted");
    refresh();
  };

  const handleClearAll = async () => {
    await clearAll();
    toast.success("Shadow Memory cleared — all activity logs erased from your device");
    refresh();
  };

  const handleSeedDemo = async () => {
    await seedDemoActivities();
    toast.success("Sample telemetry and privacy activities loaded!");
    refresh();
  };

  const handleCreateActivity = async () => {
    if (!newAction.trim()) {
      toast.error("Please provide an action description");
      return;
    }
    await log(newCategory, newAction.trim(), newDetail.trim() || undefined, { manual: true });
    setNewAction("");
    setNewDetail("");
    setNewModalOpen(false);
    toast.success("New activity recorded to on-device memory");
    refresh();
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (formatType: "json" | "csv" | "logs") => {
    const ts = new Date().toISOString().slice(0, 10);
    if (formatType === "json") {
      downloadFile(await exportJSON(), `shadow-memory-${ts}.json`, "application/json");
    } else if (formatType === "csv") {
      downloadFile(await exportCSV(), `shadow-memory-${ts}.csv`, "text/csv");
    } else {
      downloadFile(await exportLogs(), `shadow-memory-${ts}.log`, "text/plain");
    }
    toast.success(`Exported as ${formatType.toUpperCase()}`);
  };

  return (
    <div className={embedded ? "h-full overflow-y-auto bg-background" : "min-h-screen bg-background"}>
      {!embedded && <Navigation />}
      <div className={`container mx-auto px-4 max-w-5xl ${embedded ? "py-6" : "pt-24 pb-16"}`}>
        {/* Privacy Banner */}
        <PrivacyBanner dataLocation="device" featureName="Shadow Memory" />

        {/* Hero Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Shadow Memory</h1>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <Shield className="h-2.5 w-2.5 mr-1" /> Zero Cloud Sync
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your encrypted on-device activity journal — stored <strong>100% locally in IndexedDB</strong>. Invisible to external servers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemo}
                className="text-xs h-9 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Seed Demo Logs
              </Button>

              <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="text-xs h-9 bg-primary hover:bg-primary/90">
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Record Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Record Local Activity</DialogTitle>
                    <DialogDescription>
                      Manually append an event to your on-device cryptographic ledger.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ActivityCategory)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {CATEGORY_META[cat].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Action Summary</Label>
                      <Input
                        placeholder="e.g. Conducted Security Audit"
                        value={newAction}
                        onChange={(e) => setNewAction(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Detail or Parameters (Optional)</Label>
                      <Textarea
                        placeholder="e.g. Tested privacy boundary and zero-knowledge storage..."
                        value={newDetail}
                        onChange={(e) => setNewDetail(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateActivity}>Save to Journal</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <Card className="glass border-border/50 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 text-center">
              <Activity className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50 hover:border-violet-500/40 transition-colors">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-2 text-violet-400" />
              <p className="text-xl font-bold">{Object.keys(stats.categories).length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Categories</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50 hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-4 text-center">
              <HardDrive className="h-5 w-5 mx-auto mb-2 text-emerald-400" />
              <p className="text-xl font-bold">IndexedDB</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hardware Sandbox</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50 hover:border-amber-500/40 transition-colors">
            <CardContent className="p-4 text-center">
              <Eye className="h-5 w-5 mx-auto mb-2 text-amber-400" />
              <p className="text-xl font-bold">Client Only</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Zero Exposure</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        {stats.total > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
            <Card className="glass border-border/50">
              <CardHeader className="py-3 px-4 flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter by Category
                </CardTitle>
                {filter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary px-2"
                    onClick={() => setFilter("all")}
                  >
                    Reset Filter
                  </Button>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    filter === "all"
                      ? "border-primary/60 bg-primary/15 text-primary shadow-sm"
                      : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  All Events
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {stats.total}
                  </Badge>
                </button>

                {ALL_CATEGORIES.filter((c) => stats.categories[c]).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilter(filter === cat ? "all" : cat)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        filter === cat
                          ? "border-primary/60 bg-primary/15 text-primary shadow-sm"
                          : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      {meta.label}
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                        {stats.categories[cat]}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search action, details, parameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/20 border-border/50 focus-visible:border-primary/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[140px] bg-muted/20 border-border/50">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ALL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export Dropdown */}
            <Select onValueChange={(v) => handleExport(v as any)}>
              <SelectTrigger className="w-[130px] bg-muted/20 border-border/50">
                <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <span className="text-sm">Export</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <span className="flex items-center gap-2"><FileJson className="h-3.5 w-3.5 text-blue-400" /> JSON (.json)</span>
                </SelectItem>
                <SelectItem value="csv">
                  <span className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> CSV (.csv)</span>
                </SelectItem>
                <SelectItem value="logs">
                  <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-amber-400" /> Raw Log (.log)</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear All */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="shrink-0" disabled={stats.total === 0}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Erase Shadow Memory?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently erase all {stats.total} activity entries from your local device storage.
                    Because this ledger is never sent to the cloud, this deletion cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Erase All Entries
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>

        {/* Activity Timeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-primary" />
                    Cryptographic Activity Timeline
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
                    {filter !== "all" && ` in ${CATEGORY_META[filter].label}`}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4 border border-border/50">
                    <Brain className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">No matching activity entries</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
                    {searchQuery || filter !== "all"
                      ? "Try changing your search keywords or resetting the category filter."
                      : "Your on-device ledger has no entries. Seed sample events to preview telemetry capabilities."}
                  </p>
                  <Button size="sm" onClick={handleSeedDemo} className="text-xs">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Seed Sample Activities
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {visible.map((act) => {
                      const meta = CATEGORY_META[act.category] || CATEGORY_META.system;
                      const Icon = meta.icon;
                      const hasMeta = act.metadata && Object.keys(act.metadata).length > 0;
                      const isExpanded = expandedMetaId === act.id;

                      return (
                        <motion.div
                          key={act.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="group border border-border/40 rounded-xl p-3 hover:bg-muted/15 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${meta.bg} border shrink-0 mt-0.5`}>
                              <Icon className={`h-4 w-4 ${meta.color}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground truncate">{act.action}</span>
                                <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${meta.bg} ${meta.color}`}>
                                  {meta.label}
                                </Badge>
                                {act.metadata?.manual && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                    Manual
                                  </Badge>
                                )}
                              </div>

                              {act.detail && (
                                <p className="text-xs text-muted-foreground mt-1 break-words leading-relaxed">{act.detail}</p>
                              )}

                              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/70 flex-wrap">
                                <span className="flex items-center gap-1 font-mono text-[10px]">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(act.timestamp), "MMM d, yyyy · HH:mm:ss")}
                                </span>
                                <span>·</span>
                                <span>{formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}</span>

                                {hasMeta && (
                                  <>
                                    <span>·</span>
                                    <button
                                      onClick={() => setExpandedMetaId(isExpanded ? null : act.id)}
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[10px]"
                                    >
                                      <Code2 className="h-3 w-3" />
                                      {isExpanded ? "Hide Metadata" : "View Parameters"}
                                      <ChevronRight className={`h-2.5 w-2.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Expanded Metadata view */}
                              {isExpanded && hasMeta && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2.5 p-2.5 rounded-lg bg-background/80 border border-border/60 text-xs font-mono text-muted-foreground overflow-x-auto"
                                >
                                  <pre className="text-[11px] leading-tight">
                                    {JSON.stringify(act.metadata, null, 2)}
                                  </pre>
                                </motion.div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(act.id)}
                              title="Delete log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {filtered.length > visibleCount && (
                    <Button
                      variant="ghost"
                      className="w-full mt-3 text-muted-foreground text-xs h-9"
                      onClick={() => setVisibleCount((c) => c + 50)}
                    >
                      <ChevronDown className="h-4 w-4 mr-1.5" />
                      Load more entries ({filtered.length - visibleCount} remaining)
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trust Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/20 border border-border/50 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              Shadow Memory operates purely on client-side IndexedDB with localized localStorage mirroring. No data leaves your machine.
            </span>
          </div>
        </motion.div>
      </div>
      {!embedded && <Footer />}
    </div>
  );
};

export default ShadowMemoryPage;
