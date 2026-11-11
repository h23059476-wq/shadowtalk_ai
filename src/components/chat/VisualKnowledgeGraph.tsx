import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Network, Search, Trash2, Lightbulb, BarChart3, ZoomIn, ZoomOut, Maximize2, Save, Download, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useKnowledgeGraph } from "@/hooks/useKnowledgeGraph";
import { useMemoryGraph } from "@/hooks/useMemoryGraph";
import { useKnowledgeSnapshot } from "@/hooks/useKnowledgeSnapshot";
import { useToast } from "@/hooks/use-toast";

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  entity: { bg: "hsl(var(--primary) / 0.15)", border: "hsl(var(--primary) / 0.5)", text: "hsl(var(--primary))" },
  concept: { bg: "hsl(var(--secondary) / 0.15)", border: "hsl(var(--secondary) / 0.5)", text: "hsl(var(--secondary))" },
  topic: { bg: "hsl(var(--accent) / 0.15)", border: "hsl(var(--accent) / 0.5)", text: "hsl(var(--accent))" },
  memory: { bg: "hsl(var(--success) / 0.15)", border: "hsl(var(--success) / 0.5)", text: "hsl(var(--success))" },
  technology: { bg: "hsl(var(--primary) / 0.15)", border: "hsl(var(--primary) / 0.5)", text: "hsl(var(--primary))" },
  company: { bg: "hsl(240 50% 60% / 0.15)", border: "hsl(240 50% 60% / 0.5)", text: "hsl(240 50% 60%)" },
  industry: { bg: "hsl(30 80% 55% / 0.15)", border: "hsl(30 80% 55% / 0.5)", text: "hsl(30 80% 55%)" },
  metric: { bg: "hsl(150 60% 45% / 0.15)", border: "hsl(150 60% 45% / 0.5)", text: "hsl(150 60% 45%)" },
};

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const VisualKnowledgeGraph = () => {
  const { toast } = useToast();
  const {
    nodes,
    edges,
    isLoading,
    searchGraph,
    generateInsights,
    getStatistics,
    deleteNode,
    clearGraph,
    getRelatedNodes,
    importGraph,
  } = useKnowledgeGraph();

  const { isReady: memoryReady, stats: memoryStats } = useMemoryGraph();
  const { saveSnapshot, loadLatestSnapshot } = useKnowledgeSnapshot();
  const [snapshotBusy, setSnapshotBusy] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Map<string, NodePosition>>(new Map());
  const animFrameRef = useRef<number>();
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<string | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const stats = useMemo(() => getStatistics(), [getStatistics]);
  const insights = useMemo(() => generateInsights(), [generateInsights]);
  const filteredNodes = useMemo(
    () => searchQuery ? searchGraph(searchQuery) : nodes,
    [searchQuery, nodes, searchGraph]
  );
  const relatedNodes = useMemo(
    () => selectedNode ? getRelatedNodes(selectedNode) : [],
    [selectedNode, getRelatedNodes]
  );

  // Initialize positions with force-directed layout
  useEffect(() => {
    const positions = positionsRef.current;
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const cx = width / 2;
    const cy = height / 2;

    nodes.forEach((node, i) => {
      if (!positions.has(node.id)) {
        const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
        const radius = Math.min(width, height) * 0.3;
        positions.set(node.id, {
          x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
          y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
          vx: 0,
          vy: 0,
        });
      }
    });
  }, [nodes]);

  // Force-directed simulation + rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const positions = positionsRef.current;

    // Simple force simulation step
    const displayedNodes = searchQuery ? filteredNodes : nodes;
    const displayedNodeIds = new Set(displayedNodes.map(n => n.id));
    const displayedEdges = edges.filter(e => displayedNodeIds.has(e.source) && displayedNodeIds.has(e.target));

    // Apply forces
    displayedNodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos || dragNodeRef.current === node.id) return;

      // Center gravity
      pos.vx += (width / 2 - pos.x) * 0.001;
      pos.vy += (height / 2 - pos.y) * 0.001;

      // Repulsion between nodes
      displayedNodes.forEach(other => {
        if (other.id === node.id) return;
        const otherPos = positions.get(other.id);
        if (!otherPos) return;
        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = Math.min(5000 / (dist * dist), 3);
        pos.vx += (dx / dist) * force;
        pos.vy += (dy / dist) * force;
      });
    });

    // Edge attraction
    displayedEdges.forEach(edge => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 150) * 0.003;
      if (dragNodeRef.current !== edge.source) {
        source.vx += (dx / dist) * force;
        source.vy += (dy / dist) * force;
      }
      if (dragNodeRef.current !== edge.target) {
        target.vx -= (dx / dist) * force;
        target.vy -= (dy / dist) * force;
      }
    });

    // Update positions
    displayedNodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos || dragNodeRef.current === node.id) return;
      pos.vx *= 0.85;
      pos.vy *= 0.85;
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.x = Math.max(30, Math.min(width - 30, pos.x));
      pos.y = Math.max(30, Math.min(height - 30, pos.y));
    });

    // Clear and draw
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    displayedEdges.forEach(edge => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return;

      const isHighlighted = selectedNode === edge.source || selectedNode === edge.target;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = isHighlighted
        ? "hsl(var(--primary) / 0.6)"
        : "hsl(var(--muted-foreground) / 0.15)";
      ctx.lineWidth = isHighlighted ? 2 : Math.min(edge.weight, 3);
      ctx.stroke();
    });

    // Draw nodes
    displayedNodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const isSelected = selectedNode === node.id;
      const isRelated = relatedNodes.some(n => n.id === node.id);
      const radius = Math.max(8, Math.min(20, 6 + node.frequency * 2));
      const colors = TYPE_COLORS[node.type] || TYPE_COLORS.entity;

      // Glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = "hsl(var(--primary) / 0.1)";
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected
        ? "hsl(var(--primary) / 0.3)"
        : isRelated
          ? "hsl(var(--primary) / 0.2)"
          : colors.bg;
      ctx.fill();
      ctx.strokeStyle = isSelected
        ? "hsl(var(--primary))"
        : isRelated
          ? "hsl(var(--primary) / 0.6)"
          : colors.border;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "hsl(var(--foreground))";
      ctx.font = `${isSelected ? "bold " : ""}${Math.max(10, 11)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        node.label.length > 15 ? node.label.slice(0, 14) + "…" : node.label,
        pos.x,
        pos.y + radius + 14
      );
    });

    ctx.restore();
    animFrameRef.current = requestAnimationFrame(render);
  }, [nodes, edges, filteredNodes, searchQuery, selectedNode, relatedNodes, zoom, pan]);

  // Start/stop animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Mouse handlers for interaction
  const getNodeAtPosition = useCallback((mx: number, my: number) => {
    const positions = positionsRef.current;
    const displayedNodes = searchQuery ? filteredNodes : nodes;
    for (const node of displayedNodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      const x = (mx - pan.x) / zoom;
      const y = (my - pan.y) / zoom;
      const radius = Math.max(8, Math.min(20, 6 + node.frequency * 2));
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist <= radius + 5) return node.id;
    }
    return null;
  }, [nodes, filteredNodes, searchQuery, zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const nodeId = getNodeAtPosition(mx, my);
    if (nodeId) {
      dragNodeRef.current = nodeId;
      setSelectedNode(nodeId);
    } else {
      isDraggingRef.current = true;
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, [getNodeAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (dragNodeRef.current) {
      const pos = positionsRef.current.get(dragNodeRef.current);
      if (pos) {
        pos.x += dx / zoom;
        pos.y += dy / zoom;
        pos.vx = 0;
        pos.vy = 0;
      }
    } else if (isDraggingRef.current) {
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, [zoom]);

  const handleMouseUp = useCallback(() => {
    dragNodeRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)));
  }, []);

  const handleSaveSnapshot = useCallback(async () => {
    setSnapshotBusy(true);
    const ok = await saveSnapshot(nodes, edges);
    setSnapshotBusy(false);
    toast({
      title: ok ? "Snapshot saved" : "Sign in to save",
      description: ok
        ? `${nodes.length} entities backed up to your cloud vault`
        : "Cloud snapshots require an authenticated account",
      variant: ok ? "default" : "destructive",
    });
  }, [nodes, edges, saveSnapshot, toast]);

  const handleRestoreSnapshot = useCallback(async () => {
    setSnapshotBusy(true);
    const snapshot = await loadLatestSnapshot();
    setSnapshotBusy(false);

    if (!snapshot?.snapshot_data) {
      toast({
        title: "No snapshot found",
        description: "Save a snapshot first or sign in to restore from cloud",
        variant: "destructive",
      });
      return;
    }

    const data = snapshot.snapshot_data as {
      entities?: Array<{
        id?: string;
        label?: string;
        type?: string;
        content?: string;
        frequency?: number;
        lastMentioned?: string | Date;
        metadata?: Record<string, unknown>;
      }>;
      relationships?: Array<{ source?: string; target?: string; relationship?: string; weight?: number }>;
    };

    const entities = data.entities ?? [];
    const relationships = data.relationships ?? [];

    const importNodes = entities
      .filter((e) => e.id && e.label && e.type)
      .map((e) => ({
        id: e.id!,
        user_id: "",
        label: e.label!,
        type: e.type as "entity" | "concept" | "topic" | "memory",
        content: e.content || e.label!,
        frequency: e.frequency ?? 1,
        lastMentioned: (e.lastMentioned ? new Date(e.lastMentioned) : new Date()).toISOString(),
        metadata: e.metadata,
      }));

    const importEdges = relationships
      .filter((r) => r.source && r.target)
      .map((r) => ({
        id: `${r.source!}-${r.target!}`,
        user_id: "",
        source: r.source!,
        target: r.target!,
        relationship: r.relationship || "related",
        weight: r.weight ?? 1,
      }));

    await importGraph(importNodes, importEdges);

    toast({
      title: "Snapshot restored",
      description: `Loaded ${entities.length} entities and ${relationships.length} relationships`,
    });
  }, [loadLatestSnapshot, importGraph, toast]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-lg p-2">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg">Local Knowledge Graph</h2>
          <p className="text-xs text-muted-foreground">
            {stats.totalNodes} nodes · {stats.totalEdges} connections · 100% on-device
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={snapshotBusy || nodes.length === 0}
            onClick={handleSaveSnapshot}
          >
            {snapshotBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={snapshotBusy}
            onClick={handleRestoreSnapshot}
          >
            <Download className="h-3 w-3" />
            Restore
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Contextual memory layers (IndexedDB) */}
      {memoryReady && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
          <Brain className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">Memory graph:</span>
          <Badge variant="secondary" className="text-[10px] h-5">
            {memoryStats.episodicCount} episodic
          </Badge>
          <Badge variant="secondary" className="text-[10px] h-5">
            {memoryStats.semanticCount} semantic
          </Badge>
          <Badge variant="secondary" className="text-[10px] h-5">
            {memoryStats.proceduralCount} procedural
          </Badge>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search knowledge graph..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Graph Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[400px] rounded-xl border border-border/50 bg-muted/10 overflow-hidden relative cursor-grab active:cursor-grabbing"
      >
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <Network className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">Knowledge graph is empty</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
              Chat with ShadowTalk AI to automatically build your personal knowledge graph.
              The AI extracts entities, concepts, and connections from your conversations — all stored locally.
            </p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full"
          />
        )}
      </div>

      {/* Side Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Selected Node Details */}
        <Card className="border-border/50">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              {selectedNode ? "Node Details" : "Graph Stats"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {selectedNode ? (
              <div className="space-y-2">
                {(() => {
                  const node = nodes.find(n => n.id === selectedNode);
                  if (!node) return <p className="text-xs text-muted-foreground">Node not found</p>;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{node.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4">{node.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{node.content}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>Mentions: {node.frequency}</span>
                        <span>Connections: {relatedNodes.length}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive hover:text-destructive gap-1"
                        onClick={() => { deleteNode(node.id); setSelectedNode(null); }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="font-bold text-lg">{stats.totalNodes}</div>
                  <div className="text-muted-foreground">Nodes</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="font-bold text-lg">{stats.totalEdges}</div>
                  <div className="text-muted-foreground">Connections</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="border-border/50">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="max-h-32">
              {insights.length > 0 ? (
                <div className="space-y-2">
                  {insights.slice(0, 3).map((insight, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{insight.title}:</span>{" "}
                      <span className="text-muted-foreground">{insight.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No insights yet. Build your knowledge graph by chatting.
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisualKnowledgeGraph;
