/**
 * Schema migrations shared by the live database (Dexie upgrade) and old backup files,
 * so both paths produce identical data. Pure functions, linear in the data size.
 */
import type { Grade, Review } from './types';

const GRADES: readonly string[] = ['again', 'good', 'easy'];

/** Latest review per item, in one pass over the log (latest = greatest `at`, then greatest id). */
export function latestReviewByItem(reviews: Review[]): Map<string, Review> {
  const map = new Map<string, Review>();
  for (const r of reviews) {
    const prev = map.get(r.itemId);
    if (!prev || r.at > prev.at || (r.at === prev.at && (r.id ?? 0) > (prev.id ?? 0))) map.set(r.itemId, r);
  }
  return map;
}

/** v1 → v2: add `flagged` (false) and `lastGrade` (from the item's latest review, if any). Invalid existing values are replaced, never kept. */
export function deriveV2Fields(item: Record<string, unknown>, latest: Map<string, Review>): { lastGrade: Grade | null; flagged: boolean } {
  const existing = item.lastGrade;
  const fromLog = typeof item.id === 'string' ? (latest.get(item.id)?.grade ?? null) : null;
  return {
    lastGrade: typeof existing === 'string' && GRADES.includes(existing) ? (existing as Grade) : fromLog,
    flagged: typeof item.flagged === 'boolean' ? item.flagged : false,
  };
}
