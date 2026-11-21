/**
 * R-3/R-4: answer persistence coordination against the real repository (recordReview on an isolated
 * in-memory IndexedDB). The write is only wrapped to hold it open (to create the race) or to fail it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createAnswerSaver, type Answer } from '../../src/app/answerSaver';
import { STORAGE_FULL_MESSAGE } from '../../src/app/errors';
import { ReviewerDB } from '../../src/data/db';
import { createDeck, recordReview } from '../../src/data/repo';
import { parseReviewer } from '../../src/domain/parser';
import { createFsrsScheduler, type Scheduler } from '../../src/domain/scheduler';

const T0 = new Date(2026, 10, 21, 9, 0);
let db: ReviewerDB | null = null;
afterEach(async () => {
  db?.close();
  await db?.delete();
  db = null;
});

/** A gate that holds a write open until released. */
function gate(): { wait: Promise<void>; open: () => void } {
  let open!: () => void;
  const wait = new Promise<void>((r) => (open = r));
  return { wait, open };
}

async function setup(): Promise<{ db: ReviewerDB; s: Scheduler; itemId: string; answer: Answer }> {
  db = new ReviewerDB(`saver-${Date.now()}-${Math.random()}`);
  const s = await createFsrsScheduler();
  const deckId = await createDeck(db, { title: 'Sample', examDate: null, items: parseReviewer('1. Sample?\na. One\nb. Two\nAnswer: a\nRationale: r.').items }, s, T0);
  const itemId = (await db.items.where('deckId').equals(deckId).first())!.id;
  return { db, s, itemId, answer: { key: `0:${itemId}`, itemId, grade: 'good', correct: true } };
}

/** The real write, plus a call counter, an optional gate and optional injected failures. */
function realWrite(d: ReviewerDB, s: Scheduler, opts: { hold?: Promise<void>; failTimes?: number; error?: unknown } = {}) {
  let calls = 0;
  let failures = opts.failTimes ?? 0;
  const write = async (a: Answer): Promise<void> => {
    calls++;
    if (opts.hold) await opts.hold;
    if (failures > 0) {
      failures--;
      throw opts.error ?? new Error('Synthetic write failure');
    }
    await recordReview(d, a.itemId, a.grade, a.correct, s, T0);
  };
  return { write, calls: () => calls };
}

