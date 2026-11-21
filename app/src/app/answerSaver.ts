/**
 * Coordinates saving answers in a study session (R-3/R-4). One answer is identified by a key (question
 * position + item id) and is written at most once:
 * - A write that is still running is shared: a second caller (Next after a background save, End session
 *   while Next is saving) waits for the SAME write and sees its real outcome. Nothing counts as saved
 *   before the write has succeeded.
 * - A failed write is never treated as saved: the answer stays pending so it can be retried.
 * - Failures come back as values, never as unhandled rejections.
 * The actual write is injected (repo.recordReview in the app), so tests can use the real database and
 * still control timing and failures.
 */
import { describeError } from './errors';
import type { Grade } from '../domain/types';

export interface Answer {
  key: string;
  itemId: string;
  grade: Grade;
  correct: boolean;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export interface AnswerSaver {
  /** Remember an answer that is checked but not yet saved (saved later by Next or by flush). */
  setPending(a: Answer): void;
  /** Save this answer (or join the write already running for its key). Never throws. */
  save(a: Answer): Promise<SaveResult>;
  /** Save the pending answer, if any (leaving, app hidden, End session). Never throws. */
  flush(): Promise<SaveResult>;
  isSaved(key: string): boolean;
  /** A write for this key is running right now. */
  isSaving(key: string): boolean;
  hasPending(): boolean;
}

export interface SaverHooks {
  /** A write failed (the answer stays pending). */
  onError?: (message: string, answer: Answer) => void;
  /** A write succeeded. */
  onSaved?: (answer: Answer) => void;
  /** Saving/saved state changed (for the UI to show "Saving…" and to stop offering a re-grade). */
  onChange?: () => void;
}

export function createAnswerSaver(write: (a: Answer) => Promise<void>, hooks: SaverHooks = {}): AnswerSaver {
  const saved = new Set<string>();
  const inFlight = new Map<string, Promise<SaveResult>>();
  let pending: Answer | null = null;

  const save = (a: Answer): Promise<SaveResult> => {
    if (saved.has(a.key)) return Promise.resolve({ ok: true });
    const running = inFlight.get(a.key);
    if (running) return running; // join it: same write, same outcome (the first grade wins)
    const p = (async (): Promise<SaveResult> => {
      try {
        await write(a);
        saved.add(a.key);
        if (pending?.key === a.key) pending = null;
        hooks.onSaved?.(a);
        return { ok: true };
      } catch (e) {
        // Not saved: put the answer back as pending so Next / End session can retry it, unless a newer
        // answer is already pending (C-1: a grade requested while this write ran must not be overwritten).
        if (!pending) pending = a;
        const error = describeError(e);
        hooks.onError?.(error, a);
        return { ok: false, error };
      } finally {
        inFlight.delete(a.key);
        hooks.onChange?.();
      }
    })();
    inFlight.set(a.key, p);
    hooks.onChange?.();
    return p;
  };

  return {
    setPending: (a) => {
      if (!saved.has(a.key)) pending = a;
    },
    save,
    flush: () => (pending ? save(pending) : Promise.resolve({ ok: true })),
    isSaved: (key) => saved.has(key),
    isSaving: (key) => inFlight.has(key),
    hasPending: () => pending !== null,
  };
}
