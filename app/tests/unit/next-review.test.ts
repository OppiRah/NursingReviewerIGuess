/** Completion sprint: "when do I come back?" once today's plan is done. Synthetic items only. */
import { describe, expect, it } from 'vitest';
import { nextReviewDay } from '../../src/domain/plan';
import type { Item } from '../../src/domain/types';
import { nextLine } from '../../src/screens/TodayScreen';

const NOW = new Date(2026, 10, 21, 20, 0);
const at = (d: number, h = 9): string => new Date(2026, 10, 21 + d, h).toISOString();
const item = (dueAt: string, reps = 1): Item => ({ dueAt, card: { reps } } as unknown as Item);

describe('nextReviewDay', () => {
  it('finds the earliest later day and counts the items due that day', () => {
    expect(nextReviewDay([item(at(3)), item(at(1, 8)), item(at(1, 23)), item(at(5))], NOW)).toEqual({ day: '2026-11-22', count: 2 });
  });
  it('ignores items due today or earlier, never-seen items and broken dates', () => {
    expect(nextReviewDay([item(at(0, 23)), item(at(-2)), item(at(2), 0), item('not a date')], NOW)).toBeNull();
  });
  it('returns null when nothing is scheduled later', () => {
    expect(nextReviewDay([], NOW)).toBeNull();
  });
});

describe('nextLine', () => {
  it('says "tomorrow" for the next day, and the date plus a day count later on', () => {
    expect(nextLine({ day: '2026-11-22', count: 1 }, '2026-11-21')).toBe('Next: 1 review tomorrow.');
    expect(nextLine({ day: '2026-11-25', count: 3 }, '2026-11-21')).toMatch(/^Next: 3 reviews on .+ \(in 4 days\)\.$/);
    expect(nextLine(null, '2026-11-21')).toBeNull();
  });
});
