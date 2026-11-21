/** Completion sprint: student-facing error messages (storage full / unavailable / other). */
import { describe, expect, it } from 'vitest';
import { describeError, errorKind, STORAGE_FULL_MESSAGE, STORAGE_UNAVAILABLE_MESSAGE } from '../../src/app/errors';

const named = (name: string, message = 'x', extra: Record<string, unknown> = {}): Error => Object.assign(new Error(message), { name }, extra);

describe('describeError', () => {
  it('recognizes a full disk directly or wrapped by Dexie (inner) or by cause', () => {
    expect(errorKind(named('QuotaExceededError'))).toBe('storage-full');
    expect(errorKind(named('AbortError', 'Transaction aborted', { inner: named('QuotaExceededError') }))).toBe('storage-full');
    expect(errorKind(named('BulkError', 'failed', { cause: named('Error', 'The quota has been exceeded.') }))).toBe('storage-full');
    expect(describeError(named('QuotaExceededError'))).toBe(STORAGE_FULL_MESSAGE);
  });

  it('recognizes storage that cannot be used (closed, private window, failed open)', () => {
    for (const n of ['InvalidStateError', 'DatabaseClosedError', 'OpenFailedError', 'MissingAPIError']) {
      expect(describeError(named(n))).toBe(STORAGE_UNAVAILABLE_MESSAGE);
    }
    expect(describeError(named('OpenFailedError', 'x', { inner: named('UnknownError') }))).toBe(STORAGE_UNAVAILABLE_MESSAGE);
  });

  it('keeps the message of ordinary errors, and copes with strings and odd values', () => {
    expect(describeError(new Error('Deck not found'))).toBe('Deck not found');
    expect(describeError('plain text')).toBe('plain text');
    expect(describeError(undefined)).toBe('Something went wrong.');
    expect(describeError({})).toBe('Something went wrong.');
    expect(describeError(named('TypeError', ''))).toBe('TypeError');
  });

  it('does not loop on self-referencing errors', () => {
    const e = named('Error', 'loop') as Error & { inner?: unknown };
    e.inner = e;
    expect(describeError(e)).toBe('loop');
  });
});
