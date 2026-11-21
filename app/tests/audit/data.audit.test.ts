/** AUDIT-001 areas 1 (editing) and 3/4 (data safety, schema vs. stale code). */
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { ReviewerDB } from '../../src/data/db';
import { collectBackupData, createDeck, exportBackup, recordReview, restoreBackup, setSetting, wipeAll } from '../../src/data/repo';
import { validateBackupText } from '../../src/domain/backup';
import { draftFromItem, validateDraft } from '../../src/domain/editItem';
import { parseReviewer } from '../../src/domain/parser';
import { createFsrsScheduler } from '../../src/domain/scheduler';
import type { Item } from '../../src/domain/types';

const NOW = new Date(2026, 10, 16, 9, 0, 0);
const TEXT = '1. Sample one?\na. Alpha\nb. Beta\nc. Gamma\nd. Delta\nAnswer: c\nRationale: r1\n---\nQ: Front\nA: Back\n---\n2. Select all that apply. Sample?\na. A1\nb. B1\nc. C1\nAnswer: a, c\nRationale: r2';
const dbs: ReviewerDB[] = [];
let n = 0;
const mk = (): ReviewerDB => {
  const db = new ReviewerDB(`audit-${Date.now()}-${n++}`);
  dbs.push(db);
  return db;
};
afterEach(async () => {
  for (const db of dbs.splice(0)) {
    db.close();
    await db.delete().catch(() => undefined);
  }
});

describe('AUDIT-001 editing an item', () => {
  it('F: deleting a middle choice silently re-points the answer to a different choice', () => {
    const item = { type: 'mcq', question: 'Q?', choices: ['Alpha', 'Beta', 'Gamma', 'Delta'], answer: [2], back: '', rationale: '' } as unknown as Item;
    const draft = draftFromItem(item); // answer shown as "c" (Gamma)
    // The student removes the wrong-looking choice "Beta" and saves without touching the letter.
    const r = validateDraft({ ...draft, choices: ['Alpha', 'Gamma', 'Delta'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const nowCorrect = r.patch.choices[r.patch.answer[0] ?? -1];
      console.log(`correct answer before edit: Gamma; after deleting "Beta": ${nowCorrect}`);
      expect(nowCorrect, 'the saved correct choice should still be Gamma, or the editor should refuse').toBe('Gamma');
    }
  });
});

describe('AUDIT-001 backup', () => {
  it('export → wipe → restore → export gives identical data (complete backup)', async () => {
    const s = await createFsrsScheduler();
    const a = mk();
    const deckId = await createDeck(a, { title: 'Deck', examDate: '2026-12-01', items: parseReviewer(TEXT).items }, s, NOW);
    const items = await a.items.where('deckId').equals(deckId).toArray();
    await recordReview(a, items[0]!.id, 'again', false, s, NOW);
    await recordReview(a, items[1]!.id, 'easy', true, s, NOW);
    await setSetting(a, 'sessionDays', ['2026-11-16']);
    await setSetting(a, 'onboarded', true);
    await setSetting(a, 'mascot', false);
    await setSetting(a, 'reminderTime', '06:30');
    const before = await collectBackupData(a);
    const file = JSON.stringify(await exportBackup(a, NOW));

    const b = mk(); // "fresh phone"
    const v = await validateBackupText(file, NOW);
    expect(v.ok).toBe(true);
    if (v.ok) await restoreBackup(b, v.backup);
    expect(await collectBackupData(b)).toEqual(before);
  });

  it('a restore that fails halfway keeps the previous data (atomic)', async () => {
    const s = await createFsrsScheduler();
    const db = mk();
    await createDeck(db, { title: 'Keep me', examDate: null, items: parseReviewer(TEXT).items }, s, NOW);
    const good = await exportBackup(db, NOW);
    const bad = structuredClone(good);
    bad.data.decks[0]!.title = 'Replacement';
    bad.data.items.push({ ...bad.data.items[0]! }); // duplicate key → bulkAdd fails after the tables were cleared
    await expect(restoreBackup(db, bad)).rejects.toBeTruthy();
    expect((await db.decks.toArray())[0]?.title).toBe('Keep me');
    expect(await db.items.count()).toBe(3);
  });

  it('wipe removes study data and settings', async () => {
    const s = await createFsrsScheduler();
    const db = mk();
    await createDeck(db, { title: 'x', examDate: null, items: parseReviewer(TEXT).items }, s, NOW);
    await setSetting(db, 'onboarded', true);
    await wipeAll(db);
    expect([await db.decks.count(), await db.items.count(), await db.reviews.count(), await db.settings.count()]).toEqual([0, 0, 0, 0]);
  });
});

describe('AUDIT-001 stale code vs newer schema (PWA update path)', () => {
  it('old code (schema 2) CAN still open a database already upgraded to schema 3 (Dexie 4 tolerates it)', async () => {
    const name = `audit-future-${Date.now()}`;
    const future = new Dexie(name);
    future.version(3).stores({ decks: 'id, createdAt', items: 'id, deckId, dueAt, lastGrade', reviews: '++id, itemId, deckId, at', settings: 'key', extra: 'id' });
    await future.open();
    future.close();
    const old = new ReviewerDB(name);
    let error = '';
    try {
      await old.open();
    } catch (e) {
      error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
    console.log(`old code opening a newer database → ${error || 'opened without error'}`);
    old.close();
    await Dexie.delete(name);
    expect(error).toBe('');
  });
});
