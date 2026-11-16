/** Shared domain types. Pure data: no Dexie, no React. */

export type ItemType = 'mcq' | 'sata' | 'priority' | 'flashcard';

/** App-level rating. Mapped onto the scheduler's grades in scheduler.ts. */
export type Grade = 'again' | 'good' | 'easy';

/** Serialized scheduler state stored on each item (JSON-safe; dates are ISO strings). */
export interface CardState {
  stability: number;
  difficulty: number;
  state: number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
  dueAt: string;
  lastReviewAt: string | null;
}

export interface Deck {
  id: string;
  title: string;
  /** Local calendar date, YYYY-MM-DD, or null when not set. */
  examDate: string | null;
  createdAt: string;
}

export interface Item {
  id: string;
  deckId: string;
  type: ItemType;
  question: string;
  /** Choice texts in order (a, b, c…). Empty for flashcards. */
  choices: string[];
  /** Zero-based indexes of correct choices. Empty for flashcards. */
  answer: number[];
  /** Flashcard answer text ("A:" line). Empty for choice items. */
  back: string;
  rationale: string;
  card: CardState;
  /** Denormalized copy of card.dueAt so Dexie can index it. */
  dueAt: string;
  /** Order within the imported deck (0-based); new items are introduced in this order. */
  position: number;
  /** ISO timestamp of the first review, or null. Used for the daily new-item quota. */
  firstReviewedAt: string | null;
  /** Last app grade, or null if never reviewed. Used by "Review my mistakes". (schema v2) */
  lastGrade: Grade | null;
  /** "Report wrong" flag: the student wants to check this item against their source. (schema v2) */
  flagged: boolean;
  createdAt: string;
}

export interface Review {
  id?: number;
  itemId: string;
  deckId: string;
  /** ISO timestamp. */
  at: string;
  grade: Grade;
  correct: boolean;
}

export interface Setting {
  key: string;
  value: unknown;
}
