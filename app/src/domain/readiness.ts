/**
 * Estimated readiness: the mean FSRS retrievability of a deck's items at the deck's
 * exam date (or now, if no future exam date). Never-reviewed items count as 0.
 * Shown to users as an "estimated" percentage, never as a promise.
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
  const sum = own.reduce((acc, it) => acc + scheduler.retrievability(it.card, at), 0);
  return sum / own.length;
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
