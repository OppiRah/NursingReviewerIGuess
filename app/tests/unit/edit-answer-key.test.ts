/** Sprint: AUDIT-001 A-17. Fixing a wrong answer key resets the "mistake" and brings the item back. Synthetic data. */
import { afterEach, describe, expect, it } from 'vitest';
import { ReviewerDB } from '../../src/data/db';
import { buildExport, createDeck, loadMistakes, recordReview, restoreBackup, updateItem } from '../../src/data/repo';
import { validateBackupText } from '../../src/domain/backup';
import { answerKeyChanged } from '../../src/domain/editItem';
import { parseReviewer } from '../../src/domain/parser';
import { createFsrsScheduler } from '../../src/domain/scheduler';
import type { Item } from '../../src/domain/types';

const T0 = new Date(2026, 10, 10, 9, 0);
const LATER = new Date(2026, 10, 10, 9, 30);
const TEXT = '1. Sample: which is the sample answer?\na. Alpha\nb. Beta\nc. Gamma\nAnswer: a\nRationale: Sample.\n---\nQ: Sample front?\nA: Sample back';

let db: ReviewerDB | null = null;
afterEach(async () => {
  db?.close();
  await db?.delete();
  db = null;
});

async function setup(): Promise<{ db: ReviewerDB; mcq: Item; card: Item }> {
  db = new ReviewerDB(`edit-${Date.now()}-${Math.random()}`);
  const s = await createFsrsScheduler();
  const deckId = await createDeck(db, { title: 'Sample', examDate: null, items: parseReviewer(TEXT).items }, s, T0);
  const items = await db.items.where('deckId').equals(deckId).sortBy('position');
  const [mcq, card] = items as [Item, Item];
  // Marked wrong under the (wrong) key, and Good on the flashcard: both reviewed, both due later.
  await recordReview(db, mcq.id, 'again', false, s, T0);
  await recordReview(db, card.id, 'good', true, s, T0);
  return { db, mcq: (await db.items.get(mcq.id))!, card: (await db.items.get(card.id))! };
}

describe('answerKeyChanged', () => {
  const base = { type: 'mcq' as const, choices: ['Alpha', 'Beta', 'Gamma'], answer: [0], back: '' };
  it('is true when a different choice becomes correct', () => {
    expect(answerKeyChanged(base, { ...base, answer: [1] })).toBe(true);
  });
  it('is false when choices are reordered or re-spaced but the correct text is the same', () => {
    expect(answerKeyChanged(base, { ...base, choices: ['Beta', 'alpha ', 'Gamma'], answer: [1] })).toBe(false);
  });
  it('is false when only a wrong choice is reworded', () => {
    expect(answerKeyChanged(base, { ...base, choices: ['Alpha', 'Beta (sample)', 'Gamma'] })).toBe(false);
  });
  it('compares the flashcard back for flashcards', () => {
    const c = { type: 'flashcard' as const, choices: [], answer: [], back: 'Old back' };
    expect(answerKeyChanged(c, { ...c, back: 'New back' })).toBe(true);
    expect(answerKeyChanged(c, { ...c, back: ' old  BACK ' })).toBe(false);
  });
});

describe('updateItem after an answer-key fix (A-17)', () => {
  it('clears the mistake, brings the item back now, and keeps the FSRS card and review log', async () => {
    const { db, mcq } = await setup();
    expect(mcq.lastGrade).toBe('again');
    expect((await loadMistakes(db)).map((i) => i.id)).toContain(mcq.id);
    // Make it look due in the future so "brought back now" is observable.
    // (Both copies of the due date move together, as the app itself always does.)
    const future = new Date(2026, 10, 20).toISOString();
    await db.items.update(mcq.id, { dueAt: future, card: { ...mcq.card, dueAt: future } });
    const moved = (await db.items.get(mcq.id))!;
    const reviewsBefore = await db.reviews.count();

    await updateItem(db, mcq.id, { answer: [1] }, LATER);

    const after = (await db.items.get(mcq.id))!;
    expect(after.answer).toEqual([1]);
    expect(after.lastGrade).toBeNull();
    expect(after.dueAt).toBe(LATER.toISOString());
    // The card's due date moves with it (R-1); the FSRS memory state is otherwise untouched.
    expect(after.card.dueAt).toBe(after.dueAt);
    expect(after.card).toEqual({ ...moved.card, dueAt: LATER.toISOString() });
    expect(await db.reviews.count()).toBe(reviewsBefore);
    expect((await loadMistakes(db)).map((i) => i.id)).not.toContain(mcq.id);
  });

  it('a flashcard whose answer text is corrected comes back now', async () => {
    const { db, card } = await setup();
    expect(Date.parse(card.dueAt)).toBeGreaterThan(LATER.getTime());
    await updateItem(db, card.id, { back: 'Corrected sample back' }, LATER);
    const after = (await db.items.get(card.id))!;
    expect(after.dueAt).toBe(LATER.toISOString());
    expect(after.card.dueAt).toBe(after.dueAt);
    expect(after.lastGrade).toBeNull();
  });

  it('editing only the question or rationale keeps the schedule and the mistake', async () => {
    const { db, mcq } = await setup();
    await updateItem(db, mcq.id, { question: 'Sample: reworded question?', rationale: 'Better sample rationale.' }, LATER);
    const after = (await db.items.get(mcq.id))!;
    expect(after.lastGrade).toBe('again');
    expect(after.dueAt).toBe(mcq.dueAt);
  });

  it('a flag toggle changes nothing else', async () => {
    const { db, mcq } = await setup();
    await updateItem(db, mcq.id, { flagged: true });
    const after = (await db.items.get(mcq.id))!;
    expect(after.flagged).toBe(true);
    expect(after.lastGrade).toBe('again');
    expect(after.dueAt).toBe(mcq.dueAt);
  });

  it('a never-reviewed item only gets the new answer (it is new anyway)', async () => {
    db = new ReviewerDB(`edit-new-${Date.now()}`);
    const s = await createFsrsScheduler();
    const deckId = await createDeck(db, { title: 'Sample', examDate: null, items: parseReviewer(TEXT).items }, s, T0);
    const fresh = (await db.items.where('deckId').equals(deckId).sortBy('position'))[0]!;
    await updateItem(db, fresh.id, { answer: [2] }, LATER);
    const after = (await db.items.get(fresh.id))!;
    expect(after.answer).toEqual([2]);
    expect(after.dueAt).toBe(fresh.dueAt);
    expect(after.lastGrade).toBeNull();
  });

  it('an unknown item id still fails clearly', async () => {
    const { db } = await setup();
    await expect(updateItem(db, 'no-such-id', { answer: [0] })).rejects.toThrow('Item not found');
  });
});

