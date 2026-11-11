import { useCallback, useState } from "react";

/**
 * Workspace export / import — bundles the user's local workspace state
 * (chat history, prompt templates, RAG vector indexes, BYOK config minus
 * the actual key material) into a single .shadow JSON file.
 *
 * Format: ShadowTalk Workspace Archive v1
 *   {
 *     "schema": "shadowtalk.workspace.v1",
 *     "exportedAt": "2026-10-27T10:00:00.000Z",
 *     "version": 1,
 *     "chats": [...],         // chat history from IndexedDB
 *     "templates": [...],     // custom prompt templates
 *     "ragIndexes": [...],    // local RAG vector indexes
 *     "byokConfig": {...},    // BYOK config (provider + model, NO apiKey)
 *     "stats": {...}          // cumulative spend etc.
 *   }
 *
 * The .shadow extension is just .json underneath — we use the custom
 * extension so OS file associations can be set up later.
 *
 * SECURITY: API keys are NEVER exported. The byokConfig object includes
 * only provider + model, not the apiKey. On import, the user must paste
 * their key again.
 */

const SCHEMA = "shadowtalk.workspace.v1";

export interface WorkspaceArchive {
  schema: string;
  exportedAt: string;
  version: 1;
  chats: unknown[];
  templates: unknown[];
  ragIndexes: unknown[];
  byokConfig: { provider: string; model: string } | null;
  stats: { totalSpendUsd: number; requestCount: number };
}

async function collectChats(): Promise<unknown[]> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("shadowtalk-db");
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("chats")) {
          resolve([]);
          return;
        }
        const tx = db.transaction("chats", "readonly");
        const store = tx.objectStore("chats");
        const allReq = store.getAll();
        allReq.onsuccess = () => resolve(allReq.result || []);
        allReq.onerror = () => resolve([]);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function collectRagIndexes(): Promise<unknown[]> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("shadowtalk-rag");
      req.onsuccess = () => {
        const db = req.result;
        const out: unknown[] = [];
        for (const storeName of db.objectStoreNames) {
          try {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const allReq = store.getAll();
            allReq.onsuccess = () => {
              if (allReq.result) {
                out.push({ store: storeName, vectors: allReq.result });
              }
            };
          } catch {
            /* skip this store */
          }
        }
        // Give all tx a moment to resolve
        setTimeout(() => resolve(out), 200);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function collectTemplates(): unknown[] {
  try {
    const raw = localStorage.getItem("shadowtalk_prompt_templates");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function collectByokConfig(): { provider: string; model: string } | null {
  try {
    // Read all byok keys (per-uid) and return the first non-empty config
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("shadowtalk.byok.v2.")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const cfg = JSON.parse(raw);
          if (cfg?.provider && cfg?.model) {
            return { provider: cfg.provider, model: cfg.model };
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function collectStats(): { totalSpendUsd: number; requestCount: number } {
  try {
    const raw = localStorage.getItem("shadowtalk_byok_spend_v1");
    if (raw) {
      const s = JSON.parse(raw);
      return {
        totalSpendUsd: s.totalUsd ?? 0,
        requestCount: s.requestCount ?? 0,
      };
    }
  } catch {
    /* ignore */
  }
  return { totalSpendUsd: 0, requestCount: 0 };
}

export interface UseWorkspaceExportState {
  exporting: boolean;
  importing: boolean;
  lastError: string | null;
  exportWorkspace: () => Promise<void>;
  importWorkspace: (file: File) => Promise<void>;
}

export function useWorkspaceExport(): UseWorkspaceExportState {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const exportWorkspace = useCallback(async () => {
    setExporting(true);
    setLastError(null);
    try {
      const [chats, ragIndexes] = await Promise.all([
        collectChats(),
        collectRagIndexes(),
      ]);
      const archive: WorkspaceArchive = {
        schema: SCHEMA,
        exportedAt: new Date().toISOString(),
        version: 1,
        chats,
        templates: collectTemplates(),
        ragIndexes,
        byokConfig: collectByokConfig(),
        stats: collectStats(),
      };

      const blob = new Blob([JSON.stringify(archive, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `shadowtalk-workspace-${stamp}.shadow`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, []);

  const importWorkspace = useCallback(async (file: File) => {
    setImporting(true);
    setLastError(null);
    try {
      const text = await file.text();
      const archive = JSON.parse(text) as WorkspaceArchive;
      if (archive.schema !== SCHEMA) {
        throw new Error(
          `Unrecognized archive schema: ${archive.schema}. Expected ${SCHEMA}.`,
        );
      }

      // Restore templates
      if (Array.isArray(archive.templates)) {
        localStorage.setItem(
          "shadowtalk_prompt_templates",
          JSON.stringify(archive.templates),
        );
      }

      // Restore stats (merge — don't overwrite existing spend)
      if (archive.stats) {
        try {
          const existing = localStorage.getItem("shadowtalk_byok_spend_v1");
          const existingStats = existing
            ? JSON.parse(existing)
            : { totalUsd: 0, requestCount: 0 };
          localStorage.setItem(
            "shadowtalk_byok_spend_v1",
            JSON.stringify({
              ...existingStats,
              totalUsd:
                (existingStats.totalUsd ?? 0) + (archive.stats.totalSpendUsd ?? 0),
              requestCount:
                (existingStats.requestCount ?? 0) +
                (archive.stats.requestCount ?? 0),
            }),
          );
        } catch {
          /* ignore */
        }
      }

      // Note: chats and RAG indexes require IndexedDB writes which are
      // async and store-specific. For v1 we surface them via a custom
      // event so the host app can decide whether to restore them.
      window.dispatchEvent(
        new CustomEvent("shadowtalk:workspace-imported", {
          detail: { archive },
        }),
      );
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, []);

  return { exporting, importing, lastError, exportWorkspace, importWorkspace };
}

export default useWorkspaceExport;
