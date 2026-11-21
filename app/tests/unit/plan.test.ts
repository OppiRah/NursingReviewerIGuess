import { describe, expect, it } from 'vitest';
import { buildDailyPlan, clampToExam, MIN_NEW_PER_DAY, newQuota } from '../../src/domain/plan';
import type { CardState, Deck, Item } from '../../src/domain/types';

const NOW = new Date(2026, 10, 14, 9, 0, 0); // local 2026-11-14 09:00
const deck = (examDate: string | null, id = 'd1'): Deck => ({ id, title: 'T', examDate, createdAt: NOW.toISOString() });
const card = (reps: number, dueAt: Date): CardState => ({
  stability: reps ? 3 : 0, difficulty: reps ? 5 : 0, state: reps ? 2 : 0, reps, lapses: 0, scheduledDays: 0, learningStep: 0,
  dueAt: dueAt.toISOString(), lastReviewAt: reps ? NOW.toISOString() : null,
});
const item = (i: number, reps = 0, dueAt = NOW, deckId = 'd1'): Item => ({
  id: `i${i}`, deckId, type: 'mcq', question: `Q${i}`, choices: ['a', 'b'], answer: [0], back: '', rationale: '',
  card: card(reps, dueAt), dueAt: dueAt.toISOString(), position: i, firstReviewedAt: null, lastGrade: null, flagged: false, createdAt: NOW.toISOString(),
});

describe('newQuota (backward from exam date)', () => {
  it('spreads unseen items across the days left, with a floor', () => {
    expect(newQuota(deck('2026-11-24'), 300, 0, NOW)).toBe(30); // 10 days → 30/day
    expect(newQuota(deck('2026-11-24'), 20, 0, NOW)).toBe(MIN_NEW_PER_DAY);
    expect(newQuota(deck('2026-11-15'), 300, 0, NOW)).toBe(300); // exam tomorrow → all of it
    expect(newQuota(deck('2026-11-01'), 50, 0, NOW)).toBe(MIN_NEW_PER_DAY); // exam passed → planned like "no date" (AUDIT-001 A-04; was: all of it)
    expect(newQuota(deck('2026-11-14'), 50, 0, NOW)).toBe(50); // exam today → all of it
  });

  it('subtracts items already introduced today', () => {
    expect(newQuota(deck('2026-11-24'), 290, 10, NOW)).toBe(20);
    expect(newQuota(deck('2026-11-24'), 0, 30, NOW)).toBe(0);
  });
});

describe('buildDailyPlan', () => {
  it('counts due reviews (until end of today) plus the new-item quota; reviews first', () => {
    const tonight = new Date(2026, 10, 14, 22, 0, 0);
    const tomorrow = new Date(2026, 10, 15, 9, 0, 0);
    const items = [item(0), item(1), item(2, 1, tonight), item(3, 1, tomorrow)];
    const plan = buildDailyPlan([deck('2026-12-01')], items, NOW);
    expect(plan.dueCount).toBe(3);
    expect(plan.queue.map((i) => i.id)).toEqual(['i2', 'i0', 'i1']);
  });

  it('introduces new items in import order', () => {
    const items = [item(2), item(0), item(1)];
    expect(buildDailyPlan([deck(null)], items, NOW).queue.map((i) => i.id)).toEqual(['i0', 'i1', 'i2']);
  });
});

describe('clampToExam', () => {
  it('pulls a due date past the exam back to the day before the exam', () => {
    const due = new Date(2026, 11, 20).toISOString();
    expect(clampToExam(due, deck('2026-12-01'), NOW)).toBe(new Date(2026, 10, 30).toISOString());
  });
  it('leaves earlier due dates and decks without exams alone', () => {
    const due = new Date(2026, 10, 20).toISOString();
    expect(clampToExam(due, deck('2026-12-01'), NOW)).toBe(due);
    expect(clampToExam(due, deck(null), NOW)).toBe(due);
  });
  it('does not clamp when the exam is tomorrow or past', () => {
    const due = new Date(2026, 10, 20).toISOString();
    expect(clampToExam(due, deck('2026-11-15'), NOW)).toBe(due);
  });
});
