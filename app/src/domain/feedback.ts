/**
 * "Copy feedback info" (BETA-PREP): a short text block a student pastes to the owner with a screenshot.
 * It contains numbers and device facts only. It NEVER contains question text, choices, rationales,
 * deck titles or any other study content (tests/unit/feedback.test.ts proves it).
 */
import type { ReviewerDB } from '../data/db';
import { daysBetween, localDateStr } from './dates';

export interface FeedbackCounts {
  decks: number;
  items: number;
  reviews: number;
}

/** Distinct local calendar days with at least one recorded review, in rolling windows that include today. */
export interface StudyDays {
  last7: number;
  last14: number;
}

export interface FeedbackInput {
  version: string;
  buildDate: string;
  userAgent: string;
  /** Opened from the home-screen icon (installed) rather than a browser tab. */
  standalone: boolean;
  counts: FeedbackCounts;
  lastError: string | null;
  /** navigator.storage.persisted(): true, false, or null when the browser can't say. */
  persisted: boolean | null;
  /** Words from the student's content (collectContentWords); any of them in the error text is removed. */
  contentWords?: ReadonlySet<string>;
  /** Study-day counts (collectStudyDays); "unknown" when not provided. */
  studyDays?: StudyDays;
}

/**
 * Every word (3+ letters) that appears in the student's decks and items, lower-cased. Used only to
 * remove such words from an error message before it is shown; the words themselves are never output.
 */
export async function collectContentWords(db: ReviewerDB): Promise<Set<string>> {
  const words = new Set<string>();
  const add = (s: string): void => {
    for (const w of s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []) words.add(w);
  };
  await db.decks.each((d) => add(d.title));
  await db.items.each((it) => {
    add(it.question);
    add(it.back);
    add(it.rationale);
    it.choices.forEach(add);
  });
  return words;
}

export async function collectFeedbackCounts(db: ReviewerDB): Promise<FeedbackCounts> {
  const [decks, items, reviews] = await Promise.all([db.decks.count(), db.items.count(), db.reviews.count()]);
  return { decks, items, reviews };
}

/**
 * Counts study days from review timestamps (`Review.at`, an ISO instant written by `recordReview`).
 * Each timestamp is turned into the device's local calendar date, like the rest of the app does.
 * A day counts once however many reviews it has. Windows are rolling and include today: "last 7"
 * is today and the 6 days before it, "last 14" is today and the 13 before (so last7 ≤ last14).
 * Missing, non-string or unparsable timestamps are skipped; future dates (clock trouble) are not counted.
 */
export function countStudyDays(reviewTimes: Iterable<unknown>, now: Date): StudyDays {
  const today = localDateStr(now);
  const days14 = new Set<string>();
  const days7 = new Set<string>();
  for (const at of reviewTimes) {
    if (typeof at !== 'string') continue;
    const t = new Date(at);
    if (Number.isNaN(t.getTime())) continue;
    const day = localDateStr(t);
    const ago = daysBetween(day, today);
    if (ago < 0 || ago > 13) continue;
    days14.add(day);
    if (ago <= 6) days7.add(day);
  }
  return { last7: days7.size, last14: days14.size };
}

/** Reads only the review timestamps (the `at` index keys) from local IndexedDB; no content, no network. */
export async function collectStudyDays(db: ReviewerDB, now: Date): Promise<StudyDays> {
  return countStudyDays(await db.reviews.orderBy('at').keys(), now);
}

/**
 * Keep the shape of an error, drop anything that could be content: quoted text is removed, any word
 * that also appears in the student's decks is removed, and the length is capped.
 */
export function sanitizeError(message: string | null, contentWords?: ReadonlySet<string>): string {
  if (!message) return 'none';
  const cleaned = message
    .replace(/"[^"]*"|“[^”]*”|'[^']{3,}'|`[^`]*`/g, '"…"')
    .replace(/[\p{L}\p{N}]{3,}/gu, (w) => (contentWords?.has(w.toLowerCase()) ? '…' : w))
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 120)}…` : cleaned;
}

export function buildFeedbackInfo(i: FeedbackInput): string {
  const yn = (v: boolean | null): string => (v === null ? 'unknown' : v ? 'yes' : 'no');
  return [
    'Nursing Reviewer feedback info',
    `Version: ${i.version} (built ${i.buildDate})`,
    `Browser: ${i.userAgent.slice(0, 160)}`,
    `Installed: ${yn(i.standalone)}`,
    `Decks: ${i.counts.decks} · Items: ${i.counts.items} · Reviews: ${i.counts.reviews}`,
    `Study days (last 7 days): ${i.studyDays?.last7 ?? 'unknown'} · Study days (last 14 days): ${i.studyDays?.last14 ?? 'unknown'}`,
    `Storage protected: ${yn(i.persisted)}`,
    `Last error: ${sanitizeError(i.lastError, i.contentWords)}`,
  ].join('\n');
}
