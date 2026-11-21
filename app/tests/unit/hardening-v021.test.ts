/** v0.2.1 hardening: regression tests for AUDIT-001 A-05, A-06 and A-08. Synthetic data only. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canShareBackup, shareBackup, toPending, type ShareNavigator } from '../../src/app/backupExport';
import { outlookLine, READINESS_HINT, workloadLine } from '../../src/copy';
import { ReviewerDB } from '../../src/data/db';
import { buildExport, createDeck, getSetting, markExported, recordReview, restoreBackup } from '../../src/data/repo';
import { backupFileName, needsBackupNudge, validateBackupText } from '../../src/domain/backup';
import { addDays, localDateStr } from '../../src/domain/dates';
import { parseReviewer } from '../../src/domain/parser';
import { buildDailyPlan, deckOutlook, MIN_NEW_PER_DAY, mixQueue, SESSION_SIZE } from '../../src/domain/plan';
import { deckReadiness, itemReadiness, seenCount } from '../../src/domain/readiness';
import { createFsrsScheduler, type Scheduler } from '../../src/domain/scheduler';
import type { CardState, Deck, Grade, Item } from '../../src/domain/types';

const NOW = new Date(2026, 10, 21, 9, 0, 0); // local 2026-11-21 09:00
const today = localDateStr(NOW);
const deck = (examDate: string | null, id = 'd'): Deck => ({ id, title: 'Synthetic', examDate, createdAt: NOW.toISOString() });
const unseenCard: CardState = { stability: 0, difficulty: 0, state: 0, reps: 0, lapses: 0, scheduledDays: 0, learningStep: 0, dueAt: NOW.toISOString(), lastReviewAt: null };
const item = (i: number, card: CardState = unseenCard, extra: Partial<Item> = {}): Item => ({
  id: `i${String(i).padStart(4, '0')}`, deckId: 'd', type: 'mcq', question: `Synthetic ${i}?`, choices: ['x', 'y'], answer: [0], back: '', rationale: '',
  card, dueAt: card.dueAt, position: i, firstReviewedAt: card.reps ? card.lastReviewAt : null, lastGrade: card.reps ? 'good' : null, flagged: false, createdAt: NOW.toISOString(), ...extra,
});
const reviewedCard = (stability: number, lastReviewAt: Date, dueAt: Date): CardState => ({
  stability, difficulty: 5, state: 2, reps: 2, lapses: 0, scheduledDays: 1, learningStep: 0, dueAt: dueAt.toISOString(), lastReviewAt: lastReviewAt.toISOString(),
});
const daysAgo = (d: number): Date => new Date(NOW.getTime() - d * 86_400_000);

let s: Scheduler;
beforeEach(async () => {
  s = await createFsrsScheduler();
});
const recall = (c: CardState, at: Date): number => s.retrievability(c, at);

// ---------------------------------------------------------------- A-05
describe('A-05 weakest-first ordering', () => {
  it('orders due reviews by lowest FSRS retrievability now', () => {
    const items = [
      item(1, reviewedCard(30, daysAgo(2), NOW)), // strong, recent
      item(2, reviewedCard(1, daysAgo(10), NOW)), // weak and long ago
      item(3, reviewedCard(5, daysAgo(5), NOW)),
    ];
    const ids = buildDailyPlan([deck(addDays(today, 20))], items, NOW, recall).queue.map((i) => i.id);
    expect(ids).toEqual(['i0002', 'i0003', 'i0001']);
    const r = ids.map((id) => recall(items.find((x) => x.id === id)!.card, NOW));
    expect(r[0]).toBeLessThan(r[1]!);
    expect(r[1]).toBeLessThan(r[2]!);
  });

  it('identical retrievability: earlier due time first, then id; same result for any input order', () => {
    const c = reviewedCard(3, daysAgo(3), NOW);
    const later = { ...c, dueAt: new Date(NOW.getTime() + 3600_000).toISOString() };
    const items = [item(3, c), item(1, c), item(2, later), item(4, c)];
    const expected = ['i0001', 'i0003', 'i0004', 'i0002'];
    expect(buildDailyPlan([deck(null)], items, NOW, recall).queue.map((i) => i.id)).toEqual(expected);
    for (let k = 0; k < 10; k++) {
      const shuffled = [...items].sort(() => (k % 2 ? 1 : -1) * (Math.sin(k * 7) > 0 ? 1 : -1));
      expect(buildDailyPlan([deck(null)], shuffled, NOW, recall).queue.map((i) => i.id)).toEqual(expected);
    }
  });

  it('never drops a due review and never adds one twice', () => {
    const items = Array.from({ length: 57 }, (_, i) => item(i, reviewedCard(1 + (i % 7), daysAgo(i % 5), NOW)));
    const ids = buildDailyPlan([deck(null)], items, NOW, recall).queue.map((i) => i.id);
    expect(new Set(ids).size).toBe(57);
  });
});

describe('A-05 new items and reviews together (mixQueue)', () => {
  const R = (n: number): Item[] => Array.from({ length: n }, (_, i) => item(i, reviewedCard(2, daysAgo(1), NOW)));
  const N = (n: number): Item[] => Array.from({ length: n }, (_, i) => item(1000 + i));
  const isNew = (it: Item): boolean => it.card.reps === 0;

  it('every session of 10 has at least one new item and one review while both remain', () => {
    const q = mixQueue(R(290), N(10));
    expect(q).toHaveLength(300);
    for (let b = 0; b < 10; b++) {
      const block = q.slice(b * 10, b * 10 + 10);
      expect(block.some(isNew), `session ${b + 1} has a new item`).toBe(true);
      expect(block.some((x) => !isNew(x)), `session ${b + 1} has a review`).toBe(true);
    }
    // Was: the first unseen item at index 290 (AUDIT-001 A-05 verification).
    expect(q.findIndex(isNew)).toBeLessThan(SESSION_SIZE);
  });

  it('a lone review among many new items is not pushed to the end', () => {
    const q = mixQueue(R(1), N(300));
    expect(q.findIndex((x) => !isNew(x))).toBe(0);
  });

  it('keeps each stream in its own order, loses nothing, and puts reviews first within a session', () => {
    const reviews = R(23);
    const fresh = N(17);
    const q = mixQueue(reviews, fresh);
    expect(q.filter((x) => !isNew(x))).toEqual(reviews);
    expect(q.filter(isNew)).toEqual(fresh);
    const first = q.slice(0, 10);
    expect(first.findIndex(isNew)).toBeGreaterThan(first.findLastIndex((x) => !isNew(x)));
  });

  it('for every mix of 0–60 reviews and 0–60 new items: a permutation, both orders kept, both present per session', () => {
    for (let r = 0; r <= 60; r++) {
      for (let n = 0; n <= 60; n++) {
        const reviews = R(r);
        const fresh = N(n);
        const q = mixQueue(reviews, fresh);
        expect(q.length).toBe(r + n);
        expect(q.filter((x) => !isNew(x))).toEqual(reviews);
        expect(q.filter(isNew)).toEqual(fresh);
        let seenR = 0;
        let seenN = 0;
        for (let b = 0; b * SESSION_SIZE < q.length; b++) {
          const block = q.slice(b * SESSION_SIZE, (b + 1) * SESSION_SIZE);
          const bothLeft = seenR < r && seenN < n && block.length > 1;
          if (bothLeft) expect(block.some(isNew) && block.some((x) => !isNew(x)), `r=${r} n=${n} session ${b + 1}`).toBe(true);
          seenR += block.filter((x) => !isNew(x)).length;
          seenN += block.filter(isNew).length;
        }
      }
    }
  });

  it('only one kind: unchanged', () => {
    expect(mixQueue(R(5), [])).toHaveLength(5);
    expect(mixQueue([], N(5)).map((x) => x.id)).toEqual(N(5).map((x) => x.id));
  });

  it('buildDailyPlan introduces new items in session 1 even when many reviews are due', () => {
    const items = [...R(150).map((x, i) => ({ ...x, id: `r${i}`, position: i })), ...N(50).map((x, i) => ({ ...x, id: `n${i}`, position: 150 + i }))];
    const plan = buildDailyPlan([deck(addDays(today, 10))], items, NOW, recall);
    expect(plan.queue.slice(0, SESSION_SIZE).some(isNew)).toBe(true);
    expect(plan.dueCount).toBe(150 + MIN_NEW_PER_DAY);
  });
});

describe('A-05 deck outlook (feasibility from the plan itself)', () => {
  const unseenDeck = (n: number): Item[] => Array.from({ length: n }, (_, i) => item(i));

  it('300 items, 3 days left: heavy, 100 new a day, says more sessions may be needed', () => {
    const o = deckOutlook(deck(addDays(today, 3)), unseenDeck(300), NOW);
    expect(o).toEqual({ status: 'heavy', unseen: 300, total: 300, newPerDay: 100 });
    const line = outlookLine(o, SESSION_SIZE);
    expect(line).toMatch(/about 100 new items a day \(about 10 sessions of new items\)/);
    expect(line).toMatch(/may need more sessions/);
    expect(workloadLine(buildDailyPlan([deck(addDays(today, 3))], unseenDeck(300), NOW, recall).dueCount, SESSION_SIZE)).toMatch(/^About 10 sessions today/);
  });

  it('small deck, plenty of time: fits', () => {
    const o = deckOutlook(deck(addDays(today, 30)), unseenDeck(40), NOW);
    expect(o.status).toBe('fits');
    expect(o.newPerDay).toBe(2);
    expect(outlookLine(o, SESSION_SIZE)).not.toMatch(/may/);
  });

  it('boundary: exactly MIN_NEW_PER_DAY a day fits; one more is heavy', () => {
    expect(deckOutlook(deck(addDays(today, 10)), unseenDeck(100), NOW).status).toBe('fits');
    expect(deckOutlook(deck(addDays(today, 10)), unseenDeck(101), NOW).status).toBe('heavy');
  });

  it('exam tomorrow or today: last day; exam passed; no date; all seen', () => {
    expect(deckOutlook(deck(addDays(today, 1)), unseenDeck(30), NOW).status).toBe('last-day');
    expect(deckOutlook(deck(today), unseenDeck(30), NOW).status).toBe('last-day');
    expect(outlookLine(deckOutlook(deck(today), unseenDeck(30), NOW), SESSION_SIZE)).toMatch(/30 not seen yet.*about 3 sessions/);
    expect(deckOutlook(deck(addDays(today, -2)), unseenDeck(30), NOW).status).toBe('passed');
    expect(deckOutlook(deck(null), unseenDeck(30), NOW).status).toBe('no-date');
    const seen = Array.from({ length: 5 }, (_, i) => item(i, reviewedCard(3, daysAgo(1), NOW)));
    expect(deckOutlook(deck(addDays(today, 3)), seen, NOW).status).toBe('all-seen');
    expect(outlookLine(deckOutlook(deck(addDays(today, 3)), seen, NOW), SESSION_SIZE)).toBe('');
  });

  it('counts items already introduced today, like the plan does', () => {
    const items = [...unseenDeck(90), ...Array.from({ length: 20 }, (_, i) => item(500 + i, reviewedCard(1, NOW, NOW), { firstReviewedAt: NOW.toISOString() }))];
    // (90 unseen + 20 introduced today) over 10 days = 11 a day.
    expect(deckOutlook(deck(addDays(today, 10)), items, NOW).newPerDay).toBe(11);
  });

  it('never says the student failed or predicts an exam result', () => {
    for (const status of ['fits', 'heavy', 'last-day', 'passed', 'no-date']) {
      const line = outlookLine({ status, unseen: 12, newPerDay: 30 }, SESSION_SIZE);
      expect(line).not.toMatch(/fail|behind|pass the exam|will score/i);
    }
  });
});

describe('A-05 session counts around the batch size', () => {
  it.each([
    [0, ''],
    [1, 'About 1 session today'],
    [10, 'About 1 session today'],
    [11, 'About 2 sessions today'],
    [20, 'About 2 sessions today'],
    [21, 'About 3 sessions today'],
  ])('%i items → %s', (n, expected) => {
    expect(workloadLine(n, SESSION_SIZE).startsWith(expected)).toBe(true);
  });
  it('uses the session size it is given, not a hardcoded 10', () => {
    expect(workloadLine(12, 5)).toMatch(/^About 3 sessions today \(5 items each\)/);
  });
});

// ---------------------------------------------------------------- A-06
describe('A-06 readiness counts only items last answered correctly', () => {
  const answered = (i: number, grades: Grade[], start: Date): Item => {
    let card = s.newState(start);
    let t = start;
    for (const g of grades) {
      card = s.review(card, g, t);
      t = new Date(t.getTime() + 86_400_000);
    }
    return item(i, card, { lastGrade: grades[grades.length - 1] ?? null, firstReviewedAt: start.toISOString() });
  };
  const exam = deck(addDays(today, 1));

  it('completely unseen deck: 0; empty deck: null', () => {
    expect(deckReadiness(exam, Array.from({ length: 5 }, (_, i) => item(i)), s, NOW)).toBe(0);
    expect(deckReadiness(exam, [], s, NOW)).toBeNull();
  });

  it('the audit case: one pass, 30% wrong, day before the exam → at most 70% (was ≈97%)', () => {
    const items = Array.from({ length: 300 }, (_, i) => answered(i, [i % 10 < 3 ? 'again' : 'good'], NOW));
    const r = deckReadiness(exam, items, s, NOW)!;
    const old = items.reduce((a, it) => a + s.retrievability(it.card, new Date(2026, 10, 22)), 0) / items.length;
    expect(old).toBeGreaterThan(0.9); // the misleading number the audit reported
    expect(r).toBeLessThanOrEqual(0.7);
    expect(r).toBeGreaterThan(0.5);
  });

  it('every item answered correctly once: below 100%, above 0', () => {
    const items = Array.from({ length: 20 }, (_, i) => answered(i, ['good'], NOW));
    const r = deckReadiness(exam, items, s, NOW)!;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
  });

  it('a latest-wrong item contributes 0, and counts again once answered correctly', () => {
    const wrong = answered(1, ['good', 'again'], daysAgo(3));
    expect(s.retrievability(wrong.card, NOW)).toBeGreaterThan(0.5); // FSRS alone would call it fairly known
    expect(itemReadiness(wrong, s, NOW)).toBe(0);
    const fixed = answered(1, ['good', 'again', 'good'], daysAgo(3));
    expect(itemReadiness(fixed, s, NOW)).toBeGreaterThan(0);
  });

  it('unseen items count 0 and stay in the denominator', () => {
    const r1 = deckReadiness(exam, [answered(1, ['good'], NOW)], s, NOW)!;
    const r4 = deckReadiness(exam, [answered(1, ['good'], NOW), item(2), item(3), item(4)], s, NOW)!;
    expect(r4).toBeCloseTo(r1 / 4, 10);
  });

  it('mixed ages and states: each item is 0 or its own FSRS retrievability; the deck value is their mean', () => {
    const items = [answered(1, ['good', 'good', 'good'], daysAgo(20)), answered(2, ['easy'], daysAgo(2)), answered(3, ['good', 'again'], daysAgo(4)), item(4), answered(5, ['again', 'good'], daysAgo(9))];
    const at = new Date(2026, 10, 22);
    const expected = items.reduce((a, it) => a + (it.card.reps && it.lastGrade !== 'again' ? s.retrievability(it.card, at) : 0), 0) / 5;
    expect(deckReadiness(exam, items, s, NOW)).toBeCloseTo(expected, 12);
  });

  it('all items reviewed several times and right: higher than after one pass', () => {
    const once = Array.from({ length: 10 }, (_, i) => answered(i, ['good'], daysAgo(10)));
    const many = Array.from({ length: 10 }, (_, i) => answered(i, ['good', 'good', 'good', 'good'], daysAgo(10)));
    expect(deckReadiness(exam, many, s, NOW)!).toBeGreaterThan(deckReadiness(exam, once, s, NOW)!);
  });

  it('coverage counts are exact and per deck', () => {
    const items = [answered(1, ['again'], NOW), answered(2, ['good'], NOW), item(3), { ...item(4), deckId: 'other' }];
    expect(seenCount(items, 'd')).toEqual({ seen: 2, total: 3 });
  });

  it('one explanation for every screen, and it does not predict exam results', () => {
    expect(READINESS_HINT).toMatch(/rough/i);
    expect(READINESS_HINT).toMatch(/not a prediction/i);
    expect(READINESS_HINT).toMatch(/last answered wrong, count as 0/i);
  });
});

// ---------------------------------------------------------------- A-08
describe('A-08 a backup counts only once the student confirms the file', () => {
  let db: ReviewerDB;
  let n = 0;
  beforeEach(async () => {
    db = new ReviewerDB(`test-v021-${n++}`);
    await createDeck(db, { title: 'Synthetic', examDate: null, items: parseReviewer('1. Synthetic stem?\na. x\nb. y\nAnswer: a').items }, s, NOW);
  });
  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it('building an export (the download step) does not record anything; the reminder stays on', async () => {
    const p = toPending(await buildExport(db, NOW), backupFileName(NOW));
    expect(await getSetting(db, 'lastExportAt', null)).toBeNull();
    expect(needsBackupNudge(null, NOW)).toBe(true);
    expect(JSON.parse(p.json).exportedAt).toBe(p.exportedAt);
  });

  it('the pending file is a complete, valid backup (format unchanged)', async () => {
    const p = toPending(await buildExport(db, NOW), backupFileName(NOW));
    const v = await validateBackupText(p.json, NOW);
    expect(v.ok).toBe(true);
  });

  it('confirming records the backup time, survives a reopen of the database, and silences the reminder for 7 days', async () => {
    const p = toPending(await buildExport(db, NOW), backupFileName(NOW));
    await markExported(db, p.exportedAt);
    const name = db.name;
    db.close();
    db = new ReviewerDB(name); // "reload"
    const saved = await getSetting<string | null>(db, 'lastExportAt', null);
    expect(saved).toBe(p.exportedAt);
    expect(needsBackupNudge(saved, NOW)).toBe(false);
    expect(needsBackupNudge(saved, new Date(NOW.getTime() + 8 * 86_400_000))).toBe(true);
  });

  it('repeated attempts: only the confirmed one is recorded', async () => {
    const t2 = new Date(NOW.getTime() + 60_000);
    toPending(await buildExport(db, NOW), backupFileName(NOW)); // attempt 1: never confirmed
    const second = toPending(await buildExport(db, t2), backupFileName(t2));
    expect(await getSetting(db, 'lastExportAt', null)).toBeNull();
    await markExported(db, second.exportedAt);
    expect(await getSetting(db, 'lastExportAt', null)).toBe(t2.toISOString());
  });

  it('restore still records the restored file as a backup (the student had the file) and stays atomic', async () => {
    const b = await buildExport(db, NOW);
    await recordReview(db, (await db.items.toArray())[0]!.id, 'good', true, s, NOW);
    await restoreBackup(db, b);
    expect(await getSetting(db, 'lastExportAt', null)).toBe(b.exportedAt);
    expect(await db.reviews.count()).toBe(0);
  });
});

describe('A-08 share sheet (feature-detected, optional)', () => {
  const p = toPending({ app: 'x', schemaVersion: 1, exportedAt: NOW.toISOString(), checksum: 'c', data: { decks: [], items: [], reviews: [], settings: [] } } as never, 'reviewer-backup-2026-11-21.json');

  it('not offered when the browser cannot share files', () => {
    expect(canShareBackup({}, p)).toBe(false);
    expect(canShareBackup({ share: async () => undefined }, p)).toBe(false);
    expect(canShareBackup({ share: async () => undefined, canShare: () => false }, p)).toBe(false);
    expect(canShareBackup({ share: async () => undefined, canShare: () => { throw new Error('x'); } }, p)).toBe(false);
  });

  it('shared / cancelled / failed are told apart, and none of them records a backup', async () => {
    const files: File[] = [];
    const ok: ShareNavigator = { canShare: () => true, share: async (d) => void files.push(...d.files) };
    expect(await shareBackup(ok, p)).toBe('shared');
    expect(files[0]?.name).toBe(p.fileName);
    expect(await files[0]!.text()).toBe(p.json);
    const abort = Object.assign(new Error('cancel'), { name: 'AbortError' });
    expect(await shareBackup({ canShare: () => true, share: () => Promise.reject(abort) }, p)).toBe('cancelled');
    expect(await shareBackup({ canShare: () => true, share: () => Promise.reject(new Error('NotAllowedError')) }, p)).toBe('failed');
    expect(await shareBackup({}, p)).toBe('failed');
  });
});
