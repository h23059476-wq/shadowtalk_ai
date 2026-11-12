/**
 * Document Forge project persistence.
 *
 * STATUS: STUB. `upsertDocumentProjectFromRun` is an empty async function.
 * Documents can be generated and exported (see src/lib/professionalDocument.ts,
 * worldClassDocumentExport.ts, exportToPdf.ts) but they are NOT persisted as
 * reusable projects. See docs/audit/CLAIMS_REALITY_REPORT.md P0-8a.
 *
 * When project persistence is wired (e.g. writing to a Firestore
 * `document_projects` collection or to IndexedDB), replace this stub.
 */
export const upsertDocumentProjectFromRun = async (_data: unknown): Promise<void> => {
  // STUB — Document Forge project persistence is not yet implemented.
};