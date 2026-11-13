/**
 * Intelligent Workspace Batch 4 — Settings → Local Tools.
 *
 * One section (inside the existing Settings surface, no new dashboard) that
 * hosts the two user-controlled automation surfaces:
 *  - MCP bridge pairing + per-tool permissions + activity (Batch 3);
 *  - Stealth RAG embedding preference: local (default) vs remote via the
 *    user's own provider key — explicit, disclosed consent (Batch 2).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plug, ShieldCheck, ShieldAlert, Loader2, RefreshCw, Unplug, HardDrive, Cloud, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";
import {
  McpBridgeClient,
  McpBridgeClientError,
  loadConnection,
  saveConnection,
  clearConnection,
  permissionCategory,
  loadGrants,
  saveGrant,
  loadActivity,
  clearActivity,
} from "@/lib/mcpBridge";
import { getEmbeddingPreference, setEmbeddingPreference, EMBEDDING_CAPABLE_PROVIDERS } from "@/lib/rag/embeddings";
import { getByokConfig, BYOK_PROVIDERS, type ByokProvider } from "@/lib/byok";
import type { BridgeServerInfo, McpActivityEntry } from "@/lib/mcpBridge/types";

export function LocalToolsPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [connection, setConnection] = useState(() => loadConnection());
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:7717");
  const [token, setToken] = useState("");
  const [pairing, setPairing] = useState(false);
  const [servers, setServers] = useState<BridgeServerInfo[] | null>(null);
  const [loadingServers, setLoadingServers] = useState(false);
  const [grants, setGrants] = useState<Record<string, boolean>>(() => {
    // Present read-only allow-always grants as switches.
    const raw = loadGrants();
    const flags: Record<string, boolean> = {};
    for (const [key, grant] of Object.entries(raw)) {
      if (grant === "allow-always" && key.endsWith("#ro")) flags[key.slice(0, -3)] = true;
    }
    return flags;
  });
  const [activity, setActivity] = useState<McpActivityEntry[]>(() => loadActivity());

  const refreshServers = useCallback(async (config = loadConnection()) => {
    if (!config) {
      setServers(null);
      return;
    }
    setLoadingServers(true);
    try {
      const client = new McpBridgeClient(config);
      const list = await client.listServers();
      setServers(list);
      setConnection(config);
    } catch (error) {
      setServers(null);
      const message = error instanceof McpBridgeClientError ? error.message : "Bridge unreachable.";
      toast({ title: "Bridge not reachable", description: message, variant: "destructive" });
    } finally {
      setLoadingServers(false);
    }
  }, []);

  useEffect(() => {
    if (connection) void refreshServers(connection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePair = useCallback(async () => {
    if (!token.trim()) {
      toast({ title: "Paste the pairing token", description: "The companion prints it when it starts." });
      return;
    }
    setPairing(true);
    try {
      const config = saveConnection(baseUrl, token);
      const client = new McpBridgeClient(config);
      const health = await client.health();
      setConnection(config);
      toast({
        title: "Paired with your local bridge",
        description: `shadowtalk-mcp-bridge v${health.version} · ${health.servers.length} server(s).`,
      });
      setToken("");
      await refreshServers(config);
    } catch (error) {
      clearConnection();
      const message = error instanceof McpBridgeClientError ? error.message : "Pairing failed.";
      toast({ title: "Pairing failed", description: message, variant: "destructive" });
    } finally {
      setPairing(false);
    }
  }, [baseUrl, token, refreshServers]);

  const handleDisconnect = useCallback(() => {
    clearConnection();
    setConnection(null);
    setServers(null);
    toast({ title: "Bridge disconnected" });
  }, []);

  const setToolGrant = useCallback((server: string, toolName: string, readOnly: boolean, allow: boolean) => {
    const key = `${server}/${toolName}`;
    try {
      saveGrant(key, readOnly ? "read-only" : "write", allow ? "allow-always" : null);
      setGrants((prev) => ({ ...prev, [key]: allow }));
    } catch (error) {
      toast({
        title: "Not allowed",
        description: error instanceof Error ? error.message : "Grant refused.",
        variant: "destructive",
      });
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card className="glass border-border/50 card-glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4 text-primary" aria-hidden />
            Local MCP bridge
          </CardTitle>
          <CardDescription className="text-xs">
            Run <code className="rounded bg-muted/30 px-1">node companion/shadowtalk-mcp-bridge.mjs</code> on your
            machine (see <code className="rounded bg-muted/30 px-1">companion/README.md</code>), then pair once with
            the token it prints. The bridge serves ONLY your device (127.0.0.1); every tool call needs your approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connection ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 px-3 py-2">
              <div className="text-xs">
                <p className="font-medium">Paired · {connection.baseUrl}</p>
                <p className="text-muted-foreground">since {new Date(connection.pairedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void refreshServers()} disabled={loadingServers}>
                  {loadingServers ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Unplug className="h-3.5 w-3.5" aria-hidden />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="bridge-url" className="text-xs">Bridge URL</Label>
                  <Input id="bridge-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://127.0.0.1:7717" inputMode="url" autoComplete="off" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bridge-token" className="text-xs">Pairing token</Label>
                  <Input id="bridge-token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="printed by the companion" type="password" autoComplete="off" />
                </div>
              </div>
              <Button size="sm" onClick={() => void handlePair()} disabled={pairing}>
                {pairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plug className="h-3.5 w-3.5" aria-hidden />}
                Test &amp; pair
              </Button>
            </div>
          )}

          {servers !== null && (
            <div className="space-y-2">
              {servers.length === 0 && <p className="text-xs text-muted-foreground">The bridge reports no servers configured.</p>}
              {servers.map((server) => (
                <div key={server.server} className="rounded-lg border border-border/40 p-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <p className="text-xs font-semibold">{server.server}</p>
                    <Badge variant={server.status === "ready" ? "default" : "destructive"} className="text-[10px]">
                      {server.status}
                    </Badge>
                    {server.allowedRoots && (
                      <Badge variant="outline" className="text-[10px] font-normal">paths contained</Badge>
                    )}
                  </div>
                  {server.error && <p className="text-[11px] text-destructive">{server.error}</p>}
                  <div className="space-y-1">
                    {server.tools.map((tool) => {
                      const category = permissionCategory(tool);
                      const readOnly = category === "read-only";
                      const key = `${server.server}/${tool.name}`;
                      return (
                        <div key={key} className="flex items-center justify-between gap-2 rounded bg-muted/10 px-2 py-1.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium font-mono">{tool.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{tool.description || "No description"}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {readOnly ? (
                              <Badge variant="outline" className="gap-1 text-[10px] font-normal"><ShieldCheck className="h-2.5 w-2.5" aria-hidden /> read-only</Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1 text-[10px]"><ShieldAlert className="h-2.5 w-2.5" aria-hidden /> {category}</Badge>
                            )}
                            {readOnly ? (
                              <Switch
                                checked={!!grants[key]}
                                onCheckedChange={(allow) => setToolGrant(server.server, tool.name, true, allow)}
                                aria-label={`Always allow ${tool.name} without asking`}
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">asks every time</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityCard />

      <EmbeddingPreferenceCard userId={user?.id} />
    </div>
  );
}

function ActivityCard() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<McpActivityEntry[]>(() => loadActivity());

  if (entries.length === 0) {
    return (
      <Card className="glass border-border/50 card-glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4 text-muted-foreground" aria-hidden /> Local tool activity</CardTitle>
          <CardDescription className="text-xs">Invocations, approvals and denials from this device.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">No local tool activity yet.</p></CardContent>
      </Card>
    );
  }
  return (
    <Card className="glass border-border/50 card-glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4 text-muted-foreground" aria-hidden /> Local tool activity</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { clearActivity(); setEntries([]); }}>Clear</Button>
        </div>
        <CardDescription className="text-xs">Latest {entries.length} events from this device. The companion keeps the full audit log.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.slice(0, 10).map((entry, i) => (
            <div key={`${entry.ts}-${i}`} className="flex items-center justify-between gap-2 rounded bg-muted/10 px-2 py-1.5 text-[11px]">
              <span className="font-mono">{entry.server}/{entry.tool}</span>
              <span className={entry.outcome === "ok" ? "text-emerald-500" : entry.outcome === "denied" ? "text-amber-500" : "text-destructive"}>
                {entry.outcome}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmbeddingPreferenceCard({ userId }: { userId?: string }) {
  const { toast } = useToast();
  const [preference, setPreference] = useState(() => (userId ? getEmbeddingPreference(userId) : ({ kind: "local" } as const)));
  const providers = useMemo(() => [...EMBEDDING_CAPABLE_PROVIDERS] as ByokProvider[], []);
  const byok = useMemo(() => (userId ? getByokConfig() : null), [userId]);

  if (!userId) return null;
  const remoteReady = preference.kind === "remote" && byok?.provider === preference.provider && !!byok?.apiKey;

  const choose = (kind: "local" | "remote", provider?: ByokProvider) => {
    if (kind === "local") {
      setEmbeddingPreference(userId, { kind: "local" });
      setPreference({ kind: "local" });
      return;
    }
    if (!provider) return;
    if (!byok || byok.provider !== provider || !byok.apiKey) {
      toast({
        title: `${BYOK_PROVIDERS[provider].label} key required`,
        description: "Remote embeddings use YOUR provider key — set it in Models & AI first. Nothing is sent until then.",
        variant: "destructive",
      });
      return;
    }
    setEmbeddingPreference(userId, { kind: "remote", provider, consentedAt: new Date().toISOString() });
    setPreference({ kind: "remote", provider, consentedAt: new Date().toISOString() });
    toast({
      title: "Remote embeddings enabled",
      description: `New documents will be embedded via ${BYOK_PROVIDERS[provider].label} using your key. Existing local indexes are kept.`,
    });
  };

  return (
    <Card className="glass border-border/50 card-glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Document context embeddings</CardTitle>
        <CardDescription className="text-xs">
          How dropped documents are processed when indexed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/10 px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium"><HardDrive className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> On-device (recommended)</p>
            <p className="text-[11px] text-muted-foreground">Lexical embeddings computed locally. No network, no cost, works offline.</p>
          </div>
          <Switch checked={preference.kind === "local"} onCheckedChange={(v) => v && choose("local")} aria-label="Use on-device embeddings" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/10 px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium"><Cloud className="h-3.5 w-3.5 text-amber-500" aria-hidden /> Remote via my provider</p>
            <p className="text-[11px] text-muted-foreground">
              Higher-quality neural retrieval. Document TEXT is sent to {preference.kind === "remote" ? preference.provider : "your provider"} using your key
              (billed by the provider). Explicit opt-in only.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {providers.slice(0, 4).map((provider) => (
              <Button
                key={provider}
                variant={preference.kind === "remote" && preference.provider === provider ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => choose("remote", provider)}
              >
                {BYOK_PROVIDERS[provider].label.split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>
        {preference.kind === "remote" && !remoteReady && (
          <p className="text-[11px] text-amber-500">
            Your current BYOK provider does not match this choice — indexing falls back to on-device until the key matches.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default LocalToolsPanel;
