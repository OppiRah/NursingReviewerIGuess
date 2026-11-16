import { describe, expect, it } from 'vitest';
import { deckReadiness, formatPercent, readinessTarget } from '../../src/domain/readiness';
import type { Scheduler } from '../../src/domain/scheduler';
import { createFsrsScheduler } from '../../src/domain/scheduler';
import type { CardState, Deck, Item } from '../../src/domain/types';

const NOW = new Date(2026, 10, 14, 9, 0, 0);
const deck = (examDate: string | null): Deck => ({ id: 'd', title: 'T', examDate, createdAt: NOW.toISOString() });
const mk = (id: string, card: CardState): Item => ({
  id, deckId: 'd', type: 'mcq', question: 'Q', choices: ['x', 'y'], answer: [0], back: '', rationale: '',
  card, dueAt: card.dueAt, position: 0, firstReviewedAt: null, lastGrade: null, flagged: false, createdAt: NOW.toISOString(),
});

/** A fake scheduler with a fixed curve, so the arithmetic is checked exactly. */
const fake: Scheduler = {
  name: 'fake',
  newState: () => { throw new Error('unused'); },
  review: () => { throw new Error('unused'); },
  retrievability: (st, at) => (st.reps === 0 ? 0 : Math.max(0, 1 - (at.getTime() - Date.parse(st.lastReviewAt!)) / (st.stability * 86_400_000 * 10))),
};
const reviewed = (stability: number): CardState => ({
  stability, difficulty: 5, state: 2, reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0,
  dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(),
});
const unseen: CardState = { stability: 0, difficulty: 0, state: 0, reps: 0, lapses: 0, scheduledDays: 0, learningStep: 0, dueAt: NOW.toISOString(), lastReviewAt: null };

describe('readiness', () => {
  it('is the mean retrievability at the exam date; unreviewed items count as 0', () => {
    // Exam in 10 days (local midnight 2026-11-24 is 9h short of 10 full days after 09:00 on 11-14).
    const d = deck('2026-11-24');
    const target = readinessTarget(d, NOW);
    expect(target).toEqual(new Date(2026, 10, 24));
    const elapsedDays = (target.getTime() - NOW.getTime()) / 86_400_000;
    const items = [mk('a', reviewed(10)), mk('b', reviewed(5)), mk('c', unseen)];
    const expected = ((1 - elapsedDays / 100) + (1 - elapsedDays / 50) + 0) / 3;
    expect(deckReadiness(d, items, fake, NOW)).toBeCloseTo(expected, 10);
  });

  it('uses now when there is no exam date or it has passed', () => {
    expect(readinessTarget(deck(null), NOW)).toEqual(NOW);
    expect(readinessTarget(deck('2026-11-01'), NOW)).toEqual(NOW);
    expect(readinessTarget(deck('2026-11-14'), NOW)).toEqual(NOW); // exam today, already past midnight
  });

  it('is null for an empty deck and 0 when nothing is reviewed', () => {
    expect(deckReadiness(deck(null), [], fake, NOW)).toBeNull();
    expect(deckReadiness(deck(null), [mk('c', unseen)], fake, NOW)).toBe(0);
  });

  it('with real FSRS, readiness at a later exam is lower than at an earlier one', async () => {
    const s = await createFsrsScheduler();
    const items = [mk('a', s.review(s.newState(NOW), 'good', NOW)), mk('b', s.review(s.newState(NOW), 'again', NOW))];
    const soon = deckReadiness(deck('2026-11-16'), items, s, NOW)!;
    const later = deckReadiness(deck('2026-12-14'), items, s, NOW)!;
    expect(soon).toBeGreaterThan(later);
    expect(soon).toBeLessThanOrEqual(1);
    expect(later).toBeGreaterThan(0);
  });

  it('formats as a whole percent', () => {
    expect(formatPercent(0.734)).toBe('73%');
    expect(formatPercent(null)).toBe('–');
  });
});
