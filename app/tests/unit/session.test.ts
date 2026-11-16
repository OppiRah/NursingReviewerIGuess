import { describe, expect, it } from 'vitest';
import { afterAnswer, RECOVERY_AFTER } from '../../src/domain/session';

describe('afterAnswer (session runner rules)', () => {
  const base = { wrongStreak: 0, index: 0, total: 10, mascot: true };

  it('advances to the next question and counts wrong answers in a row', () => {
    expect(afterAnswer({ ...base, correct: false })).toEqual({ wrongStreak: 1, next: 'question', index: 1 });
    expect(afterAnswer({ ...base, correct: true, wrongStreak: 2 })).toEqual({ wrongStreak: 0, next: 'question', index: 1 });
  });

  it(`shows recovery after ${RECOVERY_AFTER} wrong in a row, then resets the count`, () => {
    expect(afterAnswer({ ...base, correct: false, wrongStreak: RECOVERY_AFTER - 1, index: 4 })).toEqual({ wrongStreak: 0, next: 'recovery', index: 5 });
  });

  it('never shows recovery with the mascot off (but still resets)', () => {
    expect(afterAnswer({ ...base, mascot: false, correct: false, wrongStreak: RECOVERY_AFTER - 1 })).toEqual({ wrongStreak: 0, next: 'question', index: 1 });
  });

  it('the last answer ends the session, even on a third miss', () => {
    expect(afterAnswer({ ...base, correct: false, wrongStreak: RECOVERY_AFTER - 1, index: 9 })).toEqual({ wrongStreak: 0, next: 'done', index: 9 });
    expect(afterAnswer({ ...base, correct: true, index: 0, total: 1 }).next).toBe('done');
  });
});
