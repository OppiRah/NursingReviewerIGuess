/**
 * Daily plan: which items are due today, planned backward from each deck's exam date.
 * - Reviews: items already seen whose FSRS due time falls on or before the end of today.
 * - New items: spread evenly over the days left before the exam, at least MIN_NEW_PER_DAY.
 * - After a review, the next due date is clamped to the day before the exam (clampToExam).
 */
import { addDays, daysBetween, endOfLocalDay, localDateStr, parseLocalDate } from './dates';
import type { Deck, Item } from './types';

export const SESSION_SIZE = 10;
export const MIN_NEW_PER_DAY = 10;
/** Spread used when a deck has no exam date. */
export const DEFAULT_SPREAD_DAYS = 7;

export interface DeckPlan {
  deckId: string;
  dueReviews: Item[];
  newToday: Item[];
}

export interface DailyPlan {
  decks: Map<string, DeckPlan>;
  /** Items to study today: reviews first (most overdue day, then weakest), then new items. */
  queue: Item[];
  dueCount: number;
}

export function daysToExam(deck: Deck, now: Date): number | null {
  if (!deck.examDate) return null;
  return daysBetween(localDateStr(now), deck.examDate);
}

export function newQuota(deck: Deck, unseen: number, introducedToday: number, now: Date): number {
  const left = daysToExam(deck, now);
  // A passed exam date plans like "no date" (AUDIT-001 A-04): never the whole deck in one day.
  const days = left === null || left < 0 ? DEFAULT_SPREAD_DAYS : Math.max(1, left);
  const target = Math.max(MIN_NEW_PER_DAY, Math.ceil((unseen + introducedToday) / days));
  return Math.max(0, target - introducedToday);
}

export function buildDailyPlan(decks: Deck[], items: Item[], now: Date): DailyPlan {
  const today = localDateStr(now);
  const eod = endOfLocalDay(now).getTime();
  const plans = new Map<string, DeckPlan>();
  const byDeck = new Map<string, Item[]>();
  for (const it of items) {
    const list = byDeck.get(it.deckId);
    if (list) list.push(it);
    else byDeck.set(it.deckId, [it]);
  }

  for (const deck of decks) {
    const list = byDeck.get(deck.id) ?? [];
    const dueReviews: Item[] = [];
    const unseen: Item[] = [];
    let introducedToday = 0;
    for (const it of list) {
      if (it.card.reps === 0) unseen.push(it);
      else if (Date.parse(it.dueAt) <= eod) dueReviews.push(it);
      if (it.firstReviewedAt && localDateStr(new Date(it.firstReviewedAt)) === today) introducedToday++;
    }
    unseen.sort((a, b) => a.position - b.position);
    const quota = newQuota(deck, unseen.length, introducedToday, now);
    plans.set(deck.id, { deckId: deck.id, dueReviews, newToday: unseen.slice(0, quota) });
  }

  // Most overdue day first; within a day the weakest memory (lowest stability) first, so a student
  // who can't finish still gets the items that need it most (AUDIT-001 A-05).
  const dueDay = (it: Item): string => localDateStr(new Date(it.dueAt));
  const reviews = [...plans.values()]
    .flatMap((p) => p.dueReviews)
    .sort((a, b) => dueDay(a).localeCompare(dueDay(b)) || a.card.stability - b.card.stability || Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const fresh = [...plans.values()].flatMap((p) => p.newToday);
  const queue = [...reviews, ...fresh];
  return { decks: plans, queue, dueCount: queue.length };
}

/**
 * Keep every item reviewed at least once more before the exam: if the scheduler
 * would push the next review past the day before the exam, pull it back to that day.
 */
export function clampToExam(dueAtIso: string, deck: Deck | undefined, now: Date): string {
  if (!deck?.examDate) return dueAtIso;
  const lastDay = parseLocalDate(addDays(deck.examDate, -1));
  if (lastDay.getTime() <= endOfLocalDay(now).getTime()) return dueAtIso;
  return Date.parse(dueAtIso) > lastDay.getTime() ? lastDay.toISOString() : dueAtIso;
}
