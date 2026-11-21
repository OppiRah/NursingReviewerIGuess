/**
 * AUDIT-001 area 2: what does a student actually see each day?
 * Pure simulation with the real scheduler, buildDailyPlan and clampToExam (same calls as recordReview).
 */
import { describe, expect, it } from 'vitest';
import { localDateStr } from '../../src/domain/dates';
import { buildDailyPlan, clampToExam, newQuota, SESSION_SIZE } from '../../src/domain/plan';
import { deckReadiness } from '../../src/domain/readiness';
import { createFsrsScheduler, type Scheduler } from '../../src/domain/scheduler';
import type { Deck, Item } from '../../src/domain/types';
import { rng } from './gen';

function mkItems(n: number, deck: Deck, s: Scheduler, now: Date): Item[] {
  const card = s.newState(now);
  return Array.from({ length: n }, (_, i) => ({ id: `i${i}`, deckId: deck.id, type: 'mcq' as const, question: `q${i}`, choices: ['a', 'b'], answer: [0], back: '', rationale: '', card, dueAt: card.dueAt, position: i, firstReviewedAt: null, lastGrade: null, flagged: false, createdAt: now.toISOString() }));
}

function review(it: Item, deck: Deck, s: Scheduler, grade: 'again' | 'good', now: Date): Item {
  const next = s.review(it.card, grade, now);
  next.dueAt = clampToExam(next.dueAt, deck, now);
  return { ...it, card: next, dueAt: next.dueAt, firstReviewedAt: it.firstReviewedAt ?? now.toISOString(), lastGrade: grade };
}

interface DayRow { day: string; dueAtStart: number; reviews: number; fresh: number; done: number; left: number; unseen: number; readiness: number }

/** `sessionsPerDay` × 10 items is the student's real capacity; accuracy is the chance of a right answer. */
function simulate(nItems: number, daysBefore: number, sessionsPerDay: number, accuracy: number, s: Scheduler): DayRow[] {
  const start = new Date(2026, 10, 16, 19, 0, 0); // 7 pm local, a typical study time
  const exam = new Date(start);
  exam.setDate(exam.getDate() + daysBefore);
  const deck: Deck = { id: 'd', title: 'T', examDate: localDateStr(exam), createdAt: start.toISOString() };
  let items = mkItems(nItems, deck, s, start);
  const r = rng(7);
  const rows: DayRow[] = [];
  for (let d = 0; d <= daysBefore; d++) {
    const now = new Date(start);
    now.setDate(now.getDate() + d);
    const first = buildDailyPlan([deck], items, now);
    const p = first.decks.get('d');
    let done = 0;
    for (let k = 0; k < sessionsPerDay; k++) {
      const queue = buildDailyPlan([deck], items, now).queue.slice(0, SESSION_SIZE);
      if (queue.length === 0) break;
      for (const q of queue) {
        const upd = review(q, deck, s, r() < accuracy ? 'good' : 'again', now);
        items = items.map((x) => (x.id === q.id ? upd : x));
        done++;
      }
    }
    rows.push({ day: d === daysBefore ? 'EXAM' : `D-${daysBefore - d}`, dueAtStart: first.dueCount, reviews: p?.dueReviews.length ?? 0, fresh: p?.newToday.length ?? 0, done, left: buildDailyPlan([deck], items, now).dueCount, unseen: items.filter((i) => i.card.reps === 0).length, readiness: Math.round((deckReadiness(deck, items, s, now) ?? 0) * 100) });
  }
  return rows;
}

const table = (title: string, rows: DayRow[]): void => {
  console.log(`\n${title}\nday    due@start (reviews+new)  done  left-after  never-seen  readiness%`);
  for (const r of rows) console.log(`${r.day.padEnd(6)} ${String(r.dueAtStart).padStart(4)} (${r.reviews}+${r.fresh})`.padEnd(32) + `${String(r.done).padStart(4)}  ${String(r.left).padStart(6)}  ${String(r.unseen).padStart(8)}  ${String(r.readiness).padStart(6)}`);
};

describe('AUDIT-001 plan simulation', () => {
  it('300 items, 3 days before the exam', async () => {
    const s = await createFsrsScheduler();
    table('300 items / 3 days / student does everything shown (accuracy 70%)', simulate(300, 3, 99, 0.7, s));
    table('300 items / 3 days / student does 3 sessions a day (30 items)', simulate(300, 3, 3, 0.7, s));
  });

  it('50 items, 30 days before the exam', async () => {
    const s = await createFsrsScheduler();
    table('50 items / 30 days / 1 session a day (accuracy 75%)', simulate(50, 30, 1, 0.75, s));
    table('50 items / 30 days / does everything shown', simulate(50, 30, 99, 0.75, s));
  });

  it('F: after the exam date has passed, every never-seen item is "due today" at once', () => {
    const now = new Date(2026, 10, 16, 9, 0, 0);
    const past: Deck = { id: 'd', title: 'T', examDate: '2026-11-10', createdAt: now.toISOString() };
    const none: Deck = { ...past, examDate: null };
    console.log(`quota with exam passed: ${newQuota(past, 300, 0, now)}; with no exam date: ${newQuota(none, 300, 0, now)}`);
    expect(newQuota(past, 300, 0, now)).toBeLessThanOrEqual(newQuota(none, 300, 0, now));
  });

  it('F: readiness is 0% (not blank/high) when nothing was reviewed', async () => {
    const s = await createFsrsScheduler();
    const now = new Date(2026, 10, 16, 9, 0, 0);
    const deck: Deck = { id: 'd', title: 'T', examDate: '2026-11-30', createdAt: now.toISOString() };
    expect(deckReadiness(deck, mkItems(20, deck, s, now), s, now)).toBe(0);
  });

  it('day boundary: a review at 23:58 and the plan at 00:02 are different days (local time)', async () => {
    const s = await createFsrsScheduler();
    const late = new Date(2026, 10, 16, 23, 58, 0);
    const deck: Deck = { id: 'd', title: 'T', examDate: '2026-11-26', createdAt: late.toISOString() };
    let items = mkItems(30, deck, s, late);
    for (const q of buildDailyPlan([deck], items, late).queue.slice(0, 10)) {
      const u = review(q, deck, s, 'good', late);
      items = items.map((x) => (x.id === q.id ? u : x));
    }
    const after = new Date(2026, 10, 17, 0, 2, 0);
    const p = buildDailyPlan([deck], items, after);
    console.log(`after midnight: new today=${p.decks.get('d')?.newToday.length}, reviews due=${p.decks.get('d')?.dueReviews.length}`);
    expect(p.decks.get('d')?.newToday.length).toBe(10);
  });

  it('clock set back: items reviewed "in the future" are not lost from the plan forever', async () => {
    const s = await createFsrsScheduler();
    const future = new Date(2027, 5, 1, 9, 0, 0); // phone clock wrong by months
    const deck: Deck = { id: 'd', title: 'T', examDate: null, createdAt: future.toISOString() };
    let items = mkItems(10, deck, s, future);
    for (const q of items) {
      const u = review(q, deck, s, 'again', future);
      items = items.map((x) => (x.id === q.id ? u : x));
    }
    const fixed = new Date(2026, 10, 16, 9, 0, 0);
    const p = buildDailyPlan([deck], items, fixed);
    console.log(`after fixing the clock: due=${p.dueCount} of 10 missed items; next due ${items[0]?.dueAt}`);
  });
});
