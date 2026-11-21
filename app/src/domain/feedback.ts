/**
 * "Copy feedback info" (BETA-PREP): a short text block a student pastes to the owner with a screenshot.
 * It contains numbers and device facts only. It NEVER contains question text, choices, rationales,
 * deck titles or any other study content (tests/unit/feedback.test.ts proves it).
 */
import type { ReviewerDB } from '../data/db';

export interface FeedbackCounts {
  decks: number;
  items: number;
  reviews: number;
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
    `Storage protected: ${yn(i.persisted)}`,
    `Last error: ${sanitizeError(i.lastError, i.contentWords)}`,
  ].join('\n');
}
