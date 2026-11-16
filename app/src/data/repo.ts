/** Data operations used by the screens. Each takes the db explicitly so tests can use fake-indexeddb. */
import { buildBackup, type BackupData, type BackupFile } from '../domain/backup';
import type { ParsedItem } from '../domain/parser';
import { clampToExam } from '../domain/plan';
import type { Scheduler } from '../domain/scheduler';
import type { Deck, Grade, Item, Review } from '../domain/types';
import type { ReviewerDB } from './db';

/** Settings that describe this device, not the user's study data; never exported or restored. */
export const LOCAL_ONLY_SETTINGS = new Set(['lastExportAt', 'reminderUid']);

export const newId = (): string => crypto.randomUUID();

export async function getSetting<T>(db: ReviewerDB, key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(db: ReviewerDB, key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function createDeck(
  db: ReviewerDB,
  input: { title: string; examDate: string | null; items: ParsedItem[] },
  scheduler: Scheduler,
  now: Date,
): Promise<string> {
  const deck: Deck = { id: newId(), title: input.title.trim(), examDate: input.examDate, createdAt: now.toISOString() };
  const card = scheduler.newState(now);
  const items: Item[] = input.items.map((p, i) => ({
    id: newId(),
    deckId: deck.id,
    type: p.type,
    question: p.question,
    choices: p.choices,
    answer: p.answer,
    back: p.back,
    rationale: p.rationale,
    card,
    dueAt: card.dueAt,
    position: i,
    firstReviewedAt: null,
    lastGrade: null,
    flagged: false,
    createdAt: deck.createdAt,
  }));
  await db.transaction('rw', db.decks, db.items, async () => {
    await db.decks.add(deck);
    await db.items.bulkAdd(items);
  });
  return deck.id;
}

export async function loadAll(db: ReviewerDB): Promise<{ decks: Deck[]; items: Item[] }> {
  const [decks, items] = await Promise.all([db.decks.orderBy('createdAt').toArray(), db.items.toArray()]);
  return { decks, items };
}

/** Apply one review: update the scheduler state (clamped to the exam) and append to the log. */
export async function recordReview(
  db: ReviewerDB,
  itemId: string,
  grade: Grade,
  correct: boolean,
  scheduler: Scheduler,
  now: Date,
): Promise<Item> {
  return db.transaction('rw', db.items, db.decks, db.reviews, async () => {
    const item = await db.items.get(itemId);
    if (!item) throw new Error('Item not found');
    const deck = await db.decks.get(item.deckId);
    const next = scheduler.review(item.card, grade, now);
    next.dueAt = clampToExam(next.dueAt, deck, now);
    const updated: Item = {
      ...item,
      card: next,
      dueAt: next.dueAt,
      firstReviewedAt: item.firstReviewedAt ?? now.toISOString(),
      lastGrade: grade,
    };
    await db.items.put(updated);
    const review: Review = { itemId, deckId: item.deckId, at: now.toISOString(), grade, correct };
    await db.reviews.add(review);
    return updated;
  });
}

/** Items whose last rating was Again, oldest due first. */
export async function loadMistakes(db: ReviewerDB): Promise<Item[]> {
  const items = await db.items.where('lastGrade').equals('again').toArray();
  return items.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export async function updateItem(db: ReviewerDB, id: string, patch: Partial<Pick<Item, 'type' | 'question' | 'choices' | 'answer' | 'back' | 'rationale' | 'flagged'>>): Promise<void> {
  const n = await db.items.update(id, patch);
  if (n === 0) throw new Error('Item not found');
}

/** Deletes the item and its review log. */
export async function deleteItem(db: ReviewerDB, id: string): Promise<void> {
  await db.transaction('rw', db.items, db.reviews, async () => {
    await db.reviews.where('itemId').equals(id).delete();
    await db.items.delete(id);
  });
}

/**
 * Update a deck. If the exam date changes, already-reviewed items due after the new
 * "day before the exam" are pulled back to it, so they still come up before the exam.
 */
export async function updateDeck(db: ReviewerDB, id: string, patch: Partial<Pick<Deck, 'title' | 'examDate'>>, now: Date): Promise<void> {
  await db.transaction('rw', db.decks, db.items, async () => {
    const deck = await db.decks.get(id);
    if (!deck) throw new Error('Deck not found');
    const next: Deck = { ...deck, ...patch };
    await db.decks.put(next);
    if (!('examDate' in patch) || patch.examDate === deck.examDate) return;
    const items = await db.items.where('deckId').equals(id).toArray();
    const changed = items.flatMap((it) => {
      if (it.card.reps === 0) return [];
      const due = clampToExam(it.dueAt, next, now);
      return due === it.dueAt ? [] : [{ ...it, dueAt: due, card: { ...it.card, dueAt: due } }];
    });
    if (changed.length) await db.items.bulkPut(changed);
  });
}

/** Deletes a deck with all of its items and reviews. */
export async function deleteDeck(db: ReviewerDB, id: string): Promise<void> {
  await db.transaction('rw', db.decks, db.items, db.reviews, async () => {
    await db.reviews.where('deckId').equals(id).delete();
    await db.items.where('deckId').equals(id).delete();
    await db.decks.delete(id);
  });
}

export async function collectBackupData(db: ReviewerDB): Promise<BackupData> {
  return db.transaction('r', db.decks, db.items, db.reviews, db.settings, async () => ({
    decks: await db.decks.orderBy('createdAt').toArray(),
    items: await db.items.orderBy('id').toArray(),
    reviews: await db.reviews.orderBy('id').toArray(),
    settings: (await db.settings.orderBy('key').toArray()).filter((s) => !LOCAL_ONLY_SETTINGS.has(s.key)),
  }));
}

/** Builds the backup file. Does not record it as exported: call markExported once the download was handed off. */
export async function buildExport(db: ReviewerDB, now: Date): Promise<BackupFile> {
  return buildBackup(await collectBackupData(db), now);
}

export async function markExported(db: ReviewerDB, exportedAt: string): Promise<void> {
  await setSetting(db, 'lastExportAt', exportedAt);
}

/** Build + mark (used by tests and callers that don't download). */
export async function exportBackup(db: ReviewerDB, now: Date): Promise<BackupFile> {
  const backup = await buildExport(db, now);
  await markExported(db, backup.exportedAt);
  return backup;
}

const clearStudySettings = (db: ReviewerDB): Promise<number> => db.settings.where('key').noneOf([...LOCAL_ONLY_SETTINGS]).delete();

/**
 * Replace all study data with a backup that has ALREADY been validated (validateBackupText).
 * One transaction: if any write fails, the previous data stays intact. Device-local settings are kept.
 */
export async function restoreBackup(db: ReviewerDB, backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.decks, db.items, db.reviews, db.settings, async () => {
    await Promise.all([db.decks.clear(), db.items.clear(), db.reviews.clear(), clearStudySettings(db)]);
    await db.decks.bulkAdd(backup.data.decks);
    await db.items.bulkAdd(backup.data.items);
    await db.reviews.bulkAdd(backup.data.reviews);
    await db.settings.bulkPut(backup.data.settings.filter((s) => !LOCAL_ONLY_SETTINGS.has(s.key)));
    await db.settings.put({ key: 'lastExportAt', value: backup.exportedAt });
  });
}

/** Deletes all study data and preferences. Keeps device-local facts (e.g. the calendar reminder's UID, so a new reminder replaces the old event instead of duplicating it). */
export async function wipeAll(db: ReviewerDB): Promise<void> {
  await db.transaction('rw', db.decks, db.items, db.reviews, db.settings, async () => {
    await Promise.all([db.decks.clear(), db.items.clear(), db.reviews.clear(), clearStudySettings(db)]);
    await db.settings.delete('lastExportAt');
  });
}
