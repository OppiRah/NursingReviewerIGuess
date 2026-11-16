import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReviewerDB } from '../../src/data/db';
import { createDeck, deleteDeck, deleteItem, loadMistakes, recordReview, updateDeck } from '../../src/data/repo';
import { localDateStr, parseLocalDate } from '../../src/domain/dates';
import { parseReviewer } from '../../src/domain/parser';
import { deckReadiness } from '../../src/domain/readiness';
import { createFsrsScheduler, type Scheduler } from '../../src/domain/scheduler';

const NOW = new Date(2026, 10, 14, 9, 0, 0);
const TEXT = Array.from({ length: 3 }, (_, i) => `${i + 1}. Sample ${i + 1}?\na. x\nb. y\nAnswer: a\nRationale: r`).join('\n');
let db: ReviewerDB;
let s: Scheduler;
let n = 0;

beforeEach(async () => {
  db = new ReviewerDB(`test-repo-${n++}`);
  s = await createFsrsScheduler();
});
afterEach(async () => {
  db.close();
  await db.delete();
});

describe('repo', () => {
  it('moving the exam earlier pulls reviewed items back to the day before the new exam (M2 review #4)', async () => {
    const deckId = await createDeck(db, { title: 'T', examDate: '2027-03-01', items: parseReviewer(TEXT).items }, s, NOW);
    const [a, b] = await db.items.where('deckId').equals(deckId).sortBy('position');
    await recordReview(db, a!.id, 'easy', true, s, NOW); // due far in the future
    const before = (await db.items.get(a!.id))!;
    expect(localDateStr(new Date(before.dueAt)) > '2026-11-20').toBe(true);

    await updateDeck(db, deckId, { examDate: '2026-11-20' }, NOW);
    const after = (await db.items.get(a!.id))!;
    expect(after.dueAt).toBe(parseLocalDate('2026-11-19').toISOString());
    expect(after.card.dueAt).toBe(after.dueAt);
    // Unreviewed items are untouched (they're scheduled by the new-item quota).
    expect((await db.items.get(b!.id))!.dueAt).toBe(b!.dueAt);
  });

  it('a title-only update does not touch items', async () => {
    const deckId = await createDeck(db, { title: 'T', examDate: null, items: parseReviewer(TEXT).items }, s, NOW);
    const before = await db.items.toArray();
    await updateDeck(db, deckId, { title: 'Renamed' }, NOW);
    expect((await db.decks.get(deckId))!.title).toBe('Renamed');
    expect(await db.items.toArray()).toEqual(before);
  });

  it('recordReview sets lastGrade; mistakes are items last graded Again', async () => {
    const deckId = await createDeck(db, { title: 'T', examDate: null, items: parseReviewer(TEXT).items }, s, NOW);
    const [a, b] = await db.items.where('deckId').equals(deckId).sortBy('position');
    await recordReview(db, a!.id, 'again', false, s, NOW);
    await recordReview(db, b!.id, 'again', false, s, NOW);
    await recordReview(db, b!.id, 'good', true, s, new Date(NOW.getTime() + 86_400_000));
    expect((await loadMistakes(db)).map((i) => i.id)).toEqual([a!.id]);
  });

  it('delete cascades: item → its reviews; deck → items and reviews', async () => {
    const deckId = await createDeck(db, { title: 'T', examDate: null, items: parseReviewer(TEXT).items }, s, NOW);
    const [a, b] = await db.items.where('deckId').equals(deckId).sortBy('position');
    await recordReview(db, a!.id, 'good', true, s, NOW);
    await recordReview(db, b!.id, 'good', true, s, NOW);
    await deleteItem(db, a!.id);
    expect(await db.reviews.count()).toBe(1);
    await deleteDeck(db, deckId);
    expect([await db.decks.count(), await db.items.count(), await db.reviews.count()]).toEqual([0, 0, 0]);
  });

  it('readiness with the real FSRS adapter: unreviewed items count as 0', async () => {
    const deckId = await createDeck(db, { title: 'T', examDate: '2026-11-24', items: parseReviewer(TEXT).items }, s, NOW);
    const deck = (await db.decks.get(deckId))!;
    expect(deckReadiness(deck, await db.items.toArray(), s, NOW)).toBe(0);
    const [a] = await db.items.where('deckId').equals(deckId).sortBy('position');
    await recordReview(db, a!.id, 'good', true, s, NOW);
    const items = await db.items.toArray();
    const r = deckReadiness(deck, items, s, NOW)!;
    const single = s.retrievability(items.find((i) => i.id === a!.id)!.card, parseLocalDate('2026-11-24'));
    expect(r).toBeCloseTo(single / 3, 10);
    expect(r).toBeGreaterThan(0);
  });
});
