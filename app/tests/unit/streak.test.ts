import { describe, expect, it } from 'vitest';
import { addSessionDay, computeStreak, weekKey } from '../../src/domain/streak';

// 2026-11-14 is a Saturday; its week starts Monday 2026-11-09.
const TODAY = '2026-11-14';

describe('weekKey', () => {
  it('returns the Monday of the week', () => {
    expect(weekKey('2026-11-14')).toBe('2026-11-09');
    expect(weekKey('2026-11-09')).toBe('2026-11-09');
    expect(weekKey('2026-11-15')).toBe('2026-11-09'); // Sunday
    expect(weekKey('2026-11-16')).toBe('2026-11-16');
  });
});

describe('computeStreak', () => {
  it('counts consecutive days including today', () => {
    const s = computeStreak(['2026-11-12', '2026-11-13', '2026-11-14'], TODAY);
    expect(s).toMatchObject({ current: 3, doneToday: true, broken: false, freezeUsedThisWeek: false, daysAway: 0 });
  });

  it('today not done yet does not break the streak', () => {
    expect(computeStreak(['2026-11-12', '2026-11-13'], TODAY)).toMatchObject({ current: 2, doneToday: false, broken: false, daysAway: 1 });
  });

  it('one missed day per week is bridged by the free freeze', () => {
    const s = computeStreak(['2026-11-11', '2026-11-12', '2026-11-14'], TODAY); // missed Fri 13
    expect(s).toMatchObject({ current: 3, freezeUsedThisWeek: true, broken: false });
  });

  it('two missed days in the same week break the streak at the second gap', () => {
    const s = computeStreak(['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-14'], TODAY); // gaps 10 and 12
    expect(s.current).toBe(3); // 14, 13, (12 frozen), 11; gap at 10 in same week stops it
  });

  it('a gap of two consecutive days cannot be bridged', () => {
    expect(computeStreak(['2026-11-10', '2026-11-11', '2026-11-14'], TODAY).current).toBe(1);
  });

  it('a broken streak is reported as broken (neutral copy in UI), with days away', () => {
    expect(computeStreak(['2026-11-01', '2026-11-02'], TODAY)).toMatchObject({ current: 0, broken: true, daysAway: 12, lastDay: '2026-11-02' });
  });

  it('no sessions ever: not broken, no days away', () => {
    expect(computeStreak([], TODAY)).toMatchObject({ current: 0, broken: false, daysAway: null });
  });
});

describe('addSessionDay', () => {
  it('adds once and keeps sorted', () => {
    expect(addSessionDay(['2026-11-13'], '2026-11-14')).toEqual(['2026-11-13', '2026-11-14']);
    expect(addSessionDay(['2026-11-14'], '2026-11-14')).toEqual(['2026-11-14']);
  });
});