describe('R-1: an answer-key fix keeps backups restorable (real edit → export → validate → restore)', () => {
  const EXPORT_AT = new Date(2026, 10, 10, 10, 0);
  let target: ReviewerDB | null = null;
  afterEach(async () => {
    target?.close();
    await target?.delete();
    target = null;
  });

  /** Export from `from`, validate the file text exactly as Settings does, restore into a fresh database. */
  async function roundTrip(from: ReviewerDB): Promise<ReviewerDB> {
    const text = JSON.stringify(await buildExport(from, EXPORT_AT));
    const v = await validateBackupText(text, EXPORT_AT);
    if (!v.ok) throw new Error(`backup rejected: ${v.error}`);
    target = new ReviewerDB(`restore-${Date.now()}-${Math.random()}`);
    await restoreBackup(target, v.backup);
    return target;
  }

  it('the corrected answer, cleared mistake, due dates and review history all survive the round trip', async () => {
    const { db, mcq } = await setup();
    expect(Date.parse(mcq.dueAt)).toBeGreaterThan(LATER.getTime()); // a real future due date from FSRS
    const reviews = (await db.reviews.where('itemId').equals(mcq.id).toArray()).map(({ id: _id, ...r }) => r);
    expect(reviews).toHaveLength(1);

    await updateItem(db, mcq.id, { answer: [1] }, LATER);
    const edited = (await db.items.get(mcq.id))!;
    expect(edited.card.dueAt).toBe(edited.dueAt);

    const restoredDb = await roundTrip(db);
    const restored = (await restoredDb.items.get(mcq.id))!;
    expect(restored.answer).toEqual([1]);
    expect(restored.choices).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(restored.lastGrade).toBeNull();
    expect(restored.dueAt).toBe(LATER.toISOString());
    expect(restored.card.dueAt).toBe(restored.dueAt);
    expect(restored.card).toEqual(edited.card);
    expect(await restoredDb.decks.get(restored.deckId)).toBeDefined();
    expect((await restoredDb.reviews.where('itemId').equals(mcq.id).toArray()).map(({ id: _id, ...r }) => r)).toEqual(reviews);
    expect(await restoredDb.reviews.count()).toBe(await db.reviews.count());
    expect((await loadMistakes(restoredDb)).map((i) => i.id)).not.toContain(mcq.id);
    // And a backup taken from the restored device is valid too.
    expect((await validateBackupText(JSON.stringify(await buildExport(restoredDb, EXPORT_AT)), EXPORT_AT)).ok).toBe(true);
  });

  it('a flashcard answer fix also exports and restores cleanly', async () => {
    const { db, card } = await setup();
    await updateItem(db, card.id, { back: 'Corrected sample back' }, LATER);
    const restored = (await (await roundTrip(db)).items.get(card.id))!;
    expect(restored.back).toBe('Corrected sample back');
    expect(restored.card.dueAt).toBe(restored.dueAt);
  });

  it('an ordinary rewording keeps schedule, mistake and review history, and still round-trips', async () => {
    const { db, mcq } = await setup();
    const reviewsBefore = await db.reviews.count();
    await updateItem(db, mcq.id, { question: 'Sample: reworded question?', choices: ['Alpha', 'Beta (reworded)', 'Gamma'] }, LATER);
    const edited = (await db.items.get(mcq.id))!;
    expect(edited.dueAt).toBe(mcq.dueAt);
    expect(edited.card).toEqual(mcq.card);
    expect(edited.lastGrade).toBe('again');
    expect(await db.reviews.count()).toBe(reviewsBefore);
    const restored = (await (await roundTrip(db)).items.get(mcq.id))!;
    expect(restored.question).toBe('Sample: reworded question?');
    expect(restored.dueAt).toBe(mcq.dueAt);
    expect(restored.card).toEqual(mcq.card);
    expect(restored.lastGrade).toBe('again');
  });
});
