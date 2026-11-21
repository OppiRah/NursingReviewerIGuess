/** v0.2.3: local study-day counts in "Copy feedback info" (D-008 measurement). Synthetic data only. */
import { afterEach, describe, expect, it } from 'vitest';
import { ReviewerDB } from '../../src/data/db';
import { createDeck, recordReview } from '../../src/data/repo';
import { buildFeedbackInfo, collectContentWords, collectFeedbackCounts, collectStudyDays, countStudyDays } from '../../src/domain/feedback';
import { parseReviewer } from '../../src/domain/parser';
import { createFsrsScheduler } from '../../src/domain/scheduler';

/** Fixed local "now": 2026-11-21 10:00 in the machine's timezone. */
const NOW = new Date(2026, 10, 21, 10, 0, 0);
/** ISO instant for a local time `daysAgo` calendar days before NOW's date. */
const ago = (daysAgo: number, h = 12, m = 0, s = 0, ms = 0): string => new Date(2026, 10, 21 - daysAgo, h, m, s, ms).toISOString();

/** process.env without Node type definitions (the project has none, on purpose). */
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
let db: ReviewerDB | null = null;
const savedTz = env.TZ;
/** Deleting TZ does not switch Node back to the system zone (seen on Windows), so restore it by name. */
const systemZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
afterEach(async () => {
  db?.close();
  await db?.delete();
  db = null;
  env.TZ = savedTz ?? systemZone;
});

describe('countStudyDays (pure)', () => {
  it('1. no review history → 0 and 0', () => {
    expect(countStudyDays([], NOW)).toEqual({ last7: 0, last14: 0 });
  });

  it('2. many reviews on one day count as one day', () => {
    expect(countStudyDays([ago(1, 8), ago(1, 9), ago(1, 21, 30), ago(1, 23, 59)], NOW)).toEqual({ last7: 1, last14: 1 });
  });

  it('3. reviews on three distinct days count as three', () => {
    expect(countStudyDays([ago(1), ago(3), ago(3, 18), ago(5)], NOW)).toEqual({ last7: 3, last14: 3 });
  });

  it('4/5. days 0–6 count in both windows; days 7–13 only in the 14-day window', () => {
    const in7 = [0, 2, 6].map((d) => ago(d));
    const only14 = [7, 10, 13].map((d) => ago(d));
    expect(countStudyDays(in7, NOW)).toEqual({ last7: 3, last14: 3 });
    expect(countStudyDays(only14, NOW)).toEqual({ last7: 0, last14: 3 });
    expect(countStudyDays([...in7, ...only14], NOW)).toEqual({ last7: 3, last14: 6 });
  });

  it('6. reviews older than 14 days are excluded (day 14 is outside the window)', () => {
    expect(countStudyDays([ago(14), ago(15), ago(30), ago(400)], NOW)).toEqual({ last7: 0, last14: 0 });
    expect(countStudyDays([ago(13), ago(14)], NOW)).toEqual({ last7: 0, last14: 1 });
  });

  it("7. today's reviews are included, even one made earlier today at 00:00", () => {
    expect(countStudyDays([ago(0, 0, 0, 0, 0)], NOW)).toEqual({ last7: 1, last14: 1 });
    expect(countStudyDays([NOW.toISOString()], NOW)).toEqual({ last7: 1, last14: 1 });
  });

  it('8. missing, non-string or unparsable timestamps are skipped, never thrown', () => {
    const junk: unknown[] = [undefined, null, 0, 123, {}, [], '', 'not a date', '2026-13-45T99:99:99Z', ago(2)];
    expect(() => countStudyDays(junk, NOW)).not.toThrow();
    expect(countStudyDays(junk, NOW)).toEqual({ last7: 1, last14: 1 });
  });

  it('future timestamps (phone clock was ahead) are not counted', () => {
    expect(countStudyDays([ago(-1), ago(-30)], NOW)).toEqual({ last7: 0, last14: 0 });
  });

  it('9. last 7 never exceeds last 14 (deterministic sweep over synthetic histories)', () => {
    let seed = 42;
    const rand = (): number => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let run = 0; run < 200; run++) {
      const times = Array.from({ length: Math.floor(rand() * 40) }, () => ago(Math.floor(rand() * 30) - 2, Math.floor(rand() * 24), Math.floor(rand() * 60)));
      const r = countStudyDays(times, NOW);
      expect(r.last7).toBeLessThanOrEqual(r.last14);
      expect(r.last7).toBeLessThanOrEqual(7);
      expect(r.last14).toBeLessThanOrEqual(14);
    }
  });

  it('12a. local midnight splits days: 23:59:59.999 and 00:00:00.000 are two different study days', () => {
    expect(countStudyDays([ago(2, 23, 59, 59, 999), ago(1, 0, 0, 0, 0)], NOW)).toEqual({ last7: 2, last14: 2 });
    // Window edges: 6 days ago at 23:59 is inside 7; 7 days ago at 23:59 is not.
    expect(countStudyDays([ago(6, 0, 0)], NOW).last7).toBe(1);
    expect(countStudyDays([ago(7, 23, 59, 59, 999)], NOW)).toEqual({ last7: 0, last14: 1 });
  });

  it('12b. the same instant is counted on the local date of the device timezone', () => {
    // 2026-11-20 16:30 UTC is 21 Nov 00:30 in Manila (UTC+8) but 20 Nov 08:30 in Los Angeles (UTC-8).
    const instant = '2026-11-20T16:30:00.000Z';
    env.TZ = 'Asia/Manila';
    const manilaNow = new Date('2026-11-21T02:00:00.000Z'); // 21 Nov 10:00 Manila
    expect(countStudyDays([instant, '2026-11-21T01:00:00.000Z'], manilaNow)).toEqual({ last7: 1, last14: 1 }); // both on 21 Nov
    env.TZ = 'America/Los_Angeles';
    const laNow = new Date('2026-11-21T18:00:00.000Z'); // 21 Nov 10:00 Los Angeles
    expect(countStudyDays([instant, '2026-11-21T17:00:00.000Z'], laNow)).toEqual({ last7: 2, last14: 2 }); // 20 Nov and 21 Nov
  });

  it('12c. a daylight-saving change inside the window does not shift the 7-day edge', () => {
    env.TZ = 'America/New_York'; // DST ends 2026-11-01 02:00 local
    const nyNow = new Date('2026-11-07T17:00:00.000Z'); // 7 Nov 12:00 EST
    const nov1Early = '2026-11-01T04:30:00.000Z'; // 1 Nov 00:30 EDT → 6 days ago, inside
    const oct31Late = '2026-11-01T03:30:00.000Z'; // 31 Oct 23:30 EDT → 7 days ago, outside 7, inside 14
    expect(countStudyDays([nov1Early], nyNow)).toEqual({ last7: 1, last14: 1 });
    expect(countStudyDays([oct31Late], nyNow)).toEqual({ last7: 0, last14: 1 });
  });
});

