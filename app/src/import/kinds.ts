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

export function fileKind(file: { name: string; type: string }): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type === 'text/plain' || file.type === 'text/markdown') return 'text';
  return 'unsupported';
}
