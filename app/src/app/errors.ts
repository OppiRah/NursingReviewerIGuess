/**
 * One place that turns errors into messages a student can act on. Storage failures (IndexedDB via Dexie)
 * get a plain explanation and a next step; anything else keeps its own (already short) message.
 * The raw error is never needed by the student; the global error log keeps its shape for feedback.
 */

/** Error names in the error itself or anything it wraps (Dexie puts the IndexedDB error in `inner`). */
function errorNames(e: unknown): string[] {
  const names: string[] = [];
  let cur: unknown = e;
  for (let depth = 0; cur && typeof cur === 'object' && depth < 5; depth++) {
    const o = cur as { name?: unknown; inner?: unknown; cause?: unknown; message?: unknown };
    if (typeof o.name === 'string') names.push(o.name);
    if (typeof o.message === 'string' && /quota/i.test(o.message)) names.push('QuotaExceededError');
    cur = o.inner ?? o.cause;
  }
  return names;
}

export const STORAGE_FULL_MESSAGE =
  'Your phone is out of storage space for this app, so nothing was saved. Free up some space (or delete a deck you no longer need), then try again.';
export const STORAGE_UNAVAILABLE_MESSAGE =
  "The app couldn't use its storage on this device. Close the app fully and open it again. In a private or incognito window, use a normal one instead.";

const UNAVAILABLE = new Set(['InvalidStateError', 'DatabaseClosedError', 'OpenFailedError', 'MissingAPIError', 'UnknownError', 'VersionError']);

export type ErrorKind = 'storage-full' | 'storage-unavailable' | 'other';

export function errorKind(e: unknown): ErrorKind {
  const names = errorNames(e);
  if (names.includes('QuotaExceededError')) return 'storage-full';
  if (names.some((n) => UNAVAILABLE.has(n))) return 'storage-unavailable';
  return 'other';
}

/** A short message for the student. */
export function describeError(e: unknown): string {
  switch (errorKind(e)) {
    case 'storage-full':
      return STORAGE_FULL_MESSAGE;
    case 'storage-unavailable':
      return STORAGE_UNAVAILABLE_MESSAGE;
    default:
      if (e instanceof Error) return e.message || e.name;
      return typeof e === 'string' && e ? e : 'Something went wrong.';
  }
}