describe('collectStudyDays + feedback info (local IndexedDB)', () => {
  const SECRET = ['Zebrafish', 'Quokka', 'Wombat', 'Axolotl', 'Narwhal'];
  const TEXT = `1. Which ${SECRET[1]} sample?\na. ${SECRET[2]}\nb. ${SECRET[3]}\nAnswer: a\nRationale: ${SECRET[4]} reason.`;

  it('1 (DB). an empty database gives 0 and 0', async () => {
    db = new ReviewerDB(`sd-empty-${Date.now()}`);
    expect(await collectStudyDays(db, NOW)).toEqual({ last7: 0, last14: 0 });
  });

  it('counts reviews recorded by the real review path, and does not change review records', async () => {
    db = new ReviewerDB(`sd-${Date.now()}`);
    const s = await createFsrsScheduler();
    const deckId = await createDeck(db, { title: `${SECRET[0]} Deck`, examDate: '2026-12-01', items: parseReviewer(TEXT).items }, s, new Date(2026, 9, 1, 9));
    const item = (await db.items.where('deckId').equals(deckId).toArray())[0]!;
    // Oldest first: the scheduler (correctly) refuses a review dated before the previous one.
    for (const [d, h] of [[20, 7], [9, 7], [3, 8], [0, 8], [0, 9]] as const) {
      await recordReview(db, item.id, 'good', true, s, new Date(2026, 10, 21 - d, h));
    }
    const before = await db.reviews.toArray();
    expect(await collectStudyDays(db, NOW)).toEqual({ last7: 2, last14: 3 });
    expect(await db.reviews.toArray()).toEqual(before);
  });

  it('8 (DB). review rows with a broken or missing timestamp do not break the count', async () => {
    db = new ReviewerDB(`sd-bad-${Date.now()}`);
    await db.reviews.bulkAdd([
      { itemId: 'i1', deckId: 'd1', at: ago(1), grade: 'good', correct: true },
      { itemId: 'i1', deckId: 'd1', at: 'garbage', grade: 'good', correct: true },
      { itemId: 'i1', deckId: 'd1', grade: 'good', correct: true } as never,
    ]);
    expect(await collectStudyDays(db, NOW)).toEqual({ last7: 1, last14: 1 });
  });

  it('10/11. feedback keeps every existing line, adds the study-day line, and leaks no content or timestamps', async () => {
    db = new ReviewerDB(`sd-fb-${Date.now()}`);
    const s = await createFsrsScheduler();
    const deckId = await createDeck(db, { title: `${SECRET[0]} Deck`, examDate: '2026-12-01', items: parseReviewer(TEXT).items }, s, new Date(2026, 10, 10, 9));
    const item = (await db.items.where('deckId').equals(deckId).toArray())[0]!;
    for (const d of [9, 2, 0]) await recordReview(db, item.id, 'again', false, s, new Date(2026, 10, 21 - d, 15, 45));
    const info = buildFeedbackInfo({
      version: '0.2.3',
      buildDate: '2026-11-21',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/159 Mobile',
      standalone: true,
      counts: await collectFeedbackCounts(db),
      studyDays: await collectStudyDays(db, NOW),
      lastError: null,
      persisted: true,
      contentWords: await collectContentWords(db),
    });
    const lines = info.split('\n');
    expect(lines).toEqual([
      'Nursing Reviewer feedback info',
      'Version: 0.2.3 (built 2026-11-21)',
      'Browser: Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/159 Mobile',
      'Installed: yes',
      'Decks: 1 · Items: 1 · Reviews: 3',
      'Study days (last 7 days): 2 · Study days (last 14 days): 3',
      'Storage protected: yes',
      'Last error: none',
    ]);
    for (const word of SECRET) expect(info).not.toContain(word);
    // No review timestamps or review dates: the only date is the build date.
    expect(info.match(/\d{4}-\d{2}-\d{2}/g)).toEqual(['2026-11-21']);
    expect(info).not.toMatch(/T\d{2}:\d{2}|\d{1,2}:\d{2}/);
    for (const day of ['2026-11-19', '2026-11-12', '19/11', '11/19']) expect(info).not.toContain(day);
  });

  it('without study-day data the line says "unknown" (existing callers keep working)', () => {
    const info = buildFeedbackInfo({ version: 'v', buildDate: 'd', userAgent: 'ua', standalone: false, counts: { decks: 0, items: 0, reviews: 0 }, lastError: null, persisted: null });
    expect(info).toContain('Study days (last 7 days): unknown · Study days (last 14 days): unknown');
  });
});
