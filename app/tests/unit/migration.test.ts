import { describe, expect, it } from 'vitest';
import { ReviewerDB } from '../../src/data/db';
import { loadMistakes } from '../../src/data/repo';
import { sha256Hex, validateBackupText } from '../../src/domain/backup';
import { deriveV2Fields, latestReviewByItem } from '../../src/domain/migrations';
import type { Review } from '../../src/domain/types';

const T = '2026-11-14T10:00:00.000Z';
const card = { stability: 0, difficulty: 0, state: 0, reps: 0, lapses: 0, scheduledDays: 0, learningStep: 0, dueAt: T, lastReviewAt: null };
/** A v1 item: no lastGrade, no flagged. */
const v1Item = (id: string) => ({
  id, deckId: 'd1', type: 'mcq', question: `Sample ${id}?`, choices: ['x', 'y'], answer: [0], back: '', rationale: 'r',
  card, dueAt: T, position: 0, firstReviewedAt: null, createdAt: T,
});
const v1Deck = { id: 'd1', title: 'Synthetic v1 deck', examDate: null, createdAt: T };
const v1Reviews: Review[] = [
  { id: 1, itemId: 'a', deckId: 'd1', at: '2026-11-10T10:00:00.000Z', grade: 'good', correct: true },
  { id: 2, itemId: 'a', deckId: 'd1', at: '2026-11-12T10:00:00.000Z', grade: 'again', correct: false },
  { id: 3, itemId: 'b', deckId: 'd1', at: '2026-11-11T10:00:00.000Z', grade: 'again', correct: false },
  { id: 4, itemId: 'b', deckId: 'd1', at: '2026-11-13T10:00:00.000Z', grade: 'good', correct: true },
];

describe('schema migration v1 → v2', () => {
  it('upgrades a live v1 database: flagged=false, lastGrade from the latest review', async () => {
    const name = 'test-migration-db';
    const old = new ReviewerDB(name, 1);
    await old.open();
    expect(old.verno).toBe(1);
    await old.table('decks').add(v1Deck);
    await old.table('items').bulkAdd([v1Item('a'), v1Item('b'), v1Item('c')]);
    await old.table('reviews').bulkAdd(v1Reviews);
    old.close();

    const db = new ReviewerDB(name);
    await db.open();
    expect(db.verno).toBe(2);
    const items = await db.items.orderBy('id').toArray();
    expect(items.map((i) => [i.id, i.lastGrade, i.flagged])).toEqual([
      ['a', 'again', false],
      ['b', 'good', false],
      ['c', null, false],
    ]);
    // New v2 index works.
    expect((await loadMistakes(db)).map((i) => i.id)).toEqual(['a']);
    // Nothing else changed.
    expect(await db.reviews.count()).toBe(4);
    expect(items[0]?.question).toBe('Sample a?');
    db.close();
    await db.delete();
  });

  it('migrates a v1 backup file on restore validation the same way', async () => {
    const data = { decks: [v1Deck], items: [v1Item('a'), v1Item('b'), v1Item('c')], reviews: v1Reviews, settings: [] };
    const file = { app: 'nursing-reviewer', schemaVersion: 1, exportedAt: T, checksum: await sha256Hex(JSON.stringify(data)), data };
    const v = await validateBackupText(JSON.stringify(file));
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.backup.schemaVersion).toBe(2);
    expect(v.backup.data.items.map((i) => [i.id, i.lastGrade, i.flagged])).toEqual([
      ['a', 'again', false],
      ['b', 'good', false],
      ['c', null, false],
    ]);
  });

  it('an invalid lastGrade in a v1 backup is replaced from the review log, never kept (M2 review #2)', async () => {
    const bogus = { ...v1Item('a'), lastGrade: 'bogus' };
    const data = { decks: [v1Deck], items: [bogus, v1Item('c')], reviews: v1Reviews.filter((r) => r.itemId === 'a'), settings: [] };
    const file = { app: 'nursing-reviewer', schemaVersion: 1, exportedAt: T, checksum: await sha256Hex(JSON.stringify(data)), data };
    const v = await validateBackupText(JSON.stringify(file));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.backup.data.items.map((i) => i.lastGrade)).toEqual(['again', null]);
  });

  it('migration is linear: 5,000 items × 50,000 reviews upgrade quickly', () => {
    const reviews: Review[] = Array.from({ length: 50_000 }, (_, i) => ({ id: i + 1, itemId: `i${i % 5000}`, deckId: 'd1', at: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(), grade: i % 2 ? 'good' : 'again', correct: i % 2 === 1 }));
    const latest = latestReviewByItem(reviews);
    const t = performance.now();
    const out = Array.from({ length: 5000 }, (_, i) => deriveV2Fields({ id: `i${i}` }, latest));
    expect(performance.now() - t).toBeLessThan(200);
    expect(out[0]?.lastGrade).toBe('again'); // review #45001 (index 45000, even) is i0's latest
  });

  it('a v2 backup missing the v2 fields is rejected', async () => {
    const data = { decks: [v1Deck], items: [v1Item('a')], reviews: [], settings: [] };
    const file = { app: 'nursing-reviewer', schemaVersion: 2, exportedAt: T, checksum: await sha256Hex(JSON.stringify(data)), data };
    const v = await validateBackupText(JSON.stringify(file));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/flagged invalid/);
  });
});
