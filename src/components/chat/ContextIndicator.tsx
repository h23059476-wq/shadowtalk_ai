/**
 * Intelligent Workspace Batch 4 — ambient context indicator (Stealth RAG).
 *
 * A subtle affordance above the chat toolbar: how many documents are indexed
 * for this account, whether processing is local or remote, and an inspect
 * popover listing documents with per-document deletion. It only says "local"
 * when the underlying records genuinely say so.
 */

import { useState, useCallback } from "react";
import { FileText, HardDrive, Cloud, Loader2, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { listDocuments, deleteDocument, type RagDocumentRecord } from "@/lib/rag/vectorStore";

interface ContextIndicatorProps {
  userId?: string;
  /** Bumped after ingestion so the popover re-reads the index. */
  refreshKey: number;
}

export function ContextIndicator({ userId, refreshKey: _refreshKey }: ContextIndicatorProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<RagDocumentRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const docs = await listDocuments(userId);
      setDocuments(docs);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleDelete = useCallback(async (doc: RagDocumentRecord) => {
    if (!userId) return;
    setDeletingId(doc.id);
    try {
      const removed = await deleteDocument(userId, doc.id);
      if (removed) {
        setDocuments((prev) => (prev ?? []).filter((d) => d.id !== doc.id));
        toast({ title: "Document removed", description: `"${doc.name}" and its index were deleted from this device.` });
      }
    } catch {
      toast({ title: "Could not delete", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }, [userId]);

  if (!userId) return null;
  const allLocal = documents !== null && documents.length > 0 && documents.every((d) => d.localProcessing);
  const anyRemote = documents !== null && documents.some((d) => !d.localProcessing);

  return (
    <Popover onOpenChange={(open) => { if (open) void load(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Indexed document context"
          className="touch-target inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/30"
        >
          <FileText className="h-3 w-3" aria-hidden />
          {documents === null ? "Context" : `${documents.length} doc${documents.length === 1 ? "" : "s"}`}
          {anyRemote && <Cloud className="h-3 w-3 text-amber-500" aria-label="some documents were processed remotely" />}
          {allLocal && <HardDrive className="h-3 w-3 text-emerald-500" aria-label="indexed locally on this device" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3 glass-strong">
        <p className="text-xs font-semibold mb-1">Indexed document context</p>
        <p className="text-[11px] text-muted-foreground mb-2">
          Relevant passages are retrieved automatically while you chat. Local indexes stay on this device{anyRemote ? "; some were embedded remotely via your provider" : ""}.
        </p>
        {loading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading index…</div>
        ) : !documents || documents.length === 0 ? (
          <div className="py-3 text-xs text-muted-foreground">
            No documents indexed yet. Drop a file into the chat to index it — retrieval then happens automatically.
          </div>
        ) : (
          <ScrollArea className="max-h-52">
            <div className="space-y-1.5 pr-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2 py-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {doc.chunkCount} chunks · {doc.localProcessing ? "local index" : `remote (${doc.embeddingProvider.replace("remote:", "")})`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${doc.name} and its index`}
                    disabled={deletingId === doc.id}
                    onClick={() => void handleDelete(doc)}
                  >
                    {deletingId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <Badge variant="outline" className="mt-2 text-[10px] font-normal">
          Private by design · nothing is uploaded to ShadowTalk servers
        </Badge>
      </PopoverContent>
    </Popover>
  );
}

export default ContextIndicator;
