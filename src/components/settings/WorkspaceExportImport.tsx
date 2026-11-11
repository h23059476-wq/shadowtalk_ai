import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileJson } from "lucide-react";
import { useWorkspaceExport } from "@/hooks/useWorkspaceExport";
import { toast } from "sonner";

/**
 * Workspace export / import buttons for the Settings page.
 *
 * Export: bundles chats + templates + RAG vectors + BYOK config (NO key)
 * into a .shadow JSON file the user can sync across machines.
 * Import: restores the archive (templates + stats merged; chats/RAG
 * surface via the shadowtalk:workspace-imported event).
 */

export function WorkspaceExportImport() {
  const { exporting, importing, lastError, exportWorkspace, importWorkspace } =
    useWorkspaceExport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    await exportWorkspace();
    if (!lastError) toast.success("Workspace exported. Save the .shadow file somewhere safe.");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importWorkspace(file);
    if (!lastError) toast.success(`Imported ${file.name}. Templates + stats restored.`);
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exporting}
        className="gap-1.5"
      >
        <Download className="h-4 w-4" />
        {exporting ? "Exporting..." : "Export workspace"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleImportClick}
        disabled={importing}
        className="gap-1.5"
      >
        <Upload className="h-4 w-4" />
        {importing ? "Importing..." : "Import workspace"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".shadow,.json,application/json"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Import workspace file"
      />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 ml-1">
        <FileJson className="h-3.5 w-3.5" />
        <span>.shadow format · API keys never exported</span>
      </div>
    </div>
  );
}

export default WorkspaceExportImport;
