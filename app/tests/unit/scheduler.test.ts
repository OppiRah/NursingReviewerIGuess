import { describe, expect, it } from 'vitest';
import { createFsrsScheduler } from '../../src/domain/scheduler';

const NOW = new Date('2026-11-14T10:00:00.000Z');

describe('FSRS scheduler', () => {
  it('a new item is due immediately and has zero retrievability', async () => {
    const s = await createFsrsScheduler();
    const st = s.newState(NOW);
    expect(Date.parse(st.dueAt)).toBe(NOW.getTime());
    expect(st.reps).toBe(0);
    expect(s.retrievability(st, NOW)).toBe(0);
  });

  it('Good is due later than Again; Easy later than Good', async () => {
    const s = await createFsrsScheduler();
    const st = s.newState(NOW);
    const again = s.review(st, 'again', NOW);
    const good = s.review(st, 'good', NOW);
    const easy = s.review(st, 'easy', NOW);
    expect(Date.parse(good.dueAt)).toBeGreaterThan(Date.parse(again.dueAt));
    expect(Date.parse(easy.dueAt)).toBeGreaterThan(Date.parse(good.dueAt));
    // Whole-day scheduling (short-term steps off): even Again is at least a day out.
    expect(Date.parse(again.dueAt) - NOW.getTime()).toBeGreaterThanOrEqual(86_400_000);
  });

  it('does not mutate the input state', async () => {
    const s = await createFsrsScheduler();
    const st = s.newState(NOW);
    const copy = structuredClone(st);
    s.review(st, 'good', NOW);
    expect(st).toEqual(copy);
  });

  it('state serialization round-trips through JSON and keeps scheduling identical', async () => {
    const s = await createFsrsScheduler();
    let st = s.newState(NOW);
    st = s.review(st, 'good', NOW);
    const later = new Date(st.dueAt);
    const viaJson = JSON.parse(JSON.stringify(st));
    expect(viaJson).toEqual(st);
    expect(s.review(viaJson, 'good', later)).toEqual(s.review(st, 'good', later));
  });

  it('retrievability decays over time after a review', async () => {
    const s = await createFsrsScheduler();
    const st = s.review(s.newState(NOW), 'good', NOW);
    const r1 = s.retrievability(st, new Date(NOW.getTime() + 1 * 86_400_000));
    const r10 = s.retrievability(st, new Date(NOW.getTime() + 10 * 86_400_000));
    expect(r1).toBeGreaterThan(r10);
    expect(r1).toBeLessThanOrEqual(1);
    expect(r10).toBeGreaterThan(0);
  });
});
