/**
 * Scheduler interface (ADR-002 §3) and its FSRS implementation via ts-fsrs.
 * Screens and storage depend only on `Scheduler`, so SM-2 could be swapped in.
 */
import { DefaultScheduler, Rating } from 'ts-fsrs';
import type { CardState, Grade } from './types';

export interface Scheduler {
  readonly name: string;
  /** State for an item that has never been reviewed, due immediately. */
  newState(now: Date): CardState;
  /** Next state after a review with the given grade. Never mutates the input. */
  review(state: CardState, grade: Grade, now: Date): CardState;
  /** Estimated probability of recall at `at` (0..1). Never-reviewed items return 0. */
  retrievability(state: CardState, at: Date): number;
}

export const GRADE_TO_RATING = { again: Rating.Again, good: Rating.Good, easy: Rating.Easy } as const;

/**
 * Structural view of the ts-fsrs v6 scheduler as configured here (FSRS-6). The library's
 * generic types default to FSRS-7 card fields, so we pin the shape we actually use.
 */
interface FsrsCard {
  stability: number;
  difficulty: number;
  state: number;
  scheduleStatus: string;
  dueAt: Date;
  lastReviewAt: Date | null;
  cardId: string | number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
}
interface FsrsScheduler {
  newCard(o: { now: Date }): FsrsCard;
  review(o: { card: FsrsCard; grade: number; now: Date }): { card: FsrsCard };
  model: { forgettingCurve(card: FsrsCard, elapsedDays: number): number };
}

export function serializeCard(card: FsrsCard): CardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    state: card.state,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
    dueAt: new Date(card.dueAt).toISOString(),
    lastReviewAt: card.lastReviewAt ? new Date(card.lastReviewAt).toISOString() : null,
  };
}

export function deserializeCard(s: CardState, template: FsrsCard): FsrsCard {
  return {
    ...template,
    stability: s.stability,
    difficulty: s.difficulty,
    state: s.state,
    scheduleStatus: (['new', 'learning', 'review', 'relearning'] as const)[s.state] ?? 'new',
    reps: s.reps,
    lapses: s.lapses,
    scheduledDays: s.scheduledDays,
    learningStep: s.learningStep,
    dueAt: new Date(s.dueAt),
    lastReviewAt: s.lastReviewAt ? new Date(s.lastReviewAt) : null,
  };
}

const DAY_MS = 86_400_000;

class FsrsAdapter implements Scheduler {
  readonly name = 'FSRS-6 (ts-fsrs)';
  constructor(private readonly s: FsrsScheduler) {}

  newState(now: Date): CardState {
    return serializeCard(this.s.newCard({ now }));
  }

  review(state: CardState, grade: Grade, now: Date): CardState {
    const card = deserializeCard(state, this.s.newCard({ now }));
    return serializeCard(this.s.review({ card, grade: GRADE_TO_RATING[grade], now }).card);
  }

  retrievability(state: CardState, at: Date): number {
    if (state.reps === 0 || !state.lastReviewAt || state.stability <= 0) return 0;
    const elapsedDays = Math.max(0, (at.getTime() - Date.parse(state.lastReviewAt)) / DAY_MS);
    const r = this.s.model.forgettingCurve(deserializeCard(state, this.s.newCard({ now: at })), elapsedDays);
    return Number.isFinite(r) ? Math.min(1, Math.max(0, r)) : 0;
  }
}

/**
 * FSRS-6 with whole-day intervals: short-term learning steps are off (this is a
 * once-a-day app) and fuzz is off (deterministic tests and predictable plans).
 */
export async function createFsrsScheduler(): Promise<Scheduler> {
  const s = await DefaultScheduler({
    version: 'FSRS-6',
    desiredRetention: 0.9,
    enableShortTerm: false,
    enableFuzz: false,
    maximumInterval: 36_500,
  });
  return new FsrsAdapter(s as unknown as FsrsScheduler);
}

let shared: Promise<Scheduler> | null = null;
/** App-wide scheduler instance (created once, async). */
export function getScheduler(): Promise<Scheduler> {
  shared ??= createFsrsScheduler();
  return shared;
}
