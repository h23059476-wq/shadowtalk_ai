import { useCallback, useState } from "react";
import {
  Check, Download, FileCode2, FileJson2, FileText, File as FileIcon,
  Hash, Image as ImageIcon, Pencil, Plus, Terminal as TerminalIcon, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface IdeExplorerFile {
  name: string;
  language: string;
}

interface IdeExplorerProps {
  files: IdeExplorerFile[];
  activeFile: string;
  onSelect: (name: string) => void;
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onDownloadFile: (name: string) => void;
  className?: string;
}

/** Per-extension accent for file icons — a small, honest rainbow. */
function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "html" || ext === "htm") return { Icon: FileCode2, cls: "text-orange-400" };
  if (ext === "css") return { Icon: FileCode2, cls: "text-sky-400" };
  if (ext === "js" || ext === "jsx" || ext === "mjs") return { Icon: FileCode2, cls: "text-yellow-400" };
  if (ext === "ts" || ext === "tsx") return { Icon: FileCode2, cls: "text-blue-400" };
  if (ext === "json") return { Icon: FileJson2, cls: "text-lime-400" };
  if (ext === "svg" || ext === "png" || ext === "jpg" || ext === "webp") return { Icon: ImageIcon, cls: "text-accent" };
  if (ext === "py") return { Icon: TerminalIcon, cls: "text-teal-400" };
  if (ext === "md") return { Icon: FileText, cls: "text-violet-400" };
  return { Icon: FileIcon, cls: "text-muted-foreground" };
}

function validateName(name: string, files: IdeExplorerFile[], ignore?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a file name";
  if (/[\\/]/.test(trimmed)) return "Folders are not supported yet — flat file names only";
  if (trimmed.length > 64) return "File name is too long";
  if (files.some((f) => f.name === trimmed && f.name !== ignore)) return `"${trimmed}" already exists`;
  return null;
}

/** Workspace file tree (flat) with add / rename / delete / download. */
export function IdeExplorer({ files, activeFile, onSelect, onAdd, onRename, onDelete, onDownloadFile, className }: IdeExplorerProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const commitAdd = useCallback(() => {
    const err = validateName(newName, files);
    if (err) {
      setNewNameError(err);
      return;
    }
    onAdd(newName.trim());
    setNewName("");
    setNewNameError(null);
    setAdding(false);
  }, [newName, files, onAdd]);

  const commitRename = useCallback(() => {
    if (renaming === null) return;
    const err = validateName(renameValue, files, renaming);
    if (err) {
      setRenameError(err);
      return;
    }
    onRename(renaming, renameValue.trim());
    setRenaming(null);
    setRenameError(null);
  }, [renameValue, renaming, files, onRename]);

  return (
    <div className={cn("flex flex-col min-h-0 bg-card/30", className)} data-testid="ide-explorer">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => { setAdding(true); setNewName(""); setNewNameError(null); }}
          aria-label="New file"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {adding && (
          <div className="px-2 py-1.5 space-y-1">
            <div className="flex gap-1">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewNameError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAdd();
                  if (e.key === "Escape") { setAdding(false); setNewNameError(null); }
                }}
                placeholder="component.js"
                className="h-7 text-xs font-mono"
                aria-label="New file name"
              />
              <Button size="icon" className="h-7 w-7 shrink-0" onClick={commitAdd} aria-label="Create file">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setAdding(false); setNewNameError(null); }} aria-label="Cancel">
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
            {newNameError && <p className="text-[10px] text-destructive px-1">{newNameError}</p>}
          </div>
        )}

        {files.map((file) => {
          const { Icon, cls } = iconFor(file.name);
          const isActive = activeFile === file.name;
          const isRenaming = renaming === file.name;

          if (isRenaming) {
            return (
              <div key={file.name} className="px-2 py-1 space-y-1">
                <div className="flex gap-1">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") { setRenaming(null); setRenameError(null); }
                    }}
                    className="h-7 text-xs font-mono"
                    aria-label="Rename file"
                  />
                  <Button size="icon" className="h-7 w-7 shrink-0" onClick={commitRename} aria-label="Confirm rename">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                {renameError && <p className="text-[10px] text-destructive px-1">{renameError}</p>}
              </div>
            );
          }

          return (
            <div
              key={file.name}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(file.name)}
              onKeyDown={(e) => { if (e.key === "Enter") onSelect(file.name); }}
              className={cn(
                "group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 mx-1 rounded-md cursor-pointer text-xs transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : cls)} aria-hidden />
              <span className="truncate flex-1 font-mono">{file.name}</span>
              <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); setRenaming(file.name); setRenameValue(file.name); setRenameError(null); }}
                  aria-label={`Rename ${file.name}`}
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                </button>
                <button
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onDownloadFile(file.name); }}
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="h-3 w-3" aria-hidden />
                </button>
                <button
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(file.name); }}
                  aria-label={`Delete ${file.name}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </span>
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 group-hover:hidden" aria-hidden />}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 px-3 py-2 border-t border-border text-[10px] text-muted-foreground/70 font-mono">
        <Hash className="h-2.5 w-2.5 inline mr-0.5 -translate-y-px" aria-hidden />
        {files.length} file{files.length === 1 ? "" : "s"} · saved on this device
      </div>
    </div>
  );
}
