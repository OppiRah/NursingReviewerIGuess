/**
 * Estimated readiness (AUDIT-001 A-06): averaged over EVERY item in the deck.
 * - Never-reviewed item: 0.
 * - Item whose most recent answer was wrong (lastGrade 'again'): 0, even though FSRS would still give it
 *   a fairly high recall right after the student saw the answer. It counts again once answered correctly.
 * - Item whose most recent answer was right: its FSRS retrievability at the exam date (or now, if no
 *   future exam date).
 * Limits: FSRS uses default parameters never fitted to these students, and recall of one item is not
 * exam performance. Shown as a rough study estimate, never as a prediction or a promise.
 */
import { localDateStr, parseLocalDate } from './dates';
import type { Scheduler } from './scheduler';
import type { Deck, Item } from './types';

export function readinessTarget(deck: Deck, now: Date): Date {
  if (deck.examDate && deck.examDate >= localDateStr(now)) {
    const exam = parseLocalDate(deck.examDate);
    return exam.getTime() > now.getTime() ? exam : now;
  }
  return now;
}

/** 0..1, or null for an empty deck. */
export function deckReadiness(deck: Deck, items: Item[], scheduler: Scheduler, now: Date): number | null {
  const own = items.filter((i) => i.deckId === deck.id);
  if (own.length === 0) return null;
  const at = readinessTarget(deck, now);
  const sum = own.reduce((acc, it) => acc + itemReadiness(it, scheduler, at), 0);
  return sum / own.length;
}

/** One item's contribution (0..1); see the rules at the top of this file. */
export function itemReadiness(it: Item, scheduler: Scheduler, at: Date): number {
  if (it.card.reps === 0 || it.lastGrade === 'again') return 0;
  return scheduler.retrievability(it.card, at);
}

/** How many of a deck's items were ever reviewed (shown next to readiness, AUDIT-001 A-06). */
export function seenCount(items: Item[], deckId: string): { seen: number; total: number } {
  let seen = 0;
  let total = 0;
  for (const it of items) {
    if (it.deckId !== deckId) continue;
    total++;
    if (it.card.reps > 0) seen++;
  }
  return { seen, total };
}

export function formatPercent(r: number | null): string {
  return r === null ? '–' : `${Math.round(r * 100)}%`;
}
