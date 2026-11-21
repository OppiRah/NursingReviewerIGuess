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
  /** Items to study today: weakest reviews first, with new items mixed into every session (mixQueue). */
  queue: Item[];
  dueCount: number;
}

export function daysToExam(deck: Deck, now: Date): number | null {
  if (!deck.examDate) return null;
  return daysBetween(localDateStr(now), deck.examDate);
}

/** Days over which unseen items are spread (today counts as one). Exam today or tomorrow → 1. */
function spreadDays(deck: Deck, now: Date): number {
  const left = daysToExam(deck, now);
  // A passed exam date plans like "no date" (AUDIT-001 A-04): never the whole deck in one day.
  return left === null || left < 0 ? DEFAULT_SPREAD_DAYS : Math.max(1, left);
}

export function newQuota(deck: Deck, unseen: number, introducedToday: number, now: Date): number {
  const target = Math.max(MIN_NEW_PER_DAY, Math.ceil((unseen + introducedToday) / spreadDays(deck, now)));
  return Math.max(0, target - introducedToday);
}

const introducedOn = (it: Item, today: string): boolean => !!it.firstReviewedAt && localDateStr(new Date(it.firstReviewedAt)) === today;

/**
 * What the plan asks of the student for one deck until its exam (AUDIT-001 A-05). Pure arithmetic from
 * the plan itself; no assumption about how many sessions a student actually does.
 * - `newPerDay`: new items a day the plan introduces so every unseen item is seen before the exam.
 * - `heavy`: that is more than the plan's baseline of MIN_NEW_PER_DAY (one session of new items a day).
 * - `lastDay`: the exam is today or tomorrow, so every unseen item is planned for today.
 */
export type OutlookStatus = 'all-seen' | 'no-date' | 'passed' | 'last-day' | 'heavy' | 'fits';
export interface DeckOutlook {
  status: OutlookStatus;
  unseen: number;
  total: number;
  newPerDay: number;
}

export function deckOutlook(deck: Deck, items: Item[], now: Date): DeckOutlook {
  const today = localDateStr(now);
  let unseen = 0;
  let total = 0;
  let introducedToday = 0;
  for (const it of items) {
    if (it.deckId !== deck.id) continue;
    total++;
    if (it.card.reps === 0) unseen++;
    if (introducedOn(it, today)) introducedToday++;
  }
  const newPerDay = unseen === 0 ? 0 : Math.ceil((unseen + introducedToday) / spreadDays(deck, now));
  const left = daysToExam(deck, now);
  const status: OutlookStatus =
    unseen === 0 ? 'all-seen' : left === null ? 'no-date' : left < 0 ? 'passed' : left <= 1 ? 'last-day' : newPerDay > MIN_NEW_PER_DAY ? 'heavy' : 'fits';
  return { status, unseen, total, newPerDay };
}

/**
 * Mix new items into the review queue so neither starves (AUDIT-001 A-05): new items get their
 * proportional share of each session, and while both remain every session of `size` holds at least one
 * review and at least one new item. Within a session, reviews come first. Deterministic.
 */
export function mixQueue(reviews: Item[], fresh: Item[], size = SESSION_SIZE): Item[] {
  const total = reviews.length + fresh.length;
  if (reviews.length === 0 || fresh.length === 0 || size < 2) return [...reviews, ...fresh];
  const out: Item[] = [];
  let r = 0;
  let n = 0;
  while (out.length < total) {
    const end = Math.min(out.length + size, total);
    const block = end - out.length;
    let takeR = Math.min(block, reviews.length - r, Math.max(0, Math.round((end * reviews.length) / total) - r));
    if (r < reviews.length && takeR === 0) takeR = 1;
    if (n < fresh.length && takeR >= block) takeR = block - 1;
    const takeN = Math.min(fresh.length - n, block - takeR);
    takeR = Math.min(reviews.length - r, block - takeN); // new items ran out: fill with reviews
    out.push(...reviews.slice(r, r + takeR), ...fresh.slice(n, n + takeN));
    r += takeR;
    n += takeN;
  }
  return out;
}

/** Estimated recall now (0..1), from the Scheduler (FSRS retrievability). */
export type RecallFn = (card: Item['card'], at: Date) => number;

/**
 * @param recall Scheduler.retrievability. When given, due reviews are ordered lowest estimated recall
 *   first (AUDIT-001 A-05). Without it (old callers, tests), the previous order is used.
 */
export function buildDailyPlan(decks: Deck[], items: Item[], now: Date, recall?: RecallFn): DailyPlan {
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
      if (introducedOn(it, today)) introducedToday++;
    }
    unseen.sort((a, b) => a.position - b.position);
    const quota = newQuota(deck, unseen.length, introducedToday, now);
    plans.set(deck.id, { deckId: deck.id, dueReviews, newToday: unseen.slice(0, quota) });
  }

  // Weakest first, so a student who can't finish still gets the items that need it most (AUDIT-001 A-05):
  // lowest estimated recall right now; ties by earlier due time, then item id (stable across renders).
  const all = [...plans.values()].flatMap((p) => p.dueReviews);
  const tie = (a: Item, b: Item): number => Date.parse(a.dueAt) - Date.parse(b.dueAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  let reviews: Item[];
  if (recall) {
    const r = new Map(all.map((it) => [it.id, recall(it.card, now)]));
    reviews = all.sort((a, b) => (r.get(a.id) ?? 0) - (r.get(b.id) ?? 0) || tie(a, b));
  } else {
    const dueDay = (it: Item): string => localDateStr(new Date(it.dueAt));
    reviews = all.sort((a, b) => dueDay(a).localeCompare(dueDay(b)) || a.card.stability - b.card.stability || tie(a, b));
  }
  const fresh = [...plans.values()].flatMap((p) => p.newToday);
  const queue = mixQueue(reviews, fresh);
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
