/**
 * Intelligent Workspace Batch 4 — MCP tool approval dialog.
 *
 * Sensitive actions require explicit confirmation (AlertDialog, the
 * established ChatToolbar pattern). Write/execute tools ALWAYS prompt —
 * there is no "always allow" for them anywhere in the pipeline. Read-only
 * tools prompt once unless the user chose allow-always.
 */

import { Share2, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import type { PermissionCategory } from "@/lib/mcpBridge/types";

export interface McpApprovalRequest {
  server: string;
  tool: string;
  category: PermissionCategory;
  args: Record<string, unknown>;
  description: string;
  resolve: (approved: boolean) => void;
}

interface McpApprovalDialogProps {
  request: McpApprovalRequest | null;
}

const CATEGORY_LABEL: Record<PermissionCategory, { label: string; tone: "default" | "destructive" }> = {
  "read-only": { label: "Read-only operation", tone: "default" },
  write: { label: "Modifying operation", tone: "destructive" },
  execute: { label: "Command execution", tone: "destructive" },
};

export function McpApprovalDialog({ request }: McpApprovalDialogProps) {
  if (!request) return null;
  const { server, tool, category, args, description, resolve } = request;
  const meta = CATEGORY_LABEL[category];

  const finish = (approved: boolean) => {
    resolve(approved);
  };

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) finish(false); }}>
      <AlertDialogContent className="glass-strong max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {category === "read-only" ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden />
            )}
            Allow local tool: <span className="font-mono">{tool}</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Your local bridge reported tool <span className="font-mono">{server}/{tool}</span>
                {description ? <> — {description}</> : null}.
              </p>
              <Badge variant={meta.tone} className="text-[11px]">
                {meta.label}
              </Badge>
              {category !== "read-only" && (
                <p className="text-xs">
                  This can MODIFY your system. ShadowTalk will ask again next time — sensitive tools can never be
                  allowed permanently.
                </p>
              )}
              {Object.keys(args).length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Arguments to be sent:</p>
                  <pre className="max-h-32 overflow-auto rounded-lg bg-muted/30 p-2 text-[11px] leading-snug">
                    {JSON.stringify(args, null, 2)}
                  </pre>
                </div>
              )}
              <p className="text-xs flex items-center gap-1 text-muted-foreground">
                <Share2 className="h-3 w-3" aria-hidden /> Executed by your local bridge (127.0.0.1) — never by ShadowTalk servers.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => finish(true)} className={category === "read-only" ? "" : "bg-amber-600 hover:bg-amber-700 text-white"}>
            {category === "read-only" ? "Allow once" : "Approve"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default McpApprovalDialog;
