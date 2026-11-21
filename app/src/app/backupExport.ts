/**
 * Backup export with an honest confirmation step (AUDIT-001 A-08).
 * A web app cannot know whether the phone really saved a downloaded file, so an export ATTEMPT only
 * creates a pending backup kept in memory. `lastExportAt` (which silences the 7-day reminder) is written
 * only when the student confirms they found the file. A reload drops the pending backup, so nothing can
 * be confirmed without a fresh export attempt.
 */
import type { BackupFile } from '../domain/backup';

export interface PendingBackup {
  fileName: string;
  /** The backup's own timestamp: recorded as lastExportAt once confirmed (it is what the file contains). */
  exportedAt: string;
  json: string;
}

export function toPending(backup: BackupFile, fileName: string): PendingBackup {
  return { fileName, exportedAt: backup.exportedAt, json: JSON.stringify(backup, null, 1) };
}

/** The subset of `navigator` used for the share sheet, so it can be tested with fakes. */
export interface ShareNavigator {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; title?: string }) => Promise<void>;
}

export const pendingFile = (p: PendingBackup): File => new File([p.json], p.fileName, { type: 'application/json' });

/** True only where the browser says it can share this file (feature-detected; never assumed). */
export function canShareBackup(nav: ShareNavigator, p: PendingBackup): boolean {
  try {
    return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [pendingFile(p)] });
  } catch {
    return false;
  }
}

export type ShareOutcome = 'shared' | 'cancelled' | 'failed';

/** Opens the share sheet. Never records a backup: the student still confirms they found the file. */
export async function shareBackup(nav: ShareNavigator, p: PendingBackup): Promise<ShareOutcome> {
  if (!canShareBackup(nav, p) || !nav.share) return 'failed';
  try {
    await nav.share({ files: [pendingFile(p)], title: p.fileName });
    return 'shared';
  } catch (e) {
    // Browsers reject with a DOMException; don't rely on it being an Error subclass.
    return (e as { name?: unknown } | null)?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