describe('answer saver (R-3/R-4)', () => {
  it('1. background save succeeds, then Next: one review, Next sees it as saved', async () => {
    const { db, s, answer } = await setup();
    const w = realWrite(db, s);
    const saver = createAnswerSaver(w.write);
    saver.setPending(answer);
    expect(await saver.flush()).toEqual({ ok: true }); // app sent to the background
    expect(await saver.save(answer)).toEqual({ ok: true }); // then Next
    expect(w.calls()).toBe(1);
    expect(await db.reviews.count()).toBe(1);
    expect(saver.isSaved(answer.key)).toBe(true);
    expect(saver.hasPending()).toBe(false);
  });

  it('2. background save still running when Next is tapped: Next waits for that same write (no early success, no duplicate)', async () => {
    const { db, s, answer } = await setup();
    const g = gate();
    const w = realWrite(db, s, { hold: g.wait });
    const saver = createAnswerSaver(w.write);
    saver.setPending(answer);
    const background = saver.flush();
    let nextDone = false;
    const next = saver.save({ ...answer, grade: 'easy' }).then((r) => {
      nextDone = true;
      return r;
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(nextDone).toBe(false); // R-4: Next must not report success while the write is still running
    expect(saver.isSaved(answer.key)).toBe(false);
    expect(await db.reviews.count()).toBe(0);
    g.open();
    expect(await next).toEqual({ ok: true });
    expect(await background).toEqual({ ok: true });
    expect(w.calls()).toBe(1);
    const reviews = await db.reviews.toArray();
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.grade).toBe('good'); // the first grade wins (known limitation R-7)
  });

  it('2b. if that running background write fails, the waiting Next sees the failure too', async () => {
    const { db, s, answer } = await setup();
    const g = gate();
    const w = realWrite(db, s, { hold: g.wait, failTimes: 1 });
    const saver = createAnswerSaver(w.write);
    saver.setPending(answer);
    const background = saver.flush();
    const next = saver.save(answer);
    g.open();
    const [b, n] = await Promise.all([background, next]);
    expect(b.ok).toBe(false);
    expect(n.ok).toBe(false); // never a false "saved"
    expect(saver.isSaved(answer.key)).toBe(false);
    expect(saver.hasPending()).toBe(true);
    expect(await db.reviews.count()).toBe(0);
  });

  it('3. background save fails: reported (not thrown), not saved, still pending, and a retry saves it once', async () => {
    const { db, s, answer } = await setup();
    const w = realWrite(db, s, { failTimes: 1 });
    const errors: string[] = [];
    const saver = createAnswerSaver(w.write, { onError: (m) => errors.push(m) });
    saver.setPending(answer);
    const r = await saver.flush();
    expect(r).toEqual({ ok: false, error: 'Synthetic write failure' });
    expect(errors).toEqual(['Synthetic write failure']);
    expect(saver.isSaved(answer.key)).toBe(false);
    expect(saver.hasPending()).toBe(true);
    expect(await db.reviews.count()).toBe(0);
    expect(await saver.save(answer)).toEqual({ ok: true }); // retry (Next)
    expect(await db.reviews.count()).toBe(1);
    expect(saver.hasPending()).toBe(false);
  });

  it('4. save fails while ending the session: End is told it failed, the answer stays pending for a retry', async () => {
    const { db, s, answer } = await setup();
    const w = realWrite(db, s, { failTimes: 1, error: Object.assign(new Error('x'), { name: 'QuotaExceededError' }) });
    const saver = createAnswerSaver(w.write);
    saver.setPending(answer);
    expect(await saver.flush()).toEqual({ ok: false, error: STORAGE_FULL_MESSAGE }); // End session
    expect(saver.hasPending()).toBe(true);
    expect(await saver.flush()).toEqual({ ok: true }); // End session again
    expect(await db.reviews.count()).toBe(1);
  });

  it('5. save succeeds and the session ends: exactly one review, nothing left pending', async () => {
    const { db, s, answer } = await setup();
    const w = realWrite(db, s);
    const saver = createAnswerSaver(w.write);
    saver.setPending(answer);
    expect(await saver.flush()).toEqual({ ok: true });
    expect(await saver.flush()).toEqual({ ok: true }); // a second End/unmount flush is a no-op
    expect(w.calls()).toBe(1);
    expect(await db.reviews.count()).toBe(1);
  });

  it('6. many Next/End/background actions while a save is running: one write, one review, all see the same result', async () => {
    const { db, s, answer } = await setup();
    const g = gate();
    const w = realWrite(db, s, { hold: g.wait });
    const saver = createAnswerSaver(w.write);
    saver.setPending(answer);
    const all = [saver.save(answer), saver.flush(), saver.save(answer), saver.flush(), saver.save({ ...answer, grade: 'again', correct: false })];
    g.open();
    expect(await Promise.all(all)).toEqual(Array(5).fill({ ok: true }));
    expect(w.calls()).toBe(1);
    expect(await db.reviews.count()).toBe(1);
  });

  it('a failure that is not an Error object is still reported as a value (no unhandled rejection)', async () => {
    const { db, s, answer } = await setup();
    const w = realWrite(db, s, { failTimes: 1, error: 'odd failure' });
    const saver = createAnswerSaver(w.write);
    await expect(saver.save(answer)).resolves.toEqual({ ok: false, error: 'odd failure' });
  });

  it('a saved answer is never made pending again, and nothing pending means flush does nothing', async () => {
    const { db, s, answer } = await setup();
    const w = realWrite(db, s);
    const saver = createAnswerSaver(w.write);
    expect(await saver.flush()).toEqual({ ok: true });
    expect(w.calls()).toBe(0);
    await saver.save(answer);
    saver.setPending(answer);
    expect(saver.hasPending()).toBe(false);
    expect(await saver.flush()).toEqual({ ok: true });
    expect(w.calls()).toBe(1);
  });
});

describe('answer saver: polish (C-1 / C-2)', () => {
  it('C-1: an older failed write does not overwrite a newer pending grade; the retry writes the newer one', async () => {
    const { db, s, answer } = await setup();
    const g = gate();
    const w = realWrite(db, s, { hold: g.wait, failTimes: 1 });
    const saver = createAnswerSaver(w.write);
    saver.setPending(answer); // checked: Good
    const background = saver.flush(); // background write of Good starts…
    saver.setPending({ ...answer, grade: 'easy' }); // …the student asks for Easy meanwhile
    g.open();
    expect((await background).ok).toBe(false); // Good fails
    expect(saver.hasPending()).toBe(true);
    expect(await saver.flush()).toEqual({ ok: true }); // End session retries
    const reviews = await db.reviews.toArray();
    expect(reviews.map((r) => r.grade)).toEqual(['easy']); // the newer intention, written once
  });

  it('C-1: concurrent callers still share one write while it runs, and isSaving/isSaved report it', async () => {
    const { db, s, answer } = await setup();
    const g = gate();
    const w = realWrite(db, s, { hold: g.wait });
    const changes: string[] = [];
    const saver = createAnswerSaver(w.write, { onChange: () => changes.push(saver.isSaving(answer.key) ? 'saving' : 'idle') });
    const a = saver.save(answer);
    const b = saver.save({ ...answer, grade: 'easy' });
    expect(saver.isSaving(answer.key)).toBe(true); // the UI shows "Saving…" and offers no re-grade
    g.open();
    expect(await Promise.all([a, b])).toEqual([{ ok: true }, { ok: true }]);
    expect(w.calls()).toBe(1);
    expect(saver.isSaving(answer.key)).toBe(false);
    expect(saver.isSaved(answer.key)).toBe(true);
    expect(changes).toEqual(['saving', 'idle']);
    expect((await db.reviews.toArray()).map((r) => r.grade)).toEqual(['good']);
  });

  it('C-2: onError and onSaved name the answer, so a later success can clear exactly that error', async () => {
    const { db, s, answer } = await setup();
    const w = realWrite(db, s, { failTimes: 1 });
    const events: string[] = [];
    const saver = createAnswerSaver(w.write, { onError: (_m, a) => events.push(`error:${a.key}`), onSaved: (a) => events.push(`saved:${a.key}`) });
    saver.setPending(answer);
    await saver.flush(); // background attempt fails
    await saver.flush(); // background retry succeeds
    expect(events).toEqual([`error:${answer.key}`, `saved:${answer.key}`]);
    expect(await db.reviews.count()).toBe(1);
  });
});
