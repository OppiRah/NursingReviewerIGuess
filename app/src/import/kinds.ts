/**
 * File-type detection and upload limits (BUILD-005). Kept separate from extract.ts so the
 * Import screen can check files without pulling the PDF/Word readers into the first load.
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_PAGES = 300;

export type FileKind = 'pdf' | 'docx' | 'text' | 'unsupported';

/** An import problem with a message meant for the student (shown as-is). */
export class FriendlyImportError extends Error {
  override name = 'FriendlyImportError';
}

/** A lazy-loaded reader (PDF/Word) that could not be downloaded: offline, or the app was updated (AUDIT-001 A-09). */
export function isModuleLoadError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  // Chrome, Firefox and Safari wordings for a failed dynamic import, plus pdf.js's worker-load failure.
  return /dynamically imported module|importing a module script failed|cannot load script|setting up fake worker failed/i.test(m);
}

export const READER_LOAD_MESSAGE =
  "Couldn't load the file reader. It needs an internet connection the first time. If you are online, close the app fully and open it again (it may have been updated), then retry.";

export function fileKind(file: { name: string; type: string }): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type === 'text/plain' || file.type === 'text/markdown') return 'text';
  return 'unsupported';
}
